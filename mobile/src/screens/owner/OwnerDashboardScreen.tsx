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

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Salon, Analytics, Booking } from '../../types';
import { formatPrice, typography, spacing, borderRadius } from '../../lib/utils';
import { useTheme, Theme } from '../../theme/ThemeContext';
import { Button } from '../../components/Button';
import { DashboardSkeleton } from '../../components/skeletons/DashboardSkeleton';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { handleApiError } from '../../lib/errorHandler';
import { useMinLoadingTime } from '../../hooks/useMinLoadingTime';
import { BookingsTrendChart, PopularServicesChart, StatusDistributionChart } from '../../components/charts';
import { subscribeToSalonBookings, unsubscribeFromBookings } from '../../lib/supabase';
import BookingCard from '../../components/BookingCard';

interface OwnerDashboardScreenProps {
  navigation: any;
}

type Period = 'today' | '7d' | '30d' | 'all';

// ── Pulse Indicator (live feed dot) ───────────────────────────────────────────
const PulseIndicator = () => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const scale = React.useRef(new Animated.Value(1)).current;
  const opacity = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.5, duration: 1000, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.pulseContainer}>
      <Animated.View style={[styles.pulseCircle, { transform: [{ scale }], opacity }]} />
      <View style={[styles.pulseCircle, { backgroundColor: theme.colors.success }]} />
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
          <Ionicons name={icon as any} size={20} color={iconColor} />
        </Animated.View>
        <Text style={styles.compactStatLabel} numberOfLines={1}>{title}</Text>
      </View>
      <Text style={styles.compactStatValue} numberOfLines={1}>{value}</Text>
    </Animated.View>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export const OwnerDashboardScreen: React.FC<OwnerDashboardScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('today');

  const {
    data: salon,
    isLoading: salonLoading,
    isError: salonError,
    error: salonRawError,
    refetch: refetchSalon,
  } = useQuery<Salon | null>({
    queryKey: ['ownerSalon'],
    queryFn: async () => {
      const response = await api.get('/api/owner/salon');
      return response.data;
    },
    retry: (count, err: any) => err?.type !== 'auth' && count < 2,
  });

  const { data: analytics, refetch: refetchAnalytics } = useQuery<Analytics>({
    queryKey: ['ownerAnalytics', selectedPeriod, salon?.id],
    queryFn: async () => {
      const response = await api.get(`/api/owner/analytics?period=${selectedPeriod}`);
      return response.data;
    },
    enabled: !!salon,
  });

  const { data: recentBookings, refetch: refetchRecentBookings } = useQuery<Booking[]>({
    queryKey: ['recentBookings', salon?.id],
    queryFn: async () => {
      const response = await api.get('/api/bookings');
      return response.data
        .sort((a: Booking, b: Booking) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .slice(0, 3);
    },
    enabled: !!salon,
  });

  const handleRefresh = async () => {
    await Promise.all([refetchSalon(), refetchAnalytics(), refetchRecentBookings()]);
  };

  // Real-time subscription
  useEffect(() => {
    if (salon?.id) {
      const channel = subscribeToSalonBookings(salon.id, () => {
        refetchAnalytics();
        refetchRecentBookings();
      });
      return () => {
        unsubscribeFromBookings(channel);
      };
    }
  }, [salon?.id]);

  const showSkeleton = useMinLoadingTime(salonLoading, 500);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (showSkeleton) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <DashboardSkeleton />
      </SafeAreaView>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (salonError) {
    const appErr = handleApiError(salonRawError);
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ErrorState
          title="Couldn't load dashboard"
          message={appErr.message}
          type={appErr.type}
          onRetry={handleRefresh}
        />
      </SafeAreaView>
    );
  }

  // ── No salon yet ───────────────────────────────────────────────────────────
  if (!salon) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <EmptyState
          icon="storefront-outline"
          title="Create Your Salon"
          message="Set up your salon profile to start accepting bookings and tracking your business."
          action={{ label: 'Create Salon', onPress: () => navigation.navigate('ManageSalon') }}
        />
      </SafeAreaView>
    );
  }

  // ── Stat cards ─────────────────────────────────────────────────────────────
  const statCards = [
    { title: 'Total Earnings', value: formatPrice(analytics?.total_earnings || 0), icon: 'wallet-outline', color: '#10B981', iconColor: '#10B981' },
    { title: 'Total Bookings', value: analytics?.total_bookings || 0, icon: 'calendar-outline', color: '#3B82F6', iconColor: '#3B82F6' },
    { title: "Today's", value: analytics?.today_bookings || 0, icon: 'today-outline', color: '#F97316', iconColor: '#F97316' },
    { title: 'Pending', value: analytics?.pending_bookings || 0, icon: 'hourglass-outline', color: '#F59E0B', iconColor: '#F59E0B' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
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
          <View>
            <Text style={styles.welcomeText}>Good Day,</Text>
            <Text style={styles.salonTitle}>{salon.name}</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationBell}
            onPress={() => navigation.navigate('OwnerTabs', { screen: 'Bookings' })}
          >
            <Ionicons name="notifications-outline" size={24} color={theme.colors.text} />
            {analytics && analytics.pending_bookings > 0 && <View style={styles.bellDot} />}
          </TouchableOpacity>
        </View>

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
            <TouchableOpacity onPress={() => navigation.navigate('OwnerTabs', { screen: 'Bookings' })}>
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
                onConfirm={handleRefresh}
                onReject={handleRefresh}
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
        {analytics && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Business Performance</Text>
            <BookingsTrendChart data={analytics.bookings_trend} />
            <View style={styles.chartsGrid}>
              <View style={{ flex: 1 }}>
                <PopularServicesChart data={analytics.popular_services} />
              </View>
            </View>
            <StatusDistributionChart data={analytics.status_distribution} />
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
                        { width: `${Math.min((hour.bookings / analytics.total_bookings) * 100, 100)}%` as any },
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
    </SafeAreaView>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  premiumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  welcomeText: { fontSize: 14, color: theme.colors.textSecondary, fontWeight: '500' },
  salonTitle: { fontSize: 24, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.5 },
  notificationBell: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: theme.colors.border,
  },
  bellDot: {
    position: 'absolute', top: 12, right: 12,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: theme.colors.primary, borderWidth: 2, borderColor: theme.colors.surface,
  },
  periodRow: { flexDirection: 'row', paddingHorizontal: spacing.xxl, marginBottom: spacing.xl, gap: spacing.sm },
  periodTab: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: theme.colors.surfaceHighlight },
  periodTabActive: { backgroundColor: theme.colors.text },
  periodTabText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  compactStatTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  compactStatIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  compactStatLabel: { fontSize: 11, fontWeight: '600', color: theme.colors.textSecondary },
  compactStatValue: { fontSize: 20, fontWeight: '700', color: theme.colors.text, letterSpacing: -0.5 },
  section: { paddingHorizontal: spacing.xxl, marginBottom: spacing.xxl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  seeAllText: { fontSize: 14, color: theme.colors.primary, fontWeight: '600' },
  chartsGrid: { marginBottom: spacing.lg },
  peakHoursCard: { backgroundColor: theme.colors.surface, borderRadius: 20, padding: spacing.xl, borderWidth: 1, borderColor: theme.colors.border, gap: spacing.lg },
  peakHourRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  peakHourTimeText: { fontSize: 13, fontWeight: '600', color: theme.colors.text, width: 45 },
  peakHourBar: { flex: 1, height: 6, backgroundColor: theme.colors.surfaceHighlight, borderRadius: 3, overflow: 'hidden' },
  peakHourFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 3 },
  peakHourCount: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, width: 25, textAlign: 'right' },
  pulseContainer: { width: 12, height: 12, alignItems: 'center', justifyContent: 'center' },
  pulseCircle: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.success + '40' },
});

export default OwnerDashboardScreen;
