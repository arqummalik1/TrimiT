/**
 * SignupScreen.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Production-grade signup screen with:
 *   • Client-side field validation before API call
 *   • Inline ErrorState for API errors (replaces raw Alert)
 *   • Inputs disabled during loading
 *   • Button loading state prevents double-submit
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
import { typography, spacing, borderRadius } from '../../lib/utils';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';

// ─── Validation ───────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+\d\s\-()]{7,15}$/;

interface ValidationErrors {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
}

function validateSignupForm(
  name: string,
  email: string,
  phone: string,
  password: string
): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!name.trim()) errors.name = 'Full name is required.';
  if (!email.trim()) errors.email = 'Email is required.';
  else if (!EMAIL_REGEX.test(email.trim())) errors.email = 'Enter a valid email address.';
  if (phone && !PHONE_REGEX.test(phone.trim())) errors.phone = 'Enter a valid phone number.';
  if (!password) errors.password = 'Password is required.';
  else if (password.length < 6) errors.password = 'Password must be at least 6 characters.';
  return errors;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface SignupScreenProps {
  navigation: any;
  route: any;
}

export const SignupScreen: React.FC<SignupScreenProps> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const role: 'customer' | 'owner' = route.params?.role || 'customer';
  const { signup, isLoading, error: authError, clearError } = useAuthStore();

  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});

  const handleChange = useCallback(
    (field: keyof typeof formData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (fieldErrors[field]) setFieldErrors((e) => ({ ...e, [field]: undefined }));
      if (authError) clearError();
    },
    [fieldErrors, authError, clearError]
  );

  const handleSubmit = async () => {
    const errors = validateSignupForm(
      formData.name,
      formData.email,
      formData.phone,
      formData.password
    );
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const result = await signup(
      formData.email.trim(),
      formData.password,
      formData.name.trim(),
      formData.phone.trim(),
      role
    );

    if (!result.success && !result.error) {
      // Network-level failure — toast already shown by interceptor
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
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              disabled={isLoading}
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>

            <View style={styles.logoContainer}>
              <Ionicons name="cut" size={32} color={theme.colors.textInverse} />
            </View>
            <Text style={styles.title}>Create Account</Text>

            <View style={styles.roleBadge}>
              <Ionicons
                name={role === 'customer' ? 'people' : 'storefront'}
                size={16}
                color={theme.colors.primary}
              />
              <Text style={styles.roleText}>
                {role === 'customer' ? 'Customer' : 'Salon Owner'}
              </Text>
            </View>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* API error banner */}
            {authError && (
              <ErrorState
                variant="inline"
                message={authError}
                type="validation"
                style={{ marginBottom: spacing.lg }}
              />
            )}

            <Input
              label="Full Name *"
              placeholder="John Doe"
              value={formData.name}
              onChangeText={(v) => handleChange('name', v)}
              autoCapitalize="words"
              editable={!isLoading}
              icon={<Ionicons name="person-outline" size={20} color={theme.colors.textSecondary} />}
              error={fieldErrors.name}
            />

            <Input
              label="Email Address *"
              placeholder="you@example.com"
              value={formData.email}
              onChangeText={(v) => handleChange('email', v)}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
              icon={<Ionicons name="mail-outline" size={20} color={theme.colors.textSecondary} />}
              error={fieldErrors.email}
            />

            <Input
              label="Phone Number"
              placeholder="+91 98765 43210"
              value={formData.phone}
              onChangeText={(v) => handleChange('phone', v)}
              keyboardType="phone-pad"
              editable={!isLoading}
              icon={<Ionicons name="call-outline" size={20} color={theme.colors.textSecondary} />}
              error={fieldErrors.phone}
            />

            <View style={styles.passwordContainer}>
              <Input
                label="Password *"
                placeholder="Min 6 characters"
                value={formData.password}
                onChangeText={(v) => handleChange('password', v)}
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

            <Button
              title="Create Account"
              onPress={handleSubmit}
              loading={isLoading}
              style={styles.submitButton}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={isLoading}>
              <Text style={styles.linkText}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: spacing.xxl },
  header: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: spacing.xl,
    padding: spacing.sm,
  },
  logoContainer: {
    width: 64,
    height: 64,
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h3,
    color: theme.colors.text,
    marginBottom: spacing.md,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.pill,
    gap: spacing.sm,
  },
  roleText: {
    ...typography.bodySmallMedium,
    color: theme.colors.primary,
  },
  form: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  passwordContainer: { position: 'relative' },
  eyeButton: {
    position: 'absolute',
    right: spacing.lg,
    top: 42,
    padding: spacing.xs,
  },
  submitButton: { marginTop: spacing.sm },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  footerText: { ...typography.bodySmall, color: theme.colors.textSecondary },
  linkText: { ...typography.bodySmall, fontWeight: '600', color: theme.colors.primary },
});

export default SignupScreen;
