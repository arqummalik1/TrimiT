import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { colors, formatPrice, formatTime } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import { CustomerDiscoverScreenProps } from '../../navigation/types';

type Props = CustomerDiscoverScreenProps<'Payment'>;

interface CreateOrderResponse {
  order_id: string;
  amount: number;
  currency: string;
  booking_id: string;
  key_id: string;
}

const PaymentScreen: React.FC<Props> = ({ navigation, route }) => {
  const { bookingId, amount, salonName, serviceName, bookingDate, timeSlot } = route.params;
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [order, setOrder] = useState<CreateOrderResponse | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<CreateOrderResponse>('/api/payments/create-order', {
        booking_id: bookingId,
      });
      return res.data;
    },
    onSuccess: (data) => setOrder(data),
    onError: (err: any) => {
      setOrderError(err.response?.data?.detail || 'Could not start payment');
    },
  });

  React.useEffect(() => {
    createOrderMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Razorpay standard checkout HTML, posts result back via window.ReactNativeWebView.postMessage
  const checkoutHtml = useMemo(() => {
    if (!order) return '';
    const opts = {
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      order_id: order.order_id,
      name: 'TrimiT',
      description: `${serviceName} @ ${salonName}`,
      prefill: {
        name: user?.name || '',
        email: user?.email || '',
        contact: user?.phone || '',
      },
      theme: { color: '#9A3412' },
    };
    // The HTML opens Razorpay automatically and forwards success/failure to RN.
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Pay</title>
<style>body{margin:0;background:#FAFAF9;font-family:-apple-system,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;color:#1c1917}</style>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script></head>
<body><div>Loading payment…</div>
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
  }, [order, serviceName, salonName, user]);

  const verifyMutation = useMutation({
    mutationFn: async (resp: {
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
    }) => {
      const res = await api.post('/api/payments/verify', {
        booking_id: bookingId,
        razorpay_payment_id: resp.razorpay_payment_id,
        razorpay_order_id: resp.razorpay_order_id,
        razorpay_signature: resp.razorpay_signature,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      Alert.alert('Payment successful', 'Your booking is confirmed.', [
        {
          text: 'View bookings',
          onPress: () => navigation.navigate('DiscoverMain'),
        },
      ]);
    },
    onError: (err: any) => {
      Alert.alert(
        'Verification failed',
        err.response?.data?.detail ||
          'Payment was taken but we could not verify it. Contact support with your booking ID.'
      );
    },
    onSettled: () => setVerifying(false),
  });

  const onMessage = (e: WebViewMessageEvent) => {
    let msg: any;
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === 'success' && msg.payload) {
      setVerifying(true);
      verifyMutation.mutate(msg.payload);
    } else if (msg.type === 'failed') {
      Alert.alert('Payment failed', msg.payload?.description || 'Please try again.');
    } else if (msg.type === 'dismissed') {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Payment</Text>
          <Text style={styles.headerSubtitle}>{salonName}</Text>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Row label="Service" value={serviceName} />
        <Row label="Date" value={bookingDate} />
        <Row label="Time" value={formatTime(timeSlot)} />
        <Row label="Amount" value={formatPrice(amount)} bold />
      </View>

      {orderError ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={20} color={colors.error} />
          <Text style={styles.errorText}>{orderError}</Text>
        </View>
      ) : !order ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Preparing secure checkout…</Text>
        </View>
      ) : (
        <View style={styles.webviewWrap}>
          <WebView
            originWhitelist={['*']}
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
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.verifyText}>Verifying payment…</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const Row: React.FC<{ label: string; value: string; bold?: boolean }> = ({ label, value, bold }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={[styles.rowValue, bold && styles.rowValueBold]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { marginLeft: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  headerSubtitle: { fontSize: 14, color: colors.textSecondary },
  summaryCard: {
    margin: 20,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { fontSize: 14, color: colors.textSecondary },
  rowValue: { fontSize: 14, color: colors.text, fontWeight: '500' },
  rowValueBold: { fontSize: 16, fontWeight: '700', color: colors.primary },
  webviewWrap: { flex: 1, marginHorizontal: 12, marginBottom: 12, borderRadius: 12, overflow: 'hidden' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: colors.textSecondary },
  errorBox: {
    flexDirection: 'row',
    gap: 8,
    margin: 20,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
  },
  errorText: { color: colors.error, flex: 1 },
  verifyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  verifyText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default PaymentScreen;
