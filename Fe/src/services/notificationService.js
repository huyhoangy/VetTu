import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { navigate } from '../navigation/navigationRef';
import notificationApi from '../api/notificationApi';

// Set global notification presentation behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Configure notification channel for Android
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'Thông báo Vét Tủ',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF6B00',
    sound: 'default',
  });
}

/**
 * Request notification permissions from device OS
 */
export const requestNotificationPermissions = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch (error) {
    console.warn('Error requesting notification permissions:', error);
    return false;
  }
};

/**
 * Display an immediate native OS notification banner on the device
 * @param {Object} param0 - { title, body, data }
 */
export const showDeviceNotification = async ({ title, body, data = {} }) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null, // Send immediately
    });
  } catch (error) {
    console.log('Error triggering device notification:', error);
  }
};

/**
 * Initialize Notification Response Listener (Handles tap on device banner)
 */
export const initNotificationListeners = () => {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    try {
      const data = response.notification?.request?.content?.data;
      if (data) {
        if (data.type === 'MESSAGE' && data.conversationId) {
          navigate('Chat', {
            conversationId: data.conversationId,
            donorUser: data.sender || { name: 'Hàng xóm', avatar: 'https://cdn-icons-png.flaticon.com/512/847/847969.png' },
          });
        } else if (data.type === 'NEW_SHARE' && data.shareId) {
          navigate('ShareDetail', {
            shareId: data.shareId,
          });
        } else if (data.type === 'CLAIM_CONFIRMED' && data.conversationId) {
          navigate('Chat', {
            conversationId: data.conversationId,
          });
        }
      }
    } catch (e) {
      console.warn('Notification click handle error:', e);
    }
  });

  return subscription;
};

// Track notified IDs to avoid duplicate device alerts
const notifiedIds = new Set();

/**
 * Check backend for new unread notifications and push them to device OS
 * @param {string} userId
 */
export const syncAndPushDeviceNotifications = async (userId) => {
  if (!userId) return;
  try {
    const res = await notificationApi.getNotifications(userId);
    if (res.success && res.data) {
      for (const item of res.data) {
        // If unread and not yet pushed to device in this session
        if (!item.isRead && !notifiedIds.has(item._id)) {
          notifiedIds.add(item._id);
          await showDeviceNotification({
            title: item.title,
            body: item.message,
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
};
