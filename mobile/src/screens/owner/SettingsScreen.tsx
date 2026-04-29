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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Salon } from '../../types';
import { colors } from '../../lib/utils';
import { Button } from '../../components/Button';
import { useAuthStore } from '../../store/authStore';

interface SettingsScreenProps {
  navigation: any;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const queryClient = useQueryClient();
  const { logout } = useAuthStore();
  const [allowMultipleBookings, setAllowMultipleBookings] = useState(false);
  const [autoAccept, setAutoAccept] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  // Get salon data
  const { data: salon, isLoading: salonLoading } = useQuery<Salon>({
    queryKey: ['ownerSalon'],
    queryFn: async () => {
      const response = await api.get('/api/owner/salon');
      return response.data;
    },
  });

  // Initialize switch state from salon data
  useEffect(() => {
    if (salon) {
      setAllowMultipleBookings(salon.allow_multiple_bookings_per_slot || false);
      setAutoAccept(salon.auto_accept !== false); // Default to true if undefined
      setHasChanges(false);
    }
  }, [salon]);

  // Handle toggle change
  const handleToggleChange = (value: boolean) => {
    setAllowMultipleBookings(value);
    setHasChanges(true);
  };

  const handleAutoAcceptChange = (value: boolean) => {
    setAutoAccept(value);
    setHasChanges(true);
  };

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!salon?.id) throw new Error('No salon found');
      
      const response = await api.patch(`/api/salons/${salon.id}`, {
        allow_multiple_bookings_per_slot: allowMultipleBookings,
        auto_accept: autoAccept,
      });
      return response.data;
    },
    onSuccess: () => {
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['ownerSalon'] });
      Alert.alert('Success', 'Settings saved successfully');
    },
    onError: (error: any) => {
      Alert.alert(
        'Error',
        error.response?.data?.detail || 'Failed to save settings'
      );
    },
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  if (salonLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!salon) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="storefront-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No Salon Found</Text>
          <Text style={styles.emptyText}>
            You need to create a salon before accessing settings
          </Text>
          <Button
            title="Create Salon"
            onPress={() => navigation.navigate('ManageSalon')}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Salon Settings</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Salon Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="storefront" size={32} color={colors.primary} />
          <View style={styles.infoTextContainer}>
            <Text style={styles.salonName}>{salon.name}</Text>
            <Text style={styles.salonAddress}>{salon.address}</Text>
          </View>
        </View>

        {/* Booking Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking Settings</Text>
          
          <View style={styles.settingCard}>
            <View style={styles.settingHeader}>
              <View style={styles.settingIconContainer}>
                <Ionicons name="flash" size={24} color={colors.primary} />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>
                  Auto-Accept Bookings
                </Text>
                <Text style={styles.settingDescription}>
                  Automatically confirm new booking requests
                </Text>
              </View>
              <Switch
                value={autoAccept}
                onValueChange={handleAutoAcceptChange}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={autoAccept ? colors.primary : '#f4f3f4'}
              />
            </View>
          </View>

          <View style={[styles.settingCard, { marginTop: 12 }]}>
            <View style={styles.settingHeader}>
              <View style={styles.settingIconContainer}>
                <Ionicons name="people" size={24} color={colors.primary} />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>
                  Allow Multiple Bookings Per Slot
                </Text>
                <Text style={styles.settingDescription}>
                  When enabled, multiple customers can book the same time slot
                </Text>
              </View>
              <Switch
                value={allowMultipleBookings}
                onValueChange={handleToggleChange}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={allowMultipleBookings ? colors.primary : '#f4f3f4'}
              />
            </View>
          </View>

          {/* Info Card */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={styles.infoBoxText}>
              {allowMultipleBookings 
                ? "Multiple customers can now book the same time slot. This is useful for salons with multiple staff members or chairs."
                : "Only one customer can book each time slot. New bookings will be blocked for already-booked slots."}
            </Text>
          </View>
        </View>

        {/* Other Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('ManageSalon')}
          >
            <View style={styles.actionIconContainer}>
              <Ionicons name="create" size={24} color={colors.primary} />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Edit Salon Details</Text>
              <Text style={styles.actionDescription}>
                Update name, address, hours, and more
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('OwnerTabs', { screen: 'Services' })}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: colors.secondaryLight }]}>
              <Ionicons name="cut" size={24} color={colors.secondary} />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Manage Services</Text>
              <Text style={styles.actionDescription}>
                Add, edit, or remove services
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Legal & Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal & Support</Text>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          >
            <View style={styles.actionIconContainer}>
              <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Terms')}
          >
            <View style={styles.actionIconContainer}>
              <Ionicons name="document-text" size={24} color={colors.primary} />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Terms of Service</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Contact')}
          >
            <View style={styles.actionIconContainer}>
              <Ionicons name="mail" size={24} color={colors.primary} />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Contact Us</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Logout Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => {
              Alert.alert(
                'Logout',
                'Are you sure you want to logout? All cached data will be cleared.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Logout', 
                    style: 'destructive',
                    onPress: async () => {
                      queryClient.clear();
                      await logout();
                    }
                  },
                ]
              );
            }}
          >
            <Ionicons name="log-out-outline" size={22} color={colors.error} />
            <Text style={styles.logoutText}>Logout from Account</Text>
          </TouchableOpacity>
          <Text style={styles.versionText}>Version 1.0.0 (Production)</Text>
        </View>
      </ScrollView>

      {/* Save Button */}
      {hasChanges && (
        <View style={styles.footer}>
          <Button
            title="Save Changes"
            onPress={handleSave}
            loading={saveMutation.isPending}
            icon={<Ionicons name="save" size={20} color="#FFFFFF" />}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
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
    color: colors.text,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
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
    backgroundColor: colors.surface,
    margin: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoTextContainer: {
    flex: 1,
  },
  salonName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  salonAddress: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  settingCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIconContainer: {
    width: 44,
    height: 44,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  settingStatus: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusEnabled: {
    backgroundColor: colors.secondaryLight,
  },
  statusDisabled: {
    backgroundColor: colors.surfaceSecondary,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusTextEnabled: {
    color: colors.success,
  },
  statusTextDisabled: {
    color: colors.error,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  footer: {
    padding: 20,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.error + '40',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.error,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 16,
  },
});

export default SettingsScreen;
