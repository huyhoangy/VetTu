import { Platform, Vibration } from 'react-native';
import { navigate } from '../navigation/navigationRef';
import notificationApi from '../api/notificationApi';

// Global callback to display the in-app floating banner
let inAppNotificationCallback = null;

export const setInAppNotificationCallback = (cb) => {
  inAppNotificationCallback = cb;
};

/**
 * Request notification permissions safely
 */
export const requestNotificationPermissions = async () => {
  try {
    // Attempt Expo Notifications if available and not restricted
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Display an immediate notification (via in-app banner and local alerts)
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

    // 2. Subtle vibration
    try {
      Vibration.vibrate(80);
    } catch (e) {}
  } catch (error) {
    console.log('Notification trigger error:', error);
  }
};

/**
 * Initialize listeners
 */
export const initNotificationListeners = () => {
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
