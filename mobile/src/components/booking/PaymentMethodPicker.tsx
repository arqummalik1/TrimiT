/**
 * Payment method selector for the booking flow.
 *
 * Two options only (v1): "Cash at Salon" (always shown) and "Pay with UPI"
 * (shown only when the salon has a UPI ID). TrimiT never collects money — UPI
 * means the customer pays the salon directly from their UPI app.
 *
 * Pure presentational. The `'upi'` option is gated solely by `salonHasUpi`,
 * never by a build flag.
 */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import type { BookingStyles } from './styles';

export type PaymentMethodOption = 'cash' | 'upi';

interface PaymentMethodPickerProps {
  selected: PaymentMethodOption;
  onSelect: (method: PaymentMethodOption) => void;
  /** Whether the salon has a UPI ID configured. When false, only cash is shown. */
  salonHasUpi: boolean;
  styles: BookingStyles;
}

const PaymentMethodPicker: React.FC<PaymentMethodPickerProps> = ({
  selected,
  onSelect,
  salonHasUpi,
  styles,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="card" size={20} color={theme.colors.primary} />
        <Text style={styles.sectionTitle}>Payment Method</Text>
      </View>

      {/* Cash at Salon — always available */}
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
            color={selected === 'cash' ? theme.colors.textInverse : theme.colors.text}
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
          <Ionicons name="checkmark-circle" size={24} color={theme.colors.textInverse} />
        )}
      </TouchableOpacity>

      {/* Pay with UPI — only when the salon has a UPI ID */}
      {salonHasUpi && (
        <TouchableOpacity
          style={[
            styles.paymentOption,
            selected === 'upi' && styles.paymentOptionSelected,
            { marginTop: 12 },
          ]}
          onPress={() => onSelect('upi')}
        >
          <View style={styles.paymentIconContainer}>
            <Ionicons
              name="phone-portrait-outline"
              size={24}
              color={selected === 'upi' ? theme.colors.textInverse : theme.colors.text}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.paymentTitle,
                selected === 'upi' && styles.paymentTextSelected,
              ]}
            >
              Pay with UPI
            </Text>
            <Text
              style={[
                styles.paymentSub,
                selected === 'upi' && styles.paymentTextSelected,
              ]}
            >
              Pay directly to the salon via any UPI app
            </Text>
          </View>
          {selected === 'upi' && (
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.textInverse} />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

export default PaymentMethodPicker;
