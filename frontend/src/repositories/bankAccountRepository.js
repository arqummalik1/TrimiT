import bankAccountService from '../services/bankAccountService';

export const bankAccountRepository = {
  getBankAccount: async () => {
    return bankAccountService.getBankAccount();
  },
  saveBankAccount: async (data) => {
    return bankAccountService.saveBankAccount(data);
  },
  // Back-compat alias.
  createLinkedAccount: async (data) => {
    return bankAccountService.saveBankAccount(data);
  },
};
