/**
 * OwnerDashboardScreen.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Owner dashboard upgraded with:
 *   • DashboardSkeleton with 500ms minimum display
 *   • ErrorState for API failures with retry
 *   • EmptyState (styled) for no-salon state
 *   • Real-time subscription unchanged
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWrapper, TAB_BAR_BASE_HEIGHT } from '../../components/ScreenWrapper';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salonRepository } from '../../repositories/salonRepository';
import { bookingRepository } from '../../repositories/bookingRepository';
import { Salon, Analytics, Booking } from '../../types';
import { formatPrice, spacing } from '../../lib/utils';
import { useTheme, Theme } from '../../theme/ThemeContext';
import { typography } from '../../theme/tokens';
import { navigateToOwnerBookings } from '../../lib/navigationHelpers';
import { DashboardSkeleton } from '../../components/skeletons/DashboardSkeleton';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { handleApiError } from '../../lib/errorHandler';
import { useMinLoadingTime } from '../../hooks/useMinLoadingTime';
import { BookingsTrendChart, PopularServicesChart, StatusDistributionChart } from '../../components/charts';
import { showToast } from '../../store/toastStore';
import BookingCard from '../../components/BookingCard';
import { SubscriptionBanner } from '../../components/SubscriptionBanner';
import { useSubscriptionStatus } from '../../hooks/useSubscription';
import { ENABLE_SUBSCRIPTIONS } from '../../lib/featureFlags';
import { OwnerSetupBanner } from '../../components/OwnerSetupBanner';
import { useVerifyPayment, useRejectPayment } from '../../hooks/usePayment';
import SalonCloseSheet, { CloseChoice } from '../../components/owner/SalonCloseSheet';
import { getSalonClosedState, getClosedLabel } from '../../lib/salonAvailability';

import { OwnerDashboardScreenProps as NavigationProps } from '../../navigation/types';
import { ComponentProps } from 'react';

type OwnerDashboardProps = NavigationProps<'DashboardMain'>;

type Period = 'today' | '7d' | '30d' | 'all';

// ── Pulse Indicator (live feed dot) ───────────────────────────────────────────
const PulseIndicator = () => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const ringScale = React.useRef(new Animated.Value(1)).current;
  const ringOpacity = React.useRef(new Animated.Value(0.65)).current;
  const coreScale = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const ringLoop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(ringScale, { toValue: 2.2, duration: 900, useNativeDriver: true }),
          Animated.timing(ringScale, { toValue: 1, duration: 900, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(ringOpacity, { toValue: 0.15, duration: 900, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0.65, duration: 900, useNativeDriver: true }),
        ]),
      ])
    );

    const coreLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(coreScale, { toValue: 1.15, duration: 700, useNativeDriver: true }),
        Animated.timing(coreScale, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );

    ringLoop.start();
    coreLoop.start();
    return () => {
      ringLoop.stop();
      coreLoop.stop();
    };
  }, [coreScale, ringOpacity, ringScale]);

  return (
    <View style={styles.pulseContainer} accessibilityLabel="Live activity">
      <Animated.View
        style={[
          styles.pulseRing,
          { transform: [{ scale: ringScale }], opacity: ringOpacity },
        ]}
      />
      <Animated.View
        style={[
          styles.pulseCore,
          { transform: [{ scale: coreScale }], backgroundColor: theme.colors.success },
        ]}
      />
    </View>
  );
};

// ── Animated Stat Card ────────────────────────────────────────────────────────
interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  iconColor: string;
  index: number;
}

const AnimatedStatCard: React.FC<StatCardProps> = ({ title, value, icon, color, iconColor, index }) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const translateY = React.useRef(new Animated.Value(20)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;
  const iconScale = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 600,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 600,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Subtle icon float animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(iconScale, { toValue: 1.1, duration: 2000, useNativeDriver: true }),
        Animated.timing(iconScale, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.compactStatCard, { opacity, transform: [{ translateY }] }]}>
      <View style={styles.compactStatTop}>
        <Animated.View 
          style={[
            styles.compactStatIcon, 
            { backgroundColor: color + '25', transform: [{ scale: iconScale }] }
          ]}
        >
          <Ionicons name={icon as ComponentProps<typeof Ionicons>['name']} size={20} color={iconColor} />
        </Animated.View>
        <Text style={styles.compactStatLabel} numberOfLines={1}>{title}</Text>
      </View>
      <Text style={styles.compactStatValue} numberOfLines={1}>{value}</Text>
    </Animated.View>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export const OwnerDashboardScreen: React.FC<OwnerDashboardProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('today');
  const [showCharts, setShowCharts] = useState(false);

  useEffect(() => {
    // Delay chart rendering to keep initial screen transition smooth
    const timer = setTimeout(() => {
      setShowCharts(true);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const {
    data: salon,
    isLoading: salonLoading,
    isError: salonError,
    error: salonRawError,
    refetch: refetchSalon,
  } = useQuery<Salon | null>({
    queryKey: ['ownerSalon'],
    queryFn: () => salonRepository.getOwnerSalon(),
    retry: (count, err: unknown) => {
      const appErr = handleApiError(err);
      return appErr.kind !== 'unauthorized' && count < 2;
    },
  });

  const { data: analytics, refetch: refetchAnalytics } = useQuery<Analytics>({
    queryKey: ['ownerAnalytics', selectedPeriod, salon?.id],
    queryFn: () => salonRepository.getAnalytics(selectedPeriod),
    enabled: !!salon,
    staleTime: 0,
  });

  const { data: recentBookings, refetch: refetchRecentBookings } = useQuery<Booking[]>({
    queryKey: ['recentBookings', salon?.id],
    queryFn: () => bookingRepository.getRecentBookings(3),
    enabled: !!salon,
    staleTime: 0,
  });

  const queryClient = useQueryClient();

  const { data: subscriptionStatus } = useSubscriptionStatus();

  // UPI onboarding nudge. TrimiT never collects money — to accept UPI the salon
  // must store a UPI ID. Surface a dashboard banner until one is set.
  const showUpiBanner = !!salon && !salon.upi_id;
  const openPayoutDetails = () =>
    navigation
      .getParent()
      ?.navigate('Settings', { screen: 'UpiPaymentSettings', initial: false });

  const verifyPayment = useVerifyPayment();
  const rejectPayment = useRejectPayment();

  // ── Open/Close kill-switch ──────────────────────────────────────────────────
  const [closeSheetVisible, setCloseSheetVisible] = useState(false);
  const closedState = useMemo(() => getSalonClosedState(salon), [salon]);

  const availabilityMutation = useMutation({
    mutationFn: (payload: { accepting_bookings: boolean; closed_until?: string | null; reason?: string | null }) =>
      salonRepository.updateAvailability(salon!.id, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(['ownerSalon'], updated);
      queryClient.invalidateQueries({ queryKey: ['ownerSalon'] });
    },
    onError: (error: unknown) => {
      showToast(handleApiError(error).message, 'error');
    },
  });

  const handleReopen = () => {
    availabilityMutation.mutate(
      { accepting_bookings: true },
      { onSuccess: () => showToast('Your salon is open — accepting bookings', 'success') }
    );
  };

  const handleCloseConfirm = (choice: CloseChoice) => {
    setCloseSheetVisible(false);
    availabilityMutation.mutate(
      { accepting_bookings: false, closed_until: choice.closedUntil },
      { onSuccess: () => showToast(choice.label, 'success') }
    );
  };

  const handleVerifyPayment = (bookingId: string) => {
    verifyPayment.mutate(
      { bookingId },
      {
        onSuccess: () => showToast('Payment verified — booking confirmed', 'success'),
        onError: (error: unknown) => showToast(handleApiError(error).message, 'error'),
      }
    );
  };

  const handleRejectPayment = (bookingId: string) => {
    rejectPayment.mutate(
      { bookingId },
      {
        onSuccess: () => showToast('Payment rejected', 'success'),
        onError: (error: unknown) => showToast(handleApiError(error).message, 'error'),
      }
    );
  };

  const isUpiActionInFlight = (bookingId: string) =>
    (verifyPayment.isPending && verifyPayment.variables?.bookingId === bookingId) ||
    (rejectPayment.isPending && rejectPayment.variables?.bookingId === bookingId);

  const statusMutation = useMutation({
    mutationFn: ({ bookingId, status }: { bookingId: string; status: string }) => 
      bookingRepository.updateBookingStatus(bookingId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recentBookings'] });
      queryClient.invalidateQueries({ queryKey: ['ownerAnalytics'] });
      queryClient.invalidateQueries({ queryKey: ['salonBookings'] });
      void Promise.all([
        queryClient.refetchQueries({ queryKey: ['recentBookings'] }),
        queryClient.refetchQueries({ queryKey: ['ownerAnalytics'] }),
        queryClient.refetchQueries({ queryKey: ['ownerBookings'] }),
      ]).catch(() => {});
    },
    onError: (err: unknown) => {
      const appErr = handleApiError(err);
      console.error('[Dashboard] Status update failed:', appErr);
    },
  });

  const handleRefresh = async () => {
    await Promise.all([refetchSalon(), refetchAnalytics(), refetchRecentBookings()]);
  };

  // Note: Real-time subscription is handled globally in OwnerTabs.tsx
  // When a new booking comes in, OwnerTabs invalidates the query cache,
  // causing this screen to automatically re-fetch and update.

  const showSkeleton = useMinLoadingTime(salonLoading, 500);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (showSkeleton) {
    return (
      <ScreenWrapper variant="tab">
        <DashboardSkeleton />
      </ScreenWrapper>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (salonError) {
    const appErr = handleApiError(salonRawError);
    return (
      <ScreenWrapper variant="tab">
        <ErrorState
          title="Couldn't load dashboard"
          message={appErr.message}
          kind={appErr.kind}
          onRetry={handleRefresh}
        />
      </ScreenWrapper>
    );
  }

  // ── No salon yet ───────────────────────────────────────────────────────────
  if (!salon) {
    return (
      <ScreenWrapper variant="tab">
        <EmptyState
          icon="storefront-outline"
          title="Create Your Salon"
          message="Set up your salon profile, then add services so customers can book you."
          action={{ label: 'Create Salon', onPress: () => navigation.navigate('ManageSalon') }}
        />
      </ScreenWrapper>
    );
  }

  // ── Stat cards ─────────────────────────────────────────────────────────────
  const statCards = [
    { 
      title: selectedPeriod === 'all' ? 'Total Earnings' : 'Earnings', 
      value: formatPrice(analytics?.total_earnings || 0), 
      icon: 'wallet-outline', color: theme.colors.success, iconColor: theme.colors.success 
    },
    { 
      title: selectedPeriod === 'all' ? 'Total Bookings' : 'Bookings', 
      value: analytics?.total_bookings || 0, 
      icon: 'calendar-outline', color: theme.colors.info, iconColor: theme.colors.info 
    },
    { 
      title: "Today's", 
      value: analytics?.today_bookings || 0, 
      icon: 'today-outline', color: theme.colors.warning, iconColor: theme.colors.warning 
    },
    { 
      title: 'Pending', 
      value: analytics?.pending_bookings || 0, 
      icon: 'hourglass-outline', color: theme.colors.warning, iconColor: theme.colors.warning 
    },
  ];

  // Trial countdown pill colour — greener when comfortable, red as it runs out,
  // so the owner is nudged a little harder each day to subscribe.
  const trialDaysLeft = subscriptionStatus?.trial_days_remaining ?? 0;
  const trialPillColor =
    trialDaysLeft <= 2
      ? theme.colors.error
      : trialDaysLeft <= 5
      ? theme.colors.warning ?? '#B45309'
      : theme.colors.success ?? theme.colors.primary;

  // Open the Subscription screen inside the Settings tab. `initial: false` makes
  // React Navigation place SettingsMain beneath it, so Back / swipe / hardware
  // back returns to Settings (not the Dashboard) and the tab is never "stuck".
  const openSubscription = () =>
    navigation
      .getParent()
      ?.navigate('Settings', { screen: 'Subscription', initial: false });

  return (
    <ScreenWrapper variant="tab">
      <ScrollView
        contentContainerStyle={{ paddingBottom: TAB_BAR_BASE_HEIGHT + insets.bottom + 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={salonLoading}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Premium Header */}
        <View style={styles.premiumHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.welcomeText}>Good Day,</Text>
            <Text style={styles.salonTitle} numberOfLines={1}>{salon.name}</Text>
            {/* Open / Closed kill-switch pill */}
            <TouchableOpacity
              style={[
                styles.availabilityPill,
                {
                  backgroundColor: closedState.closed
                    ? theme.colors.error + '1A'
                    : theme.colors.success + '1A',
                  borderColor: closedState.closed ? theme.colors.error : theme.colors.success,
                },
              ]}
              activeOpacity={0.85}
              disabled={availabilityMutation.isPending}
              onPress={closedState.closed ? handleReopen : () => setCloseSheetVisible(true)}
            >
              <View
                style={[
                  styles.availabilityDot,
                  { backgroundColor: closedState.closed ? theme.colors.error : theme.colors.success },
                ]}
              />
              <Text
                style={[
                  styles.availabilityText,
                  { color: closedState.closed ? theme.colors.error : theme.colors.success },
                ]}
                numberOfLines={1}
              >
                {availabilityMutation.isPending
                  ? 'Updating…'
                  : closedState.closed
                  ? `${getClosedLabel(closedState)} · Tap to open`
                  : 'Open · Accepting bookings'}
              </Text>
            </TouchableOpacity>
            {ENABLE_SUBSCRIPTIONS && subscriptionStatus?.is_trial ? (
              <TouchableOpacity
                style={[styles.trialPill, { backgroundColor: trialPillColor }]}
                activeOpacity={0.85}
                onPress={openSubscription}
              >
                <Ionicons name="time" size={13} color={theme.colors.background} />
                <Text style={styles.trialPillText}>
                  {subscriptionStatus.trial_days_remaining > 0
                    ? `${subscriptionStatus.trial_days_remaining} day${
                        subscriptionStatus.trial_days_remaining === 1 ? '' : 's'
                      } left in free trial`
                    : 'Free trial ends today'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.notificationBell}
            onPress={() => navigateToOwnerBookings(navigation)}
          >
            <Ionicons name="notifications-outline" size={24} color={theme.colors.text} />
            {analytics && analytics.pending_bookings > 0 && <View style={styles.bellDot} />}
          </TouchableOpacity>
        </View>

        {/* Subscription / trial banner (Phase 1: informational).
            Hidden while TrimiT is commission-based + free for owners. */}
        {ENABLE_SUBSCRIPTIONS && subscriptionStatus ? (
          <SubscriptionBanner
            status={subscriptionStatus}
            onPress={openSubscription}
          />
        ) : null}

        {/* UPI onboarding banner — shown until the salon stores a UPI ID */}
        {showUpiBanner ? (
          <OwnerSetupBanner
            icon="phone-portrait-outline"
            title="Accept UPI payments"
            message="Add your UPI ID so customers can pay you directly via any UPI app."
            ctaLabel="Add UPI ID"
            onPress={openPayoutDetails}
          />
        ) : null}

        {/* Period Selector */}
        <View style={styles.periodRow}>
          {(['today', '7d', '30d', 'all'] as Period[]).map((period) => (
            <TouchableOpacity
              key={period}
              style={[styles.periodTab, selectedPeriod === period && styles.periodTabActive]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[styles.periodTabText, selectedPeriod === period && styles.periodTabTextActive]}>
                {period === 'today' ? 'Today' : period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : 'All Time'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Grid 2x2 */}
        <View style={styles.compactStatsGrid}>
          {statCards.map((stat, index) => (
            <AnimatedStatCard key={index} {...stat} index={index} />
          ))}
        </View>

        {/* Live Bookings Feed */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <PulseIndicator />
            </View>
            <TouchableOpacity onPress={() => navigateToOwnerBookings(navigation)}>
              <Text style={styles.seeAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentBookings && recentBookings.length > 0 ? (
            recentBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                isOwner
                compact
                isLoading={
                  statusMutation.isPending &&
                  statusMutation.variables?.bookingId === booking.id &&
                  statusMutation.variables?.status !== 'completed'
                }
                isCompleting={
                  statusMutation.isPending &&
                  statusMutation.variables?.bookingId === booking.id &&
                  statusMutation.variables?.status === 'completed'
                }
                onConfirm={() => statusMutation.mutate({ bookingId: booking.id, status: 'confirmed' })}
                onReject={() => statusMutation.mutate({ bookingId: booking.id, status: 'cancelled' })}
                onComplete={() => statusMutation.mutate({ bookingId: booking.id, status: 'completed' })}
                onVerifyPayment={() => handleVerifyPayment(booking.id)}
                onRejectPayment={() => handleRejectPayment(booking.id)}
                isVerifying={isUpiActionInFlight(booking.id)}
              />
            ))
          ) : (
            <EmptyState
              icon="calendar-outline"
              title="No Recent Activity"
              message="New bookings will appear here in real-time."
              compact
            />
          )}
        </View>

        {/* Performance Charts */}
        {analytics && showCharts ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Business Performance</Text>
            <BookingsTrendChart data={analytics.bookings_trend} />
            <PopularServicesChart data={analytics.popular_services} />
            <StatusDistributionChart data={analytics.status_distribution} />
          </View>
        ) : analytics && (
          <View style={[styles.section, { height: 300, justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={{ marginTop: 12, color: theme.colors.textSecondary, fontSize: 12 }}>
              Preparing charts...
            </Text>
          </View>
        )}

        {/* Peak Hours */}
        {analytics?.peak_hours && analytics.peak_hours.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Peak Hours</Text>
            <View style={styles.peakHoursCard}>
              {analytics.peak_hours.slice(0, 3).map((hour, index) => (
                <View key={index} style={styles.peakHourRow}>
                  <Text style={styles.peakHourTimeText}>{hour.hour}:00</Text>
                  <View style={styles.peakHourBar}>
                    <View
                      style={[
                        styles.peakHourFill,
                        { width: `${Math.min((hour.bookings / analytics.total_bookings) * 100, 100)}%` as const },
                      ]}
                    />
                  </View>
                  <Text style={styles.peakHourCount}>{hour.bookings}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <SalonCloseSheet
        visible={closeSheetVisible}
        openingTime={salon.opening_time}
        saving={availabilityMutation.isPending}
        onClose={() => setCloseSheetVisible(false)}
        onConfirm={handleCloseConfirm}
      />
    </ScreenWrapper>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1 },
  premiumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  welcomeText: { ...typography.bodySmallMedium, color: theme.colors.textSecondary },
  salonTitle: { ...typography.h3, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.5 },
  headerLeft: { flex: 1, paddingRight: 12 },
  trialPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.pill,
  },
  trialPillText: { ...typography.captionMedium, color: theme.colors.background, fontWeight: '800', letterSpacing: 0.2 },
  availabilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.pill,
    borderWidth: 1,
  },
  availabilityDot: { width: 7, height: 7, borderRadius: 4 },
  availabilityText: { ...typography.captionMedium, fontWeight: '700', letterSpacing: 0.2 },
  notificationBell: {
    width: 44, height: 44, borderRadius: theme.borderRadius.full, backgroundColor: theme.colors.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: theme.colors.border,
  },
  bellDot: {
    position: 'absolute', top: 12, right: 12,
    width: 8, height: 8, borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary, borderWidth: 2, borderColor: theme.colors.surface,
  },
  periodRow: { flexDirection: 'row', paddingHorizontal: spacing.xxl, marginBottom: spacing.xl, gap: spacing.sm },
  periodTab: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: theme.borderRadius.pill, backgroundColor: theme.colors.surfaceHighlight },
  periodTabActive: { backgroundColor: theme.colors.text },
  periodTabText: { ...typography.captionMedium, color: theme.colors.textSecondary },
  periodTabTextActive: { color: theme.colors.background },
  compactStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.xxl,
    justifyContent: 'space-between',
    marginBottom: spacing.xxl,
  },
  compactStatCard: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    padding: spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  compactStatTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  compactStatIcon: { width: 28, height: 28, borderRadius: theme.borderRadius.sm, alignItems: 'center', justifyContent: 'center' },
  compactStatLabel: { ...typography.captionMedium, fontSize: 11, color: theme.colors.textSecondary },
  compactStatValue: { ...typography.h3, fontWeight: '700', color: theme.colors.text, letterSpacing: -0.5 },
  section: { paddingHorizontal: spacing.xxl, marginBottom: spacing.xxl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  sectionTitle: { ...typography.h4, color: theme.colors.text },
  seeAllText: { ...typography.bodySmallMedium, color: theme.colors.primary, fontWeight: '600' },
  peakHoursCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: spacing.xl, borderWidth: 1, borderColor: theme.colors.border, gap: spacing.lg },
  peakHourRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  peakHourTimeText: { ...typography.captionMedium, fontSize: 13, color: theme.colors.text, width: 45 },
  peakHourBar: { flex: 1, height: 6, backgroundColor: theme.colors.surfaceHighlight, borderRadius: theme.borderRadius.pill, overflow: 'hidden' },
  peakHourFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.pill },
  peakHourCount: { ...typography.captionMedium, color: theme.colors.textSecondary, width: 25, textAlign: 'right' },
  pulseContainer: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  pulseRing: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.success,
  },
  pulseCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default OwnerDashboardScreen;
