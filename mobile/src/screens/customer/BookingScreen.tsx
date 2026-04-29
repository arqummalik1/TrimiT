import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, startOfToday } from 'date-fns';
import api from '../../lib/api';
import { Salon, TimeSlot, SlotsResponse } from '../../types';
import { colors, formatPrice, formatTime } from '../../lib/utils';
import { Button } from '../../components/Button';
import { useBookingStore } from '../../store/bookingStore';
import { scheduleBookingReminder } from '../../lib/notifications';
import { openNativeDirections } from '../../lib/maps';

interface BookingScreenProps {
  navigation: any;
  route: any;
}

export const BookingScreen: React.FC<BookingScreenProps> = ({ navigation, route }) => {
  const { salonId, serviceId } = route.params;
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [bookingComplete, setBookingComplete] = useState(false);
  const [slotConflictError, setSlotConflictError] = useState<string | null>(null);

  // Real-time booking store
  const {
    slots: realtimeSlots,
    justBookedSlots,
    needsRefresh,
    allowMultipleBookings,
    subscribeToSlots,
    unsubscribeFromSlots,
    updateSlots,
    refreshSlots,
  } = useBookingStore();

  // Get salon details
  const { data: salon } = useQuery<Salon>({
    queryKey: ['salon', salonId],
    queryFn: async () => {
      const response = await api.get(`/api/salons/${salonId}`);
      return response.data;
    },
  });

  const service = salon?.services?.find((s) => s.id === serviceId);

  // Get available slots with real-time sync
  const { data: slotsData, isLoading: slotsLoading, refetch: refetchSlots } = useQuery<SlotsResponse>({
    queryKey: ['slots', salonId, serviceId, selectedDate],
    queryFn: async () => {
      const response = await api.get(`/api/salons/${salonId}/slots`, {
        params: { date: selectedDate, service_id: serviceId },
      });
      return response.data;
    },
    enabled: !!selectedDate,
  });

  // Use real-time slots if available, otherwise use fetched slots
  const displaySlots = realtimeSlots.length > 0 ? realtimeSlots : (slotsData?.slots || []);
  const effectiveAllowMultiple = slotsData?.allow_multiple_bookings_per_slot ?? allowMultipleBookings;

  // Subscribe to real-time updates when slots are loaded
  useEffect(() => {
    if (slotsData?.slots && salonId && selectedDate) {
      subscribeToSlots(salonId, selectedDate, slotsData.slots, slotsData.allow_multiple_bookings_per_slot);
    }

    return () => {
      unsubscribeFromSlots();
    };
  }, [salonId, serviceId, selectedDate, slotsData]);

  // Create booking mutation
  const bookingMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/bookings', {
        salon_id: salonId,
        service_id: serviceId,
        booking_date: selectedDate,
        time_slot: selectedSlot,
        payment_method: selectedPaymentMethod,
      });
      return response.data;
    },
    onSuccess: (booking: any) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      unsubscribeFromSlots();

      // Schedule a reminder notification 1 hour before
      if (selectedDate && selectedSlot && salon && service) {
        scheduleBookingReminder(
          selectedDate,
          selectedSlot,
          salon.name,
          service.name
        ).catch(() => {}); // Silently ignore if notifications not permitted
      }

      // If online payment selected, route to payment screen
      if (selectedPaymentMethod === 'card' && booking?.id && service && salon && selectedSlot) {
        navigation.navigate('Payment', {
          bookingId: booking.id,
          amount: service.price,
          salonName: salon.name,
          serviceName: service.name,
          bookingDate: selectedDate,
          timeSlot: selectedSlot,
        });
      } else {
        setBookingComplete(true);
      }
    },
    onError: (error: any) => {
      const errorDetail = error.response?.data?.detail || 'Failed to create booking';
      const statusCode = error.response?.status;

      // Always re-fetch slots on error so user sees updated availability
      queryClient.invalidateQueries({ queryKey: ['slots', salonId, serviceId, selectedDate] });
      refetchSlots();
      setSelectedSlot(null);

      // Handle slot conflict specifically
      if (statusCode === 409 || statusCode === 400) {
        setSlotConflictError(errorDetail);
      } else {
        Alert.alert('Error', errorDetail);
      }
    },
  });

  // Generate next 14 days
  const today = startOfToday();
  const dates = [...Array(14)].map((_, i) => {
    const date = addDays(today, i);
    return {
      value: format(date, 'yyyy-MM-dd'),
      day: format(date, 'EEE'),
      date: format(date, 'd'),
      month: format(date, 'MMM'),
    };
  });

  const handleConfirmBooking = () => {
    if (!selectedSlot) {
      Alert.alert('Error', 'Please select a time slot');
      return;
    }

    // Check if slot was just booked by someone else
    if (justBookedSlots.has(selectedSlot) && !effectiveAllowMultiple) {
      Alert.alert(
        'Slot Unavailable',
        'This time slot was just booked by someone else. Please select another slot.',
        [{ text: 'OK', onPress: () => {
          setSelectedSlot(null);
          refetchSlots();
        }}]
      );
      return;
    }

    setSlotConflictError(null);
    bookingMutation.mutate();
  };

  // Handle refresh needed indicator
  const handleRefreshNeeded = () => {
    refreshSlots();
    refetchSlots();
  };

  // Show conflict error when booking fails due to conflict
  useEffect(() => {
    if (slotConflictError) {
      Alert.alert(
        'Booking Conflict',
        slotConflictError,
        [{ text: 'OK', onPress: () => {
          setSelectedSlot(null);
          refetchSlots();
        }}]
      );
    }
  }, [slotConflictError]);

  if (bookingComplete) {
    return (
      <SafeAreaView style={styles.successContainer}>
        <View style={styles.successContent}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color="#059669" />
          </View>
          <Text style={styles.successTitle}>Booking Confirmed!</Text>
          <Text style={styles.successText}>Your appointment has been successfully booked</Text>

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Salon</Text>
              <Text style={styles.summaryValue}>{salon?.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Service</Text>
              <Text style={styles.summaryValue}>{service?.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Date</Text>
              <Text style={styles.summaryValue}>
                {format(new Date(selectedDate), 'EEE, d MMM yyyy')}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Time</Text>
              <Text style={styles.summaryValue}>{formatTime(selectedSlot!)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatPrice(service?.price || 0)}</Text>
            </View>
          </View>

          <View style={styles.successButtons}>
            <Button
              title="View My Bookings"
              onPress={() => navigation.navigate('CustomerTabs', { screen: 'Bookings' })}
              style={{ flex: 1 }}
            />
            <Button
              title="Back to Home"
              onPress={() => navigation.navigate('CustomerTabs', { screen: 'Discover' })}
              variant="outline"
              style={{ flex: 1 }}
            />
          </View>

          {/* Get Directions — only shown when salon has coordinates */}
          {salon?.latitude && salon?.longitude && (
            <Button
              title="Get Directions to Salon"
              onPress={() =>
                openNativeDirections(
                  { latitude: salon.latitude, longitude: salon.longitude },
                  salon.name
                )
              }
              variant="outline"
              icon={<Ionicons name="navigate" size={18} color={colors.primary} />}
              style={{ width: '100%', marginTop: 4 }}
            />
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Book Appointment</Text>
          <Text style={styles.headerSubtitle}>{salon?.name}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Service Info */}
        {service && (
          <View style={styles.serviceCard}>
            <Text style={styles.serviceName}>{service.name}</Text>
            <View style={styles.serviceDetails}>
              <View style={styles.detailItem}>
                <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.detailText}>{service.duration} mins</Text>
              </View>
              <Text style={styles.servicePrice}>{formatPrice(service.price)}</Text>
            </View>
          </View>
        )}

        {/* Date Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Select Date</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.datesContainer}
          >
            {dates.map((date) => (
              <TouchableOpacity
                key={date.value}
                style={[
                  styles.dateCard,
                  selectedDate === date.value && styles.dateCardSelected,
                ]}
                onPress={() => {
                  setSelectedDate(date.value);
                  setSelectedSlot(null);
                  setSlotConflictError(null);
                  unsubscribeFromSlots(); // Unsubscribe from previous date
                }}
              >
                <Text
                  style={[
                    styles.dateDay,
                    selectedDate === date.value && styles.dateTextSelected,
                  ]}
                >
                  {date.day}
                </Text>
                <Text
                  style={[
                    styles.dateNum,
                    selectedDate === date.value && styles.dateTextSelected,
                  ]}
                >
                  {date.date}
                </Text>
                <Text
                  style={[
                    styles.dateMonth,
                    selectedDate === date.value && styles.dateTextSelected,
                  ]}
                >
                  {date.month}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Time Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Select Time</Text>
          </View>

          {/* Refresh needed indicator */}
          {needsRefresh && (
            <TouchableOpacity style={styles.refreshBanner} onPress={handleRefreshNeeded}>
              <Ionicons name="refresh" size={16} color={colors.primary} />
              <Text style={styles.refreshText}>Bookings updated. Tap to refresh.</Text>
            </TouchableOpacity>
          )}

          {/* Multiple bookings info */}
          {effectiveAllowMultiple && (
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle" size={16} color={colors.primary} />
              <Text style={styles.infoText}>
                Up to {slotsData?.max_bookings_per_slot || 1} bookings per slot
              </Text>
            </View>
          )}

          {slotsLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
          ) : displaySlots && displaySlots.length > 0 ? (
            <View style={styles.slotsGrid}>
              {displaySlots.map((slot) => {
                const isJustBooked = justBookedSlots.has(slot.time);
                const isMulti = slot.allow_multiple;
                const count = slot.booking_count || 0;
                const max = slot.max_bookings || 1;
                const isFillingUp = isMulti && count > 0 && count < max;
                const isFull = !slot.available;

                return (
                  <TouchableOpacity
                    key={slot.time}
                    style={[
                      styles.slotButton,
                      isFull && styles.slotDisabled,
                      isFillingUp && styles.slotFillingUp,
                      selectedSlot === slot.time && styles.slotSelected,
                      isJustBooked && !isMulti && styles.slotJustBooked,
                    ]}
                    onPress={() => slot.available && setSelectedSlot(slot.time)}
                    disabled={!slot.available}
                  >
                    <Text
                      style={[
                        styles.slotText,
                        isFull && styles.slotTextDisabled,
                        selectedSlot === slot.time && styles.slotTextSelected,
                        isJustBooked && !isMulti && styles.slotTextJustBooked,
                      ]}
                    >
                      {formatTime(slot.time)}
                    </Text>
                    {/* Multi-booking: show count/max */}
                    {isMulti && (
                      <Text
                        style={[
                          styles.slotCapacityText,
                          isFull && styles.slotCapacityFull,
                          selectedSlot === slot.time && styles.slotCapacitySelected,
                          isFillingUp && styles.slotCapacityFilling,
                        ]}
                      >
                        {isFull ? 'Full' : `${count}/${max}`}
                      </Text>
                    )}
                    {/* Single booking: show "Booked" label */}
                    {!isMulti && isFull && (
                      <Text style={styles.slotBookedLabel}>Booked</Text>
                    )}
                    {/* Just taken indicator (single mode only) */}
                    {isJustBooked && !isMulti && (
                      <View style={styles.justBookedIndicator}>
                        <Text style={styles.justBookedText}>Just taken!</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.noSlots}>
              <Ionicons name="alert-circle-outline" size={32} color={colors.textSecondary} />
              <Text style={styles.noSlotsText}>No available slots for this date</Text>
            </View>
          )}
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="card" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Payment Method</Text>
          </View>
          
          <TouchableOpacity 
            style={[
              styles.paymentOption, 
              selectedPaymentMethod === 'cash' && styles.paymentOptionSelected
            ]}
            onPress={() => setSelectedPaymentMethod('cash')}
          >
            <View style={styles.paymentIconContainer}>
              <Ionicons name="cash-outline" size={24} color={selectedPaymentMethod === 'cash' ? '#FFF' : colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.paymentTitle, selectedPaymentMethod === 'cash' && styles.paymentTextSelected]}>Cash at Salon</Text>
              <Text style={[styles.paymentSub, selectedPaymentMethod === 'cash' && styles.paymentTextSelected]}>Pay after your service is completed</Text>
            </View>
            {selectedPaymentMethod === 'cash' && <Ionicons name="checkmark-circle" size={24} color="#FFF" />}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.paymentOption, 
              selectedPaymentMethod === 'card' && styles.paymentOptionSelected,
              { marginTop: 12 }
            ]}
            onPress={() => setSelectedPaymentMethod('card')}
          >
            <View style={styles.paymentIconContainer}>
              <Ionicons name="card-outline" size={24} color={selectedPaymentMethod === 'card' ? '#FFF' : colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.paymentTitle, selectedPaymentMethod === 'card' && styles.paymentTextSelected]}>Online Payment</Text>
              <Text style={[styles.paymentSub, selectedPaymentMethod === 'card' && styles.paymentTextSelected]}>Secure payment via card or UPI</Text>
            </View>
            {selectedPaymentMethod === 'card' && <Ionicons name="checkmark-circle" size={24} color="#FFF" />}
          </TouchableOpacity>
        </View>
        {selectedSlot && (
          <View style={styles.bookingSummary}>
            <Text style={styles.summaryTitle}>Booking Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Date</Text>
              <Text style={styles.summaryValue}>
                {format(new Date(selectedDate), 'EEEE, d MMMM yyyy')}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Time</Text>
              <Text style={styles.summaryValue}>{formatTime(selectedSlot)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Duration</Text>
              <Text style={styles.summaryValue}>{service?.duration} mins</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatPrice(service?.price || 0)}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Confirm Button */}
      {selectedSlot && (
        <View style={styles.footer}>
          <Button
            title="Confirm Booking"
            onPress={handleConfirmBooking}
            loading={bookingMutation.isPending}
            icon={<Ionicons name="card-outline" size={20} color="#FFFFFF" />}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  serviceCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  serviceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  servicePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  datesContainer: {
    gap: 10,
  },
  dateCard: {
    width: 64,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateCardSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dateDay: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  dateNum: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  dateMonth: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  dateTextSelected: {
    color: '#FFFFFF',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slotButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 80,
    alignItems: 'center',
  },
  slotDisabled: {
    backgroundColor: colors.surfaceSecondary,
  },
  slotSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  slotText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  slotTextDisabled: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  slotTextSelected: {
    color: '#FFFFFF',
  },
  noSlots: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    gap: 8,
  },
  noSlotsText: {
    color: colors.textSecondary,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 16,
  },
  paymentOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  paymentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  paymentSub: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  paymentTextSelected: {
    color: '#FFFFFF',
  },
  refreshBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primaryLight,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  refreshText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.secondaryLight,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 13,
    color: colors.secondary,
    fontWeight: '500',
  },
  slotFillingUp: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
  },
  slotCapacityText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  slotCapacityFull: {
    color: '#EF4444',
    fontWeight: '600',
  },
  slotCapacitySelected: {
    color: 'rgba(255,255,255,0.7)',
  },
  slotCapacityFilling: {
    color: '#D97706',
  },
  slotBookedLabel: {
    fontSize: 10,
    color: '#EF4444',
    marginTop: 2,
    fontWeight: '600',
  },
  slotJustBooked: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  slotTextJustBooked: {
    color: colors.error,
  },
  justBookedIndicator: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    transform: [{ translateX: -30 }],
    backgroundColor: colors.error,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  justBookedText: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  bookingSummary: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    marginTop: 4,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  footer: {
    padding: 20,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  successContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  successContent: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  successText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 32,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 16,
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  successButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
});

export default BookingScreen;
