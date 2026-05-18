import React, { useMemo } from 'react';
import { View, StyleSheet, Platform, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

type LedIconName = 'navigate' | 'location' | 'location-outline' | 'navigate-outline';

interface LocationLedIconProps {
  name: LedIconName;
  size?: number;
  style?: ViewStyle;
}

/**
 * Direction / location icon in Android notification-LED green with a soft glow.
 */
export function LocationLedIcon({ name, size = 14, style }: LocationLedIconProps) {
  const { theme } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          alignItems: 'center',
          justifyContent: 'center',
          ...Platform.select({
            ios: {
              shadowColor: theme.colors.locationLed,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.95,
              shadowRadius: size * 0.45,
            },
            android: { elevation: 6 },
            default: {},
          }),
        },
      }),
    [theme.colors.locationLed, size]
  );

  return (
    <View style={[styles.wrap, style]}>
      <Ionicons name={name} size={size} color={theme.colors.locationLed} />
    </View>
  );
}

export default LocationLedIcon;
