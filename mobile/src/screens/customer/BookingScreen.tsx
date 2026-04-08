import React, { useState } from 'react';
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
import { Salon, TimeSlot } from '../../types';
import { colors, formatPrice, formatTime } from '../../lib/utils';
import { Button } from '../../components/Button';

interface BookingScreenProps {
  navigation: any;
  route: any;
}

export const BookingScreen: React.FC<BookingScreenProps> = ({ navigation, route }) => {
  const { salonId, serviceId } = route.params;
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bookingComplete, setBookingComplete] = useState(false);

  // Get salon details
  const { data: salon } = useQuery<Salon>({
    queryKey: ['salon', salonId],
    queryFn: async () => {
      const response = await api.get(`/api/salons/${salonId}`);
      return response.data;
    },
  });

  const service = salon?.services?.find((s) => s.id === serviceId);

  // Get available slots
  const { data: slots, isLoading: slotsLoading } = useQuery<TimeSlot[]>({
    queryKey: ['slots', salonId, serviceId, selectedDate],
    queryFn: async () => {
      const response = await api.get(`/api/salons/${salonId}/slots`, {
        params: { date: selectedDate, service_id: serviceId },
      });
      return response.data;
    },
    enabled: !!selectedDate,
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
    onSuccess: () => {
      setBookingComplete(true);
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create booking');
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
    bookingMutation.mutate();
  };

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

          {slotsLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
          ) : slots && slots.length > 0 ? (
            <View style={styles.slotsGrid}>
              {slots.map((slot) => (
                <TouchableOpacity
                  key={slot.time}
                  style={[
                    styles.slotButton,
                    !slot.available && styles.slotDisabled,
                    selectedSlot === slot.time && styles.slotSelected,
                  ]}
                  onPress={() => slot.available && setSelectedSlot(slot.time)}
                  disabled={!slot.available}
                >
                  <Text
                    style={[
                      styles.slotText,
                      !slot.available && styles.slotTextDisabled,
                      selectedSlot === slot.time && styles.slotTextSelected,
                    ]}
                  >
                    {formatTime(slot.time)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.noSlots}>
              <Ionicons name="alert-circle-outline" size={32} color={colors.textSecondary} />
              <Text style={styles.noSlotsText}>No available slots for this date</Text>
            </View>
          )}
        </View>

        {/* Booking Summary */}
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
