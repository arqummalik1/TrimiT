import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
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
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { typography, spacing, borderRadius, formatPrice } from '../../lib/utils';
import { useTheme, Theme } from '../../theme/ThemeContext';
import { format } from 'date-fns';

import api from '../../lib/api';
import { showToast } from '../../store/toastStore';
import { handleApiError } from '../../lib/errorHandler';

interface Promotion {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'flat' | 'percent';
  discount_value: number;
  max_discount: number | null;
  min_order_value: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
}

const EMPTY_FORM = {
  code: '',
  description: '',
  discount_type: 'percent' as 'flat' | 'percent',
  discount_value: '',
  max_discount: '',
  min_order_value: '',
  max_uses: '',
  expires_at: '',
  active: true,
};

export default function PromoManagementScreen() {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const { data: promotions = [], isLoading } = useQuery<Promotion[]>({
    queryKey: ['ownerPromotions'],
    queryFn: async () => {
      const response = await api.get('/api/v1/promotions/owner');
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof EMPTY_FORM) => {
      const response = await api.post('/api/v1/promotions', {
        code: data.code.toUpperCase(),
        description: data.description || null,
        discount_type: data.discount_type,
        discount_value: parseFloat(data.discount_value),
        max_discount: data.max_discount ? parseFloat(data.max_discount) : null,
        min_order_value: data.min_order_value ? parseFloat(data.min_order_value) : 0,
        max_uses: data.max_uses ? parseInt(data.max_uses) : null,
        expires_at: data.expires_at || null,
        active: data.active,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ownerPromotions'] });
      closeModal();
      showToast('Promo code created!', 'success');
    },
    onError: (error: unknown) => {
      const appErr = handleApiError(error);
      showToast(appErr.message, 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof EMPTY_FORM }) => {
      const response = await api.patch(`/api/v1/promotions/${id}`, {
        description: data.description || null,
        max_discount: data.max_discount ? parseFloat(data.max_discount) : null,
        min_order_value: data.min_order_value ? parseFloat(data.min_order_value) : 0,
        max_uses: data.max_uses ? parseInt(data.max_uses) : null,
        expires_at: data.expires_at || null,
        active: data.active,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ownerPromotions'] });
      closeModal();
      showToast('Promo code updated!', 'success');
    },
    onError: (error: unknown) => {
      const appErr = handleApiError(error);
      showToast(appErr.message, 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/promotions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ownerPromotions'] });
      showToast('Promo code deactivated', 'info');
    },
    onError: (error: unknown) => {
      const appErr = handleApiError(error);
      showToast(appErr.message, 'error');
    },
  });

  const openModal = useCallback((promo?: Promotion) => {
    if (promo) {
      setEditingPromo(promo);
      setFormData({
        code: promo.code,
        description: promo.description || '',
        discount_type: promo.discount_type,
        discount_value: String(promo.discount_value),
        max_discount: promo.max_discount ? String(promo.max_discount) : '',
        min_order_value: String(promo.min_order_value),
        max_uses: promo.max_uses ? String(promo.max_uses) : '',
        expires_at: promo.expires_at || '',
        active: promo.active,
      });
    } else {
      setEditingPromo(null);
      setFormData(EMPTY_FORM);
    }
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setEditingPromo(null);
    setFormData(EMPTY_FORM);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!formData.code || !formData.discount_value) {
      showToast('Please fill in code and discount value', 'error');
      return;
    }
    if (editingPromo) {
      updateMutation.mutate({ id: editingPromo.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  }, [formData, editingPromo, createMutation, updateMutation]);

  const handleDelete = useCallback((promo: Promotion) => {
    Alert.alert(
      'Deactivate Promo Code',
      `Are you sure you want to deactivate "${promo.code}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(promo.id),
        },
      ]
    );
  }, [deleteMutation]);

  const renderPromoCard = useCallback(({ item }: { item: Promotion }) => {
    const isExpired = item.expires_at && new Date(item.expires_at) < new Date();
    const usagePercent = item.max_uses ? (item.used_count / item.max_uses) * 100 : 0;

    return (
      <TouchableOpacity
        style={[styles.promoCard, !item.active && styles.promoCardInactive]}
        onPress={() => openModal(item)}
      >
        <View style={styles.promoHeader}>
          <View style={styles.promoCodeBadge}>
            <Ionicons name="ticket" size={16} color={theme.colors.primary} />
            <Text style={styles.promoCodeText}>{item.code}</Text>
          </View>
          {!item.active && (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveBadgeText}>Inactive</Text>
            </View>
          )}
          {isExpired && (
            <View style={[styles.inactiveBadge, { backgroundColor: theme.colors.error + '20' }]}>
              <Text style={[styles.inactiveBadgeText, { color: theme.colors.error }]}>Expired</Text>
            </View>
          )}
        </View>

        {item.description && (
          <Text style={styles.promoDescription}>{item.description}</Text>
        )}

        <View style={styles.promoDetails}>
          <View style={styles.promoDetailRow}>
            <Ionicons name="pricetag-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.promoDetailText}>
              {item.discount_type === 'percent'
                ? `${item.discount_value}% off`
                : `${formatPrice(item.discount_value)} off`}
              {item.max_discount && ` (max ${formatPrice(item.max_discount)})`}
            </Text>
          </View>

          {item.min_order_value > 0 && (
            <View style={styles.promoDetailRow}>
              <Ionicons name="cart-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.promoDetailText}>
                Min order: {formatPrice(item.min_order_value)}
              </Text>
            </View>
          )}

          <View style={styles.promoDetailRow}>
            <Ionicons name="people-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.promoDetailText}>
              Used: {item.used_count}{item.max_uses ? ` / ${item.max_uses}` : ''}
            </Text>
          </View>

          {item.expires_at && (
            <View style={styles.promoDetailRow}>
              <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.promoDetailText}>
                Expires: {format(new Date(item.expires_at), 'MMM d, yyyy')}
              </Text>
            </View>
          )}
        </View>

        {item.max_uses && (
          <View style={styles.usageBarContainer}>
            <View style={styles.usageBar}>
              <View
                style={[
                  styles.usageBarFill,
                  {
                    width: `${Math.min(usagePercent, 100)}%`,
                    backgroundColor:
                      usagePercent >= 100
                        ? theme.colors.error
                        : usagePercent >= 75
                        ? theme.colors.warning
                        : theme.colors.success,
                  },
                ]}
              />
            </View>
            <Text style={styles.usageText}>{Math.round(usagePercent)}% used</Text>
          </View>
        )}

        <View style={styles.promoActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openModal(item)}
          >
            <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
            <Text style={[styles.actionButtonText, { color: theme.colors.error }]}>
              Deactivate
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }, [theme, openModal, handleDelete]);

  if (isLoading) {
    return (
      <ScreenWrapper variant="tab">
        <View style={styles.header}>
          <Text style={styles.title}>Promo Codes</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper variant="tab">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Promo Codes</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
          <Ionicons name="add" size={22} color={theme.colors.background} />
          <Text style={styles.addButtonText}>Create</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={promotions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: TAB_BAR_BASE_HEIGHT + insets.bottom + 16 },
        ]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="ticket-outline" size={48} color={theme.colors.textTertiary} />
            <Text style={styles.emptyTitle}>No Promo Codes</Text>
            <Text style={styles.emptyText}>
              Create your first promo code to attract more customers.
            </Text>
          </View>
        }
        renderItem={renderPromoCard}
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
                {editingPromo ? 'Edit Promo Code' : 'Create Promo Code'}
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
                label="Promo Code *"
                value={formData.code}
                onChangeText={(v) => setFormData({ ...formData, code: v.toUpperCase() })}
                placeholder="e.g., SAVE20"
                autoCapitalize="characters"
                editable={!editingPromo}
                icon={
                  <Ionicons name="ticket-outline" size={20} color={theme.colors.textSecondary} />
                }
              />

              <Input
                label="Description"
                value={formData.description}
                onChangeText={(v) => setFormData({ ...formData, description: v })}
                placeholder="e.g., 20% off for new customers"
              />

              <View style={styles.discountTypeContainer}>
                <Text style={styles.inputLabel}>Discount Type *</Text>
                <View style={styles.discountTypeButtons}>
                  <TouchableOpacity
                    style={[
                      styles.discountTypeButton,
                      formData.discount_type === 'percent' && styles.discountTypeButtonActive,
                    ]}
                    onPress={() => setFormData({ ...formData, discount_type: 'percent' })}
                  >
                    <Text
                      style={[
                        styles.discountTypeButtonText,
                        formData.discount_type === 'percent' &&
                          styles.discountTypeButtonTextActive,
                      ]}
                    >
                      Percentage
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.discountTypeButton,
                      formData.discount_type === 'flat' && styles.discountTypeButtonActive,
                    ]}
                    onPress={() => setFormData({ ...formData, discount_type: 'flat' })}
                  >
                    <Text
                      style={[
                        styles.discountTypeButtonText,
                        formData.discount_type === 'flat' && styles.discountTypeButtonTextActive,
                      ]}
                    >
                      Flat Amount
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Input
                    label={`Discount ${formData.discount_type === 'percent' ? '%' : 'Amount'} *`}
                    value={formData.discount_value}
                    onChangeText={(v) => setFormData({ ...formData, discount_value: v })}
                    placeholder={formData.discount_type === 'percent' ? '20' : '100'}
                    keyboardType="numeric"
                    icon={
                      <Ionicons
                        name="pricetag-outline"
                        size={20}
                        color={theme.colors.textSecondary}
                      />
                    }
                  />
                </View>
                {formData.discount_type === 'percent' && (
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Max Discount"
                      value={formData.max_discount}
                      onChangeText={(v) => setFormData({ ...formData, max_discount: v })}
                      placeholder="100"
                      keyboardType="numeric"
                      icon={
                        <Ionicons name="cash-outline" size={20} color={theme.colors.textSecondary} />
                      }
                    />
                  </View>
                )}
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Min Order Value"
                    value={formData.min_order_value}
                    onChangeText={(v) => setFormData({ ...formData, min_order_value: v })}
                    placeholder="0"
                    keyboardType="numeric"
                    icon={
                      <Ionicons name="cart-outline" size={20} color={theme.colors.textSecondary} />
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Max Uses"
                    value={formData.max_uses}
                    onChangeText={(v) => setFormData({ ...formData, max_uses: v })}
                    placeholder="Unlimited"
                    keyboardType="numeric"
                    icon={
                      <Ionicons
                        name="people-outline"
                        size={20}
                        color={theme.colors.textSecondary}
                      />
                    }
                  />
                </View>
              </View>

              <Input
                label="Expiry Date (YYYY-MM-DD)"
                value={formData.expires_at}
                onChangeText={(v) => setFormData({ ...formData, expires_at: v })}
                placeholder="2024-12-31"
                icon={
                  <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
                }
              />

              <View style={styles.activeToggle}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activeToggleTitle}>Active</Text>
                  <Text style={styles.activeToggleSubtitle}>
                    Customers can use this promo code
                  </Text>
                </View>
                <Switch
                  value={formData.active}
                  onValueChange={(v) => setFormData({ ...formData, active: v })}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary + '80' }}
                  thumbColor={formData.active ? theme.colors.primary : '#f4f3f4'}
                />
              </View>

              <Button
                title={editingPromo ? 'Update Promo Code' : 'Create Promo Code'}
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

const createStyles = (theme: Theme) =>
  StyleSheet.create({
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
      gap: spacing.md,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
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
      paddingHorizontal: spacing.xl,
    },
    promoCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: spacing.md,
    },
    promoCardInactive: {
      opacity: 0.6,
    },
    promoHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    promoCodeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary + '20',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.md,
      gap: spacing.xs,
    },
    promoCodeText: {
      ...typography.bodySemiBold,
      color: theme.colors.primary,
      fontSize: 16,
    },
    inactiveBadge: {
      backgroundColor: theme.colors.textTertiary + '20',
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: borderRadius.sm,
    },
    inactiveBadgeText: {
      ...typography.caption,
      color: theme.colors.textTertiary,
      fontSize: 11,
    },
    promoDescription: {
      ...typography.body,
      color: theme.colors.textSecondary,
    },
    promoDetails: {
      gap: spacing.xs,
    },
    promoDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    promoDetailText: {
      ...typography.bodySmall,
      color: theme.colors.textSecondary,
    },
    usageBarContainer: {
      gap: spacing.xs,
    },
    usageBar: {
      height: 6,
      backgroundColor: theme.colors.border,
      borderRadius: 3,
      overflow: 'hidden',
    },
    usageBarFill: {
      height: '100%',
      borderRadius: 3,
    },
    usageText: {
      ...typography.caption,
      color: theme.colors.textSecondary,
    },
    promoActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      backgroundColor: theme.colors.surfaceSecondary,
      gap: spacing.xs,
    },
    deleteButton: {
      backgroundColor: theme.colors.error + '10',
    },
    actionButtonText: {
      ...typography.bodySemiBold,
      color: theme.colors.primary,
      fontSize: 14,
    },
    // Modal
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
    inputLabel: {
      ...typography.bodySmallMedium,
      color: theme.colors.textSecondary,
      marginBottom: spacing.sm,
    },
    discountTypeContainer: {
      marginBottom: spacing.md,
    },
    discountTypeButtons: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    discountTypeButton: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
    },
    discountTypeButtonActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    discountTypeButtonText: {
      ...typography.bodySemiBold,
      color: theme.colors.text,
    },
    discountTypeButtonTextActive: {
      color: theme.colors.textInverse,
    },
    activeToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceSecondary,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      marginBottom: spacing.md,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    activeToggleTitle: {
      ...typography.bodySemiBold,
      color: theme.colors.text,
    },
    activeToggleSubtitle: {
      ...typography.caption,
      color: theme.colors.textSecondary,
    },
  });
