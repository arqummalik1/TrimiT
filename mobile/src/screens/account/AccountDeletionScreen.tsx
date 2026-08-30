import React, { useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenWrapper } from '../../components/ScreenWrapper';
import { ACCOUNT_DELETION_WEB_URL } from '../../lib/accountDeletion';
import { showToast } from '../../store/toastStore';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeContext';
import { navigationRef } from '../../navigation/navigationRef';
import { Theme } from '../../theme/tokens';
import { borderRadius, spacing, typography } from '../../theme/tokens';

interface AccountDeletionScreenProps {
  navigation: { goBack: () => void };
}

const ROLE_IMPACT = {
  customer: [
    'Your profile, booking history, reviews, and saved preferences',
    'Any active or upcoming appointment records linked to you',
  ],
  owner: [
    'Your profile, salon listing, services, staff, images, and bookings',
    'Business settings and other records associated with your salon',
  ],
  employee: [
    'Your profile and access to the salon workspace',
    'Employee-linked records and personal preferences',
  ],
} as const;

export default function AccountDeletionScreen({ navigation }: AccountDeletionScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const deleteAccount = useAuthStore((state) => state.deleteAccount);
  const [isDeleting, setIsDeleting] = useState(false);
  const impact = ROLE_IMPACT[user?.role ?? 'customer'];

  const performDeletion = async () => {
    setIsDeleting(true);
    const result = await deleteAccount();
    setIsDeleting(false);
    if (result.success) {
      showToast('Your account and associated data were deleted', 'success');
      if (navigationRef.isReady()) {
        navigationRef.resetRoot({
          index: 0,
          routes: [
            {
              name: 'Auth',
              params: { screen: 'Login' },
            },
          ],
        });
      }
      return;
    }
    showToast(result.error ?? 'Could not delete your account. Please try again.', 'error');
  };

  const confirmDeletion = () => {
    Alert.alert(
      'Permanently delete account?',
      'This cannot be undone. You may be asked to confirm with Apple before deletion.',
      [
        { text: 'Keep my account', style: 'cancel' },
        {
          text: 'Delete permanently',
          style: 'destructive',
          onPress: () => void performDeletion(),
        },
      ],
    );
  };

  const openWebDeletion = () => {
    void Linking.openURL(ACCOUNT_DELETION_WEB_URL).catch(() => {
      showToast('Could not open the deletion page. Please try again.', 'error');
    });
  };

  return (
    <ScreenWrapper variant="stack">
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={navigation.goBack}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Delete account</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxxl }]}
        >
          <View style={styles.heroIcon}>
            <Ionicons name="shield-checkmark-outline" size={32} color={theme.colors.error} />
          </View>
          <Text style={styles.title}>You stay in control of your data.</Text>
          <Text style={styles.subtitle}>
            Deleting your account permanently removes your TrimiT identity and associated data.
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>What will be removed</Text>
            {impact.map((item) => (
              <View key={item} style={styles.impactRow}>
                <View style={styles.bullet} />
                <Text style={styles.impactText}>{item}</Text>
              </View>
            ))}
            <View style={styles.identityRow}>
              <Ionicons name="person-circle-outline" size={20} color={theme.colors.textSecondary} />
              <Text style={styles.identityText} numberOfLines={1}>
                {user?.email || 'Your signed-in account'}
              </Text>
            </View>
          </View>

          <View style={styles.notice}>
            <Ionicons name="information-circle-outline" size={22} color={theme.colors.info} />
            <Text style={styles.noticeText}>
              Deletion is permanent. If you only want a break, you can go back and sign out instead.
            </Text>
          </View>

          <TouchableOpacity
            testID="delete-account-permanently"
            style={[styles.deleteButton, isDeleting && styles.disabled]}
            onPress={confirmDeletion}
            disabled={isDeleting}
            accessibilityRole="button"
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              <Ionicons name="trash-outline" size={20} color={theme.colors.white} />
            )}
            <Text style={styles.deleteButtonText}>
              {isDeleting ? 'Deleting your account…' : 'Delete account permanently'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.webButton}
            onPress={openWebDeletion}
            disabled={isDeleting}
            accessibilityRole="link"
          >
            <Text style={styles.webButtonText}>Use the web deletion page</Text>
            <Ionicons name="open-outline" size={17} color={theme.colors.primary} />
          </TouchableOpacity>
        </ScrollView>
      </View>
    </ScreenWrapper>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    minHeight: 54,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: { width: 40 },
  headerTitle: { ...typography.bodySemiBold, color: theme.colors.text },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xxxl },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.errorLight,
    marginBottom: spacing.xl,
  },
  title: { ...typography.h2, color: theme.colors.text, marginBottom: spacing.sm },
  subtitle: {
    ...typography.body,
    color: theme.colors.textSecondary,
    marginBottom: spacing.xxl,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  cardTitle: { ...typography.bodySemiBold, color: theme.colors.text, marginBottom: spacing.md },
  impactRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.md },
  bullet: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.error,
    marginTop: 7,
  },
  impactText: { ...typography.bodySmall, color: theme.colors.textSecondary, flex: 1 },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  identityText: { ...typography.bodySmallMedium, color: theme.colors.textSecondary, flex: 1 },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: theme.colors.infoLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
  },
  noticeText: { ...typography.bodySmall, color: theme.colors.text, flex: 1 },
  deleteButton: {
    minHeight: 54,
    borderRadius: borderRadius.pill,
    backgroundColor: theme.colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  deleteButtonText: { ...typography.bodySemiBold, color: theme.colors.white },
  disabled: { opacity: 0.65 },
  webButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  webButtonText: { ...typography.bodySmallMedium, color: theme.colors.primary },
});
