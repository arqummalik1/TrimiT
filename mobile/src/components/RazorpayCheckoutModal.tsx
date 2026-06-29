import React, { useMemo, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Modal, TouchableOpacity, Text } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { Theme } from '../theme/tokens';
import { CreateSubscriptionResponse, VerifySubscriptionPayload } from '../types/subscription';

interface Props {
  visible: boolean;
  order: CreateSubscriptionResponse | null;
  /** Optional prefill so the customer doesn't retype contact info. */
  prefill?: { name?: string; email?: string; phone?: string };
  /** Razorpay handler returned a successful payment — verify it next. */
  onSuccess: (payload: VerifySubscriptionPayload) => void;
  /** User closed the sheet without paying. */
  onDismiss: () => void;
  /** Checkout could not run (script/network/SDK problem). */
  onError: (message: string) => void;
}

type CheckoutMessage =
  | { type: 'success'; razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string }
  | { type: 'dismiss' }
  | { type: 'error'; message?: string };

/**
 * Razorpay subscription checkout rendered in a WebView (no native SDK wired).
 * Loads the hosted checkout.js, runs the subscription flow, and posts the
 * payment result back to React Native. Resilient: any failure routes to
 * onError so the screen can fall back to the "contact TrimiT" message.
 */
export const RazorpayCheckoutModal: React.FC<Props> = ({
  visible,
  order,
  prefill,
  onSuccess,
  onDismiss,
  onError,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const handledRef = useRef(false);

  const html = useMemo(() => {
    if (!order) return '';
    const safe = (v: string | undefined): string => JSON.stringify(v ?? '');
    return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  </head>
  <body style="background:transparent;">
    <script>
      function post(payload) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }
      }
      function start() {
        try {
          if (typeof Razorpay === 'undefined') {
            post({ type: 'error', message: 'Checkout failed to load.' });
            return;
          }
          var options = {
            key: ${safe(order.key_id)},
            subscription_id: ${safe(order.subscription_id)},
            name: 'TrimiT Pro',
            description: 'Owner subscription',
            prefill: {
              name: ${safe(prefill?.name)},
              email: ${safe(prefill?.email)},
              contact: ${safe(prefill?.phone)}
            },
            theme: { color: '#1f6f50' },
            handler: function (response) {
              post({
                type: 'success',
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature
              });
            },
            modal: {
              ondismiss: function () { post({ type: 'dismiss' }); }
            }
          };
          var rzp = new Razorpay(options);
          rzp.on('payment.failed', function (resp) {
            post({ type: 'error', message: (resp && resp.error && resp.error.description) || 'Payment failed.' });
          });
          rzp.open();
        } catch (e) {
          post({ type: 'error', message: 'Could not start checkout.' });
        }
      }
      window.onload = start;
    </script>
  </body>
</html>`;
  }, [order, prefill]);

  const handleMessage = (event: WebViewMessageEvent) => {
    if (handledRef.current) return;
    let msg: CheckoutMessage;
    try {
      msg = JSON.parse(event.nativeEvent.data) as CheckoutMessage;
    } catch {
      return;
    }
    if (msg.type === 'success') {
      handledRef.current = true;
      onSuccess({
        razorpay_payment_id: msg.razorpay_payment_id,
        razorpay_subscription_id: msg.razorpay_subscription_id,
        razorpay_signature: msg.razorpay_signature,
      });
    } else if (msg.type === 'dismiss') {
      handledRef.current = true;
      onDismiss();
    } else if (msg.type === 'error') {
      handledRef.current = true;
      onError(msg.message || 'Checkout could not be completed.');
    }
  };

  // Reset the one-shot guard whenever the modal is closed so a re-open works.
  if (!visible && handledRef.current) {
    handledRef.current = false;
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onDismiss}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onDismiss} style={styles.closeBtn} accessibilityLabel="Close checkout">
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Secure checkout</Text>
        </View>
        {order ? (
          <WebView
            originWhitelist={['*']}
            source={{ html, baseUrl: 'https://checkout.razorpay.com' }}
            javaScriptEnabled
            domStorageEnabled
            onMessage={handleMessage}
            onError={() => {
              if (!handledRef.current) {
                handledRef.current = true;
                onError('Could not load the payment page. Please check your connection.');
              }
            }}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loading}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            )}
            style={styles.webview}
          />
        ) : (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        )}
      </View>
    </Modal>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 16,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    closeBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
    webview: { flex: 1, backgroundColor: theme.colors.background },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  });

export default RazorpayCheckoutModal;
