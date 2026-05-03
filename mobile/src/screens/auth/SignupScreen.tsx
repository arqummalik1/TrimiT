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
  Image,
} from 'react-native';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { ErrorState } from '../../components/ErrorState';
import { typography, spacing, borderRadius } from '../../lib/utils';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// ─── Validation Schema ────────────────────────────────────────────────────────

const signupSchema = z.object({
  name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().regex(/^[+\d\s\-()]{7,15}$/, 'Enter a valid phone number').optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type SignupFormData = z.infer<typeof signupSchema>;

// ─── Component ────────────────────────────────────────────────────────────────

import { AuthScreenProps } from '../../navigation/types';

type SignupProps = AuthScreenProps<'Signup'>;

export const SignupScreen: React.FC<SignupProps> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const role: 'customer' | 'owner' = route.params?.role || 'customer';
  const { signup, isLoading, error: authError, clearError } = useAuthStore();

  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', phone: '', password: '' },
  });

  const onSignupSubmit = async (data: SignupFormData) => {
    if (authError) clearError();
    
    const result = await signup(
      data.email.trim(),
      data.password,
      data.name.trim(),
      data.phone || '',
      role
    );

    if (result.success) {
      // Logic for redirect is handled by auth observer in App.tsx
    }
  };

  return (
    <ScreenWrapper style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
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
              <Image source={require('../../../assets/logo.png')} style={{ width: 32, height: 32, resizeMode: 'contain', tintColor: theme.colors.textInverse }} />
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
                kind="validation"
                style={{ marginBottom: spacing.lg }}
              />
            )}

            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Full Name *"
                  placeholder="John Doe"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  autoCapitalize="words"
                  editable={!isLoading}
                  icon={<Ionicons name="person-outline" size={20} color={theme.colors.textSecondary} />}
                  error={errors.name?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Email Address *"
                  placeholder="you@example.com"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!isLoading}
                  icon={<Ionicons name="mail-outline" size={20} color={theme.colors.textSecondary} />}
                  error={errors.email?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Phone Number"
                  placeholder="+91 98765 43210"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  keyboardType="phone-pad"
                  editable={!isLoading}
                  icon={<Ionicons name="call-outline" size={20} color={theme.colors.textSecondary} />}
                  error={errors.phone?.message}
                />
              )}
            />

            <View style={styles.passwordContainer}>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Password *"
                    placeholder="Min 6 characters"
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    secureTextEntry={!showPassword}
                    editable={!isLoading}
                    icon={<Ionicons name="lock-closed-outline" size={20} color={theme.colors.textSecondary} />}
                    error={errors.password?.message}
                  />
                )}
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
              onPress={handleSubmit(onSignupSubmit)}
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
    </ScreenWrapper>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1 },
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
