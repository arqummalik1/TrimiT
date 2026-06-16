import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../lib/utils';


export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const insets = useSafeAreaInsets();
  const opacity = React.useRef(new Animated.Value(0)).current;
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOfflineRef = React.useRef(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = !(state.isConnected && state.isInternetReachable !== false);

      if (offline) {
        isOfflineRef.current = true;
        setIsOffline(true);
        setShowBanner(true);
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } else if (isOfflineRef.current) {
        // Show "Back online" briefly then hide
        isOfflineRef.current = false;
        setIsOffline(false);
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(({ finished }) => {
            if (finished) setShowBanner(false);
          });
        }, 2000);
      }
    });

    return () => {
      unsubscribe();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      opacity.stopAnimation();
    };
  }, [opacity]);

  if (!showBanner) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top,
          backgroundColor: isOffline ? '#991B1B' : '#059669',
          opacity,
        },
      ]}
    >
      <Ionicons
        name={isOffline ? 'cloud-offline' : 'cloud-done'}
        size={16}
        color="#FFFFFF"
      />
      <Text style={styles.text}>
        {isOffline ? 'No internet connection' : 'Back online'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9998,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs + 2,
    gap: spacing.sm,
  },
  text: {
    ...typography.captionMedium,
    color: '#FFFFFF',
  },
});
