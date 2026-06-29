/**
 * PaymentWaitingScreen.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Replaces the old PayU OnlinePaymentScreen + PayuCheckoutScreen.
 *
 * TrimiT never collects money. After the customer pays the salon's UPI ID
 * directly from their UPI app, we land here and NEVER show "Payment
 * Successful". We always show "We are waiting for the salon to verify your
 * payment." The booking is confirmed only when the salon owner verifies.
 *
 * Behaviour by `payment_verification_status`:
 *   • initiated / waiting_verification → waiting message + booking reference +
 *     salon UPI ID (manual fallback) + "I've paid / Done" + reopen UPI app.
 *   • verified  → confirmed.
 *   • rejected  → "We could not verify your payment…" with a Retry (re-initiate).
 *   • timeout   → "The salon hasn't verified yet…" with wait / contact / cancel.
 *
 * Skeletons (not spinners) are used while the first status loads.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { Button } from '../../components/Button';
import { Skeleton } from '../../components/Skeleton';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';
import { fonts, formatPrice } from '../../lib/utils';
import { handleApiError } from '../../lib/errorHandler';
import { showToast } from '../../store/toastStore';
import { logger } from '../../lib/logger';
import { navigateToCustomerBookings } from '../../lib/navigationHelpers';
import {
  usePaymentStatus,
  useMarkAwaitingVerification,
  useInitiateUpi,
} from '../../hooks/usePayment';
import { upiIntentService } from '../../services/upiIntentService';
import type { PaymentVerificationStatus } from '../../types/payment';
import { CustomerDiscoverScreenProps } from '../../navigation/types';

type Props = CustomerDiscoverScreenProps<'PaymentWaiting'>;

const PaymentWaitingScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();

  const {
    bookingId,
    bookingReference,
    salonName,
    serviceName,
    upiId: initialUpiId,
    payeeName,
    amount,
    intentUri: initialIntentUri,
  } = route.params;

  // UPI details can change if the customer re-initiates after a rejection.
  const [upiId, setUpiId] = useState(initialUpiId);
  const [intentUri, setIntentUri] = useState(initialIntentUri);
  const [reference, setReference] = useState(bookingReference);

  const markAwaiting = useMarkAwaitingVerification();
  const initiateUpi = useInitiateUpi();
  const { data: status, isLoading } = usePaymentStatus(bookingId, true);

  const verificationStatus: PaymentVerificationStatus | undefined =
    status?.payment_verification_status;

  // On mount, tell the backend the customer has returned from their UPI app.
  const markedRef = useRef(false);
  useEffect(() => {
    if (markedRef.current) return;
    markedRef.current = true;
    markAwaiting.mutate(bookingId, {
      onError: (error: unknown) => {
        logger.warn('[PaymentWaiting] markAwaitingVerification failed', {
          message: handleApiError(error).message,
        });
      },
    });
  }, [bookingId, markAwaiting]);

  const goToBookings = () => navigateToCustomerBookings(navigation);

  const handleReopenUpiApp = async () => {
    const { launched } = await upiIntentService.launchUpiApp(intentUri);
    if (!launched) {
      showToast(
        'No UPI app opened. Pay manually to the UPI ID shown below.',
        'warning'
      );
    }
  };

  const handleRetry = () => {
    initiateUpi.mutate(bookingId, {
      onSuccess: async (data) => {
        setUpiId(data.upi.payee_vpa);
        setIntentUri(data.upi.intent_uri);
        setReference(data.booking_reference);
        markedRef.current = false;
        const { launched } = await upiIntentService.launchUpiApp(data.upi.intent_uri);
        if (!launched) {
          showToast(
            'No UPI app opened. Pay manually to the UPI ID shown below.',
            'warning'
          );
        }
        // Re-arm the awaiting-verification marker for the new attempt.
        markedRef.current = true;
        markAwaiting.mutate(bookingId);
      },
      onError: (error: unknown) => {
        showToast(handleApiError(error).message, 'error');
      },
    });
  };

  const handleContactSalon = () => {
    showToast('Please contact the salon directly to confirm your payment.', 'info');
  };

  const renderHeader = (title: string) => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );

  const renderDetailsCard = () => (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Salon</Text>
        <Text style={styles.rowValue} numberOfLines={1}>
          {salonName}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Service</Text>
        <Text style={styles.rowValue} numberOfLines={1}>
          {serviceName}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Amount</Text>
        <Text style={styles.rowValueStrong}>{formatPrice(amount || 0)}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Booking reference</Text>
        <Text style={styles.rowValueStrong}>{reference}</Text>
      </View>
    </View>
  );

  const renderUpiCard = () => (
    <View style={styles.upiCard}>
      <View style={styles.upiHeader}>
        <Ionicons name="phone-portrait-outline" size={18} color={theme.colors.primary} />
        <Text style={styles.upiHeaderText}>Salon UPI ID</Text>
      </View>
      <Text style={styles.upiId} selectable>
        {upiId}
      </Text>
      {!!payeeName && <Text style={styles.upiPayee}>{payeeName}</Text>}
      <Text style={styles.upiHint}>
        Didn&apos;t a UPI app open? Pay this UPI ID manually for {formatPrice(amount || 0)} from
        any UPI app.
      </Text>
    </View>
  );

  // ── Loading: skeletons, not spinners ───────────────────────────────────────
  if (isLoading && !status) {
    return (
      <ScreenWrapper variant="stack">
        {renderHeader('Awaiting verification')}
        <View style={styles.content}>
          <Skeleton width="60%" height={26} borderRadius={8} style={{ marginBottom: 16 }} />
          <Skeleton width="100%" height={120} borderRadius={16} style={{ marginBottom: 16 }} />
          <Skeleton width="100%" height={140} borderRadius={16} style={{ marginBottom: 16 }} />
          <Skeleton width="100%" height={52} borderRadius={26} />
        </View>
      </ScreenWrapper>
    );
  }

  // ── Verified: booking confirmed ─────────────────────────────────────────────
  if (verificationStatus === 'verified') {
    return (
      <ScreenWrapper variant="stack">
        {renderHeader('Payment verified')}
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        >
          <View style={[styles.statusIcon, { backgroundColor: theme.colors.success + '1A' }]}>
            <Ionicons name="checkmark-circle" size={56} color={theme.colors.success} />
          </View>
          <Text style={styles.statusTitle}>Booking confirmed</Text>
          <Text style={styles.statusBody}>
            The salon verified your payment. Your booking is confirmed.
          </Text>
          {renderDetailsCard()}
          <Button title="View my bookings" onPress={goToBookings} style={{ marginTop: 24 }} />
        </ScrollView>
      </ScreenWrapper>
    );
  }

  // ── Rejected: could not verify ──────────────────────────────────────────────
  if (verificationStatus === 'rejected') {
    return (
      <ScreenWrapper variant="stack">
        {renderHeader('Verification failed')}
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        >
          <View style={[styles.statusIcon, { backgroundColor: theme.colors.error + '1A' }]}>
            <Ionicons name="close-circle" size={56} color={theme.colors.error} />
          </View>
          <Text style={styles.statusTitle}>We couldn&apos;t verify your payment</Text>
          <Text style={styles.statusBody}>
            We could not verify your payment. Please try again or contact the salon.
          </Text>
          {renderDetailsCard()}
          <Button
            title="Try UPI payment again"
            onPress={handleRetry}
            loading={initiateUpi.isPending}
            style={{ marginTop: 24 }}
          />
          <Button
            title="Contact the salon"
            variant="outline"
            onPress={handleContactSalon}
            style={{ marginTop: 12 }}
          />
          <Button
            title="Go to my bookings"
            variant="ghost"
            onPress={goToBookings}
            style={{ marginTop: 4 }}
          />
        </ScrollView>
      </ScreenWrapper>
    );
  }

  // ── Timeout: not verified within the window ─────────────────────────────────
  if (verificationStatus === 'timeout') {
    return (
      <ScreenWrapper variant="stack">
        {renderHeader('Still waiting')}
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        >
          <View style={[styles.statusIcon, { backgroundColor: theme.colors.warning + '1A' }]}>
            <Ionicons name="time-outline" size={56} color={theme.colors.warning} />
          </View>
          <Text style={styles.statusTitle}>The salon hasn&apos;t verified yet</Text>
          <Text style={styles.statusBody}>
            The salon hasn&apos;t verified yet. You may wait, contact the salon, or cancel.
          </Text>
          {renderDetailsCard()}
          {renderUpiCard()}
          <Button title="Keep waiting" onPress={() => undefined} disabled style={{ marginTop: 24, opacity: 0.6 }} />
          <Button
            title="Contact the salon"
            variant="outline"
            onPress={handleContactSalon}
            style={{ marginTop: 12 }}
          />
          <Button
            title="Go to my bookings"
            variant="ghost"
            onPress={goToBookings}
            style={{ marginTop: 4 }}
          />
        </ScrollView>
      </ScreenWrapper>
    );
  }

  // ── Default: initiated / waiting_verification ───────────────────────────────
  return (
    <ScreenWrapper variant="stack">
      {renderHeader('Awaiting verification')}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      >
        <View style={[styles.statusIcon, { backgroundColor: theme.colors.primary + '1A' }]}>
          <Ionicons name="hourglass-outline" size={56} color={theme.colors.primary} />
        </View>
        <Text style={styles.statusTitle}>Waiting for the salon to verify</Text>
        <Text style={styles.statusBody}>
          We are waiting for the salon to verify your payment. Most salons verify payments within
          2–5 minutes.
        </Text>

        {renderDetailsCard()}
        {renderUpiCard()}

        <Button
          title="Reopen UPI app"
          variant="outline"
          onPress={handleReopenUpiApp}
          style={{ marginTop: 24 }}
        />
        <Button
          title="I've paid — go to my bookings"
          onPress={goToBookings}
          style={{ marginTop: 12 }}
        />
      </ScrollView>
    </ScreenWrapper>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      fontFamily: fonts.heading,
      fontSize: 22,
      color: theme.colors.text,
    },
    content: {
      padding: 24,
    },
    statusIcon: {
      width: 96,
      height: 96,
      borderRadius: 48,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginBottom: 20,
    },
    statusTitle: {
      fontFamily: fonts.heading,
      fontSize: 24,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 12,
    },
    statusBody: {
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 22,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
      paddingHorizontal: 8,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 12,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    rowLabel: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    rowValue: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: theme.colors.text,
      flexShrink: 1,
      textAlign: 'right',
    },
    rowValueStrong: {
      fontFamily: fonts.bodyBold,
      fontSize: 15,
      color: theme.colors.text,
      flexShrink: 1,
      textAlign: 'right',
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
    },
    upiCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.colors.primary + '44',
      marginTop: 16,
      gap: 6,
    },
    upiHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    upiHeaderText: {
      fontFamily: fonts.bodyBold,
      fontSize: 14,
      color: theme.colors.primary,
    },
    upiId: {
      fontFamily: fonts.bodyBold,
      fontSize: 20,
      color: theme.colors.text,
    },
    upiPayee: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    upiHint: {
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
      color: theme.colors.textSecondary,
      marginTop: 6,
    },
  });

export default PaymentWaitingScreen;
