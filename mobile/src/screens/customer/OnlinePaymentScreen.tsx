import React, { useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { Button } from '../../components/Button';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';
import { CustomerDiscoverScreenProps } from '../../navigation/types';
import { formatPrice } from '../../lib/utils';
import { createIdempotencyKey } from '../../lib/idempotency';
import { getUserFacingMessage } from '../../lib/userFacingError';
import { isAppError } from '../../types/error';
import { useCreatePayment } from '../../hooks/usePayment';
import { ONLINE_PAYMENT_DISABLED_CODE } from '../../types/payment';
import { navigateToCustomerBookings } from '../../lib/navigationHelpers';

type Props = CustomerDiscoverScreenProps<'OnlinePayment'>;

/**
 * OnlinePaymentScreen — the customer-facing entry point for paying a booking
 * online with PayU. Shows the ₹ total before initiating (Req 17.4), then on tap
 * creates the order and hands off to the PayU hosted checkout.
 *
 * Flag-off fallback (Req 4.4, 4.5): the backend returns 403
 * `ONLINE_PAYMENT_DISABLED` while `PAYU_PAYOUTS_ENABLED` is OFF. We treat that as
 * "online payments unavailable" — no raw error, just a calm message pointing the
 * customer back to the unchanged pay-at-salon flow. The salon also may simply
 * not be payout-ready yet (`SALON_NOT_PAYOUT_READY`), handled the same way.
 *
 * Requirements: 4.4, 4.5, 17.4, 17.5
 */
const OnlinePaymentScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { bookingId, amount, salonName, serviceName } = route.params;

  // One stable idempotency key per screen mount → re-taps after a transient
  // failure dedupe to the same order instead of creating duplicates (Req 6.6).
  const idempotencyKeyRef = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    void createIdempotencyKey().then((key) => {
      if (active) idempotencyKeyRef.current = key;
    });
    return () => {
      active = false;
    };
  }, []);

  // `unavailable` = flag OFF or salon not payout-ready → graceful fallback.
  const [unavailable, setUnavailable] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createPayment = useCreatePayment();

  const handlePay = () => {
    setErrorMessage(null);
    createPayment.mutate(
      { bookingId, idempotencyKey: idempotencyKeyRef.current ?? undefined },
      {
        onSuccess: (order) => {
          navigation.navigate('PayuCheckout', {
            payu: order.payu,
            bookingId: order.booking_id,
            paymentId: order.payment_id,
            amountPaise: order.amount_paise,
          });
        },
        onError: (error: unknown) => {
          const code = isAppError(error) ? error.code : undefined;
          // Flag OFF or salon not onboarded → hide the action gracefully and
          // keep pay-at-salon. Never surface a raw error for these.
          if (
            code === ONLINE_PAYMENT_DISABLED_CODE ||
            code === 'SALON_NOT_PAYOUT_READY'
          ) {
            setUnavailable(true);
            return;
          }
          setErrorMessage(getUserFacingMessage(error));
        },
      }
    );
  };

  return (
    <ScreenWrapper variant="stack">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Pay online</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {salonName}
          </Text>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Row label="Service" value={serviceName} styles={styles} />
        <Row label="Salon" value={salonName} styles={styles} />
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total payable</Text>
          <Text style={styles.totalValue}>{formatPrice(amount)}</Text>
        </View>
      </View>

      {unavailable ? (
        // ── Graceful flag-off / not-ready fallback (Req 4.4, 4.5) ───────────
        <View style={styles.noticeBox}>
          <Ionicons name="information-circle" size={22} color={theme.colors.info} />
          <Text style={styles.noticeText}>
            Online payment isn’t available for this booking right now. You can
            pay directly at the salon — your booking is unaffected.
          </Text>
        </View>
      ) : (
        <View style={styles.actions}>
          {errorMessage && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}
          <Text style={styles.secureNote}>
            <Ionicons name="lock-closed" size={12} color={theme.colors.textSecondary} />{' '}
            Payments are processed securely by PayU. You’ll be redirected to
            complete your payment.
          </Text>
          <Button
            title={`Pay ${formatPrice(amount)}`}
            onPress={handlePay}
            loading={createPayment.isPending}
            disabled={createPayment.isPending}
          />
        </View>
      )}

      {unavailable && (
        <View style={styles.actions}>
          <Button
            title="View Bookings"
            variant="outline"
            onPress={() => navigateToCustomerBookings(navigation)}
          />
        </View>
      )}
    </ScreenWrapper>
  );
};

const Row: React.FC<{
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}> = ({ label, value, styles }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
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
    headerText: { marginLeft: 12, flex: 1 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
    headerSubtitle: { fontSize: 14, color: theme.colors.textSecondary },
    summaryCard: {
      margin: 20,
      padding: 16,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 10,
    },
    row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    rowLabel: { fontSize: 14, color: theme.colors.textSecondary },
    rowValue: { fontSize: 14, color: theme.colors.text, fontWeight: '500', flexShrink: 1, textAlign: 'right' },
    divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 2 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLabel: { fontSize: 15, color: theme.colors.text, fontWeight: '600' },
    totalValue: { fontSize: 22, fontWeight: '800', color: theme.colors.primary },
    actions: { paddingHorizontal: 20, gap: 12, marginBottom: 12 },
    secureNote: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 18 },
    errorBox: {
      flexDirection: 'row',
      gap: 8,
      padding: 12,
      borderRadius: 8,
      backgroundColor: theme.colors.errorLight,
      alignItems: 'center',
    },
    errorText: { color: theme.colors.error, flex: 1, lineHeight: 20 },
    noticeBox: {
      flexDirection: 'row',
      gap: 10,
      margin: 20,
      padding: 14,
      borderRadius: 10,
      backgroundColor: theme.colors.infoLight,
      alignItems: 'flex-start',
    },
    noticeText: { color: theme.colors.info, flex: 1, lineHeight: 20 },
  });

export default OnlinePaymentScreen;
