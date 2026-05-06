import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWrapper, TAB_BAR_BASE_HEIGHT } from '../../components/ScreenWrapper';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { ServiceCard } from '../../components/ServiceCard';
import { ServiceListSkeleton } from '../../components/skeletons/ServiceListSkeleton';
import { typography, spacing, borderRadius, shadows, formatPrice } from '../../lib/utils';
import { useTheme, Theme } from '../../theme/ThemeContext';

import api from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../store/toastStore';
import { Service, Salon } from '../../types';
import { isAppError } from '../../types/error';
import { handleApiError } from '../../lib/errorHandler';
import axios from 'axios';

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  duration: '30',
  image_url: '' as string,
  is_on_offer: false,
  discount_percentage: '',
};

export default function ManageServicesScreen() {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);

  const { data: salon, isLoading, refetch, isRefetching } = useQuery<Salon | null>({
    queryKey: ['ownerSalon'],
    queryFn: async () => {
      try {
        const response = await api.get('/owner/salon');
        if (__DEV__) {
          const svcCount = Array.isArray(response.data?.services) ? response.data.services.length : 0;
          console.log('🧾 [OWNER_SALON][RES]', { salonId: response.data?.id, servicesCount: svcCount });
        }
        return response.data;
      } catch (e: unknown) {
        const err = e as { response?: { status?: number } };
        if (err.response?.status === 404) return null;
        throw e;
      }
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof EMPTY_FORM) => {
      const payload = {
        name: data.name,
        description: data.description,
        price: parseFloat(data.price),
        duration: parseInt(data.duration),
        image_url: data.image_url || null,
        is_on_offer: data.is_on_offer,
        discount_percentage:
          data.is_on_offer && data.discount_percentage ? parseInt(data.discount_percentage) : null,
      };

      // #region agent log
      if (__DEV__) {
        console.log('🛠️ [SERVICE][CREATE][REQ]', {
          baseURL: (api as any)?.defaults?.baseURL,
          salonId: salon?.id,
          hasImageUrl: !!payload.image_url,
          imageUrlPrefix: typeof payload.image_url === 'string' ? payload.image_url.slice(0, 32) : null,
          isOnOffer: payload.is_on_offer,
          hasDiscount: payload.discount_percentage !== null,
          duration: payload.duration,
          price: payload.price,
        });
      }
      // #endregion

      try {
        const response = await api.post(`/salons/${salon!.id}/services`, payload);
        // #region agent log
        if (__DEV__) {
          console.log('✅ [SERVICE][CREATE][RES]', {
            status: response.status,
            salonId: salon?.id,
            serviceId: response.data?.id,
          });
        }
        // #endregion
        return response.data;
      } catch (err: unknown) {
        // #region agent log
        if (__DEV__) {
          const ax = axios.isAxiosError(err) ? err : null;
          const appErr = isAppError(err) ? err : null;
          console.log('❌ [SERVICE][CREATE][ERR_RAW]', {
            salonId: salon?.id,
            isAxiosError: axios.isAxiosError(err),
            message: (err as any)?.message,
            code: ax?.code,
            status: ax?.response?.status,
            responseDetail: ax?.response?.data?.detail,
            normalized: appErr
              ? {
                  kind: appErr.kind,
                  message: appErr.message,
                  code: appErr.code,
                  status: appErr.status,
                  requestId: appErr.requestId,
                  details: appErr.details,
                }
              : null,
          });
        }
        // #endregion
        throw err;
      }
    },
    onSuccess: (created: Service) => {
      // Update cache immediately so the list updates even before network refetch finishes.
      queryClient.setQueryData(['ownerSalon'], (prev: Salon | null | undefined) => {
        if (!prev) return prev ?? null;
        const prevServices = Array.isArray(prev.services) ? prev.services : [];
        const exists = prevServices.some((s) => s.id === created.id);
        if (exists) return prev;
        return { ...prev, services: [created, ...prevServices] };
      });

      queryClient.invalidateQueries({ queryKey: ['ownerSalon'] });
      refetch();
      closeModal();
      showToast('Service created!', 'success');
    },
    onError: (error: unknown) => {
      const appErr = handleApiError(error);
      showToast(appErr.message, 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof EMPTY_FORM }) => {
      const response = await api.patch(`/salons/${salon!.id}/services/${id}`, {
        name: data.name,
        description: data.description,
        price: parseFloat(data.price),
        duration: parseInt(data.duration),
        image_url: data.image_url || null,
        is_on_offer: data.is_on_offer,
        discount_percentage: data.is_on_offer && data.discount_percentage
          ? parseInt(data.discount_percentage)
          : null,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ownerSalon'] });
      refetch();
      closeModal();
      showToast('Service updated!', 'success');
    },
    onError: (error: unknown) => {
      const appErr = handleApiError(error);
      showToast(appErr.message, 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/salons/${salon!.id}/services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ownerSalon'] });
      refetch();
      showToast('Service deleted', 'info');
    },
    onError: (error: unknown) => {
      const appErr = handleApiError(error);
      showToast(appErr.message, 'error');
    },
  });

  const openModal = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        description: service.description || '',
        price: String(service.price),
        duration: String(service.duration),
        image_url: service.image_url || '',
        is_on_offer: service.is_on_offer ?? false,
        discount_percentage: service.discount_percentage ? String(service.discount_percentage) : '',
      });
    } else {
      setEditingService(null);
      setFormData(EMPTY_FORM);
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingService(null);
    setFormData(EMPTY_FORM);
  };

  // ── Image picker helpers (mirrors ManageSalonScreen pattern) ──────────────
  const pickServiceImage = () => {
    Alert.alert(
      'Service Photo',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: () => launchCamera() },
        { text: 'Choose from Gallery', onPress: () => launchGallery() },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const launchCamera = async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert('Permission Required', 'Please allow camera access to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [16, 9],
      exif: false,
    });
    if (!result.canceled && result.assets[0]) {
      await uploadServiceImage(result.assets[0].uri);
    }
  };

  const launchGallery = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [16, 9],
      exif: false,
    });
    if (!result.canceled && result.assets[0]) {
      await uploadServiceImage(result.assets[0].uri);
    }
  };

  const uploadServiceImage = async (uri: string) => {
    setUploading(true);
    try {
      if (__DEV__) {
        console.log('🖼️ [SERVICE][IMG][UPLOAD][START]', { uriPrefix: uri.slice(0, 32) });
      }

      // Normalize image size/format before upload (Expo Go compatible).
      // Prevents huge uploads + ensures consistent JPEG thumbnails across devices.
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1280 } }],
        { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
      );
      if (__DEV__) {
        console.log('🖼️ [SERVICE][IMG][MANIPULATED]', {
          uriPrefix: manipulated.uri.slice(0, 32),
          width: manipulated.width,
          height: manipulated.height,
        });
      }

      // Android Expo Go can be flaky with fetch(file://...).blob() for uploads.
      // Read file as base64 and convert to bytes for a stable upload.
      const base64 = await FileSystem.readAsStringAsync(manipulated.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      // base64 -> Uint8Array
      const binary = globalThis.atob ? globalThis.atob(base64) : atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      const fileName = `services/service-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

      const { data, error } = await supabase.storage
        .from('salon-images')
        .upload(fileName, bytes, { contentType: 'image/jpeg' });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('salon-images')
        .getPublicUrl(data.path);

      setFormData((prev) => ({ ...prev, image_url: urlData.publicUrl }));
      if (__DEV__) {
        console.log('🖼️ [SERVICE][IMG][UPLOAD][DONE]', {
          path: data.path,
          publicUrlPrefix: urlData.publicUrl?.slice(0, 48),
        });
      }
      showToast('Image uploaded!', 'success');
    } catch (error: unknown) {
      const appErr = handleApiError(error);
      if (__DEV__) {
        console.log('🖼️ [SERVICE][IMG][UPLOAD][FAIL]', {
          message: appErr.message,
          kind: appErr.kind,
          code: appErr.code,
          status: appErr.status,
          details: appErr.details,
        });
      }
      showToast(appErr.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.price || !formData.duration) {
      showToast('Please fill in name, price, and duration', 'error');
      return;
    }
    if (editingService) {
      updateMutation.mutate({ id: editingService.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (service: Service) => {
    Alert.alert(
      'Delete Service',
      `Are you sure you want to delete "${service.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(service.id),
        },
      ]
    );
  };

  const services = salon?.services || [];

  if (isLoading) {
    return (
      <ScreenWrapper variant="tab">
        <View style={styles.header}>
          <Text style={styles.title}>Services</Text>
        </View>
        <View style={styles.skeletonContainer}>
          <ServiceListSkeleton count={3} />
        </View>
      </ScreenWrapper>
    );
  }

  if (!salon) {
    return (
      <ScreenWrapper variant="tab">
        <View style={styles.emptyContainer}>
          <Ionicons name="storefront-outline" size={64} color={theme.colors.textTertiary} />
          <Text style={styles.emptyTitle}>No Salon Yet</Text>
          <Text style={styles.emptyText}>Create your salon first to manage services.</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper variant="tab">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Services</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
          <Ionicons name="add" size={22} color={theme.colors.background} />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={services}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: TAB_BAR_BASE_HEIGHT + insets.bottom + 16 }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="pricetag-outline" size={48} color={theme.colors.textTertiary} />
            <Text style={styles.emptyTitle}>No Services</Text>
            <Text style={styles.emptyText}>Add your first service to get started.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <ServiceCard
            service={item}
            variant="owner"
            onPress={() => openModal(item)}
            onEdit={() => openModal(item)}
            onDelete={() => handleDelete(item)}
          />
        )}
      />

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <ScreenWrapper variant="modal">
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingService ? 'Edit Service' : 'Add Service'}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={28} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* ── Service Photo picker ── */}
              <Text style={styles.photoLabel}>Service Photo</Text>
              <View style={styles.photoRow}>
                {formData.image_url ? (
                  <View style={styles.photoPreviewWrapper}>
                    <Image
                      source={{ uri: formData.image_url }}
                      style={styles.photoPreview}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={styles.photoRemoveBtn}
                      onPress={() => setFormData((p) => ({ ...p, image_url: '' }))}
                    >
                      <Ionicons name="close-circle" size={22} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                ) : null}
                <TouchableOpacity
                  style={styles.photoPickerBtn}
                  onPress={pickServiceImage}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator color={theme.colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="camera" size={26} color={theme.colors.primary} />
                      <Text style={styles.photoPickerText}>
                        {formData.image_url ? 'Change' : 'Add Photo'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <Input
                label="Service Name *"
                value={formData.name}
                onChangeText={(v) => setFormData({ ...formData, name: v })}
                placeholder="e.g., Haircut"
                icon={<Ionicons name="cut-outline" size={20} color={theme.colors.textSecondary} />}
              />
              <Input
                label="Description"
                value={formData.description}
                onChangeText={(v) => setFormData({ ...formData, description: v })}
                placeholder="Describe the service"
              />
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Price (INR) *"
                    value={formData.price}
                    onChangeText={(v) => setFormData({ ...formData, price: v })}
                    placeholder="500"
                    keyboardType="numeric"
                    icon={<Ionicons name="cash-outline" size={20} color={theme.colors.textSecondary} />}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Duration (min) *"
                    value={formData.duration}
                    onChangeText={(v) => setFormData({ ...formData, duration: v })}
                    placeholder="30"
                    keyboardType="numeric"
                    icon={<Ionicons name="time-outline" size={20} color={theme.colors.textSecondary} />}
                  />
                </View>
              </View>

              {/* ── Offer section ── */}
              <View style={styles.offerSection}>
                <View style={styles.offerHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.offerTitle}>On Offer</Text>
                    <Text style={styles.offerSubtitle}>Show a discount badge on this service</Text>
                  </View>
                  <Switch
                    value={formData.is_on_offer}
                    onValueChange={(v) => setFormData((p) => ({ ...p, is_on_offer: v, discount_percentage: v ? p.discount_percentage : '' }))}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary + '80' }}
                    thumbColor={formData.is_on_offer ? theme.colors.primary : '#f4f3f4'}
                  />
                </View>
                {formData.is_on_offer && (
                  <Input
                    label="Discount %"
                    value={formData.discount_percentage}
                    onChangeText={(v) => setFormData((p) => ({ ...p, discount_percentage: v }))}
                    placeholder="e.g. 20"
                    keyboardType="numeric"
                    icon={<Ionicons name="pricetag-outline" size={20} color={theme.colors.textSecondary} />}
                  />
                )}
              </View>

              <Button
                title={editingService ? 'Update Service' : 'Create Service'}
                onPress={handleSubmit}
                loading={createMutation.isPending || updateMutation.isPending}
                disabled={uploading}
                style={{ marginTop: spacing.lg }}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </ScreenWrapper>
      </Modal>
    </ScreenWrapper>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  skeletonContainer: {
    paddingHorizontal: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: theme.colors.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  addButtonText: {
    ...typography.buttonSmall,
    color: theme.colors.background,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxxl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxxl,
    gap: spacing.md,
  },
  emptyTitle: {
    ...typography.h3,
    color: theme.colors.text,
  },
  emptyText: {
    ...typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    ...typography.h3,
    color: theme.colors.text,
  },
  modalContent: {
    padding: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  // ── Photo picker ──
  photoLabel: {
    ...typography.bodySmallMedium,
    color: theme.colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  photoRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'flex-start',
  },
  photoPreviewWrapper: {
    position: 'relative',
  },
  photoPreview: {
    width: 90,
    height: 90,
    borderRadius: borderRadius.md,
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: theme.colors.surface,
    borderRadius: 11,
  },
  photoPickerBtn: {
    width: 90,
    height: 90,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoPickerText: {
    ...typography.caption,
    color: theme.colors.primary,
  },
  // ── Offer section ──
  offerSection: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  offerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  offerTitle: {
    ...typography.bodySemiBold,
    color: theme.colors.text,
  },
  offerSubtitle: {
    ...typography.caption,
    color: theme.colors.textSecondary,
  },
});
