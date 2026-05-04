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
import { Theme } from '../theme/tokens';
import { fonts, spacing, borderRadius, shadows, formatPrice } from '../lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Spring config for press animation — snappy but not jarring. */
const SPRING_CONFIG = { toValue: 0.97, friction: 8, tension: 40, useNativeDriver: true } as const;
const SPRING_RELEASE = { toValue: 1, friction: 6, tension: 30, useNativeDriver: true } as const;

/** Category keyword → curated Unsplash photo. Covers the most common salon services. */
const CATEGORY_IMAGES: Array<{ keywords: string[]; url: string }> = [
  { keywords: ['hair', 'cut', 'trim', 'style', 'blow'], url: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600' },
  { keywords: ['beard', 'shave', 'facial hair'], url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600' },
  { keywords: ['facial', 'skin', 'glow', 'face', 'clean', 'peel'], url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600' },
  { keywords: ['manicure', 'pedicure', 'nail', 'nails'], url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600' },
  { keywords: ['massage', 'spa', 'relax', 'therapy'], url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600' },
  { keywords: ['colour', 'color', 'highlight', 'bleach', 'dye'], url: 'https://images.unsplash.com/photo-1612526737988-60d35f7a1e57?w=600' },
  { keywords: ['wax', 'threading', 'eyebrow', 'brow'], url: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600' },
];

const DEFAULT_SERVICE_IMAGE = 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600';

function resolveServiceImage(service: Service): string {
  if (service.image_url) return service.image_url;
  const name = service.name.toLowerCase();
  for (const cat of CATEGORY_IMAGES) {
    if (cat.keywords.some((k) => name.includes(k))) return cat.url;
  }
  return DEFAULT_SERVICE_IMAGE;
}

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
      borderRadius: borderRadius.xl,
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
      fontFamily: fonts.bodyBold,
      fontSize: 10,
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
      fontFamily: fonts.bodyBold,
      fontSize: 10,
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
      fontFamily: fonts.bodyMedium,
      fontSize: 10,
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
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: theme.colors.text,
    },
    serviceDesc: {
      fontFamily: fonts.body,
      fontSize: 12,
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
      fontFamily: fonts.body,
      fontSize: 11,
      color: theme.colors.textTertiary,
      textDecorationLine: 'line-through',
    },
    price: {
      fontFamily: fonts.bodyBold,
      fontSize: 16,
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
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: theme.colors.background,
    },
    ownerDurationBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    ownerDurationText: {
      fontFamily: fonts.bodyMedium,
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
  });

export default ServiceCard;
