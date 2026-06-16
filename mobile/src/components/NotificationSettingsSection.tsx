import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Switch, StyleSheet, ActivityIndicator, TouchableOpacity, LayoutAnimation, UIManager, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import { ENABLE_OWNER_PROMO_MANAGEMENT } from '../lib/featureFlags';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
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
  const styles = React.useMemo(() => createStyles(theme), [theme]);
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

  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

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
      void (async () => {
        await persist(next);
        const { clearPushTokenOnBackend } = await import('../lib/notifications');
        await clearPushTokenOnBackend();
      })();
      return;
    }
    setPrefs(next);
    void persist(next);
  };

  const disabled = !prefs.push_enabled;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>NOTIFICATIONS</Text>
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity style={styles.headerRow} onPress={toggleExpand} activeOpacity={0.7}>
          <View style={styles.headerTitleContainer}>
            <View style={[styles.headerIconContainer, { backgroundColor: theme.colors.error }]}>
              <Ionicons name="notifications" size={20} color={theme.colors.white} />
            </View>
            <Text style={[styles.title, { color: theme.colors.text }]}>Notifications</Text>
          </View>
          <View style={styles.headerRightContainer}>
            {saving ? <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginRight: 8 }} /> : null}
            <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color={theme.colors.textSecondary} />
          </View>
        </TouchableOpacity>

        {expanded && (
          <View style={styles.expandedContent}>
            <Row
              label="Enable push notifications"
              value={prefs.push_enabled}
              onToggle={() => toggle('push_enabled')}
              theme={theme}
              styles={styles}
            />
            <Row
              label="Booking alerts"
              subtitle="New bookings and cancellations"
              value={prefs.notify_bookings}
              onToggle={() => toggle('notify_bookings')}
              theme={theme}
              styles={styles}
              disabled={disabled}
            />
            <Row
              label="Booking updates"
              subtitle="Confirmations, completion, reschedules"
              value={prefs.notify_booking_updates}
              onToggle={() => toggle('notify_booking_updates')}
              theme={theme}
              styles={styles}
              disabled={disabled}
            />
            <Row
              label="Reminders"
              subtitle="Local reminders before appointments"
              value={prefs.notify_reminders}
              onToggle={() => toggle('notify_reminders')}
              theme={theme}
              styles={styles}
              disabled={disabled}
            />
            {ENABLE_OWNER_PROMO_MANAGEMENT ? (
              <Row
                label="Offers and promotions"
                value={prefs.notify_promotional}
                onToggle={() => toggle('notify_promotional')}
                theme={theme}
                styles={styles}
                disabled={disabled}
              />
            ) : null}
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
              styles={styles}
              disabled={disabled}
            />
            <Row
              label="Vibration"
              subtitle="Android booking alerts"
              value={vibrationEnabled}
              onToggle={() => setVibrationEnabled(!vibrationEnabled)}
              theme={theme}
              styles={styles}
              disabled={disabled}
              isLast={true}
            />
          </View>
        )}
      </View>
    </View>
  );
}

function Row({
  label,
  subtitle,
  value,
  onToggle,
  theme,
  styles,
  disabled,
  isLast = false,
}: {
  label: string;
  subtitle?: string;
  value: boolean;
  onToggle: () => void;
  theme: any;
  styles: any;
  disabled?: boolean;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.row, disabled && styles.rowDisabled, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border }]}>
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

const createStyles = (theme: any) => StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    ...theme.typography.captionMedium,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    ...theme.typography.body,
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rowDisabled: {
    opacity: 0.45,
  },
  rowText: {
    flex: 1,
    paddingRight: 16,
  },
  rowLabel: {
    ...theme.typography.body,
  },
  rowSub: {
    ...theme.typography.caption,
    marginTop: 4,
  },
});

export default NotificationSettingsSection;
