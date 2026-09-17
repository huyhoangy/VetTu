import axiosClient from './axiosClient';

export const recipeApi = {
  // POST /api/recipes/match
  matchRecipes: (ingredients) => {
    return axiosClient.post('/recipes/match', { ingredients });
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
