import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Booking } from '../types';
import { colors, formatPrice, formatDate, formatTime, getStatusColor, getPaymentStatusColor } from '../lib/utils';

interface BookingCardProps {
  booking: Booking;
  isOwner?: boolean;
  onCancel?: () => void;
  onConfirm?: () => void;
  onReject?: () => void;
  onComplete?: () => void;
}

export const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  isOwner = false,
  onCancel,
  onConfirm,
  onReject,
  onComplete,
}) => {
  const statusColors = getStatusColor(booking.status);
  const paymentColors = getPaymentStatusColor(booking.payment_status);

  const getStatusIcon = () => {
    switch (booking.status) {
      case 'confirmed':
        return <Ionicons name="checkmark-circle" size={16} color="#1E40AF" />;
      case 'completed':
        return <Ionicons name="checkmark-circle" size={16} color="#065F46" />;
      case 'cancelled':
        return <Ionicons name="close-circle" size={16} color="#991B1B" />;
      default:
        return <Ionicons name="hourglass" size={16} color="#92400E" />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.serviceName}>{booking.services?.name || 'Service'}</Text>
          <Text style={styles.salonName}>
            {isOwner ? booking.users?.name : booking.salons?.name}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
          {getStatusIcon()}
          <Text style={[styles.statusText, { color: statusColors.text }]}>
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color={colors.textSecondary} />
          <Text style={styles.detailText}>{formatDate(booking.booking_date)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time" size={16} color={colors.textSecondary} />
          <Text style={styles.detailText}>{formatTime(booking.time_slot)}</Text>
        </View>
        {!isOwner && booking.salons?.phone && (
          <View style={styles.detailRow}>
            <Ionicons name="call" size={16} color={colors.textSecondary} />
            <Text style={styles.detailText}>{booking.salons.phone}</Text>
          </View>
        )}
        {isOwner && booking.users?.phone && (
          <View style={styles.detailRow}>
            <Ionicons name="call" size={16} color={colors.textSecondary} />
            <Text style={styles.detailText}>{booking.users.phone}</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <View style={[styles.paymentBadge, { backgroundColor: paymentColors.bg }]}>
            <Text style={[styles.paymentText, { color: paymentColors.text }]}>
              {booking.payment_status}
            </Text>
          </View>
          <Text style={styles.amountText}>{formatPrice(booking.amount || 0)}</Text>
        </View>

        <View style={styles.actions}>
          {!isOwner && booking.status === 'pending' && onCancel && (
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Ionicons name="close-circle-outline" size={18} color={colors.error} />
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}

          {isOwner && booking.status === 'pending' && (
            <>
              {onConfirm && (
                <TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
                  <Ionicons name="checkmark" size={16} color="#065F46" />
                  <Text style={styles.confirmText}>Confirm</Text>
                </TouchableOpacity>
              )}
              {onReject && (
                <TouchableOpacity style={styles.rejectButton} onPress={onReject}>
                  <Ionicons name="close" size={16} color="#991B1B" />
                  <Text style={styles.rejectText}>Reject</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {isOwner && booking.status === 'confirmed' && onComplete && (
            <TouchableOpacity style={styles.completeButton} onPress={onComplete}>
              <Ionicons name="checkmark-done" size={16} color="#1E40AF" />
              <Text style={styles.completeText}>Complete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  salonName: {
    fontSize: 14,
    color: colors.textSecondary,
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
    borderBottomColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    color: colors.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
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
    color: colors.error,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  confirmText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065F46',
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  rejectText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#991B1B',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  completeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E40AF',
  },
});

export default BookingCard;
