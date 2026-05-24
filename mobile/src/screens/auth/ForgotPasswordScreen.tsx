import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { typography, spacing, borderRadius } from '../../lib/utils';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';

import api from '../../lib/api';
import { showToast } from '../../store/toastStore';
import { buildConfig } from '../../lib/buildConfig';

import { handleApiError } from '../../lib/errorHandler';
import { getUserFacingMessage } from '../../lib/userFacingError';
import {
  AUTH_EMAIL_COOLDOWN_TITLE,
  isAuthEmailRateLimited,
} from '../../lib/authRateLimitMessages';
import { ErrorState } from '../../components/ErrorState';
import { AuthScreenProps } from '../../navigation/types';

type ForgotPasswordProps = AuthScreenProps<'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation, route }: ForgotPasswordProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [email, setEmail] = useState(route.params?.prefilledEmail ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email) {
      showToast('Please enter your email address', 'error');
      return;
    }

    setIsLoading(true);
    setRateLimitMessage(null);
    try {
      await api.post('/auth/forgot-password', {
        email: email.trim().toLowerCase(),
        redirect_to: buildConfig.resetPasswordDeepLink,
      });
      showToast('Verification OTP code sent to your email.', 'success');
      navigation.navigate('VerifyOtp', { email: email.trim().toLowerCase(), type: 'recovery' });
    } catch (error) {
      const appErr = handleApiError(error);
      if (
        appErr.kind === 'network' ||
        appErr.kind === 'rate_limit' ||
        isAuthEmailRateLimited(appErr.code)
      ) {
        setRateLimitMessage(getUserFacingMessage(error, { authContext: 'forgot' }));
      } else {
        // Avoid revealing whether the email exists
        showToast('Verification OTP code sent to your email.', 'success');
        navigation.navigate('VerifyOtp', { email: email.trim().toLowerCase(), type: 'recovery' });
      }
    } finally {
      setIsLoading(false);
    }
  };

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
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="key" size={36} color={theme.colors.primary} />
            </View>
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              Enter your email and we'll send you a link to reset your password.
            </Text>
          </View>

          <View style={styles.form}>
            {rateLimitMessage ? (
              <View style={styles.rateLimitBox}>
                <Text style={styles.rateLimitTitle}>{AUTH_EMAIL_COOLDOWN_TITLE}</Text>
                <ErrorState
                  variant="inline"
                  message={rateLimitMessage}
                  kind="validation"
                  style={{ marginBottom: 0 }}
                />
              </View>
            ) : null}

            <Input
              label="Email Address"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              icon={<Ionicons name="mail-outline" size={20} color={theme.colors.textSecondary} />}
            />

            <Button
              title="Send Reset Link"
              onPress={handleSubmit}
              loading={isLoading}
              style={{ marginTop: spacing.sm }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
  },
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
  },
  subtitle: {
    ...typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  form: {
    gap: spacing.sm,
  },
  rateLimitBox: {
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rateLimitTitle: {
    ...typography.bodySmallMedium,
    color: theme.colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  sentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  successIcon: {
    width: 96,
    height: 96,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  sentTitle: {
    ...typography.h2,
    color: theme.colors.text,
    marginBottom: spacing.md,
  },
  sentText: {
    ...typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  retryText: {
    ...typography.bodySmallMedium,
    color: theme.colors.primary,
  },
});
