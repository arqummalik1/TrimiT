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
import { showToast } from '../../store/toastStore';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { ErrorState } from '../../components/ErrorState';
import { typography, spacing, borderRadius } from '../../lib/utils';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';
import {
  AUTH_EMAIL_COOLDOWN_TITLE,
  getAuthRateLimitMessage,
  isAuthEmailRateLimited,
} from '../../lib/authRateLimitMessages';

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
  const { signup, resendConfirmation, isLoading, error: authError, clearError } = useAuthStore();

  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [emailConfirmationSent, setEmailConfirmationSent] = useState(false);
  const [confirmedEmail, setConfirmedEmail] = useState('');
  const [lastSignupErrorCode, setLastSignupErrorCode] = useState<string | null>(null);
  const [accountReadyForLogin, setAccountReadyForLogin] = useState(false);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', phone: '', password: '' },
  });

  const onSignupSubmit = async (data: SignupFormData) => {
    if (authError) clearError();

    if (!acceptedTerms) {
      return;
    }
    
    const result = await signup(
      data.email.trim(),
      data.password,
      data.name.trim(),
      data.phone || '',
      role
    );

    if (result.success) {
      if (result.requiresEmailConfirmation) {
        setConfirmedEmail(data.email.trim());
        setEmailConfirmationSent(true);
        setAccountReadyForLogin(!!result.accountReadyForLogin);
        setLastSignupErrorCode(null);
      }
    } else {
      setLastSignupErrorCode(result.errorCode ?? null);
      setConfirmedEmail(data.email.trim());
    }
  };

  const handleResendConfirmation = async () => {
    const email = (confirmedEmail || getValues('email') || '').trim();
    if (!email) {
      showToast('Enter your email address first', 'warning');
      return;
    }
    const result = await resendConfirmation(email);
    if (result.success) {
      setEmailConfirmationSent(true);
      setAccountReadyForLogin(!!result.accountReadyForLogin);
      setLastSignupErrorCode(null);
      clearError();
      showToast(
        result.accountReadyForLogin ? 'Account activated — you can sign in' : 'Confirmation email sent',
        'success'
      );
    } else {
      const code = result.errorCode ?? lastSignupErrorCode;
      if (code) setLastSignupErrorCode(String(code));
      showToast(
        getAuthRateLimitMessage(code, 'resend') ||
          result.error ||
          'Could not resend confirmation email',
        'error'
      );
    }
  };

  const isEmailCooldown = isAuthEmailRateLimited(lastSignupErrorCode);
  const showSignupRecovery =
    isEmailCooldown ||
    lastSignupErrorCode === 'ALREADY_REGISTERED' ||
    lastSignupErrorCode === 'RATE_LIMITED';

  const inlineAuthMessage = authError
    ? isAuthEmailRateLimited(lastSignupErrorCode)
      ? getAuthRateLimitMessage(lastSignupErrorCode, 'signup')
      : authError
    : null;

  return (
    <ScreenWrapper style={styles.container}>
      {/* ── Email confirmation sent state ────────────────────────────────── */}
      {emailConfirmationSent ? (
        <KeyboardAvoidingView style={styles.keyboardView}>
          <View style={[styles.scrollContent, { justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="mail-open-outline" size={64} color={theme.colors.primary} />
            <Text style={[styles.title, { marginTop: 24, textAlign: 'center' }]}>
              {accountReadyForLogin ? 'Account ready' : 'Check your email'}
            </Text>
            <Text style={[styles.subtitle, { textAlign: 'center', marginTop: 12, paddingHorizontal: 24 }]}>
              {accountReadyForLogin ? (
                <>
                  Your account for{' '}
                  <Text style={{ fontWeight: '700', color: theme.colors.text }}>{confirmedEmail}</Text>
                  {' '}is active. Sign in with the password you just created.
                </>
              ) : (
                <>
                  We sent a confirmation link to{' '}
                  <Text style={{ fontWeight: '700', color: theme.colors.text }}>{confirmedEmail}</Text>.
                  {' '}Open the link in your browser — you&apos;ll see an &quot;Email verified&quot; page — then return here and sign in with the same email and password.
                </>
              )}
            </Text>
            <TouchableOpacity
              style={[styles.signInButton, { marginTop: 40 }]}
              onPress={() => navigation.replace('Login')}
            >
              <Text style={styles.signInText}>
                Go to Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      ) : (
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
            {inlineAuthMessage ? (
              <ErrorState
                variant="inline"
                message={inlineAuthMessage}
                kind="validation"
                style={{ marginBottom: spacing.md }}
              />
            ) : null}

            {showSignupRecovery && (
              <View style={styles.recoveryBox}>
                {isEmailCooldown ? (
                  <>
                    <Text style={styles.recoveryTitle}>{AUTH_EMAIL_COOLDOWN_TITLE}</Text>
                    <Text style={styles.recoveryHint}>
                      {getAuthRateLimitMessage(lastSignupErrorCode, 'signup')}
                    </Text>
                    <TouchableOpacity
                      style={styles.recoveryBtnSecondary}
                      onPress={() => navigation.replace('Login')}
                      disabled={isLoading}
                    >
                      <Text style={styles.recoveryBtnSecondaryText}>Go to sign in</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.recoveryHint}>
                      Already started signup? Check your email for the confirmation link instead of
                      signing up again.
                    </Text>
                    <TouchableOpacity
                      style={styles.recoveryBtn}
                      onPress={() => void handleResendConfirmation()}
                      disabled={isLoading}
                    >
                      <Text style={styles.recoveryBtnText}>Resend confirmation email</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.recoveryBtnSecondary}
                      onPress={() => {
                        setEmailConfirmationSent(true);
                        navigation.replace('Login');
                      }}
                      disabled={isLoading}
                    >
                      <Text style={styles.recoveryBtnSecondaryText}>Go to sign in</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
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

            <View style={styles.termsRow}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setAcceptedTerms((v) => !v)}
                disabled={isLoading}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: acceptedTerms }}
              >
                <Ionicons
                  name={acceptedTerms ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={acceptedTerms ? theme.colors.primary : theme.colors.textSecondary}
                />
              </TouchableOpacity>
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text
                  style={styles.termsLink}
                  onPress={() => navigation.navigate('Terms')}
                >
                  Terms of Service
                </Text>{' '}
                and{' '}
                <Text
                  style={styles.termsLink}
                  onPress={() => navigation.navigate('PrivacyPolicy')}
                >
                  Privacy Policy
                </Text>
              </Text>
            </View>

            <Button
              title="Create Account"
              onPress={handleSubmit(onSignupSubmit)}
              loading={isLoading}
              disabled={!acceptedTerms}
              style={styles.submitButton}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={isLoading}>
              <Text style={styles.linkText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      )}
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
  subtitle: {
    ...typography.body,
    color: theme.colors.textSecondary,
  },
  signInButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.md,
    backgroundColor: theme.colors.primaryLight,
  },
  signInText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: theme.colors.primary,
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
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  checkbox: {
    paddingTop: 2,
  },
  termsText: {
    flex: 1,
    ...typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  termsLink: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  submitButton: { marginTop: spacing.sm },
  recoveryTitle: {
    ...typography.bodySmallMedium,
    color: theme.colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  recoveryBox: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  recoveryHint: {
    ...typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  recoveryBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  recoveryBtnText: {
    ...typography.bodySmallMedium,
    color: theme.colors.textInverse,
  },
  recoveryBtnSecondary: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  recoveryBtnSecondaryText: {
    ...typography.bodySmallMedium,
    color: theme.colors.primary,
  },
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
