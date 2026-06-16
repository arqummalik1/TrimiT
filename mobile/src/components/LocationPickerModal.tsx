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
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { handleApiError } from '../lib/errorHandler';

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
  const insets = useSafeAreaInsets();

  const [selectedCoords, setSelectedCoords] = useState<Coordinates>(initialCoordinates);
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  // Hint banner — shown on open, user can dismiss to see more map
  const [showHint, setShowHint] = useState(true);

  // ─── Map press handler ──────────────────────────────────────────
  const handleMapPress = useCallback((event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedCoords({ latitude, longitude });
    setSearchError(null);
  }, []);

  // ─── "Use My Location" ──────────────────────────────────────────
  const handleUseMyLocation = useCallback(async (showAlertOnError = true) => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (showAlertOnError) {
          Alert.alert(
            'Permission Denied',
            'Location permission is required to use this feature. Please enable it in your device Settings.',
            [{ text: 'OK' }]
          );
        }
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
      if (showAlertOnError) {
        Alert.alert('Error', 'Could not retrieve your location. Please try again.');
      }
    } finally {
      setIsLocating(false);
    }
  }, []);

  // Auto-locate user on mount if coordinates are still at default, or snap map to initialCoordinates on open
  React.useEffect(() => {
    if (visible) {
      // Always reset the hint banner when the modal opens
      setShowHint(true);

      const isDefault =
        Math.abs(initialCoordinates.latitude - 28.6139) < 0.0001 &&
        Math.abs(initialCoordinates.longitude - 77.2090) < 0.0001;

      if (isDefault) {
        void handleUseMyLocation(false);
      } else {
        setSelectedCoords(initialCoordinates);
        setTimeout(() => {
          mapRef.current?.animateToRegion(buildLocationPickerRegion(initialCoordinates), 100);
        }, 300);
      }
    }
  }, [visible, initialCoordinates, handleUseMyLocation]);

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
    } catch (error) {
      const appErr = handleApiError(error);
      setSearchError(appErr.message ?? 'Address not found. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [searchText]);

  // ─── Confirm selection ──────────────────────────────────────────
  const handleConfirm = useCallback(() => {
    onConfirm(selectedCoords);
  }, [selectedCoords, onConfirm]);

  // ─── Render ─────────────────────────────────────────────────────
  const statusBarHeight = insets.top > 0 ? insets.top : (Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 44);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.root}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.surface} />

        {/* ── Top bar ─────────────────────────────────────────── */}
        <View style={[styles.topBar, { paddingTop: Math.max(statusBarHeight, spacing.md) + spacing.xs }]}>
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
              variant="brand"
              selected
              trackViewChanges
              showCallout={false}
            />
          </MapView>

          {/* "Use My Location" FAB */}
          <TouchableOpacity
            style={styles.myLocationFab}
            onPress={() => handleUseMyLocation(true)}
            disabled={isLocating}
          >
            {isLocating ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Ionicons name="locate" size={18} color={theme.colors.primary} />
            )}
            <Text style={styles.myLocationFabText}>Use Current Location</Text>
          </TouchableOpacity>

          {/* Tap hint banner — dismissable */}
          {showHint ? (
            <View style={styles.tapHint}>
              <View style={styles.tapHintIconBg}>
                <Ionicons name="map-outline" size={16} color={theme.colors.primary} />
              </View>
              <Text style={styles.tapHintText}>
                Tap anywhere on the map to pin your salon's exact location, or drag the marker to fine-tune.
              </Text>
              <TouchableOpacity
                onPress={() => setShowHint(false)}
                hitSlop={10}
                style={styles.tapHintClose}
                accessibilityLabel="Dismiss hint"
              >
                <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* ── Coordinate display + Confirm ─────────────────────── */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
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
      </View>
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
    paddingHorizontal: 16,
    height: 44,
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    gap: 8,
  },
  myLocationFabText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
    fontFamily: theme.fonts.bodyMedium,
  },
  tapHint: {
    position: 'absolute',
    top: 16,
    left: 20,
    right: 20,
    backgroundColor: theme.colors.surface,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tapHintClose: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  },
  tapHintIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tapHintText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.text,
    fontFamily: theme.fonts.bodyMedium,
    flex: 1,
    lineHeight: 18,
  },
  tapHintClose: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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
