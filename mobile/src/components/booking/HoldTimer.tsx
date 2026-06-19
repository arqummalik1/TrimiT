/**
 * "Slot held for m:ss" countdown banner shown above the slot grid while a
 * reservation hold is active. Pure presentational.
 *
 * Extracted verbatim from the original BookingScreen render block — uses the
 * active theme color for the tinted background, border, and label.
 */
import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { fonts } from '../../lib/utils';
import type { BookingStyles } from './styles';

interface HoldTimerProps {
  timeLeft: number;
  styles: BookingStyles;
}

const HoldTimer: React.FC<HoldTimerProps> = ({ timeLeft, styles }) => {
  const { theme } = useTheme();
  // Parent gates this on timeLeft > 0 && selectedSlot, so render unconditionally here.
  return (
    <View
      style={[
        styles.infoBanner,
        {
          backgroundColor: theme.colors.primary + '10',
          borderColor: theme.colors.primary,
        },
      ]}
    >
      <Ionicons name="timer-outline" size={18} color={theme.colors.primary} />
      <Text
        style={[
          styles.infoText,
          { color: theme.colors.primary, fontFamily: fonts.bodyBold },
        ]}
      >
        Slot held for {Math.floor(timeLeft / 60)}:
        {(timeLeft % 60).toString().padStart(2, '0')}
      </Text>
    </View>
  );
};

export default HoldTimer;
