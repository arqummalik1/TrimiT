import React from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { SPLASH_BACKGROUND, SPLASH_LOGO } from '../lib/splashBranding';
import { lightPalette } from '../theme/colors';

type AppSplashScreenProps = {
  /** Optional subtitle (errors, config issues). Omit during normal launch — logo only. */
  message?: string;
  details?: string[];
  showSpinner?: boolean;
};

/** In-app splash matching native launch: OLED black + transparent T logo. */
export function AppSplashScreen({
  message,
  details,
  showSpinner = false,
}: AppSplashScreenProps) {
  return (
    <View style={styles.root}>
      <Image source={SPLASH_LOGO} style={styles.logo} accessibilityLabel="TrimiT" />
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {details?.map((line) => (
        <Text key={line} style={styles.detail}>
          • {line}
        </Text>
      ))}
      {showSpinner ? (
        <ActivityIndicator size="large" color={lightPalette.primary} style={styles.spinner} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SPLASH_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
  },
  message: {
    marginTop: 20,
    fontSize: 15,
    lineHeight: 22,
    color: '#A8A29E',
    textAlign: 'center',
  },
  detail: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: '#78716C',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  spinner: {
    marginTop: 28,
  },
});
