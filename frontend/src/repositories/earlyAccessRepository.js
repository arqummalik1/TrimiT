import { earlyAccessService } from '../services/earlyAccessService';

/**
 * Early Access Repository.
 * Separates data logic from UI/ViewModel and acts as data coordinator.
 */
export const earlyAccessRepository = {
  async registerEmail(email) {
    try {
      return await earlyAccessService.submitEmail(email);
    } catch (error) {
      console.error('[EarlyAccessRepository] Failed to register email for early access:', error);
      throw error;
    }
  }
};

export default earlyAccessRepository;
