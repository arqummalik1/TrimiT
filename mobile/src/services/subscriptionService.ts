import apiClient from './apiClient';
import { createIdempotencyKey } from '../lib/idempotency';
import {
  Subscription,
  SubscriptionStatusView,
  PaymentHistory,
  CreateSubscriptionResponse,
  VerifySubscriptionPayload,
} from '../types/subscription';

export const subscriptionService = {
  getCurrent: async (): Promise<Subscription> => {
    const response = await apiClient.get('/subscriptions/current');
    return response.data;
  },

  getStatus: async (): Promise<SubscriptionStatusView> => {
    const response = await apiClient.get('/subscriptions/status');
    return response.data;
  },

  getHistory: async (): Promise<PaymentHistory> => {
    const response = await apiClient.get('/subscriptions/history');
    return response.data;
  },

  create: async (): Promise<CreateSubscriptionResponse> => {
    const response = await apiClient.post('/subscriptions/create', {});
    return response.data;
  },

  verify: async (payload: VerifySubscriptionPayload): Promise<{ status: string; message: string }> => {
    const response = await apiClient.post('/subscriptions/verify', payload, {
      headers: { 'Idempotency-Key': await createIdempotencyKey() },
    });
    return response.data;
  },

  cancel: async (cancelAtCycleEnd: boolean = true): Promise<{ status: string; message: string }> => {
    const response = await apiClient.post('/subscriptions/cancel', {
      cancel_at_cycle_end: cancelAtCycleEnd,
    });
    return response.data;
  },
};
