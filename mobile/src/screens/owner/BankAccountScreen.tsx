import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWrapper, TAB_BAR_BASE_HEIGHT } from '../../components/ScreenWrapper';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useSaveBankAccount, useBankAccount } from '../../hooks/useBankAccount';
import { showToast } from '../../store/toastStore';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme';

export function BankAccountScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: bankAccount, isLoading: isFetching } = useBankAccount();
  const { mutate: saveAccount, isPending: isSaving } = useSaveBankAccount();

  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [confirmIfscCode, setConfirmIfscCode] = useState('');

  useEffect(() => {
    if (bankAccount) {
      setAccountName(bankAccount.account_name || '');
      setIfscCode(bankAccount.ifsc_code || '');
    }
  }, [bankAccount]);

  const handleSave = () => {
    if (!accountName || !accountNumber || !confirmAccountNumber || !ifscCode || !confirmIfscCode) {
      showToast('All fields are required', 'error');
      return;
    }

    if (accountNumber !== confirmAccountNumber) {
      showToast('Account numbers do not match', 'error');
      return;
    }

    if (ifscCode.toUpperCase() !== confirmIfscCode.toUpperCase()) {
      showToast('IFSC codes do not match', 'error');
      return;
    }
    
    // Basic IFSC validation
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.toUpperCase())) {
      showToast('Invalid IFSC Code format', 'error');
      return;
    }

    saveAccount(
      { account_name: accountName, account_number: accountNumber, ifsc_code: ifscCode.toUpperCase() },
      {
        onSuccess: () => {
          showToast('Bank details saved successfully', 'success');
          setAccountNumber(''); // Clear for security
          setConfirmAccountNumber('');
          setIfscCode('');
          setConfirmIfscCode('');
          setAccountName('');
        },
        onError: (err: any) => {
          showToast(err.message || 'Failed to save bank details', 'error');
        }
      }
    );
  };

  return (
    <ScreenWrapper>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Button
          title=""
          variant="ghost"
          size="sm"
          onPress={() => navigation.goBack()}
          icon={<Ionicons name="arrow-back" size={24} color={theme.colors.text} />}
          style={styles.backButton}
        />
        <Text style={[styles.title, { color: theme.colors.text }]}>Bank Details</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_BASE_HEIGHT + insets.bottom + 24 }]}>
        <View style={[styles.infoCard, { backgroundColor: theme.colors.primary + '15' }]}>
          <Ionicons name="storefront" size={32} color={theme.colors.primary} style={styles.infoIcon} />
          <Text style={[styles.infoTitle, { color: theme.colors.primary }]}>Receive Payments Directly</Text>
          <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
            Add your bank details to automatically route payments from customers to your account.
            We use secure payment gateways for all transfers.
          </Text>
        </View>

        {bankAccount && bankAccount.status === 'active' && (
          <View style={[styles.activeCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.activeTitle, { color: theme.colors.text }]}>Current Linked Account</Text>
            <Text style={[styles.activeText, { color: theme.colors.textSecondary }]}>Name: {bankAccount.account_name}</Text>
            <Text style={[styles.activeText, { color: theme.colors.textSecondary }]}>A/C ending in: ****{bankAccount.account_number_last4}</Text>
            <Text style={[styles.activeText, { color: theme.colors.textSecondary }]}>IFSC: {bankAccount.ifsc_code}</Text>
          </View>
        )}

        <View style={styles.form}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {bankAccount ? 'Update Bank Details' : 'Add Bank Details'}
          </Text>
          
          <Input
            label="Beneficiary Name"
            value={accountName}
            onChangeText={setAccountName}
            placeholder="Name as per bank records"
            icon={<Ionicons name="person" size={20} color={theme.colors.textSecondary} />}
            autoCapitalize="words"
          />

          <Input
            label="Account Number"
            value={accountNumber}
            onChangeText={setAccountNumber}
            placeholder="Enter full account number"
            keyboardType="number-pad"
            icon={<Ionicons name="card" size={20} color={theme.colors.textSecondary} />}
            secureTextEntry={true}
          />

          <Input
            label="Confirm Account Number"
            value={confirmAccountNumber}
            onChangeText={setConfirmAccountNumber}
            placeholder="Re-enter full account number"
            keyboardType="number-pad"
            icon={<Ionicons name="card" size={20} color={theme.colors.textSecondary} />}
            secureTextEntry={false}
          />

          <Input
            label="IFSC Code"
            value={ifscCode}
            onChangeText={(text) => setIfscCode(text.toUpperCase())}
            placeholder="e.g. HDFC0001234"
            autoCapitalize="characters"
          />

          <Input
            label="Confirm IFSC Code"
            value={confirmIfscCode}
            onChangeText={(text) => setConfirmIfscCode(text.toUpperCase())}
            placeholder="Re-enter IFSC Code"
            autoCapitalize="characters"
          />

          <Button
            title={bankAccount ? "Update Bank Details" : "Save Bank Details"}
            onPress={handleSave}
            loading={isSaving}
            disabled={isSaving || isFetching}
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 16,
    padding: 0,
  },
  title: {
    ...typography.h3,
  },
  content: {
    padding: 24,
  },
  infoCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  infoIcon: {
    marginBottom: 12,
  },
  infoTitle: {
    ...typography.h4,
    marginBottom: 8,
  },
  infoText: {
    ...typography.bodySmall,
    textAlign: 'center',
    lineHeight: 20,
  },
  activeCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
  },
  activeTitle: {
    ...typography.bodySemiBold,
    marginBottom: 12,
  },
  activeText: {
    ...typography.bodySmall,
    marginBottom: 4,
  },
  form: {
    gap: 16,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: 8,
  },
  submitButton: {
    marginTop: 16,
  },
});
