import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { ScreenWrapper, TAB_BAR_BASE_HEIGHT } from '../../components/ScreenWrapper';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { ServiceCard } from '../../components/ServiceCard';
import { ServiceListSkeleton } from '../../components/skeletons/ServiceListSkeleton';
import { ImageUploadField } from '../../components/ImageUploadField';
import { OwnerSetupBanner } from '../../components/OwnerSetupBanner';
import { serviceSchema } from '../../lib/validations';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { typography, spacing, borderRadius } from '../../lib/utils';
import { useTheme, Theme } from '../../theme/ThemeContext';
import { salonRepository } from '../../repositories/salonRepository';
import { uploadServiceImage } from '../../services/uploadService';
import { showToast } from '../../store/toastStore';
import { Service, Salon } from '../../types';
import { getUserFacingMessage } from '../../lib/userFacingError';
import { queryKeys } from '../../lib/queryKeys';
import { useOwnerSalonQuery } from '../../hooks/useOwnerSalonQuery';
import { useOwnerOnboardingStore } from '../../store/ownerOnboardingStore';
import type { OwnerTabParamList } from '../../navigation/types';

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  duration: '30',
  image_url: '' as string,
  is_on_offer: false,
  discount_percentage: '',
};

type ServicesRoute = RouteProp<OwnerTabParamList, 'Services'>;

function buildServicePayload(data: typeof EMPTY_FORM) {
  const price = parseFloat(data.price);
  const duration = parseInt(data.duration, 10);
  if (!data.name.trim() || Number.isNaN(price) || price <= 0 || Number.isNaN(duration) || duration <= 0) {
    return null;
  }
  let discount: number | null = null;
  if (data.is_on_offer) {
    if (!data.discount_percentage) return null;
    const parsedDiscount = parseInt(data.discount_percentage, 10);
    if (Number.isNaN(parsedDiscount) || parsedDiscount < 1 || parsedDiscount > 100) {
      return null;
    }
    discount = parsedDiscount;
  }
  return {
    name: data.name.trim(),
    description: data.description.trim() || undefined,
    price,
    duration,
    image_url: data.image_url || null,
    is_on_offer: data.is_on_offer,
    discount_percentage: discount,
  };
}

export default function ManageServicesScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const route = useRoute<ServicesRoute>();
  const navigation = useNavigation<BottomTabNavigationProp<OwnerTabParamList, 'Services'>>();
  const queryClient = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [showSetupBanner, setShowSetupBanner] = useState(false);

  const { data: salon, isLoading, isError, error, refetch, isRefetching } = useOwnerSalonQuery();

  const openModal = useCallback((service?: Service) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        description: service.description || '',
        price: String(service.price),
        duration: String(service.duration),
        image_url: service.image_url || '',
        is_on_offer: service.is_on_offer ?? false,
        discount_percentage: service.discount_percentage
          ? String(service.discount_percentage)
          : '',
      });
    } else {
      setEditingService(null);
      setFormData(EMPTY_FORM);
    }
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setEditingService(null);
    setFormData(EMPTY_FORM);
  }, []);

  useEffect(() => {
    const fromStore = useOwnerOnboardingStore.getState().consumePostSalonCreate();
    const fromRoute = route.params?.openAddService === true;
    if (fromStore || fromRoute) {
      // Set the next step pending
      useOwnerOnboardingStore.getState().setBankDetailsPending(true);
      setShowSetupBanner(true);
      openModal();
      navigation.setParams({ openAddService: undefined });
    }
  }, [route.params?.openAddService, openModal, navigation]);

  const patchSalonServices = useCallback(
    (updater: (services: Service[]) => Service[]) => {
      queryClient.setQueryData<Salon | null>(queryKeys.ownerSalon, (prev) => {
        if (!prev) return prev ?? null;
        const prevServices = Array.isArray(prev.services) ? prev.services : [];
        return { ...prev, services: updater(prevServices) };
      });
    },
    [queryClient]
  );

  const createMutation = useMutation({
    mutationFn: async (data: typeof EMPTY_FORM) => {
      const payload = buildServicePayload(data);
      if (!payload || !salon?.id) {
        throw { kind: 'validation' as const, message: 'Please fill in name, price, and duration.' };
      }
      return salonRepository.createService(salon.id, payload);
    },
    onSuccess: (created: Service) => {
      patchSalonServices((list) => {
        if (list.some((s) => s.id === created.id)) return list;
        return [created, ...list];
      });
      setShowSetupBanner(false);
      closeModal();
      showToast('Service created!', 'success');

      // If they just created their first service during onboarding, guide to Bank Details
      if (useOwnerOnboardingStore.getState().bankDetailsPending) {
        navigation.navigate('Settings', { screen: 'BankDetails' });
      }
    },
    onError: (err: unknown) => {
      showToast(getUserFacingMessage(err), 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof EMPTY_FORM }) => {
      const payload = buildServicePayload(data);
      if (!payload || !salon?.id) {
        throw { kind: 'validation' as const, message: 'Please fill in name, price, and duration.' };
      }
      return salonRepository.updateService(salon.id, id, payload);
    },
    onSuccess: (updated: Service) => {
      patchSalonServices((list) => list.map((s) => (s.id === updated.id ? updated : s)));
      closeModal();
      showToast('Service updated!', 'success');
    },
    onError: (err: unknown) => {
      showToast(getUserFacingMessage(err), 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!salon?.id) return;
      await salonRepository.deleteService(salon.id, id);
      return id;
    },
    onSuccess: (deletedId) => {
      if (deletedId) {
        patchSalonServices((list) => list.filter((s) => s.id !== deletedId));
      }
      showToast('Service deleted', 'info');
    },
    onError: (err: unknown) => {
      showToast(getUserFacingMessage(err), 'error');
    },
  });

  const handleSubmit = () => {
    const duration = parseInt(formData.duration, 10);
    const discount = formData.discount_percentage ? parseInt(formData.discount_percentage, 10) : undefined;

    const parseResult = serviceSchema.safeParse({
      name: formData.name,
      price: parseFloat(formData.price),
      duration: duration,
      is_on_offer: formData.is_on_offer,
      discount_percentage: discount,
    });

    if (!parseResult.success) {
      showToast(parseResult.error.issues[0].message, 'error');
      return;
    }

    const payload = buildServicePayload({
      ...formData,
      name: parseResult.data.name,
      price: parseResult.data.price.toString(),
      duration: parseResult.data.duration.toString(),
      discount_percentage: parseResult.data.discount_percentage?.toString() || '',
    });
    if (!payload) {
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

  const handleImageUpload = useCallback(
    (localUri: string, onProgress: (pct: number) => void) =>
      uploadServiceImage(localUri, onProgress),
    []
  );

  const services = salon?.services || [];
  const isSaving = createMutation.isPending || updateMutation.isPending;

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

  if (isError) {
    return (
      <ScreenWrapper variant="tab">
        <ErrorState
          title="Could not load services"
          message={getUserFacingMessage(error)}
          onRetry={() => refetch()}
        />
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
      <View style={styles.header}>
        <Text style={styles.title}>Services</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
          <Ionicons name="add" size={22} color={theme.colors.background} />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {showSetupBanner && services.length === 0 ? (
        <OwnerSetupBanner
          title="Salon created — nice work!"
          message="Customers book services, not just salons. Add your first service with a photo and price to go live."
          ctaLabel="Add your first service"
          onPress={() => openModal()}
          onDismiss={() => setShowSetupBanner(false)}
        />
      ) : null}

      <FlatList
        data={services}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: TAB_BAR_BASE_HEIGHT + insets.bottom + 16 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="pricetag-outline" size={48} color={theme.colors.textTertiary} />
            <Text style={styles.emptyTitle}>No Services Yet</Text>
            <Text style={styles.emptyText}>
              Add haircuts, styling, and other services so customers can book you.
            </Text>
            <Button
              title="Add your first service"
              onPress={() => openModal()}
              style={{ marginTop: spacing.lg }}
            />
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
              <TouchableOpacity onPress={closeModal} accessibilityLabel="Close">
                <Ionicons name="close" size={28} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
            >
              {!editingService && showSetupBanner ? (
                <View style={styles.modalHint}>
                  <Ionicons name="information-circle" size={18} color={theme.colors.primary} />
                  <Text style={styles.modalHintText}>
                    Tip: Add a clear photo, fair price, and realistic duration — customers see this
                    when booking.
                  </Text>
                </View>
              ) : null}

              <ImageUploadField
                label="Service Photo"
                value={formData.image_url}
                onChange={(url) => setFormData((p) => ({ ...p, image_url: url }))}
                onUpload={handleImageUpload}
                disabled={isSaving}
              />

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
                    icon={
                      <Ionicons name="cash-outline" size={20} color={theme.colors.textSecondary} />
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Duration (min) *"
                    value={formData.duration}
                    onChangeText={(v) => setFormData({ ...formData, duration: v })}
                    placeholder="30"
                    keyboardType="numeric"
                    icon={
                      <Ionicons name="time-outline" size={20} color={theme.colors.textSecondary} />
                    }
                  />
                </View>
              </View>

              <View style={styles.offerSection}>
                <View style={styles.offerHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.offerTitle}>On Offer</Text>
                    <Text style={styles.offerSubtitle}>
                      Show a discount badge on this service
                    </Text>
                  </View>
                  <Switch
                    value={formData.is_on_offer}
                    onValueChange={(v) =>
                      setFormData((p) => ({
                        ...p,
                        is_on_offer: v,
                        discount_percentage: v ? p.discount_percentage : '',
                      }))
                    }
                    trackColor={{
                      false: theme.colors.border,
                      true: theme.colors.primary + '80',
                    }}
                    thumbColor={formData.is_on_offer ? theme.colors.primary : '#f4f3f4'}
                  />
                </View>
                {formData.is_on_offer ? (
                  <Input
                    label="Discount %"
                    value={formData.discount_percentage}
                    onChangeText={(v) => setFormData((p) => ({ ...p, discount_percentage: v }))}
                    placeholder="e.g. 20"
                    keyboardType="numeric"
                    icon={
                      <Ionicons
                        name="pricetag-outline"
                        size={20}
                        color={theme.colors.textSecondary}
                      />
                    }
                  />
                ) : null}
              </View>

              <Button
                title={editingService ? 'Update Service' : 'Create Service'}
                onPress={handleSubmit}
                loading={isSaving}
                disabled={isSaving}
                style={{ marginTop: spacing.lg }}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </ScreenWrapper>
      </Modal>
    </ScreenWrapper>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
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
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: spacing.xxxxl,
      paddingHorizontal: spacing.xl,
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
    modalHint: {
      flexDirection: 'row',
      gap: spacing.sm,
      backgroundColor: theme.colors.primaryLight,
      padding: spacing.md,
      borderRadius: borderRadius.md,
      marginBottom: spacing.lg,
      alignItems: 'flex-start',
    },
    modalHintText: {
      ...typography.bodySmall,
      color: theme.colors.textSecondary,
      flex: 1,
      lineHeight: 20,
    },
    row: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    offerSection: {
      backgroundColor: theme.colors.surfaceSecondary,
      borderRadius: theme.borderRadius.lg,
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
