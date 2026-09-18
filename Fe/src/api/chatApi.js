import axiosClient from './axiosClient';

export const chatApi = {
  // POST /api/chat/conversation (Get or create conversation for a share)
  getOrCreateConversation: async (shareId, donorId, initialMessage, userId) => {
    return await axiosClient.post('/chat/conversation', {
      shareId,
      donorId,
      initialMessage,
      userId,
    });
  },

  // GET /api/chat/conversations
  getUserConversations: async (userId) => {
    const url = userId ? `/chat/conversations?userId=${userId}` : '/chat/conversations';
    return await axiosClient.get(url);
  },

  // GET /api/chat/conversations/:id
  getConversationById: async (conversationId) => {
    return await axiosClient.get(`/chat/conversations/${conversationId}`);
  },

  // DELETE /api/chat/conversations/:id
  deleteConversation: async (conversationId, userId) => {
    const url = userId ? `/chat/conversations/${conversationId}?userId=${userId}` : `/chat/conversations/${conversationId}`;
    return await axiosClient.delete(url);
  },

  // GET /api/chat/conversations/:id/messages
  getMessages: async (conversationId, userId) => {
    const url = userId ? `/chat/conversations/${conversationId}/messages?userId=${userId}` : `/chat/conversations/${conversationId}/messages`;
    return await axiosClient.get(url);
  },

  // POST /api/chat/conversations/:id/messages
  sendMessage: async (conversationId, text, senderId) => {
    return await axiosClient.post(`/chat/conversations/${conversationId}/messages`, {
      text,
      senderId,
    });
  },

  // POST /api/chat/conversations/:id/confirm-claim
  confirmClaim: async (conversationId) => {
    return await axiosClient.post(`/chat/conversations/${conversationId}/confirm-claim`);
  },
};

export default chatApi;
