import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { 
  CalendarCheck, 
  Clock, 
  User,
  Phone,
  CheckCircle,
  XCircle,
  Hourglass,
  Scissors,
  CurrencyInr,
  Spinner
} from '@phosphor-icons/react';
import api from '../../lib/api';
import { useToastStore } from '../../store/toastStore';
import { formatPrice, formatTime, getStatusColor, getPaymentStatusColor } from '../../lib/utils';

const ManageBookings = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToastStore();

  const { data: salon, isLoading: salonLoading } = useQuery({
    queryKey: ['ownerSalon'],
    queryFn: async () => {
      const response = await api.get('/api/owner/salon');
      return response.data;
    },
  });

  const { data: rawBookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['ownerBookings'],
    queryFn: async () => {
      const response = await api.get('/api/bookings');
      return response.data;
    },
    enabled: !!salon,
  });

  // Sort bookings by booking date and time slot - newest first
  const bookings = React.useMemo(() => {
    if (!rawBookings) return [];
    return [...rawBookings].sort((a, b) => {
      // First sort by booking_date (newest first)
      const dateA = new Date(a.booking_date || 0);
      const dateB = new Date(b.booking_date || 0);
      if (dateB - dateA !== 0) return dateB - dateA;
      
      // Then sort by time_slot (newest first)
      const timeA = a.time_slot || '';
      const timeB = b.time_slot || '';
      return timeB.localeCompare(timeA);
    });
  }, [rawBookings]);

  // Accept booking mutation
  const acceptMutation = useMutation({
    mutationFn: async (bookingId) => {
      return await api.post(`/api/owner/bookings/${bookingId}/accept`);
    },
    onSuccess: () => {
      success('Booking accepted successfully!', { title: 'Success' });
      queryClient.invalidateQueries(['ownerBookings']);
      queryClient.invalidateQueries(['ownerAnalytics']);
    },
    onError: (err) => {
      error(err.response?.data?.detail || 'Failed to accept booking', { title: 'Error' });
    },
  });

  // Reject booking mutation
  const rejectMutation = useMutation({
    mutationFn: async (bookingId) => {
      return await api.post(`/api/owner/bookings/${bookingId}/reject`);
    },
    onSuccess: () => {
      success('Booking rejected successfully!', { title: 'Success' });
      queryClient.invalidateQueries(['ownerBookings']);
      queryClient.invalidateQueries(['ownerAnalytics']);
    },
    onError: (err) => {
      error(err.response?.data?.detail || 'Failed to reject booking', { title: 'Error' });
    },
  });

  // Complete booking mutation
  const completeMutation = useMutation({
    mutationFn: async (bookingId) => {
      await api.patch(`/api/bookings/${bookingId}/status`, { status: 'completed' });
    },
    onSuccess: () => {
      success('Booking marked as completed!', { title: 'Success' });
      queryClient.invalidateQueries(['ownerBookings']);
      queryClient.invalidateQueries(['ownerAnalytics']);
    },
    onError: (err) => {
      error(err.response?.data?.detail || 'Failed to complete booking', { title: 'Error' });
    },
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed': return <CheckCircle size={18} weight="fill" className="text-blue-600" />;
      case 'completed': return <CheckCircle size={18} weight="fill" className="text-green-600" />;
      case 'cancelled': return <XCircle size={18} weight="fill" className="text-red-600" />;
      default: return <Hourglass size={18} weight="fill" className="text-yellow-600" />;
    }
  };

  if (salonLoading) {
    return (
      <div className="min-h-screen bg-stone-50 p-8">
        <div className="max-w-4xl mx-auto animate-pulse">
          {/* Header shimmer */}
          <div className="h-8 bg-stone-200 rounded mb-2 w-32" />
          <div className="h-4 bg-stone-200 rounded mb-8 w-48" />
          {/* Bookings shimmer */}
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-stone-200 p-5">
                <div className="flex justify-between mb-4">
                  <div className="h-4 bg-stone-200 rounded w-32" />
                  <div className="h-6 bg-stone-200 rounded w-20" />
                </div>
                <div className="h-20 bg-stone-200 rounded-xl mb-4" />
                <div className="flex justify-between">
                  <div className="h-4 bg-stone-200 rounded w-24" />
                  <div className="flex gap-2">
                    <div className="h-8 bg-stone-200 rounded w-20" />
                    <div className="h-8 bg-stone-200 rounded w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!salon) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-8">
        <div className="text-center">
          <CalendarCheck size={64} weight="duotone" className="mx-auto text-stone-300 mb-4" />
          <h2 className="font-heading text-2xl font-bold text-stone-700 mb-2">
            Create Your Salon First
          </h2>
          <p className="text-stone-500 mb-6">
            You need to create a salon before viewing bookings.
          </p>
          <Link to="/owner/salon" className="btn-primary">
            Create Salon
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-12" data-testid="manage-bookings">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-heading text-3xl font-bold text-stone-900 mb-2">
            Bookings
          </h1>
          <p className="text-stone-500 mb-8">
            Manage customer appointments
          </p>
        </motion.div>

        {bookingsLoading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-stone-200 p-5">
                <div className="flex justify-between mb-4">
                  <div className="h-4 bg-stone-200 rounded w-32" />
                  <div className="h-6 bg-stone-200 rounded w-20" />
                </div>
                <div className="h-20 bg-stone-200 rounded-xl mb-4" />
                <div className="flex justify-between">
                  <div className="h-4 bg-stone-200 rounded w-24" />
                  <div className="flex gap-2">
                    <div className="h-8 bg-stone-200 rounded w-20" />
                    <div className="h-8 bg-stone-200 rounded w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : bookings?.length > 0 ? (
          <div className="space-y-4">
            {bookings.map((booking, index) => (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-lg transition-all duration-300"
                data-testid={`booking-${booking.id}`}
              >
                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <User size={18} className="text-stone-400" />
                        <span className="font-semibold text-stone-900">
                          {booking.users?.name || 'Customer'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-stone-500">
                        <Phone size={14} />
                        {booking.users?.phone || 'N/A'}
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                      {getStatusIcon(booking.status)}
                      <span className="capitalize">{booking.status}</span>
                    </span>
                  </div>

                  {/* Service Details */}
                  <div className="bg-stone-50 rounded-xl p-4 mb-4">
                    <h4 className="font-semibold text-stone-900 mb-2">
                      {booking.services?.name || 'Service'}
                    </h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-stone-600">
                        <CalendarCheck size={16} className="text-stone-400" />
                        {format(new Date(booking.booking_date), 'EEE, d MMM')}
                      </div>
                      <div className="flex items-center gap-2 text-stone-600">
                        <Clock size={16} className="text-stone-400" />
                        {formatTime(booking.time_slot)}
                      </div>
                      <div className="flex items-center gap-2 text-orange-800 font-semibold">
                        <CurrencyInr size={16} />
                        {formatPrice(booking.amount || 0)}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${getPaymentStatusColor(booking.payment_status)}`}>
                      Payment: {booking.payment_status}
                    </span>

                    {/* Actions */}
                    {booking.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => acceptMutation.mutate(booking.id)}
                          disabled={acceptMutation.isPending || rejectMutation.isPending}
                          data-testid={`confirm-booking-${booking.id}`}
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-100 text-emerald-800 rounded-lg text-sm font-medium hover:bg-emerald-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {acceptMutation.isPending ? (
                            <Spinner size={16} className="animate-spin" />
                          ) : (
                            <CheckCircle size={16} />
                          )}
                          {acceptMutation.isPending ? 'Accepting...' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => rejectMutation.mutate(booking.id)}
                          disabled={acceptMutation.isPending || rejectMutation.isPending}
                          data-testid={`reject-booking-${booking.id}`}
                          className="flex items-center gap-1.5 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {rejectMutation.isPending ? (
                            <Spinner size={16} className="animate-spin" />
                          ) : (
                            <XCircle size={16} />
                          )}
                          {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
                        </button>
                      </div>
                    )}

                    {booking.status === 'confirmed' && (
                      <button
                        onClick={() => completeMutation.mutate(booking.id)}
                        disabled={completeMutation.isPending}
                        data-testid={`complete-booking-${booking.id}`}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {completeMutation.isPending ? (
                          <Spinner size={16} className="animate-spin" />
                        ) : (
                          <CheckCircle size={16} />
                        )}
                        {completeMutation.isPending ? 'Completing...' : 'Mark Complete'}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-stone-200 p-12 text-center"
          >
            <CalendarCheck size={64} weight="duotone" className="mx-auto text-stone-300 mb-4" />
            <h3 className="font-heading text-xl font-bold text-stone-700 mb-2">
              No Bookings Yet
            </h3>
            <p className="text-stone-500">
              You'll see customer bookings here once they start coming in
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ManageBookings;
