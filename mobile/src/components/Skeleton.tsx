/**
 * Skeleton.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shimmer skeleton primitive built on React Native Animated + expo-linear-gradient.
 * No external "shimmer" library required.
 *
 * The gradient sweeps left→right on an infinite loop, creating the premium
 * "moving light" shimmer effect seen in Airbnb, Stripe, and Uber apps.
 *
 * Usage:
 *   <Skeleton width={240} height={20} borderRadius={8} />
 *   <Skeleton width="100%" height={120} />
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  View,
  StyleSheet,
  ViewStyle,
  LayoutChangeEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const SHIMMER_DURATION_MS = 1200;

// ─── Types ────────────────────────────────────────────────────────────────────

interface SkeletonProps {
  width?: number | `${number}%` | 'auto';
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height,
  borderRadius = 8,
  style,
}) => {
  const { theme } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = React.useState(0);

  // Use theme colors
  const BASE_COLOR = theme.colors.shimmer;
  const HIGHLIGHT_COLOR = theme.isDark 
    ? theme.colors.surfaceHighlight 
    : '#FFFFFF'; // Pure white sweep for light mode premium feel

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: SHIMMER_DURATION_MS,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const handleLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  // Translate the gradient across the full container width
  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-containerWidth, containerWidth],
  });

  return (
    <View
      onLayout={handleLayout}
      style={[
        styles.container,
        { width: width as any, height, borderRadius, backgroundColor: BASE_COLOR },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { transform: [{ translateX }] },
        ]}
      >
        <LinearGradient
          colors={[BASE_COLOR, HIGHLIGHT_COLOR, BASE_COLOR]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});

export default Skeleton;
