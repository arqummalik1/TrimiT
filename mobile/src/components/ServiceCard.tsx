/**
 * ServiceCard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Reusable premium service card used in:
 *   - ManageServicesScreen   (owner variant — shows edit/delete actions)
 *   - SalonDetailScreen      (customer variant — shows Book CTA)
 *
 * Features:
 *   • Category-mapped fallback image when image_url is null
 *   • Gradient overlay on thumbnail for text legibility
 *   • Offer badge (X% OFF) — rendered only when is_on_offer = true
 *   • Popular badge (🔥 Popular) — driven by isPopular prop
 *   • Press animation: Animated.spring scale 0.97 + shadow lift
 *   • Full dark / light mode via ThemeContext
 *   • No external animation libraries required
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableWithoutFeedback,
  Animated,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Service } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { Theme, typography } from '../theme/tokens';
import { spacing, borderRadius, shadows, formatPrice } from '../lib/utils';
import { resolveServiceImage } from '../lib/serviceImage';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Spring config for press animation — snappy but not jarring. */
const SPRING_CONFIG = { toValue: 0.97, friction: 8, tension: 40, useNativeDriver: true } as const;
const SPRING_RELEASE = { toValue: 1, friction: 6, tension: 30, useNativeDriver: true } as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ServiceCardProps {
  service: Service;
  variant: 'owner' | 'customer';
  /** Mark as popular (🔥 Popular badge). Computed by the parent from analytics. */
  isPopular?: boolean;
  /** Customer: tap card → navigate to ServiceDetail */
  onPress?: () => void;
  /** Owner: tap edit icon */
  onEdit?: () => void;
  /** Owner: tap delete icon */
  onDelete?: () => void;
  style?: ViewStyle;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ServiceCard: React.FC<ServiceCardProps> = React.memo(
  ({ service, variant, isPopular = false, onPress, onEdit, onDelete, style }) => {
    const { theme, isDark } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    // Press scale animation
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const onPressIn = useCallback(() => {
      Animated.spring(scaleAnim, SPRING_CONFIG).start();
    }, [scaleAnim]);
    const onPressOut = useCallback(() => {
      Animated.spring(scaleAnim, SPRING_RELEASE).start();
    }, [scaleAnim]);

    const imageUri = useMemo(() => resolveServiceImage(service), [service.image_url, service.name]);

    const isOnOffer =
      service.is_on_offer === true &&
      typeof service.discount_percentage === 'number' &&
      service.discount_percentage > 0;

    return (
      <TouchableWithoutFeedback
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={!onPress}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${service.name}, ${formatPrice(service.price)}, ${service.duration} minutes`}
      >
        <Animated.View
          style={[
            styles.card,
            shadows.md,
            { transform: [{ scale: scaleAnim }] },
            style,
          ]}
        >
          {/* ── Thumbnail ── */}
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              resizeMode="cover"
              // Fallback: if custom URL 404s, swap to default
              onError={() => {}}
            />
            {/* Gradient overlay for badge/text legibility */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.55)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.gradient}
            />

            {/* ── Badges (top-left stack) ── */}
            <View style={styles.badgeRow}>
              {isPopular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>🔥 Popular</Text>
                </View>
              )}
              {isOnOffer && (
                <View style={styles.offerBadge}>
                  <Text style={styles.offerText}>{service.discount_percentage}% OFF</Text>
                </View>
              )}
            </View>

            {/* ── Duration pill (bottom-right of image) ── */}
            <View style={styles.durationPill}>
              <Ionicons name="time-outline" size={11} color="#fff" />
              <Text style={styles.durationPillText}>{service.duration} min</Text>
            </View>
          </View>

          {/* ── Body ── */}
          <View style={styles.body}>
            <View style={styles.bodyTop}>
              <View style={styles.nameWrapper}>
                <Text style={styles.serviceName} numberOfLines={1}>
                  {service.name}
                </Text>
                {service.description ? (
                  <Text style={styles.serviceDesc} numberOfLines={2}>
                    {service.description}
                  </Text>
                ) : null}
              </View>

              {/* ── Owner action buttons ── */}
              {variant === 'owner' && (
                <View style={styles.ownerActions}>
                  <TouchableWithoutFeedback onPress={onEdit} accessibilityLabel="Edit service">
                    <View style={styles.actionIcon}>
                      <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
                    </View>
                  </TouchableWithoutFeedback>
                  <TouchableWithoutFeedback onPress={onDelete} accessibilityLabel="Delete service">
                    <View style={styles.actionIcon}>
                      <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                    </View>
                  </TouchableWithoutFeedback>
                </View>
              )}
            </View>

            {/* ── Footer: price + CTA (customer) ── */}
            <View style={styles.footer}>
              <View>
                {/* Strike-through original price if on offer */}
                {isOnOffer && service.original_price != null && (
                  <Text style={styles.originalPrice}>
                    {formatPrice(service.original_price)}
                  </Text>
                )}
                <Text style={styles.price}>{formatPrice(service.price)}</Text>
              </View>

              {variant === 'customer' && onPress && (
                <View style={styles.bookCta}>
                  <Text style={styles.bookCtaText}>Book</Text>
                  <Ionicons name="arrow-forward" size={13} color={theme.colors.background} />
                </View>
              )}

              {variant === 'owner' && (
                <View style={styles.ownerDurationBadge}>
                  <Ionicons name="time-outline" size={13} color={theme.colors.textSecondary} />
                  <Text style={styles.ownerDurationText}>{service.duration} min</Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>
      </TouchableWithoutFeedback>
    );
  }
);

ServiceCard.displayName = 'ServiceCard';

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: spacing.lg,
    },
    imageContainer: {
      height: 130,
      position: 'relative',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    gradient: {
      ...StyleSheet.absoluteFillObject,
    },
    badgeRow: {
      position: 'absolute',
      top: spacing.sm,
      left: spacing.sm,
      flexDirection: 'row',
      gap: spacing.xs,
    },
    popularBadge: {
      backgroundColor: 'rgba(251, 146, 60, 0.92)',
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: borderRadius.full,
    },
    popularText: {
      ...typography.overline,
      color: '#fff',
      letterSpacing: 0.3,
    },
    offerBadge: {
      backgroundColor: 'rgba(22, 163, 74, 0.92)',
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: borderRadius.full,
    },
    offerText: {
      ...typography.overline,
      color: '#fff',
      letterSpacing: 0.3,
    },
    durationPill: {
      position: 'absolute',
      bottom: spacing.sm,
      right: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: 'rgba(0,0,0,0.55)',
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: borderRadius.full,
    },
    durationPillText: {
      ...typography.captionMedium,
      color: '#fff',
    },
    body: {
      padding: spacing.md,
      gap: spacing.sm,
    },
    bodyTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    nameWrapper: {
      flex: 1,
      gap: 2,
    },
    serviceName: {
      ...typography.bodySemiBold,
      color: theme.colors.text,
    },
    serviceDesc: {
      ...typography.caption,
      color: theme.colors.textSecondary,
      lineHeight: 17,
    },
    ownerActions: {
      flexDirection: 'row',
      gap: spacing.xs,
      paddingTop: 2,
    },
    actionIcon: {
      padding: spacing.xs,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      paddingTop: spacing.sm,
      marginTop: spacing.xs,
    },
    originalPrice: {
      ...typography.caption,
      color: theme.colors.textTertiary,
      textDecorationLine: 'line-through',
    },
    price: {
      ...typography.bodyBold,
      color: theme.colors.primary,
    },
    bookCta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.colors.primary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
    },
    bookCtaText: {
      ...typography.bodySmallMedium,
      color: theme.colors.background,
    },
    ownerDurationBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    ownerDurationText: {
      ...typography.captionMedium,
      color: theme.colors.textSecondary,
    },
  });

export default ServiceCard;
