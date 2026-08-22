/**
 * Sign in with Apple button (iOS only).
 *
 * Uses Apple's official native button (HIG / App Store branding).
 * Hidden when Apple auth is unavailable (Android, Expo Go, restricted device).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { showToast } from '../store/toastStore';
import { isAppleLoginVisible } from '../config/auth';
import { isAppleSignInAvailable } from '../services/appleAuthService';
import { borderRadius } from '../lib/utils';

interface Props {
  /** Ignored for native Apple button type; kept for API parity with Google. */
  label?: string;
  disabled?: boolean;
}

type AppleButtonModule = {
  AppleAuthenticationButton: React.ComponentType<{
    buttonType: number;
    buttonStyle: number;
    cornerRadius: number;
    style: object;
    onPress: () => void;
  }>;
  AppleAuthenticationButtonType: { SIGN_IN: number; CONTINUE: number; SIGN_UP: number };
  AppleAuthenticationButtonStyle: { BLACK: number; WHITE: number; WHITE_OUTLINE: number };
};

function loadAppleButtonModule(): AppleButtonModule | null {
  if (Platform.OS !== 'ios') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-apple-authentication') as AppleButtonModule;
  } catch {
    return null;
  }
}

export const AppleSignInButton: React.FC<Props> = ({ disabled = false }) => {
  const appleSignIn = useAuthStore((s) => s.appleSignIn);
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState(false);
  const styles = useMemo(() => createStyles(), []);
  const appleMod = useMemo(() => loadAppleButtonModule(), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isAppleLoginVisible() || !appleMod) {
        if (!cancelled) setAvailable(false);
        return;
      }
      const ok = await isAppleSignInAvailable();
      if (!cancelled) setAvailable(ok);
    })();
    return () => {
      cancelled = true;
    };
  }, [appleMod]);

  if (!available || !appleMod) {
    return null;
  }

  const handlePress = async () => {
    if (loading || disabled) return;
    setLoading(true);
    const result = await appleSignIn();
    setLoading(false);
    if (!result.success && !result.cancelled && result.error) {
      showToast(result.error, 'error');
    }
  };

  const { AppleAuthenticationButton, AppleAuthenticationButtonType, AppleAuthenticationButtonStyle } =
    appleMod;

  return (
    <View style={styles.wrap} testID="apple-signin">
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#FFFFFF" />
        </View>
      ) : (
        <AppleAuthenticationButton
          buttonType={AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={borderRadius.md}
          style={styles.button}
          onPress={handlePress}
        />
      )}
    </View>
  );
};

const createStyles = () =>
  StyleSheet.create({
    wrap: {
      width: '100%',
      height: 44,
    },
    button: {
      width: '100%',
      height: 44,
    },
    loadingBox: {
      flex: 1,
      height: 44,
      borderRadius: borderRadius.md,
      backgroundColor: '#000000',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export default AppleSignInButton;
