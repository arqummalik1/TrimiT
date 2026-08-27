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
import { Button } from '../../components/Button';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';

type Slide = {
  id: 'discover' | 'booking' | 'choices';
  eyebrow: string;
  title: string;
  body: string;
};

type OnboardingLayout = {
  screenWidth: number;
  contentWidth: number;
  compact: boolean;
  visualHeight: number;
};

const SLIDES: Slide[] = [
  {
    id: 'discover',
    eyebrow: 'TIME, WELL SPENT',
    title: 'Less waiting. More living.',
    body: 'Plan ahead and keep your day moving.',
  },
  {
    id: 'booking',
    eyebrow: 'BOOK AROUND YOUR DAY',
    title: 'Plan it. Book it.',
    body: 'Choose a salon, service, and available time.',
  },
  {
    id: 'choices',
    eyebrow: 'MORE CHOICE, ONE PLACE',
    title: 'Explore salons & beauty parlours.',
    body: 'Compare services, prices, reviews, and available slots.',
  },
];

type SceneMotionVariant = 'focus' | 'rise' | 'shift';

function useReduceMotionPreference() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted && enabled) setReduceMotion(true);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}

function SceneEntrance({
  active,
  reduceMotion,
  variant,
  children,
}: {
  active: boolean;
  reduceMotion: boolean;
  variant: SceneMotionVariant;
  children: React.ReactNode;
}) {
  const progress = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    progress.stopAnimation();
    if (!active) {
      progress.setValue(0);
      return;
    }
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 480,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [active, progress, reduceMotion]);

  const transform = variant === 'focus'
    ? [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }]
    : variant === 'rise'
      ? [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }]
      : [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) }];

  return (
    <Animated.View style={[motionStyles.fill, { opacity: progress, transform }]}>
      {children}
    </Animated.View>
  );
}

function TimeRespectCard({ theme, layout, reduceMotion }: { theme: Theme; layout: OnboardingLayout; reduceMotion: boolean }) {
  const styles = useMemo(() => createVisualStyles(theme, layout), [theme, layout]);
  const flipProgress = useRef(new Animated.Value(0)).current;
  const [isFlipped, setIsFlipped] = useState(false);

  const flip = () => {
    const nextFlipped = !isFlipped;
    setIsFlipped(nextFlipped);
    Animated.timing(flipProgress, {
      toValue: nextFlipped ? 1 : 0,
      duration: reduceMotion ? 0 : 520,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const frontRotation = flipProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  const backRotation = flipProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  return (
    <Pressable
      testID="onboarding-time-card"
      onPress={flip}
      style={styles.flipPressable}
      accessibilityRole="button"
      accessibilityLabel={isFlipped ? 'Show the time-reserved card' : 'Show how TrimiT saves time'}
      accessibilityHint="Flips the card"
      accessibilityState={{ expanded: isFlipped }}
    >
      <View style={styles.flipStage}>
        <Animated.View
          pointerEvents={isFlipped ? 'none' : 'auto'}
          accessibilityElementsHidden={isFlipped}
          importantForAccessibility={isFlipped ? 'no-hide-descendants' : 'auto'}
          style={[styles.flipFace, { transform: [{ perspective: 1000 }, { rotateY: frontRotation }] }]}
        >
          <View style={styles.timeTopRow}>
            <Text style={styles.sceneOverline}>PLAN AHEAD</Text>
            <View style={styles.touchBadge}>
              <Ionicons name="hand-left-outline" size={16} color={theme.colors.primary} />
            </View>
          </View>
          <View style={styles.timeFocus}>
            <View style={styles.clockHalo}>
              <View style={styles.clockCore}>
                <Ionicons name="time-outline" size={layout.compact ? 31 : 38} color={theme.colors.textInverse} />
              </View>
            </View>
            <Text style={styles.timeFocusTitle}>Plan before you go.</Text>
            <Text style={styles.timeFocusMeta}>No uncertain walk-in queue.</Text>
          </View>
          <View style={styles.timeBottomRow}>
            <View style={styles.flipHint}>
              <Ionicons name="sync-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={styles.flipHintText}>Tap to see how</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={theme.colors.primary} />
          </View>
        </Animated.View>

        <Animated.View
          pointerEvents={isFlipped ? 'auto' : 'none'}
          accessibilityElementsHidden={!isFlipped}
          importantForAccessibility={isFlipped ? 'auto' : 'no-hide-descendants'}
          style={[styles.flipFace, styles.flipBack, { transform: [{ perspective: 1000 }, { rotateY: backRotation }] }]}
        >
          <Text style={styles.backOverline}>YOUR DAY, UNINTERRUPTED</Text>
          <Text style={styles.backTitle}>Your day stays yours.</Text>
          <View style={styles.miniJourney}>
            {[
              ['search-outline', 'Find'],
              ['calendar-outline', 'Plan'],
              ['checkmark-outline', 'Go'],
            ].map(([icon, label], index) => (
              <React.Fragment key={label}>
                <View style={styles.miniStep}>
                  <View style={styles.miniStepIcon}>
                    <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={15} color={theme.colors.textInverse} />
                  </View>
                  <Text style={styles.miniStepText}>{label}</Text>
                </View>
                {index < 2 ? <View style={styles.miniConnector} /> : null}
              </React.Fragment>
            ))}
          </View>
          <View style={styles.backHint}>
            <Ionicons name="sync-outline" size={14} color={theme.colors.textInverse} />
            <Text style={styles.backHintText}>Tap to flip back</Text>
          </View>
        </Animated.View>
      </View>
    </Pressable>
  );
}

function SlideVisual({
  id,
  theme,
  layout,
  active,
  reduceMotion,
}: {
  id: Slide['id'];
  theme: Theme;
  layout: OnboardingLayout;
  active: boolean;
  reduceMotion: boolean;
}) {
  const styles = useMemo(() => createVisualStyles(theme, layout), [theme, layout]);

  if (id === 'discover') {
    return (
      <SceneEntrance active={active} reduceMotion={reduceMotion} variant="focus">
        <TimeRespectCard theme={theme} layout={layout} reduceMotion={reduceMotion} />
      </SceneEntrance>
    );
  }

  if (id === 'booking') {
    return (
      <SceneEntrance active={active} reduceMotion={reduceMotion} variant="rise">
        <View style={styles.bookingScene} testID="onboarding-booking-scene">
          <View style={styles.bookingTopRow}>
            <Text style={styles.sceneOverline}>CHOOSE YOUR TIME</Text>
            <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
          </View>
          <View style={styles.calendarHeading}>
            <Text style={styles.calendarMonth}>Friday</Text>
            <Text style={styles.calendarDate}>25 May</Text>
          </View>
          <View style={styles.dateRail}>
            {[
              ['THU', '24'],
              ['FRI', '25'],
              ['SAT', '26'],
            ].map(([day, date], index) => (
              <View key={date} style={[styles.dateCell, index === 1 && styles.dateCellSelected]}>
                <Text style={[styles.dateDay, index === 1 && styles.dateTextSelected]}>{day}</Text>
                <Text style={[styles.dateNumber, index === 1 && styles.dateTextSelected]}>{date}</Text>
              </View>
            ))}
          </View>
          <View style={styles.slotRail}>
            <View style={styles.slotPillMuted}><Text style={styles.slotTextMuted}>10:30</Text></View>
            <View style={styles.slotPillSelected}>
              <Ionicons name="checkmark" size={15} color={theme.colors.textInverse} />
              <Text style={styles.slotTextSelected}>11:45</Text>
            </View>
            <View style={styles.slotPillMuted}><Text style={styles.slotTextMuted}>1:15</Text></View>
          </View>
        </View>
      </SceneEntrance>
    );
  }

  return (
    <SceneEntrance active={active} reduceMotion={reduceMotion} variant="shift">
      <View style={styles.choicesScene} testID="onboarding-choices-scene">
        <View style={styles.choicesTopRow}>
          <Text style={styles.sceneOverline}>FIND YOUR PERFECT MATCH</Text>
          <Ionicons name="search-outline" size={20} color={theme.colors.primary} />
        </View>
        <View style={styles.salonChoiceRail}>
          {[
            ['cut-outline', 'Salons'],
            ['sparkles-outline', 'Beauty\nparlours'],
            ['people-outline', 'Unisex'],
          ].map(([icon, label], index) => (
            <View key={label} style={[styles.salonChoice, index === 1 && styles.salonChoiceSelected]}>
              <View style={[styles.salonChoiceIcon, index === 1 && styles.salonChoiceIconSelected]}>
                <Ionicons
                  name={icon as keyof typeof Ionicons.glyphMap}
                  size={19}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={[styles.salonChoiceLabel, index === 1 && styles.salonChoiceLabelSelected]}>
                {label}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.comparePill}>
          <Ionicons name="options-outline" size={17} color={theme.colors.primary} />
          <Text style={styles.compareText}>Services · prices · reviews</Text>
          <Ionicons name="arrow-forward" size={17} color={theme.colors.primary} />
        </View>
      </View>
    </SceneEntrance>
  );
}

export const OnboardingScreen: React.FC = () => {
  const { theme } = useTheme();
  const reduceMotion = useReduceMotionPreference();
  const { width, height } = useWindowDimensions();
  const layout = useMemo<OnboardingLayout>(() => {
    const screenWidth = Math.max(width, 320);
    const compact = height < 740 || screenWidth < 360;
    const horizontalPadding = screenWidth >= 768 ? 48 : screenWidth >= 430 ? 28 : 20;
    const contentWidth = Math.min(screenWidth - horizontalPadding * 2, 620);
    const visualHeight = compact ? 214 : screenWidth >= 768 ? 310 : Math.min(274, Math.max(238, height * 0.3));
    return {
      screenWidth,
      contentWidth,
      compact,
      visualHeight,
    };
  }, [height, width]);
  const styles = useMemo(() => createStyles(theme, layout), [theme, layout]);
  const completeOnboarding = useAuthStore((state) => state.completeOnboarding);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ x: activeIndex * layout.screenWidth, animated: false });
  }, [layout.screenWidth]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / layout.screenWidth);
    if (nextIndex >= 0 && nextIndex < SLIDES.length && nextIndex !== activeIndex) setActiveIndex(nextIndex);
  };

  const next = () => {
    if (activeIndex === SLIDES.length - 1) {
      completeOnboarding();
      return;
    }
    scrollRef.current?.scrollTo({ x: (activeIndex + 1) * layout.screenWidth, animated: true });
  };

  return (
    <ScreenWrapper variant="auth">
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
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>
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
        >
          {SLIDES.map((slide) => (
            <View key={slide.id} style={styles.slide}>
              <View style={styles.slideContent}>
                <View style={styles.visualShell}>
                  <SlideVisual
                    id={slide.id}
                    theme={theme}
                    layout={layout}
                    active={slide.id === SLIDES[activeIndex]?.id}
                    reduceMotion={reduceMotion}
                  />
                </View>
                <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
                <Text style={styles.title} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.88}>
                  {slide.title}
                </Text>
                <Text style={styles.body}>{slide.body}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerInner}>
            <View
              testID="onboarding-page-indicator"
              style={styles.progressRow}
              accessibilityLabel={`Step ${activeIndex + 1} of ${SLIDES.length}`}
            >
              {SLIDES.map((slide, index) => (
                <View key={slide.id} style={[styles.progressDot, index === activeIndex && styles.progressDotActive]} />
              ))}
            </View>
            <Button
              title={activeIndex === SLIDES.length - 1 ? 'Explore salons' : 'Continue'}
              onPress={next}
              size={layout.compact ? 'md' : 'lg'}
              style={styles.action}
            />
            <Text style={styles.footerNote}>No sign-in required to explore</Text>
          </View>
        </View>
      </View>
    </ScreenWrapper>
  );
};

const getOnboardingGeometry = (theme: Theme, layout: OnboardingLayout) => {
  const heroRadius = layout.compact
    ? theme.borderRadius.xl
    : theme.borderRadius.xxl - theme.spacing.xs;
  return {
    heroRadius,
    panelRadius: heroRadius - theme.spacing.sm,
  };
};

const createStyles = (theme: Theme, layout: OnboardingLayout) => {
  const geometry = getOnboardingGeometry(theme, layout);
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  topBar: {
    minHeight: layout.compact ? 48 : 56,
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
    width: layout.compact ? 31 : 36,
    height: layout.compact ? 31 : 36,
  },
  brandName: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontSize: layout.compact ? 20 : theme.typography.h3.fontSize,
  },
  skip: {
    minWidth: 48,
    minHeight: 44,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: { ...theme.typography.bodySmallMedium, color: theme.colors.textSecondary },
  carousel: { flex: 1 },
  slide: { width: layout.screenWidth, alignItems: 'center' },
  slideContent: {
    width: layout.contentWidth,
    paddingTop: layout.compact ? theme.spacing.xs : theme.spacing.sm,
  },
  visualShell: {
    height: layout.visualHeight,
    borderRadius: geometry.heroRadius,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: layout.compact ? theme.spacing.lg : theme.spacing.xxl,
  },
  eyebrow: {
    ...theme.typography.overline,
    color: theme.colors.primary,
    marginBottom: layout.compact ? theme.spacing.sm : theme.spacing.md,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
    fontSize: layout.compact ? 31 : layout.screenWidth >= 768 ? 42 : 36,
    lineHeight: layout.compact ? 36 : layout.screenWidth >= 768 ? 48 : 42,
    marginBottom: layout.compact ? theme.spacing.sm : theme.spacing.md,
  },
  body: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontSize: layout.compact ? 14 : 16,
    lineHeight: layout.compact ? 20 : 24,
  },
  footer: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: layout.compact ? theme.spacing.sm : theme.spacing.md,
    paddingBottom: layout.compact ? theme.spacing.xs : theme.spacing.sm,
  },
  footerInner: { width: layout.contentWidth, alignSelf: 'center' },
  progressRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: layout.compact ? theme.spacing.md : theme.spacing.xl,
  },
  progressDot: {
    width: 7,
    height: 7,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.border,
  },
  progressDotActive: { width: 28, backgroundColor: theme.colors.primary },
  action: { width: '100%' },
  footerNote: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  });
};

const createVisualStyles = (theme: Theme, layout: OnboardingLayout) => {
  const geometry = getOnboardingGeometry(theme, layout);
  return StyleSheet.create({
  flipPressable: { width: '100%', height: '100%' },
  flipStage: { width: '100%', height: '100%' },
  flipFace: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: geometry.heroRadius,
    padding: layout.compact ? theme.spacing.lg : theme.spacing.xl,
    backfaceVisibility: 'hidden',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSecondary,
    justifyContent: 'space-between',
  },
  flipBack: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  timeTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sceneOverline: { ...theme.typography.overline, color: theme.colors.textSecondary, letterSpacing: 1.6 },
  touchBadge: {
    width: layout.compact ? 32 : 36,
    height: layout.compact ? 32 : 36,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceRaised,
  },
  timeFocus: { alignItems: 'center' },
  clockHalo: {
    width: layout.compact ? 72 : 84,
    height: layout.compact ? 72 : 84,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryLight,
  },
  clockCore: {
    width: layout.compact ? 54 : 62,
    height: layout.compact ? 54 : 62,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  timeFocusTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginTop: layout.compact ? theme.spacing.sm : theme.spacing.md,
  },
  timeFocusMeta: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  timeBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flipHint: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  flipHintText: { ...theme.typography.captionMedium, color: theme.colors.textSecondary },
  backOverline: { ...theme.typography.overline, color: theme.colors.textInverse, opacity: 0.72 },
  backTitle: {
    ...theme.typography.h2,
    color: theme.colors.textInverse,
    fontSize: layout.compact ? 27 : 32,
    lineHeight: layout.compact ? 32 : 38,
    maxWidth: '82%',
  },
  miniJourney: { flexDirection: 'row', alignItems: 'center' },
  miniStep: { alignItems: 'center', gap: theme.spacing.xs },
  miniStepIcon: {
    width: layout.compact ? 34 : 38,
    height: layout.compact ? 34 : 38,
    borderRadius: theme.borderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.textInverse,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniStepText: { ...theme.typography.captionMedium, color: theme.colors.textInverse },
  miniConnector: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.textInverse,
    opacity: 0.45,
    marginHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  backHint: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, opacity: 0.72 },
  backHintText: { ...theme.typography.caption, color: theme.colors.textInverse },
  bookingScene: {
    width: '100%',
    height: '100%',
    borderRadius: geometry.heroRadius,
    backgroundColor: theme.colors.surfaceSecondary,
    padding: layout.compact ? theme.spacing.lg : theme.spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  bookingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calendarHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: layout.compact ? theme.spacing.sm : theme.spacing.md,
  },
  calendarMonth: { ...theme.typography.h2, color: theme.colors.text },
  calendarDate: { ...theme.typography.bodySmallMedium, color: theme.colors.textSecondary },
  dateRail: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: layout.compact ? theme.spacing.sm : theme.spacing.md },
  dateCell: {
    flex: 1,
    height: layout.compact ? 60 : 68,
    borderRadius: geometry.panelRadius,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCellSelected: { backgroundColor: theme.colors.primary },
  dateDay: { ...theme.typography.captionMedium, color: theme.colors.textSecondary },
  dateNumber: { ...theme.typography.h4, color: theme.colors.text, marginTop: 2 },
  dateTextSelected: { color: theme.colors.textInverse },
  slotRail: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md },
  slotPillMuted: {
    flex: 1,
    minHeight: layout.compact ? 34 : 38,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotPillSelected: {
    flex: 1.2,
    minHeight: layout.compact ? 34 : 38,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  slotTextMuted: { ...theme.typography.captionMedium, color: theme.colors.textSecondary },
  slotTextSelected: { ...theme.typography.captionMedium, color: theme.colors.textInverse },
  choicesScene: {
    width: '100%',
    height: '100%',
    borderRadius: geometry.heroRadius,
    backgroundColor: theme.colors.surfaceSecondary,
    padding: layout.compact ? theme.spacing.lg : theme.spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  choicesTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  salonChoiceRail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: layout.compact ? theme.spacing.md : theme.spacing.lg,
  },
  salonChoice: {
    flex: 1,
    height: layout.compact ? 82 : 96,
    borderRadius: geometry.panelRadius,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  salonChoiceSelected: {
    height: layout.compact ? 92 : 108,
    backgroundColor: theme.colors.primary,
  },
  salonChoiceIcon: {
    width: layout.compact ? 34 : 40,
    height: layout.compact ? 34 : 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  salonChoiceIconSelected: { backgroundColor: theme.colors.surfaceRaised },
  salonChoiceLabel: {
    ...theme.typography.captionMedium,
    color: theme.colors.text,
    textAlign: 'center',
  },
  salonChoiceLabelSelected: { color: theme.colors.textInverse },
  comparePill: {
    minHeight: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceRaised,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginTop: layout.compact ? theme.spacing.md : theme.spacing.lg,
  },
  compareText: { ...theme.typography.captionMedium, color: theme.colors.text, flex: 1 },
  });
};

const motionStyles = StyleSheet.create({
  fill: { width: '100%', height: '100%' },
});

export default OnboardingScreen;
