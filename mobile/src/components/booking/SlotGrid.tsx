/**
 * Available-time slot grid for the booking flow. Renders loading, empty, and
 * the full slot grid (with capacity / filling-up / full / just-taken states).
 * Pure presentational — all state and handlers are passed in by the screen.
 *
 * Extracted verbatim from the original BookingScreen "Select Time" grid block.
 */
import React from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatTime } from '../../lib/utils';
import { useTheme } from '../../theme/ThemeContext';
import { ENABLE_MULTI_BOOKING_PER_SLOT } from '../../lib/featureFlags';
import type { TimeSlot } from '../../types';
import type { BookingStyles } from './styles';

interface SlotGridProps {
  slots: TimeSlot[];
  loading: boolean;
  selectedSlot: string | null;
  selectedDate: string;
  justBookedSlots: Set<string>;
  onSelectSlot: (slot: TimeSlot) => void;
  styles: BookingStyles;
}

const SlotGrid: React.FC<SlotGridProps> = ({
  slots,
  loading,
  selectedSlot,
  selectedDate,
  justBookedSlots,
  onSelectSlot,
  styles,
}) => {
  const { theme } = useTheme();

  if (loading) {
    return (
      <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 20 }} />
    );
  }

  if (!slots || slots.length === 0) {
    return (
      <View style={styles.noSlots}>
        <Ionicons
          name="alert-circle-outline"
          size={32}
          color={theme.colors.textSecondary}
        />
        <Text style={styles.noSlotsText}>No available slots for this date</Text>
      </View>
    );
  }

  return (
    <View style={styles.slotsGrid}>
      {slots.map((slot) => {
        const scopedKey = `${selectedDate}::${slot.time}`;
        const isJustBooked = justBookedSlots.has(scopedKey);
        const isMulti =
          ENABLE_MULTI_BOOKING_PER_SLOT && slot.allow_multiple;
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
            onPress={() => {
              if (selectedSlot !== slot.time) {
                onSelectSlot(slot);
              }
            }}
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
  );
};

export default SlotGrid;
