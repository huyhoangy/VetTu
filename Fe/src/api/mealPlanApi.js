import axiosClient from './axiosClient';

const mealPlanApi = {
  getWeeklyPlan: (params) => {
    return axiosClient.get('/meal-plans', { params });
  },

  updateMealSlot: (data) => {
    return axiosClient.post('/meal-plans/slot', data);
  },

  removeMealSlot: (data) => {
    return axiosClient.delete('/meal-plans/slot', { data });
  },

  toggleMealSlot: (data) => {
    return axiosClient.patch('/meal-plans/toggle-slot', data);
  },

  getGroceryList: (params) => {
    return axiosClient.get('/meal-plans/grocery-list', { params });
  },

  aiSuggestWeeklyPlan: (data) => {
    return axiosClient.post('/meal-plans/ai-suggest', data);
  },
};

export default mealPlanApi;
