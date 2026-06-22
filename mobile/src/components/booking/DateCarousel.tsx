/**
 * 14-day horizontal date picker for the booking flow. Pure presentational.
 *
 * Extracted verbatim from the original BookingScreen "Select Date" section.
 */
import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addDays, format, startOfToday } from 'date-fns';
import { useTheme } from '../../theme/ThemeContext';
import type { BookingStyles } from './styles';

export interface DateItem {
  value: string;
  day: string;
  date: string;
  month: string;
}

interface DateCarouselProps {
  selectedDate: string;
  onSelectDate: (value: string) => void;
  styles: BookingStyles;
}

const DateCarousel: React.FC<DateCarouselProps> = ({
  selectedDate,
  onSelectDate,
  styles,
}) => {
  const { theme } = useTheme();
  // Next 14 days. Computed here (was in the screen body) — deterministic, theme-independent.
  const dates = useMemo<DateItem[]>(() => {
    const today = startOfToday();
    return [...Array(14)].map((_, i) => {
      const d = addDays(today, i);
      return {
        value: format(d, 'yyyy-MM-dd'),
        day: format(d, 'EEE'),
        date: format(d, 'd'),
        month: format(d, 'MMM'),
      };
    });
  }, []);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="calendar" size={20} color={theme.colors.primary} />
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
            onPress={() => onSelectDate(date.value)}
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
  );
};

export default DateCarousel;
