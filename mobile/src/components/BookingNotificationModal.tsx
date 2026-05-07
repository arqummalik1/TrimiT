/**
 * BookingNotificationModal.tsx
 * ────────────────────────────────────────────────────────────────────────────
 * Interactive modal for new booking notifications.
 * Shows booking details and provides quick actions for owners.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Theme } from '../theme/ThemeContext';
import { typography, spacing, borderRadius } from '../lib/utils';
import type { BookingNotification } from '../store/notificationStore';
import { format } from 'date-fns';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  notification: BookingNotification | null;
  onClose: () => void;
  onAccept?: (bookingId: string) => void;
  onReject?: (bookingId: string) => void;
  onViewDetails?: (bookingId: string) => void;
  isProcessing?: boolean;
}

export const BookingNotificationModal: React.FC<Props> = ({
  notification,
  onClose,
  onAccept,
  onReject,
  onViewDetails,
  isProcessing = false,
}) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();

  const slideAnim = useRef(new Animated.Value(-100)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (notification) {
      // Animate in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [notification]);

  if (!notification) return null;

  const { booking, type, actionRequired } = notification;
  const serviceName = booking.services?.name || 'Service';
  const customerName = booking.users?.name || 'Customer';
  const date = booking.booking_date;
  const time = booking.time_slot;
  const amount = booking.amount;

  const getIcon = () => {
    switch (type) {
      case 'new_booking':
        return 'calendar';
      case 'status_change':
        return 'checkmark-circle';
      case 'cancellation':
        return 'close-circle';
      default:
        return 'notifications';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'new_booking':
        return theme.colors.primary;
      case 'status_change':
        return theme.colors.success;
      case 'cancellation':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  return (
    <Modal
      visible={!!notification}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        <Animated.View
          style={[
            styles.modalContainer,
            {
              top: insets.top + 16,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          {Platform.OS === 'ios' ? (
            <BlurView intensity={95} tint={theme.dark ? 'dark' : 'light'} style={styles.blurContainer}>
              <ModalContent />
            </BlurView>
          ) : (
            <View style={[styles.blurContainer, { backgroundColor: theme.colors.surface }]}>
              <ModalContent />
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );

  function ModalContent() {
    return (
      <>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: getIconColor() + '20' }]}>
            <Ionicons name={getIcon()} size={28} color={getIconColor()} />
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text style={styles.title}>
          {type === 'new_booking' && 'New Booking Received!'}
          {type === 'status_change' && 'Booking Updated'}
          {type === 'cancellation' && 'Booking Cancelled'}
        </Text>

        {/* Booking Details */}
        <View style={styles.detailsContainer}>
          <DetailRow icon="person" label="Customer" value={customerName} />
          <DetailRow icon="cut" label="Service" value={serviceName} />
          <DetailRow icon="calendar" label="Date" value={format(new Date(date), 'MMM dd, yyyy')} />
          <DetailRow icon="time" label="Time" value={time} />
          <DetailRow icon="cash" label="Amount" value={`₹${amount.toFixed(2)}`} />
        </View>

        {/* Action Buttons */}
        {actionRequired && type === 'new_booking' && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => {
                onReject?.(booking.id);
                onClose();
              }}
              disabled={isProcessing}
            >
              <Ionicons name="close-circle" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Reject</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => {
                onAccept?.(booking.id);
                onClose();
              }}
              disabled={isProcessing}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* View Details Button */}
        <TouchableOpacity
          style={styles.viewDetailsButton}
          onPress={() => {
            onViewDetails?.(booking.id);
            onClose();
          }}
        >
          <Text style={styles.viewDetailsText}>View Full Details</Text>
          <Ionicons name="arrow-forward" size={16} color={theme.colors.primary} />
        </TouchableOpacity>
      </>
    );
  }

  function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
    return (
      <View style={styles.detailRow}>
        <View style={styles.detailLeft}>
          <Ionicons name={icon as any} size={16} color={theme.colors.textSecondary} />
          <Text style={styles.detailLabel}>{label}</Text>
        </View>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    );
  }
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-start',
      alignItems: 'center',
    },
    modalContainer: {
      width: SCREEN_WIDTH - 32,
      maxWidth: 400,
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 8,
    },
    blurContainer: {
      padding: spacing.xl,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    iconContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceHighlight,
    },
    title: {
      ...typography.h3,
      color: theme.colors.text,
      marginBottom: spacing.lg,
    },
    detailsContainer: {
      backgroundColor: theme.colors.surfaceHighlight,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      marginBottom: spacing.lg,
      gap: spacing.md,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    detailLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    detailLabel: {
      ...typography.bodySmall,
      color: theme.colors.textSecondary,
    },
    detailValue: {
      ...typography.bodyMedium,
      color: theme.colors.text,
    },
    actionsContainer: {
      flexDirection: 'row',
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
    },
    acceptButton: {
      backgroundColor: theme.colors.success,
    },
    rejectButton: {
      backgroundColor: theme.colors.error,
    },
    actionButtonText: {
      ...typography.bodyMedium,
      color: '#fff',
      fontWeight: '600',
    },
    viewDetailsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
    },
    viewDetailsText: {
      ...typography.bodyMedium,
      color: theme.colors.primary,
      fontWeight: '600',
    },
  });
