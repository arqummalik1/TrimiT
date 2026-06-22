import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bankAccountRepository } from '../repositories/BankAccountRepository';
import { queryKeys } from '../lib/queryKeys';
import { useAuthStore } from '../store/authStore';
import { BankAccountCreate } from '../services/bankAccountService';

export function useBankAccount() {
  const role = useAuthStore((s) => s.user?.role);
  const enabled = role === 'owner';

  return useQuery({
    queryKey: ['bankAccount'],
    queryFn: () => bankAccountRepository.getBankAccount(),
    enabled,
    staleTime: 60_000,
    retry: 2,
  });
}

export function useSaveBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BankAccountCreate) => bankAccountRepository.saveBankAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankAccount'] });
    },
  });
}
