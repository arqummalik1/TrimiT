import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useMutation } from '@tanstack/react-query';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';
import { useAuthStore } from '../../store/authStore';
import { subscriptionRepository } from '../../repositories/subscriptionRepository';
import { useRefreshSubscription } from '../../hooks/useSubscription';
import { handleApiError } from '../../lib/errorHandler';
import { OwnerSettingsScreenProps } from '../../navigation/types';
import { CreateSubscriptionResponse } from '../../types/subscription';

type Props = OwnerSettingsScreenProps<'SubscriptionCheckout'>;

interface RazorpaySubResponse {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

interface CheckoutMessage {
  type: 'success' | 'failed' | 'dismissed';
  payload?: unknown;
}

const SubscriptionCheckoutScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const user = useAuthStore((s) => s.user);
  const refreshSubscription = useRefreshSubscription();

  const [sub, setSub] = useState<CreateSubscriptionResponse | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const createMutation = useMutation({
    mutationFn: () => subscriptionRepository.create(),
    onSuccess: (data) => {
      if (data.already_active) {
        Alert.alert('Already subscribed', 'Your TrimiT Pro plan is already active.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
        return;
      }
      setSub(data);
    },
    onError: (err: unknown) => {
      setSetupError(handleApiError(err).message);
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (resp: RazorpaySubResponse) => subscriptionRepository.verify(resp),
    onSuccess: () => {
      refreshSubscription();
      Alert.alert('Subscription active', 'TrimiT Pro is now active. Thank you!', [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (err: unknown) => {
      Alert.alert('Verification failed', handleApiError(err).message);
    },
    onSettled: () => setVerifying(false),
  });

  useEffect(() => {
    createMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkoutHtml = useMemo(() => {
    if (!sub) return '';
    const opts = {
      key: sub.key_id,
      subscription_id: sub.subscription_id,
      name: 'TrimiT Pro',
      description: '₹299 / month subscription',
      recurring: 1,
      prefill: {
        name: user?.name || '',
        email: user?.email || '',
        contact: user?.phone || '',
      },
      theme: { color: theme.colors.primary },
    };
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Subscribe</title>
<style>body{margin:0;background:${theme.colors.background};font-family:-apple-system,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;color:${theme.colors.text}}</style>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script></head>
<body><div>Loading checkout…</div>
<script>
  var options = ${JSON.stringify(opts)};
  options.handler = function (response) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'success', payload: response }));
  };
  options.modal = {
    ondismiss: function () {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'dismissed' }));
    }
  };
  var rzp = new Razorpay(options);
  rzp.on('payment.failed', function (response) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'failed', payload: response.error }));
  });
  rzp.open();
</script></body></html>`;
  }, [sub, user, theme]);

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const msg: CheckoutMessage = JSON.parse(e.nativeEvent.data);
      if (msg.type === 'success' && msg.payload) {
        setVerifying(true);
        verifyMutation.mutate(msg.payload as RazorpaySubResponse);
      } else if (msg.type === 'failed') {
        const payload = msg.payload as { description?: string } | undefined;
        Alert.alert('Payment failed', payload?.description || 'Please try again.');
      } else if (msg.type === 'dismissed') {
        navigation.goBack();
      }
    } catch {
      return;
    }
  };

  return (
    <ScreenWrapper variant="stack">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>TrimiT Pro</Text>
          <Text style={styles.headerSubtitle}>₹299 / month</Text>
        </View>
      </View>

      {setupError ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
          <Text style={styles.errorText}>{setupError}</Text>
        </View>
      ) : !sub ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.loadingText}>Preparing secure checkout…</Text>
        </View>
      ) : (
        <View style={styles.webviewWrap}>
          <WebView
            originWhitelist={[
              'https://api.razorpay.com',
              'https://checkout.razorpay.com',
              'https://cdn.razorpay.com',
            ]}
            source={{ html: checkoutHtml }}
            onMessage={onMessage}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
          />
        </View>
      )}

      {verifying && (
        <View style={styles.verifyOverlay}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
          <Text style={styles.verifyText}>Activating your subscription…</Text>
        </View>
      )}
    </ScreenWrapper>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
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
    headerText: { marginLeft: 12 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
    headerSubtitle: { fontSize: 14, color: theme.colors.textSecondary },
    webviewWrap: { flex: 1, marginHorizontal: 12, marginVertical: 12, borderRadius: 12, overflow: 'hidden' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { color: theme.colors.textSecondary },
    errorBox: {
      flexDirection: 'row',
      gap: 8,
      margin: 20,
      padding: 12,
      backgroundColor: theme.colors.error + '1A',
      borderRadius: 8,
    },
    errorText: { color: theme.colors.error, flex: 1 },
    verifyOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    verifyText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  });

export default SubscriptionCheckoutScreen;
