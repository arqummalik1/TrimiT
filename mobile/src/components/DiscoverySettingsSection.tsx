import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { Theme } from '../theme/tokens';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/authService';
import { showToast } from '../store/toastStore';
import { handleApiError } from '../lib/errorHandler';
import { DISCOVERY_PREF_OPTIONS, DiscoveryAudience } from '../lib/genderServe';
import { layout } from '../theme/tokens';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function labelForAudience(value: DiscoveryAudience): string {
  return DISCOVERY_PREF_OPTIONS.find((o) => o.value === value)?.label ?? 'Match my profile';
}

export function DiscoverySettingsSection() {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const token = useAuthStore((s) => s.token);

  const [discoveryAudience, setDiscoveryAudience] = useState<DiscoveryAudience>(
    user?.discovery_audience ?? 'auto',
  );
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setDiscoveryAudience(user?.discovery_audience ?? 'auto');
  }, [user?.discovery_audience]);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  const handleSelect = useCallback(
    async (value: DiscoveryAudience) => {
      if (value === discoveryAudience || saving) return;
      const previous = discoveryAudience;
      setDiscoveryAudience(value);
      setSaving(true);
      try {
        await authService.updateProfile({ discovery_audience: value });
        if (user) {
          setUser({ ...user, discovery_audience: value }, token);
        }
        showToast('Discovery preference updated', 'success');
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(false);
      } catch (error) {
        setDiscoveryAudience(previous);
        showToast(handleApiError(error).message, 'error');
      } finally {
        setSaving(false);
      }
    },
    [discoveryAudience, saving, user, setUser, token],
  );

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>DISCOVERY</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.headerRow} onPress={toggleExpand} activeOpacity={0.7}>
          <View style={styles.headerTitleContainer}>
            <View style={[styles.headerIconContainer, { backgroundColor: theme.colors.primary }]}>
              <Ionicons name="compass" size={18} color={theme.colors.white} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Salons shown near you</Text>
              {!expanded ? (
                <Text style={styles.subtitle}>{labelForAudience(discoveryAudience)}</Text>
              ) : null}
            </View>
          </View>
          <View style={styles.headerRightContainer}>
            {saving ? (
              <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginRight: 8 }} />
            ) : null}
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={theme.colors.textSecondary}
            />
          </View>
        </TouchableOpacity>

        {expanded && (
          <View style={styles.expandedContent}>
            {DISCOVERY_PREF_OPTIONS.map((opt, index) => {
              const selected = discoveryAudience === opt.value;
              const isLast = index === DISCOVERY_PREF_OPTIONS.length - 1;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.optionRow, !isLast && styles.optionRowBorder]}
                  onPress={() => void handleSelect(opt.value)}
                  disabled={saving}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  testID={`discovery-pref-${opt.value}`}
                >
                  <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                    {opt.label}
                  </Text>
                  {selected ? (
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                  ) : (
                    <View style={styles.optionRadio} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
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
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
    },
    headerTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      minWidth: 0,
    },
    headerIconContainer: {
      width: 28,
      height: 28,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    headerText: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      ...theme.typography.bodyMedium,
      color: theme.colors.text,
    },
    subtitle: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    headerRightContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 8,
    },
    expandedContent: {
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
    },
    optionRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    optionLabel: {
      ...theme.typography.body,
      color: theme.colors.text,
      flex: 1,
      paddingRight: 12,
    },
    optionLabelSelected: {
      ...theme.typography.bodyMedium,
      color: theme.colors.primary,
    },
    optionRadio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
    },
  });

export default DiscoverySettingsSection;
