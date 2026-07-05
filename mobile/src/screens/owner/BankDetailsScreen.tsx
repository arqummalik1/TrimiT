import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Text, TouchableOpacity } from 'react-native';
import { ScreenWrapper, TAB_BAR_BASE_HEIGHT } from '../../components/ScreenWrapper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { spacing, typography } from '../../lib/utils';
import { useTheme } from '../../theme/ThemeContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salonRepository } from '../../repositories/salonRepository';
import { showToast } from '../../store/toastStore';
import { getUserFacingMessage } from '../../lib/userFacingError';
import { OwnerSettingsScreenProps } from '../../navigation/types';
import { useOwnerOnboardingStore } from '../../store/ownerOnboardingStore';
import { resetOwnerDashboardToMain } from '../../lib/ownerNavigation';
import { Ionicons } from '@expo/vector-icons';

type Props = OwnerSettingsScreenProps<'BankDetails'>;

export default function BankDetailsScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const tabClearance = TAB_BAR_BASE_HEIGHT + insets.bottom + 24;
  const queryClient = useQueryClient();

  const isPendingOnboarding = useOwnerOnboardingStore((state) => state.bankDetailsPending);
  const consumeBankDetailsPending = useOwnerOnboardingStore((state) => state.consumeBankDetailsPending);

  const [formData, setFormData] = useState({
    bank_account_holder_name: '',
    bank_account_number: '',
    bank_ifsc: '',
  });

  const { data: bankDetails, isLoading } = useQuery({
    queryKey: ['ownerBankDetails'],
    queryFn: () => salonRepository.getBankDetails(),
  });

  useEffect(() => {
    if (bankDetails) {
      setFormData({
        bank_account_holder_name: bankDetails.bank_account_holder_name || '',
        bank_account_number: bankDetails.bank_account_number_masked || '', // Will show masked, clear on focus if they want to edit
        bank_ifsc: bankDetails.bank_ifsc || '',
      });
    }
  }, [bankDetails]);

  const updateMutation = useMutation({
    mutationFn: (payload: any) => salonRepository.updateBankDetails(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ownerBankDetails'] });
      showToast('Bank details saved successfully', 'success');
      
      if (isPendingOnboarding) {
        consumeBankDetailsPending();
        resetOwnerDashboardToMain(navigation);
      } else {
        navigation.goBack();
      }
    },
    onError: (error) => {
      showToast(getUserFacingMessage(error), 'error');
    },
  });

  const handleSave = () => {
    // Basic validation
    if (formData.bank_ifsc) {
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/i;
      if (!ifscRegex.test(formData.bank_ifsc.trim())) {
        showToast('Invalid IFSC code format (e.g. SBIN0001234)', 'error');
        return;
      }
    }

    const payload: any = {
      bank_account_holder_name: formData.bank_account_holder_name,
      bank_ifsc: formData.bank_ifsc.toUpperCase(),
    };

    // Only send account number if it's not masked
    if (!formData.bank_account_number.includes('*')) {
      payload.bank_account_number = formData.bank_account_number;
    }

    updateMutation.mutate(payload);
  };

  const handleSkip = () => {
    if (isPendingOnboarding) {
      consumeBankDetailsPending();
      resetOwnerDashboardToMain(navigation);
    } else {
      navigation.goBack();
    }
  };

  return (
    <ScreenWrapper variant="stack">
      <View style={styles.header}>
        {!isPendingOnboarding && (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Bank Details</Text>
        <View style={styles.headerRight} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: tabClearance }]}
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
            <View style={styles.headerText}>
              <Text style={styles.title}>Add Bank Details</Text>
              <Text style={styles.subtitle}>
                We need this to settle your payments. You can skip this for now and add it later in Settings.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.form}>
          <Input
            label="Account Holder Name"
            placeholder="Name as per bank records"
            value={formData.bank_account_holder_name}
            onChangeText={(t) => setFormData(p => ({ ...p, bank_account_holder_name: t }))}
          />
          
          <Input
            label="Account Number"
            placeholder="Enter account number"
            value={formData.bank_account_number}
            keyboardType="number-pad"
            onChangeText={(t) => setFormData(p => ({ ...p, bank_account_number: t }))}
            onFocus={() => {
              if (formData.bank_account_number.includes('*')) {
                setFormData(p => ({ ...p, bank_account_number: '' }));
              }
            }}
          />

          <Input
            label="IFSC Code"
            placeholder="e.g. SBIN0001234"
            value={formData.bank_ifsc}
            autoCapitalize="characters"
            onChangeText={(t) => setFormData(p => ({ ...p, bank_ifsc: t }))}
          />
        </View>

        <View style={styles.footer}>
          <Button
            title={isPendingOnboarding ? "Save & Finish" : "Save Changes"}
            onPress={handleSave}
            loading={updateMutation.isPending}
            style={styles.saveButton}
          />
          {isPendingOnboarding && (
            <Button
              title="Skip for now"
              onPress={handleSkip}
              variant="outline"
              style={styles.skipButton}
            />
          )}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    padding: spacing.md,
    flexGrow: 1,
  },
  onboardingHeader: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceVariant,
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
    marginHorizontal: spacing.xs,
  },
  headerText: {
    alignItems: 'center',
  },
  title: {
    ...typography.h2,
    color: theme.colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    gap: spacing.md,
  },
  footer: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  saveButton: {
    width: '100%',
  },
  skipButton: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
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
    ...typography.h3,
    color: theme.colors.text,
  },
  headerRight: {
    width: 40,
  },
});
