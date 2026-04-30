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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { typography, spacing, borderRadius } from '../../lib/utils';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';

import api from '../../lib/api';
import { showToast } from '../../store/toastStore';

interface ForgotPasswordScreenProps {
  navigation: any;
}

export default function ForgotPasswordScreen({ navigation }: ForgotPasswordScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async () => {
    if (!email) {
      showToast('Please enter your email address', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/api/auth/forgot-password', { email });
      setIsSent(true);
    } catch (error: any) {
      // Always show success to prevent email enumeration
      setIsSent(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.sentContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="mail" size={48} color={theme.colors.primary} />
          </View>
          <Text style={styles.sentTitle}>Check Your Email</Text>
          <Text style={styles.sentText}>
            If an account exists with {email}, we've sent a password reset link.
          </Text>
          <Button
            title="Back to Login"
            onPress={() => navigation.navigate('Login')}
            style={{ marginTop: spacing.xxl }}
          />
          <TouchableOpacity
            onPress={() => {
              setIsSent(false);
              setEmail('');
            }}
            style={{ marginTop: spacing.lg }}
          >
            <Text style={styles.retryText}>Try a different email</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
