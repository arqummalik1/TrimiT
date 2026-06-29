/**
 * Payment method selector for the booking flow.
 *
 * UPI is shown FIRST and is the default when the salon has a UPI ID.
 * Cash at Salon is always the fallback option.
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

      {/* Pay with UPI — shown FIRST when salon has UPI, and is the default */}
      {salonHasUpi && (
        <TouchableOpacity
          style={[
            styles.paymentOption,
            selected === 'upi' && styles.paymentOptionSelected,
          ]}
          onPress={() => onSelect('upi')}
        >
          <View style={styles.paymentIconContainer}>
            <Ionicons
              name="phone-portrait-outline"
              size={24}
              color={selected === 'upi' ? theme.colors.textInverse : theme.colors.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text
                style={[
                  styles.paymentTitle,
                  selected === 'upi' && styles.paymentTextSelected,
                ]}
              >
                Pay with UPI
              </Text>
              {selected === 'upi' && (
                <View style={{
                  backgroundColor: theme.colors.textInverse + '30',
                  borderRadius: 4,
                  paddingHorizontal: 5,
                  paddingVertical: 1,
                }}>
                  <Text style={{ fontSize: 10, color: theme.colors.textInverse, fontWeight: '700' }}>
                    RECOMMENDED
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.paymentSub,
                selected === 'upi' && styles.paymentTextSelected,
                { opacity: selected === 'upi' ? 0.85 : 1 },
              ]}
            >
              GPay · PhonePe · Paytm · any UPI app
            </Text>
          </View>
          {selected === 'upi' && (
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.textInverse} />
          )}
        </TouchableOpacity>
      )}

      {/* Cash at Salon */}
      <TouchableOpacity
        style={[
          styles.paymentOption,
          selected === 'cash' && styles.paymentOptionSelected,
          salonHasUpi && { marginTop: 12 },
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
              { opacity: selected === 'cash' ? 0.85 : 1 },
            ]}
          >
            Pay at the counter after your service
          </Text>
        </View>
        {selected === 'cash' && (
          <Ionicons name="checkmark-circle" size={24} color={theme.colors.textInverse} />
        )}
      </TouchableOpacity>
    </View>
  );
};

export default PaymentMethodPicker;
