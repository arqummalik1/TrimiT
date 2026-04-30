import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import BookingCard from '../../components/BookingCard';
import { BookingListSkeleton } from '../../components/skeletons/BookingListSkeleton';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { useMinLoadingTime } from '../../hooks/useMinLoadingTime';
import { typography, spacing, borderRadius } from '../../lib/utils';
import { useTheme, Theme } from '../../theme/ThemeContext';

import api from '../../lib/api';
import { showToast } from '../../store/toastStore';
import { Booking, Salon } from '../../types';

const STATUSES = ['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const;
type StatusFilter = (typeof STATUSES)[number];

export default function ManageBookingsScreen() {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: salon } = useQuery<Salon | null>({
    queryKey: ['ownerSalon'],
    queryFn: async () => {
      const response = await api.get('/api/owner/salon');
      return response.data;
    },
  });

  const { data: bookings, isLoading: rawIsLoading, error: bookingsError, refetch: refetchBookings } = useQuery<Booking[]>({
    queryKey: ['ownerBookings'],
    queryFn: async () => {
      const response = await api.get('/api/bookings');
      return response.data;
    },
    enabled: !!salon,
  });

  const isLoading = useMinLoadingTime(rawIsLoading);

  const statusMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: string }) => {
      await api.patch(`/api/bookings/${bookingId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ownerBookings'] });
      queryClient.invalidateQueries({ queryKey: ['ownerAnalytics'] });
      showToast('Booking status updated', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.detail || 'Failed to update booking', 'error');
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['ownerBookings'] });
    setRefreshing(false);
  }, [queryClient]);

  const filteredBookings = (bookings || []).filter(
    (b) => filter === 'all' || b.status === filter
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Bookings</Text>
        </View>
        <BookingListSkeleton />
      </SafeAreaView>
    );
  }

  if (bookingsError) {
    return (
      <SafeAreaView style={styles.container}>
        <ErrorState 
          title="Failed to load bookings"
          message="We encountered an issue while loading your salon bookings. Please check your connection and try again."
          onRetry={refetchBookings}
        />
      </SafeAreaView>
    );
  }

  if (!salon) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState 
          title="No Salon Yet"
          message="Create your salon first to see bookings."
          icon="storefront-outline"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Bookings</Text>
        <Text style={styles.countText}>
          {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <FlatList
          data={STATUSES}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                filter === item && styles.filterChipActive,
              ]}
              onPress={() => setFilter(item)}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === item && styles.filterTextActive,
                ]}
              >
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Bookings List */}
      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={{ paddingTop: 40 }}>
            <EmptyState 
              title="No Bookings"
              message={filter === 'all' ? 'No bookings yet for your salon.' : `No ${filter} bookings.`}
              icon="calendar-outline"
            />
          </View>
        }
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            isOwner
            onConfirm={() =>
              statusMutation.mutate({ bookingId: item.id, status: 'confirmed' })
            }
            onReject={() =>
              statusMutation.mutate({ bookingId: item.id, status: 'cancelled' })
            }
            onComplete={() =>
              statusMutation.mutate({ bookingId: item.id, status: 'completed' })
            }
          />
        )}
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: theme.colors.text,
  },
  countText: {
    ...typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  filterContainer: {
    marginBottom: spacing.md,
  },
  filterList: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterText: {
    ...typography.bodySmallMedium,
    color: theme.colors.textSecondary,
  },
  filterTextActive: {
    color: theme.colors.background,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxxl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxxl,
    gap: spacing.md,
  },
  emptyTitle: {
    ...typography.h3,
    color: theme.colors.text,
  },
  emptyText: {
    ...typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
