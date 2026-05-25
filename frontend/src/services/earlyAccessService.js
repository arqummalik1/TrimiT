import api from '../lib/api';

/**
 * Early Access Infrastructure Service.
 * Interacts with the backend /early-access endpoint.
 */
export const earlyAccessService = {
  submitEmail: async (email) => {
    const response = await api.post('/early-access/', { email });
    return response.data;
  }
};

export default earlyAccessService;
