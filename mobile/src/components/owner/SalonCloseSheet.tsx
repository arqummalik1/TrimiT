/**
 * SalonCloseSheet.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Owner bottom-sheet to stop taking NEW bookings, with predefined reopen
 * windows. Existing bookings are never affected.
 *
 * Options:
 *   • Pause 2 hours          → reopens now + 2h
 *   • Closed for today       → reopens tomorrow at the salon opening_time
 *   • Closed for N days       → day-stepper (reopens that day at opening_time)
 *   • Closed until I reopen   → indefinite (manual), triggers the >24h reminder
 *
 * A day-stepper is used instead of a native date picker so the owner can never
 * enter an invalid value and we add no native dependency.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';
import { fonts } from '../../lib/utils';

export interface CloseChoice {
  /** ISO reopen time, or null for indefinite. */
  closedUntil: string | null;
  label: string;
}

interface SalonCloseSheetProps {
  visible: boolean;
  /** Salon opening time "HH:mm" used to compute the reopen moment for day-based options. */
  openingTime?: string;
  saving?: boolean;
  onClose: () => void;
  onConfirm: (choice: CloseChoice) => void;
}

function atOpeningTime(daysFromNow: number, openingTime: string): Date {
  const [h, m] = (openingTime || '09:00').split(':').map((n) => parseInt(n, 10));
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(Number.isFinite(h) ? h : 9, Number.isFinite(m) ? m : 0, 0, 0);
  return d;
}

const SalonCloseSheet: React.FC<SalonCloseSheetProps> = ({
  visible,
  openingTime = '09:00',
  saving = false,
  onClose,
  onConfirm,
}) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const [days, setStateDays] = useState(2);

  const setDays = (n: number) => setStateDays(Math.max(1, Math.min(30, n)));

  const confirm = (closedUntil: string | null, label: string) =>
    onConfirm({ closedUntil, label });

  const options: { key: string; icon: string; title: string; sub: string; build: () => CloseChoice }[] = [
    {
      key: '2h',
      icon: 'time-outline',
      title: 'Pause for 2 hours',
      sub: 'Reopens automatically',
      build: () => {
        const d = new Date(Date.now() + 2 * 60 * 60 * 1000);
        return { closedUntil: d.toISOString(), label: 'Paused for 2 hours' };
      },
    },
    {
      key: 'today',
      icon: 'moon-outline',
      title: 'Closed for today',
      sub: `Reopens tomorrow at ${openingTime}`,
      build: () => ({
        closedUntil: atOpeningTime(1, openingTime).toISOString(),
        label: 'Closed for today',
      }),
    },
    {
      key: 'indefinite',
      icon: 'pause-circle-outline',
      title: 'Closed until I reopen',
      sub: "We'll remind you if it stays closed",
      build: () => ({ closedUntil: null, label: 'Closed until reopened' }),
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Stop taking bookings</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>
            New bookings will be paused. Your existing bookings stay confirmed.
          </Text>

          {options.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={styles.row}
              disabled={saving}
              onPress={() => confirm(opt.build().closedUntil, opt.build().label)}
            >
              <View style={styles.rowIcon}>
                <Ionicons name={opt.icon as never} size={20} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{opt.title}</Text>
                <Text style={styles.rowSub}>{opt.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          ))}

          {/* Multi-day stepper */}
          <View style={styles.stepperCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Closed for several days</Text>
              <Text style={styles.rowSub}>
                Reopens in {days} day{days === 1 ? '' : 's'} at {openingTime}
              </Text>
            </View>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => setDays(days - 1)} disabled={saving}>
                <Ionicons name="remove" size={18} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={styles.stepValue}>{days}</Text>
              <TouchableOpacity style={styles.stepBtn} onPress={() => setDays(days + 1)} disabled={saving}>
                <Ionicons name="add" size={18} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            style={styles.confirmDaysBtn}
            disabled={saving}
            onPress={() =>
              confirm(atOpeningTime(days, openingTime).toISOString(), `Closed for ${days} days`)
            }
          >
            <Text style={styles.confirmDaysText}>Close for {days} day{days === 1 ? '' : 's'}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 10,
    },
    handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.border, marginBottom: 16 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontFamily: fonts.heading, fontSize: 20, color: theme.colors.text },
    subtitle: { fontFamily: fonts.body, fontSize: 13, color: theme.colors.textSecondary, marginTop: 4, marginBottom: 16 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 14,
      backgroundColor: theme.colors.surfaceSecondary,
      marginBottom: 8,
    },
    rowIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary + '1A',
    },
    rowTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: theme.colors.text },
    rowSub: { fontFamily: fonts.body, fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
    stepperCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 14,
      backgroundColor: theme.colors.surfaceSecondary,
      marginTop: 4,
    },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    stepBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceHighlight,
    },
    stepValue: { fontFamily: fonts.bodyBold, fontSize: 16, color: theme.colors.text, minWidth: 22, textAlign: 'center' },
    confirmDaysBtn: {
      marginTop: 10,
      backgroundColor: theme.colors.primary,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
    },
    confirmDaysText: { fontFamily: fonts.bodyBold, fontSize: 15, color: theme.colors.textInverse },
  });

export default SalonCloseSheet;
