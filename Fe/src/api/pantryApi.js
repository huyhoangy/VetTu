import axiosClient from './axiosClient';

const pantryApi = {
  getUserPantry: (params) => {
    return axiosClient.get('/pantry', { params });
  },

  addPantryItem: (data) => {
    return axiosClient.post('/pantry', data);
  },

  updatePantryItem: (id, data) => {
    return axiosClient.put(`/pantry/${id}`, data);
  },

  deletePantryItem: (id) => {
    return axiosClient.delete(`/pantry/${id}`);
  },

  batchAddPantryItems: (data) => {
    return axiosClient.post('/pantry/batch', data);
  },

  checkReminders: () => {
    return axiosClient.post('/pantry/check-reminders');
  },
};

export default pantryApi;
