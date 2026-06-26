import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWrapper, TAB_BAR_BASE_HEIGHT } from '../../components/ScreenWrapper';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useSaveBankAccount, useBankAccount } from '../../hooks/useBankAccount';
import { BankAccountCreate, VendorStatus } from '../../services/bankAccountService';
import { showToast } from '../../store/toastStore';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';
import { useOwnerOnboardingStore } from '../../store/ownerOnboardingStore';
import { resetOwnerDashboardToMain } from '../../lib/ownerNavigation';
import { getUserFacingMessage } from '../../lib/userFacingError';
import { OwnerSettingsScreenProps } from '../../navigation/types';

type Navigation = OwnerSettingsScreenProps<'BankAccount'>['navigation'];

// Validation mirrors the backend patterns (Req 1.8, 1.9, 1.2).
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const PINCODE_REGEX = /^[1-9][0-9]{5}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;

// Fee economics disclosed to the owner (Req 7.7, 17.3).
const TRIMIT_PERCENT = 5;
const GATEWAY_PERCENT = 2;
const TOTAL_DEDUCTION_PERCENT = TRIMIT_PERCENT + GATEWAY_PERCENT;
const NET_PERCENT = 100 - TOTAL_DEDUCTION_PERCENT;
const EXAMPLE_AMOUNT = 1000; // ₹1,000 sample booking

type FormState = {
  accountName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifscCode: string;
  confirmIfscCode: string;
  pan: string;
  businessName: string;
  contactPhone: string;
  contactEmail: string;
  addressLine: string;
  pincode: string;
  gstin: string;
};

const EMPTY_FORM: FormState = {
  accountName: '',
  accountNumber: '',
  confirmAccountNumber: '',
  ifscCode: '',
  confirmIfscCode: '',
  pan: '',
  businessName: '',
  contactPhone: '',
  contactEmail: '',
  addressLine: '',
  pincode: '',
  gstin: '',
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

const VENDOR_STATUS_LABEL: Record<VendorStatus, string> = {
  not_registered: 'Payouts: pending activation',
  pending: 'Payouts: pending activation',
  active: 'Payouts: active',
  rejected: 'Payouts: action needed',
  suspended: 'Payouts: suspended',
};

export function BankAccountScreen() {
  const navigation = useNavigation<Navigation>();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();

  const { data: bankAccount, isLoading: isFetching, isError, refetch } = useBankAccount();
  const { mutate: saveAccount, isPending: isSaving } = useSaveBankAccount();

  // Onboarding context — mirrors BankDetailsScreen (step indicator + skip).
  const isPendingOnboarding = useOwnerOnboardingStore((state) => state.bankDetailsPending);
  const consumeBankDetailsPending = useOwnerOnboardingStore((state) => state.consumeBankDetailsPending);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});

  const setField = <K extends keyof FormState>(key: K, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  // Prefill non-sensitive fields from the masked record (account number / PAN
  // stay blank — they are never returned in full and must be re-entered).
  useEffect(() => {
    if (bankAccount) {
      setForm((prev) => ({
        ...prev,
        accountName: bankAccount.account_name ?? prev.accountName,
        ifscCode: bankAccount.ifsc_code ?? prev.ifscCode,
        confirmIfscCode: bankAccount.ifsc_code ?? prev.confirmIfscCode,
        businessName: bankAccount.business_name ?? prev.businessName,
        contactPhone: bankAccount.contact_phone ?? prev.contactPhone,
        contactEmail: bankAccount.contact_email ?? prev.contactEmail,
        addressLine: bankAccount.address_line ?? prev.addressLine,
        pincode: bankAccount.pincode ?? prev.pincode,
      }));
    }
  }, [bankAccount]);

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    const ifsc = form.ifscCode.trim().toUpperCase();
    const pan = form.pan.trim().toUpperCase();
    const gstin = form.gstin.trim().toUpperCase();

    if (!form.accountName.trim()) next.accountName = 'Enter the account holder name.';
    if (!form.accountNumber.trim()) next.accountNumber = 'Enter the account number.';
    if (form.accountNumber !== form.confirmAccountNumber) {
      next.confirmAccountNumber = 'Account numbers do not match.';
    }
    if (!IFSC_REGEX.test(ifsc)) next.ifscCode = 'Invalid IFSC. Example: HDFC0001234.';
    else if (ifsc !== form.confirmIfscCode.trim().toUpperCase()) {
      next.confirmIfscCode = 'IFSC codes do not match.';
    }
    if (!PAN_REGEX.test(pan)) next.pan = 'Invalid PAN. Example: ABCDE1234F.';
    if (!form.businessName.trim()) next.businessName = 'Enter the business or legal name.';
    if (!form.contactPhone.trim()) next.contactPhone = 'Enter a contact phone number.';
    if (!EMAIL_REGEX.test(form.contactEmail.trim())) next.contactEmail = 'Enter a valid email address.';
    if (!form.addressLine.trim()) next.addressLine = 'Enter the registered address.';
    if (!PINCODE_REGEX.test(form.pincode.trim())) next.pincode = 'Enter a valid 6-digit pincode.';
    if (gstin && !GSTIN_REGEX.test(gstin)) next.gstin = 'Invalid GSTIN.';

    return next;
  };

  const finishOnboardingOrBack = () => {
    if (isPendingOnboarding) {
      consumeBankDetailsPending();
      resetOwnerDashboardToMain(navigation);
    } else {
      navigation.goBack();
    }
  };

  const handleSave = () => {
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      showToast('Please fix the highlighted fields.', 'error');
      return;
    }

    const payload: BankAccountCreate = {
      account_name: form.accountName.trim(),
      account_number: form.accountNumber.trim(),
      ifsc_code: form.ifscCode.trim().toUpperCase(),
      pan: form.pan.trim().toUpperCase(),
      business_name: form.businessName.trim(),
      contact_phone: form.contactPhone.trim(),
      contact_email: form.contactEmail.trim(),
      address_line: form.addressLine.trim(),
      pincode: form.pincode.trim(),
      ...(form.gstin.trim() ? { gstin: form.gstin.trim().toUpperCase() } : {}),
    };

    saveAccount(payload, {
      onSuccess: () => {
        showToast('Payout details saved successfully', 'success');
        // Clear sensitive fields after a successful save.
        setForm((prev) => ({
          ...prev,
          accountNumber: '',
          confirmAccountNumber: '',
          pan: '',
          gstin: '',
        }));
        finishOnboardingOrBack();
      },
      onError: (err: unknown) => {
        showToast(getUserFacingMessage(err), 'error');
      },
    });
  };

  const vendorStatus: VendorStatus = bankAccount?.vendor_status ?? 'not_registered';
  const showBadge = !!bankAccount && vendorStatus !== 'active';
  const netExample = Math.round((EXAMPLE_AMOUNT * NET_PERCENT) / 100);

  const renderHeader = () => (
    <View style={styles.header}>
      {!isPendingOnboarding && (
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      )}
      <Text style={styles.headerTitle}>Payout Details</Text>
      <View style={styles.headerRight} />
    </View>
  );

  if (isFetching) {
    return (
      <ScreenWrapper variant="stack">
        {renderHeader()}
        <View style={styles.content}>
          <View style={styles.skeletonCard} />
          {[0, 1, 2, 3, 4].map((i) => (
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
            <View style={styles.stepIndicator}>
              <View style={[styles.stepDot, styles.stepCompleted]} />
              <View style={[styles.stepLine, styles.stepCompleted]} />
              <View style={[styles.stepDot, styles.stepCompleted]} />
              <View style={[styles.stepLine, styles.stepCompleted]} />
              <View style={[styles.stepDot, styles.stepActive]} />
            </View>
            <Text style={styles.title}>Add Payout Details</Text>
            <Text style={styles.subtitle}>
              We use these to settle your earnings securely. You can skip for now and add
              them later in Settings.
            </Text>
          </View>
        )}

        {isError && (
          <View style={styles.errorBanner}>
            <Ionicons name="cloud-offline-outline" size={20} color={theme.colors.error} />
            <Text style={styles.errorBannerText}>Couldn’t load saved details.</Text>
            <TouchableOpacity onPress={() => refetch()}>
              <Text style={styles.errorBannerAction}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {showBadge && (
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>{VENDOR_STATUS_LABEL[vendorStatus]}</Text>
          </View>
        )}

        {/* Deduction disclosure (Req 7.7, 17.3) */}
        <View style={styles.feeCard}>
          <View style={styles.feeRow}>
            <Ionicons name="receipt-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.feeTitle}>Payout deduction</Text>
          </View>
          <Text style={styles.feeText}>
            Total ~{TOTAL_DEDUCTION_PERCENT}% deducted per booking ({TRIMIT_PERCENT}% TrimiT +{' '}
            {GATEWAY_PERCENT}% payment gateway). You receive ~{NET_PERCENT}%.
          </Text>
          <Text style={styles.feeExample}>
            Example: on a ₹{EXAMPLE_AMOUNT.toLocaleString('en-IN')} booking you receive ~₹
            {netExample.toLocaleString('en-IN')}.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Bank account</Text>
          <Input
            label="Account holder name"
            value={form.accountName}
            onChangeText={(t) => setField('accountName', t)}
            placeholder="Name as per bank records"
            autoCapitalize="words"
            error={errors.accountName}
          />
          <Input
            label="Account number"
            value={form.accountNumber}
            onChangeText={(t) => setField('accountNumber', t.replace(/[^0-9]/g, ''))}
            placeholder="Enter full account number"
            keyboardType="number-pad"
            secureTextEntry
            error={errors.accountNumber}
          />
          <Input
            label="Confirm account number"
            value={form.confirmAccountNumber}
            onChangeText={(t) => setField('confirmAccountNumber', t.replace(/[^0-9]/g, ''))}
            placeholder="Re-enter account number"
            keyboardType="number-pad"
            error={errors.confirmAccountNumber}
          />
          <Input
            label="IFSC code"
            value={form.ifscCode}
            onChangeText={(t) => setField('ifscCode', t.toUpperCase())}
            placeholder="e.g. HDFC0001234"
            autoCapitalize="characters"
            error={errors.ifscCode}
          />
          <Input
            label="Confirm IFSC code"
            value={form.confirmIfscCode}
            onChangeText={(t) => setField('confirmIfscCode', t.toUpperCase())}
            placeholder="Re-enter IFSC code"
            autoCapitalize="characters"
            error={errors.confirmIfscCode}
          />

          <Text style={styles.sectionTitle}>KYC details</Text>
          <Input
            label="PAN"
            value={form.pan}
            onChangeText={(t) => setField('pan', t.toUpperCase())}
            placeholder="e.g. ABCDE1234F"
            autoCapitalize="characters"
            maxLength={10}
            error={errors.pan}
          />
          <Input
            label="Business / legal name"
            value={form.businessName}
            onChangeText={(t) => setField('businessName', t)}
            placeholder="Registered business name"
            error={errors.businessName}
          />
          <Input
            label="Contact phone"
            value={form.contactPhone}
            onChangeText={(t) => setField('contactPhone', t.replace(/[^0-9+]/g, ''))}
            placeholder="10-digit mobile number"
            keyboardType="phone-pad"
            error={errors.contactPhone}
          />
          <Input
            label="Contact email"
            value={form.contactEmail}
            onChangeText={(t) => setField('contactEmail', t)}
            placeholder="name@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.contactEmail}
          />
          <Input
            label="Address"
            value={form.addressLine}
            onChangeText={(t) => setField('addressLine', t)}
            placeholder="Registered business address"
            error={errors.addressLine}
          />
          <Input
            label="Pincode"
            value={form.pincode}
            onChangeText={(t) => setField('pincode', t.replace(/[^0-9]/g, ''))}
            placeholder="6-digit pincode"
            keyboardType="number-pad"
            maxLength={6}
            error={errors.pincode}
          />
          <Input
            label="GSTIN (optional)"
            value={form.gstin}
            onChangeText={(t) => setField('gstin', t.toUpperCase())}
            placeholder="15-character GSTIN"
            autoCapitalize="characters"
            maxLength={15}
            error={errors.gstin}
          />

          <Button
            title={
              isPendingOnboarding
                ? 'Save & Finish'
                : bankAccount
                ? 'Update Payout Details'
                : 'Save Payout Details'
            }
            onPress={handleSave}
            loading={isSaving}
            disabled={isSaving}
            style={styles.submitButton}
          />
          {isPendingOnboarding && (
            <Button
              title="Skip for now"
              onPress={finishOnboardingOrBack}
              variant="outline"
              disabled={isSaving}
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
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    stepIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
      paddingHorizontal: theme.spacing.xl,
      alignSelf: 'stretch',
    },
    stepDot: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.surfaceSecondary,
      borderWidth: 2,
      borderColor: theme.colors.border,
    },
    stepActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    stepCompleted: {
      backgroundColor: theme.colors.success,
      borderColor: theme.colors.success,
    },
    stepLine: {
      flex: 1,
      height: 2,
      backgroundColor: theme.colors.border,
      marginHorizontal: theme.spacing.xs,
    },
    title: {
      ...theme.typography.h2,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
    },
    subtitle: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
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
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.pill,
      backgroundColor: theme.colors.warningLight,
    },
    badgeDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.warning,
    },
    badgeText: {
      ...theme.typography.captionMedium,
      color: theme.colors.warning,
    },
    feeCard: {
      padding: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.primaryLight + '22',
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: theme.spacing.sm,
    },
    feeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    feeTitle: {
      ...theme.typography.bodySemiBold,
      color: theme.colors.text,
    },
    feeText: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    feeExample: {
      ...theme.typography.bodySmallMedium,
      color: theme.colors.text,
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

export default BankAccountScreen;
