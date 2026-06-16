import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { typography, spacing, borderRadius, shadows } from '../../lib/utils';

import api from '../../lib/api';
import { showToast } from '../../store/toastStore';
import { useTheme, ThemeMode } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';
import { handleApiError } from '../../lib/errorHandler';
import { formatCopyright, formatVersionLine } from '../../config/appVersion';
import { ProfileStackScreenProps } from '../../navigation/types';
import {
  ACCOUNT_DELETION_SUPPORT_EMAIL,
  ACCOUNT_DELETION_WEB_URL,
} from '../../lib/accountDeletion';
import { NotificationSettingsSection } from '../../components/NotificationSettingsSection';
import { SignOutButton } from '../../components/SignOutButton';

type ProfileStyles = ReturnType<typeof createStyles>;

export default function ProfileScreen({ navigation }: ProfileStackScreenProps<'ProfileMain'>) {
  const { theme, themeMode, setThemeMode } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user, deleteAccount, setUser, token, isLoading: authLoading } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '+91 ');

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      showToast('Name cannot be empty', 'error');
      return;
    }

    const trimmedPhone = phone.trim();
    const finalPhone = (trimmedPhone === '+91' || trimmedPhone === '') ? null : trimmedPhone;

    if (finalPhone) {
      const phoneClean = finalPhone.replace(/\s+/g, '');
      if (!/^(?:\+91|91)?[6-9]\d{9}$/.test(phoneClean)) {
        showToast('Please enter a valid 10-digit Indian phone number', 'error');
        return;
      }
    }

    setIsLoading(true);
    try {
      await api.patch('/auth/profile', { name: trimmedName, phone: finalPhone });
      if (user) {
        setUser({ ...user, name: trimmedName, phone: finalPhone || undefined }, token);
      }
      setIsEditing(false);
      showToast('Profile updated successfully', 'success');
    } catch (error) {
      const appErr = handleApiError(error);
      showToast(appErr.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This permanently deletes your TrimiT account, profile, and associated data. Active bookings may be cancelled. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            const result = await deleteAccount();
            setIsDeleting(false);
            if (!result.success) {
              showToast(result.error ?? 'Could not delete account', 'error');
            } else {
              showToast('Your account has been deleted', 'success');
            }
          },
        },
      ]
    );
  };

  const openAccountDeletionWeb = () => {
    void Linking.openURL(ACCOUNT_DELETION_WEB_URL).catch(() => {
      showToast(`Visit ${ACCOUNT_DELETION_WEB_URL} or email ${ACCOUNT_DELETION_SUPPORT_EMAIL}`, 'error');
    });
  };

  return (
    <ScreenWrapper variant="tab">
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
                onChangeText={(text) => {
                  if (text === '' || text === '+9' || text === '+' || text === '+91') {
                    setPhone('+91 ');
                  } else if (!text.startsWith('+91 ')) {
                    const digits = text.replace(/\D/g, '');
                    const cleanDigits = digits.startsWith('91') ? digits.slice(2) : digits;
                    setPhone('+91 ' + cleanDigits);
                  } else {
                    setPhone(text);
                  }
                }}
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
                    setPhone(user?.phone || '+91 ');
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

        <NotificationSettingsSection />

        {/* Appearance Settings */}
        <View style={[styles.card, shadows.sm, styles.linksCard, { marginBottom: spacing.lg }]}>
          <Text style={[styles.cardTitle, { paddingHorizontal: spacing.xl, paddingTop: spacing.md }]}>Appearance</Text>
          <View style={styles.themeToggleContainer}>
            {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.themeOption,
                  themeMode === mode && styles.themeOptionActive,
                ]}
                onPress={() => setThemeMode(mode)}
              >
                <Ionicons 
                  name={mode === 'light' ? 'sunny' : mode === 'dark' ? 'moon' : 'phone-portrait'} 
                  size={20} 
                  color={themeMode === mode ? '#FFFFFF' : theme.colors.textSecondary} 
                />
                <Text style={[
                  styles.themeOptionText,
                  themeMode === mode && styles.themeOptionTextActive,
                ]}>
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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

        {/* Account deletion (Google Play requirement) */}
        <View style={[styles.card, shadows.sm, styles.linksCard, { marginBottom: spacing.lg }]}>
          <Text style={styles.cardTitle}>Account</Text>
          <Text style={styles.deleteHint}>
            You can delete your account and associated data from the app, or request deletion on the web.
          </Text>
          <TouchableOpacity
            style={styles.deleteAccountButton}
            onPress={handleDeleteAccount}
            disabled={isDeleting || authLoading}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={theme.colors.error} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                <Text style={styles.deleteAccountText}>Delete account</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteWebLink} onPress={openAccountDeletionWeb}>
            <Text style={styles.deleteWebLinkText}>Request deletion on the web</Text>
            <Ionicons name="open-outline" size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <SignOutButton style={styles.signOutButton} textStyle={styles.signOutText} />

        <Text style={styles.version}>{formatVersionLine()}</Text>
        <Text style={styles.copyright}>{formatCopyright()}</Text>
      </ScrollView>
    </ScreenWrapper>
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
  styles: ProfileStyles;
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
  styles: ProfileStyles;
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
  deleteHint: {
    ...typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.error + '55',
    backgroundColor: theme.colors.error + '0D',
    marginBottom: spacing.sm,
  },
  deleteAccountText: {
    ...typography.bodySmallMedium,
    color: theme.colors.error,
  },
  deleteWebLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
  },
  deleteWebLinkText: {
    ...typography.captionMedium,
    color: theme.colors.primary,
  },
  signOutButton: {
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
  signOutText: {
    ...typography.bodyMedium,
    color: theme.colors.error,
  },
  version: {
    ...typography.caption,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
  copyright: {
    ...typography.caption,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
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
  themeToggleContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  themeOptionActive: {
    backgroundColor: theme.colors.primary,
  },
  themeOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  themeOptionTextActive: {
    color: '#FFFFFF',
  },
});
