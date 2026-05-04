/**
 * ServiceDetailScreen.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-screen detail view for a single service.
 *
 * Route params: { serviceId, salonId, salonName }
 * Data flow: fetches the salon, extracts the service from it (reuses the cached
 * salon query so no extra API call is needed when coming from SalonDetailScreen).
 * Falls back to a direct salon fetch if cache is cold.
 *
 * Features:
 *   • Hero image (category-mapped fallback when no image_url)
 *   • Gradient overlay on hero for text legibility
 *   • Back button with safe-area awareness
 *   • Popular + offer badges
 *   • Service meta: price, duration, original price (strikethrough on offer)
 *   • Offer tagline section
 *   • Description section
 *   • Sticky "Book Now" CTA at bottom
 *   • Full dark / light mode via ThemeContext
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import api from '../../lib/api';
import { Salon, Service } from '../../types';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';
import { fonts, spacing, borderRadius, shadows, formatPrice } from '../../lib/utils';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { Button } from '../../components/Button';
import { ErrorState } from '../../components/ErrorState';
import { CustomerDiscoverScreenProps } from '../../navigation/types';

// ─── Category image resolver (mirrors ServiceCard — single source is OK here) ─

const CATEGORY_IMAGES: Array<{ keywords: string[]; url: string }> = [
  { keywords: ['hair', 'cut', 'trim', 'style', 'blow'], url: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=800' },
  { keywords: ['beard', 'shave', 'facial hair'], url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800' },
  { keywords: ['facial', 'skin', 'glow', 'face', 'clean', 'peel'], url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800' },
  { keywords: ['manicure', 'pedicure', 'nail', 'nails'], url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800' },
  { keywords: ['massage', 'spa', 'relax', 'therapy'], url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800' },
  { keywords: ['colour', 'color', 'highlight', 'bleach', 'dye'], url: 'https://images.unsplash.com/photo-1612526737988-60d35f7a1e57?w=800' },
  { keywords: ['wax', 'threading', 'eyebrow', 'brow'], url: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800' },
];

const DEFAULT_SERVICE_IMAGE = 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800';

function resolveServiceImage(service: Service): string {
  if (service.image_url) return service.image_url;
  const name = service.name.toLowerCase();
  for (const cat of CATEGORY_IMAGES) {
    if (cat.keywords.some((k) => name.includes(k))) return cat.url;
  }
  return DEFAULT_SERVICE_IMAGE;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export const ServiceDetailScreen: React.FC<CustomerDiscoverScreenProps<'ServiceDetail'>> = ({
  navigation,
  route,
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  const { serviceId, salonId, salonName } = route.params as {
    serviceId: string;
    salonId: string;
    salonName: string;
  };

  // Reuse the cached salon query — avoids a second network request if
  // SalonDetailScreen already fetched this salon.
  const { data: salon, isLoading, error, refetch } = useQuery<Salon>({
    queryKey: ['salon', salonId],
    queryFn: async () => {
      const response = await api.get(`/api/salons/${salonId}`);
      return response.data;
    },
    staleTime: 1000 * 60 * 2, // 2 min — fresh enough from SalonDetailScreen
  });

  const service: Service | undefined = salon?.services?.find((s) => s.id === serviceId);

  const imageUri = useMemo(
    () => (service ? resolveServiceImage(service) : DEFAULT_SERVICE_IMAGE),
    [service?.image_url, service?.name]
  );

  const isOnOffer =
    service?.is_on_offer === true &&
    typeof service?.discount_percentage === 'number' &&
    service.discount_percentage > 0;

  const handleBook = () => {
    navigation.navigate('Booking', { salonId, serviceId });
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <ScreenWrapper variant="stack">
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <ScreenWrapper variant="stack">
        <ErrorState
          title="Failed to load service"
          message="We couldn't retrieve the service details. Please try again."
          onRetry={refetch}
        />
      </ScreenWrapper>
    );
  }

  // ── Service not found ────────────────────────────────────────────────────
  if (!service) {
    return (
      <ScreenWrapper variant="stack">
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.textTertiary} />
          <Text style={styles.errorText}>Service not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
            <Text style={styles.backLinkText}>← Go back</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  // ── Main view (fullscreen variant — we manage edges manually for hero) ──
  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        bounces
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Image ── */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: imageUri }}
            style={styles.heroImage}
            resizeMode="cover"
          />

          {/* Gradient: bottom-heavy for readability */}
          <LinearGradient
            colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.65)']}
            start={{ x: 0, y: 0.3 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />

          {/* ── Safe-area back button ── */}
          <SafeAreaView edges={['top']} style={styles.backButtonContainer}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Ionicons name="arrow-back" size={20} color={theme.colors.white} />
            </TouchableOpacity>
          </SafeAreaView>

          {/* ── Badges row ── */}
          <View style={styles.heroBadgeRow}>
            {isOnOffer && (
              <View style={styles.offerBadge}>
                <Text style={styles.offerBadgeText}>
                  {service.discount_percentage}% OFF
                </Text>
              </View>
            )}
          </View>

          {/* ── Hero title block ── */}
          <View style={styles.heroTitleBlock}>
            <Text style={styles.heroServiceName}>{service.name}</Text>
            <Text style={styles.heroSalonName}>{salonName}</Text>
          </View>
        </View>

        {/* ── Body ── */}
        <View style={styles.body}>

          {/* ── Quick meta pills ── */}
          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <Ionicons name="cash-outline" size={15} color={theme.colors.primary} />
              <Text style={styles.metaPillText}>{formatPrice(service.price)}</Text>
            </View>
            <View style={styles.metaPill}>
              <Ionicons name="time-outline" size={15} color={theme.colors.textSecondary} />
              <Text style={[styles.metaPillText, { color: theme.colors.textSecondary }]}>
                {service.duration} min
              </Text>
            </View>
            {isOnOffer && service.original_price != null && (
              <View style={styles.metaPill}>
                <Ionicons name="pricetag-outline" size={15} color={theme.colors.textTertiary} />
                <Text style={styles.originalPriceText}>
                  {formatPrice(service.original_price)}
                </Text>
              </View>
            )}
          </View>

          {/* ── Offer tagline ── */}
          {isOnOffer && service.offer_tagline && (
            <View style={styles.offerTaglineBox}>
              <Ionicons name="sparkles-outline" size={15} color="#16a34a" />
              <Text style={styles.offerTaglineText}>{service.offer_tagline}</Text>
            </View>
          )}

          {/* ── Description ── */}
          {service.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About this service</Text>
              <Text style={styles.description}>{service.description}</Text>
            </View>
          ) : null}

          {/* ── What to expect block (always shown) ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What to expect</Text>
            <View style={styles.expectRow}>
              <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.success} />
              <Text style={styles.expectText}>Professional service by trained staff</Text>
            </View>
            <View style={styles.expectRow}>
              <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.success} />
              <Text style={styles.expectText}>Hygienic tools and workspace</Text>
            </View>
            <View style={styles.expectRow}>
              <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.success} />
              <Text style={styles.expectText}>Duration: approximately {service.duration} minutes</Text>
            </View>
          </View>

        </View>

        {/* Bottom padding for sticky CTA */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Sticky Book Now CTA ── */}
      <View style={[styles.stickyFooter, shadows.lg]}>
        <View style={styles.stickyPriceBlock}>
          {isOnOffer && service.original_price != null && (
            <Text style={styles.stickyOriginalPrice}>
              {formatPrice(service.original_price)}
            </Text>
          )}
          <Text style={styles.stickyPrice}>{formatPrice(service.price)}</Text>
        </View>
        <Button
          title="Book Now"
          onPress={handleBook}
          style={styles.bookButton}
        />
      </View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (theme: Theme, isDark: boolean) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
    },
    // Loading / error
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
    },
    errorText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 18,
      color: theme.colors.text,
    },
    backLink: {
      marginTop: spacing.sm,
    },
    backLinkText: {
      fontFamily: fonts.bodyMedium,
      fontSize: 15,
      color: theme.colors.primary,
    },
    // Hero
    heroContainer: {
      height: 340,
      position: 'relative',
    },
    heroImage: {
      width: '100%',
      height: '100%',
    },
    backButtonContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
    },
    backButton: {
      marginTop: 8,
      marginLeft: 16,
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroBadgeRow: {
      position: 'absolute',
      top: 52,
      right: spacing.lg,
      flexDirection: 'row',
      gap: spacing.xs,
    },
    offerBadge: {
      backgroundColor: 'rgba(22,163,74,0.9)',
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: borderRadius.full,
    },
    offerBadgeText: {
      fontFamily: fonts.bodyBold,
      fontSize: 11,
      color: theme.colors.white,
      letterSpacing: 0.5,
    },
    heroTitleBlock: {
      position: 'absolute',
      bottom: spacing.xl,
      left: spacing.xl,
      right: spacing.xl,
    },
    heroServiceName: {
      fontFamily: fonts.heading,
      fontSize: 30,
      color: theme.colors.white,
      letterSpacing: -0.3,
      lineHeight: 36,
    },
    heroSalonName: {
      fontFamily: fonts.bodyMedium,
      fontSize: 14,
      color: 'rgba(255,255,255,0.75)',
      marginTop: 4,
    },
    // Body
    body: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl,
      gap: spacing.xl,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    metaPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.colors.surfaceSecondary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
    },
    metaPillText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: theme.colors.primary,
    },
    originalPriceText: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: theme.colors.textTertiary,
      textDecorationLine: 'line-through',
    },
    offerTaglineBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: isDark ? '#1A2D22' : '#F0FDF4',
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: isDark ? '#2D5A3D' : '#BBF7D0',
    },
    offerTaglineText: {
      fontFamily: fonts.bodyMedium,
      fontSize: 14,
      color: isDark ? '#82E0AA' : '#15803D',
      flex: 1,
    },
    section: {
      gap: spacing.sm,
    },
    sectionTitle: {
      fontFamily: fonts.heading,
      fontSize: 20,
      color: theme.colors.text,
    },
    description: {
      fontFamily: fonts.body,
      fontSize: 15,
      color: theme.colors.textSecondary,
      lineHeight: 23,
    },
    expectRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    expectText: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: theme.colors.textSecondary,
      flex: 1,
    },
    // Sticky footer
    stickyFooter: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      paddingBottom: spacing.xxxl, // generous bottom padding for gesture bar
    },
    stickyPriceBlock: {
      gap: 2,
    },
    stickyOriginalPrice: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: theme.colors.textTertiary,
      textDecorationLine: 'line-through',
    },
    stickyPrice: {
      fontFamily: fonts.bodyBold,
      fontSize: 22,
      color: theme.colors.primary,
    },
    bookButton: {
      paddingHorizontal: spacing.xxxl,
    },
  });

export default ServiceDetailScreen;
