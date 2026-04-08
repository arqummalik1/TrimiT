export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(price);
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const formatTime = (timeString: string): string => {
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

export const getStatusColor = (status: string): { bg: string; text: string } => {
  const colors: Record<string, { bg: string; text: string }> = {
    pending: { bg: '#FEF3C7', text: '#92400E' },
    confirmed: { bg: '#DBEAFE', text: '#1E40AF' },
    completed: { bg: '#D1FAE5', text: '#065F46' },
    cancelled: { bg: '#FEE2E2', text: '#991B1B' },
  };
  return colors[status] || { bg: '#F3F4F6', text: '#374151' };
};

export const getPaymentStatusColor = (status: string): { bg: string; text: string } => {
  const colors: Record<string, { bg: string; text: string }> = {
    pending: { bg: '#FEF3C7', text: '#92400E' },
    paid: { bg: '#D1FAE5', text: '#065F46' },
    failed: { bg: '#FEE2E2', text: '#991B1B' },
    refunded: { bg: '#EDE9FE', text: '#5B21B6' },
  };
  return colors[status] || { bg: '#F3F4F6', text: '#374151' };
};

// Colors from design guidelines
export const colors = {
  primary: '#9A3412', // orange-800
  primaryLight: '#FFEDD5', // orange-100
  secondary: '#065F46', // emerald-800
  secondaryLight: '#D1FAE5', // emerald-100
  background: '#FAFAF9', // stone-50
  surface: '#FFFFFF',
  surfaceSecondary: '#F5F5F4', // stone-100
  text: '#1C1917', // stone-900
  textSecondary: '#78716C', // stone-500
  border: '#E7E5E4', // stone-200
  error: '#DC2626',
  success: '#059669',
  warning: '#D97706',
};
