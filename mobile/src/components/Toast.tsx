import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useToastStore, ToastType } from '../store/toastStore';
import { typography, borderRadius, spacing, shadows } from '../lib/utils';
import { useTheme } from '../theme/ThemeContext';
import { Theme } from '../theme/tokens';

const ICONS: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error:   'close-circle',
  warning: 'warning',
  info:    'information-circle',
};

const AUTO_DISMISS_MS = 3000;

export default function Toast() {
  const { current, dismiss } = useToastStore();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const translateY = useRef(new Animated.Value(-100)).current;
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derive simple states for animation
  const visible = !!current;
  const type = current?.type || 'info';
  const message = current?.message || '';

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();

      timerRef.current = setTimeout(() => {
        dismissToast();
      }, AUTO_DISMISS_MS);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [current]);

  const dismissToast = () => {
    Animated.timing(translateY, {
      toValue: -100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      dismiss();
    });
  };

  // Theme-aware toast colors
  const bgColors: Record<ToastType, string> = {
    success: theme.colors.successLight,
    error:   theme.colors.errorLight,
    warning: theme.colors.warningLight,
    info:    theme.colors.infoLight,
  };

  const iconColors: Record<ToastType, string> = {
    success: theme.colors.success,
    error:   theme.colors.error,
    warning: theme.colors.warning,
    info:    theme.colors.info,
  };

  // Text color must have strong contrast on both palette backgrounds
  const textColors: Record<ToastType, string> = isDark
    ? { success: '#82E0AA', error: '#FF5F5F', warning: '#F7DC6F', info: '#85C1E9' }
    : { success: '#065F46', error: '#991B1B', warning: '#92400E', info: '#1E40AF' };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + spacing.sm,
          backgroundColor: bgColors[type],
          transform: [{ translateY }],
        },
        shadows.md,
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        activeOpacity={0.8}
        onPress={dismissToast}
      >
        <Ionicons name={ICONS[type]} size={22} color={iconColors[type]} />
        <Text style={[styles.message, { color: textColors[type] }]} numberOfLines={2}>
          {message}
        </Text>
        <Ionicons name="close" size={18} color={textColors[type]} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// Static styles — only layout, no colors
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 9999,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  message: {
    flex: 1,
    ...typography.bodySmallMedium,
  },
});
