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

import React, { useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ScreenWrapper,
  TAB_BAR_BASE_HEIGHT,
} from "../../components/ScreenWrapper";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookingCard } from "../../components/BookingCard";
import { BookingListSkeleton } from "../../components/skeletons/BookingListSkeleton";
import { ErrorState } from "../../components/ErrorState";
import { EmptyState } from "../../components/EmptyState";
import { handleApiError } from "../../lib/errorHandler";
import { useMinLoadingTime } from "../../hooks/useMinLoadingTime";
import { showToast } from "../../store/toastStore";
import { Booking } from "../../types";
import { bookingRepository } from "../../repositories/bookingRepository";
import { typography, spacing, fonts, layout } from "../../lib/utils";
import { useTheme } from "../../theme/ThemeContext";
import { Theme } from "../../theme/tokens";
import { useAuthStore } from "../../store/authStore";
import {
  subscribeToUserBookings,
  unsubscribeFromBookings,
} from "../../lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { logger } from "../../lib/logger";

import { AppError } from "../../types/error";
import { CustomerTabScreenProps } from "../../navigation/types";

type MyBookingsProps = CustomerTabScreenProps<"Bookings">;

export const MyBookingsScreen: React.FC<MyBookingsProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  const {
    data: bookings,
    isLoading,
    isError,
    error: rawError,
    refetch,
    isRefetching,
  } = useQuery<Booking[]>({
    queryKey: ["myBookings"],
    queryFn: bookingRepository.getMyBookings,
    retry: (failureCount, error) => {
      const appErr = handleApiError(error);
      if (appErr.kind === "unauthorized") return false;
      return failureCount < 2;
    },
  });

  // Refetch whenever the user lands on this tab — closes the gap where a
  // freshly-confirmed booking exists in cache but stale-while-revalidate
  // hadn't kicked in yet.
  useFocusEffect(
    React.useCallback(() => {
      void queryClient.invalidateQueries({ queryKey: ["myBookings"] });
    }, [queryClient]),
  );

  // Realtime: instant refresh when the owner accepts/rejects/completes/reschedules
  // any of the customer's bookings, or when this customer creates a new one from
  // another device. Subscribes only while focused.
  useFocusEffect(
    React.useCallback(() => {
      if (!userId) return;

      const channel: RealtimeChannel = subscribeToUserBookings(
        userId,
        (payload) => {
          logger.debug("[MyBookings] realtime event", {
            type: payload.eventType,
            bookingId:
              (payload.new as { id?: string } | null)?.id ??
              (payload.old as { id?: string } | null)?.id,
          });
          void queryClient.invalidateQueries({ queryKey: ["myBookings"] });
        },
      );

      return () => {
        unsubscribeFromBookings(channel);
      };
    }, [userId, queryClient]),
  );

  // Schedule the local "Upcoming appointment" reminder (1 hour before) ONLY for
  // bookings the backend reports as actually `confirmed` (owner accepted /
  // auto-accept / UPI payment verified) — never at creation time. Rescheduling
  // is idempotent (stable id per booking, cancels-then-sets), and this effect
  // reruns whenever the list refreshes (focus + realtime), so a pending→confirmed
  // transition gets its reminder promptly. Cancelled bookings have theirs removed.
  useEffect(() => {
    if (!bookings || bookings.length === 0) return;
    const actionable = bookings.filter(
      (b) => b.status === "confirmed" || b.status === "cancelled",
    );
    if (actionable.length === 0) return;
    void (async () => {
      const { scheduleBookingReminder, cancelBookingReminder } = await import(
        "../../lib/notifications"
      );
      for (const b of actionable) {
        if (b.status === "confirmed") {
          await scheduleBookingReminder({
            bookingId: b.id,
            salonName: b.salons?.name ?? "your salon",
            serviceName: b.services?.name ?? "your appointment",
            date: b.booking_date,
            time: b.time_slot,
          });
        } else {
          await cancelBookingReminder(b.id);
        }
      }
    })();
  }, [bookings]);

  const showSkeleton = useMinLoadingTime(isLoading);

  const cancelMutation = useMutation({
    mutationFn: bookingRepository.cancelBooking,
    onSuccess: (_data, cancelledBookingId) => {
      queryClient.invalidateQueries({ queryKey: ["myBookings"] });
      queryClient.invalidateQueries({ queryKey: ["slots"] });
      void import("../../lib/notifications").then(({ cancelBookingReminder }) =>
        cancelBookingReminder(cancelledBookingId),
      );
      showToast("Booking cancelled successfully.", "success");
    },
    onError: (error: unknown) => {
      const appErr = handleApiError(error);
      showToast(appErr.message, "error");
    },
  });

  const handleCancel = (bookingId: string) => {
    Alert.alert(
      "Cancel Booking",
      "Are you sure you want to cancel this booking? This action cannot be undone.",
      [
        { text: "Keep Booking", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: () => cancelMutation.mutate(bookingId),
        },
      ],
    );
  };

  const handleReschedule = (booking: Booking) => {
    // Navigate to Discover stack which contains RescheduleBooking screen
    navigation.navigate("Discover", {
      screen: "RescheduleBooking",
      params: {
        bookingId: booking.id,
        currentDate: booking.booking_date,
        currentSlot: booking.time_slot,
        salonId: booking.salon_id,
        serviceId: booking.service_id,
        salonName: booking.salons?.name || "Salon",
        serviceName: booking.services?.name || "Service",
      },
    });
  };

  // PayU online payment removed. TrimiT now uses a UPI-intent + manual
  // verification model handled during the booking flow (see BookingScreen →
  // PaymentWaiting). There is no separate "pay online" entry from the list.

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
              onWriteReview={
                item.status === "completed"
                  ? () =>
                      navigation.navigate("Discover", {
                        screen: "WriteReview",
                        params: { salonId: item.salon_id, bookingId: item.id },
                      })
                  : undefined
              }
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: TAB_BAR_BASE_HEIGHT + insets.bottom + 16 },
          ]}
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
                label: "Discover Salons",
                onPress: () =>
                  navigation.navigate("Discover", { screen: "DiscoverMain" }),
              }}
            />
          }
        />
      )}
    </ScreenWrapper>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      paddingHorizontal: layout.floatingChromeInset,
      paddingTop: spacing.xl,
      paddingBottom: spacing.md,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    title: {
      fontFamily: fonts.heading,
      fontSize: 28,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: 4,
    },
    subtitle: {
      ...typography.bodySmall,
      color: theme.colors.textSecondary,
    },
    listContent: {
      paddingHorizontal: layout.floatingChromeInset,
      paddingTop: spacing.xl,
      paddingBottom: spacing.xl,
      flexGrow: 1,
    },
  });

export default MyBookingsScreen;
