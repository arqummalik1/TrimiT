import React, { useState, useEffect, useCallback } from 'react';
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
import { ScreenWrapper } from '../../components/ScreenWrapper';
import MapView from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showSalonImageSourcePicker } from '../../lib/imageUploadPrep';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { typography, spacing, borderRadius, shadows } from '../../lib/utils';
import { useTheme, Theme } from '../../theme/ThemeContext';

import { showToast } from '../../store/toastStore';
import { Salon } from '../../types';
import { getUserFacingMessage } from '../../lib/userFacingError';
import { salonRepository } from '../../repositories/salonRepository';
import { queryKeys } from '../../lib/queryKeys';
import { navigateOwnerToServices, resetOwnerDashboardToMain } from '../../lib/ownerNavigation';
import { useOwnerOnboardingStore } from '../../store/ownerOnboardingStore';
import { uploadServiceImage } from '../../services/uploadService';
import { normalizeSalon } from '../../lib/salonImage';
import { OwnerDashboardScreenProps, OwnerSettingsScreenProps } from '../../navigation/types';
import { LocationPickerModal } from '../../components/LocationPickerModal';
import { SalonMapMarker } from '../../components/SalonMapMarker';
import type { Coordinates } from '../../lib/maps';

type ManageSalonProps = OwnerDashboardScreenProps<'ManageSalon'> | OwnerSettingsScreenProps<'ManageSalon'>;

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
}

export default function ManageSalonScreen({ navigation }: ManageSalonProps) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const queryClient = useQueryClient();

  const { data: salon, isLoading } = useQuery<Salon | null>({
    queryKey: queryKeys.ownerSalon,
    queryFn: () => salonRepository.getOwnerSalon(),
    staleTime: 30_000,
  });

  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [pendingImages, setPendingImages] = useState<
    { id: string; localUri: string; progress: number; phase: 'preparing' | 'uploading' }[]
  >([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    latitude: '28.6139',
    longitude: '77.2090',
    phone: '',
    opening_time: '09:00',
    closing_time: '21:00',
    images: [] as string[],
  });

  const selectedCoords: Coordinates = {
    latitude: parseFloat(formData.latitude) || 28.6139,
    longitude: parseFloat(formData.longitude) || 77.209,
  };

  const handleLocationConfirmed = useCallback((coords: Coordinates) => {
    setFormData((prev) => ({
      ...prev,
      latitude: coords.latitude.toFixed(6),
      longitude: coords.longitude.toFixed(6),
    }));
    setShowLocationPicker(false);
  }, []);

  useEffect(() => {
    if (salon) {
      const normalized = normalizeSalon(salon);
      setFormData({
        name: normalized.name || '',
        description: normalized.description || '',
        address: normalized.address || '',
        city: normalized.city || '',
        latitude: String(normalized.latitude || 28.6139),
        longitude: String(normalized.longitude || 77.2090),
        phone: normalized.phone || '',
        opening_time: normalized.opening_time || '09:00',
        closing_time: normalized.closing_time || '21:00',
        images: normalized.images,
      });
    }
  }, [salon]);

  const createMutation = useMutation({
    mutationFn: (data: SalonPayload) => salonRepository.createSalon(data),
    onSuccess: (created: Salon) => {
      queryClient.setQueryData(queryKeys.ownerSalon, created);
      void queryClient.invalidateQueries({ queryKey: ['ownerAnalytics'] });
      useOwnerOnboardingStore.getState().setPostSalonCreatePending(true);
      showToast('Your salon has been created successfully!', 'success');
      resetOwnerDashboardToMain(navigation);
      if (!navigateOwnerToServices(navigation, { openAddService: true })) {
        navigation.goBack();
      }
    },
    onError: (error) => {
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
    if (pendingImages.length > 0) {
      showToast('Please wait for images to finish uploading', 'warning');
      return;
    }

    if (!formData.name || !formData.address || !formData.city || !formData.phone) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    const payload = {
      ...formData,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      image_url: formData.images[0] || null,
    };

    if (salon) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const uploadImage = async (uri: string) => {
    const pendingId = `pending-${Date.now()}`;
    setPendingImages((prev) => [...prev, { id: pendingId, localUri: uri, progress: 0, phase: 'preparing' }]);

    try {
      const publicUrl = await uploadServiceImage(uri, (pct) => {
        setPendingImages((prev) =>
          prev.map((p) =>
            p.id === pendingId
              ? { ...p, progress: pct, phase: pct < 12 ? 'preparing' : 'uploading' }
              : p
          )
        );
      });

      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, publicUrl],
      }));
      showToast('Image uploaded successfully', 'success');
    } catch (error) {
      showToast(getUserFacingMessage(error), 'error');
    } finally {
      setPendingImages((prev) => prev.filter((p) => p.id !== pendingId));
    }
  };

  const pickImage = () => {
    if (pendingImages.length > 0) {
      return;
    }
    showSalonImageSourcePicker((uri) => {
      void uploadImage(uri);
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
  const isUploading = pendingImages.length > 0;

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
            {salon ? 'Edit Salon' : 'Create Salon'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Form */}
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <Input
            label="Salon Name *"
            value={formData.name}
            onChangeText={(v) => handleChange('name', v)}
            placeholder="Enter salon name"
            icon={<Ionicons name="storefront-outline" size={20} color={theme.colors.textSecondary} />}
          />
          <Input
            label="Description"
            value={formData.description}
            onChangeText={(v) => handleChange('description', v)}
            placeholder="Describe your salon"
          />
          <Input
            label="Phone *"
            value={formData.phone}
            onChangeText={(v) => handleChange('phone', v)}
            placeholder="+91 98765 43210"
            keyboardType="phone-pad"
            icon={<Ionicons name="call-outline" size={20} color={theme.colors.textSecondary} />}
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
          <Text style={styles.mapLabel}>Pin your exact salon location on the map</Text>
          <TouchableOpacity
            style={styles.locationPreviewCard}
            onPress={() => setShowLocationPicker(true)}
            activeOpacity={0.9}
          >
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

        {/* Images */}
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.sectionTitle}>Salon Images</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageRow}>
            {formData.images.map((uri, index) => (
              <View key={`uploaded-${uri}-${index}`} style={styles.imageWrapper}>
                <Image source={{ uri }} style={styles.imageThumb} />
                <View style={styles.uploadedBadge}>
                  <Ionicons name="checkmark-circle" size={22} color={theme.colors.success} />
                </View>
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => removeImage(index)}
                >
                  <Ionicons name="close-circle" size={24} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            ))}
            {pendingImages.map((pending) => (
              <View key={pending.id} style={styles.imageWrapper}>
                <Image source={{ uri: pending.localUri }} style={styles.imageThumb} />
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.uploadOverlayText}>
                    {pending.phase === 'preparing'
                      ? 'Preparing…'
                      : pending.progress > 0
                        ? `Uploading… ${pending.progress}%`
                        : 'Uploading…'}
                  </Text>
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.addImageBtn} onPress={pickImage} disabled={isUploading}>
              <Ionicons name="camera" size={28} color={theme.colors.primary} />
              <Text style={styles.addImageText}>Add Photo</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <Button
          title={salon ? 'Save Changes' : 'Create Salon'}
          onPress={handleSubmit}
          loading={isSaving}
          disabled={isUploading}
          style={{ marginTop: spacing.lg, marginBottom: spacing.xxxxl }}
        />
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
    marginBottom: spacing.lg,
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
    top: -8,
    right: -8,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
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
