import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';
import MapView, { Marker, Callout } from 'react-native-maps';
import api from '../../lib/api';
import { SalonCard } from '../../components/SalonCard';
import { Salon } from '../../types';
import { colors, spacing, borderRadius, typography } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DiscoverScreenProps {
  navigation: any;
}

export const DiscoverScreen: React.FC<DiscoverScreenProps> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied');
        return;
      }

      try {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        });
      } catch (error) {
        setLocationError('Unable to get location');
      }
    })();
  }, []);

  const { data: salons, isLoading, refetch, isRefetching } = useQuery<Salon[]>({
    queryKey: ['salons', searchQuery, location],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (location) {
        params.append('lat', location.lat.toString());
        params.append('lng', location.lng.toString());
        params.append('radius', '50');
      }
      const response = await api.get(`/api/salons?${params.toString()}`);
      return response.data;
    },
  });

  const handleSalonPress = (salon: Salon) => {
    navigation.navigate('SalonDetail', { salonId: salon.id });
  };

  const mapRegion = location
    ? {
        latitude: location.lat,
        longitude: location.lng,
        latitudeDelta: 0.15,
        longitudeDelta: 0.15,
      }
    : {
        latitude: 28.6139,
        longitude: 77.209,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Find Your Perfect Salon</Text>
            <Text style={styles.subtitle}>
              {location
                ? 'Showing salons near you'
                : locationError || 'Enable location for nearby salons'}
            </Text>
          </View>
          {/* View Mode Toggle */}
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
              onPress={() => setViewMode('list')}
            >
              <Ionicons
                name="list"
                size={18}
                color={viewMode === 'list' ? colors.white : colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
              onPress={() => setViewMode('map')}
            >
              <Ionicons
                name="map"
                size={18}
                color={viewMode === 'map' ? colors.white : colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search salons..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : viewMode === 'map' ? (
        /* Map View */
        <MapView style={styles.map} initialRegion={mapRegion} showsUserLocation>
          {(salons || []).map((salon) =>
            salon.latitude && salon.longitude ? (
              <Marker
                key={salon.id}
                coordinate={{
                  latitude: salon.latitude,
                  longitude: salon.longitude,
                }}
                pinColor={colors.primary}
              >
                <Callout onPress={() => handleSalonPress(salon)}>
                  <View style={styles.callout}>
                    <Text style={styles.calloutTitle}>{salon.name}</Text>
                    <Text style={styles.calloutText}>{salon.address}</Text>
                    {salon.avg_rating ? (
                      <Text style={styles.calloutRating}>
                        {salon.avg_rating.toFixed(1)} ({salon.review_count} reviews)
                      </Text>
                    ) : null}
                  </View>
                </Callout>
              </Marker>
            ) : null
          )}
        </MapView>
      ) : (
        /* List View */
        <FlatList
          data={salons}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SalonCard salon={item} onPress={() => handleSalonPress(item)} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="location-outline" size={64} color={colors.border} />
              <Text style={styles.emptyTitle}>No Salons Found</Text>
              <Text style={styles.emptyText}>
                Try adjusting your search or check back later
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  toggleBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  toggleBtnActive: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: spacing.xl,
  },
  // Map styles
  map: {
    flex: 1,
  },
  callout: {
    padding: spacing.sm,
    minWidth: 160,
    maxWidth: 220,
  },
  calloutTitle: {
    ...typography.bodySmallMedium,
    color: colors.text,
    marginBottom: 2,
  },
  calloutText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  calloutRating: {
    ...typography.captionMedium,
    color: colors.secondary,
    marginTop: 4,
  },
  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default DiscoverScreen;
