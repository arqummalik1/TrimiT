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
  CurrencyInr
} from '@phosphor-icons/react';
import api from '../../lib/api';
import { formatPrice, formatTime, getStatusColor, getPaymentStatusColor } from '../../lib/utils';

const ManageBookings = () => {
  const queryClient = useQueryClient();

  const { data: salon } = useQuery({
    queryKey: ['ownerSalon'],
    queryFn: async () => {
      const response = await api.get('/api/owner/salon');
      return response.data;
    },
  });

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['ownerBookings'],
    queryFn: async () => {
      const response = await api.get('/api/bookings');
      return response.data;
    },
    enabled: !!salon,
  });

  const statusMutation = useMutation({
    mutationFn: async ({ bookingId, status }) => {
      await api.patch(`/api/bookings/${bookingId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ownerBookings']);
      queryClient.invalidateQueries(['ownerAnalytics']);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 p-8">
        <div className="max-w-4xl mx-auto animate-pulse">
          <div className="h-8 bg-stone-200 rounded mb-8 w-48" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-stone-200 rounded-xl" />
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

        {bookings?.length > 0 ? (
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
                          onClick={() => statusMutation.mutate({ bookingId: booking.id, status: 'confirmed' })}
                          disabled={statusMutation.isPending}
                          data-testid={`confirm-booking-${booking.id}`}
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-100 text-emerald-800 rounded-lg text-sm font-medium hover:bg-emerald-200 transition-colors"
                        >
                          <CheckCircle size={16} weight="bold" />
                          Confirm
                        </button>
                        <button
                          onClick={() => statusMutation.mutate({ bookingId: booking.id, status: 'cancelled' })}
                          disabled={statusMutation.isPending}
                          data-testid={`reject-booking-${booking.id}`}
                          className="flex items-center gap-1.5 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                        >
                          <XCircle size={16} weight="bold" />
                          Reject
                        </button>
                      </div>
                    )}

                    {booking.status === 'confirmed' && (
                      <button
                        onClick={() => statusMutation.mutate({ bookingId: booking.id, status: 'completed' })}
                        disabled={statusMutation.isPending}
                        data-testid={`complete-booking-${booking.id}`}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
                      >
                        <CheckCircle size={16} weight="bold" />
                        Mark Complete
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
