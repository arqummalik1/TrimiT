import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, startOfToday, isSameDay, parseISO } from 'date-fns';
import api, { axios } from '../../lib/api';
import { Salon, SlotsResponse } from '../../types';
import { fonts, borderRadius, formatPrice, formatTime } from '../../lib/utils';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';
import { Button } from '../../components/Button';
import { handleApiError } from '../../lib/errorHandler';
import { showToast } from '../../store/toastStore';
import { analytics } from '../../lib/analytics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CustomerDiscoverStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<CustomerDiscoverStackParamList, 'RescheduleBooking'>;

export const RescheduleBookingScreen: React.FC<Props> = ({ navigation, route }) => {
  const { bookingId, currentDate, currentSlot, salonId, serviceId, salonName, serviceName } = route.params;
  
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [showReasonInput, setShowReasonInput] = useState(false);

  // Get salon details
  const { data: salon } = useQuery<Salon>({
    queryKey: ['salon', salonId],
    queryFn: async () => {
      const response = await api.get(`/api/salons/${salonId}`);
      return response.data;
    },
  });

  // Get available slots
  const { data: slotsData, isLoading: slotsLoading } = useQuery<SlotsResponse>({
    queryKey: ['slots', salonId, serviceId, selectedDate],
    queryFn: async () => {
      const currentTime = format(new Date(), 'HH:mm');
      const response = await api.get(`/api/salons/${salonId}/slots`, {
        params: { 
          date: selectedDate, 
          service_id: serviceId,
          current_time: currentTime
        },
      });
      return response.data;
    },
    enabled: !!selectedDate,
  });

  // Reschedule mutation
  const rescheduleMutation = useMutation({
    mutationFn: async () => {
      const response = await api.patch(`/api/bookings/${bookingId}/reschedule`, {
        new_date: selectedDate,
        new_time_slot: selectedSlot,
        reason: reason.trim() || undefined,
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['slots'] });
      
      analytics.track('booking_rescheduled', {
        booking_id: bookingId,
        old_date: currentDate,
        old_slot: currentSlot,
        new_date: selectedDate,
        new_slot: selectedSlot,
        initiated_by: 'customer',
        reason: reason || null,
        reschedule_count: data.reschedule_count,
      });

      Alert.alert(
        'Booking Rescheduled! ✅',
        `Your appointment has been moved to ${format(parseISO(selectedDate), 'EEEE, MMM d')} at ${formatTime(selectedSlot!)}`,
        [
          {
            text: 'View Bookings',
            onPress: () => navigation.navigate('CustomerTabs', { screen: 'Bookings' }),
          },
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    },
    onError: (error) => {
      const appErr = handleApiError(error);
      
      analytics.track('reschedule_failed', {
        booking_id: bookingId,
        error: appErr.message,
      });

      Alert.alert('Reschedule Failed', appErr.message);
    },
  });

  const handleConfirmReschedule = useCallback(() => {
    if (!selectedSlot) {
      Alert.alert('Error', 'Please select a new time slot');
      return;
    }

    // Check if same slot
    if (selectedDate === currentDate && selectedSlot === currentSlot) {
      Alert.alert('Error', 'Please select a different time slot');
      return;
    }

    Alert.alert(
      'Confirm Reschedule',
      `Move your appointment to ${format(parseISO(selectedDate), 'EEEE, MMM d')} at ${formatTime(selectedSlot)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'default',
          onPress: () => rescheduleMutation.mutate(),
        },
      ]
    );
  }, [selectedDate, selectedSlot, currentDate, currentSlot, rescheduleMutation]);

  // Generate next 14 days
  const dates = useMemo(() => {
    const today = startOfToday();
    return [...Array(14)].map((_, i) => {
      const date = addDays(today, i);
      return {
        value: format(date, 'yyyy-MM-dd'),
        day: format(date, 'EEE'),
        date: format(date, 'd'),
        month: format(date, 'MMM'),
      };
    });
  }, []);

  const isCurrentSlot = useCallback((date: string, slot: string) => {
    return date === currentDate && slot === currentSlot;
  }, [currentDate, currentSlot]);

  return (
    <ScreenWrapper variant="stack">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Reschedule Booking</Text>
          <Text style={styles.headerSubtitle}>{salonName}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Booking Info */}
        <View style={styles.currentBookingCard}>
          <View style={styles.currentBookingHeader}>
            <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
            <Text style={styles.currentBookingTitle}>Current Appointment</Text>
          </View>
          <View style={styles.currentBookingDetails}>
            <Text style={styles.serviceName}>{serviceName}</Text>
            <Text style={styles.currentDateTime}>
              {format(parseISO(currentDate), 'EEEE, MMMM d, yyyy')} • {formatTime(currentSlot)}
            </Text>
          </View>
        </View>

        {/* Date Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar" size={20} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Select New Date</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.datesContainer}
          >
            {dates.map((date) => {
              const isSelected = selectedDate === date.value;
              const isCurrent = date.value === currentDate;
              
              return (
                <TouchableOpacity
                  key={date.value}
                  style={[
                    styles.dateCard,
                    isSelected && styles.dateCardSelected,
                    isCurrent && styles.dateCardCurrent,
                  ]}
                  onPress={() => {
                    setSelectedDate(date.value);
                    setSelectedSlot(null);
                  }}
                >
                  {isCurrent && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>Current</Text>
                    </View>
                  )}
                  <Text
                    style={[
                      styles.dateDay,
                      isSelected && styles.dateTextSelected,
                    ]}
                  >
                    {date.day}
                  </Text>
                  <Text
                    style={[
                      styles.dateNum,
                      isSelected && styles.dateTextSelected,
                    ]}
                  >
                    {date.date}
                  </Text>
                  <Text
                    style={[
                      styles.dateMonth,
                      isSelected && styles.dateTextSelected,
                    ]}
                  >
                    {date.month}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Time Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time" size={20} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Select New Time</Text>
          </View>

          {slotsLoading ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 20 }} />
          ) : slotsData?.slots && slotsData.slots.length > 0 ? (
            <View style={styles.slotsGrid}>
              {slotsData.slots.map((slot) => {
                const isSelected = selectedSlot === slot.time;
                const isCurrent = isCurrentSlot(selectedDate, slot.time);
                const isAvailable = slot.available && !isCurrent;

                return (
                  <TouchableOpacity
                    key={slot.time}
                    style={[
                      styles.slotButton,
                      !isAvailable && styles.slotDisabled,
                      isSelected && styles.slotSelected,
                      isCurrent && styles.slotCurrent,
                    ]}
                    onPress={() => {
                      if (isAvailable) {
                        setSelectedSlot(slot.time);
                      }
                    }}
                    disabled={!isAvailable}
                  >
                    <Text
                      style={[
                        styles.slotText,
                        !isAvailable && styles.slotTextDisabled,
                        isSelected && styles.slotTextSelected,
                        isCurrent && styles.slotTextCurrent,
                      ]}
                    >
                      {formatTime(slot.time)}
                    </Text>
                    {isCurrent && (
                      <Text style={styles.slotCurrentLabel}>Current</Text>
                    )}
                    {!slot.available && !isCurrent && (
                      <Text style={styles.slotBookedLabel}>Booked</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.noSlots}>
              <Ionicons name="alert-circle-outline" size={32} color={theme.colors.textSecondary} />
              <Text style={styles.noSlotsText}>No available slots for this date</Text>
            </View>
          )}
        </View>

        {/* Optional Reason */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.reasonToggle}
            onPress={() => setShowReasonInput(!showReasonInput)}
          >
            <Ionicons 
              name={showReasonInput ? "chevron-down" : "chevron-forward"} 
              size={20} 
              color={theme.colors.textSecondary} 
            />
            <Text style={styles.reasonToggleText}>Add reason (optional)</Text>
          </TouchableOpacity>

          {showReasonInput && (
            <View style={styles.reasonInputContainer}>
              <TextInput
                style={styles.reasonInput}
                placeholder="e.g., Running late, schedule conflict..."
                placeholderTextColor={theme.colors.textSecondary}
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={3}
                maxLength={200}
              />
              <Text style={styles.reasonCounter}>{reason.length}/200</Text>
            </View>
          )}
        </View>

        {/* Summary */}
        {selectedSlot && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>New Appointment</Text>
            <View style={styles.summaryRow}>
              <Ionicons name="calendar" size={18} color={theme.colors.primary} />
              <Text style={styles.summaryText}>
                {format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Ionicons name="time" size={18} color={theme.colors.primary} />
              <Text style={styles.summaryText}>{formatTime(selectedSlot)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Ionicons name="cut" size={18} color={theme.colors.primary} />
              <Text style={styles.summaryText}>{serviceName}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Confirm Button */}
      {selectedSlot && (
        <View style={styles.footer}>
          <Button
            title="Confirm Reschedule"
            onPress={handleConfirmReschedule}
            loading={rescheduleMutation.isPending}
            icon={<Ionicons name="checkmark-circle" size={20} color={theme.colors.textInverse} />}
          />
        </View>
      )}
    </ScreenWrapper>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 44,
    height: 44,
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  headerText: {
    marginLeft: 16,
    flex: 1,
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  currentBookingCard: {
    backgroundColor: theme.colors.surface,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 32,
  },
  currentBookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  currentBookingTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  currentBookingDetails: {
    gap: 8,
  },
  serviceName: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: theme.colors.text,
  },
  currentDateTime: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: theme.colors.text,
    letterSpacing: 0.5,
  },
  datesContainer: {
    gap: 12,
    paddingRight: 24,
  },
  dateCard: {
    width: 70,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    position: 'relative',
  },
  dateCardSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  dateCardCurrent: {
    borderColor: theme.colors.secondary,
    borderWidth: 2,
  },
  currentBadge: {
    position: 'absolute',
    top: -8,
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  currentBadgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    color: theme.colors.textInverse,
  },
  dateDay: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dateNum: {
    fontFamily: fonts.bodyBold,
    fontSize: 22,
    color: theme.colors.text,
  },
  dateMonth: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  dateTextSelected: {
    color: theme.colors.textInverse,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  slotButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: 100,
    alignItems: 'center',
  },
  slotDisabled: {
    backgroundColor: 'rgba(18, 20, 17, 0.3)',
    borderColor: 'transparent',
  },
  slotSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  slotCurrent: {
    backgroundColor: theme.colors.secondary + '20',
    borderColor: theme.colors.secondary,
    borderWidth: 2,
  },
  slotText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: theme.colors.text,
  },
  slotTextDisabled: {
    color: theme.colors.textTertiary,
    textDecorationLine: 'line-through',
  },
  slotTextSelected: {
    color: theme.colors.textInverse,
  },
  slotTextCurrent: {
    color: theme.colors.secondary,
  },
  slotCurrentLabel: {
    fontSize: 10,
    color: theme.colors.secondary,
    marginTop: 2,
    fontFamily: fonts.bodySemiBold,
  },
  slotBookedLabel: {
    fontSize: 10,
    color: theme.colors.error,
    marginTop: 2,
    fontFamily: fonts.bodySemiBold,
  },
  noSlots: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  noSlotsText: {
    fontFamily: fonts.body,
    color: theme.colors.textTertiary,
  },
  reasonToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  reasonToggleText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  reasonInputContainer: {
    marginTop: 12,
  },
  reasonInput: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 16,
    fontFamily: fonts.body,
    fontSize: 15,
    color: theme.colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  reasonCounter: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: theme.colors.textTertiary,
    textAlign: 'right',
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: theme.colors.primary + '10',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    gap: 12,
  },
  summaryTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: theme.colors.text,
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: theme.colors.text,
  },
  footer: {
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});

export default RescheduleBookingScreen;
