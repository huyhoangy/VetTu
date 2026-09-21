import axiosClient from './axiosClient';

export const authApi = {
  // Register a new account
  register: (data) => {
    return axiosClient.post('/auth/register', data);
  },

  // Login with email & password
  login: (data) => {
    return axiosClient.post('/auth/login', data);
  },

  // Login with Firebase ID Token (Google / Apple)
  firebaseLogin: (idToken) => {
    return axiosClient.post('/auth/firebase-login', { idToken });
  },

  // Get current logged-in user profile
  getMe: () => {
    return axiosClient.get('/auth/me');
  },

  // Update user GPS coordinates
  updateLocation: (coords) => {
    return axiosClient.put('/auth/location', coords);
  },

  // Update Expo Push Token
  updatePushToken: (pushToken) => {
    return axiosClient.post('/auth/push-token', { pushToken });
  },

  // Verify Phone Number with Firebase
  verifyPhone: (data) => {
    return axiosClient.post('/auth/verify-phone', data);
  },
};

export default authApi;
