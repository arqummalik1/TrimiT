/**
 * BookingNotificationModal.tsx
 * Owner alert for new bookings — solid surface, theme tokens, minimal scan-friendly layout.
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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Theme } from '../theme/ThemeContext';
import { fonts, typography, spacing, borderRadius, shadows, formatPrice, formatDate, formatTime } from '../lib/utils';
import type { BookingNotification } from '../store/notificationStore';
import { getBookingServiceImageUri, getServiceDisplayName } from '../lib/bookingDisplay';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  notification: BookingNotification | null;
  onClose: () => void;
  onAccept?: (bookingId: string) => void;
  onReject?: (bookingId: string) => void;
  isProcessing?: boolean;
}

export const BookingNotificationModal: React.FC<Props> = ({
  notification,
  onClose,
  onAccept,
  onReject,
  isProcessing = false,
}) => {
  const { theme, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const insets = useSafeAreaInsets();

  const slideAnim = useRef(new Animated.Value(-24)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (notification) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 68,
          friction: 11,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 68,
          friction: 11,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -24,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.96,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [notification]);

  if (!notification) return null;

  const { booking, type, actionRequired } = notification;
  const serviceName = getServiceDisplayName(booking);
  const serviceImageUri = getBookingServiceImageUri(booking);
  const customerName = booking.users?.name || 'Customer';
  const dateStr = typeof booking.booking_date === 'string' ? booking.booking_date : String(booking.booking_date ?? '');
  const timeRaw = booking.time_slot ?? '';
  const amountNum =
    typeof booking.amount === 'number' && !Number.isNaN(booking.amount)
      ? booking.amount
      : Number(booking.amount) || 0;

  const headline =
    type === 'new_booking'
      ? 'New booking'
      : type === 'status_change'
        ? 'Booking updated'
        : 'Booking cancelled';

  return (
    <Modal
      visible={!!notification}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

        <Animated.View
          style={[
            styles.modalWrap,
            {
              top: insets.top + 12,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.card}>
            <View style={styles.accentTop} />

            <View style={styles.topBar}>
              <View style={styles.badge}>
                <View style={styles.badgeDot} />
                <Text style={styles.badgeText}>{headline}</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={12}>
                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.hero}>
              <Image
                source={{ uri: serviceImageUri }}
                style={styles.heroImage}
                contentFit="cover"
                transition={200}
              />
              <View style={styles.heroBody}>
                <Text style={styles.serviceTitle} numberOfLines={2}>
                  {serviceName}
                </Text>
                <Text style={styles.customer} numberOfLines={1}>
                  {customerName}
                </Text>
                <View style={styles.chipRow}>
                  <View style={styles.chip}>
                    <Ionicons name="calendar-outline" size={14} color={theme.colors.primary} />
                    <Text style={styles.chipText}>{dateStr ? formatDate(dateStr) : '—'}</Text>
                  </View>
                  <View style={styles.chip}>
                    <Ionicons name="time-outline" size={14} color={theme.colors.primary} />
                    <Text style={styles.chipText}>{formatTime(timeRaw)}</Text>
                  </View>
                </View>
                <Text style={styles.amount}>{formatPrice(amountNum)}</Text>
              </View>
            </View>

            {actionRequired && type === 'new_booking' && (
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnReject]}
                  onPress={() => {
                    onReject?.(booking.id);
                    onClose();
                  }}
                  disabled={isProcessing}
                >
                  <Text style={[styles.btnRejectText, isProcessing && { opacity: 0.5 }]}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnAccept]}
                  onPress={() => {
                    onAccept?.(booking.id);
                    onClose();
                  }}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator color={theme.colors.textInverse} />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color={theme.colors.textInverse} />
                      <Text style={styles.btnAcceptText}>Accept</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const createStyles = (theme: Theme, isDark: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'flex-start',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
    },
    modalWrap: {
      width: '100%',
      maxWidth: 400,
    },
    card: {
      width: SCREEN_WIDTH - 32,
      maxWidth: 400,
      alignSelf: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
      ...shadows.lg,
    },
    accentTop: {
      height: 3,
      width: '100%',
      backgroundColor: theme.colors.primary,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    badgeDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.primary,
    },
    badgeText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 12,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: theme.colors.textSecondary,
    },
    closeBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceHighlight,
    },
    hero: {
      flexDirection: 'row',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
      gap: spacing.md,
    },
    heroImage: {
      width: 88,
      height: 88,
      borderRadius: borderRadius.lg,
      backgroundColor: theme.colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    heroBody: {
      flex: 1,
      minWidth: 0,
      justifyContent: 'center',
      gap: 6,
    },
    serviceTitle: {
      fontFamily: fonts.bodyBold,
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
      letterSpacing: -0.3,
      lineHeight: 26,
    },
    customer: {
      fontFamily: fonts.bodyMedium,
      fontSize: 15,
      color: theme.colors.textSecondary,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: borderRadius.full,
      backgroundColor: isDark ? theme.colors.surfaceHighlight : theme.colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    chipText: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: theme.colors.text,
    },
    amount: {
      fontFamily: fonts.bodyBold,
      fontSize: 18,
      color: theme.colors.primary,
      marginTop: 4,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
      paddingTop: spacing.xs,
    },
    btn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      minHeight: 48,
      borderRadius: borderRadius.lg,
    },
    btnReject: {
      borderWidth: 1.5,
      borderColor: theme.colors.error,
      backgroundColor: theme.colors.surface,
    },
    btnRejectText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: theme.colors.error,
    },
    btnAccept: {
      backgroundColor: theme.colors.success,
      borderWidth: 0,
    },
    btnAcceptText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: theme.colors.textInverse,
    },
  });
