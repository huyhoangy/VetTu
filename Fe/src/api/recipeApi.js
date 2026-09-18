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

  // POST /api/recipes/:id/favorite
  toggleFavorite: (id, userId) => {
    return axiosClient.post(`/recipes/${id}/favorite`, { userId });
  },

  // GET /api/recipes/favorites
  getFavorites: (userId) => {
    const url = userId ? `/recipes/favorites?userId=${userId}` : '/recipes/favorites';
    return axiosClient.get(url);
  },
};

export default recipeApi;
