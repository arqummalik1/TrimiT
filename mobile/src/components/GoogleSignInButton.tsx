/**
 * "Sign in with Google" button — Google identity branding on native.
 *
 * Triggers the native Google account picker via authStore.googleSignIn().
 * New users → CompleteProfile; returning users → role-based tabs.
 */
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { showToast } from '../store/toastStore';
import { typography, spacing, borderRadius } from '../lib/utils';
import { GoogleGLogo } from './GoogleGLogo';

interface Props {
  label?: string;
  disabled?: boolean;
}

export const GoogleSignInButton: React.FC<Props> = ({
  label = 'Sign in with Google',
  disabled = false,
}) => {
  const styles = useMemo(() => createStyles(), []);
  const googleSignIn = useAuthStore((s) => s.googleSignIn);
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    setLoading(true);
    const result = await googleSignIn();
    setLoading(false);
    if (!result.success && !result.cancelled && result.error) {
      showToast(result.error, 'error');
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, (loading || disabled) && styles.buttonDisabled]}
      onPress={handlePress}
      disabled={loading || disabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID="google-signin"
    >
      {loading ? (
        <ActivityIndicator size="small" color="#4285F4" />
      ) : (
        <View style={styles.content}>
          <GoogleGLogo size={20} />
          <Text style={styles.label}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const createStyles = () =>
  StyleSheet.create({
    button: {
      height: 44,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: '#747775',
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#3C4043',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
      elevation: 1,
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
      color: '#1F1F1F',
      fontWeight: '500',
    },
  });

export default GoogleSignInButton;
