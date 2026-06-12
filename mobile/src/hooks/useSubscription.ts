import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionRepository } from '../repositories/subscriptionRepository';
import { queryKeys } from '../lib/queryKeys';
import { useAuthStore } from '../store/authStore';
import { ENABLE_SUBSCRIPTIONS, ENABLE_SUBSCRIPTION_ENFORCEMENT } from '../lib/featureFlags';

/** Owner subscription (full view). Only fetches for owners. */
export function useSubscription() {
  const role = useAuthStore((s) => s.user?.role);
  const enabled = ENABLE_SUBSCRIPTIONS && role === 'owner';

  return useQuery({
    queryKey: queryKeys.subscription,
    queryFn: () => subscriptionRepository.getCurrent(),
    enabled,
    staleTime: 60_000,
    retry: 2,
  });
}

/** Lightweight status — used for banners + the Phase 2 freeze gate. */
export function useSubscriptionStatus() {
  const role = useAuthStore((s) => s.user?.role);
  // The freeze gate is driven by enforcement, which can be on even if the
  // subscription UI flag is off — so this query must run when EITHER flag is on,
  // otherwise the gate would never receive a status and never block.
  const enabled =
    (ENABLE_SUBSCRIPTIONS || ENABLE_SUBSCRIPTION_ENFORCEMENT) && role === 'owner';

  return useQuery({
    queryKey: queryKeys.subscriptionStatus,
    queryFn: () => subscriptionRepository.getStatus(),
    enabled,
    staleTime: 60_000,
    retry: 2,
  });
}

export function usePaymentHistory() {
  const role = useAuthStore((s) => s.user?.role);
  const enabled = ENABLE_SUBSCRIPTIONS && role === 'owner';

  return useQuery({
    queryKey: queryKeys.subscriptionHistory,
    queryFn: () => subscriptionRepository.getHistory(),
    enabled,
    staleTime: 30_000,
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cancelAtCycleEnd: boolean) =>
      subscriptionRepository.cancel(cancelAtCycleEnd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subscription });
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptionStatus });
    },
  });
}

/** Invalidate all subscription queries after a successful payment. */
export function useRefreshSubscription() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.subscription });
    queryClient.invalidateQueries({ queryKey: queryKeys.subscriptionStatus });
    queryClient.invalidateQueries({ queryKey: queryKeys.subscriptionHistory });
  };
}
