import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

export type ButtonStatus = 'idle' | 'loading' | 'success' | 'error';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  status?: ButtonStatus;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  status = 'idle',
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const { theme } = useTheme();
  
  const effectiveStatus = loading ? 'loading' : status;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (effectiveStatus === 'error') {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true, easing: Easing.linear }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true, easing: Easing.linear }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true, easing: Easing.linear }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true, easing: Easing.linear })
      ]).start();
    }
  }, [effectiveStatus, shakeAnim]);

  const getButtonStyle = (): ViewStyle[] => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 999,
    };

    const sizeStyles: Record<string, ViewStyle> = {
      sm: { paddingVertical: 8,  paddingHorizontal: 16 },
      md: { paddingVertical: 12, paddingHorizontal: 24 },
      lg: { paddingVertical: 16, paddingHorizontal: 32 },
    };

    const variantStyles: Record<string, ViewStyle> = {
      primary:   { backgroundColor: theme.colors.primary },
      secondary: { backgroundColor: theme.colors.secondary },
      outline:   { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.border },
      ghost:     { backgroundColor: 'transparent' },
    };
    
    let statusStyle: ViewStyle = {};
    if (effectiveStatus === 'success') {
      statusStyle = { backgroundColor: theme.colors.success };
    } else if (effectiveStatus === 'error') {
      statusStyle = { backgroundColor: theme.colors.error };
    }

    return [
      baseStyle,
      sizeStyles[size],
      variantStyles[variant],
      statusStyle,
      (disabled || effectiveStatus === 'loading') ? { opacity: 0.7 } : {},
      style ?? {},
    ];
  };

  const getTextStyle = (): TextStyle[] => {
    const baseStyle: TextStyle = { fontWeight: '600' };

    const sizeStyles: Record<string, TextStyle> = {
      sm: { fontSize: 14 },
      md: { fontSize: 16 },
      lg: { fontSize: 18 },
    };

    const variantStyles: Record<string, TextStyle> = {
      primary:   { color: theme.colors.textInverse },
      secondary: { color: theme.colors.textInverse },
      outline:   { color: theme.colors.text },
      ghost:     { color: theme.colors.primary },
    };

    let statusStyle: TextStyle = {};
    if (effectiveStatus === 'success' || effectiveStatus === 'error') {
      statusStyle = { color: theme.colors.textInverse }; // Always white text on success/error
    }

    return [baseStyle, sizeStyles[size], variantStyles[variant], statusStyle, textStyle ?? {}];
  };

  const loaderColor = effectiveStatus === 'success' || effectiveStatus === 'error'
    ? theme.colors.textInverse
    : (variant === 'primary' || variant === 'secondary' ? theme.colors.textInverse : theme.colors.primary);

  const renderContent = () => {
    if (effectiveStatus === 'loading') {
      return <ActivityIndicator color={loaderColor} />;
    }
    if (effectiveStatus === 'success') {
      return (
        <>
          <Ionicons name="checkmark-circle" size={20} color={theme.colors.textInverse} style={{ marginRight: 8 }} />
          <Text style={getTextStyle()}>Success</Text>
        </>
      );
    }
    if (effectiveStatus === 'error') {
      return (
        <>
          <Ionicons name="alert-circle" size={20} color={theme.colors.textInverse} style={{ marginRight: 8 }} />
          <Text style={getTextStyle()}>Failed. Try again.</Text>
        </>
      );
    }
    return (
      <>
        {icon && <>{icon}</>}
        <Text style={[getTextStyle(), icon ? { marginLeft: 8 } : {}]}>{title}</Text>
      </>
    );
  };

  return (
    <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
      <TouchableOpacity
        style={getButtonStyle()}
        onPress={onPress}
        disabled={disabled || effectiveStatus === 'loading' || effectiveStatus === 'success'}
        activeOpacity={0.8}
      >
        {renderContent()}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default Button;
