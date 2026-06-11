import api from '../lib/api';
import { createIdempotencyKey } from '../lib/idempotency';

/** Owner subscription API (mirrors mobile contract). */
export const subscriptionService = {
  getCurrent: async () => {
    const res = await api.get('/subscriptions/current');
    return res.data;
  },
  getStatus: async () => {
    const res = await api.get('/subscriptions/status');
    return res.data;
  },
  getHistory: async () => {
    const res = await api.get('/subscriptions/history');
    return res.data;
  },
  create: async () => {
    const res = await api.post('/subscriptions/create', {});
    return res.data;
  },
  verify: async (payload) => {
    const res = await api.post('/subscriptions/verify', payload, {
      headers: { 'Idempotency-Key': createIdempotencyKey() },
    });
    return res.data;
  },
  cancel: async (cancelAtCycleEnd = true) => {
    const res = await api.post('/subscriptions/cancel', {
      cancel_at_cycle_end: cancelAtCycleEnd,
    });
    return res.data;
  },
};

export default subscriptionService;
