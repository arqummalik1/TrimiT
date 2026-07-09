import { StyleSheet } from 'react-native';
import type { Theme } from '../../theme/tokens';
import { layout } from '../../theme/tokens';

/** Single corner radius for every card/group on the profile & settings screen. */
function settingsSurfaceRadius(theme: Theme): number {
  return theme.borderRadius.lg;
}

/** CRED-inspired settings list chrome — flat groups, hairline dividers, muted labels. */
export function createSettingsStyles(theme: Theme) {
  const surfaceRadius = settingsSurfaceRadius(theme);

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingHorizontal: layout.floatingChromeInset,
      paddingTop: 20,
      paddingBottom: 12,
      backgroundColor: theme.colors.background,
    },
    headerTitle: {
      ...theme.typography.tabTitle,
      color: theme.colors.text,
    },
    scrollContent: {
      paddingBottom: 24,
    },
    section: {
      paddingHorizontal: layout.floatingChromeInset,
      marginBottom: 20,
    },
    sectionTitle: {
      ...theme.typography.overline,
      color: theme.colors.textTertiary,
      marginBottom: 10,
      marginLeft: 2,
    },
    group: {
      backgroundColor: theme.colors.surface,
      borderRadius: surfaceRadius,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 15,
      paddingHorizontal: 16,
      minHeight: 52,
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    rowText: {
      flex: 1,
      minWidth: 0,
      paddingRight: 8,
    },
    rowTitle: {
      ...theme.typography.bodyMedium,
      color: theme.colors.text,
    },
    rowTitleDestructive: {
      color: theme.colors.error,
    },
    rowSubtitle: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      marginTop: 3,
    },
    profileCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: surfaceRadius,
      padding: 20,
    },
    profileTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      ...theme.typography.h4,
      color: theme.colors.primary,
    },
    profileMeta: {
      flex: 1,
      minWidth: 0,
    },
    profileName: {
      ...theme.typography.h4,
      color: theme.colors.text,
    },
    profileDetail: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    editLink: {
      ...theme.typography.captionMedium,
      color: theme.colors.primary,
      marginTop: 10,
      alignSelf: 'flex-start',
    },
    themeSegmentRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    themeOption: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: surfaceRadius,
      backgroundColor: theme.colors.surfaceSecondary,
    },
    themeOptionActive: {
      backgroundColor: theme.colors.text,
    },
    themeOptionText: {
      ...theme.typography.captionMedium,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    themeOptionTextActive: {
      color: theme.colors.background,
    },
    footerMeta: {
      ...theme.typography.caption,
      color: theme.colors.textTertiary,
      textAlign: 'center',
      marginTop: 20,
    },
  });
}
