import axiosClient from './axiosClient';

export const shareApi = {
  // GET /api/shares/nearby
  getNearbyShares: async (params = {}) => {
    const {
      lng = 105.782,
      lat = 21.031,
      maxDistance = 15000,
      category = 'ALL',
      type = 'ALL',
      search = '',
    } = params;

    const queryParams = new URLSearchParams();
    if (lng) queryParams.append('lng', lng);
    if (lat) queryParams.append('lat', lat);
    if (maxDistance) queryParams.append('maxDistance', maxDistance);
    if (category && category !== 'ALL') queryParams.append('category', category);
    if (type && type !== 'ALL') queryParams.append('type', type);
    if (search) queryParams.append('search', search);

    return await axiosClient.get(`/shares/nearby?${queryParams.toString()}`);
  },

  // GET /api/shares/:id
  getShareById: async (id) => {
    return await axiosClient.get(`/shares/${id}`);
  },

  // POST /api/shares
  createShare: async (shareData) => {
    return await axiosClient.post('/shares', shareData);
  },

  // PUT /api/shares/:id/status
  updateShareStatus: async (id, status) => {
    return await axiosClient.put(`/shares/${id}/status`, { status });
  },

  // GET /api/shares/my-shares
  getMyShares: async (params = {}) => {
    const { userId, status = 'ALL', search = '' } = typeof params === 'string' ? { userId: params } : params;
    const queryParams = new URLSearchParams();
    if (userId) queryParams.append('userId', userId);
    if (status && status !== 'ALL') queryParams.append('status', status);
    if (search) queryParams.append('search', search);

    const queryStr = queryParams.toString();
    return await axiosClient.get(`/shares/my-shares${queryStr ? `?${queryStr}` : ''}`);
  },

  // PUT /api/shares/:id
  updateShare: async (id, shareData) => {
    return await axiosClient.put(`/shares/${id}`, shareData);
  },

  // DELETE /api/shares/:id
  deleteShare: async (id, userId) => {
    const queryStr = userId ? `?userId=${userId}` : '';
    return await axiosClient.delete(`/shares/${id}${queryStr}`);
  },

  // POST /api/shares/seed
  seedSampleShares: async () => {
    return await axiosClient.post('/shares/seed');
  },
};

export default shareApi;
