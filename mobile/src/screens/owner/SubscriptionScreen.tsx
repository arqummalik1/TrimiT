import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';
import { OwnerSettingsScreenProps } from '../../navigation/types';
import {
  useSubscription,
  useCancelSubscription,
} from '../../hooks/useSubscription';
import { SubscriptionStatus } from '../../types/subscription';

type Props = OwnerSettingsScreenProps<'Subscription'>;

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  trial: 'Free Trial',
  active: 'Active',
  expired: 'Expired',
  cancelled: 'Cancelled',
  payment_failed: 'Payment Failed',
  past_due: 'Past Due',
  grace_period: 'Grace Period',
};

const PRO_FEATURES: { icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap; title: string; desc: string }[] = [
  { icon: 'calendar', title: 'Unlimited bookings', desc: 'Accept, confirm & manage all customer bookings' },
  { icon: 'pricetags', title: 'Services & pricing', desc: 'Add and edit your full service menu' },
  { icon: 'people', title: 'Staff management', desc: 'Add staff, assign services & schedules' },
  { icon: 'flash', title: 'Real-time dashboard', desc: 'Live new-booking alerts the moment they arrive' },
  { icon: 'bar-chart', title: 'Analytics & reports', desc: 'Revenue, trends and business insights' },
  { icon: 'megaphone', title: 'Promotions & marketing', desc: 'Run promo codes and offers' },
  { icon: 'notifications', title: 'Customer notifications', desc: 'Automatic booking push updates to customers' },
  { icon: 'storefront', title: 'Marketplace visibility', desc: 'Your salon stays listed & bookable to all customers' },
];

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

const SubscriptionScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { data: sub, isLoading, isError, refetch } = useSubscription();
  const cancelMutation = useCancelSubscription();

  const statusColor = (status?: SubscriptionStatus): string => {
    if (status === 'active' || status === 'trial') return theme.colors.success ?? theme.colors.primary;
    if (status === 'grace_period' || status === 'past_due') return theme.colors.warning ?? '#B45309';
    return theme.colors.error;
  };

  const onCancel = () => {
    Alert.alert(
      'Cancel subscription?',
      'Your access continues until the end of the current billing cycle.',
      [
        { text: 'Keep subscription', style: 'cancel' },
        {
          text: 'Cancel at cycle end',
          style: 'destructive',
          onPress: () => {
            cancelMutation.mutate(true, {
              onSuccess: (r) => Alert.alert('Done', r.message),
              onError: () => Alert.alert('Error', 'Could not cancel. Please try again.'),
            });
          },
        },
      ],
    );
  };

  const goCheckout = () => navigation.navigate('SubscriptionCheckout');

  if (isLoading) {
    return (
      <ScreenWrapper variant="stack">
        <Header onBack={() => navigation.goBack()} theme={theme} styles={styles} />
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  if (isError || !sub) {
    return (
      <ScreenWrapper variant="stack">
        <Header onBack={() => navigation.goBack()} theme={theme} styles={styles} />
        <View style={styles.center}>
          <Text style={styles.muted}>Could not load subscription.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  const showSubscribe = sub.status !== 'active';
  const showCancel = sub.status === 'active' && !sub.cancel_at_period_end;

  return (
    <ScreenWrapper variant="stack">
      <Header onBack={() => navigation.goBack()} theme={theme} styles={styles} />
      <ScrollView contentContainerStyle={styles.body}>
        {/* Plan card */}
        <View style={styles.planCard}>
          <View style={styles.planTop}>
            <View>
              <Text style={styles.planName}>TrimiT Pro</Text>
              <Text style={styles.planPrice}>₹{(sub.amount / 100).toFixed(0)} / month</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: statusColor(sub.status) + '1A' }]}>
              <Text style={[styles.statusPillText, { color: statusColor(sub.status) }]}>
                {STATUS_LABEL[sub.status]}
              </Text>
            </View>
          </View>

          {sub.is_trial && (
            <View style={styles.trialBox}>
              <Ionicons name="time" size={18} color={theme.colors.primary} />
              <Text style={styles.trialText}>
                {sub.trial_days_remaining} day{sub.trial_days_remaining === 1 ? '' : 's'} left in your free trial
              </Text>
            </View>
          )}
        </View>

        {/* What you get — TrimiT Pro value card */}
        <View style={styles.featuresCard}>
          <View style={styles.featuresHeader}>
            <View>
              <Text style={styles.featuresTitle}>Everything in TrimiT Pro</Text>
              <Text style={styles.featuresSub}>One plan. All features unlocked.</Text>
            </View>
            <View style={styles.priceTag}>
              <Text style={styles.priceAmount}>₹299</Text>
              <Text style={styles.pricePer}>/mo</Text>
            </View>
          </View>
          <View style={styles.featuresList}>
            {PRO_FEATURES.map((f) => (
              <View key={f.title} style={styles.featureRow}>
                <View style={styles.featureCheck}>
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                </View>
                <View style={styles.featureTextWrap}>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureDesc}>{f.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Details */}
        <View style={styles.detailCard}>
          <DetailRow label="Status" value={STATUS_LABEL[sub.status]} styles={styles} />
          {sub.is_trial ? (
            <DetailRow label="Trial ends" value={formatDate(sub.trial_end)} styles={styles} />
          ) : (
            <>
              <DetailRow label="Current cycle start" value={formatDate(sub.current_period_start)} styles={styles} />
              <DetailRow label="Next renewal" value={formatDate(sub.next_renewal_at)} styles={styles} />
            </>
          )}
          <DetailRow label="Subscription start" value={formatDate(sub.created_at)} styles={styles} />
          {sub.cancel_at_period_end && (
            <DetailRow label="Cancels on" value={formatDate(sub.current_period_end)} styles={styles} />
          )}
        </View>

        {/* Payment history link */}
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => navigation.navigate('PaymentHistory')}
        >
          <Ionicons name="receipt-outline" size={20} color={theme.colors.text} />
          <Text style={styles.linkText}>View payment history</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        {/* Actions */}
        {showSubscribe && (
          <TouchableOpacity style={styles.primaryBtn} onPress={goCheckout}>
            <Ionicons name="card" size={18} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>
              {sub.status === 'trial' ? 'Subscribe to TrimiT Pro' : 'Renew Subscription'}
            </Text>
          </TouchableOpacity>
        )}

        {showCancel && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onCancel}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? (
              <ActivityIndicator color={theme.colors.error} />
            ) : (
              <Text style={styles.cancelText}>Cancel subscription</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
};

const Header: React.FC<{ onBack: () => void; theme: Theme; styles: ReturnType<typeof createStyles> }> = ({ onBack, theme, styles }) => (
  <View style={styles.header}>
    <TouchableOpacity onPress={onBack} style={styles.backButton}>
      <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
    </TouchableOpacity>
    <Text style={styles.headerTitle}>Subscription</Text>
  </View>
);

const DetailRow: React.FC<{ label: string; value: string; styles: ReturnType<typeof createStyles> }> = ({ label, value, styles }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
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
    headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
    body: { padding: 16, gap: 16 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    muted: { color: theme.colors.textSecondary },
    retryBtn: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      backgroundColor: theme.colors.primary,
      borderRadius: 8,
    },
    retryText: { color: '#FFFFFF', fontWeight: '600' },
    planCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 16,
      gap: 12,
    },
    planTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    planName: { fontSize: 20, fontWeight: '800', color: theme.colors.text },
    planPrice: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 2 },
    statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    statusPillText: { fontSize: 12, fontWeight: '700' },
    trialBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.colors.primary + '14',
      padding: 10,
      borderRadius: 10,
    },
    trialText: { color: theme.colors.text, fontSize: 13, fontWeight: '600' },
    featuresCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.primary + '55',
      padding: 16,
      gap: 14,
    },
    featuresHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    featuresTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
    featuresSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
    priceTag: { flexDirection: 'row', alignItems: 'flex-end' },
    priceAmount: { fontSize: 24, fontWeight: '900', color: theme.colors.primary },
    pricePer: { fontSize: 13, fontWeight: '700', color: theme.colors.primary, marginBottom: 3 },
    featuresList: { gap: 12 },
    featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    featureCheck: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    featureTextWrap: { flex: 1 },
    featureTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
    featureDesc: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
    detailCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 16,
      gap: 12,
    },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
    detailLabel: { color: theme.colors.textSecondary, fontSize: 14 },
    detailValue: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 16,
    },
    linkText: { flex: 1, color: theme.colors.text, fontSize: 15, fontWeight: '600' },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.colors.primary,
      paddingVertical: 16,
      borderRadius: 12,
    },
    primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    cancelBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.error,
    },
    cancelText: { color: theme.colors.error, fontSize: 15, fontWeight: '600' },
  });

export default SubscriptionScreen;
