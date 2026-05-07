import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Booking } from '../types';
import { formatPrice, formatDate, formatTime } from '../lib/utils';
import { useTheme } from '../theme/ThemeContext';
import { getLightStatusColors, getDarkStatusColors, getLightPaymentColors, getDarkPaymentColors, Theme } from '../theme/tokens';
import { openNativeDirections } from '../lib/maps';

interface BookingCardProps {
  booking: Booking;
  isOwner?: boolean;
  compact?: boolean;
  isLoading?: boolean;
  onCancel?: () => void;
  onConfirm?: () => void;
  onReject?: () => void;
  onComplete?: () => void;
  onReschedule?: () => void;
}

export const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  isOwner = false,
  compact = false,
  isLoading = false,
  onCancel,
  onConfirm,
  onReject,
  onComplete,
  onReschedule,
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const thumbnailUrl =
    booking.services?.image_url ||
    booking.salons?.images?.[0] ||
    null;

  const statusColors    = isDark ? getDarkStatusColors() : getLightStatusColors();
  const paymentColors   = isDark ? getDarkPaymentColors() : getLightPaymentColors();
  const bookingStatus   = statusColors[booking.status]    ?? { bg: theme.colors.surfaceSecondary, text: theme.colors.textSecondary };
  const paymentStatus   = paymentColors[booking.payment_status] ?? { bg: theme.colors.surfaceSecondary, text: theme.colors.textSecondary };

  const getStatusIcon = () => {
    switch (booking.status) {
      case 'confirmed': return <Ionicons name="checkmark-circle" size={16} color={bookingStatus.text} />;
      case 'completed': return <Ionicons name="checkmark-circle" size={16} color={bookingStatus.text} />;
      case 'cancelled': return <Ionicons name="close-circle"     size={16} color={bookingStatus.text} />;
      default:          return <Ionicons name="hourglass"         size={16} color={bookingStatus.text} />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerRow}>
            <View style={styles.thumbnailWrap}>
              {thumbnailUrl ? (
                <Image
                  source={{ uri: thumbnailUrl }}
                  style={styles.thumbnail}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={[styles.thumbnail, styles.thumbnailFallback]}>
                  <Ionicons name="cut-outline" size={18} color={theme.colors.textSecondary} />
                </View>
              )}
            </View>
            <View style={styles.headerText}>
              <Text style={styles.serviceName} numberOfLines={1}>
                {booking.services?.name || 'Service'}
              </Text>
              <Text style={styles.salonName} numberOfLines={1}>
                {isOwner ? booking.users?.name : booking.salons?.name}
              </Text>
            </View>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: bookingStatus.bg }]}>
          {getStatusIcon()}
          <Text style={[styles.statusText, { color: bookingStatus.text }]}>
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.detailText}>{formatDate(booking.booking_date)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.detailText}>{formatTime(booking.time_slot)}</Text>
        </View>
        {!isOwner && booking.salons?.phone && (
          <View style={styles.detailRow}>
            <Ionicons name="call" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.detailText}>{booking.salons.phone}</Text>
          </View>
        )}
        {isOwner && booking.users?.phone && (
          <View style={styles.detailRow}>
            <Ionicons name="call" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.detailText}>{booking.users.phone}</Text>
          </View>
        )}
      </View>

      {!compact && (
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <View style={[styles.paymentBadge, { backgroundColor: paymentStatus.bg }]}>
              <Text style={[styles.paymentText, { color: paymentStatus.text }]}>
                {booking.payment_status}
              </Text>
            </View>
            <Text style={styles.amountText}>{formatPrice(booking.amount || 0)}</Text>
          </View>

          <View style={styles.actions}>
            {/* Customer: reschedule (pending or confirmed) */}
            {!isOwner &&
              (booking.status === 'pending' || booking.status === 'confirmed') &&
              onReschedule && (
                <TouchableOpacity
                  style={styles.iconActionButton}
                  onPress={onReschedule}
                  accessibilityRole="button"
                  accessibilityLabel="Reschedule booking"
                >
                  <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
              )}

            {/* Customer: cancel pending */}
            {!isOwner && booking.status === 'pending' && onCancel && (
              <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                <Ionicons name="close-circle-outline" size={18} color={theme.colors.error} />
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            )}

            {/* Customer: get directions (confirmed / completed) */}
            {!isOwner &&
              (booking.status === 'confirmed' || booking.status === 'completed') &&
              booking.salons?.latitude &&
              booking.salons?.longitude && (
                <TouchableOpacity
                  style={styles.directionsIconButton}
                  onPress={() =>
                    openNativeDirections(
                      { latitude: booking.salons!.latitude, longitude: booking.salons!.longitude },
                      booking.salons!.name
                    )
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Get directions to salon"
                >
                  <Ionicons name="navigate" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              )}

            {/* Owner: confirm / reject pending */}
            {isOwner && booking.status === 'pending' && (
              <>
                {isLoading ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginHorizontal: 16 }} />
                ) : (
                  <>
                    {onConfirm && (
                      <TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
                        <Ionicons name="checkmark" size={16} color={theme.colors.success} />
                        <Text style={styles.confirmText}>Confirm</Text>
                      </TouchableOpacity>
                    )}
                    {onReject && (
                      <TouchableOpacity style={styles.rejectButton} onPress={onReject}>
                        <Ionicons name="close" size={16} color={theme.colors.error} />
                        <Text style={styles.rejectText}>Reject</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </>
            )}

            {/* Owner: mark confirmed booking as complete */}
            {isOwner && booking.status === 'confirmed' && onComplete && (
              <TouchableOpacity style={styles.completeButton} onPress={onComplete}>
                <Ionicons name="checkmark-done" size={16} color={theme.colors.info} />
                <Text style={styles.completeText}>Mark as complete</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 12,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    headerLeft: { flex: 1 },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerText: {
      flex: 1,
      minWidth: 0,
    },
    thumbnailWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceSecondary,
    },
    thumbnail: {
      width: 44,
      height: 44,
    },
    thumbnailFallback: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    serviceName: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 2,
    },
    salonName: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
      gap: 4,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
    },
    details: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
      marginBottom: 12,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    detailText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    footer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 10,
    },
    footerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    paymentBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    paymentText: {
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    amountText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.primary,
    },
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 8,
      flexShrink: 1,
      maxWidth: '100%',
    },
    cancelButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 4,
    },
    cancelText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.error,
    },
    iconActionButton: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary + '15',
      width: 40,
      height: 40,
      borderRadius: 10,
    },
    directionsIconButton: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      width: 40,
      height: 40,
      borderRadius: 10,
    },
    confirmButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.successLight,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      gap: 4,
    },
    confirmText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.success,
    },
    rejectButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.errorLight,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      gap: 4,
    },
    rejectText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.error,
    },
    completeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.infoLight,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      gap: 4,
    },
    completeText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.info,
    },
  });

export default BookingCard;
