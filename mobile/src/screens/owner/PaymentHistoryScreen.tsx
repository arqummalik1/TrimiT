import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';
import { OwnerSettingsScreenProps } from '../../navigation/types';
import { usePaymentHistory } from '../../hooks/useSubscription';
import { SubscriptionPayment } from '../../types/subscription';

type Props = OwnerSettingsScreenProps<'PaymentHistory'>;

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

const STATUS_COLORS: Record<string, string> = {
  captured: '#16A34A',
  failed: '#DC2626',
  refunded: '#B45309',
  authorized: '#2563EB',
  created: '#6B7280',
};

const PaymentHistoryScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { data, isLoading } = usePaymentHistory();

  const renderItem = ({ item }: { item: SubscriptionPayment }) => {
    const color = STATUS_COLORS[item.status] ?? theme.colors.textSecondary;
    return (
      <View style={styles.row}>
        <View style={styles.rowLeft}>
          <Text style={styles.amount}>₹{(item.amount / 100).toFixed(0)}</Text>
          <Text style={styles.date}>{formatDate(item.paid_at ?? item.created_at)}</Text>
        </View>
        <View style={styles.rowRight}>
          <View style={[styles.badge, { backgroundColor: color + '1A' }]}>
            <Text style={[styles.badgeText, { color }]}>{item.status}</Text>
          </View>
          {item.method ? <Text style={styles.method}>{item.method}</Text> : null}
        </View>
      </View>
    );
  };

  return (
    <ScreenWrapper variant="stack">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment History</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={data?.payments ?? []}
          keyExtractor={(p) => p.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            (data?.payments?.length ?? 0) > 0 ? (
              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>Total paid</Text>
                <Text style={styles.totalValue}>₹{((data?.total_paid ?? 0) / 100).toFixed(0)}</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="receipt-outline" size={40} color={theme.colors.textSecondary} />
              <Text style={styles.muted}>No payments yet</Text>
            </View>
          }
        />
      )}
    </ScreenWrapper>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 16,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      width: 40,
      height: 40,
      backgroundColor: theme.colors.surfaceSecondary,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
    list: { padding: 16, gap: 10 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 80 },
    muted: { color: theme.colors.textSecondary },
    totalCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.colors.primary + '14',
      padding: 16,
      borderRadius: 12,
      marginBottom: 8,
    },
    totalLabel: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
    totalValue: { color: theme.colors.primary, fontSize: 20, fontWeight: '800' },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 14,
    },
    rowLeft: { gap: 2 },
    rowRight: { alignItems: 'flex-end', gap: 4 },
    amount: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
    date: { fontSize: 12, color: theme.colors.textSecondary },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
    method: { fontSize: 11, color: theme.colors.textSecondary, textTransform: 'uppercase' },
  });

export default PaymentHistoryScreen;
