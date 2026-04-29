import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format, addDays, isBefore, startOfToday, isSameDay, parse } from 'date-fns';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  CurrencyInr,
  CheckCircle,
  Timer,
  Warning,
  CreditCard
} from '@phosphor-icons/react';
import api from '../../lib/api';
import { formatPrice, formatTime } from '../../lib/utils';
import { useToastStore } from '../../store/toastStore';

const BookingPage = () => {
  const { salonId, serviceId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error } = useToastStore();

  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingData, setBookingData] = useState(null);

  // Fetch salon details
  const { data: salon } = useQuery({
    queryKey: ['salon', salonId],
    queryFn: async () => {
      const response = await api.get(`/api/salons/${salonId}`);
      return response.data;
    },
  });

  // Fetch available slots
  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ['slots', salonId, serviceId, selectedDate],
    queryFn: async () => {
      const response = await api.get(`/api/salons/${salonId}/slots`, {
        params: { date: selectedDate, service_id: serviceId },
      });
      return response.data;
    },
    enabled: !!selectedDate,
  });
  
  const slots = slotsData?.slots || [];
  
  // Filter slots: hide past times for today
  const filteredSlots = slots.filter(slot => {
    const selectedDateObj = parse(selectedDate, 'yyyy-MM-dd', new Date());
    const isToday = isSameDay(selectedDateObj, new Date());
    
    if (!isToday) {
      // For future dates, show all slots
      return true;
    }
    
    // For today, only show slots that are in the future
    const now = new Date();
    const [hours, minutes] = slot.time.split(':').map(Number);
    const slotTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
    
    return slotTime > now;
  });

  // Create booking mutation
  const bookingMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/bookings', {
        salon_id: salonId,
        service_id: serviceId,
        booking_date: selectedDate,
        time_slot: selectedSlot,
      });
      return response.data;
    },
    onSuccess: (data) => {
      setBookingData(data);
      setBookingComplete(true);
      queryClient.invalidateQueries(['bookings']);
      
      // Show success toast
      success('Your appointment has been successfully booked!', {
        title: 'Booking Confirmed',
        duration: 5000
      });
    },
    onError: (err) => {
      // Re-fetch slots immediately so user sees updated availability
      queryClient.invalidateQueries(['slots', salonId, serviceId, selectedDate]);
      setSelectedSlot(null);

      const errorMessage = err?.response?.data?.detail || 'Failed to create booking. Please try again.';
      error(errorMessage, {
        title: 'Booking Failed',
        duration: 0,
        actions: [
          {
            label: 'Pick Another Slot',
            primary: true,
            onClick: () => {}
          }
        ]
      });
    }
  });

  const service = salon?.services?.find(s => s.id === serviceId);
  const today = startOfToday();
  
  // Generate next 14 days
  const dates = [...Array(14)].map((_, i) => {
    const date = addDays(today, i);
    return {
      value: format(date, 'yyyy-MM-dd'),
      display: format(date, 'EEE'),
      day: format(date, 'd'),
      month: format(date, 'MMM'),
    };
  });

  const handleBooking = () => {
    if (!selectedSlot) return;
    
    // Show processing toast
    const processingToast = useToastStore.getState().info('Processing your booking...', {
      title: 'Please Wait',
      duration: 30000 // Will be replaced by success/error
    });
    
    bookingMutation.mutate(undefined, {
      onSettled: () => {
        // Remove processing toast
        useToastStore.getState().removeToast(processingToast);
      }
    });
  };

  if (bookingComplete && bookingData) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={48} weight="fill" className="text-emerald-600" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-stone-900 mb-2">
            Booking Confirmed!
          </h1>
          <p className="text-stone-500 mb-6">
            Your appointment has been successfully booked
          </p>

          <div className="bg-stone-50 rounded-2xl p-5 mb-6 text-left">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-stone-500">Salon</span>
                <span className="font-semibold text-stone-900">{salon?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Service</span>
                <span className="font-semibold text-stone-900">{service?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Date</span>
                <span className="font-semibold text-stone-900">
                  {format(new Date(selectedDate), 'EEE, d MMM yyyy')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Time</span>
                <span className="font-semibold text-stone-900">{formatTime(selectedSlot)}</span>
              </div>
              {/* Savings message for offers on success page */}
              {service?.is_on_offer && service?.original_price && (
                <div className="flex justify-between items-center bg-green-50 p-3 rounded-lg">
                  <span className="text-green-700 font-medium">
                    🎉 You saved {service.discount_percentage}%!
                  </span>
                  <span className="text-green-800 font-bold">
                    -{formatPrice(service.original_price - service.price)}
                  </span>
                </div>
              )}
              
              <div className="border-t border-stone-200 pt-3 flex justify-between">
                <span className="text-stone-500">Amount</span>
                <span className="font-bold text-orange-800 text-lg">
                  {formatPrice(service?.price || 0)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/my-bookings')}
              data-testid="view-bookings-btn"
              className="flex-1 btn-primary"
            >
              View My Bookings
            </button>
            <button
              onClick={() => navigate('/discover')}
              className="flex-1 px-6 py-3 border border-stone-200 rounded-full font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-12" data-testid="booking-page">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 sticky top-16 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              data-testid="back-btn"
              className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center hover:bg-stone-200 transition-colors"
            >
              <ArrowLeft size={20} className="text-stone-700" />
            </button>
            <div>
              <h1 className="font-heading text-xl font-bold text-stone-900">
                Book Appointment
              </h1>
              <p className="text-sm text-stone-500">{salon?.name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Service Summary */}
        {service && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-stone-200 p-5 mb-6"
          >
            <h2 className="font-heading text-lg font-bold text-stone-900 mb-3">
              {service.name}
            </h2>
            <div className="flex items-center gap-6 text-sm">
              <span className="flex items-center gap-1.5 text-stone-600">
                <Timer size={18} weight="bold" />
                {service.duration} mins
              </span>
              <span className="font-semibold text-orange-800">
                {formatPrice(service.price)}
              </span>
            </div>
          </motion.div>
        )}

        {/* Date Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <h2 className="font-heading text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
            <Calendar size={22} weight="duotone" />
            Select Date
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {dates.map((date) => (
              <button
                key={date.value}
                onClick={() => {
                  setSelectedDate(date.value);
                  setSelectedSlot(null);
                }}
                data-testid={`date-${date.value}`}
                className={`flex-shrink-0 w-16 py-3 rounded-xl text-center transition-all ${
                  selectedDate === date.value
                    ? 'bg-orange-800 text-white'
                    : 'bg-white border border-stone-200 text-stone-700 hover:border-orange-800'
                }`}
              >
                <span className="block text-xs font-medium opacity-70">
                  {date.display}
                </span>
                <span className="block text-xl font-bold">{date.day}</span>
                <span className="block text-xs font-medium opacity-70">
                  {date.month}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Time Slots */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="font-heading text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
            <Clock size={22} weight="duotone" />
            Select Time
          </h2>
          
          {slotsLoading ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="h-12 bg-stone-200 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredSlots?.length > 0 ? (
            <>
              {/* Show legend when multi-booking is enabled */}
              {slotsData?.allow_multiple_bookings_per_slot && (
                <div className="flex items-center gap-4 mb-3 text-xs text-stone-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Available
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Filling up
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-400" /> Full
                  </span>
                </div>
              )}
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {filteredSlots.map((slot) => {
                  const isMulti = slot.allow_multiple;
                  const count = slot.booking_count || 0;
                  const max = slot.max_bookings || 1;
                  const fillRatio = isMulti ? count / max : count;
                  const isFillingUp = isMulti && count > 0 && count < max;
                  const isFull = !slot.available;

                  return (
                    <button
                      key={slot.time}
                      onClick={() => slot.available && setSelectedSlot(slot.time)}
                      disabled={!slot.available}
                      data-testid={`slot-${slot.time}`}
                      className={`relative py-3 px-2 rounded-xl text-sm font-medium transition-all ${
                        isFull
                          ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                          : selectedSlot === slot.time
                          ? 'bg-orange-800 text-white'
                          : isFillingUp
                          ? 'bg-amber-50 border border-amber-200 text-stone-700 hover:border-orange-800'
                          : 'bg-white border border-stone-200 text-stone-700 hover:border-orange-800 hover:text-orange-800'
                      }`}
                    >
                      <span className={isFull && !isMulti ? 'line-through' : ''}>
                        {formatTime(slot.time)}
                      </span>
                      {/* Show booking count for multi-booking slots */}
                      {isMulti && (
                        <span className={`block text-[10px] mt-0.5 ${
                          isFull
                            ? 'text-red-400'
                            : selectedSlot === slot.time
                            ? 'text-white/70'
                            : isFillingUp
                            ? 'text-amber-600'
                            : 'text-stone-400'
                        }`}>
                          {isFull ? 'Full' : `${count}/${max} booked`}
                        </span>
                      )}
                      {/* Show "Booked" label for single-booking slots that are taken */}
                      {!isMulti && isFull && (
                        <span className="block text-[10px] mt-0.5 text-red-400 font-medium">
                          Booked
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="bg-stone-100 rounded-2xl p-6 text-center">
              <Warning size={32} weight="duotone" className="mx-auto text-stone-400 mb-2" />
              <p className="text-stone-600">No available slots for this date</p>
            </div>
          )}
        </motion.div>

        {/* Booking Summary & CTA */}
        {selectedSlot && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-stone-200 p-5"
          >
            <h3 className="font-heading text-lg font-bold text-stone-900 mb-4">
              Booking Summary
            </h3>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Date</span>
                <span className="font-medium text-stone-900">
                  {format(new Date(selectedDate), 'EEEE, d MMMM yyyy')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Time</span>
                <span className="font-medium text-stone-900">{formatTime(selectedSlot)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Duration</span>
                <span className="font-medium text-stone-900">{service?.duration} mins</span>
              </div>
              {/* Savings message for offers */}
              {service?.is_on_offer && service?.original_price && (
                <div className="flex justify-between text-sm bg-green-50 p-3 rounded-lg">
                  <span className="text-green-700 font-medium">
                    🎉 You save {service.discount_percentage}%!
                  </span>
                  <span className="text-green-800 font-bold">
                    -{formatPrice(service.original_price - service.price)}
                  </span>
                </div>
              )}
              
              <div className="border-t border-stone-200 pt-3 flex justify-between">
                <span className="font-medium text-stone-700">Total Amount</span>
                <span className="font-bold text-orange-800 text-lg">
                  {formatPrice(service?.price || 0)}
                </span>
              </div>
            </div>

            <button
              onClick={handleBooking}
              disabled={bookingMutation.isPending}
              data-testid="confirm-booking-btn"
              className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {bookingMutation.isPending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CreditCard size={20} />
                  Confirm Booking
                </>
              )}
            </button>

            {bookingMutation.isError && (
              <p className="mt-3 text-sm text-red-600 text-center">
                {bookingMutation.error?.response?.data?.detail || 'Failed to create booking'}
              </p>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default BookingPage;
