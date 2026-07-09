import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/authService';
import { showToast } from '../store/toastStore';
import { handleApiError } from '../lib/errorHandler';
import { DISCOVERY_PREF_OPTIONS, DiscoveryAudience } from '../lib/genderServe';
import { createSettingsStyles } from './settings/settingsStyles';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function labelForAudience(value: DiscoveryAudience): string {
  return DISCOVERY_PREF_OPTIONS.find((o) => o.value === value)?.label ?? 'Match my profile';
}

export function DiscoverySettingsSection() {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createSettingsStyles(theme), [theme]);
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
      <Text style={styles.sectionTitle}>Discovery</Text>
      <View style={styles.group}>
        <TouchableOpacity style={styles.row} onPress={toggleExpand} activeOpacity={0.65}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Salons shown near you</Text>
            {!expanded ? (
              <Text style={styles.rowSubtitle}>{labelForAudience(discoveryAudience)}</Text>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {saving ? (
              <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginRight: 8 }} />
            ) : null}
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={theme.colors.textTertiary}
            />
          </View>
        </TouchableOpacity>

        {expanded && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            {DISCOVERY_PREF_OPTIONS.map((opt, index) => {
              const selected = discoveryAudience === opt.value;
              const isLast = index === DISCOVERY_PREF_OPTIONS.length - 1;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.row, !isLast && styles.rowBorder, { paddingHorizontal: 0 }]}
                  onPress={() => void handleSelect(opt.value)}
                  disabled={saving}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  testID={`discovery-pref-${opt.value}`}
                >
                  <Text
                    style={[
                      styles.rowTitle,
                      selected && { color: theme.colors.primary },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {selected ? (
                    <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

export default DiscoverySettingsSection;
