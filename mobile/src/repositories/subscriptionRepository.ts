import { subscriptionService } from '../services/subscriptionService';
import {
  Subscription,
  SubscriptionStatusView,
  PaymentHistory,
  CreateSubscriptionResponse,
  VerifySubscriptionPayload,
} from '../types/subscription';
import { logger } from '../lib/logger';

export const subscriptionRepository = {
  async getCurrent(): Promise<Subscription> {
    return await subscriptionService.getCurrent();
  },

  async getStatus(): Promise<SubscriptionStatusView> {
    return await subscriptionService.getStatus();
  },

  async getHistory(): Promise<PaymentHistory> {
    try {
      return await subscriptionService.getHistory();
    } catch (error) {
      logger.error('[SubscriptionRepository] getHistory failed', error);
      return { total_paid: 0, currency: 'INR', payments: [] };
    }
  },

  async create(): Promise<CreateSubscriptionResponse> {
    return await subscriptionService.create();
  },

  async verify(payload: VerifySubscriptionPayload): Promise<{ status: string; message: string }> {
    return await subscriptionService.verify(payload);
  },

  async cancel(cancelAtCycleEnd: boolean = true): Promise<{ status: string; message: string }> {
    return await subscriptionService.cancel(cancelAtCycleEnd);
  },
};
