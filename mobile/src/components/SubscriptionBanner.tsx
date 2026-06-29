import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { Theme } from '../theme/tokens';
import { SubscriptionStatusView } from '../types/subscription';

interface Props {
  status: SubscriptionStatusView;
  onPress: () => void;
}

type Tone = 'info' | 'warning' | 'danger';

interface BannerContent {
  tone: Tone;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  cta: string;
}

function resolveContent(s: SubscriptionStatusView): BannerContent | null {
  if (s.status === 'active') return null; // nothing to nag about

  if (s.status === 'trial') {
    const d = s.trial_days_remaining;
    if (d > 2) return null; // only warn from 2 days out
    if (d === 0) {
      return {
        tone: 'danger',
        icon: 'alert-circle',
        title: 'Your free trial expires today',
        subtitle: 'Subscribe to TrimiT Pro to keep your salon active.',
        cta: 'Subscribe',
      };
    }
    return {
      tone: 'warning',
      icon: 'time',
      title: `${d} day${d === 1 ? '' : 's'} left in your free trial`,
      subtitle: 'Subscribe to TrimiT Pro (₹299/mo) to avoid interruption.',
      cta: 'Subscribe',
    };
  }

  if (s.status === 'expired' || s.status === 'cancelled') {
    return {
      tone: 'danger',
      icon: 'lock-closed',
      title: 'Subscription expired',
      subtitle: 'Subscribe to TrimiT Pro to unlock your salon features.',
      cta: 'Subscribe',
    };
  }

  if (s.status === 'payment_failed' || s.status === 'past_due') {
    return {
      tone: 'danger',
      icon: 'card',
      title: 'Payment failed',
      subtitle: 'Update your payment to keep TrimiT Pro active.',
      cta: 'Fix payment',
    };
  }

  if (s.status === 'grace_period') {
    return {
      tone: 'warning',
      icon: 'warning',
      title: 'Grace period',
      subtitle: 'Renew now to avoid losing access.',
      cta: 'Renew',
    };
  }

  return null;
}

export const SubscriptionBanner: React.FC<Props> = ({ status, onPress }) => {
  const { theme } = useTheme();
  const content = resolveContent(status);
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (!content) return null;

  const toneColor =
    content.tone === 'danger'
      ? theme.colors.error
      : content.tone === 'warning'
      ? theme.colors.warning ?? '#B45309'
      : theme.colors.primary;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.container, { borderColor: toneColor, backgroundColor: toneColor + '14' }]}
    >
      <Ionicons name={content.icon} size={22} color={toneColor} />
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: toneColor }]} numberOfLines={1}>
          {content.title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {content.subtitle}
        </Text>
      </View>
      <View style={[styles.cta, { backgroundColor: toneColor }]}>
        <Text style={styles.ctaText}>{content.cta}</Text>
      </View>
    </TouchableOpacity>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      marginHorizontal: 16,
      marginTop: 12,
      borderRadius: 12,
      borderWidth: 1,
    },
    textWrap: { flex: 1 },
    title: { fontSize: 14, fontWeight: '700' },
    subtitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
    cta: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
    ctaText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  });

export default SubscriptionBanner;
