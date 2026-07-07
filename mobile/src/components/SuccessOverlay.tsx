import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { Theme } from '../theme/tokens';

interface Props {
  visible: boolean;
  title: string;
  subtitle?: string;
  /** Fired once the celebratory animation has been shown. */
  onDone: () => void;
  /** How long to hold the success state before calling onDone (ms). */
  holdMs?: number;
}

/**
 * Full-screen success celebration: a spring-scaled check inside a pulsing ring,
 * held briefly, then `onDone` fires. Used after a payment/subscription verify so
 * the user sees a clear "done!" moment instead of an abrupt screen pop.
 */
export const SuccessOverlay: React.FC<Props> = ({
  visible,
  title,
  subtitle,
  onDone,
  holdMs = 1400,
}) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const scale = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.6)).current;
  const ringOpacity = useRef(new Animated.Value(0.6)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      scale.setValue(0);
      ringScale.setValue(0.6);
      ringOpacity.setValue(0.6);
      textOpacity.setValue(0);
      return;
    }

    Animated.sequence([
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.parallel([
      Animated.timing(ringScale, {
        toValue: 1.6,
        duration: 900,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(ringOpacity, {
        toValue: 0,
        duration: 900,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(onDone, holdMs);
    return () => clearTimeout(timer);
  }, [visible, holdMs, onDone, scale, ringScale, ringOpacity, textOpacity]);

  const successColor = theme.colors.success ?? theme.colors.primary;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.backdrop}>
        <View style={styles.badgeWrap}>
          <Animated.View
            style={[
              styles.ring,
              {
                borderColor: successColor,
                opacity: ringOpacity,
                transform: [{ scale: ringScale }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.badge,
              { backgroundColor: successColor, transform: [{ scale }] },
            ]}
          >
            <Ionicons name="checkmark" size={56} color="#FFFFFF" />
          </Animated.View>
        </View>
        <Animated.View style={{ opacity: textOpacity, alignItems: 'center' }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </Animated.View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      gap: 24,
    },
    badgeWrap: { alignItems: 'center', justifyContent: 'center' },
    ring: {
      position: 'absolute',
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 3,
    },
    badge: {
      width: 104,
      height: 104,
      borderRadius: 52,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.colors.text,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 15,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 21,
    },
  });

export default SuccessOverlay;
