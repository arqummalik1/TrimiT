import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../../theme/ThemeContext';
import { ScreenWrapper } from '../../components/ScreenWrapper';

import { AuthScreenProps } from '../../navigation/types';

type RoleSelectProps = AuthScreenProps<'RoleSelect'>;

export const RoleSelectScreen: React.FC<RoleSelectProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const handleRoleSelect = (role: 'customer' | 'owner') => {
    navigation.navigate('Signup', { role });
  };

  return (
    <ScreenWrapper variant="auth">
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image source={require('../../../assets/logo.png')} style={{ width: 40, height: 40, resizeMode: 'contain', tintColor: theme.colors.textInverse }} />
        </View>
        <Text style={styles.title}>Join TrimiT</Text>
        <Text style={styles.subtitle}>Create your account to get started</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.question}>I am a...</Text>

        <View style={styles.cardsContainer}>
          <TouchableOpacity
            style={styles.roleCard}
            onPress={() => handleRoleSelect('customer')}
            activeOpacity={0.8}
          >
            <View style={styles.iconWrapper}>
              <Ionicons name="people" size={40} color={theme.colors.primary} />
            </View>
            <Text style={styles.roleTitle}>Customer</Text>
            <Text style={styles.roleDescription}>Book appointments</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.roleCard}
            onPress={() => handleRoleSelect('owner')}
            activeOpacity={0.8}
          >
            <View style={styles.iconWrapper}>
              <Ionicons name="storefront" size={40} color={theme.colors.primary} />
            </View>
            <Text style={styles.roleTitle}>Salon Owner</Text>
            <Text style={styles.roleDescription}>List your business</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account?</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.linkText}>Sign in</Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 30,
  },
  logoContainer: {
    width: 80,
    height: 80,
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  question: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  cardsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  roleCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  iconWrapper: {
    width: 72,
    height: 72,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  footerText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});

export default RoleSelectScreen;
