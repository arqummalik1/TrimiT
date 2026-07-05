import React, { useCallback, useMemo, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenWrapper, TAB_BAR_BASE_HEIGHT } from '../../components/ScreenWrapper';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { typography, spacing, borderRadius } from '../../lib/utils';
import { useTheme, Theme } from '../../theme/ThemeContext';
import { serviceCategoryRepository } from '../../repositories/serviceCategoryRepository';
import { ServiceCategory } from '../../types';
import { showToast } from '../../store/toastStore';
import { handleApiError } from '../../lib/errorHandler';
import { queryKeys } from '../../lib/queryKeys';
import type { OwnerServicesScreenProps } from '../../navigation/types';

type Props = OwnerServicesScreenProps<'ManageCategories'>;

export default function ManageCategoriesScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<ServiceCategory | null>(null);
  const [name, setName] = useState('');

  const { data: categories = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.ownerCategories,
    queryFn: () => serviceCategoryRepository.list(),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.ownerCategories });
    queryClient.invalidateQueries({ queryKey: queryKeys.ownerSalon });
  };

  const createMutation = useMutation({
    mutationFn: (categoryName: string) => serviceCategoryRepository.create({ name: categoryName }),
    onSuccess: () => {
      invalidate();
      setModalVisible(false);
      setName('');
      showToast('Category created', 'success');
    },
    onError: (e) => showToast(handleApiError(e).message, 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, categoryName }: { id: string; categoryName: string }) =>
      serviceCategoryRepository.update(id, { name: categoryName }),
    onSuccess: () => {
      invalidate();
      setModalVisible(false);
      setEditing(null);
      setName('');
      showToast('Category updated', 'success');
    },
    onError: (e) => showToast(handleApiError(e).message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => serviceCategoryRepository.delete(id),
    onSuccess: () => {
      invalidate();
      showToast('Category deleted', 'info');
    },
    onError: (e) => showToast(handleApiError(e).message, 'error'),
  });

  const quickStartMutation = useMutation({
    mutationFn: () => serviceCategoryRepository.quickStart(),
    onSuccess: (res) => {
      invalidate();
      showToast(
        res.count > 0 ? `Added ${res.count} categories` : 'Categories already set up',
        'success',
      );
    },
    onError: (e) => showToast(handleApiError(e).message, 'error'),
  });

  const openCreate = useCallback(() => {
    setEditing(null);
    setName('');
    setModalVisible(true);
  }, []);

  const openEdit = useCallback((cat: ServiceCategory) => {
    setEditing(cat);
    setName(cat.name);
    setModalVisible(true);
  }, []);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      showToast('Enter a category name', 'error');
      return;
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, categoryName: trimmed });
    } else {
      createMutation.mutate(trimmed);
    }
  };

  const handleDelete = (cat: ServiceCategory) => {
    const count = cat.service_count ?? 0;
    if (count > 0) {
      showToast('Remove all services from this category first', 'error');
      return;
    }
    Alert.alert('Delete category', `Delete "${cat.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(cat.id) },
    ]);
  };

  const renderItem = ({ item }: { item: ServiceCategory }) => {
    const locked = (item.service_count ?? 0) > 0;
    return (
      <View style={styles.card}>
        <View style={styles.cardMain}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardMeta}>
            {item.service_count ?? 0} service{(item.service_count ?? 0) === 1 ? '' : 's'}
          </Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn}>
            <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDelete(item)}
            style={[styles.iconBtn, locked && styles.iconBtnDisabled]}
            disabled={locked}
          >
            <Ionicons
              name="trash-outline"
              size={20}
              color={locked ? theme.colors.textTertiary : theme.colors.error}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ScreenWrapper variant="stack">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Categories</Text>
        <TouchableOpacity style={styles.addButton} onPress={openCreate}>
          <Ionicons name="add" size={22} color={theme.colors.background} />
        </TouchableOpacity>
      </View>

      {categories.length === 0 && !isLoading ? (
        <View style={styles.quickStartBox}>
          <Text style={styles.quickStartTitle}>Quick start</Text>
          <Text style={styles.quickStartText}>
            Add Hair, Face, Beard, Spa and more in one tap — like Zomato menu sections.
          </Text>
          <Button
            title="Add preset categories"
            onPress={() => quickStartMutation.mutate()}
            loading={quickStartMutation.isPending}
          />
        </View>
      ) : null}

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={theme.colors.primary} />
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onRefresh={refetch}
          refreshing={isRefetching}
          contentContainerStyle={{
            padding: spacing.xl,
            paddingBottom: TAB_BAR_BASE_HEIGHT + insets.bottom + 16,
            gap: spacing.sm,
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No categories yet. Create one or use quick start.</Text>
          }
        />
      )}

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <ScreenWrapper variant="modal">
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Edit category' : 'New category'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: spacing.xl }}>
              <Input
                label="Category name"
                value={name}
                onChangeText={setName}
                placeholder="e.g. Hair, Face, Beard"
                autoFocus
              />
              <Button
                title={editing ? 'Save' : 'Create'}
                onPress={handleSave}
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
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      gap: spacing.sm,
    },
    backBtn: { padding: spacing.xs },
    title: { ...typography.h2, color: theme.colors.text, flex: 1 },
    addButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: borderRadius.full,
      padding: spacing.sm,
    },
    quickStartBox: {
      marginHorizontal: spacing.xl,
      marginBottom: spacing.md,
      padding: spacing.lg,
      borderRadius: borderRadius.lg,
      backgroundColor: theme.colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: spacing.sm,
    },
    quickStartTitle: { ...typography.bodySemiBold, color: theme.colors.text },
    quickStartText: { ...typography.bodySmall, color: theme.colors.textSecondary },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.lg,
      borderRadius: borderRadius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    cardMain: { flex: 1 },
    cardTitle: { ...typography.bodySemiBold, color: theme.colors.text },
    cardMeta: { ...typography.caption, color: theme.colors.textSecondary, marginTop: 2 },
    cardActions: { flexDirection: 'row', gap: spacing.sm },
    iconBtn: { padding: spacing.xs },
    iconBtnDisabled: { opacity: 0.4 },
    emptyText: { textAlign: 'center', color: theme.colors.textSecondary, marginTop: spacing.xl },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.xl,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalTitle: { ...typography.h3, color: theme.colors.text },
  });
