import api from '../lib/api';

const serviceCategoryService = {
  list: async () => {
    const response = await api.get('/owner/categories');
    return response.data;
  },

  create: async ({ name, sort_order }) => {
    const response = await api.post('/owner/categories', { name, sort_order });
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.patch(`/owner/categories/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/owner/categories/${id}`);
    return response.data;
  },

  quickStart: async () => {
    const response = await api.post('/owner/categories/quick-start');
    return response.data;
  },
};

export default serviceCategoryService;
