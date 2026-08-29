import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { ErrorState } from '../../components/ErrorState';
import { RootScreenProps } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { usePendingAuthIntentStore } from '../../store/pendingAuthIntentStore';
import { showToast } from '../../store/toastStore';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';
import { borderRadius, spacing, typography } from '../../lib/utils';

function normalizePhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '');
  const local = digits.startsWith('91') ? digits.slice(2) : digits;
  return `+91 ${local.slice(0, 10)}`;
}

export default function CompleteProfileScreen({ navigation }: RootScreenProps<'CompleteProfile'>) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const completeProfile = useAuthStore((state) => state.completeProfile);
  const logout = useAuthStore((state) => state.logout);
  const profileComplete = useAuthStore((state) => state.profileComplete);
  const isLoading = useAuthStore((state) => state.isLoading);
  const authError = useAuthStore((state) => state.error);
  const [phone, setPhone] = useState('+91 ');
  const [localError, setLocalError] = useState<string | null>(null);

  const cancelClaim = async () => {
    usePendingAuthIntentStore.getState().clearIntent();
    // A signed-in customer may be exploring employee access from their profile.
    // Keep that existing session; only discard a brand-new, incomplete sign-in.
    if (!profileComplete) await logout();
    if (navigation.canGoBack()) navigation.goBack();
  };

  const submit = async () => {
    const compact = phone.replace(/\s/g, '');
    if (!/^\+91[6-9]\d{9}$/.test(compact)) {
      setLocalError('Enter the same 10-digit mobile number your salon owner invited.');
      return;
    }
    setLocalError(null);
    const result = await completeProfile({ role: 'employee', phone: compact });
    if (!result.success) {
      setLocalError(result.error ?? 'We could not validate this employee invitation.');
      return;
    }
    showToast('Employee access confirmed.', 'success');
  };

  return (
    <ScreenWrapper variant="auth">
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Cancel employee sign in"
            style={styles.closeButton}
            onPress={() => void cancelClaim()}
            disabled={isLoading}
          >
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <Ionicons name="people" size={36} color={theme.colors.primary} />
          </View>
          <Text style={styles.eyebrow}>EMPLOYEE ACCESS</Text>
          <Text style={styles.title}>Connect to your salon</Text>
          <Text style={styles.subtitle}>
            We only need the mobile number used in your staff invitation. Your identity details
            come from the sign-in method you just completed.
          </Text>

          <View style={styles.card}>
            {(localError || authError) ? (
              <ErrorState
                variant="inline"
                message={localError || authError || ''}
                kind="validation"
                style={styles.error}
              />
            ) : null}
            <Input
              label="Invited mobile number"
              value={phone}
              onChangeText={(value) => {
                setPhone(normalizePhoneInput(value));
                setLocalError(null);
              }}
              keyboardType="phone-pad"
              placeholder="+91 98765 43210"
              editable={!isLoading}
              icon={<Ionicons name="call-outline" size={20} color={theme.colors.textSecondary} />}
            />
            <Button
              title="Verify invitation"
              onPress={() => void submit()}
              loading={isLoading}
              style={styles.button}
            />
          </View>

          <View style={styles.note}>
            <Ionicons name="shield-checkmark-outline" size={18} color={theme.colors.success} />
            <Text style={styles.noteText}>
              Employee permissions are granted only after the backend matches a pending invitation.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  closeButton: {
    alignSelf: 'flex-end',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryLight,
    marginTop: spacing.xxxl,
    marginBottom: spacing.xl,
  },
  eyebrow: {
    ...typography.caption,
    color: theme.colors.primary,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h1,
    color: theme.colors.text,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  card: {
    marginTop: spacing.xxxl,
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  error: { marginBottom: spacing.lg },
  button: { marginTop: spacing.md },
  note: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  noteText: {
    ...typography.caption,
    color: theme.colors.textSecondary,
    flex: 1,
    lineHeight: 19,
  },
});
