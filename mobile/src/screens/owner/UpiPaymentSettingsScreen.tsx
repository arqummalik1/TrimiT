/**
 * UpiPaymentSettingsScreen.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Replaces the old PayU `BankAccountScreen` KYC. TrimiT never collects money —
 * customers pay the salon's UPI ID directly. To accept UPI the salon stores a
 * UPI ID (required), plus optional bank name / account holder name / QR image.
 *
 * PATCHes `/salons/{id}` with `upi_id` (and optional `upi_qr_code`,
 * `bank_name`, `account_holder_name`) via the salon repository — no direct API
 * calls in the screen.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenWrapper, TAB_BAR_BASE_HEIGHT } from '../../components/ScreenWrapper';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { showToast } from '../../store/toastStore';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';
import { Salon } from '../../types';
import { salonRepository } from '../../repositories/salonRepository';
import { queryKeys } from '../../lib/queryKeys';
import { getUserFacingMessage } from '../../lib/userFacingError';
import { useOwnerOnboardingStore } from '../../store/ownerOnboardingStore';
import { resetOwnerDashboardToMain } from '../../lib/ownerNavigation';
import { showSalonImageSourcePicker } from '../../lib/imageUploadPrep';
import { uploadServiceImage } from '../../services/uploadService';
import { OwnerSettingsScreenProps } from '../../navigation/types';

type Navigation = OwnerSettingsScreenProps<'UpiPaymentSettings'>['navigation'];

// A UPI ID (VPA) looks like `name@bank`, e.g. `salon.name@okhdfcbank`.
const UPI_ID_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

type FormState = {
  upiId: string;
  bankName: string;
  accountHolderName: string;
  upiQrCode: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

export function UpiPaymentSettingsScreen() {
  const navigation = useNavigation<Navigation>();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const isPendingOnboarding = useOwnerOnboardingStore((state) => state.bankDetailsPending);
  const consumeBankDetailsPending = useOwnerOnboardingStore(
    (state) => state.consumeBankDetailsPending
  );

  const { data: salon, isLoading, isError, refetch } = useQuery<Salon | null>({
    queryKey: queryKeys.ownerSalon,
    queryFn: () => salonRepository.getOwnerSalon(),
    staleTime: 30_000,
  });

  const [form, setForm] = useState<FormState>({
    upiId: '',
    bankName: '',
    accountHolderName: '',
    upiQrCode: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [uploadingQr, setUploadingQr] = useState(false);

  const setField = <K extends keyof FormState>(key: K, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  useEffect(() => {
    if (salon) {
      setForm((prev) => ({
        ...prev,
        upiId: salon.upi_id ?? prev.upiId,
        bankName: salon.bank_name ?? prev.bankName,
        accountHolderName: salon.account_holder_name ?? prev.accountHolderName,
        upiQrCode: salon.upi_qr_code ?? prev.upiQrCode,
      }));
    }
  }, [salon]);

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<Salon>) =>
      salonRepository.updateSalon(salon!.id, updates),
    onSuccess: (updated: Salon) => {
      queryClient.setQueryData(queryKeys.ownerSalon, updated);
      void queryClient.invalidateQueries({ queryKey: ['ownerSalon'] });
      showToast('UPI payment details saved', 'success');
      finishOnboardingOrBack();
    },
    onError: (error: unknown) => {
      showToast(getUserFacingMessage(error), 'error');
    },
  });

  const finishOnboardingOrBack = () => {
    if (isPendingOnboarding) {
      consumeBankDetailsPending();
      resetOwnerDashboardToMain(navigation);
    } else {
      navigation.goBack();
    }
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    const upi = form.upiId.trim();
    if (!upi) {
      next.upiId = 'Enter your UPI ID to accept UPI payments.';
    } else if (!UPI_ID_REGEX.test(upi)) {
      next.upiId = 'Invalid UPI ID. Example: yourname@okhdfcbank.';
    }
    return next;
  };

  const handleSave = () => {
    if (!salon) {
      showToast('Create your salon first.', 'error');
      return;
    }
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      showToast('Please fix the highlighted fields.', 'error');
      return;
    }

    const updates: Partial<Salon> = {
      upi_id: form.upiId.trim(),
      bank_name: form.bankName.trim() || null,
      account_holder_name: form.accountHolderName.trim() || null,
      upi_qr_code: form.upiQrCode.trim() || null,
    };
    updateMutation.mutate(updates);
  };

  const handlePickQr = () => {
    if (uploadingQr) return;
    showSalonImageSourcePicker((uri) => {
      void uploadQr(uri);
    });
  };

  const uploadQr = async (uri: string) => {
    setUploadingQr(true);
    try {
      const publicUrl = await uploadServiceImage(uri);
      setField('upiQrCode', publicUrl);
      showToast('QR code uploaded', 'success');
    } catch (error) {
      showToast(getUserFacingMessage(error), 'error');
    } finally {
      setUploadingQr(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {!isPendingOnboarding && (
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      )}
      <Text style={styles.headerTitle}>UPI Payments</Text>
      <View style={styles.headerRight} />
    </View>
  );

  if (isLoading) {
    return (
      <ScreenWrapper variant="stack">
        {renderHeader()}
        <View style={styles.content}>
          <View style={styles.skeletonCard} />
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.skeletonInput} />
          ))}
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper variant="stack">
      {renderHeader()}
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: TAB_BAR_BASE_HEIGHT + insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {isPendingOnboarding && (
          <View style={styles.onboardingHeader}>
            <Text style={styles.title}>Add your UPI ID</Text>
            <Text style={styles.subtitle}>
              Customers pay you directly via UPI. Add your UPI ID now, or skip and add it later
              in Settings.
            </Text>
          </View>
        )}

        {isError && (
          <View style={styles.errorBanner}>
            <Ionicons name="cloud-offline-outline" size={20} color={theme.colors.error} />
            <Text style={styles.errorBannerText}>Couldn&apos;t load your salon.</Text>
            <TouchableOpacity onPress={() => refetch()}>
              <Text style={styles.errorBannerAction}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.infoTitle}>How UPI payments work</Text>
          </View>
          <Text style={styles.infoText}>
            TrimiT never holds your money. When a customer chooses UPI, they pay your UPI ID
            directly. You then verify the payment to confirm the booking.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.sectionTitle}>UPI</Text>
          <Input
            label="UPI ID *"
            value={form.upiId}
            onChangeText={(t) => setField('upiId', t.trim())}
            placeholder="e.g. yourname@okhdfcbank"
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.upiId}
          />

          <Text style={styles.sectionTitle}>Optional details</Text>
          <Input
            label="Account holder name"
            value={form.accountHolderName}
            onChangeText={(t) => setField('accountHolderName', t)}
            placeholder="Name on the UPI account"
            autoCapitalize="words"
            error={errors.accountHolderName}
          />
          <Input
            label="Bank name"
            value={form.bankName}
            onChangeText={(t) => setField('bankName', t)}
            placeholder="e.g. HDFC Bank"
            error={errors.bankName}
          />

          <Text style={styles.qrLabel}>UPI QR code (optional)</Text>
          {form.upiQrCode ? (
            <View style={styles.qrPreviewWrap}>
              <Image source={{ uri: form.upiQrCode }} style={styles.qrPreview} />
              <TouchableOpacity
                style={styles.qrRemove}
                onPress={() => setField('upiQrCode', '')}
              >
                <Ionicons name="close-circle" size={24} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.qrUpload}
              onPress={handlePickQr}
              disabled={uploadingQr}
            >
              <Ionicons name="qr-code-outline" size={28} color={theme.colors.primary} />
              <Text style={styles.qrUploadText}>
                {uploadingQr ? 'Uploading…' : 'Upload QR'}
              </Text>
            </TouchableOpacity>
          )}

          <Button
            title={isPendingOnboarding ? 'Save & Finish' : 'Save UPI Details'}
            onPress={handleSave}
            loading={updateMutation.isPending}
            disabled={updateMutation.isPending || uploadingQr || !salon}
            style={styles.submitButton}
          />
          {isPendingOnboarding && (
            <Button
              title="Skip for now"
              onPress={finishOnboardingOrBack}
              variant="outline"
              disabled={updateMutation.isPending}
            />
          )}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      width: 40,
      height: 40,
      backgroundColor: theme.colors.surfaceSecondary,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      ...theme.typography.h3,
      color: theme.colors.text,
    },
    headerRight: {
      width: 40,
    },
    content: {
      padding: theme.spacing.xxl,
      gap: theme.spacing.lg,
    },
    onboardingHeader: {
      marginBottom: theme.spacing.sm,
    },
    title: {
      ...theme.typography.h2,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.errorLight,
    },
    errorBannerText: {
      ...theme.typography.bodySmall,
      color: theme.colors.error,
      flex: 1,
    },
    errorBannerAction: {
      ...theme.typography.bodySmallMedium,
      color: theme.colors.primary,
    },
    infoCard: {
      padding: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.primaryLight + '22',
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: theme.spacing.sm,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    infoTitle: {
      ...theme.typography.bodySemiBold,
      color: theme.colors.text,
    },
    infoText: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    form: {
      gap: theme.spacing.xs,
    },
    sectionTitle: {
      ...theme.typography.h4,
      color: theme.colors.text,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    qrLabel: {
      ...theme.typography.bodySmallMedium,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    qrUpload: {
      height: 120,
      borderRadius: theme.borderRadius.md,
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs,
    },
    qrUploadText: {
      ...theme.typography.bodySmallMedium,
      color: theme.colors.primary,
    },
    qrPreviewWrap: {
      alignSelf: 'flex-start',
      position: 'relative',
    },
    qrPreview: {
      width: 160,
      height: 160,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    qrRemove: {
      position: 'absolute',
      top: -8,
      right: -8,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
    },
    submitButton: {
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    skeletonCard: {
      height: 96,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surfaceSecondary,
      marginBottom: theme.spacing.lg,
    },
    skeletonInput: {
      height: 56,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.surfaceSecondary,
      marginBottom: theme.spacing.lg,
    },
  });

export default UpiPaymentSettingsScreen;
