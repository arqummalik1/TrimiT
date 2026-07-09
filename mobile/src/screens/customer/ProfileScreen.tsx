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
import { spacing } from '../../lib/utils';

import api from '../../lib/api';
import { showToast } from '../../store/toastStore';
import { useTheme, ThemeMode } from '../../theme/ThemeContext';
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
import { SettingsSection, SettingsRow } from '../../components/settings/SettingsSection';
import { createSettingsStyles } from '../../components/settings/settingsStyles';

export default function ProfileScreen({ navigation }: ProfileStackScreenProps<'ProfileMain'>) {
  const { theme, themeMode, setThemeMode } = useTheme();
  const styles = useMemo(() => createSettingsStyles(theme), [theme]);
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
    const finalPhone = trimmedPhone === '+91' || trimmedPhone === '' ? null : trimmedPhone;

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
      showToast(handleApiError(error).message, 'error');
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
    <ScreenWrapper variant="stack">
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Profile</Text>
        </View>

        <ScrollView
          style={styles.screen}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: TAB_BAR_BASE_HEIGHT + insets.bottom + 16 },
          ]}
        >
          <View style={styles.section}>
            <View style={styles.profileCard}>
              {!isEditing ? (
                <>
                  <View style={styles.profileTop}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </Text>
                    </View>
                    <View style={styles.profileMeta}>
                      <Text style={styles.profileName} numberOfLines={1}>
                        {user?.name || 'User'}
                      </Text>
                      <Text style={styles.profileDetail} numberOfLines={1}>
                        {user?.email || 'No email'}
                      </Text>
                      <Text style={styles.profileDetail} numberOfLines={1}>
                        {user?.phone || 'No phone number'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setIsEditing(true)} hitSlop={8}>
                    <Text style={styles.editLink}>Edit profile</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={localStyles.form}>
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
                  <View style={localStyles.editActions}>
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
                    <Button title="Save" onPress={handleSave} loading={isLoading} style={{ flex: 1 }} />
                  </View>
                </View>
              )}
            </View>
          </View>

          {user?.role === 'customer' && (
            <SettingsSection title="Offers">
              <SettingsRow
                title="My offers & coupons"
                subtitle="TRIMIT50 and more"
                onPress={() => navigation.navigate('MyOffers')}
                isLast
              />
            </SettingsSection>
          )}

          {user?.role === 'customer' && <DiscoverySettingsSection />}
          <NotificationSettingsSection />

          <SettingsSection title="Appearance">
            <View style={[styles.row, styles.rowBorder]}>
              <Text style={styles.rowTitle}>Theme</Text>
            </View>
            <View style={styles.themeSegmentRow}>
              {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => {
                const active = themeMode === mode;
                return (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.themeOption, active && styles.themeOptionActive]}
                    onPress={() => setThemeMode(mode)}
                  >
                    <Ionicons
                      name={mode === 'light' ? 'sunny-outline' : mode === 'dark' ? 'moon-outline' : 'phone-portrait-outline'}
                      size={18}
                      color={active ? theme.colors.background : theme.colors.textSecondary}
                    />
                    <Text style={[styles.themeOptionText, active && styles.themeOptionTextActive]}>
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </SettingsSection>

          <SettingsSection title="Legal & support">
            <SettingsRow
              title="Payments help"
              onPress={() => navigation.navigate('PaymentsHelp')}
            />
            <SettingsRow
              title="Privacy policy"
              onPress={() => navigation.navigate('PrivacyPolicy')}
            />
            <SettingsRow
              title="Terms of service"
              onPress={() => navigation.navigate('Terms')}
            />
            <SettingsRow
              title="Contact us"
              onPress={() => navigation.navigate('Contact')}
              isLast
            />
          </SettingsSection>

          <SettingsSection title="Account">
            <SettingsRow title="Request deletion on the web" onPress={openAccountDeletionWeb} />
            <SettingsRow
              title="Delete account"
              destructive
              onPress={handleDeleteAccount}
              disabled={isDeleting || authLoading}
              trailing={
                isDeleting ? (
                  <ActivityIndicator size="small" color={theme.colors.error} />
                ) : undefined
              }
              isLast
            />
          </SettingsSection>

          <View style={styles.section}>
            <View style={styles.group}>
              <SignOutButton
                style={[styles.row, { flexDirection: 'row', justifyContent: 'center', gap: 8 }]}
                textStyle={[styles.rowTitle, styles.rowTitleDestructive, { marginLeft: 0 }]}
                confirmDetail="Your local cache will be cleared."
              />
            </View>
            <Text style={styles.footerMeta}>{formatVersionLine()}</Text>
            <Text style={styles.footerMeta}>{formatCopyright()}</Text>
          </View>
        </ScrollView>
      </View>
    </ScreenWrapper>
  );
}

const localStyles = StyleSheet.create({
  form: {
    gap: spacing.xs,
    width: '100%',
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
