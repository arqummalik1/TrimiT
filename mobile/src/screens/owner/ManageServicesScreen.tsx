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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWrapper, TAB_BAR_BASE_HEIGHT } from '../../components/ScreenWrapper';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
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
import { handleApiError } from '../../lib/errorHandler';

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

  const { data: salon, isLoading } = useQuery<Salon | null>({
    queryKey: ['ownerSalon'],
    queryFn: async () => {
      const response = await api.get('/api/owner/salon');
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof EMPTY_FORM) => {
      const response = await api.post(`/api/salons/${salon!.id}/services`, {
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
      const response = await api.patch(`/api/services/${id}`, {
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
      await api.delete(`/api/services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ownerSalon'] });
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
    });
    if (!result.canceled && result.assets[0]) {
      await uploadServiceImage(result.assets[0].uri);
    }
  };

  const uploadServiceImage = async (uri: string) => {
    setUploading(true);
    try {
      const fileName = `service-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const response = await fetch(uri);
      const blob = await response.blob();

      const { data, error } = await supabase.storage
        .from('salon-images')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('salon-images')
        .getPublicUrl(data.path);

      setFormData((prev) => ({ ...prev, image_url: urlData.publicUrl }));
      showToast('Image uploaded!', 'success');
    } catch {
      showToast('Failed to upload image. Please try again.', 'error');
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
