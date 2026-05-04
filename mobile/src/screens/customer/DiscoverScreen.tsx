/**
 * DiscoverScreen.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Customer salon discovery screen with:
 *   • Shimmer skeleton loading (SalonListSkeleton) with 500ms minimum display
 *   • Typed ErrorState with retry for API failures
 *   • EmptyState for zero results
 *   • Offline guard: disables search API trigger when offline
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWrapper, TAB_BAR_BASE_HEIGHT } from '../../components/ScreenWrapper';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useInfiniteQuery } from '@tanstack/react-query';
import MapView, { Marker, Callout } from 'react-native-maps';
import ClusteredMapView from 'react-native-map-clustering';
import { CustomerDiscoverScreenProps } from '../../navigation/types';
import api from '../../lib/api';
import { SalonCard } from '../../components/SalonCard';
import { SalonListSkeleton } from '../../components/skeletons/SalonListSkeleton';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { handleApiError } from '../../lib/errorHandler';
import { useMinLoadingTime } from '../../hooks/useMinLoadingTime';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { showToast } from '../../store/toastStore';
import { Salon } from '../../types';
import { spacing, borderRadius, typography, fonts } from '../../lib/utils';
import { PermissionPrimer } from '../../components/PermissionPrimer';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type DiscoverScreenProps = CustomerDiscoverScreenProps<'DiscoverMain'>;

export const DiscoverScreen: React.FC<DiscoverScreenProps> = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [showLocationPrimer, setShowLocationPrimer] = useState(false);

  const { isOnline } = useNetworkStatus();
  const mapRef = React.useRef<MapView>(null);

  // Check if we already have permission before showing primer
  const checkLocationPermission = async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === 'undetermined') {
      setShowLocationPrimer(true);
    } else if (status === 'granted') {
      acquireLocation();
    } else {
      setLocationError('Location permission denied');
    }
  };

  const acquireLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied');
        return;
      }
      
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setLocation(coords);
      
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: coords.lat,
          longitude: coords.lng,
          latitudeDelta: 0.15,
          longitudeDelta: 0.15,
        }, 1000);
      }
    } catch (err) {
      setLocationError('Unable to get location');
    }
  };

  useEffect(() => {
    checkLocationPermission();
  }, []);

  // Salon fetch with pagination
  const {
    data: salonPages,
    isLoading,
    isError,
    error: rawError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['salons', location],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const params = new URLSearchParams();
      if (location) {
        params.append('lat', location.lat.toString());
        params.append('lng', location.lng.toString());
        params.append('radius', '50');
      }
      params.append('limit', '20');
      params.append('offset', pageParam.toString());
      
      const response = await api.get(`/api/salons?${params.toString()}`);
      return response.data; // Now returns { data: Salon[], pagination: { ... } }
    },
    getNextPageParam: (lastPage) => {
      const { data, pagination } = lastPage;
      if (pagination.has_more) {
        return pagination.offset + pagination.limit;
      }
      return undefined;
    },
    retry: (failureCount, err: unknown) => {
      const appErr = handleApiError(err);
      if (appErr.kind === 'unauthorized' || appErr.kind === 'validation') return false;
      return failureCount < 2;
    },
  });

  // Flatten all pages into a single array for filtering/display
  const allSalons = useMemo(() => {
    return salonPages?.pages.flatMap((page) => page.data) ?? [];
  }, [salonPages]);

  // Enforce minimum 500ms skeleton display
  const showSkeleton = useMinLoadingTime(isLoading);

  // Local search filter (across all loaded salons)
  const filteredSalons = React.useMemo(() => {
    if (!allSalons) return [];
    if (!searchQuery) return allSalons;
    const query = searchQuery.toLowerCase().trim();
    return allSalons.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.address.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query)
    );
  }, [allSalons, searchQuery]);

  const handleSalonPress = (salon: Salon) => {
    navigation.navigate('SalonDetail', { salonId: salon.id });
  };

  const handleOfflineTap = () => {
    if (!isOnline) {
      showToast('No internet connection. Connect to search salons.', 'warning');
    }
  };

  const mapRegion = location
    ? { latitude: location.lat, longitude: location.lng, latitudeDelta: 0.15, longitudeDelta: 0.15 }
    : { latitude: 28.6139, longitude: 77.209, latitudeDelta: 0.5, longitudeDelta: 0.5 };

  // ── Error state ────────────────────────────────────────────────────────────
  if (isError && !showSkeleton) {
    const appErr = handleApiError(rawError);
    return (
      <ScreenWrapper variant="tab">
        <View style={styles.header}>
          <Text style={styles.title}>Find Your Perfect Salon</Text>
        </View>
        <ErrorState
          title="Couldn't load salons"
          message={appErr.message}
          onRetry={refetch}
          kind={appErr.kind}
        />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper variant="tab">
      {/* Permission Primer */}
      <PermissionPrimer
        isVisible={showLocationPrimer}
        title="Find Salons Near You"
        message="TrimiT uses your location to show the closest salons, estimated travel times, and accurate distance."
        icon="location"
        onAllow={() => {
          setShowLocationPrimer(false);
          acquireLocation();
        }}
        onDeny={() => {
          setShowLocationPrimer(false);
          setLocationError('Location permission denied');
        }}
      />

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
          <View 
            style={styles.viewToggle}
            accessibilityRole="tablist"
            accessibilityLabel="View mode toggle"
          >
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
              onPress={() => setViewMode('list')}
              accessibilityRole="tab"
              accessibilityLabel="List view"
              accessibilityState={{ selected: viewMode === 'list' }}
            >
              <Ionicons
                name="list"
                size={18}
                color={viewMode === 'list' ? theme.colors.textInverse : theme.colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
              onPress={() => setViewMode('map')}
              accessibilityRole="tab"
              accessibilityLabel="Map view"
              accessibilityState={{ selected: viewMode === 'map' }}
            >
              <Ionicons
                name="map"
                size={18}
                color={viewMode === 'map' ? theme.colors.textInverse : theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar — disabled touch overlay when offline */}
        <TouchableOpacity
          activeOpacity={isOnline ? 1 : 0.6}
          onPress={handleOfflineTap}
          disabled={isOnline}
          accessibilityLabel={isOnline ? "Search salons" : "Search unavailable - offline"}
          accessibilityHint="Type to filter salons by name or address"
        >
          <View style={[styles.searchContainer, !isOnline && styles.searchContainerDisabled]}>
            <Ionicons
              name={isOnline ? 'search' : 'cloud-offline-outline'}
              size={20}
              color={isOnline ? theme.colors.textSecondary : theme.colors.warning}
            />
            <TextInput
              style={styles.searchInput}
              placeholder={isOnline ? 'Search salons...' : 'No internet connection'}
              placeholderTextColor={isOnline ? theme.colors.textSecondary : theme.colors.warning}
              value={searchQuery}
              onChangeText={setSearchQuery}
              editable={isOnline}
              accessibilityRole="search"
            />
            {searchQuery.length > 0 && isOnline && (
              <TouchableOpacity 
                onPress={() => setSearchQuery('')}
                accessibilityLabel="Clear search"
                accessibilityRole="button"
              >
                <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {showSkeleton ? (
        <SalonListSkeleton />
      ) : viewMode === 'map' ? (
        <ClusteredMapView
          ref={mapRef}
          style={styles.map} 
          region={mapRegion} 
          showsUserLocation
          showsMyLocationButton
          userInterfaceStyle={isDark ? 'dark' : 'light'}
          accessibilityLabel="Salon map"
          radius={40}
          clusterColor={theme.colors.primary}
          clusterTextColor="#FFFFFF"
        >
          {filteredSalons.map((salon) =>
            salon.latitude && salon.longitude ? (
              <Marker
                key={salon.id}
                coordinate={{ latitude: salon.latitude, longitude: salon.longitude }}
                pinColor={theme.colors.primary}
                title={salon.name}
                description={salon.address}
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
        </ClusteredMapView>
      ) : (
        <FlatList
          data={filteredSalons}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SalonCard salon={item} onPress={() => handleSalonPress(item)} />
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: TAB_BAR_BASE_HEIGHT + insets.bottom + 16 }]}
          showsVerticalScrollIndicator={false}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator color={theme.colors.primary} />
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
              accessibilityLabel="Pull to refresh salon list"
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="location-outline"
              title={searchQuery ? 'No matching salons' : 'No Salons Found'}
              message={
                searchQuery
                  ? `No salons match "${searchQuery}". Try a different search.`
                  : 'Try adjusting your location or check back later.'
              }
              compact
              action={
                searchQuery
                  ? { label: 'Clear Search', onPress: () => setSearchQuery('') }
                  : undefined
              }
            />
          }
        />
      )}
    </ScreenWrapper>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: spacing.xl,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
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
    color: theme.colors.text,
    marginBottom: 4,
    fontWeight: '700',
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: borderRadius.pill,
    padding: 4,
  },
  toggleBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.pill,
  },
  toggleBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchContainerDisabled: {
    borderColor: theme.colors.warning + '60',
    opacity: 0.8,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: theme.colors.text,
  },
  listContent: {
    padding: spacing.xl,
    flexGrow: 1,
  },
  map: { flex: 1 },
  loaderContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  callout: { padding: spacing.sm, minWidth: 160, maxWidth: 220 },
  calloutTitle: { ...typography.bodySmallMedium, color: theme.colors.text, marginBottom: 2 },
  calloutText: { ...typography.caption, color: theme.colors.textSecondary },
  calloutRating: { ...typography.captionMedium, color: theme.colors.secondary, marginTop: 4 },
});

export default DiscoverScreen;
