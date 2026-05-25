import { useMutation } from '@tanstack/react-query';
import { earlyAccessRepository } from '../repositories/earlyAccessRepository';
import { useToastStore } from '../store/toastStore';

/**
 * Early Access Viewmodel Hook.
 * Manages the state and submit mutation of the early access email registration.
 */
export function useEarlyAccessViewModel() {
  const toast = useToastStore();
  
  const mutation = useMutation({
    mutationFn: async (email) => {
      return await earlyAccessRepository.registerEmail(email);
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Successfully registered for early access!', { title: 'Success' });
    },
    onError: (err) => {
      const detail = err.response?.data?.error?.message || err.response?.data?.detail || 'Failed to register. Please try again.';
      toast.error(detail, { title: 'Error' });
    }
  });

  return {
    register: mutation.mutate,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.error?.response?.data?.error?.message || mutation.error?.response?.data?.detail || mutation.error?.message || null,
    reset: mutation.reset
  };
}

export default useEarlyAccessViewModel;
