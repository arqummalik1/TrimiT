import { bankAccountService, BankAccount, BankAccountCreate } from '../services/bankAccountService';
import { isAppError } from '../types/error';
import { logger } from '../lib/logger';

export const bankAccountRepository = {
  async getBankAccount(): Promise<BankAccount | null> {
    try {
      return await bankAccountService.getBankAccount();
    } catch (error: unknown) {
      const kind = isAppError(error) ? error.kind : undefined;
      if (kind === 'network') {
        logger.warn('[BankAccountRepository] getBankAccount network issue', {
          message: isAppError(error) ? error.message : 'network',
        });
      } else {
        logger.error('[BankAccountRepository] getBankAccount failed', error);
      }
      throw error;
    }
  },

  async saveBankAccount(data: BankAccountCreate): Promise<BankAccount> {
    try {
      return await bankAccountService.saveBankAccount(data);
    } catch (error: unknown) {
      logger.error('[BankAccountRepository] saveBankAccount failed', error);
      throw error;
    }
  },
};
