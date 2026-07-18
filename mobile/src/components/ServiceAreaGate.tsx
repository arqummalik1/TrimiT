/**
 * ServiceAreaGate.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shown on Discover when the customer's location is OUTSIDE every active
 * service area. Instead of a confusing "No Salons Found", it clearly says
 * TrimiT isn't live in their city yet and lets them join the waitlist (a
 * demand lead the founder sees in the admin dashboard).
 *
 * The illustration is animated with the built-in Animated API only (no Lottie /
 * Reanimated) so it ships as a JS-only / OTA-safe change — no native rebuild.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { Theme } from '../theme/tokens';
import { Button } from './Button';
import { Input } from './Input';
import { TAB_BAR_BASE_HEIGHT } from './ScreenWrapper';
import { serviceabilityRepository } from '../repositories/serviceabilityRepository';
import { useAuthStore } from '../store/authStore';
import { handleApiError } from '../lib/errorHandler';
import { logger } from '../lib/logger';
import type { ServiceabilityResult } from '../types';

const LOG = '[ServiceAreaGate]';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ServiceAreaGateProps {
  result: ServiceabilityResult;
  coords: { lat: number; lng: number } | null;
}

/** Pulsing location pin with expanding sonar rings. */
const AnimatedLocationPin: React.FC<{ color: string }> = ({ color }) => {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const makeRing = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 1,
            duration: 2000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(val, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );

    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -8, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );

    const a = makeRing(ring1, 0);
    const b = makeRing(ring2, 1000);
    a.start();
    b.start();
    bobLoop.start();
    return () => {
      a.stop();
      b.stop();
      bobLoop.stop();
    };
  }, [ring1, ring2, bob]);

  const ringStyle = (val: Animated.Value) => ({
    transform: [{ scale: val.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.2] }) }],
    opacity: val.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.5, 0] }),
  });

  return (
    <View style={pinStyles.wrap}>
      <Animated.View style={[pinStyles.ring, { borderColor: color }, ringStyle(ring1)]} />
      <Animated.View style={[pinStyles.ring, { borderColor: color }, ringStyle(ring2)]} />
      <Animated.View style={{ transform: [{ translateY: bob }] }}>
        <Ionicons name="location" size={72} color={color} />
      </Animated.View>
    </View>
  );
};

export const ServiceAreaGate: React.FC<ServiceAreaGateProps> = ({ result, coords }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const user = useAuthStore((s) => s.user);
  // Clear the floating tab bar (same token as Discover lists / ScreenWrapper).
  const scrollBottomPad = TAB_BAR_BASE_HEIGHT + insets.bottom;

  const [email, setEmail] = useState(user?.email ?? '');
  const [name, setName] = useState(user?.name ?? '');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [serverError, setServerError] = useState<string | null>(null);

  const nearest = result.nearest_area;
  const launchingSoon = !!nearest?.launching_soon;
  const activeAreas = result.active_areas ?? [];
  const servesText =
    activeAreas.length === 1
      ? `TrimiT is currently live in ${activeAreas[0]}.`
      : activeAreas.length > 1
      ? `TrimiT is currently live in ${activeAreas.slice(0, -1).join(', ')} and ${activeAreas[activeAreas.length - 1]}.`
      : 'TrimiT is launching in new cities soon.';

  const headline = launchingSoon && nearest?.name
    ? `Launching soon in ${nearest.name}!`
    : "We're not in your area yet";

  const submit = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmed)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setEmailError(null);
    setServerError(null);
    setStatus('loading');
    try {
      await serviceabilityRepository.joinWaitlist({
        email: trimmed,
        name: name.trim() || undefined,
        lat: coords?.lat,
        lng: coords?.lng,
        area_label: nearest?.name,
        source: 'mobile',
      });
      setStatus('success');
      logger.info(`${LOG} waitlist joined`);
    } catch (err) {
      const appErr = handleApiError(err);
      logger.warn(`${LOG} waitlist failed`, { kind: appErr.kind });
      setServerError(appErr.message || 'Could not add you to the waitlist. Please try again.');
      setStatus('error');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: scrollBottomPad }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        testID="service-area-gate-scroll"
      >
        <AnimatedLocationPin color={theme.colors.primary} />

        <Text style={styles.title}>{headline}</Text>
        <Text style={styles.subtitle}>{servesText}</Text>

        {typeof result.nearest_distance_km === 'number' && nearest?.name ? (
          <View style={styles.distancePill}>
            <Ionicons name="navigate-outline" size={14} color={theme.colors.primary} />
            <Text style={styles.distanceText}>
              Nearest city: {nearest.name} · ~{Math.round(result.nearest_distance_km)} km away
            </Text>
          </View>
        ) : null}

        {status === 'success' ? (
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={48} color={theme.colors.success} />
            <Text style={styles.successTitle}>You're on the list! 🎉</Text>
            <Text style={styles.successBody}>
              We'll email you the moment TrimiT reaches your area.
            </Text>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.formPrompt}>
              Want TrimiT in your city? Get notified the moment we launch near you.
            </Text>
            <Input
              label="Name (optional)"
              placeholder="Your name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="next"
            />
            <Input
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (emailError) setEmailError(null);
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="done"
              error={emailError ?? undefined}
              onSubmitEditing={submit}
            />
            {serverError ? <Text style={styles.serverError}>{serverError}</Text> : null}
            <Button
              title="Notify me at launch"
              onPress={submit}
              status={status === 'loading' ? 'loading' : status === 'error' ? 'error' : 'idle'}
              icon={<Ionicons name="notifications-outline" size={18} color={theme.colors.textInverse} />}
              style={styles.cta}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const pinStyles = StyleSheet.create({
  wrap: {
    width: 160,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  ring: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
  },
});

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.background },
    container: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 28,
      paddingTop: 40,
      // paddingBottom set at render: TAB_BAR_BASE_HEIGHT + safe-area inset
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: theme.colors.text,
      textAlign: 'center',
      marginTop: 8,
    },
    subtitle: {
      fontSize: 15,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 21,
    },
    distancePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.colors.surfaceSecondary,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      marginTop: 16,
    },
    distanceText: {
      fontSize: 13,
      color: theme.colors.text,
      fontWeight: '600',
    },
    form: {
      width: '100%',
      marginTop: 28,
    },
    formPrompt: {
      fontSize: 14,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 18,
      fontWeight: '600',
    },
    cta: {
      marginTop: 4,
    },
    serverError: {
      color: theme.colors.error,
      fontSize: 13,
      marginBottom: 10,
      textAlign: 'center',
    },
    successCard: {
      width: '100%',
      alignItems: 'center',
      marginTop: 28,
      padding: 24,
      borderRadius: 16,
      backgroundColor: theme.colors.surface,
    },
    successTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.colors.text,
      marginTop: 12,
    },
    successBody: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: 6,
      lineHeight: 20,
    },
  });

export default ServiceAreaGate;
