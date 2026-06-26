import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { Button } from '../../components/Button';
import { Skeleton } from '../../components/Skeleton';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';
import { CustomerDiscoverScreenProps } from '../../navigation/types';
import { PAYU_CHECKOUT_URL, PayuParams, PayuMode, isKnownPaymentStatus } from '../../types/payment';
import { usePaymentStatus } from '../../hooks/usePayment';
import { navigateToCustomerBookings } from '../../lib/navigationHelpers';

type Props = CustomerDiscoverScreenProps<'PayuCheckout'>;

/** Phases of the hosted-checkout flow. */
type Phase = 'checkout' | 'verifying' | 'success' | 'failed';

/**
 * HTML-escape a value for safe interpolation into a hidden-input `value`
 * attribute. PayU params are server-generated, but we still escape defensively.
 */
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Build a self-submitting HTML form that POSTs the signed PayU params to the
 * PayU hosted checkout. PayU renders its own secure capture UI — no card data
 * ever touches the app (Req 13.1).
 */
function buildCheckoutHtml(action: string, params: PayuParams): string {
  const inputs = Object.entries(params)
    .filter(([, v]) => typeof v === 'string')
    .map(
      ([k, v]) =>
        `<input type="hidden" name="${escapeAttr(k)}" value="${escapeAttr(v as string)}" />`
    )
    .join('\n');

  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body onload="document.forms[0].submit()" style="background:#fff;font-family:-apple-system,Roboto,sans-serif;text-align:center;padding-top:48px;">
  <p>Redirecting to secure payment…</p>
  <form method="post" action="${escapeAttr(action)}">
    ${inputs}
  </form>
</body></html>`;
}

/**
 * PayuCheckoutScreen — hosts the PayU checkout in a WebView and then verifies
 * the result by polling the server (the authoritative source).
 *
 * Flow:
 *   1. Auto-POST the signed params to the PayU hosted checkout (test/live URL).
 *   2. PayU redirects the browser to the backend callback (surl/furl). We detect
 *      that navigation, stop the WebView, and switch to "verifying".
 *   3. Poll GET /payments/status until the payment reaches paid/failed, then
 *      show success/failure. The server is authoritative — a client that never
 *      sees the callback still resolves via the PayU webhook (Req 8.7).
 *
 * TODO(PayU): the hosted-checkout URL (test vs live) currently defaults to
 * `test` because the backend does not return the mode in the order params.
 * Confirm/inject the live URL once PayU split settlement is activated, and
 * confirm the exact surl/furl return path so detection stays robust.
 *
 * Requirements: 4.5, 17.4, 17.5
 */
const PayuCheckoutScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { payu, bookingId, amountPaise } = route.params;
  const mode: PayuMode = route.params.mode ?? 'test';
  const action = PAYU_CHECKOUT_URL[mode];

  const [phase, setPhase] = useState<Phase>('checkout');

  const html = useMemo(() => buildCheckoutHtml(action, payu), [action, payu]);

  // Detect the return to our backend callback (surl/furl). PayU redirects the
  // browser there after checkout; we intercept rather than render the callback.
  const isReturnUrl = useCallback(
    (url: string): boolean => {
      if (!url) return false;
      if (url.includes('/payment/callback') || url.includes('/payments/verify')) {
        return true;
      }
      // Fall back to matching the configured surl/furl origin+path.
      const targets = [payu.surl, payu.furl].filter(Boolean) as string[];
      return targets.some((t) => {
        try {
          const tu = new URL(t);
          return url.startsWith(`${tu.origin}${tu.pathname}`);
        } catch {
          return false;
        }
      });
    },
    [payu.surl, payu.furl]
  );

  // Poll payment status only once checkout has returned (Req 8.7).
  const statusQuery = usePaymentStatus(bookingId, phase === 'verifying');

  // Resolve success/failure from the authoritative server status.
  React.useEffect(() => {
    if (phase !== 'verifying') return;
    const data = statusQuery.data;
    if (!data || !isKnownPaymentStatus(data)) return;
    if (data.payment_status === 'paid') {
      setPhase('success');
    } else if (data.payment_status === 'failed') {
      setPhase('failed');
    }
    // `pending` → keep polling (handled by the hook's refetchInterval).
  }, [phase, statusQuery.data]);

  const handleWebViewNav = useCallback(
    (navState: WebViewNavigation) => {
      if (phase === 'checkout' && isReturnUrl(navState.url)) {
        setPhase('verifying');
      }
    },
    [phase, isReturnUrl]
  );

  // ── Verifying / result states ────────────────────────────────────────────
  if (phase !== 'checkout') {
    return (
      <ScreenWrapper variant="stack">
        <View style={styles.resultContainer}>
          {phase === 'verifying' && (
            <>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.resultTitle}>Confirming your payment…</Text>
              <Text style={styles.resultSubtitle}>
                This only takes a moment. Please don’t close the app.
              </Text>
              <View style={styles.skeletonGroup}>
                <Skeleton width="100%" height={16} />
                <Skeleton width="80%" height={16} />
                <Skeleton width="60%" height={16} />
              </View>
            </>
          )}

          {phase === 'success' && (
            <>
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.successLight }]}>
                <Ionicons name="checkmark-circle" size={56} color={theme.colors.success} />
              </View>
              <Text style={styles.resultTitle}>Payment successful</Text>
              <Text style={styles.resultSubtitle}>
                Your booking is confirmed. You can view it in My Bookings.
              </Text>
              <Button
                title="View Bookings"
                onPress={() => navigateToCustomerBookings(navigation)}
                style={styles.resultButton}
              />
            </>
          )}

          {phase === 'failed' && (
            <>
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.errorLight }]}>
                <Ionicons name="close-circle" size={56} color={theme.colors.error} />
              </View>
              <Text style={styles.resultTitle}>Payment not completed</Text>
              <Text style={styles.resultSubtitle}>
                Your booking is still reserved. You can pay at the salon, or try
                paying online again from My Bookings.
              </Text>
              <Button
                title="Back to Bookings"
                onPress={() => navigateToCustomerBookings(navigation)}
                style={styles.resultButton}
              />
            </>
          )}
        </View>
      </ScreenWrapper>
    );
  }

  // ── Checkout (WebView) ─────────────────────────────────────────────────────
  return (
    <ScreenWrapper variant="stack">
      <WebView
        originWhitelist={['*']}
        source={{ html, baseUrl: action }}
        onNavigationStateChange={handleWebViewNav}
        onShouldStartLoadWithRequest={(req) => {
          if (phase === 'checkout' && isReturnUrl(req.url)) {
            setPhase('verifying');
            return false; // don't render the backend callback inside the WebView
          }
          return true;
        }}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.webviewLoading}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.resultSubtitle}>Loading secure checkout…</Text>
          </View>
        )}
        // Accessibility: amount shown on the entry screen; this is PayU's UI.
        accessibilityLabel={`PayU secure checkout for ₹${(amountPaise / 100).toFixed(2)}`}
      />
    </ScreenWrapper>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    resultContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      gap: 12,
    },
    iconCircle: {
      width: 96,
      height: 96,
      borderRadius: 48,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    resultTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: 'center',
    },
    resultSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    resultButton: {
      marginTop: 16,
      minWidth: 200,
    },
    skeletonGroup: {
      width: '100%',
      gap: 10,
      marginTop: 16,
    },
    webviewLoading: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      backgroundColor: theme.colors.background,
    },
  });

export default PayuCheckoutScreen;
