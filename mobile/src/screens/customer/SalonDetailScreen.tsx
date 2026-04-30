import React, { useMemo } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import MapView from 'react-native-maps';
import api from '../../lib/api';
import { Salon, Service } from '../../types';
import { fonts, spacing, borderRadius, formatPrice, formatDate } from '../../lib/utils';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';

import { Button } from '../../components/Button';
import ImageCarousel from '../../components/ImageCarousel';
import { SalonMapMarker } from '../../components/SalonMapMarker';
import { openNativeDirections } from '../../lib/maps';

interface SalonDetailScreenProps {
  navigation: any;
  route: any;
}

export const SalonDetailScreen: React.FC<SalonDetailScreenProps> = ({ navigation, route }) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { salonId } = route.params;

  const { data: salon, isLoading, error } = useQuery<Salon>({
    queryKey: ['salon', salonId],
    queryFn: async () => {
      const response = await api.get(`/api/salons/${salonId}`);
      return response.data;
    },
  });

  const handleBookService = (service: Service) => {
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
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  if (error || !salon) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color={theme.colors.border} />
        <Text style={styles.errorTitle}>Salon Not Found</Text>
        <Button title="Go Back" onPress={() => navigation.goBack()} variant="outline" />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Image Carousel */}
        <View style={styles.heroContainer}>
          <ImageCarousel images={salon.images || []} height={320} />
          <View style={styles.heroOverlay} pointerEvents="box-none" />
          
          {/* Back Button */}
          <SafeAreaView style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </SafeAreaView>

          {/* Salon Info */}
          <View style={styles.heroContent}>
            {(salon.avg_rating ?? 0) > 0 && (
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={14} color="#FFFFFF" />
                <Text style={styles.ratingText}>{salon.avg_rating}</Text>
                <Text style={styles.reviewCount}>({salon.review_count} reviews)</Text>
              </View>
            )}
            <Text style={styles.salonName}>{salon.name}</Text>
            <View style={styles.infoRow}>
              <Ionicons name="location" size={16} color="#E7E5E4" />
              <Text style={styles.infoText}>{salon.address}, {salon.city}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time" size={16} color="#E7E5E4" />
              <Text style={styles.infoText}>{salon.opening_time} - {salon.closing_time}</Text>
            </View>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.callButton} onPress={handleCall}>
              <Ionicons name="call" size={20} color={theme.colors.primary} />
              <Text style={styles.callText}>Call</Text>
            </TouchableOpacity>
            {salon.latitude && salon.longitude ? (
              <TouchableOpacity style={styles.directionsButton} onPress={handleDirections}>
                <Ionicons name="navigate" size={20} color={theme.colors.secondary} />
                <Text style={styles.directionsText}>Directions</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Mini Map with branded marker */}
          {salon.latitude && salon.longitude ? (
            <TouchableOpacity
              style={styles.miniMapContainer}
              onPress={handleDirections}
              activeOpacity={0.9}
            >
              <MapView
                style={styles.miniMap}
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
                userInterfaceStyle={isDark ? 'dark' : 'light'}
                initialRegion={{
                  latitude: salon.latitude,
                  longitude: salon.longitude,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }}
              >
                <SalonMapMarker
                  coordinate={{
                    latitude: salon.latitude,
                    longitude: salon.longitude,
                  }}
                  label={salon.name}
                  trackViewChanges={false}
                />
              </MapView>

              {/* Get Directions overlay */}
              <View style={styles.directionsOverlay}>
                <View style={styles.directionsOverlayPill}>
                  <Ionicons name="navigate" size={14} color="#FFFFFF" />
                  <Text style={styles.directionsOverlayText}>Get Directions</Text>
                </View>
              </View>
            </TouchableOpacity>
          ) : null}

          {/* Description */}
          {salon.description && (
            <View style={styles.section}>
              <Text style={styles.description}>{salon.description}</Text>
            </View>
          )}

          {/* Services */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Services</Text>
            
            {salon.services && salon.services.length > 0 ? (
              salon.services.map((service) => (
                <View key={service.id} style={styles.serviceCard}>
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>{service.name}</Text>
                    {service.description && (
                      <Text style={styles.serviceDescription}>{service.description}</Text>
                    )}
                    <View style={styles.serviceDetails}>
                      <View style={styles.detailItem}>
                        <Ionicons name="time-outline" size={14} color={theme.colors.textSecondary} />
                        <Text style={styles.detailText}>{service.duration} mins</Text>
                      </View>
                      <Text style={styles.servicePrice}>{formatPrice(service.price)}</Text>
                    </View>
                  </View>
                  <Button
                    title="Book"
                    onPress={() => handleBookService(service)}
                    size="sm"
                  />
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
    height: 380,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18, 20, 17, 0.4)',
  },
  headerButtons: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(18, 20, 17, 0.6)',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(241, 209, 141, 0.2)',
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: 'rgba(18, 20, 17, 0.7)',
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
    color: 'rgba(18, 20, 17, 0.7)',
    fontSize: 12,
  },
  salonName: {
    fontFamily: fonts.heading,
    fontSize: 34,
    color: '#FFFFFF',
    marginBottom: 8,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  infoText: {
    fontFamily: fonts.body,
    color: '#E7E5E4',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  content: {
    padding: 24,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -32,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: 32,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: borderRadius.pill,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  callText: {
    fontFamily: fonts.bodySemiBold,
    color: theme.colors.text,
    fontSize: 15,
  },
  directionsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderRadius: borderRadius.pill,
    gap: 8,
  },
  directionsText: {
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    fontSize: 15,
  },
  miniMapContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 32,
    position: 'relative',
  },
  miniMap: {
    height: 180,
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
  description: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 24,
    letterSpacing: 0.3,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 26,
    color: theme.colors.text,
    marginBottom: 20,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  serviceInfo: {
    flex: 1,
    marginRight: 12,
  },
  serviceName: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 6,
  },
  serviceDescription: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  serviceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: theme.colors.textTertiary,
  },
  servicePrice: {
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    color: theme.colors.primary,
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

export default SalonDetailScreen;
