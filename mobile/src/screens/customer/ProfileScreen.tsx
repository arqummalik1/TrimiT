import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { typography, spacing, borderRadius, shadows } from '../../lib/utils';

import api from '../../lib/api';
import { showToast } from '../../store/toastStore';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';

export default function ProfileScreen({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user, logout, setUser, token } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await api.patch('/api/auth/profile', { name, phone });
      if (user) {
        setUser({ ...user, name, phone }, token);
      }
      setIsEditing(false);
      showToast('Profile updated successfully', 'success');
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Failed to update profile', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>My Profile</Text>
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <View style={styles.roleBadge}>
            <Ionicons
              name={user?.role === 'owner' ? 'storefront' : 'person'}
              size={14}
              color={theme.colors.primary}
            />
            <Text style={styles.roleText}>
              {user?.role === 'owner' ? 'Salon Owner' : 'Customer'}
            </Text>
          </View>
        </View>

        {/* Info Card */}
        <View style={[styles.card, shadows.sm]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Personal Information</Text>
            {!isEditing && (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Ionicons name="create-outline" size={22} color={theme.colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          {isEditing ? (
            <View style={styles.form}>
              <Input
                label="Full Name"
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                icon={<Ionicons name="person-outline" size={20} color={theme.colors.textSecondary} />}
              />
              <Input
                label="Phone Number"
                value={phone}
                onChangeText={setPhone}
                placeholder="+91 98765 43210"
                keyboardType="phone-pad"
                icon={<Ionicons name="call-outline" size={20} color={theme.colors.textSecondary} />}
              />
              <View style={styles.editActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => {
                    setIsEditing(false);
                    setName(user?.name || '');
                    setPhone(user?.phone || '');
                  }}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Save"
                  onPress={handleSave}
                  loading={isLoading}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          ) : (
            <View style={styles.infoList}>
              <InfoRow icon="person-outline" label="Name" value={user?.name || 'Not set'} styles={styles} theme={theme} />
              <InfoRow icon="mail-outline" label="Email" value={user?.email || 'Not set'} styles={styles} theme={theme} />
              <InfoRow icon="call-outline" label="Phone" value={user?.phone || 'Not set'} styles={styles} theme={theme} />
              <InfoRow
                icon="calendar-outline"
                label="Joined"
                value={
                  user?.created_at
                    ? new Date(user.created_at).toLocaleDateString('en-IN', {
                        month: 'long',
                        year: 'numeric',
                      })
                    : 'N/A'
                }
                styles={styles}
                theme={theme}
              />
            </View>
          )}
        </View>

        {/* Legal & Support */}
        <View style={[styles.card, shadows.sm, styles.linksCard]}>
          <Text style={styles.cardTitle}>Legal & Support</Text>
          <View style={styles.linkList}>
            <LinkRow
              icon="shield-checkmark-outline"
              label="Privacy Policy"
              onPress={() => navigation.navigate('PrivacyPolicy')}
              styles={styles}
              theme={theme}
            />
            <LinkRow
              icon="document-text-outline"
              label="Terms of Service"
              onPress={() => navigation.navigate('Terms')}
              styles={styles}
              theme={theme}
            />
            <LinkRow
              icon="mail-outline"
              label="Contact Us"
              onPress={() => navigation.navigate('Contact')}
              styles={styles}
              theme={theme}
            />
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={theme.colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>TrimiT v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
  styles,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  styles: any;
  theme: Theme;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={20} color={theme.colors.textSecondary} />
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function LinkRow({
  icon,
  label,
  onPress,
  styles,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  styles: any;
  theme: Theme;
}) {
  return (
    <TouchableOpacity style={styles.linkRow} onPress={onPress}>
      <Ionicons name={icon} size={20} color={theme.colors.textSecondary} />
      <Text style={styles.linkLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
    </TouchableOpacity>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxxl,
  },
  header: {
    paddingVertical: spacing.xl,
  },
  title: {
    ...typography.h2,
    color: theme.colors.text,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
  userName: {
    ...typography.h3,
    color: theme.colors.text,
    marginBottom: spacing.sm,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '1A', // transparent primary
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: 6,
  },
  roleText: {
    ...typography.captionMedium,
    color: theme.colors.primary,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: spacing.xxl,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  cardTitle: {
    ...typography.h4,
    color: theme.colors.text,
  },
  form: {
    gap: spacing.xs,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  infoList: {
    gap: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    ...typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    ...typography.bodySmallMedium,
    color: theme.colors.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.error + '40', // light error border
    backgroundColor: theme.colors.surface,
  },
  logoutText: {
    ...typography.bodyMedium,
    color: theme.colors.error,
  },
  version: {
    ...typography.caption,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
  linksCard: {
    paddingVertical: spacing.md,
  },
  linkList: {
    marginTop: spacing.sm,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  linkLabel: {
    ...typography.bodySmallMedium,
    color: theme.colors.text,
    flex: 1,
  },
});
