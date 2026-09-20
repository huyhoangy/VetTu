import { Platform, Vibration } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigate } from '../navigation/navigationRef';
import notificationApi from '../api/notificationApi';
import authApi from '../api/authApi';

const NOTIFICATIONS_ENABLED_KEY = '@vettu_notifications_enabled';
let notificationsEnabledCached = true;

// Pre-load notification setting into cache on startup
AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY)
  .then((val) => {
    if (val !== null) {
      notificationsEnabledCached = JSON.parse(val);
    }
  })
  .catch(() => {});

export const getNotificationSetting = async () => {
  try {
    const val = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
    if (val !== null) {
      notificationsEnabledCached = JSON.parse(val);
      return notificationsEnabledCached;
    }
    return true;
  } catch (e) {
    return true;
  }
};

export const setNotificationSetting = async (enabled) => {
  try {
    notificationsEnabledCached = Boolean(enabled);
    await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, JSON.stringify(Boolean(enabled)));
    return notificationsEnabledCached;
  } catch (e) {
    return enabled;
  }
};

export const isNotificationsEnabled = () => notificationsEnabledCached;

// Determine if currently running inside Expo Go Client
const isExpoGo =
  Constants?.appOwnership === 'expo' ||
  Constants?.executionEnvironment === ExecutionEnvironment.StoreClient;

// Safely lazy-load Notifications only in Standalone APK / Dev Client builds (to prevent Expo Go Android top-level crash)
let Notifications = null;
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    if (Notifications?.setNotificationHandler) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
    }
  } catch (e) {
    console.log('expo-notifications lazy load note:', e.message);
  }
}

// Global callback to display the in-app floating banner
let inAppNotificationCallback = null;

export const setInAppNotificationCallback = (cb) => {
  inAppNotificationCallback = cb;
};

/**
 * Request notification permissions safely & create Android notification channel
 */
export const requestNotificationPermissions = async () => {
  try {
    if (!isExpoGo && Notifications) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Vét Tủ Thông Báo',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2ECC71',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });
      }

      if (finalStatus !== 'granted') {
        return false;
      }

      // On Standalone APK / Dev Builds, get Expo Push Token for remote push
      try {
        const tokenObj = await Notifications.getExpoPushTokenAsync();
        if (tokenObj && tokenObj.data) {
          await authApi.updatePushToken(tokenObj.data).catch(() => {});
        }
      } catch (tokenErr) {
        console.log('Expo Push Token registration note:', tokenErr.message);
      }
    }

    return true;
  } catch (error) {
    console.log('Error setting up notifications:', error);
    return false;
  }
};

/**
 * Display an immediate notification (via in-app floating banner & native alerts)
 */
export const showDeviceNotification = async ({ title, body, data = {}, type = 'SYSTEM' }) => {
  if (!notificationsEnabledCached) {
    return;
  }
  try {
    // 1. Trigger in-app floating dropdown banner
    if (inAppNotificationCallback) {
      inAppNotificationCallback({
        title,
        message: body,
        body,
        type,
        data,
      });
    }

    // 2. Trigger native OS System Notification if available (Standalone / Dev Build)
    if (!isExpoGo && Notifications?.scheduleNotificationAsync) {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: title || 'ChefMatch (Vét Tủ)',
            body: body || '',
            data: { ...data, type },
            sound: 'default',
            channelId: 'default',
          },
          trigger: null,
        });
      } catch (notifErr) {
        console.log('Error scheduling local notification:', notifErr.message);
      }
    }

    // 3. Subtle vibration
    try {
      Vibration.vibrate([0, 150, 100, 150]);
    } catch (e) {}
  } catch (error) {
    console.log('Notification trigger error:', error);
  }
};

/**
 * Initialize listeners for user tapping notifications from phone lockscreen / status bar
 */
export const initNotificationListeners = () => {
  try {
    if (!isExpoGo && Notifications?.addNotificationResponseReceivedListener) {
      const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
        try {
          const notifData = response?.notification?.request?.content?.data;
          if (notifData?.conversationId) {
            navigate('ChatDetail', { conversationId: notifData.conversationId });
          } else if (notifData?.shareId) {
            navigate('Community');
          } else {
            navigate('Notifications');
          }
        } catch (e) {
          console.log('Error handling notification tap:', e);
        }
      });

      return {
        remove: () => {
          if (responseListener && responseListener.remove) {
            responseListener.remove();
          }
        },
      };
    }
  } catch (err) {
    // Ignore in Expo Go
  }

  return {
    remove: () => {},
  };
};

// Track notified IDs to avoid duplicate alerts during current session
const notifiedIds = new Set();

/**
 * Check backend for new unread notifications and push them to device screen
 * @param {string} userId
 */
export const syncAndPushDeviceNotifications = async (userId) => {
  if (!userId) return;
  try {
    const res = await notificationApi.getNotifications(userId);
    if (res.success && res.data) {
      for (const item of res.data) {
        // If unread and not yet pushed in this active session
        if (!item.isRead && !notifiedIds.has(item._id)) {
          notifiedIds.add(item._id);
          await showDeviceNotification({
            title: item.title,
            body: item.message,
            type: item.type,
            data: {
              type: item.type,
              conversationId: item.data?.conversationId,
              shareId: item.data?.shareId?._id || item.data?.shareId,
              sender: item.sender,
            },
          });
        }
      }
    }
  } catch (error) {
    // Silent fail in background sync
  }
};

export default {
  requestNotificationPermissions,
  showDeviceNotification,
  initNotificationListeners,
  syncAndPushDeviceNotifications,
  setInAppNotificationCallback,
};
