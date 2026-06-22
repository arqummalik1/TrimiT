import bankAccountService from '../services/bankAccountService';

export const bankAccountRepository = {
  getBankAccount: async () => {
    return bankAccountService.getBankAccount();
  },
  createLinkedAccount: async (data) => {
    return bankAccountService.createLinkedAccount(data);
  },
};
