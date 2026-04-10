import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import MapView, { Marker } from 'react-native-maps';
import api from '../../lib/api';
import { Salon, Service } from '../../types';
import { colors, formatPrice, formatDate } from '../../lib/utils';
import { spacing, borderRadius } from '../../theme';
import { Button } from '../../components/Button';
import ImageCarousel from '../../components/ImageCarousel';

interface SalonDetailScreenProps {
  navigation: any;
  route: any;
}

export const SalonDetailScreen: React.FC<SalonDetailScreenProps> = ({ navigation, route }) => {
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
    const lat = salon.latitude;
    const lng = salon.longitude;
    const label = encodeURIComponent(salon.name);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}(${label})`,
    });
    if (url) Linking.openURL(url);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (error || !salon) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color={colors.border} />
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
              <Ionicons name="arrow-back" size={24} color={colors.text} />
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
              <Ionicons name="call" size={20} color={colors.primary} />
              <Text style={styles.callText}>Call</Text>
            </TouchableOpacity>
            {salon.latitude && salon.longitude ? (
              <TouchableOpacity style={styles.directionsButton} onPress={handleDirections}>
                <Ionicons name="navigate" size={20} color={colors.secondary} />
                <Text style={styles.directionsText}>Directions</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Mini Map */}
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
                  pinColor={colors.primary}
                />
              </MapView>
              <View style={styles.miniMapLabel}>
                <Ionicons name="navigate-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.miniMapText}>Tap to open in Maps</Text>
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
                        <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
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
                <Ionicons name="cut-outline" size={40} color={colors.border} />
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
                        <Ionicons name="person" size={16} color={colors.textSecondary} />
                      </View>
                      <Text style={styles.reviewerName}>{review.users?.name || 'Anonymous'}</Text>
                    </View>
                    <View style={styles.stars}>
                      {[...Array(5)].map((_, i) => (
                        <Ionicons
                          key={i}
                          name={i < review.rating ? 'star' : 'star-outline'}
                          size={14}
                          color={i < review.rating ? '#FBBF24' : colors.border}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
    gap: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  heroContainer: {
    height: 320,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
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
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
    gap: 4,
  },
  ratingText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  reviewCount: {
    color: '#D1FAE5',
    fontSize: 12,
  },
  salonName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  infoText: {
    color: '#E7E5E4',
    fontSize: 14,
  },
  content: {
    padding: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    padding: 14,
    borderRadius: borderRadius.md,
    gap: 8,
  },
  callText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  directionsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondaryLight,
    padding: 14,
    borderRadius: borderRadius.md,
    gap: 8,
  },
  directionsText: {
    color: colors.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  miniMapContainer: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  miniMap: {
    height: 150,
    width: '100%',
  },
  miniMapLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  miniMapText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: 24,
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  serviceInfo: {
    flex: 1,
    marginRight: 12,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  serviceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  emptyServices: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.surface,
    borderRadius: 16,
  },
  emptyText: {
    marginTop: 12,
    color: colors.textSecondary,
  },
  reviewCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reviewUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewerName: {
    fontWeight: '600',
    color: colors.text,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});

export default SalonDetailScreen;
