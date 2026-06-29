import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';
import { OwnerSettingsScreenProps } from '../../navigation/types';
import { useCreateSubscription, useVerifySubscription } from '../../hooks/useSubscription';
import { useAuthStore } from '../../store/authStore';
import { handleApiError } from '../../lib/errorHandler';
import { isAppError } from '../../types/error';
import { showToast } from '../../store/toastStore';
import RazorpayCheckoutModal from '../../components/RazorpayCheckoutModal';
import { SUPPORT_EMAIL as CONTACT_EMAIL } from '../../lib/contactInfo';
import { CreateSubscriptionResponse } from '../../types/subscription';
type Props = OwnerSettingsScreenProps<'SubscriptionCheckout'>;

const PRICE_LABEL = '₹299 / month';

/** A real Razorpay order needs both ids to drive the hosted checkout. */
function isLaunchableOrder(o: CreateSubscriptionResponse): boolean {
  return !!o.key_id && !!o.subscription_id;
}

const SubscriptionCheckoutScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const user = useAuthStore((s) => s.user);

  const createSub = useCreateSubscription();
  const verifySub = useVerifySubscription();

  const [order, setOrder] = useState<CreateSubscriptionResponse | null>(null);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  // Friendly, non-crashing message shown when online subscribe isn't available
  // yet (gateway keys not configured → backend 503) or the SDK can't run.
  const [unavailableMessage, setUnavailableMessage] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const gatewayUnavailableCopy =
    `In-app subscription payment is coming soon. To activate TrimiT Pro now, ` +
    `please contact TrimiT at ${CONTACT_EMAIL} and we'll get you set up.`;

  const handleSubscribe = () => {
    setUnavailableMessage(null);
    createSub.mutate(undefined, {
      onSuccess: (data) => {
        if (data.already_active) {
          showToast('Your subscription is already active.', 'success');
          navigation.goBack();
          return;
        }
        if (isLaunchableOrder(data)) {
          setOrder(data);
          setCheckoutVisible(true);
        } else {
          // Backend returned a non-launchable payload (no SDK path) — fall back
          // to the friendly message instead of attempting a broken checkout.
          setUnavailableMessage(gatewayUnavailableCopy);
        }
      },
      onError: (error: unknown) => {
        const appErr = isAppError(error) ? error : handleApiError(error);
        // 503 SUBSCRIPTION_GATEWAY_UNAVAILABLE → not an error, just "not ready yet".
        if (appErr.status === 503 || appErr.code === 'SUBSCRIPTION_GATEWAY_UNAVAILABLE') {
          setUnavailableMessage(gatewayUnavailableCopy);
          return;
        }
        setUnavailableMessage(
          appErr.message ||
            `Could not start checkout. Please try again or contact ${CONTACT_EMAIL}.`,
        );
      },
    });
  };

  const handleCheckoutSuccess = (payload: Parameters<typeof verifySub.mutate>[0]) => {
    setCheckoutVisible(false);
    setVerifying(true);
    verifySub.mutate(payload, {
      onSuccess: () => {
        setVerifying(false);
        showToast('TrimiT Pro is now active. Thank you!', 'success');
        navigation.goBack();
      },
      onError: (error: unknown) => {
        setVerifying(false);
        const appErr = isAppError(error) ? error : handleApiError(error);
        setUnavailableMessage(
          appErr.message ||
            `We couldn't confirm your payment. If money was deducted, contact ${CONTACT_EMAIL}.`,
        );
      },
    });
  };

  const isWorking = createSub.isPending || verifying;

  return (
    <ScreenWrapper variant="stack">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>TrimiT Pro</Text>
          <Text style={styles.headerSubtitle}>{PRICE_LABEL}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.planCard}>
          <View style={styles.planIcon}>
            <Ionicons name="star" size={28} color={theme.colors.primary} />
          </View>
          <Text style={styles.planTitle}>TrimiT Pro</Text>
          <Text style={styles.planPrice}>₹299<Text style={styles.planPer}> / month</Text></Text>
          <Text style={styles.planBlurb}>
            Keep your salon listed and bookable, with the full dashboard, bookings,
            services, staff and analytics unlocked.
          </Text>
        </View>

        {unavailableMessage ? (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={theme.colors.warning} />
            <Text style={styles.infoText}>{unavailableMessage}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.primaryBtn, isWorking && styles.primaryBtnDisabled]}
          onPress={handleSubscribe}
          disabled={isWorking}
          activeOpacity={0.85}
        >
          {isWorking ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="card" size={18} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Subscribe ₹299/month</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.secureNote}>
          <Ionicons name="lock-closed" size={12} color={theme.colors.textSecondary} /> Payments are
          processed securely by Razorpay.
        </Text>
      </ScrollView>

      <RazorpayCheckoutModal
        visible={checkoutVisible}
        order={order}
        prefill={{ name: user?.name, email: user?.email, phone: user?.phone }}
        onSuccess={handleCheckoutSuccess}
        onDismiss={() => setCheckoutVisible(false)}
        onError={(message) => {
          setCheckoutVisible(false);
          setUnavailableMessage(message);
        }}
      />
    </ScreenWrapper>
  );
};

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
    headerText: { marginLeft: 12 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
    headerSubtitle: { fontSize: 14, color: theme.colors.textSecondary },
    body: { padding: 20, gap: 20 },
    planCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.primary + '55',
      padding: 24,
      alignItems: 'center',
      gap: 8,
    },
    planIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.primary + '1A',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    planTitle: { fontSize: 20, fontWeight: '800', color: theme.colors.text },
    planPrice: { fontSize: 32, fontWeight: '900', color: theme.colors.primary },
    planPer: { fontSize: 14, fontWeight: '700', color: theme.colors.textSecondary },
    planBlurb: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 19,
      marginTop: 4,
    },
    infoBox: {
      flexDirection: 'row',
      gap: 10,
      padding: 14,
      backgroundColor: theme.colors.warning + '1A',
      borderRadius: 12,
    },
    infoText: { color: theme.colors.warning, flex: 1, lineHeight: 20, fontSize: 13 },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.colors.primary,
      paddingVertical: 16,
      borderRadius: 12,
    },
    primaryBtnDisabled: { opacity: 0.6 },
    primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    secureNote: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
  });

export default SubscriptionCheckoutScreen;
