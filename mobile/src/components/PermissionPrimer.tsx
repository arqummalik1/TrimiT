import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius, typography, fonts } from '../lib/utils';

interface PermissionPrimerProps {
  isVisible: boolean;
  title: string;
  message: string;
  icon: keyof typeof Ionicons.glyphMap;
  onAllow: () => void;
  onDeny: () => void;
}

export const PermissionPrimer: React.FC<PermissionPrimerProps> = ({
  isVisible,
  title,
  message,
  icon,
  onAllow,
  onDeny,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name={icon} size={48} color={theme.colors.primary} />
          </View>
          
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          
          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.button, styles.denyButton]} 
              onPress={onDeny}
            >
              <Text style={styles.denyText}>Not Now</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.allowButton]} 
              onPress={onAllow}
            >
              <Text style={styles.allowText}>Allow Access</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  content: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  message: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  denyButton: {
    backgroundColor: theme.colors.surfaceSecondary,
  },
  allowButton: {
    backgroundColor: theme.colors.primary,
  },
  denyText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  allowText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
