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
  ViewStyle,
  TextStyle,
} from 'react-native';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { ErrorState } from '../../components/ErrorState';
import { useAuthStore } from '../../store/authStore';
import { showToast } from '../../store/toastStore';
import { typography, spacing, borderRadius } from '../../lib/utils';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';
import { AuthScreenProps } from '../../navigation/types';
import { OTP_RESEND_COOLDOWN_SECONDS } from '../../config/auth';

type VerifyOtpProps = AuthScreenProps<'VerifyOtp'>;

interface ResendCountdownSectionProps {
  email: string;
  sendOtp: (email: string) => Promise<{ success: boolean; error?: string }>;
  isLoading: boolean;
  clearError: () => void;
  setLocalError: (err: string | undefined) => void;
  setCode: React.Dispatch<React.SetStateAction<string>>;
  focusInput: () => void;
  theme: Theme;
  styles: {
    resendContainer: ViewStyle;
    timerText: TextStyle;
    timerHighlight: TextStyle;
    resendText: TextStyle;
  };
}

const ResendCountdownSection: React.FC<ResendCountdownSectionProps> = ({
  email,
  sendOtp,
  isLoading,
  clearError,
  setLocalError,
  setCode,
  focusInput,
  theme,
  styles,
}) => {
  const [resendTimer, setResendTimer] = useState(OTP_RESEND_COOLDOWN_SECONDS);
  const [resendLoading, setResendLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (resendTimer <= 0) return;

    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [resendTimer > 0 ? 'running' : 'stopped']);

  const handleResend = async () => {
    clearError();
    setLocalError(undefined);
    setResendLoading(true);
    
    const result = await sendOtp(email);
    
    setResendLoading(false);
    
    if (result.success) {
      showToast('A new code has been sent to your email.', 'success');
      setResendTimer(OTP_RESEND_COOLDOWN_SECONDS);
      setCode('');
      focusInput();
    } else {
      showToast(result.error || 'Failed to resend code. Please try again.', 'error');
    }
  };

  return (
    <View style={styles.resendContainer}>
      {resendTimer > 0 ? (
        <Text style={styles.timerText}>
          Resend code in <Text style={styles.timerHighlight}>{resendTimer}s</Text>
        </Text>
      ) : (
        <TouchableOpacity 
          onPress={handleResend} 
          disabled={isLoading || resendLoading}
        >
          <Text style={styles.resendText}>
            {resendLoading ? 'Sending...' : 'Resend Code'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default function VerifyOtpScreen({ route, navigation }: VerifyOtpProps) {
  const { email, type } = route.params;
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { verifyOtp, sendOtp, isLoading, error: authError, clearError } = useAuthStore();

  const [code, setCode] = useState<string>('');
  const [localError, setLocalError] = useState<string | undefined>(undefined);
  const [sendingCode, setSendingCode] = useState(route.params.isPending === true);
  const [otpSendFailed, setOtpSendFailed] = useState(false);

  // Single hidden input backs the 6 visual boxes. A SINGLE field is what makes
  // iOS Security-Code AutoFill (QuickType bar) fill all 6 digits at once — six
  // separate inputs only ever get the first digit filled. It also makes paste
  // and Android autofill behave correctly.
  const inputRef = useRef<TextInput>(null);
  const focusInput = () => inputRef.current?.focus();

  // Clear errors on mount/unmount
  useEffect(() => {
    clearError();
    return () => clearError();
  }, [clearError]);

  // Listen for the actual OTP send result from LoginScreen/SignupScreen
  // Watch specific params to avoid triggering on every route.params change
  useEffect(() => {
    const { otpSendResult, isPending } = route.params;
    
    if (otpSendResult === 'success') {
      // Background OTP send succeeded
      setSendingCode(false);
      setOtpSendFailed(false);
      setLocalError(undefined);
      showToast('Verification code sent to your email.', 'success');
    } else if (otpSendResult === 'error') {
      // Background OTP send failed
      setSendingCode(false);
      setOtpSendFailed(true);
      setLocalError('Failed to send verification code. Please check your network or try again.');
    } else if (isPending === false && !otpSendResult) {
      // isPending cleared but no explicit result — assume success
      setSendingCode(false);
      setOtpSendFailed(false);
      setLocalError(undefined);
      showToast('Verification code sent to your email.', 'success');
    }
  }, [route.params.otpSendResult, route.params.isPending]);

  // SAFETY TIMEOUT: If isPending remains true for too long, unblock the UI and warn the user
  useEffect(() => {
    const { isPending } = route.params;
    if (!isPending || !sendingCode) return;
    
    const timeoutTimer = setTimeout(() => {
      // Still in sending state after 15s — unblock the UI but do NOT assume success
      if (sendingCode) {
        setSendingCode(false);
        setOtpSendFailed(true);
        setLocalError('Verification code delivery is taking longer than expected. Please check your inbox or try resending.');
      }
    }, 15000);
    
    return () => clearTimeout(timeoutTimer);
  }, [route.params.isPending, sendingCode]);

  const handleCodeChange = (text: string) => {
    setLocalError(undefined);
    clearError();
    const numeric = text.replace(/[^0-9]/g, '').slice(0, 6);
    setCode(numeric);
  };

  const handleVerify = async () => {
    const fullCode = code;
    if (fullCode.length < 6) {
      setLocalError('Please enter all 6 digits of the code.');
      return;
    }

    const result = await verifyOtp(email, fullCode, type);
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

        if (isNew) {
          showToast("Welcome to TrimiT! Let's set up your profile.", 'success');
        } else {
          showToast(`Welcome back, ${name}!`, 'success');
        }
      }
    } else {
      showToast(result.error || 'Verification failed. Please try again.', 'error');
    }
  };

  // Mask email for display (e.g. te**@example.com)
  const maskedEmail = useMemo(() => {
    const [name, domain] = email.split('@');
    if (!name || !domain) return email;
    if (name.length <= 2) return `${name}***@${domain}`;
    return `${name.slice(0, 2)}***@${domain}`;
  }, [email]);

  const isVerifyDisabled = code.length < 6 || isLoading;

  return (
    <ScreenWrapper variant="auth">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
              ) : otpSendFailed ? (
                'Unable to send code. Please try resending below.'
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

            {/* Numeric code: one hidden input drives 6 visual cells so iOS/
                Android autofill + paste fill all digits at once. */}
            <TouchableOpacity activeOpacity={1} onPress={focusInput}>
              <View style={styles.codeContainer}>
                {Array.from({ length: 6 }).map((_, index) => {
                  const char = code[index] ?? '';
                  const isActive = index === Math.min(code.length, 5) && !char;
                  return (
                    <View
                      key={index}
                      style={[
                        styles.codeInput,
                        char ? styles.codeInputFilled : null,
                        isActive ? styles.codeInputActive : null,
                      ]}
                    >
                      <Text style={styles.codeInputText}>{char}</Text>
                    </View>
                  );
                })}
              </View>

              <TextInput
                ref={inputRef}
                value={code}
                onChangeText={handleCodeChange}
                keyboardType="number-pad"
                maxLength={6}
                editable={!isLoading}
                autoFocus
                textContentType="oneTimeCode"
                autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
                importantForAutofill="yes"
                caretHidden
                style={styles.hiddenInput}
                accessibilityLabel="6-digit verification code"
              />
            </TouchableOpacity>

            <Button
              title="Verify & Continue"
              onPress={handleVerify}
              loading={isLoading}
              disabled={isVerifyDisabled || sendingCode}
              style={{ marginTop: spacing.xl }}
            />

            {/* Resend Cooldown Section */}
            <ResendCountdownSection
              email={email}
              sendOtp={sendOtp}
              isLoading={isLoading}
              clearError={clearError}
              setLocalError={setLocalError}
              setCode={setCode}
              focusInput={focusInput}
              theme={theme}
              styles={styles}
            />
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
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
    },
    codeInputText: {
      textAlign: 'center',
      fontSize: 22,
      fontWeight: '600',
      color: theme.colors.text,
    },
    codeInputFilled: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.surfaceSecondary,
    },
    codeInputActive: {
      borderColor: theme.colors.primary,
    },
    hiddenInput: {
      position: 'absolute',
      width: '100%',
      height: 56,
      opacity: 0,
      // Keep it within the box row so focus/paste feels natural.
      top: spacing.lg,
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
