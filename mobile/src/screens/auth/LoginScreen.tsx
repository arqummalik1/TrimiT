/**
 * LoginScreen.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Production-grade login screen with:
 *   • Inline field validation (no API call for empty/malformed input)
 *   • Inputs disabled during loading
 *   • Inline error banner (ErrorState variant='inline') for API errors
 *   • Button uses loading state (no double-tap possible)
 *   • Toast on unrecoverable errors
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { ErrorState } from '../../components/ErrorState';
import { showToast } from '../../store/toastStore';
import { typography, spacing, borderRadius } from '../../lib/utils';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';

// ─── Validation ───────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ValidationErrors {
  email?: string;
  password?: string;
}

function validateForm(email: string, password: string): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!email.trim()) {
    errors.email = 'Email is required.';
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.email = 'Enter a valid email address.';
  }
  if (!password) {
    errors.password = 'Password is required.';
  } else if (password.length < 6) {
    errors.password = 'Password must be at least 6 characters.';
  }
  return errors;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface LoginScreenProps {
  navigation: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { login, isLoading, error: authError, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});

  const handleFieldChange = useCallback(
    (field: 'email' | 'password', value: string) => {
      if (field === 'email') setEmail(value);
      else setPassword(value);

      // Clear both field-level and API-level errors on input
      if (fieldErrors[field]) setFieldErrors((e) => ({ ...e, [field]: undefined }));
      if (authError) clearError();
    },
    [fieldErrors, authError, clearError]
  );

  const handleLogin = async () => {
    // 1. Client-side validation first
    const errors = validateForm(email, password);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    // 2. API call
    const result = await login(email.trim(), password);
    if (!result.success) {
      // Auth error is already stored in authStore.error — displayed inline
      // For network-level failures, api interceptor already showed a toast
      if (!result.error) {
        showToast('Login failed. Please try again.', 'error');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="cut" size={40} color={theme.colors.textInverse} />
            </View>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue to TrimiT</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* API error inline banner */}
            {authError && (
              <ErrorState
                variant="inline"
                message={authError}
                type="validation"
                style={{ marginBottom: spacing.lg }}
              />
            )}

            <Input
              label="Email Address"
              placeholder="you@example.com"
              value={email}
              onChangeText={(v) => handleFieldChange('email', v)}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
              icon={<Ionicons name="mail-outline" size={20} color={theme.colors.textSecondary} />}
              error={fieldErrors.email}
            />

            <View style={styles.passwordContainer}>
              <Input
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={(v) => handleFieldChange('password', v)}
                secureTextEntry={!showPassword}
                editable={!isLoading}
                icon={<Ionicons name="lock-closed-outline" size={20} color={theme.colors.textSecondary} />}
                error={fieldErrors.password}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword((prev) => !prev)}
                disabled={isLoading}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotButton}
              disabled={isLoading}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={isLoading}
              style={styles.submitButton}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('RoleSelect')} disabled={isLoading}>
              <Text style={styles.linkText}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xxl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxxxl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h2,
    color: theme.colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodySmall,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    marginBottom: spacing.xxl,
    gap: spacing.md,
  },
  passwordContainer: {
    position: 'relative',
  },
  eyeButton: {
    position: 'absolute',
    right: spacing.lg,
    top: 42,
    padding: spacing.xs,
  },
  forgotButton: {
    alignSelf: 'flex-end',
  },
  forgotText: {
    ...typography.bodySmallMedium,
    color: theme.colors.primary,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  footerText: {
    ...typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  linkText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});

export default LoginScreen;
