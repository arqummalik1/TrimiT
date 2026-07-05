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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { ErrorState } from '../../components/ErrorState';
import { GoogleSignInButton } from '../../components/GoogleSignInButton';
import { showToast } from '../../store/toastStore';
import { getAuthRateLimitMessage } from '../../lib/authRateLimitMessages';
import { typography, spacing, borderRadius } from '../../lib/utils';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { isGoogleLoginVisible } from '../../config/auth';

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

import { AuthScreenProps } from '../../navigation/types';

type LoginProps = AuthScreenProps<'Login'>;

export const LoginScreen: React.FC<LoginProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const {
    login,
    resendConfirmation,
    isLoading,
    error: authError,
    clearError,
    requiresEmailConfirmation,
  } = useAuthStore();
  const [resendLoading, setResendLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isOtpLogin, setIsOtpLogin] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});

  const handleFieldChange = useCallback(
    (value: string) => {
      setEmail(value);
      if (fieldErrors.email) setFieldErrors((e) => ({ ...e, email: undefined }));
      if (authError) clearError();
    },
    [fieldErrors, authError, clearError]
  );

  const handlePasswordChange = useCallback(
    (value: string) => {
      setPassword(value);
      if (fieldErrors.password) setFieldErrors((e) => ({ ...e, password: undefined }));
      if (authError) clearError();
    },
    [fieldErrors, authError, clearError]
  );

  const handleSignInWithOtp = async () => {
    if (!email.trim()) {
      setFieldErrors({ email: 'Email is required to sign in with OTP.' });
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setFieldErrors({ email: 'Enter a valid email address.' });
      return;
    }

    // OPTIMISTIC NAVIGATION: Navigate immediately for instant UX (Zomato/Blinkit-style).
    // OTP screen shows "Sending code..." state while the email is being sent in background.
    const normalizedEmail = email.trim().toLowerCase();
    navigation.navigate('VerifyOtp', { 
      email: normalizedEmail, 
      type: 'magiclink',
      isPending: true 
    });

    // Send OTP in background and update the screen with the result
    const store = useAuthStore.getState();
    const result = await store.sendOtp(normalizedEmail);
    
    // Check if the user is still in the OTP flow (did not navigate back/away)
    const state = navigation.getState();
    const isStillInOtpFlow = !state || state.routes.some(route => route.name === 'VerifyOtp');
    
    if (isStillInOtpFlow) {
      // Update the VerifyOtp screen with the result via re-navigation using merge: true
      navigation.navigate({
        name: 'VerifyOtp',
        params: {
          email: normalizedEmail,
          type: 'magiclink',
          isPending: false,
          otpSendResult: result.success ? 'success' : 'error'
        },
        merge: true
      });
    }
    
    if (!result.success) {
      // Error is shown inline in VerifyOtp via the otpSendResult param
      // No toast here to avoid duplicate error messages
    }
  };

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
        showToast('Sign in failed. Please try again.', 'error');
      }
    }
  };

  return (
    <ScreenWrapper variant="auth">
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
              <Image source={require('../../../assets/logo.png')} style={{ width: 40, height: 40, resizeMode: 'contain', tintColor: theme.colors.textInverse }} />
            </View>
            <Text style={styles.title}>{isOtpLogin ? 'Sign In with OTP' : 'Welcome Back'}</Text>
            <Text style={styles.subtitle}>
              {isOtpLogin ? 'Enter your email to receive a 6-digit code' : 'Sign in to continue to TrimiT'}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* API error inline banner */}
            {authError && (
              <ErrorState
                variant="inline"
                message={authError}
                kind="validation"
                style={{ marginBottom: spacing.lg }}
              />
            )}

            {requiresEmailConfirmation ? (
              <TouchableOpacity
                style={styles.resendConfirmRow}
                disabled={resendLoading || isLoading || !email.trim()}
                onPress={async () => {
                  setResendLoading(true);
                  const result = await resendConfirmation(email.trim());
                  setResendLoading(false);
                  if (result.success) {
                    showToast(
                      result.accountReadyForLogin
                        ? 'Account is ready — you can sign in now'
                        : 'Confirmation email sent — check your inbox',
                      'success'
                    );
                  } else {
                    showToast(
                      getAuthRateLimitMessage(result.errorCode, 'resend') ||
                        result.error ||
                        'Could not resend confirmation email',
                      'error'
                    );
                  }
                }}
              >
                <Text style={styles.resendConfirmText}>
                  {resendLoading ? 'Sending…' : 'Resend confirmation email'}
                </Text>
              </TouchableOpacity>
            ) : null}

            <Input
              label="Email Address"
              placeholder="you@example.com"
              value={email}
              onChangeText={(v) => handleFieldChange(v)}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
              icon={<Ionicons name="mail-outline" size={20} color={theme.colors.textSecondary} />}
              error={fieldErrors.email}
            />

            {!isOtpLogin && (
              <View style={styles.passwordContainer}>
                <Input
                  label="Password"
                  placeholder="••••••••"
                  value={password}
                  onChangeText={(v) => handlePasswordChange(v)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!isLoading}
                  icon={<Ionicons name="lock-closed-outline" size={20} color={theme.colors.textSecondary} />}
                  error={fieldErrors.password}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.forgotButton}
                  onPress={() => navigation.navigate('ForgotPassword', { prefilledEmail: email.trim() })}
                  disabled={isLoading}
                >
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>
            )}

            <Button
              title={isOtpLogin ? 'Send Verification Code' : 'Sign In'}
              onPress={isOtpLogin ? handleSignInWithOtp : handleLogin}
              loading={isLoading}
              style={styles.submitButton}
            />

            <TouchableOpacity
              style={styles.toggleModeButton}
              onPress={() => {
                setIsOtpLogin(!isOtpLogin);
                setFieldErrors({});
                clearError();
              }}
              disabled={isLoading}
            >
              <Text style={styles.toggleModeText}>
                {isOtpLogin ? 'Sign in with Email and Password' : 'Sign in with OTP'}
              </Text>
            </TouchableOpacity>

            {/* Google sign-in */}
            {isGoogleLoginVisible() && (
              <>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                <GoogleSignInButton label="Sign in with Google" />
              </>
            )}
          </View>


        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
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
  resendConfirmRow: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
  },
  resendConfirmText: {
    ...typography.bodySmallMedium,
    color: theme.colors.primary,
    textAlign: 'center',
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
  toggleModeButton: {
    alignSelf: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  toggleModeText: {
    ...typography.bodySmallMedium,
    color: theme.colors.primary,
    textAlign: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    ...typography.caption,
    color: theme.colors.textSecondary,
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
