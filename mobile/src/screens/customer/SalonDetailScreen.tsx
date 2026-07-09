import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import MapView, { Marker } from 'react-native-maps';
import api from '../../lib/api';
import { Salon, Service } from '../../types';
import { fonts, spacing, borderRadius, formatDate } from '../../lib/utils';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';

import { Button } from '../../components/Button';
import { ServiceCard } from '../../components/ServiceCard';
import ImageCarousel from '../../components/ImageCarousel';
import { getSalonMapPinColor } from '../../lib/mapMarkers';
import { openNativeDirections } from '../../lib/maps';
import { getMapThemeKey, getThemedMapViewProps } from '../../lib/mapStyles';

import { analytics } from '../../lib/analytics';
import { handleApiError } from '../../lib/errorHandler';
import { isAppError } from '../../types/error';
import { CustomerDiscoverScreenProps } from '../../navigation/types';
import { SalonDetailParamsSchema } from '../../navigation/params';
import { normalizeSalon } from '../../lib/salonImage';
import { groupServicesByCategory } from '../../lib/serviceCategories';
import {
  filterServicesForMenuAudience,
  salonNeedsMenuAudienceChips,
  MENU_AUDIENCE_OPTIONS,
  MenuAudienceFilter,
} from '../../lib/genderServe';
import { FilterChipRow } from '../../components/FilterChipRow';
import { ENABLE_SUBSCRIPTION_ENFORCEMENT } from '../../lib/featureFlags';
import { showToast } from '../../store/toastStore';
import { SalonDescription } from '../../components/SalonDescription';

/** Mini map height — 20% smaller than original 180px */
const MINI_MAP_HEIGHT = 144;

type Props = CustomerDiscoverScreenProps<'SalonDetail'>;

export const SalonDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme, isDark } = useTheme();
  const themedMapProps = useMemo(() => getThemedMapViewProps(isDark), [isDark]);
  const mapThemeKey = useMemo(() => getMapThemeKey(isDark), [isDark]);
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  // Validate params
  const validation = SalonDetailParamsSchema.safeParse(route.params);
  if (!validation.success) {
    console.error('[SalonDetailScreen] Invalid params:', validation.error);
    return (
      <ScreenWrapper variant="stack">
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
          <Text style={{ marginTop: 16, textAlign: 'center', color: theme.colors.text }}>Invalid salon ID.</Text>
          <Button title="Go Back" onPress={() => navigation.goBack()} style={{ marginTop: 24 }} />
        </View>
      </ScreenWrapper>
    );
  }
  
  const { salonId } = validation.data;

  const { data: salon, isLoading, error } = useQuery<Salon>({
    queryKey: ['salon', salonId],
    queryFn: async () => {
      try {
        const response = await api.get(`/salons/${salonId}`);
        // Track salon view
        analytics.track('salon_viewed', {
          salon_id: salonId,
          salon_name: response.data?.name
        });
        
        return normalizeSalon(response.data as Salon);
      } catch (err) {
        const appErr = isAppError(err) ? err : handleApiError(err);
        throw err;
      }
    },
  });

  const notBookable =
    ENABLE_SUBSCRIPTION_ENFORCEMENT && salon?.subscription_active === false;

  const [menuAudience, setMenuAudience] = useState<MenuAudienceFilter>('all');
  const showMenuAudienceChips = salonNeedsMenuAudienceChips(salon?.gender_serve);

  const serviceSections = useMemo(() => {
    const filtered = filterServicesForMenuAudience(
      salon?.services ?? [],
      salon?.gender_serve,
      showMenuAudienceChips ? menuAudience : 'all',
    );
    return groupServicesByCategory(filtered, salon?.service_categories ?? []);
  }, [salon?.services, salon?.service_categories, salon?.gender_serve, menuAudience, showMenuAudienceChips]);

  const handleViewService = (service: Service) => {
    // Viewing is always allowed — even for a frozen salon, customers can browse
    // the full service menu. Only booking is blocked.
    navigation.navigate('ServiceDetail', {
      serviceId: service.id,
      salonId,
      salonName: salon?.name ?? '',
    });
  };

  const handleBookService = (service: Service) => {
    if (notBookable) {
      showToast("This salon isn't taking bookings right now.", 'info');
      return;
    }
    navigation.navigate('Booking', { salonId, serviceId: service.id });
  };

  const handleCall = () => {
    if (salon?.phone) {
      Linking.openURL(`tel:${salon.phone}`);
    }
  };

  const handleDirections = () => {
    if (!salon?.latitude || !salon?.longitude) return;
    openNativeDirections(
      { latitude: salon.latitude, longitude: salon.longitude },
      salon.name
    );
  };

  if (isLoading) {
    return (
      <ScreenWrapper variant="stack">
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenWrapper>
    );
  }

  if (error || !salon) {
    return (
      <ScreenWrapper variant="stack">
        <Ionicons name="alert-circle" size={64} color={theme.colors.border} />
        <Text style={styles.errorTitle}>Salon Not Found</Text>
        <Button title="Go Back" onPress={() => navigation.goBack()} variant="outline" />
      </ScreenWrapper>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Image Carousel */}
        <View style={styles.heroContainer}>
          <ImageCarousel salon={salon} height={320} />

          {/* Header chrome — back + call */}
          <SafeAreaView style={styles.headerButtons}>
            <View style={styles.headerButtonRow}>
              <TouchableOpacity
                style={styles.headerIconButton}
                onPress={() => navigation.goBack()}
                accessibilityLabel="Go back"
                accessibilityRole="button"
              >
                <Ionicons name="arrow-back" size={22} color={theme.colors.white} />
              </TouchableOpacity>
              {salon.phone ? (
                <TouchableOpacity
                  style={styles.headerIconButton}
                  onPress={handleCall}
                  accessibilityLabel="Call salon"
                  accessibilityRole="button"
                  hitSlop={8}
                >
                  <Ionicons name="call" size={20} color={theme.colors.white} />
                </TouchableOpacity>
              ) : (
                <View style={styles.headerIconButtonSpacer} />
              )}
            </View>
          </SafeAreaView>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.salonHeader}>
            {(salon.avg_rating ?? 0) > 0 && (
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={14} color={theme.colors.textInverse} />
                <Text style={styles.ratingText}>{salon.avg_rating}</Text>
                <Text style={styles.reviewCount}>({salon.review_count} reviews)</Text>
              </View>
            )}
            <Text style={styles.salonName}>{salon.name}</Text>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={15} color={theme.colors.textSecondary} />
              <Text style={styles.infoText}>{salon.address}, {salon.city}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={15} color={theme.colors.textSecondary} />
              <Text style={styles.infoText}>{salon.opening_time} - {salon.closing_time}</Text>
            </View>
          </View>

          {/* Subscription-frozen notice (Phase 2): salon is viewable, not bookable */}
          {notBookable && (
            <View style={styles.unavailableBanner}>
              <Ionicons name="lock-closed" size={20} color={theme.colors.error} />
              <Text style={styles.unavailableBannerText}>
                This salon isn&apos;t accepting bookings right now. You can still browse
                its services — please check back later to book.
              </Text>
            </View>
          )}

          {/* Mini map */}
          {salon.latitude && salon.longitude ? (
            <TouchableOpacity
              style={styles.miniMapContainer}
              onPress={handleDirections}
              activeOpacity={0.9}
            >
              <MapView
                key={mapThemeKey}
                style={styles.miniMap}
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
                userInterfaceStyle={themedMapProps.userInterfaceStyle}
                customMapStyle={themedMapProps.customMapStyle}
                initialRegion={{
                  latitude: salon.latitude,
                  longitude: salon.longitude,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }}
              >
                <Marker
                  coordinate={{
                    latitude: salon.latitude,
                    longitude: salon.longitude,
                  }}
                  pinColor={getSalonMapPinColor(theme)}
                />
              </MapView>

              {/* Get Directions overlay */}
              <View style={styles.directionsOverlay}>
                <View style={styles.directionsOverlayPill}>
                  <Ionicons name="navigate" size={14} color={theme.colors.primary} />
                  <Text style={styles.directionsOverlayText}>Get Directions</Text>
                </View>
              </View>
            </TouchableOpacity>
          ) : null}

          {/* Description */}
          {salon.description ? (
            <View style={styles.descriptionBlock}>
              <SalonDescription text={salon.description} />
            </View>
          ) : null}

          {/* Services */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Services</Text>
            {showMenuAudienceChips && (
              <View style={styles.menuChips}>
                <FilterChipRow
                  options={MENU_AUDIENCE_OPTIONS}
                  value={menuAudience}
                  onChange={setMenuAudience}
                  testIDPrefix="menu-audience"
                />
              </View>
            )}

            {serviceSections.length > 0 ? (
              serviceSections.map((section) => (
                <View key={section.categoryId ?? section.title}>
                  <Text style={styles.categoryHeading}>{section.title}</Text>
                  {section.data.map((service) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      variant="customer"
                      onPress={() => handleViewService(service)}
                    />
                  ))}
                </View>
              ))
            ) : (
              <View style={styles.emptyServices}>
                <Ionicons name="cut-outline" size={40} color={theme.colors.border} />
                <Text style={styles.emptyText}>No services available</Text>
              </View>
            )}
          </View>

          {/* Reviews */}
          {salon.reviews && salon.reviews.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reviews</Text>
              {salon.reviews.map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewUser}>
                      <View style={styles.avatar}>
                        <Ionicons name="person" size={16} color={theme.colors.textSecondary} />
                      </View>
                      <Text style={styles.reviewerName}>{review.users?.name || 'Anonymous'}</Text>
                    </View>
                    <View style={styles.stars}>
                      {[...Array(5)].map((_, i) => (
                        <Ionicons
                          key={i}
                          name={i < review.rating ? 'star' : 'star-outline'}
                          size={14}
                          color={i < review.rating ? '#FBBF24' : theme.colors.border}
                        />
                      ))}
                    </View>
                  </View>
                  {review.comment && (
                    <Text style={styles.reviewComment}>{review.comment}</Text>
                  )}
                  <Text style={styles.reviewDate}>{formatDate(review.created_at)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  unavailableBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.error + '14',
    borderWidth: 1,
    borderColor: theme.colors.error + '55',
    borderRadius: borderRadius.md,
    padding: 14,
    marginBottom: spacing.lg,
  },
  unavailableBannerText: {
    flex: 1,
    color: theme.colors.error,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: theme.colors.background,
    gap: 16,
  },
  errorTitle: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: theme.colors.text,
  },
  heroContainer: {
    height: 320,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  headerButtons: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIconButton: {
    width: 44,
    height: 44,
    backgroundColor: theme.colors.overlay,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconButtonSpacer: {
    width: 44,
    height: 44,
  },
  salonHeader: {
    marginBottom: spacing.lg,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
    marginBottom: 12,
    gap: 4,
  },
  ratingText: {
    fontFamily: fonts.bodyBold,
    color: theme.colors.textInverse,
    fontSize: 14,
  },
  reviewCount: {
    fontFamily: fonts.body,
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  salonName: {
    fontFamily: fonts.heading,
    fontSize: theme.typography.tabTitle.fontSize,
    lineHeight: theme.typography.tabTitle.lineHeight,
    letterSpacing: theme.typography.tabTitle.letterSpacing,
    color: theme.colors.text,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  infoText: {
    flex: 1,
    fontFamily: fonts.body,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  content: {
    padding: 24,
    paddingTop: 20,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    marginTop: -20,
  },
  miniMapContainer: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    position: 'relative',
  },
  miniMap: {
    height: MINI_MAP_HEIGHT,
    width: '100%',
  },
  directionsOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  directionsOverlayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  directionsOverlayText: {
    fontFamily: fonts.bodyBold,
    color: theme.colors.primary,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 32,
  },
  descriptionBlock: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 26,
    color: theme.colors.text,
    marginBottom: 20,
  },
  categoryHeading: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 8,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  menuChips: {
    marginBottom: spacing.md,
  },
  emptyServices: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontFamily: fonts.body,
    marginTop: 12,
    color: theme.colors.textTertiary,
  },
  reviewCard: {
    backgroundColor: theme.colors.surface,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reviewUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  reviewerName: {
    fontFamily: fonts.bodySemiBold,
    color: theme.colors.text,
    fontSize: 15,
  },
  stars: {
    flexDirection: 'row',
    gap: 3,
  },
  reviewComment: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  reviewDate: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
});

export const createSalonDetailStyles = createStyles;

export default SalonDetailScreen;
