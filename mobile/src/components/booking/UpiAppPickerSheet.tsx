/**
 * UpiAppPickerSheet.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Bottom-sheet that lists the UPI apps installed on the device and lets the
 * customer choose which one to pay with (GPay / PhonePe / Paytm / WhatsApp /
 * BHIM …). This replaces relying on Android's default-handler, which on some
 * devices silently opens only one app (e.g. WhatsApp).
 *
 * If no installed apps are detected, we still show a "Pay with any UPI app"
 * option that fires the generic intent so the user is never stuck.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';
import { fonts, formatPrice } from '../../lib/utils';
import type { UpiApp } from '../../services/upiIntentService';

interface UpiAppPickerSheetProps {
  visible: boolean;
  apps: UpiApp[];
  /** True while we're still detecting installed apps. */
  detecting?: boolean;
  amount: number;
  payeeName?: string;
  onSelectApp: (app: UpiApp) => void;
  /** Fire the generic UPI intent (system handles app choice). */
  onPayWithAny: () => void;
  onClose: () => void;
}

/** Brand color per app for the icon chip. */
const APP_COLORS: Record<string, string> = {
  gpay: '#1A73E8',
  phonepe: '#5F259F',
  paytm: '#00BAF2',
  whatsapp: '#25D366',
  bhim: '#00A8E0',
  amazonpay: '#FF9900',
  cred: '#1C1C1C',
};

const UpiAppPickerSheet: React.FC<UpiAppPickerSheetProps> = ({
  visible,
  apps,
  detecting = false,
  amount,
  payeeName,
  onSelectApp,
  onPayWithAny,
  onClose,
}) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>Choose a UPI app</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Pay {formatPrice(amount || 0)}
            {payeeName ? ` to ${payeeName}` : ''}
          </Text>

          {detecting ? (
            <View style={styles.detecting}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={styles.detectingText}>Finding your UPI apps…</Text>
            </View>
          ) : (
            <View style={styles.appList}>
              {apps.map((app) => (
                <TouchableOpacity
                  key={app.key}
                  style={styles.appRow}
                  onPress={() => onSelectApp(app)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.appIcon,
                      { backgroundColor: (APP_COLORS[app.key] || theme.colors.primary) + '1A' },
                    ]}
                  >
                    <Ionicons
                      name="wallet"
                      size={22}
                      color={APP_COLORS[app.key] || theme.colors.primary}
                    />
                  </View>
                  <Text style={styles.appName}>{app.name}</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={theme.colors.textTertiary}
                  />
                </TouchableOpacity>
              ))}

              {/* Always offer the generic option as a fallback / catch-all. */}
              <TouchableOpacity
                style={styles.appRow}
                onPress={onPayWithAny}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.appIcon,
                    { backgroundColor: theme.colors.primary + '1A' },
                  ]}
                >
                  <Ionicons name="apps" size={22} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.appName}>
                    {apps.length > 0 ? 'Other UPI app' : 'Pay with any UPI app'}
                  </Text>
                  <Text style={styles.appHint}>Let me pick from all apps</Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.colors.textTertiary}
                />
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.footerNote}>
            You'll pay the salon directly. After paying, the salon verifies it and
            confirms your booking.
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 10,
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.border,
      marginBottom: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      fontFamily: fonts.heading,
      fontSize: 20,
      color: theme.colors.text,
    },
    subtitle: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 4,
      marginBottom: 16,
    },
    detecting: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 32,
    },
    detectingText: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    appList: {
      gap: 8,
    },
    appRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 14,
      backgroundColor: theme.colors.surfaceSecondary,
    },
    appIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    appName: {
      flex: 1,
      fontFamily: fonts.bodyBold,
      fontSize: 16,
      color: theme.colors.text,
    },
    appHint: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    footerNote: {
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 18,
      color: theme.colors.textTertiary,
      textAlign: 'center',
      marginTop: 16,
    },
  });

export default UpiAppPickerSheet;
