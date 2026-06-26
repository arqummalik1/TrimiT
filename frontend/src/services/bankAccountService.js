import api from '../lib/api';

/**
 * Canonical owner Bank_KYC_Record service. Talks to `/owner/bank-accounts`
 * (the same endpoint mobile uses). Responses are masked: only
 * account_number_last4 / pan_last4 are returned, never the full sensitive
 * values (Req 1.6). vendor_status reflects the PayU lifecycle (Req 3.5, 17.6).
 */
export const bankAccountService = {
  getBankAccount: async () => {
    try {
      const response = await api.get('/owner/bank-accounts');
      return response.data;
    } catch (error) {
      if (error?.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  // Create or update the full Bank_KYC_Record (upsert, one row per salon).
  saveBankAccount: async (data) => {
    const response = await api.post('/owner/bank-accounts/', data);
    return response.data;
  },

  // Back-compat alias — older callers referenced createLinkedAccount.
  createLinkedAccount: async (data) => {
    const response = await api.post('/owner/bank-accounts/', data);
    return response.data;
  },
};

export default bankAccountService;
