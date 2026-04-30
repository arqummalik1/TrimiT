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
import { colors, spacing, borderRadius, typography, fonts } from '../../lib/utils';


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

  // Fetch salons near the location (refetches only when location changes)
  const { data: allSalons, isLoading, refetch, isRefetching } = useQuery<Salon[]>({
    queryKey: ['salons', location],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (location) {
        params.append('lat', location.lat.toString());
        params.append('lng', location.lng.toString());
        params.append('radius', '50');
      }
      const response = await api.get(`/api/salons?${params.toString()}`);
      return response.data;
    },
  });

  // FAST LOCAL SEARCH: Filter the salons list locally as the user types
  const filteredSalons = React.useMemo(() => {
    if (!allSalons) return [];
    if (!searchQuery) return allSalons;
    
    const query = searchQuery.toLowerCase().trim();
    return allSalons.filter(salon => 
      salon.name.toLowerCase().includes(query) || 
      salon.address.toLowerCase().includes(query) ||
      salon.description?.toLowerCase().includes(query)
    );
  }, [allSalons, searchQuery]);

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
          {filteredSalons.map((salon) =>
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
          data={filteredSalons}
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
    fontFamily: fonts.heading,
    fontSize: 34,
    color: colors.text,
    marginBottom: 4,
    fontWeight: '700',
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.pill,
    padding: 4,
  },
  toggleBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.pill,
  },
  toggleBtnActive: {
    backgroundColor: colors.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
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
