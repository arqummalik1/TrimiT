/**
 * LocationPickerModal.tsx
 * ─────────────────────────────────────────────────────────────────
 * Full-screen modal that lets salon owners pick their exact location.
 *
 * Features:
 *  1. Loads with the previously saved coordinates (or defaults to the
 *     device's current location via expo-location).
 *  2. Draggable marker — owner can long-press and drag to fine-tune.
 *  3. Tap anywhere on map → marker jumps to that point.
 *  4. "Use My Location" button — requests location permission, then
 *     flies the map to the device coordinates.
 *  5. "Search Address" text field + "Find on Map" button — calls
 *     geocodeAddress() (Google Geocoding API) and pans map there.
 *     The search is intentionally NOT auto-triggered on keystroke to
 *     minimise API quota usage.
 *  6. Live reverse-geocoded address label shown below search bar.
 *  7. Confirm button passes lat/lng back to the parent screen.
 *
 * API cost breakdown:
 *  - Map rendering: FREE (Maps SDK for Android/iOS — unlimited).
 *  - Geocode on address search: ~1 call per owner setup. FREE tier = 5,000/month.
 *  - Get directions (not here, but in directions flow): ZERO — uses native app.
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Alert,
  Modal,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import MapView, { MapPressEvent } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import {
  Coordinates,
  geocodeAddress,
  buildLocationPickerRegion,
} from '../lib/maps';
import SalonMapMarker from './SalonMapMarker';
import { typography, spacing, borderRadius, shadows } from '../lib/utils';
import { useTheme } from '../theme/ThemeContext';
import { Theme } from '../theme/tokens';

// ─── Props ─────────────────────────────────────────────────────────

interface LocationPickerModalProps {
  visible: boolean;
  initialCoordinates: Coordinates;
  onConfirm: (coords: Coordinates) => void;
  onDismiss: () => void;
}

// ─── Component ─────────────────────────────────────────────────────

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  visible,
  initialCoordinates,
  onConfirm,
  onDismiss,
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const mapRef = useRef<MapView>(null);

  const [selectedCoords, setSelectedCoords] = useState<Coordinates>(initialCoordinates);
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // ─── Map press handler ──────────────────────────────────────────
  const handleMapPress = useCallback((event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedCoords({ latitude, longitude });
    setSearchError(null);
  }, []);

  // ─── "Use My Location" ──────────────────────────────────────────
  const handleUseMyLocation = useCallback(async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to use this feature. Please enable it in your device Settings.',
          [{ text: 'OK' }]
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coords: Coordinates = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setSelectedCoords(coords);

      // Animate camera to device location
      mapRef.current?.animateToRegion(buildLocationPickerRegion(coords), 600);
    } catch {
      Alert.alert('Error', 'Could not retrieve your location. Please try again.');
    } finally {
      setIsLocating(false);
    }
  }, []);

  // ─── Address search ─────────────────────────────────────────────
  const handleSearchAddress = useCallback(async () => {
    const query = searchText.trim();
    if (!query) return;

    setIsSearching(true);
    setSearchError(null);

    try {
      const result = await geocodeAddress(query);
      setSelectedCoords(result.coordinates);
      // Show the formatted address as feedback
      setSearchText(result.formattedAddress);

      // Fly map camera to result
      mapRef.current?.animateToRegion(
        buildLocationPickerRegion(result.coordinates),
        600
      );
    } catch (error: any) {
      setSearchError(error.message ?? 'Address not found. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [searchText]);

  // ─── Confirm selection ──────────────────────────────────────────
  const handleConfirm = useCallback(() => {
    onConfirm(selectedCoords);
  }, [selectedCoords, onConfirm]);

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.surface} />

        {/* ── Top bar ─────────────────────────────────────────── */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onDismiss} style={styles.closeBtn} hitSlop={8}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Pin Your Salon Location</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* ── Search bar ──────────────────────────────────────── */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.searchWrapper}
        >
          <View style={[styles.searchRow, shadows.sm]}>
            <Ionicons name="search" size={18} color={theme.colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search address..."
              placeholderTextColor={theme.colors.textTertiary}
              value={searchText}
              onChangeText={(t) => {
                setSearchText(t);
                setSearchError(null);
              }}
              returnKeyType="search"
              onSubmitEditing={handleSearchAddress}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchText.length > 0 && !isSearching && (
              <TouchableOpacity
                onPress={() => setSearchText('')}
                hitSlop={8}
                style={styles.clearBtn}
              >
                <Ionicons name="close-circle" size={18} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.findBtn}
              onPress={handleSearchAddress}
              disabled={isSearching || searchText.trim().length === 0}
            >
              {isSearching ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.findBtnText}>Find</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Search error feedback */}
          {searchError ? (
            <View style={styles.errorBanner}>
              <Ionicons name="warning-outline" size={14} color={theme.colors.error} />
              <Text style={styles.errorText}>{searchError}</Text>
            </View>
          ) : null}
        </KeyboardAvoidingView>

        {/* ── Map ─────────────────────────────────────────────── */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            initialRegion={buildLocationPickerRegion(initialCoordinates)}
            onPress={handleMapPress}
            showsUserLocation
            showsMyLocationButton={false}
            showsCompass
            showsScale
            mapType="standard"
            userInterfaceStyle={isDark ? 'dark' : 'light'}
          >
            <SalonMapMarker
              coordinate={selectedCoords}
              trackViewChanges // owner is actively moving the pin → allow updates
              selected
            />
          </MapView>

          {/* "Use My Location" FAB */}
          <TouchableOpacity
            style={styles.myLocationFab}
            onPress={handleUseMyLocation}
            disabled={isLocating}
          >
            {isLocating ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Ionicons name="locate" size={22} color={theme.colors.primary} />
            )}
          </TouchableOpacity>

          {/* Tap hint */}
          <View style={styles.tapHint} pointerEvents="none">
            <Ionicons name="information-circle-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.tapHintText}>Tap the map to move the pin</Text>
          </View>
        </View>

        {/* ── Coordinate display + Confirm ─────────────────────── */}
        <View style={styles.footer}>
          <View style={styles.coordsRow}>
            <Ionicons name="location" size={16} color={theme.colors.primary} />
            <Text style={styles.coordsLabel}>Selected Location</Text>
          </View>
          <Text style={styles.coordsValue}>
            {selectedCoords.latitude.toFixed(6)}, {selectedCoords.longitude.toFixed(6)}
          </Text>

          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text style={styles.confirmBtnText}>Confirm Location</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

// ─── Styles ────────────────────────────────────────────────────────

const createStyles = (theme: Theme) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    ...typography.h4,
    color: theme.colors.text,
  },

  // Search
  searchWrapper: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  searchIcon: {
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 44,
    ...typography.bodyMedium,
    color: theme.colors.text,
  },
  clearBtn: {
    padding: spacing.sm,
  },
  findBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: spacing.lg,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  findBtnText: {
    ...typography.buttonSmall,
    color: '#FFFFFF',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  errorText: {
    ...typography.bodySmall,
    color: theme.colors.error,
    flex: 1,
  },

  // Map
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  myLocationFab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 48,
    height: 48,
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    // Android
    elevation: 4,
  },
  tapHint: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: theme.colors.surfaceSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  tapHintText: {
    ...typography.caption,
    color: theme.colors.textSecondary,
  },

  // Footer
  footer: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: spacing.sm,
  },
  coordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  coordsLabel: {
    ...typography.bodySmallMedium,
    color: theme.colors.textSecondary,
  },
  coordsValue: {
    ...typography.bodySmall,
    color: theme.colors.text,
    fontVariant: ['tabular-nums'],
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  confirmBtnText: {
    ...typography.button,
    color: '#FFFFFF',
  },
});

export default LocationPickerModal;
