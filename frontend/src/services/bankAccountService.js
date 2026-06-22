import api from '../lib/api';

export const bankAccountService = {
  getBankAccount: async () => {
    const response = await api.get('/bank-accounts/');
    return response.data;
  },

  createLinkedAccount: async (data) => {
    const response = await api.post('/bank-accounts/create-linked-account', data);
    return response.data;
  },
};

export default bankAccountService;
