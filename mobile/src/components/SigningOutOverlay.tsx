import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme/ThemeContext';
import { borderRadius, fonts, spacing } from '../lib/utils';

/**
 * Full-screen feedback while sign-out teardown runs (push, cache, session).
 * Mounted at app root so it stays visible across navigation reset.
 */
export function SigningOutOverlay() {
  const isSigningOut = useAuthStore((s) => s.isSigningOut);
  const { theme } = useTheme();
  const [statusText, setStatusText] = useState('Signing out…');

  useEffect(() => {
    if (!isSigningOut) {
      setStatusText('Signing out…');
      return;
    }
    setStatusText('Signing out…');
    const timer = setTimeout(() => {
      setStatusText('Redirecting to sign in…');
    }, 1200);
    return () => clearTimeout(timer);
  }, [isSigningOut]);

  if (!isSigningOut) {
    return null;
  }

  return (
    <View style={styles.root} pointerEvents="auto" accessibilityViewIsModal>
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.title, { color: theme.colors.text }]}>{statusText}</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Please wait a moment
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 280,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    fontWeight: '600',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    textAlign: 'center',
  },
});

export default SigningOutOverlay;
