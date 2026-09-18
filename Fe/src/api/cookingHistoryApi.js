import axiosClient from './axiosClient';

export const cookingHistoryApi = {
  // POST /api/cooking-history
  recordCooked: (data) => {
    return axiosClient.post('/cooking-history', data);
  },

  // GET /api/cooking-history
  getHistory: (userId, params = {}) => {
    const url = userId ? `/cooking-history?userId=${userId}` : '/cooking-history';
    return axiosClient.get(url, { params });
  },

  // PUT /api/cooking-history/:id
  updateHistory: (id, data) => {
    return axiosClient.put(`/cooking-history/${id}`, data);
  },

  // DELETE /api/cooking-history/:id
  deleteHistory: (id, userId) => {
    const url = userId ? `/cooking-history/${id}?userId=${userId}` : `/cooking-history/${id}`;
    return axiosClient.delete(url);
  },
};

export default cookingHistoryApi;
