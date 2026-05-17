import React from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleProp,
  Text,
  TextStyle,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../store/authStore';

interface SignOutButtonProps {
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  /** Optional extra line in the confirmation alert (e.g. cache cleared). */
  confirmDetail?: string;
}

export function SignOutButton({ style, textStyle, confirmDetail }: SignOutButtonProps) {
  const { theme } = useTheme();
  const logout = useAuthStore((s) => s.logout);
  const isSigningOut = useAuthStore((s) => s.isSigningOut);

  const handlePress = () => {
    if (isSigningOut) {
      return;
    }

    const message = confirmDetail
      ? `Are you sure you want to sign out? ${confirmDetail}`
      : 'Are you sure you want to sign out?';

    Alert.alert('Sign Out', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          void logout();
        },
      },
    ]);
  };

  return (
    <TouchableOpacity
      style={[style, isSigningOut && { opacity: 0.65 }]}
      onPress={handlePress}
      disabled={isSigningOut}
      accessibilityRole="button"
      accessibilityLabel={isSigningOut ? 'Signing out' : 'Sign Out'}
      accessibilityState={{ disabled: isSigningOut, busy: isSigningOut }}
    >
      {isSigningOut ? (
        <>
          <ActivityIndicator size="small" color={theme.colors.error} />
          <Text style={[textStyle, { color: theme.colors.error }]}>Signing out…</Text>
        </>
      ) : (
        <>
          <Ionicons name="log-out-outline" size={22} color={theme.colors.error} />
          <Text style={textStyle}>Sign Out</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export default SignOutButton;
