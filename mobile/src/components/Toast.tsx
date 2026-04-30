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
import { colors, typography, borderRadius, spacing, shadows } from '../lib/utils';


const ICONS: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'close-circle',
  warning: 'warning',
  info: 'information-circle',
};

const BG_COLORS: Record<ToastType, string> = {
  success: colors.successLight,
  error: colors.errorLight,
  warning: colors.warningLight,
  info: colors.infoLight,
};

const ICON_COLORS: Record<ToastType, string> = {
  success: colors.success,
  error: colors.error,
  warning: colors.warning,
  info: colors.info,
};

const TEXT_COLORS: Record<ToastType, string> = {
  success: '#065F46',
  error: '#991B1B',
  warning: '#92400E',
  info: '#1E40AF',
};

const AUTO_DISMISS_MS = 3000;

export default function Toast() {
  const { visible, message, type, hide } = useToastStore();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-100)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  }, [visible, message]);

  const dismissToast = () => {
    Animated.timing(translateY, {
      toValue: -100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      hide();
    });
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + spacing.sm,
          backgroundColor: BG_COLORS[type],
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
        <Ionicons name={ICONS[type]} size={22} color={ICON_COLORS[type]} />
        <Text style={[styles.message, { color: TEXT_COLORS[type] }]} numberOfLines={2}>
          {message}
        </Text>
        <Ionicons name="close" size={18} color={TEXT_COLORS[type]} />
      </TouchableOpacity>
    </Animated.View>
  );
}

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
