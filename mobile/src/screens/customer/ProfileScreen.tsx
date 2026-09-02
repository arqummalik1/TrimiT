import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
import type { Theme } from '../../theme/tokens';
import { handleApiError } from '../../lib/errorHandler';
import { formatCopyright, formatVersionLine } from '../../config/appVersion';
import { ProfileStackScreenProps } from '../../navigation/types';
import type { CustomerTabParamList } from '../../navigation/types';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NotificationSettingsSection } from '../../components/NotificationSettingsSection';
import { DiscoverySettingsSection } from '../../components/DiscoverySettingsSection';
import { SignOutButton } from '../../components/SignOutButton';
import { SettingsSection, SettingsRow } from '../../components/settings/SettingsSection';
import { createSettingsStyles } from '../../components/settings/settingsStyles';
import {
  requestAuthentication,
  requestEmployeeWorkspace,
  requestOwnerWorkspace,
} from '../../lib/authGate';
import { ENABLE_MY_OFFERS_ENTRY } from '../../lib/featureFlags';

export default function ProfileScreen({ navigation }: ProfileStackScreenProps<'ProfileMain'>) {
  const { theme, themeMode, setThemeMode } = useTheme();
  const styles = useMemo(() => createSettingsStyles(theme), [theme]);
  const localStyles = useMemo(() => createLocalStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { user, setUser, token, resetOnboarding } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '+91 ');

  const returnToDiscover = () => {
    navigation
      .getParent<BottomTabNavigationProp<CustomerTabParamList>>()
      ?.navigate('Discover', { screen: 'DiscoverMain' });
  };

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

  if (!user) {
    return (
      <ScreenWrapper variant="tab">
        <View style={styles.screen}>
          <View style={[styles.header, localStyles.guestHeader]}>
            <TouchableOpacity
              style={localStyles.guestBackButton}
              onPress={returnToDiscover}
              accessibilityRole="button"
              accessibilityLabel="Back to Discover"
            >
              <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Account &amp; support</Text>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + spacing.xxxl },
            ]}
          >
            <View style={styles.section}>
              <View style={[styles.profileCard, localStyles.guestCard]}>
                <View style={localStyles.guestIcon}>
                  <Ionicons name="sparkles" size={28} color={theme.colors.primary} />
                </View>
                <Text style={localStyles.guestTitle}>Browse freely. Sign in when it matters.</Text>
                <Text style={localStyles.guestBody}>
                  Book a service, manage appointments, or save your details when you're ready.
                </Text>
                <View style={localStyles.guestButtonWrap}>
                  <Button
                    title="Sign in or create account"
                    onPress={() => requestAuthentication({ kind: 'profile' })}
                    style={localStyles.guestPrimaryButton}
                  />
                </View>
              </View>
            </View>

            <SettingsSection title="For salon teams">
              <SettingsRow
                title="List or manage my salon"
                subtitle="Create your owner workspace"
                onPress={() => requestAuthentication({ kind: 'owner_onboarding' })}
              />
              <SettingsRow
                title="Employee access"
                subtitle="Join using an invitation from your salon"
                onPress={() => requestAuthentication({ kind: 'employee_claim' })}
                isLast
              />
            </SettingsSection>

            <SettingsSection title="Legal & support">
              <SettingsRow title="Payments help" onPress={() => navigation.navigate('PaymentsHelp')} />
              <SettingsRow title="Privacy policy" onPress={() => navigation.navigate('PrivacyPolicy')} />
              <SettingsRow title="Terms of service" onPress={() => navigation.navigate('Terms')} />
              <SettingsRow title="Contact us" onPress={() => navigation.navigate('Contact')} isLast />
            </SettingsSection>

            {__DEV__ ? (
              <SettingsSection title="Developer preview">
                <SettingsRow
                  title="Replay introduction"
                  subtitle="Preview the onboarding screens without clearing app data"
                  onPress={resetOnboarding}
                  isLast
                />
              </SettingsSection>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.footerMeta}>{formatVersionLine()}</Text>
              <Text style={styles.footerMeta}>{formatCopyright()}</Text>
            </View>
          </ScrollView>
        </View>
      </ScreenWrapper>
    );
  }

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

          {user?.role === 'customer' && ENABLE_MY_OFFERS_ENTRY && (
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
          {user?.role === 'customer' && (
            <SettingsSection title="For salon teams">
              <SettingsRow
                title="List or manage my salon"
                subtitle="Create an owner workspace"
                onPress={requestOwnerWorkspace}
              />
              <SettingsRow
                title="Employee access"
                subtitle="Connect with a salon invitation"
                onPress={requestEmployeeWorkspace}
                isLast
              />
            </SettingsSection>
          )}
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

          {__DEV__ ? (
            <SettingsSection title="Developer preview">
              <SettingsRow
                title="Replay introduction"
                subtitle="Preview onboarding without signing out or clearing app data"
                onPress={resetOnboarding}
                isLast
              />
            </SettingsSection>
          ) : null}

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
            <SettingsRow
              title="Delete account and data"
              subtitle="Review what is removed before continuing"
              destructive
              onPress={() => navigation.navigate('AccountDeletion')}
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

const createLocalStyles = (theme: Theme) =>
  StyleSheet.create({
    form: {
      gap: spacing.xs,
      width: '100%',
    },
    editActions: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.sm,
    },
    guestCard: {
      alignItems: 'flex-start',
      padding: spacing.xxl,
    },
    guestHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    guestBackButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: -spacing.sm,
    },
    guestIcon: {
      width: 56,
      height: 56,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.isDark ? 'rgba(217, 119, 6, 0.15)' : 'rgba(137, 91, 57, 0.10)',
      marginBottom: spacing.lg,
    },
    guestTitle: {
      ...theme.typography.h3,
      fontSize: 23,
      lineHeight: 30,
      fontWeight: '800',
      color: theme.colors.text,
      marginBottom: spacing.sm,
    },
    guestBody: {
      ...theme.typography.body,
      fontSize: 15,
      lineHeight: 22,
      color: theme.colors.textSecondary,
    },
    guestPrimaryButton: {
      width: '100%',
    },
    guestButtonWrap: {
      width: '100%',
      marginTop: spacing.xl,
    },
  });
