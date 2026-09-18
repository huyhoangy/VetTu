import { Platform, Vibration } from 'react-native';
import * as Notifications from 'expo-notifications';
import { navigate } from '../navigation/navigationRef';
import notificationApi from '../api/notificationApi';
import authApi from '../api/authApi';

// Configure how notifications are displayed when app is running (foreground / background)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

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

    // Attempt to retrieve and sync Expo Push Token with backend
    try {
      const tokenObj = await Notifications.getExpoPushTokenAsync().catch(() => null);
      if (tokenObj && tokenObj.data) {
        await authApi.updatePushToken(tokenObj.data).catch(() => {});
      }
    } catch (e) {
      // Ignore in Expo Go if push credentials not configured
    }

    return true;
  } catch (error) {
    console.log('Error setting up notifications:', error);
    return false;
  }
};

/**
 * Display an immediate notification (both in-app floating banner AND Android System Notification)
 */
export const showDeviceNotification = async ({ title, body, data = {}, type = 'SYSTEM' }) => {
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

    // 2. Trigger native Android OS System Notification (Shows on Lock Screen / Home Screen Notification Drawer)
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: title || 'ChefMatch (Vét Tủ)',
          body: body || '',
          data: { ...data, type },
          sound: 'default',
          channelId: 'default',
        },
        trigger: null, // trigger immediately
      });
    } catch (notifErr) {
      console.log('Error scheduling local notification:', notifErr.message);
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
  } catch (err) {
    return {
      remove: () => {},
    };
  }
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
