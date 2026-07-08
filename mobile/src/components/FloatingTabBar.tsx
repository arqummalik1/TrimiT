/**
 * FloatingTabBar.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Custom floating bottom tab bar.
 *
 * Design:
 *  - All tabs render in natural navigator order (no center override).
 *  - The ACTIVE tab gets a small LinearGradient pill behind its icon that
 *    lifts slightly above the bar surface (LIFT_AMOUNT px negative margin).
 *  - Inactive tabs sit flat inside the glass bar, icon in textTertiary.
 *  - An animated dot slides under the active tab using Animated.timing.
 *  - The bar itself is a floating glass pill (BlurView + overlay).
 *
 * Usage (both navigators):
 *   tabBar={(props) => <FloatingTabBar {...props} />}
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useRef, useMemo } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { Theme, layout } from '../theme/tokens';

// ─── Constants ────────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_HORIZONTAL_MARGIN = layout.floatingChromeInset;
const BAR_WIDTH             = SCREEN_WIDTH - BAR_HORIZONTAL_MARGIN * 2;
const BAR_HEIGHT            = 64;
/** How many pixels the active tab icon lifts above the bar surface. */
const LIFT_AMOUNT           = 5;
/** Active tab scale — half the previous 1.08 bump for a subtler press feel. */
const ACTIVE_SCALE          = 1.04;
/** Size of the gradient circle behind the active icon. */
const ACTIVE_PILL_SIZE      = 36;
const DOT_SIZE              = 5;
const DOT_BOTTOM            = 6;
const ANIMATION_DURATION    = 260;

// ─── Icon map — route name → Ionicons icon names ──────────────────────────────

const ICON_MAP: Record<string, { inactive: string; active: string }> = {
  Dashboard: { inactive: 'grid-outline',      active: 'grid' },
  Bookings:  { inactive: 'calendar-outline',  active: 'calendar' },
  Services:  { inactive: 'pricetag-outline',  active: 'pricetag' },
  Settings:  { inactive: 'settings-outline',  active: 'settings' },
  Discover:  { inactive: 'search-outline',    active: 'search' },
  Profile:   { inactive: 'person-outline',    active: 'person' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();

  const totalTabs = state.routes.length;
  const slotWidth = BAR_WIDTH / totalTabs;

  // ── Animated values — one lift + scale per tab ────────────────────────────
  const liftAnims  = useRef(state.routes.map(() => new Animated.Value(0))).current;
  const scaleAnims = useRef(state.routes.map(() => new Animated.Value(1))).current;

  // ── Animated dot position ─────────────────────────────────────────────────
  const dotX = useRef(
    new Animated.Value(state.index * slotWidth + slotWidth / 2 - DOT_SIZE / 2)
  ).current;

  useEffect(() => {
    const idx = state.index;

    // Animate dot to active slot
    Animated.timing(dotX, {
      toValue: idx * slotWidth + slotWidth / 2 - DOT_SIZE / 2,
      duration: ANIMATION_DURATION,
      useNativeDriver: true,
    }).start();

    // Lift + scale active tab, lower inactive tabs
    const liftAnimations = liftAnims.map((anim, i) =>
      Animated.timing(anim, {
        toValue: i === idx ? LIFT_AMOUNT : 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      })
    );
    const scaleAnimations = scaleAnims.map((anim, i) =>
      Animated.timing(anim, {
        toValue: i === idx ? ACTIVE_SCALE : 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      })
    );

    Animated.parallel([...liftAnimations, ...scaleAnimations]).start();
  }, [state.index]);

  // ── Handle press ─────────────────────────────────────────────────────────
  const handlePress = (routeKey: string, routeName: string, isFocused: boolean) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: routeKey,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      // @ts-ignore
      navigation.navigate(routeName);
    }
  };

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.outerContainer,
        {
          bottom: Math.max(insets.bottom, BAR_HORIZONTAL_MARGIN),
          left:   BAR_HORIZONTAL_MARGIN,
          right:  BAR_HORIZONTAL_MARGIN,
          // extra top space for the lift overflow
          paddingTop: LIFT_AMOUNT + 4,
        },
      ]}
    >
      {/* Glass bar */}
      <View
        style={[
          styles.barShadowContainer,
          Platform.select({
            ios: {
              shadowColor: theme.colors.black,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.12,
              shadowRadius: 16,
            },
            android: { elevation: 12 },
          }),
        ]}
      >
        {/* ── Glass / Solid background layer (clipped to border radius) ── */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: theme.borderRadius.lg,
              overflow: 'hidden',
              height: BAR_HEIGHT,
              backgroundColor: theme.isDark ? 'transparent' : '#FFFFFF',
            },
          ]}
          pointerEvents="none"
        >
          {theme.isDark && (
            <>
              <BlurView
                tint="dark"
                intensity={90}
                style={StyleSheet.absoluteFill}
              />
              <View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: 'rgba(28, 28, 30, 0.45)',
                    borderRadius: theme.borderRadius.md,
                    borderWidth: 0.5,
                    borderColor: 'rgba(255,255,255,0.09)',
                  },
                ]}
              />
            </>
          )}
          {!theme.isDark && (
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: theme.borderRadius.md,
                  borderWidth: 0.5,
                  borderColor: 'rgba(0,0,0,0.04)',
                },
              ]}
            />
          )}
        </View>

        {/* ── Tab row — NOT clipped so lifted icons protrude above bar ── */}
        <View style={[styles.barOuter, { height: BAR_HEIGHT }]}>
          <View style={styles.tabRow}>
            {state.routes.map((route, index) => {
              const isFocused   = state.index === index;
              const descriptor  = descriptors[route.key];
              const options     = descriptor.options;
              const label       =
                typeof options.tabBarLabel === 'string'
                  ? options.tabBarLabel
                  : route.name;

              const icons     = ICON_MAP[route.name] ?? { inactive: 'ellipse-outline', active: 'ellipse' };
              const iconName  = isFocused ? icons.active : icons.inactive;
              const iconColor = isFocused ? theme.colors.white : theme.colors.textTertiary;
              const labelColor = isFocused ? theme.colors.primary : theme.colors.textTertiary;

              // Badge support (Owner Bookings tab)
              const badgeCount =
                typeof options.tabBarBadge === 'number' && options.tabBarBadge > 0
                  ? options.tabBarBadge
                  : null;

              return (
                <Animated.View
                  key={route.key}
                  style={[
                    styles.tabItem,
                    { width: slotWidth },
                    {
                      transform: [
                        { translateY: liftAnims[index].interpolate({
                          inputRange: [0, LIFT_AMOUNT],
                          outputRange: [0, -LIFT_AMOUNT],
                        })},
                        { scale: scaleAnims[index] },
                      ],
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.tabTouchable}
                    onPress={() => handlePress(route.key, route.name, isFocused)}
                    activeOpacity={0.75}
                  >
                    {/* Icon — gradient pill when active, plain when inactive */}
                    <View style={styles.iconWrapper}>
                      {isFocused ? (
                        <LinearGradient
                          colors={
                            theme.colors.gradientPrimary as unknown as [string, string, ...string[]]
                          }
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={[
                            styles.activePill,
                            Platform.select({
                              ios: {
                                shadowColor: theme.colors.primary,
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.38,
                                shadowRadius: 8,
                              },
                              android: { elevation: 6 },
                            }),
                          ]}
                        >
                          <Ionicons name={iconName as any} size={20} color={iconColor} />
                          {badgeCount !== null && (
                            <View
                              style={[styles.badge, { backgroundColor: theme.colors.error }]}
                            >
                              <Text style={styles.badgeText}>
                                {badgeCount > 99 ? '99+' : badgeCount}
                              </Text>
                            </View>
                          )}
                        </LinearGradient>
                      ) : (
                        <View style={styles.inactivePill}>
                          <Ionicons name={iconName as any} size={22} color={iconColor} />
                          {badgeCount !== null && (
                            <View
                              style={[styles.badge, { backgroundColor: theme.colors.error }]}
                            >
                              <Text style={styles.badgeText}>
                                {badgeCount > 99 ? '99+' : badgeCount}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>

                    {/* Label */}
                    <Text
                      style={[
                        styles.tabLabel,
                        {
                          color: labelColor,
                          fontFamily: theme.fonts.bodyMedium,
                          fontWeight: isFocused ? '600' : '400',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>

          {/* Animated indicator dot */}
          <Animated.View
            style={[
              styles.dot,
              { backgroundColor: theme.colors.primary },
              { transform: [{ translateX: dotX }] },
              { bottom: DOT_BOTTOM },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (theme: Theme) => StyleSheet.create({
  outerContainer: {
    position: 'absolute',
  },
  barShadowContainer: {
    borderRadius: theme.borderRadius.lg,
    height: BAR_HEIGHT,
  },
  barOuter: {
    width: '100%',
    // NO overflow:hidden — allows active pill to protrude above bar top edge
  },
  tabRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: 9, // Shifted down by 3 pixels from 12
  },
  tabItem: {
    alignItems: 'center',
  },
  tabTouchable: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 4,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePill: {
    width: ACTIVE_PILL_SIZE,
    height: ACTIVE_PILL_SIZE,
    borderRadius: ACTIVE_PILL_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactivePill: {
    width: ACTIVE_PILL_SIZE,
    height: ACTIVE_PILL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -6,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  dot: {
    position: 'absolute',
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
});

export default FloatingTabBar;
