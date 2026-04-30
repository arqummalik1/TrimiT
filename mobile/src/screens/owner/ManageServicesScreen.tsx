import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { typography, spacing, borderRadius, shadows, formatPrice } from '../../lib/utils';
import { useTheme, Theme } from '../../theme/ThemeContext';

import api from '../../lib/api';
import { showToast } from '../../store/toastStore';
import { Service, Salon } from '../../types';

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  duration: '30',
};

export default function ManageServicesScreen() {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

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
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ownerSalon'] });
      closeModal();
      showToast('Service created!', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.detail || 'Failed to create service', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof EMPTY_FORM }) => {
      const response = await api.patch(`/api/services/${id}`, {
        name: data.name,
        description: data.description,
        price: parseFloat(data.price),
        duration: parseInt(data.duration),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ownerSalon'] });
      closeModal();
      showToast('Service updated!', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.detail || 'Failed to update service', 'error');
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
    onError: (error: any) => {
      showToast(error.response?.data?.detail || 'Failed to delete service', 'error');
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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!salon) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="storefront-outline" size={64} color={theme.colors.textTertiary} />
          <Text style={styles.emptyTitle}>No Salon Yet</Text>
          <Text style={styles.emptyText}>Create your salon first to manage services.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="pricetag-outline" size={48} color={theme.colors.textTertiary} />
            <Text style={styles.emptyTitle}>No Services</Text>
            <Text style={styles.emptyText}>Add your first service to get started.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.serviceCard, shadows.sm]}>
            <View style={styles.serviceHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.serviceName}>{item.name}</Text>
                {item.description ? (
                  <Text style={styles.serviceDesc} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
              </View>
              <View style={styles.serviceActions}>
                <TouchableOpacity
                  onPress={() => openModal(item)}
                  style={styles.iconBtn}
                >
                  <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(item)}
                  style={styles.iconBtn}
                >
                  <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.serviceMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="cash-outline" size={16} color={theme.colors.textSecondary} />
                <Text style={styles.metaText}>{formatPrice(item.price)}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
                <Text style={styles.metaText}>{item.duration} min</Text>
              </View>
            </View>
          </View>
        )}
      />

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <SafeAreaView style={styles.modalContainer}>
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

              <Button
                title={editingService ? 'Update Service' : 'Create Service'}
                onPress={handleSubmit}
                loading={createMutation.isPending || updateMutation.isPending}
                style={{ marginTop: spacing.lg }}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  serviceCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: spacing.md,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  serviceName: {
    ...typography.bodySemiBold,
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  serviceDesc: {
    ...typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  serviceActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconBtn: {
    padding: spacing.xs,
  },
  serviceMeta: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    ...typography.bodySmallMedium,
    color: theme.colors.textSecondary,
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
});
