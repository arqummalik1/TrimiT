import React, { useMemo } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Theme } from '../theme/tokens';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  prefix?: string;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  prefix,
  containerStyle,
  style,
  ...props
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputContainer, error ? styles.inputError : undefined]}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        {prefix && (
          <View style={styles.prefixContainer}>
            <Text style={styles.prefixText}>{prefix}</Text>
          </View>
        )}
        <TextInput
          style={[
            styles.input,
            icon ? styles.inputWithIcon : undefined,
            prefix ? styles.inputWithPrefix : undefined,
            style
          ]}
          placeholderTextColor={theme.colors.textSecondary}
          {...props}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text,
      marginBottom: 8,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      overflow: 'hidden',
    },
    inputError: {
      borderColor: theme.colors.error,
    },
    iconContainer: {
      paddingLeft: 16,
    },
    prefixContainer: {
      paddingLeft: 16,
      justifyContent: 'center',
      alignItems: 'center',
      borderRightWidth: 1,
      borderRightColor: theme.colors.border,
      paddingRight: 12,
      alignSelf: 'stretch',
    },
    prefixText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      fontFamily: theme.fonts.bodyMedium,
    },
    input: {
      flex: 1,
      paddingVertical: 14,
      paddingHorizontal: 16,
      fontSize: 16,
      color: theme.colors.text,
    },
    inputWithIcon: {
      paddingLeft: 12,
    },
    inputWithPrefix: {
      paddingLeft: 12,
    },
    errorText: {
      fontSize: 12,
      color: theme.colors.error,
      marginTop: 4,
    },
  });

export default Input;
