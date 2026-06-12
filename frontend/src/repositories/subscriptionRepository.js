import { subscriptionService } from '../services/subscriptionService';

export const subscriptionRepository = {
  async getCurrent() {
    return subscriptionService.getCurrent();
  },
  async getStatus() {
    return subscriptionService.getStatus();
  },
  async getHistory() {
    try {
      return await subscriptionService.getHistory();
    } catch (error) {
      console.error('[SubscriptionRepository] getHistory failed', error);
      return { total_paid: 0, currency: 'INR', payments: [] };
    }
  },
  async create() {
    return subscriptionService.create();
  },
  async verify(payload) {
    return subscriptionService.verify(payload);
  },
  async cancel(cancelAtCycleEnd = true) {
    return subscriptionService.cancel(cancelAtCycleEnd);
  },
};

export default subscriptionRepository;
