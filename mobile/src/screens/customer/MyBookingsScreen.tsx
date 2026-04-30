/**
 * MyBookingsScreen.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Customer bookings list with:
 *   • BookingListSkeleton with 500ms minimum display
 *   • ErrorState with retry for API failures
 *   • EmptyState for zero bookings
 *   • Toast feedback on cancel instead of native Alert
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { BookingCard } from '../../components/BookingCard';
import { BookingListSkeleton } from '../../components/skeletons/BookingListSkeleton';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { handleApiError } from '../../lib/errorHandler';
import { useMinLoadingTime } from '../../hooks/useMinLoadingTime';
import { showToast } from '../../store/toastStore';
import { Booking } from '../../types';
import { typography, spacing, fonts } from '../../lib/utils';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';

interface MyBookingsScreenProps {
  navigation?: any;
}

export const MyBookingsScreen: React.FC<MyBookingsScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const queryClient = useQueryClient();

  const {
    data: bookings,
    isLoading,
    isError,
    error: rawError,
    refetch,
    isRefetching,
  } = useQuery<Booking[]>({
    queryKey: ['myBookings'],
    queryFn: async () => {
      const response = await api.get('/api/bookings');
      return response.data;
    },
    retry: (failureCount, err: any) => {
      if (err?.type === 'auth') return false;
      return failureCount < 2;
    },
  });

  const showSkeleton = useMinLoadingTime(isLoading);

  const cancelMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      await api.patch(`/api/bookings/${bookingId}/status`, { status: 'cancelled' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myBookings'] });
      showToast('Booking cancelled successfully.', 'success');
    },
    onError: (err: any) => {
      const appErr = handleApiError(err);
      showToast(appErr.message, 'error');
    },
  });

  const handleCancel = (bookingId: string) => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking? This action cannot be undone.',
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => cancelMutation.mutate(bookingId),
        },
      ]
    );
  };

  // ── Error state ────────────────────────────────────────────────────────────
  if (isError && !showSkeleton) {
    const appErr = handleApiError(rawError);
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>My Bookings</Text>
        </View>
        <ErrorState
          title="Couldn't load bookings"
          message={appErr.message}
          type={appErr.type}
          onRetry={refetch}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
        <Text style={styles.subtitle}>View and manage your appointments</Text>
      </View>

      {showSkeleton ? (
        <BookingListSkeleton count={4} />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BookingCard booking={item} onCancel={() => handleCancel(item.id)} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              title="No Bookings Yet"
              message="You haven't made any bookings yet. Discover salons near you to get started."
              compact
              action={{
                label: 'Discover Salons',
                onPress: () => navigation?.navigate('Discover'),
              }}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: spacing.xl,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  listContent: {
    padding: spacing.xl,
    flexGrow: 1,
  },
});

export default MyBookingsScreen;
