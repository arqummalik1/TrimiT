
---

# Chapter 5 — Liquid Glass Dock (FloatingTabBar)

This replaces the existing `mobile/src/components/FloatingTabBar.tsx` in full. Same props contract as the current bar so both `CustomerTabs.tsx` and `OwnerTabs.tsx` keep working — only the visual internals change.

**Anatomy (matches the mockup exactly):**

```
┌──────────────────────────────────────────────┐
│  GlassView (radius 38, float shadow)         │
│  ┌─────────┬─────────┬─────────┐             │
│  │  ╭───╮  │         │         │  ← pill:    │
│  │  │ © │  │         │         │    accent   │
│  │  │icon│ │  icon   │  icon   │    @14%     │
│  │  │Home│ │ Bookings│ Profile │             │
│  │  ╰───╯  │         │         │             │
│  └─────────┴─────────┴─────────┘             │
└──────────────────────────────────────────────┘
```

- The **pill** is an absolutely-positioned rounded view, width = `100%/tabs.length`, that springs horizontally under the active tab (`withSpring`, slight overshoot for the liquid feel).
- Active tab: icon+label in `accent`; inactive in `textMuted`.
- Tap feedback: `expo-haptics` light impact (optional but recommended).
- The bar sits `absolute` at `bottom: 26`, `left/right: 18` — it floats over content; screens add `paddingBottom: layout.screenBottomInset` to their scroll views.

## 5.1 `mobile/src/components/FloatingTabBar.tsx` — full replacement

```tsx
// mobile/src/components/FloatingTabBar.tsx
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  interpolateColor,
  useDerivedValue,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { GlassView } from './glass/GlassView';
import { useTheme } from '../theme/ThemeProvider';
import { layout } from '../theme/layout';

export type DockTab = {
  key: string;
  label: string;
  /** Render the icon with the given color so active/inactive tint just works. */
  icon: (color: string, size: number) => React.ReactNode;
};

type Props = {
  tabs: DockTab[];
  activeIndex: number;
  onTabPress: (index: number) => void;
  style?: ViewStyle;
};

const SPRING = { damping: 16, stiffness: 200, mass: 0.9 };

export function FloatingTabBar({ tabs, activeIndex, onTabPress, style }: Props) {
  const { C } = useTheme();
  const n = tabs.length;
  const progress = useDerivedValue(() => withSpring(activeIndex, SPRING), [activeIndex]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: `${progress.value * 100}%` }],
  }));

  const handlePress = useCallback(
    (i: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      onTabPress(i);
    },
    [onTabPress],
  );

  return (
    <GlassView
      radius={layout.dockHeight / 2}
      float
      intensity={60}
      style={[
        {
          position: 'absolute',
          bottom: layout.dockBottom,
          left: 18,
          right: 18,
          height: layout.dockHeight,
        },
        style,
      ]}
    >
      <View style={StyleSheet.absoluteFill}>
        {/* sliding pill — one cell wide, springs under the active tab */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: 9,
              bottom: 9,
              left: 9,
              width: `${100 / n}%`,
              borderRadius: layout.dockHeight / 2 - 9,
              backgroundColor: `${C.accent}24`, // accent @ ~14%
            },
            pillStyle,
          ]}
        />
        {/* tab cells */}
        <View style={[StyleSheet.absoluteFill, { flexDirection: 'row' }]}>
          {tabs.map((tab, i) => (
            <DockTabItem
              key={tab.key}
              tab={tab}
              index={i}
              activeIndex={activeIndex}
              progress={progress}
              accent={C.accent}
              muted={C.textMuted}
              onPress={() => handlePress(i)}
            />
          ))}
        </View>
      </View>
    </GlassView>
  );
}

type ItemProps = {
  tab: DockTab;
  index: number;
  activeIndex: number;
  progress: Animated.SharedValue<number>;
  accent: string;
  muted: string;
  onPress: () => void;
};

function DockTabItem({ tab, index, progress, accent, muted, onPress }: ItemProps) {
  // Interpolate icon/label color smoothly between muted → accent as the pill passes.
  const color = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [index - 1, index, index + 1], [muted, accent, muted]),
  }));

  return (
    <Pressable onPress={onPress} style={styles.cell} accessibilityRole="tab">
      <Animated.View style={[styles.inner, { opacity: 1 }]}>
        <Animated.View style={color}>
          {tab.icon(muted, 27) /* icon wrapper — see note below */}
        </Animated.View>
        <Animated.Text style={[styles.label, color]} numberOfLines={1}>
          {tab.label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  inner: { alignItems: 'center', gap: 4 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
});
```

**Icon tinting note (for the agent):** the simplest robust approach is to let each tab's `icon` closure read the theme and render the correct tint directly:

```tsx
const tabs: DockTab[] = [
  {
    key: 'discover',
    label: 'Home',
    icon: (color, size) => <Ionicons name="home-outline" size={size} color={color} />,
  },
  {
    key: 'bookings',
    label: 'Bookings',
    icon: (color, size) => <Ionicons name="calendar-outline" size={size} color={color} />,
  },
  {
    key: 'profile',
    label: 'Profile',
    icon: (color, size) => <Ionicons name="person-outline" size={size} color={color} />,
  },
];
```

…and inside `DockTabItem`, render `tab.icon(isActive ? accent : muted, 27)` driven by `activeIndex === index` (a plain boolean re-render is fine; the color *animation* on the label is the polish). Keep the implementation pragmatic — the pill spring + label color animation are what create the liquid feel.

## 5.2 Wiring into the existing navigators

`CustomerTabs.tsx` — replace the current bar usage; nothing else changes:

```tsx
function CustomerTabs() {
  // ...existing <Tab.Navigator> or custom state — keep your navigation structure.
  // If you use react-navigation bottom tabs, set tabBar={(props) => <FloatingTabBar {...props} />}
  // with the same tabs array as before; the component maps index → route jump.
}
```

Acceptance: dock floats over content, pill springs with overshoot, works identically on `OwnerTabs` with 4 tabs, identical in dark mode (GlassView handles tint).

---

# Chapter 6 — Shared Components

All files go under `mobile/src/components/`. These are the building blocks every screen composes — build them first, screens become assembly work.

## 6.1 `SectionHeader.tsx` — serif section titles

```tsx
// mobile/src/components/SectionHeader.tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useType } from '../theme/typography';
import { layout } from '../theme/layout';

export function SectionHeader({ title, actionLabel, onAction }: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { C } = useTheme();
  const t = useType();
  return (
    <View style={styles.wrap}>
      <Text style={t.sectionSerif}>{title}</Text>
      {actionLabel ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={[styles.action, { color: C.accent }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenHPadding,
    marginTop: 26,
    marginBottom: 12,
  },
  action: { fontSize: 14, fontWeight: '700' },
});
```

## 6.2 `SalonCard.tsx` — the rail card (Top rated near you)

```tsx
// mobile/src/components/salon/SalonCard.tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VibeArt, type Vibe } from '../vibe/VibeArt';
import { useTheme } from '../../theme/ThemeProvider';
import { layout } from '../../theme/layout';

export type SalonCardData = {
  id: string;
  name: string;
  rating: number;
  distanceKm: number;
  fromPrice: number;
  vibe: Vibe;
  photoUrl?: string;
  badge?: string; // "Top rated" | "Editor's pick" | "New"
};

export function SalonCard({ salon, onPress }: { salon: SalonCardData; onPress: () => void }) {
  const { C } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: C.surface, borderColor: C.border, width: layout.railCardWidth }, pressed && { transform: [{ scale: 0.965 }] }]}
    >
      <VibeArt vibe={salon.vibe} photoUrl={salon.photoUrl} radius={0} style={styles.image}>
        {salon.badge ? (
          <View style={[styles.badge, { backgroundColor: 'rgba(0,0,0,0.42)' }]}>
            <Text style={styles.badgeText}>{salon.badge}</Text>
          </View>
        ) : null}
      </VibeArt>
      <View style={styles.body}>
        <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>{salon.name}</Text>
        <View style={styles.meta}>
          <View style={styles.rating}>
            <Ionicons name="star" size={12} color={C.goldStar} />
            <Text style={[styles.ratingText, { color: C.text }]}>{salon.rating.toFixed(1)}</Text>
          </View>
          <Text style={[styles.dot, { color: C.textMuted }]}>·</Text>
          <Text style={[styles.metaText, { color: C.textMuted }]}>{salon.distanceKm.toFixed(1)} km</Text>
        </View>
        <Text style={[styles.price, { color: C.accent }]}>
          From <Text style={{ color: C.textMuted, fontWeight: '600' }}>₹{salon.fromPrice}</Text>
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  image: { aspectRatio: 16 / 9 },
  badge: {
    position: 'absolute', top: 10, left: 10,
    paddingHorizontal: 11, paddingVertical: 4, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  badgeText: { color: '#FFFDF9', fontSize: 10.5, fontWeight: '800', letterSpacing: 0.7, textTransform: 'uppercase' },
  body: { padding: 14 },
  name: { fontSize: 16.5, fontWeight: '700', letterSpacing: -0.2, marginBottom: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 13, fontWeight: '700' },
  dot: { fontSize: 13 },
  metaText: { fontSize: 13, fontWeight: '600' },
  price: { marginTop: 7, fontSize: 14.5, fontWeight: '700' },
});
```

## 6.3 `Rail.tsx` — horizontal snap row

```tsx
// mobile/src/components/Rail.tsx
import React from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { layout } from '../theme/layout';

export function Rail<T extends { id: string }>({ data, renderItem }: {
  data: T[];
  renderItem: (item: T) => React.ReactNode;
}) {
  return (
    <FlatList
      horizontal
      data={data}
      keyExtractor={(i) => i.id}
      showsHorizontalScrollIndicator={false}
      snapToInterval={layout.railCardWidth + layout.railGap}
      decelerationRate="fast"
      contentContainerStyle={styles.content}
      renderItem={({ item }) => renderItem(item)}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: layout.screenHPadding, gap: layout.railGap },
});
```

## 6.4 `BentoCategories.tsx` — Browse by category (4-up grid)

```tsx
// mobile/src/components/home/BentoCategories.tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { layout } from '../../theme/layout';

const CATEGORIES = [
  { key: 'hair', label: 'Hair', icon: 'cut-outline' },
  { key: 'skin', label: 'Skin', icon: 'water-outline' },
  { key: 'nails', label: 'Nails', icon: 'grid-outline' },
  { key: 'spa', label: 'Spa', icon: 'flower-outline' },
] as const;

export function BentoCategories({ onPress }: { onPress: (key: string) => void }) {
  const { C } = useTheme();
  return (
    <View style={styles.grid}>
      {CATEGORIES.map((c) => (
        <Pressable
          key={c.key}
          onPress={() => onPress(c.key)}
          style={({ pressed }) => [
            styles.tile,
            { backgroundColor: C.surface, borderColor: C.border },
            pressed && { transform: [{ scale: 0.92 }] },
          ]}
        >
          <Ionicons name={c.icon} size={27} color={C.accent} />
          <Text style={[styles.label, { color: C.text }]}>{c.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: layout.screenHPadding,
    gap: 12,
  },
  tile: {
    flexBasis: '23%', flexGrow: 1,
    aspectRatio: 1 / 1.06,
    borderRadius: 18, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', gap: 9,
  },
  label: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
});
```

## 6.5 `SalonListItem.tsx` — the list row (Salons near you)

Row = vibe thumb + name/meta + right column (`Next slot` chip + from-price).

```tsx
// mobile/src/components/salon/SalonListItem.tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VibeArt, type Vibe } from '../vibe/VibeArt';
import { useTheme } from '../../theme/ThemeProvider';
import { layout } from '../../theme/layout';

export type SalonRowData = {
  id: string; name: string; rating: number;
  bookingsCount?: string; distanceKm?: number;
  nextSlot?: string; fromPrice: number; vibe: Vibe; photoUrl?: string;
};

export function SalonListItem({ salon, onPress }: { salon: SalonRowData; onPress: () => void }) {
  const { C } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.row, { paddingHorizontal: layout.screenHPadding }]}>
      <VibeArt vibe={salon.vibe} photoUrl={salon.photoUrl} radius={17} style={styles.thumb}>
        <Text style={styles.thumbLetter}>{salon.name[0]}</Text>
      </VibeArt>
      <View style={styles.mid}>
        <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>{salon.name}</Text>
        <View style={styles.meta}>
          <Ionicons name="star" size={12} color={C.goldStar} />
          <Text style={[styles.metaText, { color: C.text }]}>{salon.rating.toFixed(1)}</Text>
          {salon.distanceKm ? (
            <Text style={[styles.metaText, { color: C.textMuted }]}>· {salon.distanceKm.toFixed(1)} km</Text>
          ) : salon.bookingsCount ? (
            <Text style={[styles.metaText, { color: C.textMuted }]}>· {salon.bookingsCount} bookings</Text>
          ) : null}
        </View>
      </View>
      <View style={styles.right}>
        {salon.nextSlot ? (
          <View style={[styles.chip, { backgroundColor: C.successSoft }]}>
            <Ionicons name="time-outline" size={11} color={C.success} />
            <Text style={[styles.chipText, { color: C.success }]}>Next {salon.nextSlot}</Text>
          </View>
        ) : null}
        <Text style={[styles.price, { color: C.text }]}>
          <Text style={{ color: C.textMuted, fontWeight: '600' }}>from </Text>₹{salon.fromPrice}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15 },
  thumb: { width: 84, height: 84, alignItems: 'center', justifyContent: 'center' },
  thumbLetter: { color: 'rgba(255,253,247,0.9)', fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 27 },
  mid: { flex: 1, minWidth: 0 },
  name: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2, marginBottom: 3 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, fontWeight: '600' },
  right: { alignItems: 'flex-end', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 4, borderRadius: 999 },
  chipText: { fontSize: 12, fontWeight: '800' },
  price: { fontSize: 14, fontWeight: '700' },
});
```

Insert hairline dividers between rows: `<View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.border, marginHorizontal: 24 }} />`.

## 6.6 `AddButton.tsx` — the morphing + / ✓ service button

The most-loved micro-interaction from the mockup. `+` rotates out, a check rotates in, with a spring overshoot.

```tsx
// mobile/src/components/services/AddButton.tsx
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, interpolate } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeProvider';

export function AddButton({ selected, onPress }: { selected: boolean; onPress: () => void }) {
  const { C } = useTheme();
  const sel = useSharedValue(selected ? 1 : 0);

  React.useEffect(() => {
    sel.value = withSpring(selected ? 1 : 0, { damping: 14, stiffness: 220 });
    if (selected) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, [selected]);

  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(sel.value, [0, 1], [C.surface, C.accent]),
    borderColor: interpolateColor(sel.value, [0, 1], [C.border, C.accent]),
  }));
  const plusStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(sel.value, [0, 1], [0, 90])}deg` }, { scale: interpolate(sel.value, [0, 1], [1, 0.4]) }],
    opacity: interpolate(sel.value, [0, 1], [1, 0]),
  }));
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(sel.value, [0, 1], [-90, 0])}deg` }, { scale: interpolate(sel.value, [0, 1], [0.4, 1]) }],
    opacity: sel.value,
  }));

  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Animated.View style={[styles.circle, bgStyle]}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, plusStyle]}>
          <Ionicons name="add" size={18} color={C.text} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, checkStyle]}>
          <Ionicons name="checkmark" size={18} color={C.onAccent} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5 },
  center: { alignItems: 'center', justifyContent: 'center' },
});
```

## 6.7 `ServiceRow.tsx` — a selectable service line

```tsx
// mobile/src/components/services/ServiceRow.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AddButton } from './AddButton';
import { useTheme } from '../../theme/ThemeProvider';

export type Service = {
  id: string; name: string; minutes: number; price: number; mrp?: number; popular?: boolean;
};

export function ServiceRow({ service, selected, onToggle }: {
  service: Service; selected: boolean; onToggle: () => void;
}) {
  const { C } = useTheme();
  return (
    <View style={[styles.row, { borderTopColor: C.border }]}>
      <View style={styles.left}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: C.text }]}>{service.name}</Text>
          {service.popular ? (
            <View style={[styles.pop, { backgroundColor: 'rgba(232,163,61,0.14)' }]}>
              <Text style={[styles.popText, { color: C.isDark ? '#E8C077' : '#9A6A15' }]}>Popular</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.meta}>
          <Ionicons name="time-outline" size={13} color={C.textMuted} />
          <Text style={[styles.metaText, { color: C.textMuted }]}>{service.minutes} min</Text>
        </View>
      </View>
      <View style={styles.right}>
        <Text style={[styles.price, { color: C.text }]}>
          ₹{service.price.toLocaleString('en-IN')}
          {service.mrp ? <Text style={styles.mrp}>  ₹{service.mrp.toLocaleString('en-IN')}</Text> : null}
        </Text>
        <AddButton selected={selected} onPress={onToggle} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, borderTopWidth: 1 },
  left: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 4 },
  name: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  pop: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  popText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13.5, fontWeight: '600' },
  right: { alignItems: 'flex-end', gap: 8 },
  price: { fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },
  mrp: { fontSize: 13, color: '#7A7163', fontWeight: '600', textDecorationLine: 'line-through' },
});
```

## 6.8 `SummaryBar.tsx` — the glass checkout pill (service selection)

```tsx
// mobile/src/components/services/SummaryBar.tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { GlassView } from '../glass/GlassView';
import { useTheme } from '../../theme/ThemeProvider';

export function SummaryBar({ count, total, visible, onContinue }: {
  count: number; total: number; visible: boolean; onContinue: () => void;
}) {
  const { C } = useTheme();
  const y = useSharedValue(150);
  React.useEffect(() => {
    y.value = withSpring(visible ? 0 : 150, { damping: 18, stiffness: 170 });
  }, [visible]);

  const barStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <Animated.View pointerEvents={visible ? 'auto' : 'none'} style={[styles.wrap, barStyle]}>
      <GlassView radius={22} float intensity={65} style={styles.glass}>
        <View style={styles.info}>
          <Text style={[styles.count, { color: C.text }]}>
            <Text style={{ color: C.accent }}>{count}</Text> service{count === 1 ? '' : 's'} selected
          </Text>
          <Text style={[styles.total, { color: C.textMuted }]}>
            ₹{total.toLocaleString('en-IN')} · pay at salon
          </Text>
        </View>
        <Pressable onPress={onContinue} style={({ pressed }) => [styles.cta, { backgroundColor: C.accent }, pressed && { transform: [{ scale: 0.94 }] }]}>
          <Text style={[styles.ctaText, { color: C.onAccent }]}>Continue</Text>
          <Ionicons name="arrow-forward" size={16} color={C.onAccent} />
        </Pressable>
      </GlassView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 18, right: 18, bottom: 26 },
  glass: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 13, paddingLeft: 18 },
  info: { flex: 1 },
  count: { fontSize: 14.5, fontWeight: '800', letterSpacing: -0.2 },
  total: { fontSize: 12.5, fontWeight: '600', marginTop: 2 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 16 },
  ctaText: { fontSize: 14.5, fontWeight: '800' },
});
```

## 6.9 `SegmentedControl.tsx` — sliding-pill tabs (Services/Reviews/Photos, Upcoming/Past, period picker)

```tsx
// mobile/src/components/ui/SegmentedControl.tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';

export function SegmentedControl<T extends string>({ options, value, onChange, style }: {
  options: readonly T[]; value: T; onChange: (v: T) => void; style?: ViewStyle;
}) {
  const { C } = useTheme();
  const n = options.length;
  const idx = Math.max(0, options.indexOf(value));

  return (
    <View style={[styles.track, { backgroundColor: C.surface2 }, style]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pill,
          { width: `${100 / n}%` },
          useAnimatedStyle(() => ({ transform: [{ translateX: `${idx * 100}%` }] })),
        ]}
      />
      {options.map((opt) => (
        <Pressable key={opt} onPress={() => onChange(opt)} style={styles.cell}>
          <Text style={[styles.label, { color: opt === value ? C.text : C.textMuted }, opt === value && { fontWeight: '700' }]}>
            {opt}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: 15, padding: 5 },
  pill: { position: 'absolute', top: 5, bottom: 5, left: 5, borderRadius: 11, backgroundColor: '#fff' /* replaced at call site via theme — see note */ },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  label: { fontSize: 14.5, fontWeight: '600' },
});
```

**Agent note:** the pill's white background must follow the theme — set `backgroundColor: C.surface` via a small `useAnimatedStyle` or pass it as a style prop; do not leave the literal `#fff`.

## 6.10 `Toggle.tsx` — iOS-style switch

```tsx
// mobile/src/components/ui/Toggle.tsx
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';

export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  const { C } = useTheme();
  const pos = useSharedValue(on ? 1 : 0);
  React.useEffect(() => { pos.value = withSpring(on ? 1 : 0, { damping: 18, stiffness: 220 }); }, [on]);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: pos.value * 19 }] }));
  return (
    <Pressable onPress={() => onChange(!on)} hitSlop={8}>
      <View style={[styles.track, { backgroundColor: on ? C.success : C.border }]}>
        <Animated.View style={[styles.knob, knob]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: 50, height: 31, borderRadius: 999, padding: 2.5, justifyContent: 'center' },
  knob: { width: 26, height: 26, borderRadius: 999, backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
});
```

## 6.11 `StatusChip.tsx` — booking status

```tsx
// mobile/src/components/ui/StatusChip.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

export type Status = 'confirmed' | 'pending' | 'completed' | 'cancelled';

export function StatusChip({ status }: { status: Status }) {
  const { C } = useTheme();
  const map = {
    confirmed: { label: 'Confirmed', fg: C.success, bg: C.successSoft },
    pending:   { label: 'Pending',   fg: C.warning, bg: C.warningSoft },
    completed: { label: 'Completed', fg: C.textMuted, bg: C.surface2 },
    cancelled: { label: 'Cancelled', fg: C.danger, bg: C.dangerSoft },
  } as const;
  const s = map[status];
  return (
    <View style={[styles.chip, { backgroundColor: s.bg }]}>
      <Text style={[styles.text, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  text: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.3 },
});
```
