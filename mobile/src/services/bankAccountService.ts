import apiClient from './apiClient';

export interface BankAccount {
  id: string;
  salon_id: string;
  account_name: string;
  account_number_last4: string;
  ifsc_code: string;
  status: 'active' | 'pending' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface BankAccountCreate {
  account_name: string;
  account_number: string;
  ifsc_code: string;
}

export const bankAccountService = {
  async getBankAccount(): Promise<BankAccount | null> {
    try {
      const response = await apiClient.get('/owner/bank-accounts');
      return response.data;
    } catch (error: any) {
      if (error.status === 404 || error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async saveBankAccount(data: BankAccountCreate): Promise<BankAccount> {
    const response = await apiClient.post('/owner/bank-accounts', data);
    return response.data;
  },
};
