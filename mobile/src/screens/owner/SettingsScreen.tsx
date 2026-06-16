import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets, EdgeInsets } from 'react-native-safe-area-context';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Salon } from '../../types';
import { Button } from '../../components/Button';
import { useAuthStore } from '../../store/authStore';
import { useTheme, ThemeMode } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';
import { handleApiError } from '../../lib/errorHandler';
import { salonRepository } from '../../repositories/salonRepository';
import { showToast } from '../../store/toastStore';
import { formatCopyright, formatVersionLine } from '../../config/appVersion';
import {
  ACCOUNT_DELETION_SUPPORT_EMAIL,
  ACCOUNT_DELETION_WEB_URL,
} from '../../lib/accountDeletion';
import { NotificationSettingsSection } from '../../components/NotificationSettingsSection';
import { SignOutButton } from '../../components/SignOutButton';
import { normalizeSalon, resolveSalonImageSource } from '../../lib/salonImage';

import { OwnerSettingsScreenProps } from '../../navigation/types';
import {
  ENABLE_MULTI_BOOKING_PER_SLOT,
  ENABLE_OWNER_PROMO_MANAGEMENT,
  ENABLE_STAFF_SELECTION,
  ENABLE_SUBSCRIPTIONS,
} from '../../lib/featureFlags';

type SettingsProps = OwnerSettingsScreenProps<'SettingsMain'>;

export const SettingsScreen: React.FC<SettingsProps> = ({ navigation }) => {
  const { theme, themeMode, setThemeMode } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = React.useMemo(() => createStyles(theme, insets), [theme, insets]);
  const queryClient = useQueryClient();
  const { deleteAccount, isLoading: authLoading } = useAuthStore();
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [allowMultipleBookings, setAllowMultipleBookings] = useState(false);
  const [autoAccept, setAutoAccept] = useState(true);
  const [enableOffers, setEnableOffers] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  // Get salon data
  const { data: salon, isLoading: salonLoading } = useQuery<Salon | null>({
    queryKey: ['ownerSalon'],
    queryFn: () => salonRepository.getOwnerSalon(),
  });

  // Initialize switch state from salon data
  useEffect(() => {
    if (salon) {
      setAllowMultipleBookings(salon.allow_multiple_bookings_per_slot || false);
      setAutoAccept(salon.auto_accept !== false);
      setEnableOffers(salon.show_offers === true);
      setHasChanges(false);
    }
  }, [salon]);

  // Check if any settings were changed compared to original state
  useEffect(() => {
    if (salon) {
      const origMultiple = salon.allow_multiple_bookings_per_slot || false;
      const origAutoAccept = salon.auto_accept !== false;
      const origOffers = salon.show_offers === true;

      const isChanged = 
        allowMultipleBookings !== origMultiple ||
        autoAccept !== origAutoAccept ||
        enableOffers !== origOffers;

      setHasChanges(isChanged);
    }
  }, [salon, allowMultipleBookings, autoAccept, enableOffers]);

  // Handle toggle change
  const handleToggleChange = (value: boolean) => {
    setAllowMultipleBookings(value);
  };

  const handleAutoAcceptChange = (value: boolean) => {
    setAutoAccept(value);
  };

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!salon?.id) throw new Error('No salon found');
      
      const response = await api.patch(`/salons/${salon.id}`, {
        auto_accept: autoAccept,
        show_offers: enableOffers,
        ...(ENABLE_MULTI_BOOKING_PER_SLOT
          ? { allow_multiple_bookings_per_slot: allowMultipleBookings }
          : {
              allow_multiple_bookings_per_slot: false,
              max_bookings_per_slot: 1,
            }),
      });
      return response.data;
    },
    onSuccess: () => {
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['ownerSalon'] });
      Alert.alert('Success', 'Settings saved successfully');
    },
    onError: (error: unknown) => {
      const appErr = handleApiError(error);
      Alert.alert(
        'Error',
        appErr.message
      );
    },
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  const openAccountDeletionWeb = () => {
    void Linking.openURL(ACCOUNT_DELETION_WEB_URL).catch(() => {
      showToast(`Visit ${ACCOUNT_DELETION_WEB_URL} or email ${ACCOUNT_DELETION_SUPPORT_EMAIL}`, 'error');
    });
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This permanently deletes your TrimiT account, salon data, and associated records. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: async () => {
            setIsDeletingAccount(true);
            const result = await deleteAccount();
            setIsDeletingAccount(false);
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
          disabled={isDeletingAccount || authLoading}
        >
          <View style={[styles.cardGroupIconContainer, { backgroundColor: theme.colors.error }]}>
            {isDeletingAccount ? (
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

  if (salonLoading) {
    return (
      <ScreenWrapper variant="stack">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (!salon) {
    // Allow access to settings even without salon - show limited options
    return (
      <ScreenWrapper variant="stack">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRight} />
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 16 }}>
          {/* No Salon Card */}
          <View style={styles.section}>
            <View style={styles.cardGroup}>
              <View style={[styles.cardGroupItem, styles.cardGroupItemLast]}>
                <Ionicons name="storefront-outline" size={40} color={theme.colors.textSecondary} style={{ marginRight: 12 }} />
                <View style={[styles.cardGroupTextContainer, { marginLeft: 12 }]}>
                  <Text style={[styles.cardGroupTitle, theme.typography.h4]}>No Salon Yet</Text>
                  <Text style={styles.cardGroupTitleSecondary}>Create your salon to unlock all features</Text>
                </View>
              </View>
            </View>
          </View>

          <NotificationSettingsSection />

          {/* Appearance Settings - Always accessible */}
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
            </View>
          </View>

          {/* Create Salon Action */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>GET STARTED</Text>
            <View style={styles.cardGroup}>
              <TouchableOpacity
                style={[styles.cardGroupItem, styles.cardGroupItemLast]}
                onPress={() => navigation.navigate('ManageSalon')}
              >
                <View style={[styles.cardGroupIconContainer, { backgroundColor: theme.colors.primary }]}>
                  <Ionicons name="add" size={20} color={theme.colors.white} />
                </View>
                <View style={[styles.cardGroupTextContainer, { marginLeft: 12 }]}>
                  <Text style={[styles.cardGroupTitle, { color: theme.colors.primary, fontWeight: '600' }]}>
                    Create Your Salon
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Legal & Support - Always accessible */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>LEGAL & SUPPORT</Text>
            <View style={styles.cardGroup}>
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

  return (
    <ScreenWrapper variant="stack">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Salon Settings</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 16 }}>
        {/* Salon Info Card */}
        <View style={styles.section}>
          <View style={styles.cardGroup}>
            <View style={[styles.cardGroupItem, styles.cardGroupItemLast]}>
              <Image
                source={resolveSalonImageSource(normalizeSalon(salon))}
                style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.surfaceSecondary }}
              />
              <View style={[styles.cardGroupTextContainer, { marginLeft: 12 }]}>
                <Text style={[styles.cardGroupTitle, theme.typography.h4]}>{salon.name}</Text>
                <Text style={styles.cardGroupTitleSecondary}>{salon.address}</Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('ManageSalon')}
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
            </View>
          </View>
        </View>

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
          </View>
        </View>

        {/* Booking Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BOOKING SETTINGS</Text>
          <View style={styles.cardGroup}>
            <View style={[styles.cardGroupItem, !ENABLE_MULTI_BOOKING_PER_SLOT && styles.cardGroupItemLast]}>
              <View style={[styles.cardGroupIconContainer, { backgroundColor: theme.colors.warning }]}>
                <Ionicons name="flash" size={16} color={theme.colors.white} />
              </View>
              <View style={[styles.cardGroupTextContainer, { marginLeft: 12 }]}>
                <Text style={styles.cardGroupTitle}>Auto-Accept Bookings</Text>
              </View>
              <Switch
                value={autoAccept}
                onValueChange={handleAutoAcceptChange}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary + '80' }}
                thumbColor={autoAccept ? theme.colors.primary : '#f4f3f4'}
              />
            </View>

            {ENABLE_MULTI_BOOKING_PER_SLOT ? (
              <View style={[styles.cardGroupItem, styles.cardGroupItemLast]}>
                <View style={[styles.cardGroupIconContainer, { backgroundColor: theme.colors.success }]}>
                  <Ionicons name="people" size={16} color={theme.colors.white} />
                </View>
                <View style={[styles.cardGroupTextContainer, { marginLeft: 12 }]}>
                  <Text style={styles.cardGroupTitle}>Multiple Bookings per Slot</Text>
                </View>
                <Switch
                  value={allowMultipleBookings}
                  onValueChange={handleToggleChange}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary + '80' }}
                  thumbColor={allowMultipleBookings ? theme.colors.primary : '#f4f3f4'}
                />
              </View>
            ) : null}
          </View>

          {ENABLE_MULTI_BOOKING_PER_SLOT ? (
            <Text style={styles.infoFooterText}>
              {allowMultipleBookings
                ? 'Multiple customers can book the same time slot.'
                : 'Only one customer can book each time slot.'}
            </Text>
          ) : null}
        </View>

        {/* Service Offers Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SERVICE OFFERS</Text>
          <View style={styles.cardGroup}>
            <View style={[styles.cardGroupItem, styles.cardGroupItemLast]}>
              <View style={[styles.cardGroupIconContainer, { backgroundColor: theme.colors.info }]}>
                <Ionicons name="pricetag" size={16} color={theme.colors.white} />
              </View>
              <View style={[styles.cardGroupTextContainer, { marginLeft: 12 }]}>
                <Text style={styles.cardGroupTitle}>Enable Service Offers</Text>
              </View>
              <Switch
                value={enableOffers}
                onValueChange={setEnableOffers}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary + '80' }}
                thumbColor={enableOffers ? theme.colors.primary : '#f4f3f4'}
              />
            </View>
          </View>
          <Text style={styles.infoFooterText}>
            {enableOffers
              ? 'Customers will see discount badges on enabled offers.'
              : 'Offer badges are currently hidden from customers.'}
          </Text>
        </View>

        {/* Salon Management Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SALON MANAGEMENT</Text>
          <View style={styles.cardGroup}>
            {ENABLE_SUBSCRIPTIONS ? (
              <TouchableOpacity
                style={styles.cardGroupItem}
                onPress={() => navigation.navigate('Subscription')}
              >
                <View style={[styles.cardGroupIconContainer, { backgroundColor: theme.colors.star }]}>
                  <Ionicons name="star" size={16} color={theme.colors.white} />
                </View>
                <View style={[styles.cardGroupTextContainer, { marginLeft: 12 }]}>
                  <Text style={styles.cardGroupTitle}>TrimiT Pro Subscription</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.border} />
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={styles.cardGroupItem}
              onPress={() => navigation.navigate('ManageSalon')}
            >
              <View style={[styles.cardGroupIconContainer, { backgroundColor: theme.colors.primary }]}>
                <Ionicons name="create" size={16} color={theme.colors.white} />
              </View>
              <View style={[styles.cardGroupTextContainer, { marginLeft: 12 }]}>
                <Text style={styles.cardGroupTitle}>Edit Salon Details</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.border} />
            </TouchableOpacity>

            {ENABLE_STAFF_SELECTION ? (
              <TouchableOpacity
                style={styles.cardGroupItem}
                onPress={() => navigation.navigate('StaffManagement')}
                disabled={!salon}
              >
                <View style={[styles.cardGroupIconContainer, { backgroundColor: theme.colors.success }, !salon && { opacity: 0.5 }]}>
                  <Ionicons name="people" size={16} color={theme.colors.white} />
                </View>
                <View style={[styles.cardGroupTextContainer, { marginLeft: 12 }]}>
                  <Text style={[styles.cardGroupTitle, !salon && { color: theme.colors.textSecondary }]}>Manage Staff</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.border} />
              </TouchableOpacity>
            ) : null}

            {ENABLE_OWNER_PROMO_MANAGEMENT ? (
              <TouchableOpacity
                style={[styles.cardGroupItem, styles.cardGroupItemLast]}
                onPress={() => navigation.navigate('PromoManagement')}
                disabled={!salon}
              >
                <View style={[styles.cardGroupIconContainer, { backgroundColor: theme.colors.error }, !salon && { opacity: 0.5 }]}>
                  <Ionicons name="ticket" size={16} color={theme.colors.white} />
                </View>
                <View style={[styles.cardGroupTextContainer, { marginLeft: 12 }]}>
                  <Text style={[styles.cardGroupTitle, !salon && { color: theme.colors.textSecondary }]}>Manage Promotions</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.border} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Quick Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
          <View style={styles.cardGroup}>
            <TouchableOpacity
              style={[styles.cardGroupItem, styles.cardGroupItemLast]}
              onPress={() => {
                navigation.getParent()?.navigate('Services');
              }}
            >
              <View style={[styles.cardGroupIconContainer, { backgroundColor: theme.colors.info }]}>
                <Ionicons name="cut" size={16} color={theme.colors.white} />
              </View>
              <View style={[styles.cardGroupTextContainer, { marginLeft: 12 }]}>
                <Text style={styles.cardGroupTitle}>Manage Services</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.border} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Legal & Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LEGAL & SUPPORT</Text>
          <View style={styles.cardGroup}>
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
              <View style={[styles.cardGroupIconContainer, { backgroundColor: theme.colors.info }]}>
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

      {/* Save Button */}
      {hasChanges && (
        <View style={styles.footer}>
          <Button
            title="Save Changes"
            onPress={handleSave}
            loading={saveMutation.isPending}
            icon={<Ionicons name="save" size={20} color={theme.colors.white} />}
          />
        </View>
      )}
    </ScreenWrapper>
  );
};

const createStyles = (theme: Theme, insets: EdgeInsets) => StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: theme.colors.surface,
    margin: 20,
    padding: 20,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  salonThumb: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  infoTextContainer: {
    flex: 1,
  },
  salonName: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: 4,
  },
  salonAddress: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  section: {
    paddingHorizontal: 16,
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
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardGroupTitle: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  cardGroupTextContainer: {
    flex: 1,
  },
  cardGroupTitleSecondary: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  infoFooterText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginTop: 8,
    marginLeft: 16,
    marginRight: 16,
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
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  themeOptionActive: {
    backgroundColor: theme.colors.primary,
  },
  themeOptionText: {
    ...theme.typography.captionMedium,
    color: theme.colors.textSecondary,
  },
  themeOptionTextActive: {
    color: '#FFFFFF',
  },
  footer: {
    padding: 20,
    paddingBottom: Math.max(20, insets.bottom + 90),
    backgroundColor: theme.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 12,
    padding: 14,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.error + '55',
    backgroundColor: theme.colors.error + '0D',
  },
  deleteAccountText: {
    ...theme.typography.bodySemiBold,
    color: theme.colors.error,
  },
  deleteWebLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
  },
  deleteWebLinkText: {
    ...theme.typography.captionMedium,
    color: theme.colors.primary,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.error + '40',
  },
  signOutText: {
    ...theme.typography.button,
    color: theme.colors.error,
  },
  versionText: {
    ...theme.typography.caption,
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginTop: 16,
  },
  copyrightText: {
    ...theme.typography.overline,
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginTop: 4,
    marginBottom: 8,
  },
});

export default SettingsScreen;
