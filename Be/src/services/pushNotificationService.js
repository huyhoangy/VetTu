/**
 * Expo Push Notification Service
 * Sends push notifications directly to device OS (Background / Home Screen / Lock Screen)
 */

const User = require('../models/User');

/**
 * Send Expo Push Notification to a list of tokens
 * @param {string[]} pushTokens
 * @param {Object} payload - { title, body, data }
 */
const sendPushNotification = async (pushTokens, { title, body, data = {} }) => {
  if (!pushTokens || pushTokens.length === 0) return;

  const validTokens = pushTokens.filter(
    (token) => typeof token === 'string' && token.startsWith('ExponentPushToken[')
  );

  if (validTokens.length === 0) return;

  const messages = validTokens.map((token) => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
    priority: 'high',
    channelId: 'default',
  }));

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.warn('Error sending Expo push notification:', error.message);
  }
};

/**
 * Send push notification to a specific user by userId
 * @param {string|ObjectId} userId
 * @param {Object} payload - { title, body, data }
 */
const sendPushToUser = async (userId, payload) => {
  try {
    const user = await User.findById(userId).select('pushToken');
    if (user && user.pushToken) {
      await sendPushNotification([user.pushToken], payload);
    }
  } catch (error) {
    console.warn('Error in sendPushToUser:', error.message);
  }
};

/**
 * Send push notification to multiple users by userIds
 * @param {string[]|ObjectId[]} userIds
 * @param {Object} payload - { title, body, data }
 */
const sendPushToUsers = async (userIds, payload) => {
  try {
    const users = await User.find({ _id: { $in: userIds }, pushToken: { $ne: '' } }).select('pushToken');
    const tokens = users.map((u) => u.pushToken).filter(Boolean);
    if (tokens.length > 0) {
      await sendPushNotification(tokens, payload);
    }
  } catch (error) {
    console.warn('Error in sendPushToUsers:', error.message);
  }
};

module.exports = {
  sendPushNotification,
  sendPushToUser,
  sendPushToUsers,
};
