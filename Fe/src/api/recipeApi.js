import axiosClient from './axiosClient';

export const recipeApi = {
  // POST /api/recipes/match
  matchRecipes: (ingredients, appliance = 'ALL') => {
    return axiosClient.post('/recipes/match', { ingredients, appliance });
  },

  // GET /api/recipes
  getAllRecipes: (params = {}) => {
    return axiosClient.get('/recipes', { params });
  },

  // GET /api/recipes/:id
  getRecipeById: (id) => {
    return axiosClient.get(`/recipes/${id}`);
  },
};

export default recipeApi;
