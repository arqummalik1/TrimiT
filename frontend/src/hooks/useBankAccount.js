import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bankAccountRepository } from '../repositories/bankAccountRepository';
import { useAuthStore } from '../store/authStore';

const isOwner = (profile) => profile?.role === 'owner';

export function useBankAccount() {
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['bankAccount'],
    queryFn: () => bankAccountRepository.getBankAccount(),
    enabled: isOwner(profile),
    staleTime: 60_000,
  });
}

export function useCreateLinkedAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => bankAccountRepository.createLinkedAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankAccount'] });
    },
  });
}
