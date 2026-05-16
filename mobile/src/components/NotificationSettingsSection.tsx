import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Switch, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { fonts, spacing, borderRadius } from '../lib/utils';
import { authService } from '../services/authService';
import { useAuthStore } from '../store/authStore';
import { setupPushNotifications } from '../lib/notifications';
import { showToast } from '../store/toastStore';
import { logger } from '../lib/logger';
import { useNotificationPrefsStore } from '../store/notificationPrefsStore';
import { useNotificationStore } from '../store/notificationStore';
import type { NotificationPreferences } from '../types';

const DEFAULT_PREFS: NotificationPreferences = {
  push_enabled: true,
  notify_bookings: true,
  notify_booking_updates: true,
  notify_promotional: false,
  notify_reminders: true,
};

function prefsFromUser(user: ReturnType<typeof useAuthStore.getState>['user']): NotificationPreferences {
  return {
    push_enabled: user?.push_enabled ?? true,
    notify_bookings: user?.notify_bookings ?? true,
    notify_booking_updates: user?.notify_booking_updates ?? true,
    notify_promotional: user?.notify_promotional ?? false,
    notify_reminders: user?.notify_reminders ?? true,
  };
}

export function NotificationSettingsSection() {
  const { theme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const token = useAuthStore((s) => s.token);

  const [prefs, setPrefs] = useState<NotificationPreferences>(() => prefsFromUser(user));
  const [saving, setSaving] = useState(false);
  const soundEnabled = useNotificationPrefsStore((s) => s.soundEnabled);
  const vibrationEnabled = useNotificationPrefsStore((s) => s.vibrationEnabled);
  const setSoundEnabled = useNotificationPrefsStore((s) => s.setSoundEnabled);
  const setVibrationEnabled = useNotificationPrefsStore((s) => s.setVibrationEnabled);
  const setStoreSoundEnabled = useNotificationStore((s) => s.setSoundEnabled);

  useEffect(() => {
    setPrefs(prefsFromUser(user));
  }, [user]);

  const persist = useCallback(
    async (next: NotificationPreferences) => {
      setSaving(true);
      try {
        await authService.updateNotificationPreferences(next);
        if (user && token) {
          setUser({ ...user, ...next }, token);
        }
        if (next.push_enabled) {
          await setupPushNotifications();
        }
        logger.info('[PushPrefs] saved', { prefs: next });
      } catch (e) {
        logger.error('[PushPrefs] save failed', e);
        showToast('Could not save notification settings', 'error');
        setPrefs(prefsFromUser(user));
      } finally {
        setSaving(false);
      }
    },
    [user, token, setUser]
  );

  const toggle = (key: keyof NotificationPreferences) => {
    const next = { ...prefs, [key]: !prefs[key] };
    if (key !== 'push_enabled' && !next.push_enabled) {
      return;
    }
    if (key === 'push_enabled' && !next.push_enabled) {
      setPrefs(next);
      void persist(next);
      return;
    }
    setPrefs(next);
    void persist(next);
  };

  const disabled = !prefs.push_enabled;

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Notifications</Text>
        {saving ? <ActivityIndicator size="small" color={theme.colors.primary} /> : null}
      </View>

      <Row
        label="Enable push notifications"
        value={prefs.push_enabled}
        onToggle={() => toggle('push_enabled')}
        theme={theme}
      />
      <Row
        label="Booking alerts"
        subtitle="New bookings and cancellations"
        value={prefs.notify_bookings}
        onToggle={() => toggle('notify_bookings')}
        theme={theme}
        disabled={disabled}
      />
      <Row
        label="Booking updates"
        subtitle="Confirmations, completion, reschedules"
        value={prefs.notify_booking_updates}
        onToggle={() => toggle('notify_booking_updates')}
        theme={theme}
        disabled={disabled}
      />
      <Row
        label="Reminders"
        subtitle="Local reminders before appointments"
        value={prefs.notify_reminders}
        onToggle={() => toggle('notify_reminders')}
        theme={theme}
        disabled={disabled}
      />
      <Row
        label="Offers and promotions"
        value={prefs.notify_promotional}
        onToggle={() => toggle('notify_promotional')}
        theme={theme}
        disabled={disabled}
      />
      <Row
        label="Notification sound"
        subtitle="In-app alert and Android channel"
        value={soundEnabled}
        onToggle={() => {
          const next = !soundEnabled;
          setSoundEnabled(next);
          setStoreSoundEnabled(next);
        }}
        theme={theme}
        disabled={disabled}
      />
      <Row
        label="Vibration"
        subtitle="Android booking alerts"
        value={vibrationEnabled}
        onToggle={() => setVibrationEnabled(!vibrationEnabled)}
        theme={theme}
        disabled={disabled}
      />
    </View>
  );
}

function Row({
  label,
  subtitle,
  value,
  onToggle,
  theme,
  disabled,
}: {
  label: string;
  subtitle?: string;
  value: boolean;
  onToggle: () => void;
  theme: ReturnType<typeof useTheme>['theme'];
  disabled?: boolean;
}) {
  return (
    <View style={[styles.row, disabled && styles.rowDisabled]}>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: theme.colors.text }]}>{label}</Text>
        {subtitle ? (
          <Text style={[styles.rowSub, { color: theme.colors.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: theme.colors.border, true: theme.colors.primary + '80' }}
        thumbColor={value ? theme.colors.primary : theme.colors.surfaceSecondary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 18,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  rowDisabled: {
    opacity: 0.45,
  },
  rowText: {
    flex: 1,
    paddingRight: spacing.md,
  },
  rowLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
  rowSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
});

export default NotificationSettingsSection;
