import React, { useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { Ionicons } from '@expo/vector-icons';
import { formatPrice, formatTime } from '../../lib/utils';
import { Button } from '../../components/Button';
import { CustomerDiscoverScreenProps } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';
import { ENABLE_ONLINE_PAY } from '../../lib/featureFlags';
import { navigateToCustomerBookings } from '../../lib/navigationHelpers';

type Props = CustomerDiscoverScreenProps<'Payment'>;

const PaymentScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { amount, salonName, serviceName, bookingDate, timeSlot } = route.params;

  useEffect(() => {
    if (!ENABLE_ONLINE_PAY) {
      Alert.alert(
        'Pay at salon',
        'Online payment is not available in this version. Your booking uses pay-at-salon.',
        [{ text: 'OK', onPress: () => navigateToCustomerBookings(navigation) }],
      );
    }
  }, [navigation]);

  return (
    <ScreenWrapper variant="stack">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Payment</Text>
          <Text style={styles.headerSubtitle}>{salonName}</Text>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Row label="Service" value={serviceName} styles={styles} />
        <Row label="Date" value={bookingDate} styles={styles} />
        <Row label="Time" value={formatTime(timeSlot)} styles={styles} />
        <Row label="Amount" value={formatPrice(amount)} bold styles={styles} />
      </View>

      <View style={{ gap: 12 }}>
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={20} color={theme.colors.warning} />
          <Text style={styles.errorText}>
            Our payment gateway is currently being updated to serve you better. 
            Please pay directly at the salon for this booking.
          </Text>
        </View>
        <Button
          title="View Bookings"
          onPress={() => navigateToCustomerBookings(navigation)}
          style={{ marginHorizontal: 20 }}
        />
      </View>
    </ScreenWrapper>
  );
};

const Row: React.FC<{ label: string; value: string; bold?: boolean; styles: ReturnType<typeof createStyles> }> = ({ label, value, bold, styles }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={[styles.rowValue, bold && styles.rowValueBold]}>{value}</Text>
  </View>
);

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { marginLeft: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  headerSubtitle: { fontSize: 14, color: theme.colors.textSecondary },
  summaryCard: {
    margin: 20,
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { fontSize: 14, color: theme.colors.textSecondary },
  rowValue: { fontSize: 14, color: theme.colors.text, fontWeight: '500' },
  rowValueBold: { fontSize: 16, fontWeight: '700', color: theme.colors.primary },
  errorBox: {
    flexDirection: 'row',
    gap: 8,
    margin: 20,
    padding: 12,
    backgroundColor: theme.colors.warning + '1A', 
    borderRadius: 8,
  },
  errorText: { color: theme.colors.warning, flex: 1, lineHeight: 20 },
});

export default PaymentScreen;
