import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { Theme } from '../theme/tokens';
import { useSubscriptionStatus } from '../hooks/useSubscription';
import { ENABLE_SUBSCRIPTION_ENFORCEMENT } from '../lib/featureFlags';

/**
 * Phase 2 freeze. When client enforcement is enabled AND the backend reports
 * the owner has no access, render a full-screen blocking overlay so the entire
 * owner app is non-interactive until they subscribe. The backend independently
 * enforces this (defense in depth); this is the UX layer.
 *
 * Phase 1: renders nothing (no-op), so old behaviour is unchanged.
 */
export const SubscriptionGate: React.FC = () => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation<any>();
  const { data: status } = useSubscriptionStatus();

  if (!ENABLE_SUBSCRIPTION_ENFORCEMENT) return null;
  if (!status) return null;
  // Only block when the backend itself is enforcing and access is gone.
  if (!status.enforcement_enabled || status.has_access) return null;

  const goSubscribe = () => {
    navigation.navigate('Settings', { screen: 'SubscriptionCheckout' });
  };

  return (
    <View style={styles.overlay} pointerEvents="auto">
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Ionicons name="lock-closed" size={32} color={theme.colors.primary} />
        </View>
        <Text style={styles.title}>Subscription required</Text>
        <Text style={styles.body}>
          Your TrimiT Pro subscription is inactive. Subscribe to ₹299/month to
          unlock your dashboard, bookings, services and keep your salon visible
          to customers.
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={goSubscribe}>
          <Ionicons name="card" size={18} color="#FFFFFF" />
          <Text style={styles.primaryBtnText}>Subscribe to TrimiT Pro</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      zIndex: 1000,
      elevation: 1000,
    },
    card: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      gap: 12,
    },
    iconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.primary + '1A',
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { fontSize: 20, fontWeight: '800', color: theme.colors.text, textAlign: 'center' },
    body: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 20 },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.colors.primary,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 12,
      marginTop: 8,
      alignSelf: 'stretch',
    },
    primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  });

export default SubscriptionGate;
