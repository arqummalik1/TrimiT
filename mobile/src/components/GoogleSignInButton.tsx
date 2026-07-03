/**
 * GoogleSignInButton.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * "Continue with Google" button. Triggers the native Google account picker via
 * the auth store's googleSignIn(). On success the RootNavigator auto-routes:
 * new users to CompleteProfile (pick role), returning users to their tabs.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { showToast } from '../store/toastStore';
import { useTheme } from '../theme/ThemeContext';
import { Theme } from '../theme/tokens';
import { typography, spacing, borderRadius } from '../lib/utils';

interface Props {
  label?: string;
  disabled?: boolean;
}

export const GoogleSignInButton: React.FC<Props> = ({
  label = 'Continue with Google',
  disabled = false,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const googleSignIn = useAuthStore((s) => s.googleSignIn);
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    setLoading(true);
    const result = await googleSignIn();
    setLoading(false);
    // Silent on user-cancel; only surface real errors.
    if (!result.success && !result.cancelled && result.error) {
      showToast(result.error, 'error');
    }
    // On success the navigator swaps the stack automatically.
  };

  return (
    <TouchableOpacity
      style={[styles.button, (loading || disabled) && styles.buttonDisabled]}
      onPress={handlePress}
      disabled={loading || disabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.textSecondary} />
      ) : (
        <View style={styles.content}>
          <Ionicons name="logo-google" size={20} color="#EA4335" />
          <Text style={styles.label}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    button: {
      height: 52,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    label: {
      ...typography.bodyMedium,
      color: theme.colors.text,
    },
  });

export default GoogleSignInButton;
