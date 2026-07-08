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
import { ScreenWrapper, TAB_BAR_BASE_HEIGHT } from '../../components/ScreenWrapper';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { typography, spacing, borderRadius, shadows, layout } from '../../lib/utils';

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
import { DiscoverySettingsSection } from '../../components/DiscoverySettingsSection';
import { SignOutButton } from '../../components/SignOutButton';

export default function ProfileScreen({ navigation }: ProfileStackScreenProps<'ProfileMain'>) {
  const { theme, themeMode, setThemeMode } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
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

  const renderAccountDeletionSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>ACCOUNT</Text>
      <View style={styles.cardGroup}>
        <TouchableOpacity
          style={styles.cardGroupItem}
          onPress={openAccountDeletionWeb}
        >
          <View style={[styles.cardGroupIconContainer, { backgroundColor: theme.colors.textSecondary }]}>
            <Ionicons name="open-outline" size={16} color={theme.colors.white} />
          </View>
          <View style={[styles.cardGroupTextContainer, { marginLeft: 12 }]}>
            <Text style={styles.cardGroupTitle}>Request deletion on the web</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.border} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.cardGroupItem, styles.cardGroupItemLast]}
          onPress={handleDeleteAccount}
          disabled={isDeleting || authLoading}
        >
          <View style={[styles.cardGroupIconContainer, { backgroundColor: theme.colors.error }]}>
            {isDeleting ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              <Ionicons name="trash" size={16} color={theme.colors.white} />
            )}
          </View>
          <View style={[styles.cardGroupTextContainer, { marginLeft: 12 }]}>
            <Text style={[styles.cardGroupTitle, { color: theme.colors.error }]}>Delete Account</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScreenWrapper variant="stack">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRight} />
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 16, paddingBottom: TAB_BAR_BASE_HEIGHT + insets.bottom + 16 }}>
        {/* User Info Card */}
        <View style={styles.section}>
          <View style={styles.cardGroup}>
            <View style={[styles.cardGroupItem, styles.cardGroupItemLast, isEditing && { flexDirection: 'column', alignItems: 'stretch' }]}>
              {!isEditing ? (
                <>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </Text>
                  </View>
                  <View style={[styles.cardGroupTextContainer, { marginLeft: 12 }]}>
                    <Text style={[styles.cardGroupTitle, theme.typography.h4]}>{user?.name || 'User'}</Text>
                    <Text style={styles.cardGroupTitleSecondary}>{user?.email || 'No email'}</Text>
                    <Text style={styles.cardGroupTitleSecondary}>{user?.phone || 'No phone number'}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setIsEditing(true)}
                    style={{ 
                      backgroundColor: theme.colors.primary + '18', 
                      paddingHorizontal: 12, 
                      paddingVertical: 6, 
                      borderRadius: theme.borderRadius.pill,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="pencil" size={14} color={theme.colors.primary} />
                    <Text style={{ ...theme.typography.captionMedium, color: theme.colors.primary }}>Edit</Text>
                  </TouchableOpacity>
                </>
              ) : (
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
              )}
            </View>
          </View>
        </View>

        {user?.role === 'customer' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>OFFERS</Text>
            <View style={styles.cardGroup}>
              <TouchableOpacity
                style={[styles.cardGroupItem, styles.cardGroupItemLast]}
                onPress={() => navigation.navigate('MyOffers')}
              >
                <View style={[styles.cardGroupIconContainer, { backgroundColor: theme.colors.primary }]}>
                  <Ionicons name="gift" size={16} color={theme.colors.white} />
                </View>
                <View style={[styles.cardGroupTextContainer, { marginLeft: 12 }]}>
                  <Text style={styles.cardGroupTitle}>My offers & coupons</Text>
                  <Text style={styles.cardGroupTitleSecondary}>TRIMIT50 and more</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.border} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {user?.role === 'customer' && <DiscoverySettingsSection />}

        <NotificationSettingsSection />

        {/* Appearance Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>APPEARANCE</Text>
          <View style={styles.cardGroup}>
            <View style={[styles.cardGroupItem, styles.cardGroupItemLast, { flexDirection: 'column', alignItems: 'stretch' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={[styles.cardGroupIconContainer, { backgroundColor: theme.colors.primary }]}>
                  <Ionicons name="color-palette" size={16} color={theme.colors.white} />
                </View>
                <Text style={[styles.cardGroupTitle, { marginLeft: 12 }]}>Theme Preference</Text>
              </View>
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
                      size={18} 
                      color={themeMode === mode ? (theme.isDark ? theme.colors.textInverse : '#FFFFFF') : theme.colors.textSecondary} 
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
          </View>
        </View>

        {/* Legal & Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LEGAL & SUPPORT</Text>
          <View style={styles.cardGroup}>
            <TouchableOpacity
              style={styles.cardGroupItem}
              onPress={() => navigation.navigate('PaymentsHelp')}
            >
              <View style={[styles.cardGroupIconContainer, { backgroundColor: '#16A34A' }]}>
                <Ionicons name="card" size={16} color={theme.colors.white} />
              </View>
              <View style={[styles.cardGroupTextContainer, { marginLeft: 12 }]}>
                <Text style={styles.cardGroupTitle}>Payments Help</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.border} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cardGroupItem}
              onPress={() => navigation.navigate('PrivacyPolicy')}
            >
              <View style={[styles.cardGroupIconContainer, { backgroundColor: theme.colors.textSecondary }]}>
                <Ionicons name="shield-checkmark" size={16} color={theme.colors.white} />
              </View>
              <View style={[styles.cardGroupTextContainer, { marginLeft: 12 }]}>
                <Text style={styles.cardGroupTitle}>Privacy Policy</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.border} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cardGroupItem}
              onPress={() => navigation.navigate('Terms')}
            >
              <View style={[styles.cardGroupIconContainer, { backgroundColor: theme.colors.textSecondary }]}>
                <Ionicons name="document-text" size={16} color={theme.colors.white} />
              </View>
              <View style={[styles.cardGroupTextContainer, { marginLeft: 12 }]}>
                <Text style={styles.cardGroupTitle}>Terms of Service</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.border} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cardGroupItem, styles.cardGroupItemLast]}
              onPress={() => navigation.navigate('Contact')}
            >
              <View style={[styles.cardGroupIconContainer, { backgroundColor: '#007AFF' }]}>
                <Ionicons name="mail" size={16} color={theme.colors.white} />
              </View>
              <View style={[styles.cardGroupTextContainer, { marginLeft: 12 }]}>
                <Text style={styles.cardGroupTitle}>Contact Us</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.border} />
            </TouchableOpacity>
          </View>
        </View>

        {renderAccountDeletionSection()}

        <View style={styles.section}>
          <SignOutButton
            style={styles.signOutButton}
            textStyle={styles.signOutText}
            confirmDetail="Your local cache will be cleared."
          />
          <Text style={styles.versionText}>{formatVersionLine()}</Text>
          <Text style={styles.copyrightText}>{formatCopyright()}</Text>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: layout.floatingChromeInset,
    marginBottom: 24,
  },
  sectionTitle: {
    ...theme.typography.captionMedium,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  cardGroup: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  cardGroupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  cardGroupItemLast: {
    borderBottomWidth: 0,
  },
  cardGroupIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardGroupTextContainer: {
    flex: 1,
  },
  cardGroupTitle: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
  },
  cardGroupTitleSecondary: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  form: {
    gap: spacing.xs,
    width: '100%',
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  themeToggleContainer: {
    flexDirection: 'row',
    gap: 8,
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
    color: theme.isDark ? theme.colors.textInverse : '#FFFFFF',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
  },
  signOutText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.error,
    marginLeft: 8,
  },
  versionText: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: 24,
  },
  copyrightText: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: 4,
  },
});
