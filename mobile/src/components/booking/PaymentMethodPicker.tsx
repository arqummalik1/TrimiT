/**
 * Cash vs. online payment method selector for the booking flow.
 * Honors ENABLE_ONLINE_PAY (feature flag) — when off, shows a "coming soon"
 * note instead of the online option. Pure presentational.
 *
 * Extracted verbatim from the original BookingScreen "Payment Method" section.
 */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { ENABLE_ONLINE_PAY } from '../../lib/featureFlags';
import type { BookingStyles } from './styles';

export type PaymentMethod = 'cash' | 'card';

interface PaymentMethodPickerProps {
  selected: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
  styles: BookingStyles;
}

const PaymentMethodPicker: React.FC<PaymentMethodPickerProps> = ({
  selected,
  onSelect,
  styles,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="card" size={20} color={theme.colors.primary} />
        <Text style={styles.sectionTitle}>Payment Method</Text>
      </View>

      <TouchableOpacity
        style={[
          styles.paymentOption,
          selected === 'cash' && styles.paymentOptionSelected,
        ]}
        onPress={() => onSelect('cash')}
      >
        <View style={styles.paymentIconContainer}>
          <Ionicons
            name="cash-outline"
            size={24}
            color={
              selected === 'cash'
                ? theme.colors.textInverse
                : theme.colors.text
            }
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.paymentTitle,
              selected === 'cash' && styles.paymentTextSelected,
            ]}
          >
            Cash at Salon
          </Text>
          <Text
            style={[
              styles.paymentSub,
              selected === 'cash' && styles.paymentTextSelected,
            ]}
          >
            Pay after your service is completed
          </Text>
        </View>
        {selected === 'cash' && (
          <Ionicons
            name="checkmark-circle"
            size={24}
            color={theme.colors.textInverse}
          />
        )}
      </TouchableOpacity>

      {ENABLE_ONLINE_PAY ? (
        <TouchableOpacity
          style={[
            styles.paymentOption,
            selected === 'card' && styles.paymentOptionSelected,
            { marginTop: 12 },
          ]}
          onPress={() => onSelect('card')}
        >
          <View style={styles.paymentIconContainer}>
            <Ionicons
              name="card-outline"
              size={24}
              color={
                selected === 'card'
                  ? theme.colors.textInverse
                  : theme.colors.text
              }
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.paymentTitle,
                selected === 'card' && styles.paymentTextSelected,
              ]}
            >
              Online Payment
            </Text>
            <Text
              style={[
                styles.paymentSub,
                selected === 'card' && styles.paymentTextSelected,
              ]}
            >
              Secure payment via card or UPI
            </Text>
          </View>
          {selected === 'card' && (
            <Ionicons
              name="checkmark-circle"
              size={24}
              color={theme.colors.textInverse}
            />
          )}
        </TouchableOpacity>
      ) : (
        <Text style={[styles.paymentSub, { marginTop: 12 }]}>
          Pay at the salon after your service. Online payment coming soon.
        </Text>
      )}
    </View>
  );
};

export default PaymentMethodPicker;
