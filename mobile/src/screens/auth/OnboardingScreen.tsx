import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { useAuthStore } from '../../store/authStore';
import { lightTheme } from '../../theme/lightTheme';
import { Theme } from '../../theme/tokens';
import { KineticEditorialScene } from './onboarding/KineticEditorialScenes';
import {
  KINETIC_MOTION,
  KineticLayout,
  KineticSlideId,
  kineticHaptics,
} from './onboarding/kineticEditorial';

type Slide = {
  id: KineticSlideId;
  eyebrow: string;
  title: string;
  body: string;
};

const SLIDES: Slide[] = [
  {
    id: 'time',
    eyebrow: 'TIME, BEAUTIFULLY YOURS',
    title: 'Less waiting.\nMore living.',
    body: 'Plan before you go—and\nkeep the rest of your day yours.',
  },
  {
    id: 'book',
    eyebrow: 'BOOK AROUND YOUR DAY',
    title: 'Your time.\nYour choice.',
    body: 'Choose a salon, service, and\navailable time—on your terms.',
  },
  {
    id: 'discover',
    eyebrow: 'BEAUTY, YOUR WAY',
    title: 'Find the place\nthat feels right.',
    body: 'Compare services, prices, reviews,\nand availability—all in one place.',
  },
];

function useReduceMotionPreference() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}

function EditorialAction({
  title,
  onPress,
  compact,
  reduceMotion,
}: {
  title: string;
  onPress: () => void;
  compact: boolean;
  reduceMotion: boolean;
}) {
  const theme = lightTheme;
  const scale = useRef(new Animated.Value(1)).current;
  const depth = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const styles = useMemo(() => createActionStyles(theme, compact), [compact, theme]);

  const press = (pressed: boolean) => {
    if (reduceMotion) return;
    if (pressed) {
      Animated.parallel([
        Animated.timing(scale, {
          toValue: KINETIC_MOTION.pressScale,
          duration: KINETIC_MOTION.pressInMs,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(depth, {
          toValue: KINETIC_MOTION.pressDepth,
          duration: KINETIC_MOTION.pressInMs,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 1,
          duration: KINETIC_MOTION.pressInMs,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        ...KINETIC_MOTION.spring,
        useNativeDriver: true,
      }),
      Animated.spring(depth, {
        toValue: 0,
        ...KINETIC_MOTION.spring,
        useNativeDriver: true,
      }),
      Animated.timing(glow, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const activate = () => {
    kineticHaptics.impact();
    onPress();
  };

  return (
    <View style={styles.shadowStage}>
      <Animated.View style={[styles.pressGlow, { opacity: glow }]} />
      <Animated.View style={{ transform: [{ translateY: depth }, { scale }] }}>
        <Pressable
          testID="onboarding-primary-action"
          style={styles.action}
          onPress={activate}
          onPressIn={() => press(true)}
          onPressOut={() => press(false)}
          accessibilityRole="button"
          accessibilityLabel={title}
        >
          <Text style={styles.actionText}>{title}</Text>
          <View style={styles.actionArrow}>
            <Ionicons name="chevron-forward" size={compact ? 18 : 20} color={theme.colors.textInverse} />
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

export const OnboardingScreen: React.FC = () => {
  // The introduction is intentionally an authored light-mode experience. All
  // values still come from the central theme, but user/system dark mode cannot
  // change this first-launch art direction.
  const theme = lightTheme;
  const reduceMotion = useReduceMotionPreference();
  const { width, height } = useWindowDimensions();
  const completeOnboarding = useAuthStore((state) => state.completeOnboarding);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const layout = useMemo<KineticLayout>(() => {
    const screenWidth = Math.max(width, 320);
    const compact = height < 740 || screenWidth < 360;
    const horizontalPadding = screenWidth >= 768 ? 48 : screenWidth >= 430 ? 28 : 20;
    const contentWidth = Math.min(screenWidth - horizontalPadding * 2, screenWidth >= 768 ? 520 : 440);
    const visualHeight = compact
      ? Math.min(236, Math.max(200, height * 0.31))
      : screenWidth >= 768
        ? 372
        : Math.min(410, Math.max(350, height * 0.46));
    return { screenWidth, contentWidth, compact, visualHeight };
  }, [height, width]);
  const styles = useMemo(() => createStyles(theme, layout), [layout, theme]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ x: activeIndex * layout.screenWidth, animated: false });
  }, [layout.screenWidth]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / layout.screenWidth);
    if (nextIndex >= 0 && nextIndex < SLIDES.length && nextIndex !== activeIndex) {
      setActiveIndex(nextIndex);
    }
  };

  const next = () => {
    if (activeIndex === SLIDES.length - 1) {
      completeOnboarding();
      return;
    }
    const nextIndex = activeIndex + 1;
    setActiveIndex(nextIndex);
    scrollRef.current?.scrollTo({ x: nextIndex * layout.screenWidth, animated: !reduceMotion });
  };

  return (
    <ScreenWrapper variant="auth" style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <View style={styles.topBar}>
          <View style={styles.topBarInner}>
            <View style={styles.brand} accessibilityLabel="TrimiT">
              <Image
                source={require('../../../assets/trimit-t-transparent.png')}
                style={styles.logo}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
              <Text style={styles.brandName}>TrimiT</Text>
            </View>
            <TouchableOpacity
              onPress={completeOnboarding}
              style={styles.skip}
              accessibilityRole="button"
              accessibilityLabel="Skip introduction"
              activeOpacity={0.64}
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View
          testID="onboarding-page-indicator"
          style={styles.progressRow}
          accessibilityRole="progressbar"
          accessibilityLabel={`Step ${activeIndex + 1} of ${SLIDES.length}`}
          accessibilityValue={{ min: 1, max: SLIDES.length, now: activeIndex + 1 }}
        >
          {SLIDES.map((slide, index) => (
            <View key={slide.id} style={styles.progressStep}>
              {index < SLIDES.length - 1 ? (
                <View style={[styles.progressLine, index < activeIndex && styles.progressLineComplete]} />
              ) : null}
              <View
                style={[
                  styles.progressDot,
                  index <= activeIndex && styles.progressDotComplete,
                  index === activeIndex && styles.progressDotActive,
                ]}
              />
            </View>
          ))}
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          style={styles.carousel}
          accessibilityLabel="TrimiT introduction"
        >
          {SLIDES.map((slide, index) => (
            <View key={slide.id} style={styles.slide}>
              <View style={styles.slideContent}>
                <View style={styles.copyBlock}>
                  <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
                  <Text
                    style={styles.title}
                    numberOfLines={3}
                    adjustsFontSizeToFit
                    minimumFontScale={0.82}
                  >
                    {slide.title}
                  </Text>
                  <Text style={styles.body}>{slide.body}</Text>
                </View>
                <View style={styles.visualShell}>
                  <KineticEditorialScene
                    id={slide.id}
                    theme={theme}
                    layout={layout}
                    active={index === activeIndex}
                    reduceMotion={reduceMotion}
                  />
                </View>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerInner}>
            <EditorialAction
              title={activeIndex === SLIDES.length - 1 ? 'Explore salons' : 'Continue'}
              onPress={next}
              compact={layout.compact}
              reduceMotion={reduceMotion}
            />
            <Text
              style={[styles.footerNote, activeIndex !== SLIDES.length - 1 && styles.footerNoteHidden]}
              accessibilityElementsHidden={activeIndex !== SLIDES.length - 1}
              importantForAccessibility={activeIndex === SLIDES.length - 1 ? 'auto' : 'no-hide-descendants'}
            >
              No sign-in required to explore
            </Text>
          </View>
        </View>
      </View>
    </ScreenWrapper>
  );
};

const createStyles = (theme: Theme, layout: KineticLayout) => StyleSheet.create({
  screen: { backgroundColor: theme.colors.editorialCanvas },
  container: { flex: 1, backgroundColor: theme.colors.editorialCanvas },
  topBar: {
    minHeight: layout.compact ? 46 : 52,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  topBarInner: {
    width: layout.contentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  logo: {
    width: layout.compact ? 29 : 33,
    height: layout.compact ? 29 : 33,
  },
  brandName: {
    fontFamily: theme.fonts.headingMedium,
    color: theme.colors.editorialInk,
    fontSize: layout.compact ? 21 : 23,
    lineHeight: layout.compact ? 25 : 28,
  },
  skip: {
    minWidth: 48,
    minHeight: 44,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: { ...theme.typography.bodySmallMedium, color: theme.colors.editorialInk },
  progressRow: {
    width: layout.compact ? 142 : 158,
    minHeight: layout.compact ? 28 : 34,
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressStep: {
    width: layout.compact ? 46 : 52,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressLine: {
    position: 'absolute',
    left: '50%',
    width: '100%',
    height: 2,
    backgroundColor: theme.colors.border,
  },
  progressLineComplete: { backgroundColor: theme.colors.editorialTerracotta },
  progressDot: {
    width: 9,
    height: 9,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.border,
    zIndex: 2,
  },
  progressDotComplete: { backgroundColor: theme.colors.editorialTerracotta },
  progressDotActive: {
    width: 12,
    height: 12,
    borderWidth: 3,
    borderColor: theme.colors.editorialActiveRing,
  },
  carousel: { flex: 1 },
  slide: { width: layout.screenWidth, alignItems: 'center' },
  slideContent: {
    width: layout.contentWidth,
    flex: 1,
    paddingTop: layout.compact ? 2 : theme.spacing.xs,
  },
  copyBlock: {
    minHeight: layout.compact ? 146 : 170,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: layout.compact ? 2 : theme.spacing.sm,
  },
  eyebrow: {
    ...theme.typography.overline,
    color: theme.colors.editorialTerracotta,
    textAlign: 'center',
    marginTop: layout.compact ? 4 : 7,
    marginBottom: layout.compact ? 8 : 11,
  },
  title: {
    fontFamily: theme.fonts.headingRegular,
    fontWeight: '400',
    color: theme.colors.editorialInk,
    textAlign: 'center',
    fontSize: layout.compact ? 31 : layout.screenWidth >= 768 ? 42 : 34,
    lineHeight: layout.compact ? 33 : layout.screenWidth >= 768 ? 46 : 37,
    letterSpacing: -0.45,
    marginBottom: layout.compact ? 7 : 10,
  },
  body: {
    ...theme.typography.body,
    color: theme.colors.editorialMuted,
    textAlign: 'center',
    maxWidth: layout.compact ? 320 : 370,
    fontSize: layout.compact ? 13 : 14,
    lineHeight: layout.compact ? 18 : 20,
  },
  visualShell: {
    width: '100%',
    height: layout.visualHeight,
    overflow: 'visible',
    marginTop: layout.compact ? 0 : 2,
  },
  footer: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: layout.compact ? 8 : 10,
    paddingBottom: layout.compact ? 2 : 5,
    backgroundColor: theme.colors.editorialCanvas,
  },
  footerInner: { width: layout.contentWidth, alignSelf: 'center' },
  footerNote: {
    ...theme.typography.caption,
    color: theme.colors.editorialMuted,
    textAlign: 'center',
    marginTop: layout.compact ? 5 : 7,
    minHeight: 16,
  },
  footerNoteHidden: { opacity: 0 },
});

const createActionStyles = (theme: Theme, compact: boolean) => StyleSheet.create({
  shadowStage: {
    width: '100%',
    borderRadius: theme.borderRadius.full,
    shadowColor: theme.colors.editorialShadowStrong,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 6,
  },
  pressGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.editorialTerracotta,
    transform: [{ scale: 1.035 }],
  },
  action: {
    width: '100%',
    minHeight: compact ? 50 : 56,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.editorialTerracotta,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.editorialTerracotta,
    paddingHorizontal: theme.spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontFamily: theme.fonts.headingRegular,
    fontWeight: '400',
    color: theme.colors.textInverse,
    fontSize: compact ? 15 : 17,
  },
  actionArrow: { position: 'absolute', right: theme.spacing.xl },
});

export default OnboardingScreen;
