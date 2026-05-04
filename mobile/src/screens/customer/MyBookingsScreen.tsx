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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWrapper, TAB_BAR_BASE_HEIGHT } from '../../components/ScreenWrapper';
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

import { AppError } from '../../types/error';
import { CustomerTabScreenProps } from '../../navigation/types';

type MyBookingsProps = CustomerTabScreenProps<'Bookings'>;

export const MyBookingsScreen: React.FC<MyBookingsProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
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
    retry: (failureCount, error) => {
      const appErr = handleApiError(error);
      if (appErr.kind === 'unauthorized') return false;
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
    onError: (error: unknown) => {
      const appErr = handleApiError(error);
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

  const handleReschedule = (booking: Booking) => {
    // Navigate to Discover stack which contains RescheduleBooking screen
    navigation.navigate('Discover', {
      screen: 'RescheduleBooking',
      params: {
        bookingId: booking.id,
        currentDate: booking.booking_date,
        currentSlot: booking.time_slot,
        salonId: booking.salon_id,
        serviceId: booking.service_id,
        salonName: booking.salons?.name || 'Salon',
        serviceName: booking.services?.name || 'Service',
      },
    });
  };

  // ── Error state ────────────────────────────────────────────────────────────
  if (isError && !showSkeleton) {
    const appErr = handleApiError(rawError);
    return (
      <ScreenWrapper variant="tab">
        <View style={styles.header}>
          <Text style={styles.title}>My Bookings</Text>
        </View>
        <ErrorState
          title="Couldn't load bookings"
          message={appErr.message}
          kind={appErr.kind}
          onRetry={refetch}
        />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper variant="tab">
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
            <BookingCard 
              booking={item} 
              onCancel={() => handleCancel(item.id)}
              onReschedule={() => handleReschedule(item)}
            />
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: TAB_BAR_BASE_HEIGHT + insets.bottom + 16 }]}
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
                onPress: () => navigation.navigate('Discover', { screen: 'DiscoverMain' }),
              }}
            />
          }
        />
      )}
    </ScreenWrapper>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
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
