/**
 * Admin dashboard API service (founder-only).
 *
 * Uses a DEDICATED axios instance — NOT the shared `lib/api` user instance —
 * so the normal user auth interceptor (which attaches the Supabase token and
 * redirects to /login on 401) never interferes with admin calls. The admin
 * bearer token is passed explicitly per request. Callers handle 401/403 by
 * clearing the token and returning to the PIN screen.
 *
 * Base URL mirrors lib/api: <origin>/api/v1.
 */
import axios from 'axios';
import { getEnv } from '../config/env';

function resolveApiBaseUrl() {
  const raw = getEnv('BACKEND_URL').trim().replace(/\/$/, '');
  if (!raw) return 'https://trimit-az5h.onrender.com/api/v1';
  if (raw.endsWith('/api/v1')) return raw;
  if (raw.endsWith('/api')) return `${raw}/v1`;
  return `${raw}/api/v1`;
}

const adminApi = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

function authHeaders(token) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

export const adminService = {
  /** Exchange the dashboard PIN for the admin bearer token. */
  login: async (pin) => {
    const res = await adminApi.post('/admin/login', { pin });
    return res.data; // { token }
  },

  /** Top-line counts, subscription breakdown, MRR/ARR, visitor stats. */
  getOverview: async (token) => {
    const res = await adminApi.get('/admin/dashboard/overview', authHeaders(token));
    return res.data;
  },

  /** All salon owners with salon + subscription status + trial days left. */
  getOwners: async (token) => {
    const res = await adminApi.get('/admin/dashboard/owners', authHeaders(token));
    return res.data?.owners ?? [];
  },

  /** All customers. */
  getCustomers: async (token) => {
    const res = await adminApi.get('/admin/dashboard/customers', authHeaders(token));
    return res.data?.customers ?? [];
  },

  /** Activate/extend an owner's subscription by N days (manual grant). */
  grantSubscription: async (token, ownerId, days = 30) => {
    const res = await adminApi.post(
      '/admin/grant-subscription',
      { owner_id: ownerId, days },
      authHeaders(token)
    );
    return res.data;
  },

  /** Block a user from accessing the app. */
  blockUser: async (token, userId) => {
    const res = await adminApi.post('/admin/users/block', { user_id: userId }, authHeaders(token));
    return res.data;
  },

  /** Unblock a user. */
  unblockUser: async (token, userId) => {
    const res = await adminApi.post('/admin/users/unblock', { user_id: userId }, authHeaders(token));
    return res.data;
  },

  /** Delete a user (soft delete). */
  deleteUser: async (token, userId) => {
    const res = await adminApi.delete(`/admin/users/${userId}`, authHeaders(token));
    return res.data;
  },

  /** Send an invitation email to a new user. */
  inviteUser: async (token, email, name, role) => {
    const res = await adminApi.post('/admin/users/invite', { email, name, role }, authHeaders(token));
    return res.data;
  },

  /** Out-of-area demand leads (waitlist) + counts grouped by nearest city. */
  getWaitlistLeads: async (token, { limit = 200, offset = 0 } = {}) => {
    const res = await adminApi.get(
      `/admin/waitlist-leads?limit=${limit}&offset=${offset}`,
      authHeaders(token)
    );
    return res.data; // { leads, total, by_area }
  },

  /** Mark (or unmark) one or more waitlist leads as notified. */
  markLeadsNotified: async (token, leadIds, notified = true) => {
    const res = await adminApi.post(
      '/admin/waitlist-leads/mark-notified',
      { lead_ids: leadIds, notified },
      authHeaders(token)
    );
    return res.data;
  },

  getCampaigns: async (token) => {
    const res = await adminApi.get('/admin/campaigns', authHeaders(token));
    return res.data?.campaigns ?? [];
  },

  updateCampaign: async (token, campaignId, data) => {
    const res = await adminApi.patch(`/admin/campaigns/${campaignId}`, data, authHeaders(token));
    return res.data;
  },

  getCampaignSalons: async (token, campaignId) => {
    const res = await adminApi.get(`/admin/campaigns/${campaignId}/salons`, authHeaders(token));
    return res.data?.salons ?? [];
  },

  setCampaignSalonExclusions: async (token, campaignId, salonIds, excluded = true) => {
    const res = await adminApi.post(
      `/admin/campaigns/${campaignId}/salon-exclusions`,
      { salon_ids: salonIds, excluded },
      authHeaders(token)
    );
    return res.data;
  },

  includeAllCampaignSalons: async (token, campaignId) => {
    const res = await adminApi.post(
      `/admin/campaigns/${campaignId}/include-all-salons`,
      {},
      authHeaders(token)
    );
    return res.data;
  },
};

export default adminService;
