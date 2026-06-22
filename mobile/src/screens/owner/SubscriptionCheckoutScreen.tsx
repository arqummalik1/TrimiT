import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';
import { OwnerSettingsScreenProps } from '../../navigation/types';

type Props = OwnerSettingsScreenProps<'SubscriptionCheckout'>;

const SubscriptionCheckoutScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <ScreenWrapper variant="stack">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>TrimiT Pro</Text>
          <Text style={styles.headerSubtitle}>₹299 / month</Text>
        </View>
      </View>

      <View style={{ gap: 12 }}>
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={20} color={theme.colors.warning} />
          <Text style={styles.errorText}>
            Our payment gateway is currently being updated. Subscriptions cannot be purchased or renewed online right now. We will notify you once the new payment gateway is live!
          </Text>
        </View>
      </View>
    </ScreenWrapper>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
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
    headerText: { marginLeft: 12 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
    headerSubtitle: { fontSize: 14, color: theme.colors.textSecondary },
    errorBox: {
      flexDirection: 'row',
      gap: 8,
      margin: 20,
      padding: 12,
      backgroundColor: theme.colors.warning + '1A',
      borderRadius: 8,
    },
    errorText: { color: theme.colors.warning, flex: 1, lineHeight: 20 },
  });

export default SubscriptionCheckoutScreen;
