import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing, borderRadius } from '../theme';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] CRITICAL:', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleHardReset = () => {
    Alert.alert(
      'Hard Reset',
      'This will clear all local data and sign you out. Use this if the app is repeatedly crashing.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset App', 
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              // Force reload by simply resetting state and hoping for the best
              // or using Updates.reloadAsync() if expo-updates is available.
              this.handleRetry();
              Alert.alert('Success', 'Local storage cleared. Please restart the app if it doesn\'t recover.');
            } catch (e) {
              console.error('Failed to clear storage:', e);
            }
          }
        },
      ]
    );
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <Ionicons name="alert-circle" size={64} color={colors.error} />
          </View>
          
          <Text style={styles.title}>Application Error</Text>
          <Text style={styles.message}>
            TrimiT encountered an unexpected problem. We've been notified and are working on it.
          </Text>
          
          {__DEV__ && this.state.error && (
            <View style={styles.debugContainer}>
              <Text style={styles.debugTitle}>Debug Info:</Text>
              <Text style={styles.errorDetail} numberOfLines={6}>
                {this.state.error.message}
              </Text>
            </View>
          )}
          
          <View style={styles.actions}>
            <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
              <Ionicons name="refresh" size={20} color={colors.white} />
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.resetButton} onPress={this.handleHardReset}>
              <Ionicons name="trash-outline" size={18} color={colors.error} />
              <Text style={styles.resetText}>Hard Reset App</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.supportText}>
            If the problem persists, please contact support.
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  iconContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.errorLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.error + '20',
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    lineHeight: 22,
  },
  debugContainer: {
    width: '100%',
    marginBottom: spacing.xxl,
  },
  debugTitle: {
    ...typography.captionMedium,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  errorDetail: {
    ...typography.caption,
    color: colors.error,
    backgroundColor: colors.errorLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error + '30',
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
  },
  actions: {
    width: '100%',
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  retryText: {
    ...typography.button,
    color: colors.white,
    fontSize: 16,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.error + '40',
  },
  resetText: {
    ...typography.button,
    color: colors.error,
    fontSize: 14,
  },
  supportText: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});

