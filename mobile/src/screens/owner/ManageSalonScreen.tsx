import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { ScreenWrapper, TAB_BAR_BASE_HEIGHT } from '../../components/ScreenWrapper';
import MapView from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showSalonImagesSourcePicker } from '../../lib/imageUploadPrep';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { typography, spacing, borderRadius, shadows } from '../../lib/utils';
import { useTheme, Theme } from '../../theme/ThemeContext';

import { showToast } from '../../store/toastStore';
import { Salon } from '../../types';
import { getUserFacingMessage } from '../../lib/userFacingError';
import { salonRepository } from '../../repositories/salonRepository';
import { queryKeys } from '../../lib/queryKeys';
import { navigateOwnerToChooseBusinessType, navigateOwnerToServices, resetOwnerDashboardToMain } from '../../lib/ownerNavigation';
import { useOwnerOnboardingStore } from '../../store/ownerOnboardingStore';
import { uploadServiceImage } from '../../services/uploadService';
import { normalizeSalon } from '../../lib/salonImage';
import { salonSchema, toLocalPhone, toE164India } from '../../lib/validations';
import { OwnerDashboardScreenProps, OwnerSettingsScreenProps } from '../../navigation/types';
import { LocationPickerModal } from '../../components/LocationPickerModal';
import { SalonMapMarker } from '../../components/SalonMapMarker';
import type { Coordinates } from '../../lib/maps';
import { FilterChipRow } from '../../components/FilterChipRow';
import { SALON_SERVE_OPTIONS, SalonGenderServe, getVenueCopy } from '../../lib/genderServe';
import { useRoute, RouteProp } from '@react-navigation/native';
import { OwnerDashboardStackParamList, OwnerSettingsStackParamList } from '../../navigation/types';

type ManageSalonProps = OwnerDashboardScreenProps<'ManageSalon'> | OwnerSettingsScreenProps<'ManageSalon'>;
type ManageSalonRouteProp = RouteProp<OwnerDashboardStackParamList, 'ManageSalon'> &
  RouteProp<OwnerSettingsStackParamList, 'ManageSalon'>;

interface SalonPayload {
  name: string;
  description: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  phone: string;
  opening_time: string;
  closing_time: string;
  images: string[];
  gender_serve: SalonGenderServe;
}

/** Max photos an owner can attach to a salon/parlour. */
const MAX_SALON_IMAGES = 3;

/** How long before an in-flight upload is flagged "taking a while" (retry). */
const UPLOAD_SLOW_MS = 30000;

type PendingImage = {
  id: string;
  localUri: string;
  progress: number;
  phase: 'preparing' | 'uploading';
  status: 'uploading' | 'failed';
  slow: boolean;
};

export default function ManageSalonScreen({ navigation }: ManageSalonProps) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const route = useRoute<ManageSalonRouteProp>();

  const { data: salon, isLoading } = useQuery<Salon | null>({
    queryKey: queryKeys.ownerSalon,
    queryFn: () => salonRepository.getOwnerSalon(),
    staleTime: 30_000,
  });

  const [showLocationPicker, setShowLocationPicker] = useState(false);
  // TRUE only once the owner has actually placed a pin (or an existing salon
  // loaded with real coords). We NEVER pre-fill a silent default location, so a
  // salon can't be created at the wrong place. Save stays blocked until true.
  const [locationSet, setLocationSet] = useState(false);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  // Per-upload timers/tokens. `slowTimers` flips an item to "taking a while"
  // after 30s so the owner gets a Retry affordance without losing the form.
  // `attemptTokens` guards against a stale (retried/abandoned) request applying
  // its result after a newer attempt for the same slot started.
  const slowTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const attemptTokens = useRef<Record<string, number>>({});

  useEffect(() => {
    return () => {
      Object.values(slowTimers.current).forEach((t) => clearTimeout(t));
    };
  }, []);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    latitude: '',
    longitude: '',
    phone: '',
    opening_time: '09:00',
    closing_time: '21:00',
    images: [] as string[],
    gender_serve: 'women' as SalonGenderServe,
  });

  const venueCopy = getVenueCopy(formData.gender_serve);

  useEffect(() => {
    if (isLoading) return;
    if (salon) return;
    const picked = route.params?.gender_serve;
    if (!picked) {
      if (!navigateOwnerToChooseBusinessType(navigation)) {
        (navigation as OwnerDashboardScreenProps<'ManageSalon'>['navigation']).replace('ChooseBusinessType');
      }
      return;
    }
    setFormData((prev) => ({ ...prev, gender_serve: picked }));
  }, [isLoading, salon, route.params?.gender_serve, navigation]);

  // Where the map preview / picker opens BEFORE a pin is placed.
  // starting camera position (Jammu — our launch city), NOT the salon's stored
  // location. The stored location is only set once the owner taps a pin.
  const MAP_DISPLAY_DEFAULT: Coordinates = { latitude: 32.7266, longitude: 74.857 };

  const selectedCoords: Coordinates = locationSet
    ? {
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
      }
    : MAP_DISPLAY_DEFAULT;

  const handleLocationConfirmed = useCallback((coords: Coordinates) => {
    setFormData((prev) => ({
      ...prev,
      latitude: coords.latitude.toFixed(6),
      longitude: coords.longitude.toFixed(6),
    }));
    setLocationSet(true);
    setShowLocationPicker(false);
  }, []);

  useEffect(() => {
    if (salon) {
      const normalized = normalizeSalon(salon);
      const lat = Number(normalized.latitude);
      const lng = Number(normalized.longitude);
      const hasCoords =
        Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
      setFormData({
        name: normalized.name || '',
        description: normalized.description || '',
        address: normalized.address || '',
        city: normalized.city || '',
        latitude: hasCoords ? String(lat) : '',
        longitude: hasCoords ? String(lng) : '',
        // Store the bare 10-digit number; +91 is shown as a fixed prefix and
        // re-attached on submit (matches CompleteProfile).
        phone: toLocalPhone(normalized.phone),
        opening_time: normalized.opening_time || '09:00',
        closing_time: normalized.closing_time || '21:00',
        images: normalized.images,
        gender_serve: normalized.gender_serve ?? 'men',
      });
      setLocationSet(hasCoords);
    }
  }, [salon]);

  const goToPostCreate = useCallback(
    (created: Salon) => {
      queryClient.setQueryData(queryKeys.ownerSalon, created);
      void queryClient.invalidateQueries({ queryKey: ['ownerAnalytics'] });
      useOwnerOnboardingStore.getState().setPostSalonCreatePending(true);
      showToast(getVenueCopy(created.gender_serve ?? formData.gender_serve).successCreated, 'success');
      resetOwnerDashboardToMain(navigation);
      if (!navigateOwnerToServices(navigation, { openAddService: true })) {
        navigation.goBack();
      }
    },
    [queryClient, formData.gender_serve, navigation]
  );

  const createMutation = useMutation({
    mutationFn: (data: SalonPayload) => {
      console.log('🏪 [SalonCreate][screen] mutationFn → calling repository.createSalon');
      return salonRepository.createSalon(data);
    },
    // Cold starts / flaky mobile networks make the FIRST request fail with no
    // response. Auto-retry only that transient class (network/timeout) so the
    // owner doesn't have to tap "Create" again. 4xx/5xx with a response are NOT
    // retried (they're deterministic and handled below).
    retry: (failureCount, error) => {
      const kind = (error as { kind?: string })?.kind;
      return kind === 'network' && failureCount < 2;
    },
    retryDelay: (attempt) => Math.min(1500 * 2 ** attempt, 6000),
    onSuccess: (created: Salon) => {
      console.log('✅ [SalonCreate][screen] onSuccess', {
        salonId: created?.id,
        gender_serve: created?.gender_serve,
      });
      goToPostCreate(created);
    },
    onError: async (error) => {
      const appErr = error as {
        kind?: string;
        code?: string;
        status?: number;
        message?: string;
        requestId?: string;
        details?: unknown;
      };
      console.error('❌ [SalonCreate][screen] createMutation.onError', {
        kind: appErr?.kind,
        code: appErr?.code,
        status: appErr?.status,
        message: appErr?.message,
        requestId: appErr?.requestId,
        details: appErr?.details,
        userFacing: getUserFacingMessage(error),
      });

      // Recovery for the rare "retry after a lost success" race: a prior attempt
      // may have created the salon but its response was dropped, so the retry
      // hits the backend's "you already have a salon" guard (400). Instead of
      // showing a confusing error, re-fetch the owner salon — if it now exists,
      // the create genuinely succeeded, so continue to the success flow.
      const looksLikeDuplicate =
        appErr?.status === 400 &&
        typeof appErr?.message === 'string' &&
        /already have a salon/i.test(appErr.message);
      if (looksLikeDuplicate) {
        try {
          const existing = await salonRepository.getOwnerSalon();
          if (existing) {
            console.log('✅ [SalonCreate][screen] recovered: salon already created', {
              salonId: existing.id,
            });
            goToPostCreate(existing);
            return;
          }
        } catch (recoverErr) {
          console.error('❌ [SalonCreate][screen] duplicate-recovery fetch failed', recoverErr);
        }
      }

      showToast(getUserFacingMessage(error), 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: SalonPayload) => salonRepository.updateSalon(salon!.id, data),
    onSuccess: (updated: Salon) => {
      queryClient.setQueryData(queryKeys.ownerSalon, updated);
      showToast('Salon updated successfully!', 'success');
      navigation.goBack();
    },
    onError: (error) => {
      showToast(getUserFacingMessage(error), 'error');
    },
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    console.log('🏪 [SalonCreate][screen] handleSubmit tapped', {
      mode: salon ? 'update' : 'create',
      gender_serve: formData.gender_serve,
      pendingImages: pendingImages.length,
      uploadedImages: formData.images.length,
      locationSet,
      lat: formData.latitude,
      lng: formData.longitude,
    });

    if (pendingImages.some((p) => p.status === 'uploading')) {
      console.warn('⚠️ [SalonCreate][screen] blocked: images still uploading', {
        pending: pendingImages.filter((p) => p.status === 'uploading').length,
      });
      showToast('Please wait for photos to finish uploading', 'warning');
      return;
    }

    if (pendingImages.some((p) => p.status === 'failed')) {
      console.warn('⚠️ [SalonCreate][screen] blocked: failed photos need retry/remove', {
        failed: pendingImages.filter((p) => p.status === 'failed').length,
      });
      showToast('Some photos failed. Retry or remove them before continuing.', 'warning');
      return;
    }

    if (!locationSet) {
      console.warn('⚠️ [SalonCreate][screen] blocked: no location pinned');
      showToast('Please pin your salon location on the map', 'error');
      return;
    }

    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);

    const parseResult = salonSchema.safeParse({
      name: formData.name,
      address: formData.address,
      city: formData.city,
      phone: toE164India(formData.phone),
      latitude: lat,
      longitude: lng,
      opening_time: formData.opening_time,
      closing_time: formData.closing_time,
    });

    if (!parseResult.success) {
      console.warn('⚠️ [SalonCreate][screen] blocked: client validation failed', {
        issues: parseResult.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
      showToast(parseResult.error.issues[0].message, 'error');
      return;
    }

    const payload = {
      ...formData,
      name: parseResult.data.name,
      address: parseResult.data.address,
      city: parseResult.data.city,
      phone: parseResult.data.phone,
      latitude: parseResult.data.latitude,
      longitude: parseResult.data.longitude,
      opening_time: parseResult.data.opening_time,
      closing_time: parseResult.data.closing_time,
      image_url: formData.images[0] || null,
      gender_serve: formData.gender_serve,
    };

    console.log('🏪 [SalonCreate][screen] validation passed, submitting', {
      mode: salon ? 'update' : 'create',
      imageCount: payload.images.length,
      payloadKeys: Object.keys(payload),
    });

    try {
      if (salon) {
        updateMutation.mutate(payload);
      } else {
        createMutation.mutate(payload);
      }
    } catch (error) {
      console.error('❌ [SalonCreate][screen] handleSubmit threw synchronously', error);
      showToast(getUserFacingMessage(error), 'error');
    }
  };

  const startUpload = useCallback(async (id: string, uri: string) => {
    const token = (attemptTokens.current[id] ?? 0) + 1;
    attemptTokens.current[id] = token;
    const isCurrent = () => attemptTokens.current[id] === token;

    console.log('🖼️ [SalonCreate][image] upload started', { id, attempt: token, uri });

    setPendingImages((prev) => {
      const next: PendingImage = {
        id,
        localUri: uri,
        progress: 0,
        phase: 'preparing',
        status: 'uploading',
        slow: false,
      };
      return prev.some((p) => p.id === id)
        ? prev.map((p) => (p.id === id ? next : p))
        : [...prev, next];
    });

    clearTimeout(slowTimers.current[id]);
    slowTimers.current[id] = setTimeout(() => {
      if (!isCurrent()) return;
      console.warn('⚠️ [SalonCreate][image] slow upload (>30s), offering retry', { id });
      setPendingImages((prev) => prev.map((p) => (p.id === id ? { ...p, slow: true } : p)));
    }, UPLOAD_SLOW_MS);

    try {
      const publicUrl = await uploadServiceImage(uri, (pct) => {
        if (!isCurrent()) return;
        setPendingImages((prev) =>
          prev.map((p) =>
            p.id === id
              ? { ...p, progress: pct, phase: pct < 12 ? 'preparing' : 'uploading' }
              : p
          )
        );
      });

      if (!isCurrent()) return;
      clearTimeout(slowTimers.current[id]);
      console.log('✅ [SalonCreate][image] upload succeeded', { id, publicUrl });
      setPendingImages((prev) => prev.filter((p) => p.id !== id));
      setFormData((prev) => ({ ...prev, images: [...prev.images, publicUrl] }));
      showToast('Photo added', 'success');
    } catch (error) {
      if (!isCurrent()) return;
      clearTimeout(slowTimers.current[id]);
      const appErr = error as {
        kind?: string;
        code?: string;
        status?: number;
        message?: string;
        requestId?: string;
      };
      console.error('❌ [SalonCreate][image] upload failed', {
        id,
        kind: appErr?.kind,
        code: appErr?.code,
        status: appErr?.status,
        message: appErr?.message,
        requestId: appErr?.requestId,
      });
      // Keep the item (marked failed) so the owner can retry just this photo
      // instead of redoing the whole form.
      setPendingImages((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'failed', slow: false } : p))
      );
      showToast(getUserFacingMessage(error), 'error');
    }
  }, []);

  const retryUpload = useCallback(
    (id: string) => {
      const item = pendingImages.find((p) => p.id === id);
      if (!item) return;
      void startUpload(id, item.localUri);
    },
    [pendingImages, startUpload]
  );

  const removePending = useCallback((id: string) => {
    attemptTokens.current[id] = (attemptTokens.current[id] ?? 0) + 1; // abandon in-flight
    clearTimeout(slowTimers.current[id]);
    delete slowTimers.current[id];
    setPendingImages((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const pickImages = () => {
    const totalCount = formData.images.length + pendingImages.length;
    const remaining = MAX_SALON_IMAGES - totalCount;
    if (remaining <= 0) {
      showToast(`You can add up to ${MAX_SALON_IMAGES} photos`, 'warning');
      return;
    }
    showSalonImagesSourcePicker(remaining, (uris) => {
      uris.slice(0, remaining).forEach((uri, i) => {
        const id = `pending-${Date.now()}-${i}`;
        void startUpload(id, uri);
      });
    });
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  if (isLoading) {
    return (
      <ScreenWrapper variant="stack">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isActivelyUploading = pendingImages.some((p) => p.status === 'uploading');
  const totalImageCount = formData.images.length + pendingImages.length;
  const canAddMore = totalImageCount < MAX_SALON_IMAGES;

  return (
    <ScreenWrapper variant="stack">
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>
            {salon ? venueCopy.editTitle : venueCopy.createCta}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Form */}
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <Input
            label={`${venueCopy.nameLabel} *`}
            value={formData.name}
            onChangeText={(v) => handleChange('name', v)}
            placeholder={venueCopy.namePlaceholder}
            icon={<Ionicons name="storefront-outline" size={20} color={theme.colors.textSecondary} />}
          />
          <Input
            label="Description"
            value={formData.description}
            onChangeText={(v) => handleChange('description', v)}
            placeholder={venueCopy.descriptionPlaceholder}
          />
          <Input
            label="Phone *"
            value={formData.phone}
            onChangeText={(v) => handleChange('phone', v.replace(/\D/g, '').slice(0, 10))}
            placeholder="98765 43210"
            prefix="+91"
            keyboardType="phone-pad"
            maxLength={10}
          />
        </View>

        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.sectionTitle}>Location</Text>
          <Input
            label="Address *"
            value={formData.address}
            onChangeText={(v) => handleChange('address', v)}
            placeholder="Street address"
            icon={<Ionicons name="location-outline" size={20} color={theme.colors.textSecondary} />}
          />
          <Input
            label="City *"
            value={formData.city}
            onChangeText={(v) => handleChange('city', v)}
            placeholder="City name"
          />

          {/* Location preview card — opens full-screen picker */}
          <Text style={styles.mapLabel}>
            {venueCopy.pinLocationHint} <Text style={styles.requiredMark}>*</Text>
          </Text>
          <TouchableOpacity
            style={[styles.locationPreviewCard, !locationSet && styles.locationPreviewCardEmpty]}
            onPress={() => setShowLocationPicker(true)}
            activeOpacity={0.9}
          >
            {locationSet ? (
              <>
                <View style={styles.locationMapPreview} pointerEvents="none">
                  <MapView
                    style={StyleSheet.absoluteFill}
                    region={{
                      latitude: selectedCoords.latitude,
                      longitude: selectedCoords.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    rotateEnabled={false}
                    pitchEnabled={false}
                  >
                    <SalonMapMarker
                      coordinate={selectedCoords}
                      variant="brand"
                      selected
                      showCallout={false}
                    />
                  </MapView>
                </View>
                <View style={styles.locationPreviewFooter}>
                  <View style={styles.coordsBlock}>
                    <Ionicons name="location" size={14} color={theme.colors.primary} />
                    <Text style={styles.coordsText}>
                      {selectedCoords.latitude.toFixed(5)}, {selectedCoords.longitude.toFixed(5)}
                    </Text>
                  </View>
                  <View style={styles.changeLocationBtn}>
                    <Ionicons name="create-outline" size={14} color={theme.colors.primary} />
                    <Text style={styles.changeLocationText}>Change Location</Text>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.locationEmptyState}>
                <Ionicons name="map-outline" size={32} color={theme.colors.primary} />
                <Text style={styles.locationEmptyTitle}>Tap to set your salon location</Text>
                <Text style={styles.locationEmptySubtitle}>
                  Drop a pin on the map so customers can find you. This is required.
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Full-screen location picker modal */}
        <LocationPickerModal
          visible={showLocationPicker}
          initialCoordinates={selectedCoords}
          onConfirm={handleLocationConfirmed}
          onDismiss={() => setShowLocationPicker(false)}
        />

        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.sectionTitle}>Working Hours</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Input
                label="Opening Time"
                value={formData.opening_time}
                onChangeText={(v) => handleChange('opening_time', v)}
                placeholder="09:00"
                icon={<Ionicons name="time-outline" size={20} color={theme.colors.textSecondary} />}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Closing Time"
                value={formData.closing_time}
                onChangeText={(v) => handleChange('closing_time', v)}
                placeholder="21:00"
                icon={<Ionicons name="time-outline" size={20} color={theme.colors.textSecondary} />}
              />
            </View>
          </View>
        </View>

        {salon ? (
          <View style={[styles.card, shadows.sm]}>
            <Text style={styles.sectionTitle}>Business type</Text>
            <Text style={styles.sectionHint}>Customers use this to find you on Discover.</Text>
            <FilterChipRow
              options={SALON_SERVE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              value={formData.gender_serve}
              onChange={(v) => setFormData((prev) => ({ ...prev, gender_serve: v }))}
              testIDPrefix="salon-serve"
            />
          </View>
        ) : null}

        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.sectionTitle}>{venueCopy.imagesSection}</Text>
          <Text style={styles.sectionHint}>Add up to {MAX_SALON_IMAGES} photos.</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.imageRow}
            contentContainerStyle={styles.imageRowContent}
          >
            {formData.images.map((uri, index) => (
              <View key={`uploaded-${uri}-${index}`} style={styles.imageWrapper}>
                <Image source={{ uri }} style={styles.imageThumb} />
                <View style={styles.uploadedBadge}>
                  <Ionicons name="checkmark-circle" size={22} color={theme.colors.success} />
                </View>
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => removeImage(index)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={24} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            ))}
            {pendingImages.map((pending) => (
              <View key={pending.id} style={styles.imageWrapper}>
                <Image source={{ uri: pending.localUri }} style={styles.imageThumb} />
                {pending.status === 'failed' ? (
                  <View style={styles.uploadOverlay}>
                    <Ionicons name="alert-circle" size={22} color="#fff" />
                    <Text style={styles.uploadOverlayText}>Upload failed</Text>
                    <TouchableOpacity
                      style={styles.retryBtn}
                      onPress={() => retryUpload(pending.id)}
                    >
                      <Ionicons name="refresh" size={14} color="#fff" />
                      <Text style={styles.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.uploadOverlay}>
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.uploadOverlayText}>
                      {pending.phase === 'preparing'
                        ? 'Preparing…'
                        : pending.progress > 0
                          ? `Uploading… ${pending.progress}%`
                          : 'Uploading…'}
                    </Text>
                    {pending.slow ? (
                      <TouchableOpacity
                        style={styles.retryBtn}
                        onPress={() => retryUpload(pending.id)}
                      >
                        <Ionicons name="refresh" size={14} color="#fff" />
                        <Text style={styles.retryBtnText}>Retry</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )}
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => removePending(pending.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={24} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            ))}
            {canAddMore ? (
              <TouchableOpacity
                style={styles.addImageBtn}
                onPress={pickImages}
                disabled={isActivelyUploading}
              >
                <Ionicons name="camera" size={28} color={theme.colors.primary} />
                <Text style={styles.addImageText}>Add Photo</Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        </View>

        <Button
          title={salon ? 'Save Changes' : venueCopy.createCta}
          onPress={handleSubmit}
          loading={isSaving}
          disabled={isActivelyUploading || !locationSet}
          style={{ marginTop: spacing.lg }}
        />
        <View style={{ height: TAB_BAR_BASE_HEIGHT + insets.bottom + 40 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
  },
  backButton: {
    padding: spacing.sm,
  },
  title: {
    ...typography.h3,
    color: theme.colors.text,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h4,
    color: theme.colors.text,
    marginBottom: spacing.sm,
  },
  sectionHint: {
    ...typography.bodySmall,
    color: theme.colors.textSecondary,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  mapLabel: {
    ...typography.bodySmall,
    color: theme.colors.textSecondary,
    marginBottom: spacing.sm,
  },
  requiredMark: {
    color: theme.colors.error,
  },
  locationPreviewCardEmpty: {
    borderStyle: 'dashed',
    borderColor: theme.colors.primary,
  },
  locationEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  locationEmptyTitle: {
    ...typography.bodyMedium,
    color: theme.colors.text,
    marginTop: spacing.xs,
  },
  locationEmptySubtitle: {
    ...typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  // Location preview card
  locationPreviewCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  locationMapPreview: {
    height: 200,
    width: '100%',
  },
  locationPreviewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  coordsBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  coordsText: {
    ...typography.caption,
    color: theme.colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  changeLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: borderRadius.sm,
  },
  changeLocationText: {
    ...typography.captionMedium,
    color: theme.colors.primary,
  },
  imageRow: {
    flexDirection: 'row',
  },
  imageRowContent: {
    // The remove button sits at the top-right corner of each thumb; without
    // this padding the horizontal ScrollView clips it (the "cross cut from the
    // top" bug). Padding gives the corner badges room to render fully.
    paddingTop: spacing.sm,
    paddingRight: spacing.sm,
  },
  imageWrapper: {
    marginRight: spacing.md,
    position: 'relative',
  },
  imageThumb: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    zIndex: 2,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  retryBtnText: {
    ...typography.caption,
    color: '#fff',
    fontWeight: '600',
  },
  uploadedBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 2,
  },
  addImageBtn: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  addImageText: {
    ...typography.caption,
    color: theme.colors.primary,
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  uploadOverlayText: {
    ...typography.caption,
    color: '#fff',
  },
});
