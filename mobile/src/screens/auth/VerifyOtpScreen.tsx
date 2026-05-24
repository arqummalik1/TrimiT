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
import { showToast } from '../../store/toastStore';
import { typography, spacing, borderRadius } from '../../lib/utils';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';
import { AuthScreenProps } from '../../navigation/types';

type VerifyOtpProps = AuthScreenProps<'VerifyOtp'>;

export default function VerifyOtpScreen({ route, navigation }: VerifyOtpProps) {
  const { email, type } = route.params;
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { verifyOtp, sendOtp, isLoading, error: authError, clearError } = useAuthStore();

  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [resendTimer, setResendTimer] = useState(60);
  const [localError, setLocalError] = useState<string | undefined>(undefined);

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
      setResendTimer(60);
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
              We sent a 6-digit code to <Text style={styles.emailHighlight}>{maskedEmail}</Text>.
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
              disabled={isVerifyDisabled}
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
