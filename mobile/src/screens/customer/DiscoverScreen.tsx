/**
 * DiscoverScreen.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Customer salon discovery: list + map modes, location-gated nearby query,
 * MapView vs ClusteredMapView by pin count, debounced search filter,
 * optional fitToBounds on map open, map controls (zoom / recenter).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWrapper, TAB_BAR_BASE_HEIGHT } from '../../components/ScreenWrapper';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import MapView, { Marker } from 'react-native-maps';
import ClusteredMapView from 'react-native-map-clustering';
import type { Coordinates } from '../../lib/maps';
import { CustomerDiscoverScreenProps } from '../../navigation/types';
import api from '../../lib/api';
import { SalonCard } from '../../components/SalonCard';
import { SalonListSkeleton } from '../../components/skeletons/SalonListSkeleton';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { handleApiError } from '../../lib/errorHandler';
import { useMinLoadingTime } from '../../hooks/useMinLoadingTime';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useDiscoverLocation } from '../../hooks/useDiscoverLocation';
import { showToast } from '../../store/toastStore';
import { Salon } from '../../types';
import { normalizeSalon } from '../../lib/salonImage';
import { spacing, borderRadius, fonts, layout } from '../../lib/utils';
import { PermissionPrimer } from '../../components/PermissionPrimer';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';
import { getSalonMapPinColor } from '../../lib/mapMarkers';
import { ServiceAreaGate } from '../../components/ServiceAreaGate';
import { serviceabilityRepository } from '../../repositories/serviceabilityRepository';
import { DISCOVER_FALLBACK_COORDS, DISCOVER_INITIAL_DELTA } from '../../lib/maps';
import { logger } from '../../lib/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WelcomeVoucherModal } from '../../components/WelcomeVoucherModal';
import { promotionRepository, CampaignGrant } from '../../repositories/promotionRepository';
import { useAuthStore } from '../../store/authStore';
import {
  DiscoverChip,
  DISCOVER_CHIP_OPTIONS,
  discoverChipToApiFilter,
  salonMatchesDiscoverFilter,
} from '../../lib/genderServe';
import { FilterChipRow } from '../../components/FilterChipRow';
import {
  DISCOVER_SEARCH_DEBOUNCE_MS,
  DISCOVER_CLUSTERING_MIN_MARKERS,
  DISCOVER_FIT_MAX_SPAN_KM,
  DISCOVER_CLUSTER_RADIUS,
  DISCOVER_NEARBY_RADIUS_KM,
  computeApproxMaxSpanKm,
} from './discoverMapConstants';

const LOG = '[Discover]';

const MAP_DELTA_REF_DEFAULT = DISCOVER_INITIAL_DELTA;

function parseSalonCoordinate(salon: Salon): { latitude: number; longitude: number } | null {
  const lat = Number(salon.latitude);
  const lng = Number(salon.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return null;
  }
  return { latitude: lat, longitude: lng };
}

type DiscoverScreenProps = CustomerDiscoverScreenProps<'DiscoverMain'>;

export const DiscoverScreen: React.FC<DiscoverScreenProps> = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const { user } = useAuthStore();
  const [welcomeGrant, setWelcomeGrant] = useState<CampaignGrant | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [discoverChip, setDiscoverChip] = useState<DiscoverChip>('for_you');

  const discoverApiFilter = useMemo(
    () => discoverChipToApiFilter(discoverChip, user),
    [discoverChip, user],
  );

  const endReachedLock = useRef(false);

  const debouncedSearchQuery = useDebouncedValue(searchQuery.trim(), DISCOVER_SEARCH_DEBOUNCE_MS);

  const {
    phase,
    coords,
    errorMessage,
    locationReady,
    source,
    bootstrap,
    confirmPrimer,
    skipPrimer,
    recenter,
  } = useDiscoverLocation();

  const { isOnline } = useNetworkStatus();
  const mapRef = useRef<MapView>(null);
  const mapDeltaRef = useRef(MAP_DELTA_REF_DEFAULT);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!isFocused || !user?.id || user.role !== 'customer') return;
    let cancelled = false;
    (async () => {
      try {
        const key = `welcome_voucher_shown_${user.id}`;
        const shown = await AsyncStorage.getItem(key);
        if (shown || cancelled) return;
        const grants = await promotionRepository.getMyGrants();
        const active = grants.find(
          (g) =>
            !g.redeemed_at &&
            new Date(g.expires_at).getTime() > Date.now() &&
            g.code?.toUpperCase() === 'TRIMIT50',
        );
        if (active && !cancelled) {
          setWelcomeGrant(active);
          setShowWelcome(true);
          await AsyncStorage.setItem(key, '1');
        }
      } catch (e) {
        logger.warn(`${LOG} welcome modal check failed`, { error: String(e) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isFocused, user?.id]);

  const latKey = coords?.lat ?? 'none';
  const lngKey = coords?.lng ?? 'none';

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
    isFetching,
  } = useInfiniteQuery({
    queryKey: ['salons', 'discover', 'nearby', latKey, lngKey, discoverChip, discoverApiFilter ?? 'all'],
    enabled: locationReady,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: 'always',
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const params = new URLSearchParams();
      if (coords) {
        params.append('lat', coords.lat.toString());
        params.append('lng', coords.lng.toString());
        params.append('radius', String(DISCOVER_NEARBY_RADIUS_KM));
      }
      params.append('limit', '20');
      params.append('offset', pageParam.toString());
      if (discoverApiFilter) {
        params.append('gender_serve', discoverApiFilter);
      }

      logger.info(`${LOG} salons query`, {
        pageParam,
        hasCoords: !!coords,
        lat: coords?.lat,
        lng: coords?.lng,
        locationSource: source,
      });

      const response = await api.get(`/salons/?${params.toString()}`);
      const rows = response.data?.data as Salon[] | undefined;
      logger.info(`${LOG} salons response`, {
        count: Array.isArray(rows) ? rows.length : 0,
        pageParam,
      });
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage;
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

  const allSalons = useMemo(() => {
    const pages = salonPages?.pages;
    if (!pages) return [];
    const flat = pages.flatMap((page) =>
      ((page.data ?? []) as Salon[]).map((row: Salon) => normalizeSalon(row))
    );
    logger.debug(`${LOG} flattened salons`, { total: flat.length, pages: pages.length });
    return flat;
  }, [salonPages]);

  const showQuerySkeleton = useMinLoadingTime(isLoading && locationReady, 500);
  const showBodySkeleton = !locationReady || showQuerySkeleton;

  // ── Serviceability gate ─────────────────────────────────────────────────
  // Is the user inside a city TrimiT serves? Independent of the salon query so
  // it never blocks discovery. Fails OPEN (treated serviceable) on any error,
  // and only gates when the backend explicitly returns serviceable === false.
  const { data: serviceability } = useQuery({
    queryKey: ['serviceability', 'check', latKey, lngKey],
    enabled: locationReady,
    staleTime: 10 * 60 * 1000,
    queryFn: () => serviceabilityRepository.check(coords),
    retry: 1,
  });
  const isOutOfArea = serviceability?.serviceable === false;

  const filteredSalons = useMemo(() => {
    let list = allSalons.filter((s) => salonMatchesDiscoverFilter(s, discoverApiFilter));
    if (!debouncedSearchQuery) return list;
    const query = debouncedSearchQuery.toLowerCase();
    list = list.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.address.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query)
    );
    logger.debug(`${LOG} search filter`, {
      query,
      count: list.length,
    });
    return list;
  }, [allSalons, debouncedSearchQuery, discoverApiFilter]);

  const mapMarkersData = useMemo(() => {
    const markers: { salon: Salon; coordinate: { latitude: number; longitude: number } }[] = [];
    for (const salon of filteredSalons) {
      const c = parseSalonCoordinate(salon);
      if (c) markers.push({ salon, coordinate: c });
    }
    return markers;
  }, [filteredSalons]);

  const useClustering = mapMarkersData.length >= DISCOVER_CLUSTERING_MIN_MARKERS;

  useEffect(() => {
    logger.debug(`${LOG} map markers`, {
      markerCount: mapMarkersData.length,
      salonsLoaded: filteredSalons.length,
      viewMode,
      useClustering,
    });
  }, [mapMarkersData.length, filteredSalons.length, viewMode, useClustering]);

  const mapCenter = useMemo(() => {
    if (coords) {
      return { latitude: coords.lat, longitude: coords.lng };
    }
    return DISCOVER_FALLBACK_COORDS;
  }, [coords]);

  const mapInitialRegion = useMemo(
    () => ({
      latitude: mapCenter.latitude,
      longitude: mapCenter.longitude,
      latitudeDelta: mapDeltaRef.current,
      longitudeDelta: mapDeltaRef.current,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally refresh when coords / mode change
    [mapCenter.latitude, mapCenter.longitude, viewMode]
  );

  const applyInitialMapCamera = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const userRegion = {
      latitude: mapCenter.latitude,
      longitude: mapCenter.longitude,
      latitudeDelta: MAP_DELTA_REF_DEFAULT,
      longitudeDelta: MAP_DELTA_REF_DEFAULT,
    };

    const salonCoords: Coordinates[] = mapMarkersData.map((m) => m.coordinate);
    const edgePadding = {
      top: insets.top + 160,
      right: 72,
      bottom: TAB_BAR_BASE_HEIGHT + insets.bottom + spacing.md,
      left: spacing.lg,
    };

    if (salonCoords.length === 0) {
      map.animateToRegion(userRegion, 500);
      logger.debug(`${LOG} map camera user-only (no markers)`);
      return;
    }

    // Single salon → frame it closely.
    if (salonCoords.length === 1) {
      const only = salonCoords[0];
      map.animateToRegion(
        {
          latitude: only.latitude,
          longitude: only.longitude,
          latitudeDelta: 0.06,
          longitudeDelta: 0.06,
        },
        500
      );
      logger.debug(`${LOG} map camera single salon`);
      return;
    }

    // 2+ salons → ALWAYS frame all of them (that's the whole point of map view).
    // Include the user pin only when it doesn't blow the view out of proportion,
    // so nearby browsing stays tight but salons are NEVER pushed off-screen.
    const withUser: Coordinates[] =
      coords != null
        ? [...salonCoords, { latitude: coords.lat, longitude: coords.lng }]
        : [...salonCoords];
    const includeUser =
      coords != null && computeApproxMaxSpanKm(withUser) <= DISCOVER_FIT_MAX_SPAN_KM;
    const fitTarget = includeUser ? withUser : salonCoords;

    map.fitToCoordinates(fitTarget, { edgePadding, animated: true });
    logger.debug(`${LOG} map fitToCoordinates (all salons)`, {
      salons: salonCoords.length,
      includeUser,
    });
  }, [coords, insets.top, insets.bottom, mapCenter.latitude, mapCenter.longitude, mapMarkersData]);

  useEffect(() => {
    if (viewMode !== 'map') return;
    mapDeltaRef.current = MAP_DELTA_REF_DEFAULT;
    let cancelled = false;
    let innerRaf: number | null = null;
    const outerRaf = requestAnimationFrame(() => {
      innerRaf = requestAnimationFrame(() => {
        if (!cancelled) {
          applyInitialMapCamera();
        }
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(outerRaf);
      if (innerRaf != null) {
        cancelAnimationFrame(innerRaf);
      }
    };
  }, [viewMode, applyInitialMapCamera]);

  const handleSalonPress = useCallback(
    (salon: Salon) => {
      navigation.navigate('SalonDetail', { salonId: salon.id });
    },
    [navigation]
  );

  const renderSalonItem = useCallback(
    ({ item }: { item: Salon }) => (
      <SalonCard
        salon={item}
        onPress={() => handleSalonPress(item)}
        disableImageTransition
      />
    ),
    [handleSalonPress]
  );

  const handleEndReached = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage || endReachedLock.current) return;
    endReachedLock.current = true;
    void fetchNextPage().finally(() => {
      endReachedLock.current = false;
    });
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const listFooter = useMemo(() => {
    if (isFetchingNextPage) {
      return (
        <View style={styles.loaderContainer}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      );
    }
    // Fixed cushion so the list doesn't snap when pagination ends.
    return <View style={styles.listEndCushion} />;
  }, [isFetchingNextPage, theme.colors.primary]);

  const handleOfflineTap = () => {
    if (!isOnline) {
      showToast('No internet connection. Connect to search salons.', 'warning');
    }
  };

  const openSearch = useCallback(() => {
    if (!isOnline) {
      handleOfflineTap();
      return;
    }
    setSearchOpen(true);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }, [isOnline]);

  const closeSearch = useCallback(() => {
    setSearchQuery('');
    setSearchOpen(false);
    searchInputRef.current?.blur();
  }, []);

  const zoomByFactor = useCallback((factor: number) => {
    const next = Math.min(1.8, Math.max(0.006, mapDeltaRef.current * factor));
    mapDeltaRef.current = next;
    const c = coords
      ? { latitude: coords.lat, longitude: coords.lng }
      : { latitude: DISCOVER_FALLBACK_COORDS.latitude, longitude: DISCOVER_FALLBACK_COORDS.longitude };
    mapRef.current?.animateToRegion(
      {
        ...c,
        latitudeDelta: next,
        longitudeDelta: next,
      },
      220
    );
    logger.debug(`${LOG} zoom`, { factor, nextDelta: next });
  }, [coords]);

  const handleRecenter = useCallback(async () => {
    logger.info(`${LOG} recenter FAB`);
    const next = await recenter();
    const lat = next?.lat ?? coords?.lat ?? DISCOVER_FALLBACK_COORDS.latitude;
    const lng = next?.lng ?? coords?.lng ?? DISCOVER_FALLBACK_COORDS.longitude;
    mapDeltaRef.current = MAP_DELTA_REF_DEFAULT;
    mapRef.current?.animateToRegion(
      {
        latitude: lat,
        longitude: lng,
        latitudeDelta: MAP_DELTA_REF_DEFAULT,
        longitudeDelta: MAP_DELTA_REF_DEFAULT,
      },
      500
    );
  }, [coords?.lat, coords?.lng, recenter]);

  useEffect(() => {
    logger.debug(`${LOG} view mode`, {
      viewMode,
      locationReady,
      salonCount: allSalons.length,
      filteredCount: filteredSalons.length,
      isFetching,
    });
  }, [viewMode, locationReady, allSalons.length, filteredSalons.length, isFetching]);

  const handleMapReady = useCallback(() => {
    logger.debug(`${LOG} map ready`, {
      initialRegion: mapInitialRegion,
      markerCount: mapMarkersData.length,
      useClustering,
    });
  }, [mapInitialRegion, mapMarkersData.length, useClustering]);

  const markerElements = useMemo(
    () =>
      mapMarkersData.map(({ salon, coordinate }) => (
        <Marker
          key={salon.id}
          coordinate={coordinate}
          pinColor={getSalonMapPinColor(theme)}
          title={salon.name}
          onPress={() => handleSalonPress(salon)}
        />
      )),
    [mapMarkersData, handleSalonPress, theme]
  );

  if (isError && locationReady && !showBodySkeleton) {
    const appErr = handleApiError(rawError);
    return (
      <ScreenWrapper variant="tab">
        <View style={styles.topChrome}>
          <View style={styles.titleBlock}>
            <Text style={styles.titleLine}>Discover</Text>
            <Text style={styles.titleLine}>Salons</Text>
          </View>
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

  const mapCommonProps = {
    ref: mapRef,
    style: styles.map,
    initialRegion: mapInitialRegion,
    showsUserLocation: locationReady && !!coords,
    showsMyLocationButton: false,
    showsCompass: false,
    userInterfaceStyle: isDark ? ('dark' as const) : ('light' as const),
    onMapReady: handleMapReady,
    accessibilityLabel: 'Salon map',
  };

  return (
    <ScreenWrapper variant="tab">
      <PermissionPrimer
        isVisible={phase === 'primer'}
        title="Find Salons Near You"
        message="TrimiT uses your location to show the closest salons, estimated travel times, and accurate distance."
        icon="location"
        onAllow={() => {
          void confirmPrimer();
        }}
        onDeny={() => {
          skipPrimer();
        }}
      />

      <View style={styles.topChrome}>
        <View style={styles.headerRow}>
          <View style={styles.titleBlock} accessibilityRole="header">
            <Text style={styles.titleLine}>Discover</Text>
            <Text style={styles.titleLine}>Salons</Text>
          </View>
          <View style={styles.headerActions}>
            {!isOutOfArea && (
              <TouchableOpacity
                style={[
                  styles.headerIconBtn,
                  (searchOpen || searchQuery.length > 0) && styles.headerIconBtnActive,
                ]}
                onPress={searchOpen ? closeSearch : openSearch}
                accessibilityLabel={searchOpen ? 'Close search' : 'Search salons'}
                accessibilityRole="button"
              >
                <Ionicons
                  name={searchOpen ? 'close' : isOnline ? 'search' : 'cloud-offline-outline'}
                  size={20}
                  color={
                    searchOpen || searchQuery.length > 0
                      ? theme.colors.textInverse
                      : isOnline
                        ? theme.colors.text
                        : theme.colors.warning
                  }
                />
              </TouchableOpacity>
            )}
            {!isOutOfArea && (
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
                    size={17}
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
                    size={17}
                    color={viewMode === 'map' ? theme.colors.textInverse : theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {searchOpen && !isOutOfArea && (
          <View style={styles.searchRow}>
            <View style={[styles.searchContainer, !isOnline && styles.searchContainerDisabled]}>
              <Ionicons
                name={isOnline ? 'search' : 'cloud-offline-outline'}
                size={18}
                color={isOnline ? theme.colors.textSecondary : theme.colors.warning}
              />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder={isOnline ? 'Search salons...' : 'No internet connection'}
                placeholderTextColor={isOnline ? theme.colors.textSecondary : theme.colors.warning}
                value={searchQuery}
                onChangeText={setSearchQuery}
                editable={isOnline}
                returnKeyType="search"
                accessibilityRole="search"
                accessibilityLabel="Search salons"
              />
              {searchQuery.length > 0 && isOnline && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  accessibilityLabel="Clear search"
                  accessibilityRole="button"
                >
                  <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <FilterChipRow
          options={DISCOVER_CHIP_OPTIONS}
          value={discoverChip}
          onChange={setDiscoverChip}
          testIDPrefix="discover"
          compact
        />
      </View>

      {showBodySkeleton ? (
        <SalonListSkeleton />
      ) : isOutOfArea && serviceability ? (
        <ServiceAreaGate result={serviceability} coords={coords} />
      ) : viewMode === 'map' ? (
        <View style={styles.mapWrap}>
          {isFocused ? (
            useClustering ? (
              <ClusteredMapView
                {...mapCommonProps}
                radius={DISCOVER_CLUSTER_RADIUS}
                clusterColor={theme.colors.primary}
                clusterTextColor="#FFFFFF"
              >
                {markerElements}
              </ClusteredMapView>
            ) : (
              <MapView {...mapCommonProps}>{markerElements}</MapView>
            )
          ) : (
            <View style={styles.mapPausedPlaceholder}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          )}

          <View
            style={[
              styles.mapControls,
              { bottom: TAB_BAR_BASE_HEIGHT + insets.bottom + spacing.md },
            ]}
            pointerEvents="box-none"
          >
            <TouchableOpacity
              style={styles.mapFab}
              onPress={() => zoomByFactor(0.65)}
              accessibilityLabel="Zoom in"
            >
              <Ionicons name="add" size={22} color={theme.colors.textInverse} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mapFab}
              onPress={() => zoomByFactor(1 / 0.65)}
              accessibilityLabel="Zoom out"
            >
              <Ionicons name="remove" size={22} color={theme.colors.textInverse} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.mapFab, styles.mapFabAccent]}
              onPress={() => void handleRecenter()}
              accessibilityLabel="Center map on my location"
            >
              <Ionicons name="locate" size={22} color={theme.colors.textInverse} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <FlatList
          data={filteredSalons}
          keyExtractor={(item) => item.id}
          renderItem={renderSalonItem}
          removeClippedSubviews
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={7}
          updateCellsBatchingPeriod={50}
          contentContainerStyle={[
            styles.listContent,
            filteredSalons.length === 0 && styles.listContentEmpty,
            { paddingBottom: TAB_BAR_BASE_HEIGHT + insets.bottom + 16 },
          ]}
          showsVerticalScrollIndicator={false}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.15}
          ListFooterComponent={listFooter}
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
              title={debouncedSearchQuery ? 'No matching salons' : 'No Salons Found'}
              message={
                debouncedSearchQuery
                  ? `No salons match "${debouncedSearchQuery}". Try a different search.`
                  : 'Enable location or try a different search.'
              }
              compact
              action={
                debouncedSearchQuery
                  ? { label: 'Clear Search', onPress: closeSearch }
                  : undefined
              }
            />
          }
        />
      )}
      <WelcomeVoucherModal
        visible={showWelcome && !!welcomeGrant}
        code={welcomeGrant?.code || 'TRIMIT50'}
        discountAmount={welcomeGrant?.discount_value || 50}
        minOrder={welcomeGrant?.min_order_value || 149}
        expiresAt={welcomeGrant?.expires_at || new Date().toISOString()}
        onExplore={() => setShowWelcome(false)}
      />
    </ScreenWrapper>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    topChrome: {
      paddingHorizontal: layout.floatingChromeInset,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
      backgroundColor: theme.colors.surface,
      gap: spacing.sm,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    titleBlock: {
      flex: 1,
      flexShrink: 1,
      minWidth: 0,
    },
    titleLine: {
      fontFamily: fonts.heading,
      fontSize: 28,
      lineHeight: 32,
      color: theme.colors.text,
      fontWeight: '700',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flexShrink: 0,
    },
    headerIconBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: theme.colors.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerIconBtnActive: {
      backgroundColor: theme.colors.primary,
    },
    searchRow: {
      marginTop: -2,
    },
    viewToggle: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surfaceSecondary,
      borderRadius: borderRadius.pill,
      padding: 3,
    },
    toggleBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
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
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    searchContainerDisabled: {
      opacity: 0.8,
    },
    searchInput: {
      flex: 1,
      fontFamily: fonts.body,
      fontSize: 14,
      paddingVertical: 0,
      color: theme.colors.text,
    },
    listContent: {
      paddingHorizontal: layout.floatingChromeInset,
      paddingTop: spacing.md,
      paddingBottom: spacing.xl,
    },
    listContentEmpty: {
      flexGrow: 1,
    },
    listEndCushion: {
      height: 24,
    },
    mapWrap: {
      flex: 1,
      position: 'relative',
    },
    mapPausedPlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceSecondary,
    },
    map: {
      flex: 1,
    },
    mapControls: {
      position: 'absolute',
      right: spacing.lg,
      gap: spacing.sm,
      alignItems: 'center',
    },
    mapFab: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.text + 'E6',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 4,
    },
    mapFabAccent: {
      backgroundColor: theme.colors.primary,
      marginTop: spacing.sm,
    },
    loaderContainer: {
      paddingVertical: spacing.xl,
      alignItems: 'center',
    },
  });

export default DiscoverScreen;
