import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityState,
  Animated,
  Easing,
  Image,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Defs,
  FeDropShadow,
  Filter,
  Line,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
} from 'react-native-svg';
import { Theme } from '../../../theme/tokens';
import {
  KINETIC_MOTION,
  KineticLayout,
  KineticSlideId,
  kineticHaptics,
} from './kineticEditorial';

type TactilePressableProps = {
  children: React.ReactNode;
  onPress: () => void;
  reduceMotion: boolean;
  haptic?: 'impact' | 'select' | 'none';
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel: string;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
};

function TactilePressable({
  children,
  onPress,
  reduceMotion,
  haptic = 'select',
  style,
  testID,
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
}: TactilePressableProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const depth = useRef(new Animated.Value(0)).current;

  const settle = (pressed: boolean) => {
    if (reduceMotion) {
      scale.setValue(1);
      depth.setValue(0);
      return;
    }
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
    ]).start();
  };

  const activate = () => {
    if (haptic === 'impact') kineticHaptics.impact();
    if (haptic === 'select') kineticHaptics.select();
    onPress();
  };

  return (
    <Animated.View style={[style, { transform: [{ translateY: depth }, { scale }] }]}>
      <Pressable
        testID={testID}
        style={sceneStyles.pressFill}
        onPress={activate}
        onPressIn={() => settle(true)}
        onPressOut={() => settle(false)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={accessibilityState}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

function SceneEntrance({
  active,
  reduceMotion,
  axis,
  children,
}: {
  active: boolean;
  reduceMotion: boolean;
  axis: 'scale' | 'x' | 'y';
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
      duration: KINETIC_MOTION.sceneEntranceMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [active, progress, reduceMotion]);

  const transform = axis === 'scale'
    ? [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }]
    : axis === 'x'
      ? [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }]
      : [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }];

  return (
    <Animated.View style={[sceneStyles.fill, { opacity: progress, transform }]}>
      {children}
    </Animated.View>
  );
}

function TimeScene({
  theme,
  layout,
  active,
  reduceMotion,
}: SceneProps) {
  const styles = useMemo(() => createStyles(theme, layout), [layout, theme]);
  const clockSize = Math.min(layout.contentWidth * 1.04, layout.visualHeight * 0.95);
  const clockStageWidth = clockSize + (layout.compact ? 42 : 54);
  const clockStageHeight = clockSize + (layout.compact ? 24 : 34);
  const clockLeft = layout.compact ? -104 : -142;
  const tapCueWidth = layout.compact ? 58 : 68;
  const tapCueLeft = Math.min(
    layout.screenWidth - tapCueWidth - (layout.compact ? 12 : 18),
    clockLeft + clockSize + (layout.compact ? 18 : 26),
  );
  const wake = useRef(new Animated.Value(0)).current;
  const minuteSweep = useRef(new Animated.Value(0)).current;
  const hasMinuteSwept = useRef(false);
  const flipProgress = useRef(new Animated.Value(0)).current;
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    wake.stopAnimation();
    wake.setValue(0);
    if (!active || reduceMotion) return;
    const animation = Animated.sequence([
      Animated.delay(620),
      Animated.loop(
        Animated.sequence([
          Animated.timing(wake, {
            toValue: 1,
            duration: 180,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.spring(wake, {
            toValue: 0,
            ...KINETIC_MOTION.spring,
            useNativeDriver: true,
          }),
          Animated.delay(720),
        ]),
        { iterations: 2 },
      ),
    ]);
    animation.start();
    return () => animation.stop();
  }, [active, reduceMotion, wake]);

  useEffect(() => {
    minuteSweep.stopAnimation();
    minuteSweep.setValue(0);
    if (!active || reduceMotion) return;
    if (hasMinuteSwept.current) {
      minuteSweep.setValue(1);
      return;
    }

    hasMinuteSwept.current = true;
    const animation = Animated.sequence([
      Animated.delay(260),
      Animated.timing(minuteSweep, {
        toValue: 1,
        duration: 1900,
        easing: Easing.bezier(0.45, 0, 0.2, 1),
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [active, minuteSweep, reduceMotion]);

  const flip = () => {
    const next = !isFlipped;
    setIsFlipped(next);
    Animated.timing(flipProgress, {
      toValue: next ? 1 : 0,
      duration: reduceMotion ? 0 : KINETIC_MOTION.flipMs,
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
  const wakeScale = wake.interpolate({ inputRange: [0, 1], outputRange: [1, 1.014] });
  const wakeLift = wake.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });
  const minuteRotation = minuteSweep.interpolate({
    inputRange: [0, 1],
    outputRange: ['48deg', '408deg'],
  });

  return (
    <SceneEntrance active={active} reduceMotion={reduceMotion} axis="scale">
      <View
        style={[
          styles.scene,
          {
            width: layout.screenWidth,
            marginLeft: -(layout.screenWidth - layout.contentWidth) / 2,
          },
        ]}
        testID="onboarding-time-scene"
      >
        <Svg style={StyleSheet.absoluteFill} viewBox="0 0 360 360" preserveAspectRatio="none" pointerEvents="none">
          <Defs>
            <Filter id="reelShadow" x="-20%" y="-20%" width="160%" height="170%">
              <FeDropShadow
                dx="0"
                dy="7"
                stdDeviation="6"
                floodColor={theme.colors.editorialInk}
                floodOpacity="0.3"
              />
            </Filter>
            <SvgLinearGradient id="reelSurface" x1="0" y1="0" x2="0.82" y2="1">
              <Stop offset="0" stopColor={theme.colors.editorialTerracotta} />
              <Stop offset="0.62" stopColor={theme.colors.editorialTerracotta} />
              <Stop offset="1" stopColor={theme.colors.primary} />
            </SvgLinearGradient>
          </Defs>
          <Path
            d="M 72 9 C 137 9 199 38 254 84 C 301 127 349 152 402 165 L 402 239 C 349 229 296 202 249 160 C 198 115 143 67 75 49 C 61 42 59 20 72 9 Z"
            fill="url(#reelSurface)"
            filter="url(#reelShadow)"
          />
          <Path
            d="M 402 239 C 349 229 296 202 249 160 C 198 115 143 67 75 49"
            stroke={theme.colors.editorialInk}
            strokeOpacity="0.34"
            strokeWidth="2.4"
            fill="none"
          />
          <Path
            d="M 75 12 C 138 12 199 41 253 86 C 299 128 347 154 400 168"
            stroke={theme.colors.white}
            strokeOpacity="0.17"
            strokeWidth="1.8"
            fill="none"
          />
          <Line x1="274" y1="112" x2="284" y2="95" stroke={theme.colors.editorialPaper} strokeWidth="2.2" strokeLinecap="round" />
          <Line x1="316" y1="151" x2="326" y2="134" stroke={theme.colors.editorialPaper} strokeWidth="2.2" strokeLinecap="round" />
          <Line x1="354" y1="178" x2="362" y2="161" stroke={theme.colors.editorialPaper} strokeWidth="2.2" strokeLinecap="round" />
          <Line x1="385" y1="194" x2="391" y2="178" stroke={theme.colors.editorialPaper} strokeWidth="2.2" strokeLinecap="round" />
        </Svg>

        <Animated.View
          style={[
            styles.clockPosition,
            {
              width: clockStageWidth,
              height: clockStageHeight,
              transform: [{ translateY: wakeLift }, { scale: wakeScale }],
            },
          ]}
        >
          <TactilePressable
            style={{ width: clockStageWidth, height: clockStageHeight }}
            onPress={flip}
            reduceMotion={reduceMotion}
            haptic="impact"
            testID="onboarding-time-card"
            accessibilityLabel={isFlipped ? 'Show the kinetic clock' : 'Show how TrimiT gives time back'}
            accessibilityHint="Flips the time composition"
            accessibilityState={{ expanded: isFlipped }}
          >
            <View style={styles.flipStage}>
              <Animated.View
                pointerEvents={isFlipped ? 'none' : 'auto'}
                accessibilityElementsHidden={isFlipped}
                importantForAccessibility={isFlipped ? 'no-hide-descendants' : 'auto'}
                style={[
                  styles.clockComposite,
                  { width: clockStageWidth, height: clockStageHeight },
                  { transform: [{ perspective: 1100 }, { rotateY: frontRotation }] },
                ]}
              >
                <View
                  style={[
                    styles.clockContactShadow,
                    styles.clockRearContactShadow,
                    { width: clockSize, height: clockSize, borderRadius: clockSize },
                  ]}
                />
                <LinearGradient
                  colors={[theme.colors.white, theme.colors.surfaceSecondary]}
                  start={{ x: 0.15, y: 0.05 }}
                  end={{ x: 0.85, y: 0.95 }}
                  style={[
                    styles.clockLayer,
                    styles.clockLayerRear,
                    { width: clockSize, height: clockSize, borderRadius: clockSize },
                  ]}
                />
                <View
                  style={[
                    styles.clockContactShadow,
                    styles.clockMiddleContactShadow,
                    { width: clockSize, height: clockSize, borderRadius: clockSize },
                  ]}
                />
                <LinearGradient
                  colors={[theme.colors.white, theme.colors.editorialPaper]}
                  start={{ x: 0.2, y: 0.08 }}
                  end={{ x: 0.82, y: 0.92 }}
                  style={[
                    styles.clockLayer,
                    styles.clockLayerMiddle,
                    { width: clockSize, height: clockSize, borderRadius: clockSize },
                  ]}
                />
                <View
                  style={[
                    styles.clockContactShadow,
                    styles.clockFrontContactShadow,
                    { width: clockSize, height: clockSize, borderRadius: clockSize },
                  ]}
                />
                <LinearGradient
                  colors={[theme.colors.white, theme.colors.editorialPaper, theme.colors.surfaceSecondary]}
                  locations={[0, 0.72, 1]}
                  start={{ x: 0.18, y: 0.04 }}
                  end={{ x: 0.9, y: 0.96 }}
                  style={[
                    styles.clockFaceFront,
                    { width: clockSize, height: clockSize, borderRadius: clockSize },
                  ]}
                >
                  <View style={styles.clockFaceInset} />
                  {Array.from({ length: 12 }, (_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.tickOrbit,
                        { transform: [{ rotate: `${index * 30}deg` }] },
                      ]}
                    >
                      <View style={[styles.clockTick, index % 3 === 0 && styles.clockTickMajor]} />
                    </View>
                  ))}
                  <View style={[styles.handOrbit, { transform: [{ rotate: '-54deg' }] }]}> 
                    <View style={styles.hourHandShadow} />
                    <View style={styles.hourHand} />
                  </View>
                  <Animated.View
                    testID="onboarding-minute-hand"
                    style={[styles.handOrbit, { transform: [{ rotate: minuteRotation }] }]}
                  >
                    <View style={styles.minuteHandShadow} />
                    <View style={styles.minuteHand} />
                  </Animated.View>
                  <View style={styles.clockPinShadow} />
                  <View style={styles.clockPinOuter}>
                    <View style={styles.clockPinInner} />
                  </View>
                </LinearGradient>
              </Animated.View>

              <Animated.View
                pointerEvents={isFlipped ? 'auto' : 'none'}
                accessibilityElementsHidden={!isFlipped}
                importantForAccessibility={isFlipped ? 'auto' : 'no-hide-descendants'}
                style={[
                  styles.clockBack,
                  { width: clockSize, height: clockSize, borderRadius: clockSize },
                  { transform: [{ perspective: 1100 }, { rotateY: backRotation }] },
                ]}
              >
                <View style={styles.clockBackGlow} />
                <View style={styles.clockBackOrbit} />
                <View style={styles.clockBackContent} testID="onboarding-time-back-content">
                  <Text style={styles.backEyebrow}>YOUR TIME, PROTECTED</Text>
                  <Text style={styles.backTitle}>Ready when{`\n`}you are.</Text>
                  <Text style={styles.backBody}>A smoother visit, timed around you.</Text>
                  <View style={styles.journeyList}>
                    {[
                      ['search-outline', 'Find your place', 'Nearby, at a glance'],
                      ['calendar-outline', 'Choose your slot', 'Built around your day'],
                      ['sparkles-outline', 'Arrive on cue', 'Skip the queue'],
                    ].map(([icon, label, detail], index) => (
                      <View
                        style={[
                          styles.journeyItem,
                          index === 1 && styles.journeyItemMiddle,
                          index === 2 && styles.journeyItemLast,
                        ]}
                        key={label}
                      >
                        <View style={styles.journeyIcon}>
                          <Ionicons
                            name={icon as keyof typeof Ionicons.glyphMap}
                            color={theme.colors.editorialTerracotta}
                            size={16}
                          />
                        </View>
                        <View style={styles.journeyCopy}>
                          <Text style={styles.journeyLabel}>{label}</Text>
                          <Text style={styles.journeyDetail}>{detail}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                  <View style={styles.flipBackFooter}>
                    <Ionicons name="return-up-back" color={theme.colors.textInverse} size={14} />
                    <Text style={styles.flipBackHint}>Tap to return</Text>
                  </View>
                </View>
              </Animated.View>
            </View>
          </TactilePressable>
        </Animated.View>

        <View style={[styles.tapCue, { left: tapCueLeft, width: tapCueWidth }]} pointerEvents="none">
          <Svg width={40} height={42} viewBox="0 0 40 42">
            <Path
              d="M 35 36 C 34 26 28 16 15 9 M 16 17 L 14 8 L 23 11"
              stroke={theme.colors.editorialMuted}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
          <Text style={styles.tapCueText}>Tap</Text>
        </View>
      </View>
    </SceneEntrance>
  );
}

const DATES = [
  { day: 'THU', date: '24' },
  { day: 'FRI', date: '25' },
  { day: 'SAT', date: '26' },
] as const;
const TIMES = ['10:30', '11:45', '1:15'] as const;

function BookingScene({
  theme,
  layout,
  active,
  reduceMotion,
}: SceneProps) {
  const styles = useMemo(() => createStyles(theme, layout), [layout, theme]);
  const entries = useRef(DATES.map(() => new Animated.Value(reduceMotion ? 1 : 0))).current;
  const [selectedDate, setSelectedDate] = useState('25');
  const [selectedTime, setSelectedTime] = useState('11:45');

  useEffect(() => {
    entries.forEach((entry) => entry.setValue(active && reduceMotion ? 1 : 0));
    if (!active || reduceMotion) return;
    Animated.stagger(
      KINETIC_MOTION.dateStaggerMs,
      entries.map((entry) => Animated.spring(entry, {
        toValue: 1,
        ...KINETIC_MOTION.spring,
        useNativeDriver: true,
      })),
    ).start();
  }, [active, entries, reduceMotion]);

  return (
    <SceneEntrance active={active} reduceMotion={reduceMotion} axis="y">
      <View style={styles.scene} testID="onboarding-booking-scene">
        <Svg style={StyleSheet.absoluteFill} viewBox="0 0 360 280" preserveAspectRatio="none" pointerEvents="none">
          <Path
            d="M -30 205 C 86 178 198 102 390 188"
            stroke={theme.colors.editorialTerracotta}
            strokeWidth="54"
            strokeLinecap="round"
            fill="none"
          />
        </Svg>

        <View style={styles.dateRail}>
          {DATES.map((item, index) => {
            const selected = selectedDate === item.date;
            return (
              <Animated.View
                key={item.date}
                style={{
                  opacity: entries[index],
                  transform: [
                    {
                      translateY: entries[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [34 + index * 4, selected ? -10 : index === 2 ? 8 : 5],
                      }),
                    },
                    { rotate: index === 0 ? '-3deg' : index === 2 ? '3deg' : '0deg' },
                  ],
                }}
              >
                <TactilePressable
                  style={[styles.dateLeaf, selected && styles.dateLeafSelected]}
                  onPress={() => setSelectedDate(item.date)}
                  reduceMotion={reduceMotion}
                  testID={`onboarding-date-${item.date}`}
                  accessibilityLabel={`${item.day} ${item.date}`}
                  accessibilityHint="Selects this demonstration date"
                  accessibilityState={{ selected }}
                >
                  <View style={styles.dateLeafStack} />
                  <Text style={[styles.dateDay, selected && styles.dateTextSelected]}>{item.day}</Text>
                  <Text style={[styles.dateNumber, selected && styles.dateTextSelected]}>{item.date}</Text>
                </TactilePressable>
              </Animated.View>
            );
          })}
        </View>

        <View style={styles.timeRail}>
          {TIMES.map((time) => {
            const selected = selectedTime === time;
            return (
              <TactilePressable
                key={time}
                style={[styles.timePill, selected && styles.timePillSelected]}
                onPress={() => setSelectedTime(time)}
                reduceMotion={reduceMotion}
                testID={`onboarding-time-${time}`}
                accessibilityLabel={`${time}${selected ? ', selected' : ''}`}
                accessibilityHint="Selects this demonstration time"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.timeText, selected && styles.timeTextSelected]}>{time}</Text>
              </TactilePressable>
            );
          })}
        </View>
      </View>
    </SceneEntrance>
  );
}

const SALON_CHOICES = [
  { icon: 'cut-outline', label: 'Salon' },
  { icon: 'sparkles-outline', label: 'Beauty parlour' },
  { icon: 'brush-outline', label: 'Unisex' },
] as const;

function DiscoveryScene({
  theme,
  layout,
  active,
  reduceMotion,
}: SceneProps) {
  const styles = useMemo(() => createStyles(theme, layout), [layout, theme]);
  const proofEntries = useRef([0, 1, 2].map(() => new Animated.Value(reduceMotion ? 1 : 0))).current;
  const [selectedChoice, setSelectedChoice] = useState(1);

  useEffect(() => {
    proofEntries.forEach((entry) => entry.setValue(active && reduceMotion ? 1 : 0));
    if (!active || reduceMotion) return;
    Animated.stagger(
      KINETIC_MOTION.proofStaggerMs,
      proofEntries.map((entry) => Animated.spring(entry, {
        toValue: 1,
        ...KINETIC_MOTION.spring,
        useNativeDriver: true,
      })),
    ).start();
  }, [active, proofEntries, reduceMotion]);

  const proofStyle = (index: number) => ({
    opacity: proofEntries[index],
    transform: [{
      translateY: proofEntries[index].interpolate({ inputRange: [0, 1], outputRange: [18, 0] }),
    }],
  });

  return (
    <SceneEntrance active={active} reduceMotion={reduceMotion} axis="x">
      <View style={styles.scene} testID="onboarding-choices-scene">
        <Animated.View style={[styles.proofChip, styles.ratingChip, proofStyle(0)]}>
          <Ionicons name="star-outline" color={theme.colors.editorialInk} size={15} />
          <Text style={styles.proofText}>4.9 ★</Text>
        </Animated.View>
        <Animated.View style={[styles.proofChip, styles.priceChip, proofStyle(1)]}>
          <Text style={styles.proofText}>From ₹499</Text>
        </Animated.View>
        <Animated.View style={[styles.proofChip, styles.todayChip, proofStyle(2)]}>
          <Ionicons name="calendar-outline" color={theme.colors.editorialInk} size={15} />
          <Text style={styles.proofText}>Today</Text>
        </Animated.View>

        <View style={styles.archRail}>
          {SALON_CHOICES.map((choice, index) => {
            const selected = selectedChoice === index;
            const featured = index === 1;
            return (
              <TactilePressable
                key={choice.label}
                style={[
                  styles.archWrap,
                  featured && styles.archWrapFeatured,
                  selected && styles.archWrapSelected,
                ]}
                onPress={() => setSelectedChoice(index)}
                reduceMotion={reduceMotion}
                testID={`onboarding-choice-${index}`}
                accessibilityLabel={choice.label}
                accessibilityHint="Selects this salon type demonstration"
                accessibilityState={{ selected }}
              >
                <View style={[styles.archAura, featured && styles.archAuraFeatured]} />
                <View style={[styles.arch, featured && styles.archFeatured, selected && styles.archSelected]}>
                  <LinearGradient
                    colors={[theme.colors.white, theme.colors.editorialPaper, theme.colors.surfaceSecondary]}
                    locations={[0, 0.7, 1]}
                    start={{ x: 0.15, y: 0 }}
                    end={{ x: 0.85, y: 1 }}
                    style={styles.archSurface}
                  />
                  <View style={styles.archInnerEdge} />
                  {featured ? (
                    <Image
                      testID="onboarding-featured-monogram"
                      source={require('../../../../assets/trimit-t-transparent.png')}
                      style={styles.archMonogram}
                      resizeMode="contain"
                      accessibilityIgnoresInvertColors
                    />
                  ) : (
                    <Ionicons
                      name={choice.icon as keyof typeof Ionicons.glyphMap}
                      size={24}
                      color={theme.colors.metallicAccent}
                    />
                  )}
                </View>
                {featured ? (
                  <View style={styles.featuredPedestal} testID="onboarding-featured-pedestal">
                    <View style={styles.pedestalTierTop} />
                    <View style={styles.pedestalTierMiddle} />
                    <View style={styles.pedestalTierLower} />
                    <View style={styles.pedestalTierBase} />
                  </View>
                ) : (
                  <View style={styles.sidePedestal}>
                    <View style={styles.archStepTop} />
                    <View style={styles.archStepBottom} />
                  </View>
                )}
              </TactilePressable>
            );
          })}
        </View>

      </View>
    </SceneEntrance>
  );
}

type SceneProps = {
  theme: Theme;
  layout: KineticLayout;
  active: boolean;
  reduceMotion: boolean;
};

export function KineticEditorialScene({
  id,
  ...props
}: SceneProps & { id: KineticSlideId }) {
  if (id === 'time') return <TimeScene {...props} />;
  if (id === 'book') return <BookingScene {...props} />;
  return <DiscoveryScene {...props} />;
}

const createStyles = (theme: Theme, layout: KineticLayout) => {
  const compact = layout.compact;
  const leafWidth = Math.min(104, layout.contentWidth * 0.27);
  const leafHeight = compact ? 122 : 146;
  const discoveryGap = compact ? 8 : 10;
  const featuredDoorWidth = Math.min(compact ? 98 : 110, layout.contentWidth * 0.34);
  const sideDoorWidth = Math.min(
    compact ? 74 : 84,
    (layout.contentWidth - featuredDoorWidth - discoveryGap * 2) / 2,
  );
  return StyleSheet.create({
    scene: {
      flex: 1,
      width: '100%',
      overflow: 'hidden',
      position: 'relative',
    },
    clockPosition: {
      position: 'absolute',
      left: compact ? -104 : -142,
      bottom: compact ? -4 : -9,
    },
    flipStage: { flex: 1, width: '100%', height: '100%' },
    clockComposite: {
      position: 'absolute',
      left: 0,
      top: 0,
      backfaceVisibility: 'hidden',
    },
    clockLayer: {
      position: 'absolute',
      backgroundColor: theme.colors.editorialPaper,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      shadowColor: theme.colors.editorialShadowStrong,
      shadowOffset: { width: 4, height: 12 },
      shadowOpacity: 1,
      shadowRadius: 14,
      elevation: 5,
    },
    clockContactShadow: {
      position: 'absolute',
      backgroundColor: theme.colors.editorialShadow,
    },
    clockRearContactShadow: {
      left: compact ? 37 : 53,
      top: compact ? 22 : 31,
      opacity: 0.46,
    },
    clockMiddleContactShadow: {
      left: compact ? 20 : 28,
      top: compact ? 12 : 17,
      opacity: 0.56,
    },
    clockFrontContactShadow: {
      left: compact ? 3 : 4,
      top: compact ? 3 : 4,
      opacity: 0.66,
    },
    clockLayerRear: {
      left: compact ? 34 : 50,
      top: compact ? 19 : 28,
    },
    clockLayerMiddle: {
      left: compact ? 17 : 25,
      top: compact ? 9 : 14,
      shadowOffset: { width: 3, height: 9 },
      shadowRadius: 11,
    },
    clockFaceFront: {
      position: 'absolute',
      left: 0,
      top: 0,
      backgroundColor: theme.colors.editorialPaper,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      shadowColor: theme.colors.editorialShadowStrong,
      shadowOffset: { width: 5, height: 12 },
      shadowOpacity: 1,
      shadowRadius: 16,
      elevation: 7,
    },
    clockFaceInset: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.white,
      opacity: 0.62,
    },
    tickOrbit: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
    },
    clockTick: {
      width: 2,
      height: compact ? 9 : 11,
      marginTop: '8.5%',
      borderRadius: 2,
      backgroundColor: theme.colors.metallicAccent,
      opacity: 0.76,
    },
    clockTickMajor: { height: compact ? 14 : 17, opacity: 1 },
    handOrbit: { ...StyleSheet.absoluteFillObject },
    hourHandShadow: {
      position: 'absolute',
      width: compact ? 5 : 6,
      height: '25%',
      left: '49.2%',
      top: '25.8%',
      borderRadius: 4,
      backgroundColor: theme.colors.editorialShadowStrong,
      transform: [{ translateX: 2 }, { translateY: 3 }],
    },
    hourHand: {
      position: 'absolute',
      width: compact ? 4 : 5,
      height: '25%',
      left: '49.35%',
      top: '25%',
      borderRadius: 4,
      backgroundColor: theme.colors.metallicAccent,
    },
    minuteHandShadow: {
      position: 'absolute',
      width: 3,
      height: '35%',
      left: '49.6%',
      top: '15.6%',
      borderRadius: 3,
      backgroundColor: theme.colors.editorialShadowStrong,
      transform: [{ translateX: 2 }, { translateY: 3 }],
    },
    minuteHand: {
      position: 'absolute',
      width: 2,
      height: '35%',
      left: '49.7%',
      top: '15%',
      borderRadius: 3,
      backgroundColor: theme.colors.metallicAccent,
    },
    clockPinShadow: {
      position: 'absolute',
      width: compact ? 20 : 23,
      height: compact ? 20 : 23,
      borderRadius: 999,
      left: compact ? '46.8%' : '46.6%',
      top: compact ? '47.1%' : '46.9%',
      backgroundColor: theme.colors.editorialShadowStrong,
      transform: [{ translateX: 3 }, { translateY: 5 }],
    },
    clockPinOuter: {
      position: 'absolute',
      width: compact ? 20 : 23,
      height: compact ? 20 : 23,
      borderRadius: 999,
      left: compact ? '46.8%' : '46.6%',
      top: compact ? '47.1%' : '46.9%',
      backgroundColor: theme.colors.metallicAccent,
      borderWidth: 2,
      borderColor: theme.colors.editorialTerracotta,
      alignItems: 'center',
      justifyContent: 'center',
    },
    clockPinInner: {
      width: '52%',
      height: '52%',
      borderRadius: 999,
      backgroundColor: theme.colors.editorialPaper,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.white,
    },
    clockBack: {
      position: 'absolute',
      left: 0,
      top: 0,
      backfaceVisibility: 'hidden',
      overflow: 'hidden',
      backgroundColor: theme.colors.editorialTerracotta,
      borderColor: theme.colors.editorialTerracotta,
      borderWidth: StyleSheet.hairlineWidth,
      shadowColor: theme.colors.editorialShadowStrong,
      shadowOffset: { width: 4, height: 12 },
      shadowOpacity: 1,
      shadowRadius: 18,
      elevation: 7,
    },
    clockBackGlow: {
      position: 'absolute',
      width: compact ? 184 : 224,
      height: compact ? 184 : 224,
      borderRadius: 999,
      right: compact ? -46 : -54,
      top: compact ? 16 : 20,
      backgroundColor: theme.colors.white,
      opacity: 0.055,
    },
    clockBackOrbit: {
      position: 'absolute',
      width: compact ? 240 : 296,
      height: compact ? 240 : 296,
      borderRadius: 999,
      right: compact ? -69 : -84,
      top: compact ? -12 : -14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.white,
      opacity: 0.18,
    },
    clockBackContent: {
      position: 'absolute',
      left: compact ? 112 : 148,
      top: compact ? 32 : 40,
      width: compact ? 150 : 176,
      bottom: compact ? 30 : 36,
    },
    backEyebrow: {
      ...theme.typography.overline,
      color: theme.colors.textInverse,
      opacity: 0.78,
      fontSize: compact ? 7.5 : 8.5,
      lineHeight: compact ? 11 : 13,
      letterSpacing: compact ? 1.25 : 1.5,
    },
    backTitle: {
      fontFamily: theme.fonts.headingRegular,
      fontWeight: '400',
      color: theme.colors.textInverse,
      fontSize: compact ? 24 : 28,
      lineHeight: compact ? 25 : 29,
      letterSpacing: -0.35,
      marginTop: compact ? 5 : 7,
    },
    backBody: {
      ...theme.typography.caption,
      color: theme.colors.textInverse,
      opacity: 0.75,
      fontSize: compact ? 8.5 : 9.5,
      lineHeight: compact ? 11.5 : 13,
      marginTop: compact ? 4 : 6,
      maxWidth: compact ? 142 : 168,
    },
    journeyList: {
      gap: compact ? 4 : 5,
      marginTop: compact ? 8 : 10,
    },
    journeyItem: {
      width: '100%',
      minHeight: compact ? 32 : 36,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: compact ? 12 : 14,
      backgroundColor: theme.colors.white,
      paddingHorizontal: compact ? 6 : 8,
      paddingVertical: compact ? 3 : 4,
      shadowColor: theme.colors.editorialInk,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.14,
      shadowRadius: 7,
      elevation: 2,
    },
    journeyItemMiddle: { width: '92%' },
    journeyItemLast: { width: '82%' },
    journeyCopy: {
      flex: 1,
      marginLeft: compact ? 6 : 7,
    },
    journeyIcon: {
      width: compact ? 24 : 26,
      height: compact ? 24 : 26,
      borderRadius: 999,
      backgroundColor: theme.colors.editorialActiveRing,
      alignItems: 'center',
      justifyContent: 'center',
    },
    journeyLabel: {
      ...theme.typography.captionMedium,
      color: theme.colors.editorialInk,
      fontSize: compact ? 8.5 : 9.5,
      lineHeight: compact ? 10.5 : 12,
    },
    journeyDetail: {
      ...theme.typography.caption,
      color: theme.colors.editorialMuted,
      fontSize: compact ? 7 : 8,
      lineHeight: compact ? 9 : 10,
      marginTop: 1,
    },
    flipBackFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: compact ? 6 : 8,
    },
    flipBackHint: {
      ...theme.typography.caption,
      color: theme.colors.textInverse,
      opacity: 0.75,
      fontSize: compact ? 9 : 10,
    },
    tapCue: {
      position: 'absolute',
      bottom: compact ? 30 : 42,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tapCueText: { ...theme.typography.bodySmall, color: theme.colors.editorialMuted },
    dateRail: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: compact ? 7 : 10,
      paddingTop: compact ? 26 : 46,
      zIndex: 2,
    },
    dateLeaf: {
      width: leafWidth,
      height: leafHeight,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.editorialPaper,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'visible',
      shadowColor: theme.colors.editorialShadowStrong,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 1,
      shadowRadius: 14,
      elevation: 6,
    },
    dateLeafSelected: {
      height: leafHeight + (compact ? 14 : 20),
      backgroundColor: theme.colors.editorialTerracotta,
      borderColor: theme.colors.editorialTerracotta,
    },
    dateLeafStack: {
      position: 'absolute',
      left: 7,
      right: 7,
      bottom: -6,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.surfaceSecondary,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      zIndex: -1,
    },
    dateDay: {
      ...theme.typography.bodySmallMedium,
      color: theme.colors.editorialInk,
      letterSpacing: 1.3,
      fontSize: compact ? 12 : 14,
    },
    dateNumber: {
      fontFamily: theme.fonts.headingRegular,
      color: theme.colors.editorialInk,
      fontSize: compact ? 43 : 56,
      lineHeight: compact ? 49 : 62,
    },
    dateTextSelected: { color: theme.colors.textInverse },
    timeRail: {
      position: 'absolute',
      left: compact ? 10 : 18,
      right: compact ? 10 : 18,
      bottom: compact ? 12 : 18,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: compact ? 8 : 11,
      zIndex: 3,
    },
    timePill: {
      flex: 1,
      maxWidth: 104,
      minHeight: compact ? 42 : 48,
      borderRadius: 999,
      backgroundColor: theme.colors.editorialPaper,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.colors.editorialShadow,
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 1,
      shadowRadius: 8,
      elevation: 3,
    },
    timePillSelected: {
      backgroundColor: theme.colors.editorialTerracotta,
      borderColor: theme.colors.editorialTerracotta,
    },
    timeText: { ...theme.typography.bodySmallMedium, color: theme.colors.editorialInk },
    timeTextSelected: { color: theme.colors.textInverse },
    proofChip: {
      position: 'absolute',
      minHeight: compact ? 37 : 42,
      borderRadius: 999,
      backgroundColor: theme.colors.editorialPaper,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      paddingHorizontal: compact ? 10 : 13,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      zIndex: 5,
      shadowColor: theme.colors.editorialShadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 1,
      shadowRadius: 9,
      elevation: 4,
    },
    ratingChip: { left: 4, top: compact ? 26 : 44 },
    priceChip: { right: 0, top: compact ? 42 : 58 },
    todayChip: {
      left: '50%',
      width: compact ? 84 : 94,
      marginLeft: compact ? -42 : -47,
      bottom: compact ? 25 : 34,
    },
    proofText: { ...theme.typography.captionMedium, color: theme.colors.editorialInk },
    archRail: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: compact ? 56 : 78,
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'center',
      gap: discoveryGap,
      zIndex: 2,
    },
    archWrap: {
      width: sideDoorWidth,
      height: compact ? 142 : 170,
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    archWrapFeatured: {
      width: featuredDoorWidth,
      height: compact ? 214 : 258,
    },
    archWrapSelected: { transform: [{ translateY: -7 }] },
    arch: {
      width: '90%',
      height: '76%',
      borderTopLeftRadius: 999,
      borderTopRightRadius: 999,
      borderBottomLeftRadius: theme.borderRadius.sm,
      borderBottomRightRadius: theme.borderRadius.sm,
      backgroundColor: theme.colors.editorialPaper,
      borderWidth: 2,
      borderColor: theme.colors.metallicAccent,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      shadowColor: theme.colors.editorialShadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 1,
      shadowRadius: 14,
      elevation: 4,
    },
    archFeatured: { height: '82%' },
    archAura: {
      position: 'absolute',
      width: '96%',
      height: '78%',
      bottom: compact ? 13 : 16,
      borderTopLeftRadius: 999,
      borderTopRightRadius: 999,
      borderBottomLeftRadius: theme.borderRadius.sm,
      borderBottomRightRadius: theme.borderRadius.sm,
      backgroundColor: theme.colors.editorialPaper,
      shadowColor: theme.colors.editorialShadowStrong,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.72,
      shadowRadius: 15,
      elevation: 3,
    },
    archAuraFeatured: {
      width: '97%',
      height: '84%',
      bottom: compact ? 23 : 29,
      shadowRadius: 19,
    },
    archSurface: {
      ...StyleSheet.absoluteFillObject,
      borderTopLeftRadius: 999,
      borderTopRightRadius: 999,
      borderBottomLeftRadius: theme.borderRadius.sm,
      borderBottomRightRadius: theme.borderRadius.sm,
    },
    archInnerEdge: {
      position: 'absolute',
      left: 3,
      right: 3,
      top: 3,
      bottom: 3,
      borderTopLeftRadius: 999,
      borderTopRightRadius: 999,
      borderBottomLeftRadius: theme.borderRadius.sm,
      borderBottomRightRadius: theme.borderRadius.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.white,
      opacity: 0.72,
    },
    archMonogram: { width: compact ? 34 : 42, height: compact ? 46 : 56 },
    archSelected: {
      backgroundColor: theme.colors.editorialPaper,
      borderColor: theme.colors.metallicAccent,
    },
    sidePedestal: {
      width: '100%',
      alignItems: 'center',
      shadowColor: theme.colors.editorialInk,
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.14,
      shadowRadius: 6,
      elevation: 2,
    },
    archStepTop: {
      width: '92%',
      height: compact ? 7 : 8,
      borderRadius: theme.borderRadius.sm,
      backgroundColor: theme.colors.editorialPaper,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    archStepBottom: {
      width: '100%',
      height: compact ? 7 : 9,
      borderRadius: theme.borderRadius.sm,
      backgroundColor: theme.colors.surfaceSecondary,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    featuredPedestal: {
      width: Math.min(featuredDoorWidth + (compact ? 8 : 12), layout.contentWidth * 0.38),
      alignItems: 'center',
      justifyContent: 'flex-start',
      marginTop: compact ? -1 : -2,
      shadowColor: theme.colors.editorialInk,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 4,
    },
    pedestalTierTop: {
      width: '74%',
      height: compact ? 8 : 10,
      borderRadius: 999,
      backgroundColor: theme.colors.white,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      zIndex: 3,
    },
    pedestalTierMiddle: {
      width: '88%',
      height: compact ? 10 : 12,
      marginTop: compact ? -2 : -3,
      borderRadius: 999,
      backgroundColor: theme.colors.editorialPaper,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      shadowColor: theme.colors.editorialInk,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.13,
      shadowRadius: 4,
      zIndex: 2,
    },
    pedestalTierLower: {
      width: '96%',
      height: compact ? 14 : 17,
      marginTop: compact ? -3 : -4,
      borderRadius: 999,
      backgroundColor: theme.colors.white,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      shadowColor: theme.colors.editorialInk,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 5,
      zIndex: 1,
    },
    pedestalTierBase: {
      width: '100%',
      height: compact ? 18 : 22,
      marginTop: compact ? -3 : -4,
      borderRadius: 999,
      backgroundColor: theme.colors.surfaceSecondary,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      shadowColor: theme.colors.editorialInk,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 5,
      zIndex: 0,
    },
  });
};

const sceneStyles = StyleSheet.create({
  fill: { width: '100%', height: '100%' },
  pressFill: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
});
