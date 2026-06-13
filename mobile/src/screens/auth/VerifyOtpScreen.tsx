import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
} from 'react-native';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { ErrorState } from '../../components/ErrorState';
import { useAuthStore } from '../../store/authStore';
import { usePendingSignupStore } from '../../store/pendingSignupStore';
import { showToast } from '../../store/toastStore';
import { typography, spacing, borderRadius } from '../../lib/utils';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';
import { AuthScreenProps } from '../../navigation/types';

type VerifyOtpProps = AuthScreenProps<'VerifyOtp'>;

export default function VerifyOtpScreen({ route, navigation }: VerifyOtpProps) {
  const { email, type, isPending } = route.params;
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { verifyOtp, sendOtp, isLoading, error: authError, clearError } = useAuthStore();

  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [resendTimer, setResendTimer] = useState(30);
  const [localError, setLocalError] = useState<string | undefined>(undefined);
  const [sendingCode, setSendingCode] = useState(isPending === true);

  // Refs for the 6 TextInput boxes
  const inputRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  // Countdown timer for code resend
  useEffect(() => {
    if (resendTimer === 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Clear errors on mount/unmount
  useEffect(() => {
    clearError();
    return () => clearError();
  }, [clearError]);

  // Handle isPending state — wait for background OTP send to complete
  useEffect(() => {
    if (isPending && sendingCode) {
      // Background send is happening; clear the pending state after a short delay
      // to simulate "code sent" transition (actual send may still be in progress)
      const timer = setTimeout(() => {
        setSendingCode(false);
        showToast('Verification code sent to your email.', 'success');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isPending, sendingCode]);

  const handleTextChange = (text: string, index: number) => {
    setLocalError(undefined);
    clearError();

    const numericText = text.replace(/[^0-9]/g, '');
    if (numericText.length === 6) {
      const newCode = numericText.split('');
      setCode(newCode);
      inputRefs[5].current?.focus();
      return;
    }

    const cleaned = numericText.slice(-1);
    const newCode = [...code];
    newCode[index] = cleaned;
    setCode(newCode);

    // Auto-advance focus to the next input box if typed a digit
    if (cleaned && index < 5) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Fallback focus to previous input box on backspace press
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length < 6) {
      setLocalError('Please enter all 6 digits of the code.');
      return;
    }

    // For signup verifications, peek at the pending signup so we can pass the
    // role hint (and name/phone) to the backend BEFORE the profile row is
    // created. This is the only reliable way to land on the right tab — Supabase
    // does not round-trip options.data through OTP. Peek (don't consume) here;
    // we consume after the verify call succeeds.
    let pendingExtras: { role?: 'customer' | 'owner'; name?: string; phone?: string } | undefined;
    if (type === 'signup') {
      const peek = usePendingSignupStore.getState().pending;
      if (peek && peek.email.trim().toLowerCase() === email.trim().toLowerCase()) {
        pendingExtras = {
          role: peek.role,
          name: peek.name || undefined,
          phone: peek.phone || undefined,
        };
      }
    }

    const result = await verifyOtp(email, fullCode, type, pendingExtras);
    if (result.success) {
      if (type === 'recovery') {
        // If recovery, navigate to ResetPassword with the retrieved token
        const token = result.session?.access_token;
        if (token) {
          navigation.navigate('ResetPassword', { token });
        } else {
          showToast('Failed to retrieve recovery session.', 'error');
        }
      } else {
        const isNew = result.session?.is_new_user;
        const name = result.session?.profile?.name || email.split('@')[0];

        // SIGNUP path: backend already received our role/name/phone hints, so
        // the profile row was created with the correct role. Now consume the
        // pending entry and PATCH name/phone defensively (covers any edge
        // case where the backend dropped them).
        if (type === 'signup') {
          const pending = usePendingSignupStore.getState().consumePendingSignup(email);
          if (pending && (pending.name || pending.phone)) {
            try {
              const { authService } = require('../../services/authService');
              await authService.updateProfile({
                name: pending.name || undefined,
                phone: pending.phone || undefined,
              });
              const { useAuthStore: store } = require('../../store/authStore');
              const current = store.getState().user;
              if (current) {
                store.setState({
                  user: { ...current, name: pending.name || current.name, phone: pending.phone || current.phone },
                });
              }
            } catch (e) {
              // Non-fatal: user is already signed in. They can edit later from Profile.
              // eslint-disable-next-line no-console
              console.warn('[VerifyOtp] post-signup profile patch failed', e);
            }
          }
        }

        if (isNew) {
          showToast('Your new account has been created successfully!', 'success');
        } else {
          showToast(`Welcome back, ${name}!`, 'success');
        }
      }
    } else {
      showToast(result.error || 'Verification failed. Please try again.', 'error');
    }
  };

  const handleResend = async () => {
    clearError();
    setLocalError(undefined);
    const result = await sendOtp(email);
    if (result.success) {
      showToast('A new code has been sent to your email.', 'success');
      setResendTimer(30);
      setCode(Array(6).fill(''));
      inputRefs[0].current?.focus();
    } else {
      showToast(result.error || 'Failed to resend code. Please try again.', 'error');
    }
  };

  // Mask email for display (e.g. te**@example.com)
  const maskedEmail = useMemo(() => {
    const [name, domain] = email.split('@');
    if (!name || !domain) return email;
    if (name.length <= 2) return `${name}***@${domain}`;
    return `${name.slice(0, 2)}***@${domain}`;
  }, [email]);

  const isVerifyDisabled = code.some((val) => !val) || isLoading;

  return (
    <ScreenWrapper variant="auth">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={isLoading}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="mail-unread-outline" size={36} color={theme.colors.primary} />
            </View>
            <Text style={styles.title}>Enter Verification Code</Text>
            <Text style={styles.subtitle}>
              {sendingCode ? (
                'Sending verification code...'
              ) : (
                <>
                  We sent a 6-digit code to <Text style={styles.emailHighlight}>{maskedEmail}</Text>.
                </>
              )}
            </Text>
          </View>

          <View style={styles.form}>
            {(authError || localError) && (
              <ErrorState
                variant="inline"
                message={authError || localError}
                kind="validation"
                style={{ marginBottom: spacing.lg }}
              />
            )}

            {/* Numeric Digits Code Boxes */}
            <View style={styles.codeContainer}>
              {code.map((value, index) => (
                <TextInput
                  key={index}
                  ref={inputRefs[index]}
                  style={[
                    styles.codeInput,
                    value ? styles.codeInputFilled : null,
                  ]}
                  value={value}
                  onChangeText={(text) => handleTextChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={6} // allow pasting of whole string
                  selectTextOnFocus
                  editable={!isLoading}
                  textContentType="oneTimeCode"
                />
              ))}
            </View>

            <Button
              title="Verify & Continue"
              onPress={handleVerify}
              loading={isLoading}
              disabled={isVerifyDisabled || sendingCode}
              style={{ marginTop: spacing.xl }}
            />

            {/* Resend Cooldown Section */}
            <View style={styles.resendContainer}>
              {resendTimer > 0 ? (
                <Text style={styles.timerText}>
                  Resend code in <Text style={styles.timerHighlight}>{resendTimer}s</Text>
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResend} disabled={isLoading}>
                  <Text style={styles.resendText}>Resend Code</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: spacing.xxl,
    },
    backButton: {
      padding: spacing.sm,
      marginTop: spacing.sm,
      alignSelf: 'flex-start',
    },
    header: {
      alignItems: 'center',
      marginTop: spacing.xxxxl,
      marginBottom: spacing.xxxl,
    },
    iconContainer: {
      width: 80,
      height: 80,
      backgroundColor: theme.colors.primaryLight,
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
      ...typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: spacing.xl,
      lineHeight: 22,
    },
    emailHighlight: {
      fontWeight: '600',
      color: theme.colors.text,
    },
    form: {
      gap: spacing.sm,
    },
    codeContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginVertical: spacing.lg,
      gap: spacing.xs,
    },
    codeInput: {
      width: 48,
      height: 56,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      borderRadius: borderRadius.md,
      textAlign: 'center',
      fontSize: 22,
      fontWeight: '600',
      color: theme.colors.text,
      backgroundColor: theme.colors.surface,
    },
    codeInputFilled: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.surfaceSecondary,
    },
    resendContainer: {
      marginTop: spacing.xl,
      alignItems: 'center',
    },
    timerText: {
      ...typography.bodySmall,
      color: theme.colors.textSecondary,
    },
    timerHighlight: {
      fontWeight: '600',
      color: theme.colors.text,
    },
    resendText: {
      ...typography.bodySmallMedium,
      color: theme.colors.primary,
      textDecorationLine: 'underline',
    },
  });
