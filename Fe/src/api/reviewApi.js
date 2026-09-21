import axiosClient from './axiosClient';

const reviewApi = {
  createReview: (data) => {
    return axiosClient.post('/reviews', data);
  },

  getUserReviews: (userId) => {
    return axiosClient.get(`/reviews/user/${userId}`);
  },
};

export default reviewApi;
