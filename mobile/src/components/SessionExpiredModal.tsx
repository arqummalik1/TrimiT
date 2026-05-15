import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../store/authStore';
import { fonts, spacing, borderRadius } from '../lib/utils';

export function SessionExpiredModal() {
  const { theme } = useTheme();
  const sessionExpired = useAuthStore((s) => s.sessionExpired);
  const dismissSessionExpired = useAuthStore((s) => s.dismissSessionExpired);

  return (
    <Modal visible={sessionExpired} transparent animationType="fade" onRequestClose={dismissSessionExpired}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.iconWrap, { backgroundColor: theme.colors.primaryLight }]}>
            <Ionicons name="time-outline" size={28} color={theme.colors.primary} />
          </View>
          <Text style={[styles.title, { color: theme.colors.text }]}>Session expired</Text>
          <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
            Your session has expired. Please log in again to continue.
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            onPress={dismissSessionExpired}
            accessibilityRole="button"
            accessibilityLabel="Log in again"
          >
            <Text style={[styles.buttonText, { color: theme.colors.textInverse }]}>Log in again</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  button: {
    width: '100%',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SessionExpiredModal;
