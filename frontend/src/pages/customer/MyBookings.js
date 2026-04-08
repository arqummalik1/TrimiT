import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { 
  CalendarCheck, 
  Clock, 
  MapPin, 
  Phone,
  XCircle,
  CheckCircle,
  Warning,
  Hourglass
} from '@phosphor-icons/react';
import api from '../../lib/api';
import { formatPrice, formatTime, getStatusColor, getPaymentStatusColor } from '../../lib/utils';

const MyBookings = () => {
  const queryClient = useQueryClient();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['myBookings'],
    queryFn: async () => {
      const response = await api.get('/api/bookings');
      return response.data;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (bookingId) => {
      await api.patch(`/api/bookings/${bookingId}/status`, { status: 'cancelled' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['myBookings']);
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
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-stone-200 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-12" data-testid="my-bookings">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-heading text-3xl font-bold text-stone-900 mb-2">
            My Bookings
          </h1>
          <p className="text-stone-500 mb-8">
            View and manage your salon appointments
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
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-heading text-lg font-bold text-stone-900 mb-1">
                        {booking.services?.name || 'Service'}
                      </h3>
                      <p className="text-stone-600 font-medium">
                        {booking.salons?.name || 'Salon'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                        {getStatusIcon(booking.status)}
                        <span className="capitalize">{booking.status}</span>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm text-stone-600">
                      <CalendarCheck size={18} className="text-stone-400" />
                      {format(new Date(booking.booking_date), 'EEE, d MMM')}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-stone-600">
                      <Clock size={18} className="text-stone-400" />
                      {formatTime(booking.time_slot)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-stone-600">
                      <MapPin size={18} className="text-stone-400" />
                      <span className="truncate">{booking.salons?.address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-stone-600">
                      <Phone size={18} className="text-stone-400" />
                      {booking.salons?.phone}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-stone-100">
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${getPaymentStatusColor(booking.payment_status)}`}>
                        Payment: {booking.payment_status}
                      </span>
                      <span className="font-bold text-orange-800">
                        {formatPrice(booking.amount || 0)}
                      </span>
                    </div>

                    {booking.status === 'pending' && (
                      <button
                        onClick={() => cancelMutation.mutate(booking.id)}
                        disabled={cancelMutation.isPending}
                        data-testid={`cancel-booking-${booking.id}`}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <XCircle size={18} />
                        Cancel
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
            <p className="text-stone-500 mb-6">
              You haven't made any bookings yet. Start by exploring salons near you.
            </p>
            <Link to="/discover" className="btn-primary inline-flex items-center gap-2">
              Discover Salons
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default MyBookings;
