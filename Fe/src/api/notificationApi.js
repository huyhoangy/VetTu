import axiosClient from './axiosClient';

export const notificationApi = {
  // GET /api/notifications
  getNotifications: async (userId) => {
    const url = userId ? `/notifications?userId=${userId}` : '/notifications';
    return await axiosClient.get(url);
  },

  // GET /api/notifications/unread-count
  getUnreadCount: async (userId) => {
    const url = userId ? `/notifications/unread-count?userId=${userId}` : '/notifications/unread-count';
    return await axiosClient.get(url);
  },

  // PUT /api/notifications/:id/read
  markAsRead: async (notificationId) => {
    return await axiosClient.put(`/notifications/${notificationId}/read`);
  },

  // PUT /api/notifications/read-all
  markAllAsRead: async (userId) => {
    return await axiosClient.put('/notifications/read-all', { userId });
  },

  // PUT /api/notifications/read-by-conversation
  markReadByConversation: async (conversationId, userId) => {
    return await axiosClient.put('/notifications/read-by-conversation', { conversationId, userId });
  },

  // DELETE /api/notifications/:id
  deleteNotification: async (notificationId) => {
    return await axiosClient.delete(`/notifications/${notificationId}`);
  },
};

export default notificationApi;
