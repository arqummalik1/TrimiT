import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';
import { fonts, spacing, borderRadius } from '../../lib/utils';
import { MarkdownView } from '../../components/MarkdownView';
import { CONTACT_MD } from '../../legal/content';
import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  SUPPORT_PHONE_DISPLAY,
} from '../../lib/contactInfo';

interface ContactScreenProps {
  navigation: {
    goBack: () => void;
  };
}

const ContactScreen: React.FC<ContactScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <ScreenWrapper variant="stack">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Contact Us
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Get in touch</Text>
          <Text style={styles.cardSubtitle}>
            Bookings, salon listings, or account help — we reply within one business day.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          >
            <Ionicons name="mail-outline" size={20} color={theme.colors.textInverse} />
            <Text style={styles.primaryBtnText}>{SUPPORT_EMAIL}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => void Linking.openURL(`tel:${SUPPORT_PHONE}`)}
          >
            <Ionicons name="call-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.secondaryBtnText}>{SUPPORT_PHONE_DISPLAY}</Text>
          </TouchableOpacity>
        </View>
        <MarkdownView content={CONTACT_MD} />
      </ScrollView>
    </ScreenWrapper>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
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
      fontFamily: fonts.heading,
      fontSize: 18,
      color: theme.colors.text,
      flex: 1,
      textAlign: 'center',
    },
    headerRight: { width: 40 },
    content: { flex: 1 },
    scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxxl },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: spacing.lg,
      marginBottom: spacing.lg,
    },
    cardTitle: {
      fontFamily: fonts.heading,
      fontSize: 18,
      color: theme.colors.text,
      marginBottom: spacing.xs,
    },
    cardSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
      marginBottom: spacing.md,
    },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: theme.colors.primary,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.md,
      marginBottom: spacing.sm,
    },
    primaryBtnText: {
      color: theme.colors.textInverse,
      fontWeight: '600',
      fontSize: 15,
    },
    secondaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.md,
    },
    secondaryBtnText: {
      color: theme.colors.text,
      fontWeight: '600',
      fontSize: 15,
    },
  });

export default ContactScreen;
