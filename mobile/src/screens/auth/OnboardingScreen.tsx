import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/Button';
import { typography, spacing, borderRadius } from '../../lib/utils';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';
import { ScreenWrapper } from '../../components/ScreenWrapper';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Slide {
  id: string;
  icon: any;
  title: string;
  subtitle: string;
}

const SLIDES: Slide[] = [
  {
    id: 'welcome',
    icon: 'sparkles-outline',
    title: 'Welcome to TrimiT',
    subtitle: 'Find and book appointments with premium salons and top stylists in your neighborhood.',
  },
  {
    id: 'passwordless',
    icon: 'mail-unread-outline',
    title: 'Passwordless Sign In',
    subtitle: 'No passwords to remember. Access your account securely and instantly using a 6-digit email verification code.',
  },
  {
    id: 'booking',
    icon: 'calendar-clear-outline',
    title: 'Seamless Scheduling',
    subtitle: 'Select services, view real-time availability, and confirm your slot instantly. No phone calls needed.',
  },
  {
    id: 'reminders',
    icon: 'notifications-outline',
    title: 'Personalized Alerts',
    subtitle: 'Never miss an appointment with automated notifications and receive exclusive local promos.',
  },
];

export const OnboardingScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const completeOnboarding = useAuthStore((state) => state.completeOnboarding);
  
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollOffset / SCREEN_WIDTH);
    if (index !== activeIndex && index >= 0 && index < SLIDES.length) {
      setActiveIndex(index);
    }
  };

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      scrollViewRef.current?.scrollTo({
        x: (activeIndex + 1) * SCREEN_WIDTH,
        animated: true,
      });
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  return (
    <ScreenWrapper>
      <SafeAreaView style={styles.container}>
        {/* Top Header Row with Skip Button */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.skipButton} 
            onPress={handleSkip}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Swipeable Slides ScrollView */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          bounces={false}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {SLIDES.map((slide) => (
            <View key={slide.id} style={styles.slide}>
              <View style={styles.iconWrapper}>
                <Ionicons 
                  name={slide.icon as any} 
                  size={72} 
                  color={theme.colors.primary} 
                />
              </View>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.subtitle}>{slide.subtitle}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Footer controls: Pagination dots and Next/Start button */}
        <View style={styles.footer}>
          {/* Pagination Indicators */}
          <View style={styles.dotsContainer}>
            {SLIDES.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === activeIndex ? styles.activeDot : null,
                ]}
              />
            ))}
          </View>

          {/* Action Button */}
          <Button
            title={activeIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
            onPress={handleNext}
            style={styles.actionButton}
          />
        </View>
      </SafeAreaView>
    </ScreenWrapper>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      justifyContent: 'space-between',
    },
    header: {
      height: 48,
      justifyContent: 'center',
      alignItems: 'flex-end',
      paddingHorizontal: spacing.xxl,
    },
    skipButton: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    skipText: {
      ...typography.bodyMedium,
      color: theme.colors.textSecondary,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      alignItems: 'center',
    },
    slide: {
      width: SCREEN_WIDTH,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xxxxl,
    },
    iconWrapper: {
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xxxl,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    title: {
      ...typography.h2,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: spacing.md,
      fontWeight: '700',
    },
    subtitle: {
      ...typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },
    footer: {
      paddingHorizontal: spacing.xxl,
      paddingBottom: spacing.xxl,
      alignItems: 'center',
      gap: spacing.xxl,
    },
    dotsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.border,
    },
    activeDot: {
      width: 20,
      backgroundColor: theme.colors.primary,
    },
    actionButton: {
      width: '100%',
    },
  });

export default OnboardingScreen;
