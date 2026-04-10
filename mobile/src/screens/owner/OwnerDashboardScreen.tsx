import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Salon, Analytics } from '../../types';
import { colors, formatPrice } from '../../lib/utils';
import { Button } from '../../components/Button';
import { BookingsTrendChart, PopularServicesChart, StatusDistributionChart } from '../../components/charts';
import { subscribeToSalonBookings, unsubscribeFromBookings } from '../../lib/supabase';

interface OwnerDashboardScreenProps {
  navigation: any;
}

type Period = '7d' | '30d' | 'all';

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
    queryKey: ['ownerAnalytics', selectedPeriod],
    queryFn: async () => {
      const response = await api.get(`/api/owner/analytics?period=${selectedPeriod}`);
      return response.data;
    },
    enabled: !!salon,
  });

  // Subscribe to real-time booking updates
  useEffect(() => {
    if (salon?.id) {
      const channel = subscribeToSalonBookings(salon.id, () => {
        // Refresh analytics when bookings change
        refetchAnalytics();
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
          <RefreshControl refreshing={salonLoading} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>Welcome back, {salon?.name}</Text>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(['7d', '30d', 'all'] as Period[]).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive,
              ]}
              onPress={() => handlePeriodChange(period)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === period && styles.periodButtonTextActive,
                ]}
              >
                {period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : 'All Time'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {statCards.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: stat.color }]}>
                <Ionicons name={stat.icon as any} size={22} color={stat.iconColor} />
              </View>
              <Text style={styles.statLabel}>{stat.title}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
            </View>
          ))}
        </View>

        {/* Analytics Charts */}
        {analytics && (
          <>
            <BookingsTrendChart data={analytics.bookings_trend} />
            <PopularServicesChart data={analytics.popular_services} />
            <StatusDistributionChart data={analytics.status_distribution} />
          </>
        )}

        {/* Peak Hours Section */}
        {analytics?.peak_hours && analytics.peak_hours.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Peak Booking Hours</Text>
            <View style={styles.peakHoursCard}>
              {analytics.peak_hours.map((hour, index) => (
                <View key={index} style={styles.peakHourRow}>
                  <View style={styles.peakHourRank}>
                    <Text style={styles.peakHourRankText}>#{index + 1}</Text>
                  </View>
                  <View style={styles.peakHourTime}>
                    <Ionicons name="time-outline" size={16} color={colors.primary} />
                    <Text style={styles.peakHourTimeText}>
                      {hour.hour}:00 - {hour.hour + 1}:00
                    </Text>
                  </View>
                  <View style={styles.peakHourBar}>
                    <View
                      style={[
                        styles.peakHourFill,
                        { width: `${Math.min((hour.bookings / analytics.total_bookings) * 500, 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.peakHourCount}>{hour.bookings} bookings</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('ManageSalon')}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="storefront" size={24} color={colors.primary} />
              </View>
              <Text style={styles.actionText}>Edit Salon</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('OwnerTabs', { screen: 'Bookings' })}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="calendar" size={24} color="#059669" />
              </View>
              <Text style={styles.actionText}>View Bookings</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Settings')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="settings" size={24} color="#92400E" />
              </View>
              <Text style={styles.actionText}>Settings</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Services Preview */}
        {salon?.services && salon.services.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Services</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('OwnerTabs', { screen: 'Services' })}
              >
                <Text style={styles.seeAllText}>Manage All</Text>
              </TouchableOpacity>
            </View>
            {salon.services.slice(0, 4).map((service) => (
              <View key={service.id} style={styles.serviceItem}>
                <View>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Text style={styles.serviceDuration}>{service.duration} mins</Text>
                </View>
                <Text style={styles.servicePrice}>{formatPrice(service.price)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  header: {
    padding: 20,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  section: {
    padding: 20,
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
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  overviewCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 16,
  },
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  overviewLabel: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  overviewValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  actionsGrid: {
    gap: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginLeft: 16,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSecondary,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  serviceDuration: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  peakHoursCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  peakHourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  peakHourRank: {
    width: 28,
    height: 28,
    backgroundColor: colors.primaryLight,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  peakHourRankText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  peakHourTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 100,
  },
  peakHourTimeText: {
    fontSize: 13,
    color: colors.text,
  },
  peakHourBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  peakHourFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  peakHourCount: {
    fontSize: 12,
    color: colors.textSecondary,
    width: 70,
    textAlign: 'right',
  },
});

export default OwnerDashboardScreen;
