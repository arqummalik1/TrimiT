import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { formatPrice, formatTime, normalizeSlotTimeToHHMM, getApiErrorMessage } from '../../lib/utils';
import { ENABLE_MULTI_BOOKING_PER_SLOT } from '../../lib/featureFlags';
import { createIdempotencyKey } from '../../lib/idempotency';
import { useToastStore } from '../../store/toastStore';

const HOLD_SECONDS = 90;
const RESERVE_TIMEOUT_MS = 28000;

const BookingPage = () => {
  const { salonId, serviceId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error: showError } = useToastStore();

  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [holdId, setHoldId] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingData, setBookingData] = useState(null);

  const idempotencyKeyRef = useRef(null);
  const timerRef = useRef(null);

  const clearHoldTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimeLeft(null);
    setHoldId(null);
  }, []);

  const resetBookingAttempt = useCallback(() => {
    idempotencyKeyRef.current = null;
    clearHoldTimer();
  }, [clearHoldTimer]);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (timeLeft !== 0) return;
    setSelectedSlot(null);
    resetBookingAttempt();
    showError('Your temporary reservation expired. Please select your time slot again.', {
      title: 'Hold expired',
      duration: 6000,
    });
  }, [timeLeft, resetBookingAttempt, showError]);

  const startHoldCountdown = useCallback(() => {
    setTimeLeft(HOLD_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Fetch salon details
  const { data: salon } = useQuery({
    queryKey: ['salon', salonId],
    queryFn: async () => {
      const response = await api.get(`/salons/${salonId}`);
      return response.data;
    },
  });

  // Fetch available slots
  const { data: slotsData, isLoading: slotsLoading, refetch: refetchSlots } = useQuery({
    queryKey: ['slots', salonId, serviceId, selectedDate],
    queryFn: async () => {
      const currentTime = format(new Date(), 'HH:mm');
      const response = await api.get('/bookings/slots', {
        params: {
          salon_id: salonId,
          service_id: serviceId,
          date: selectedDate,
          current_time: currentTime,
        },
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
    
    // For today, only show slots that are in the future (with 5-min grace)
    const now = new Date();
    const graceTime = new Date(now.getTime() - 5 * 60000); // 5 minutes ago
    const [hours, minutes] = slot.time.split(':').map(Number);
    const slotTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
    
    return slotTime > graceTime;

  });

  const reserveMutation = useMutation({
    mutationFn: async (slot) => {
      const slotKey = normalizeSlotTimeToHHMM(slot) || slot;
      const response = await api.post(
        '/bookings/reserve',
        {
          salon_id: salonId,
          service_id: serviceId,
          booking_date: selectedDate,
          time_slot: slotKey,
        },
        { timeout: RESERVE_TIMEOUT_MS }
      );
      return response.data;
    },
    onSuccess: (data) => {
      setHoldId(data.hold_id ?? null);
      startHoldCountdown();
    },
    onError: (err) => {
      setHoldId(null);
      setTimeLeft(null);
      const msg = getApiErrorMessage(err, 'This slot is currently unavailable.');
      if (err?.response?.status === 409) {
        setSelectedSlot(null);
        showError(msg, { title: 'Slot unavailable', duration: 6000 });
        refetchSlots();
        return;
      }
      showError(
        'We could not reserve this slot yet. You can still tap Confirm booking to try again.',
        { title: 'Reservation pending', duration: 5000 }
      );
    },
  });

  const bookingMutation = useMutation({
    mutationFn: async () => {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = createIdempotencyKey();
      }
      const slotKey = normalizeSlotTimeToHHMM(selectedSlot) || selectedSlot;
      const response = await api.post(
        '/bookings/',
        {
          salon_id: salonId,
          service_id: serviceId,
          booking_date: selectedDate,
          time_slot: slotKey,
          payment_method: 'salon_cash',
        },
        {
          headers: { 'Idempotency-Key': idempotencyKeyRef.current },
          timeout: RESERVE_TIMEOUT_MS,
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      idempotencyKeyRef.current = null;
      clearHoldTimer();
      setBookingData(data);
      setBookingComplete(true);
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['slots', salonId, serviceId, selectedDate] });
      success('Your appointment has been successfully booked!', {
        title: 'Booking Confirmed',
        duration: 5000,
      });
    },
    onError: (err) => {
      queryClient.invalidateQueries({ queryKey: ['slots', salonId, serviceId, selectedDate] });
      const status = err?.response?.status;
      const errorMessage = getApiErrorMessage(
        err,
        'Failed to create booking. Please try again.'
      );

      if (status === 409) {
        setSelectedSlot(null);
        resetBookingAttempt();
        refetchSlots();
      }

      showError(errorMessage, {
        title: 'Booking Failed',
        duration: 0,
        actions: [
          {
            label: 'Pick Another Slot',
            primary: true,
            onClick: () => {},
          },
        ],
      });
    },
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

  const handleSelectSlot = (slotTime) => {
    idempotencyKeyRef.current = null;
    setSelectedSlot(slotTime);
    setHoldId(null);
    setTimeLeft(null);
    reserveMutation.mutate(slotTime);
  };

  const handleSelectDate = (dateValue) => {
    setSelectedDate(dateValue);
    setSelectedSlot(null);
    resetBookingAttempt();
  };

  const handleBooking = async () => {
    if (!selectedSlot || bookingMutation.isPending || reserveMutation.isPending) return;

    let activeHoldId = holdId;

    if (!activeHoldId) {
      try {
        const reserveData = await reserveMutation.mutateAsync(selectedSlot);
        activeHoldId = reserveData?.hold_id ?? null;
      } catch (reserveErr) {
        showError(
          getApiErrorMessage(
            reserveErr,
            'Please tap your time slot again, then confirm booking.'
          ),
          { title: 'Could not reserve slot', duration: 6000 }
        );
        return;
      }
    }

    if (!activeHoldId) {
      showError('Please tap your time slot again, then confirm booking.', {
        title: 'Slot not held',
        duration: 6000,
      });
      return;
    }

    if (timeLeft !== null && timeLeft <= 0) {
      try {
        const reserveData = await reserveMutation.mutateAsync(selectedSlot);
        activeHoldId = reserveData?.hold_id ?? activeHoldId;
      } catch {
        setSelectedSlot(null);
        resetBookingAttempt();
        showError('Your temporary reservation expired. Please select your time slot again.', {
          title: 'Hold expired',
          duration: 6000,
        });
        return;
      }
    }

    const processingToast = useToastStore.getState().info('Processing your booking...', {
      title: 'Please Wait',
      duration: 30000,
    });

    bookingMutation.mutate(undefined, {
      onSettled: () => {
        useToastStore.getState().removeToast(processingToast);
      },
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
                onClick={() => handleSelectDate(date.value)}
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
              {ENABLE_MULTI_BOOKING_PER_SLOT && slotsData?.allow_multiple_bookings_per_slot && (
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
                  const isMulti = ENABLE_MULTI_BOOKING_PER_SLOT && slot.allow_multiple;
                  const count = slot.booking_count || 0;
                  const max = slot.max_bookings || 1;
                  const fillRatio = isMulti ? count / max : count;
                  const isFillingUp = isMulti && count > 0 && count < max;
                  const isFull = !slot.available;

                  return (
                    <button
                      key={slot.time}
                      onClick={() => slot.available && handleSelectSlot(slot.time)}
                      disabled={!slot.available || (reserveMutation.isPending && selectedSlot === slot.time)}
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
            {timeLeft != null && timeLeft > 0 && (
              <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-4">
                Slot held for {timeLeft}s — confirm before it expires.
              </p>
            )}
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
              disabled={bookingMutation.isPending || reserveMutation.isPending}
              data-testid="confirm-booking-btn"
              className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {bookingMutation.isPending || reserveMutation.isPending ? (
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
                {getApiErrorMessage(bookingMutation.error, 'Failed to create booking')}
              </p>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default BookingPage;
