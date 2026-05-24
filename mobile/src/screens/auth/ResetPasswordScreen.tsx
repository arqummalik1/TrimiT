import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { typography, spacing, borderRadius } from '../../lib/utils';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';
import api from '../../lib/api';
import { showToast } from '../../store/toastStore';
import { handleApiError } from '../../lib/errorHandler';
import { AuthScreenProps } from '../../navigation/types';

type ResetPasswordProps = AuthScreenProps<'ResetPassword'>;

export default function ResetPasswordScreen({ navigation, route }: ResetPasswordProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const token = route.params?.token;

  React.useEffect(() => {
    if (!token) {
      showToast('Invalid or expired reset link', 'error');
      navigation.navigate('Login');
    }
  }, [token, navigation]);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!password || !confirmPassword) {
      showToast('Please fill both fields', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', { token, new_password: password });
      showToast('Password updated successfully', 'success');
      navigation.navigate('Login');
    } catch (error) {
      const appErr = handleApiError(error);
      showToast(appErr.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenWrapper variant="auth">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="key" size={36} color={theme.colors.primary} />
            </View>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>Enter a new password for your account.</Text>
          </View>
          <View style={styles.form}>
            <Input
              label="New Password"
              placeholder="••••••••"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              icon={<Ionicons name="lock-closed-outline" size={20} color={theme.colors.textSecondary} />}
            />
            <Input
              label="Confirm Password"
              placeholder="••••••••"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              autoCapitalize="none"
              icon={<Ionicons name="lock-closed-outline" size={20} color={theme.colors.textSecondary} />}
            />
            <Button title="Save New Password" onPress={handleSubmit} loading={isLoading} style={{ marginTop: spacing.sm }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    scrollContent: { flexGrow: 1, paddingHorizontal: spacing.xxl },
    backButton: { padding: spacing.sm, marginTop: spacing.sm, alignSelf: 'flex-start' },
    header: { alignItems: 'center', marginTop: spacing.xxxxl, marginBottom: spacing.xxxl },
    iconContainer: { width: 80, height: 80, backgroundColor: theme.colors.primaryLight, borderRadius: borderRadius.xl, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
    title: { ...typography.h2, color: theme.colors.text, marginBottom: spacing.sm },
    subtitle: { ...typography.body, color: theme.colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.xl },
    form: { gap: spacing.sm },
  });
