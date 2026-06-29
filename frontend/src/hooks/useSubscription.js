import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionRepository } from '../repositories/subscriptionRepository';
import { useAuthStore } from '../store/authStore';
import { ENABLE_SUBSCRIPTIONS } from '../lib/featureFlags';

const isOwner = (profile) => profile?.role === 'owner';

export function useSubscription() {
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['subscription'],
    queryFn: () => subscriptionRepository.getCurrent(),
    enabled: ENABLE_SUBSCRIPTIONS && isOwner(profile),
    staleTime: 60_000,
  });
}

export function useSubscriptionStatus() {
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['subscriptionStatus'],
    queryFn: () => subscriptionRepository.getStatus(),
    enabled: ENABLE_SUBSCRIPTIONS && isOwner(profile),
    staleTime: 60_000,
  });
}

export function usePaymentHistory() {
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['subscriptionHistory'],
    queryFn: () => subscriptionRepository.getHistory(),
    enabled: ENABLE_SUBSCRIPTIONS && isOwner(profile),
    staleTime: 30_000,
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cancelAtCycleEnd) => subscriptionRepository.cancel(cancelAtCycleEnd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptionStatus'] });
    },
  });
}

/** Create a Razorpay subscription order (owner). */
export function useCreateSubscription() {
  return useMutation({
    mutationFn: () => subscriptionRepository.create(),
    retry: false,
  });
}

/** Verify a completed Razorpay subscription payment, then refresh status. */
export function useVerifySubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => subscriptionRepository.verify(payload),
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptionStatus'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptionHistory'] });
    },
  });
}
