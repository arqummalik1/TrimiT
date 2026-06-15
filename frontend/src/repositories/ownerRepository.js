import api from '../lib/api';

export const ownerRepository = {
  async getOwnerSalon() {
    const response = await api.get('/owner/salon');
    return response.data;
  },

  async getOwnerAnalytics() {
    const response = await api.get('/owner/analytics');
    return response.data;
  },
};
