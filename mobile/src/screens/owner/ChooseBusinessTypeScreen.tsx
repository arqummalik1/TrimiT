import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { Button } from '../../components/Button';
import { useTheme, Theme } from '../../theme/ThemeContext';
import { typography, spacing, borderRadius, shadows } from '../../lib/utils';
import {
  BUSINESS_TYPE_PICKER_OPTIONS,
  SalonGenderServe,
} from '../../lib/genderServe';
import type { NavigationProp } from '@react-navigation/native';

type ChooseBusinessTypeParams = {
  ChooseBusinessType: undefined;
  ManageSalon: { gender_serve: SalonGenderServe } | undefined;
};

type Props = {
  navigation: NavigationProp<ChooseBusinessTypeParams, 'ChooseBusinessType'>;
};

const ICON_MAP = {
  cut: 'cut-outline' as const,
  sparkles: 'sparkles-outline' as const,
  people: 'people-outline' as const,
};

export default function ChooseBusinessTypeScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [selected, setSelected] = useState<SalonGenderServe | null>(null);

  const handleContinue = () => {
    if (!selected) return;
    navigation.navigate('ManageSalon', { gender_serve: selected });
  };

  return (
    <ScreenWrapper variant="stack">
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>What type of business?</Text>
          <Text style={styles.subtitle}>
            Choose one to continue. You can update this later in settings.
          </Text>
        </View>

        <View style={styles.cards}>
          {BUSINESS_TYPE_PICKER_OPTIONS.map((opt) => {
            const active = selected === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                testID={`business-type-${opt.value}`}
                style={[styles.card, active && styles.cardActive, shadows.sm]}
                onPress={() => setSelected(opt.value)}
                activeOpacity={0.85}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
                  <Ionicons
                    name={ICON_MAP[opt.icon]}
                    size={28}
                    color={active ? theme.colors.primary : theme.colors.textSecondary}
                  />
                </View>
                <View style={styles.cardText}>
                  <Text style={[styles.cardTitle, active && styles.cardTitleActive]}>
                    {opt.title}
                  </Text>
                  <Text style={styles.cardSubtitle}>{opt.subtitle}</Text>
                </View>
                {active ? (
                  <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                ) : (
                  <View style={styles.radioEmpty} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Button
          title="Continue"
          onPress={handleContinue}
          disabled={!selected}
          testID="business-type-continue"
        />
      </ScrollView>
    </ScreenWrapper>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    scroll: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    header: {
      marginBottom: spacing.xl,
    },
    backBtn: {
      marginBottom: spacing.md,
      alignSelf: 'flex-start',
    },
    title: {
      ...typography.h2,
      color: theme.colors.text,
      marginBottom: spacing.sm,
    },
    subtitle: {
      ...typography.body,
      color: theme.colors.textSecondary,
      lineHeight: 22,
    },
    cards: {
      gap: spacing.md,
      marginBottom: spacing.xl,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.lg,
      borderRadius: borderRadius.lg,
      borderWidth: 2,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      gap: spacing.md,
    },
    cardActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.isDark ? 'rgba(154, 52, 18, 0.12)' : 'rgba(154, 52, 18, 0.06)',
    },
    iconWrap: {
      width: 52,
      height: 52,
      borderRadius: borderRadius.md,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconWrapActive: {
      backgroundColor: theme.isDark ? 'rgba(154, 52, 18, 0.2)' : 'rgba(154, 52, 18, 0.1)',
    },
    cardText: {
      flex: 1,
    },
    cardTitle: {
      ...typography.h3,
      fontSize: 17,
      color: theme.colors.text,
      marginBottom: 4,
    },
    cardTitleActive: {
      color: theme.colors.primary,
    },
    cardSubtitle: {
      ...typography.caption,
      color: theme.colors.textSecondary,
    },
    radioEmpty: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: theme.colors.border,
    },
  });
