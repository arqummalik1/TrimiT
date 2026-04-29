import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Salon, Analytics, Booking } from '../../types';
import { colors, formatPrice } from '../../lib/utils';
import { Button } from '../../components/Button';
import { BookingsTrendChart, PopularServicesChart, StatusDistributionChart } from '../../components/charts';
import { subscribeToSalonBookings, unsubscribeFromBookings } from '../../lib/supabase';
import BookingCard from '../../components/BookingCard';

interface OwnerDashboardScreenProps {
  navigation: any;
}

type Period = '7d' | '30d' | 'all';

const PulseIndicator = () => {
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
      <View style={[styles.pulseCircle, { backgroundColor: colors.success }]} />
    </View>
  );
};

export const OwnerDashboardScreen: React.FC<OwnerDashboardScreenProps> = ({ navigation }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('all');
  const [realtimeChannel, setRealtimeChannel] = useState<any>(null);

  const { data: salon, isLoading: salonLoading, refetch: refetchSalon } = useQuery<Salon | null>({
    queryKey: ['ownerSalon'],
    queryFn: async () => {
      const response = await api.get('/api/owner/salon');
      return response.data;
    },
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
      // Sort by latest and take first 3
      return response.data.sort((a: Booking, b: Booking) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ).slice(0, 3);
    },
    enabled: !!salon,
  });

  // Subscribe to real-time booking updates
  useEffect(() => {
    if (salon?.id) {
      const channel = subscribeToSalonBookings(salon.id, () => {
        // Refresh everything when bookings change
        refetchAnalytics();
        refetchRecentBookings();
      });
      setRealtimeChannel(channel);

      return () => {
        unsubscribeFromBookings(channel);
      };
    }
  }, [salon?.id]);

  const handleRefresh = () => {
    refetchSalon();
    refetchAnalytics();
    refetchRecentBookings();
  };

  const handlePeriodChange = (period: Period) => {
    setSelectedPeriod(period);
  };

  const statCards = [
    {
      title: 'Total Earnings',
      value: formatPrice(analytics?.total_earnings || 0),
      icon: 'wallet',
      color: '#D1FAE5',
      iconColor: '#059669',
    },
    {
      title: 'Total Bookings',
      value: analytics?.total_bookings || 0,
      icon: 'calendar',
      color: '#DBEAFE',
      iconColor: '#1E40AF',
    },
    {
      title: "Today's Bookings",
      value: analytics?.today_bookings || 0,
      icon: 'today',
      color: '#FFEDD5',
      iconColor: '#C2410C',
    },
    {
      title: 'Pending',
      value: analytics?.pending_bookings || 0,
      icon: 'hourglass',
      color: '#FEF3C7',
      iconColor: '#92400E',
    },
  ];

  if (!salon && !salonLoading) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <Ionicons name="storefront-outline" size={80} color={colors.border} />
        <Text style={styles.emptyTitle}>Create Your Salon</Text>
        <Text style={styles.emptyText}>
          Set up your salon profile to start receiving bookings
        </Text>
        <Button
          title="Create Salon"
          onPress={() => navigation.navigate('ManageSalon')}
          icon={<Ionicons name="add" size={20} color="#FFFFFF" />}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={salonLoading} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* Modern Premium Header */}
        <View style={styles.premiumHeader}>
          <View>
            <Text style={styles.welcomeText}>Good Day,</Text>
            <Text style={styles.salonTitle}>{salon?.name}</Text>
          </View>
          <TouchableOpacity 
            style={styles.notificationBell}
            onPress={() => navigation.navigate('OwnerTabs', { screen: 'Bookings' })}
          >
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
            {analytics && analytics.pending_bookings > 0 && (
              <View style={styles.bellDot} />
            )}
          </TouchableOpacity>
        </View>

        {/* High-Density Period Selector */}
        <View style={styles.periodRow}>
          {(['7d', '30d', 'all'] as Period[]).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodTab,
                selectedPeriod === period && styles.periodTabActive,
              ]}
              onPress={() => handlePeriodChange(period)}
            >
              <Text
                style={[
                  styles.periodTabText,
                  selectedPeriod === period && styles.periodTabTextActive,
                ]}
              >
                {period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : 'All Time'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Compact Stats Grid (2-column) */}
        <View style={styles.compactStatsGrid}>
          {statCards.map((stat, index) => (
            <View key={index} style={styles.compactStatCard}>
              <View style={styles.compactStatTop}>
                <View style={[styles.compactStatIcon, { backgroundColor: stat.color + '40' }]}>
                  <Ionicons name={stat.icon as any} size={18} color={stat.iconColor} />
                </View>
                <Text style={styles.compactStatLabel}>{stat.title}</Text>
              </View>
              <Text style={styles.compactStatValue}>{stat.value}</Text>
            </View>
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
                onConfirm={() => handleRefresh()}
                onReject={() => handleRefresh()}
              />
            ))
          ) : (
            <View style={styles.emptyActivity}>
              <Text style={styles.emptyActivityText}>No recent activity</Text>
            </View>
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

        {/* Quick Insights */}
        {analytics?.peak_hours && analytics.peak_hours.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Peak Hours</Text>
            <View style={styles.peakHoursCard}>
              {analytics.peak_hours.slice(0, 3).map((hour, index) => (
                <View key={index} style={styles.peakHourRow}>
                  <Text style={styles.peakHourTimeText}>
                    {hour.hour}:00
                  </Text>
                  <View style={styles.peakHourBar}>
                    <View
                      style={[
                        styles.peakHourFill,
                        { width: `${Math.min((hour.bookings / analytics.total_bookings) * 100, 100)}%` },
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Sleek light background
  },
  premiumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  welcomeText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  salonTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  notificationBell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bellDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  periodRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 20,
    gap: 8,
  },
  periodTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
  },
  periodTabActive: {
    backgroundColor: colors.text,
  },
  periodTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  periodTabTextActive: {
    color: '#FFFFFF',
  },
  compactStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 18,
    gap: 12,
    marginBottom: 24,
  },
  compactStatCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  compactStatTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  compactStatIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactStatLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  compactStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  seeAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  emptyActivity: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  emptyActivityText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  chartsGrid: {
    marginBottom: 16,
  },
  peakHoursCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 16,
  },
  peakHourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  peakHourTimeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    width: 45,
  },
  peakHourBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  peakHourFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  peakHourCount: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    width: 25,
    textAlign: 'right',
  },
  pulseContainer: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseCircle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success + '40',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: colors.background,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default OwnerDashboardScreen;
