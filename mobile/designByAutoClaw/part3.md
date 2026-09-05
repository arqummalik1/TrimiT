
---

# Chapter 7 — Customer Screens

All screens live under `mobile/src/screens/customer/`. Every screen: `SafeArea` top, `paddingBottom: layout.screenBottomInset` on the scroll view, horizontal gutter `layout.screenHPadding` (24). Replace the mockup data with your real hooks (TanStack Query) — the code below marks the seam with `// DATA:` comments.

## 7.1 `DiscoverScreen.tsx` — the Editorial home

Structure (top → bottom):

1. **Header row** — location eyebrow ("Koramangala, Bengaluru" with a gold pin), serif display "Discover", notification icon button.
2. **Search pill** (Editorial layout keeps the slim search bar).
3. **Hero card** — "The Bridal Edit" curated banner (vibe gold, editorial serif italic title, glass Explore chip). Rotate this content from a `featured` collection.
4. **Top rated near you** — `SectionHeader` + `Rail` of `SalonCard`s (snap scrolling).
5. **Browse by category** — `BentoCategories` 4-up.
6. **Salons near you** — `SectionHeader` + `SalonListItem` rows with hairlines + "Next" availability chips.

```tsx
// mobile/src/screens/customer/DiscoverScreen.tsx
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useType } from '../../theme/typography';
import { layout } from '../../theme/layout';
import { SectionHeader } from '../../components/SectionHeader';
import { Rail } from '../../components/Rail';
import { SalonCard, type SalonCardData } from '../../components/salon/SalonCard';
import { BentoCategories } from '../../components/home/BentoCategories';
import { SalonListItem, type SalonRowData } from '../../components/salon/SalonListItem';
import { VibeArt } from '../../components/vibe/VibeArt';

export function DiscoverScreen({ navigation }: any) {
  const { C } = useTheme();
  const t = useType();

  // DATA: replace with useQuery hooks — topRated, nearby, featured
  const topRated: SalonCardData[] = MOCK_TOP_RATED;
  const nearby: SalonRowData[] = MOCK_NEARBY;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: layout.screenBottomInset }}>
        {/* 1. Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <View style={styles.locRow}>
              <Ionicons name="location-sharp" size={13} color={C.accent} />
              <Text style={[styles.locText, { color: C.textMuted }]}>Koramangala, Bengaluru</Text>
            </View>
            <Text style={t.display}>Discover</Text>
          </View>
          <Pressable style={[styles.iconBtn, { backgroundColor: C.surface, borderColor: C.border }]} hitSlop={8}>
            <Ionicons name="notifications-outline" size={19} color={C.text} />
          </Pressable>
        </View>

        {/* 2. Search */}
        <Pressable style={[styles.search, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Ionicons name="search" size={19} color={C.textMuted} />
          <Text style={[styles.searchText, { color: C.textMuted }]}>Search salons, treatments, stylists…</Text>
        </Pressable>

        {/* 3. Hero — curated editorial banner */}
        <Pressable onPress={() => navigation.navigate('FeaturedCollection')}>
          <VibeArt vibe="gold" radius={26} style={styles.hero}>
            <View style={styles.heroOverlay}>
              <Text style={styles.heroKicker}>CURATED · BRIDAL SEASON '26</Text>
              <Text style={[t.displayItalic, styles.heroTitle]}>The Bridal Edit</Text>
              <View style={styles.heroChip}>
                <Text style={styles.heroChipText}>Explore</Text>
                <Ionicons name="arrow-forward" size={13} color="#FFFDF9" />
              </View>
            </View>
          </VibeArt>
        </Pressable>

        {/* 4. Top rated */}
        <SectionHeader title="Top rated near you" actionLabel="See all" onAction={() => {}} />
        <Rail data={topRated} renderItem={(s) => <SalonCard salon={s} onPress={() => navigation.navigate('SalonProfile', { id: s.id })} />} />

        {/* 5. Categories */}
        <SectionHeader title="Browse by category" />
        <BentoCategories onPress={(key) => navigation.navigate('Category', { key })} />

        {/* 6. Nearby list */}
        <SectionHeader title="Salons near you" actionLabel="Map view" onAction={() => {}} />
        <View>
          {nearby.map((s, i) => (
            <React.Fragment key={s.id}>
              {i > 0 ? <View style={[styles.hairline, { backgroundColor: C.border }]} /> : null}
              <SalonListItem salon={s} onPress={() => navigation.navigate('SalonProfile', { id: s.id })} />
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: layout.screenHPadding, paddingTop: 12, gap: 12 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  locText: { fontSize: 13, fontWeight: '700' },
  iconBtn: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: layout.screenHPadding, marginTop: 18, marginBottom: 18, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 17, borderWidth: 1 },
  searchText: { fontSize: 16 },
  hero: { marginHorizontal: layout.screenHPadding, aspectRatio: 16 / 10.5 },
  heroOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 22 },
  heroKicker: { color: '#E8C9A8', fontSize: 12, fontWeight: '800', letterSpacing: 1.4, marginBottom: 6 },
  heroTitle: { color: '#F7F1E9', marginBottom: 12 },
  heroChip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  heroChipText: { color: '#FFFDF9', fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  hairline: { height: StyleSheet.hairlineWidth, marginHorizontal: layout.screenHPadding },
});

// DATA: mocks — delete when wired to API
const MOCK_TOP_RATED: SalonCardData[] = [
  { id: '1', name: 'Luxe Hair Studio', rating: 4.8, distanceKm: 1.2, fromPrice: 299, vibe: 'gold', badge: 'Top rated' },
  { id: '2', name: 'Glow Aesthetics', rating: 4.9, distanceKm: 2.8, fromPrice: 449, vibe: 'blush', badge: "Editor's pick" },
  { id: '3', name: 'Verdure Spa & Salon', rating: 4.7, distanceKm: 3.1, fromPrice: 599, vibe: 'spa', badge: 'New' },
];
const MOCK_NEARBY: SalonRowData[] = [
  { id: '1', name: 'Luxe Hair Studio', rating: 4.8, bookingsCount: '1.2k', nextSlot: '4:30 PM', fromPrice: 399, vibe: 'gold' },
  { id: '2', name: 'Glow Aesthetics', rating: 4.9, bookingsCount: '2.4k', nextSlot: '5:00 PM', fromPrice: 449, vibe: 'blush' },
  { id: '3', name: 'The Barber Shop', rating: 4.6, bookingsCount: '860', nextSlot: '3:00 PM', fromPrice: 199, vibe: 'slate' },
];
```

**Search behavior:** keep the pill in Editorial. On focus, navigate to a dedicated `SearchScreen` (modal) with recents + popular chips — do not filter inline.

## 7.2 `SalonProfileScreen.tsx` — hero, tabs, multi-select services

Key pieces: photo/vibe hero with glass fabs, verified title row, trust chips, `SegmentedControl` (Services / Reviews / Photos), collapsible service groups, `ServiceRow` + `AddButton` multi-select, and the glass `SummaryBar` that slides up when `selected.size > 0`.

```tsx
// mobile/src/screens/customer/SalonProfileScreen.tsx
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useType } from '../../theme/typography';
import { layout } from '../../theme/layout';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { ServiceRow, type Service } from '../../components/services/ServiceRow';
import { SummaryBar } from '../../components/services/SummaryBar';
import { VibeArt } from '../../components/vibe/VibeArt';
import { GlassView } from '../../components/glass/GlassView';

const GROUPS = [
  { key: 'hair', title: 'Hair', from: 299, services: [...] as Service[] },
  { key: 'skin', title: 'Skin & Facials', from: 899, services: [] as Service[] },
  { key: 'nails', title: 'Nails', from: 499, services: [] as Service[] },
];

export function SalonProfileScreen({ navigation, route }: any) {
  const { C } = useTheme();
  const t = useType();
  const [tab, setTab] = useState<'Services' | 'Reviews' | 'Photos'>('Services');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ skin: true, nails: true });
  const [selected, setSelected] = useState<Map<string, Service>>(new Map([['colour', { id: 'colour', name: 'Hair Colouring', minutes: 90, price: 1299, mrp: 1799, popular: true }]]));

  const total = useMemo(() => [...selected.values()].reduce((s, x) => s + x.price, 0), [selected]);

  const toggle = (s: Service) => {
    setSelected((prev) => {
      const next = new Map(prev);
      next.has(s.id) ? next.delete(s.id) : next.set(s.id, s);
      return next;
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: layout.screenBottomInset + 20 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <VibeArt vibe="gold" photoUrl={undefined /* DATA: salon.coverUrl */} radius={0} style={styles.hero}>
          <View style={styles.scrim} />
          <View style={styles.fabs}>
            <GlassView radius={21} intensity={50} style={styles.fab}>
              <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
                <Ionicons name="arrow-back" size={19} color="#FFFDF9" />
              </Pressable>
            </GlassView>
            <GlassView radius={21} intensity={50} style={styles.fab}>
              <Pressable hitSlop={12}>
                <Ionicons name="heart-outline" size={19} color="#FFFDF9" />
              </Pressable>
            </GlassView>
          </View>
        </VibeArt>

        {/* Title + meta */}
        <View style={{ paddingHorizontal: layout.screenHPadding, paddingTop: 16 }}>
          <View style={styles.nameRow}>
            <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 30, color: C.text, letterSpacing: -0.4 }}>Luxe Hair Studio</Text>
            <Ionicons name="sparkles" size={17} color={C.accent} />
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="star" size={13} color={C.goldStar} />
            <Text style={[styles.meta, { color: C.text }]}>4.8 (1.2k)</Text>
            <Text style={[styles.meta, { color: C.textMuted }]}>· 1.2 km ·</Text>
            <View style={styles.openRow}>
              <View style={[styles.openDot, { backgroundColor: C.success }]} />
              <Text style={[styles.meta, { color: C.success, fontWeight: '800' }]}>Open till 8 PM</Text>
            </View>
          </View>
          <View style={styles.trustRow}>
            <TrustChip label="Pay at salon" />
            <TrustChip label="Free cancellation" />
          </View>
        </View>

        {/* Tabs */}
        <SegmentedControl options={['Services', 'Reviews', 'Photos'] as const} value={tab} onChange={setTab} style={{ marginHorizontal: layout.screenHPadding, marginTop: 18 }} />

        {tab === 'Services' ? (
          GROUPS.map((g) => (
            <View key={g.key} style={{ paddingHorizontal: layout.screenHPadding }}>
              <Pressable onPress={() => setCollapsed((p) => ({ ...p, [g.key]: !p[g.key] }))} style={styles.groupHeader}>
                <Text style={[styles.groupTitle, { color: C.text }]}>
                  {g.title} <Text style={{ color: C.textMuted, fontWeight: '600', fontSize: 13.5 }}>· from ₹{g.from}</Text>
                </Text>
                <Ionicons name="chevron-down" size={17} color={C.textMuted} style={collapsed[g.key] ? { transform: [{ rotate: -90 }] } : undefined} />
              </Pressable>
              {!collapsed[g.key] ? g.services.map((s) => (
                <ServiceRow key={s.id} service={s} selected={selected.has(s.id)} onToggle={() => toggle(s)} />
              )) : null}
            </View>
          ))
        ) : (
          <Text style={[styles.meta, { color: C.textMuted, padding: 24 }]}>Reviews and photos render here — same surface styles.</Text>
        )}
      </ScrollView>

      {/* Glass summary bar — slides up on selection */}
      <SummaryBar
        count={selected.size}
        total={total}
        visible={selected.size > 0}
        onContinue={() => navigation.navigate('TimeSelect', { salonId: route.params.id, services: [...selected.values()] })}
      />
    </SafeAreaView>
  );
}

function TrustChip({ label }: { label: string }) {
  const { C } = useTheme();
  return (
    <View style={[styles.trust, { backgroundColor: C.accentSoft }]}>
      <Ionicons name="checkmark" size={13} color={C.accent} />
      <Text style={[styles.trustText, { color: C.accent }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: 260 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,6,3,0.18)' },
  fabs: { position: 'absolute', top: 16, left: 18, right: 18, flexDirection: 'row', justifyContent: 'space-between' },
  fab: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 6, flexWrap: 'wrap' },
  meta: { fontSize: 14, fontWeight: '600' },
  openRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  openDot: { width: 7, height: 7, borderRadius: 4 },
  trustRow: { flexDirection: 'row', gap: 9, marginTop: 12 },
  trust: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999 },
  trustText: { fontSize: 12.5, fontWeight: '800' },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13 },
  groupTitle: { fontSize: 16.5, fontWeight: '800', letterSpacing: -0.2 },
});
```

**Multi-select state:** a `Map<id, Service>` in local state (or a small Zustand slice `bookingCart` if you want it to survive navigation). The `SummaryBar` computes count + total from it.

## 7.3 `TimeSelectScreen.tsx` — day strip, slots, hold timer

```tsx
// mobile/src/screens/customer/TimeSelectScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';
import { useType } from '../../theme/typography';
import { layout } from '../../theme/layout';
import { GlassView } from '../../components/glass/GlassView';
import { VibeArt } from '../../components/vibe/VibeArt';

const HOLD_SECONDS = 582; // 9:42

export function TimeSelectScreen({ navigation, route }: any) {
  const { C } = useTheme();
  const t = useType();
  const [dayIdx, setDayIdx] = useState(1);
  const [slot, setSlot] = useState<string | null>('1:00 PM');
  const [left, setLeft] = useState(HOLD_SECONDS);

  useEffect(() => {
    const id = setInterval(() => setLeft((s) => (s <= 0 ? HOLD_SECONDS : s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const urgency = left <= 60 ? 'crit' : left <= 120 ? 'warn' : 'ok';
  const time = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  const pct = Math.max(0.02, left / HOLD_SECONDS);

  // DATA: slotsByDay from API; each slot { time, available }
  const periods = MOCK_PERIODS;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 220 }}>
        {/* Header + step dots */}
        <View style={styles.header}>
          <Pressable style={[styles.back, { backgroundColor: C.surface, borderColor: C.border }]} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={19} color={C.text} />
          </Pressable>
          <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 26, color: C.text }}>Select time</Text>
          <View style={styles.dots}>
            <View style={[styles.dot, { backgroundColor: C.border }]} />
            <View style={[styles.dot, { backgroundColor: C.border }]} />
            <View style={[styles.dot, { backgroundColor: C.accent, width: 38 }]} />
          </View>
        </View>

        {/* Booking mini-card */}
        <View style={[styles.mini, { backgroundColor: C.surface, borderColor: C.border }]}>
          <VibeArt vibe="gold" radius={10} style={styles.miniThumb}><Text style={styles.miniLetter}>L</Text></VibeArt>
          <View style={{ flex: 1 }}>
            <Text style={[styles.miniName, { color: C.text }]}>Luxe Hair Studio</Text>
            <Text style={[styles.miniMeta, { color: C.textMuted }]}>1 service · 90 min</Text>
          </View>
          <Text style={[styles.miniPrice, { color: C.text }]}>₹1,299</Text>
        </View>

        {/* Day strip */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.days} contentContainerStyle={{ paddingHorizontal: layout.screenHPadding, gap: 9 }}>
          {MOCK_DAYS.map((d, i) => (
            <Pressable key={d.label} onPress={() => setDayIdx(i)}
              style={[styles.day, { backgroundColor: C.surface, borderColor: i === dayIdx ? C.accent : C.border }, i === dayIdx && { backgroundColor: C.accent }]}>
              <Text style={[styles.dayW, { color: i === dayIdx ? 'rgba(255,255,255,0.75)' : C.textMuted }]}>{d.w}</Text>
              <Text style={[styles.dayN, { color: i === dayIdx ? '#FFFFFF' : C.text }]}>{d.n}</Text>
              <View style={styles.dayDots}>
                {d.availability.map((a, j) => (
                  <View key={j} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: i === dayIdx ? '#FFFFFF' : a ? C.success : C.border }} />
                ))}
              </View>
            </Pressable>
          ))}
        </ScrollView>

        {/* Slots by period */}
        {periods.map((p) => (
          <View key={p.label} style={{ paddingHorizontal: layout.screenHPadding, marginTop: 14 }}>
            <Text style={[t.overline, { marginBottom: 10 }]}>{p.label}</Text>
            <View style={styles.slotGrid}>
              {p.slots.map((s) => {
                const sel = slot === s.time;
                return (
                  <Pressable key={s.time} disabled={!s.available} onPress={() => setSlot(s.time)}
                    style={[styles.slot, { backgroundColor: C.surface, borderColor: C.border, opacity: s.available ? 1 : 0.3 }, sel && { backgroundColor: C.accent, borderColor: C.accent, transform: [{ scale: 1.05 }] }]}>
                    {sel ? (
                      <View style={[styles.check, { backgroundColor: C.accent }]}>
                        <Ionicons name="checkmark" size={12} color={C.onAccent} />
                      </View>
                    ) : null}
                    <Text style={[styles.slotTime, { color: sel ? C.onAccent : C.text }]}>{s.time}</Text>
                    <Text style={[styles.slotAp, { color: sel ? 'rgba(255,255,255,0.7)' : C.textMuted }]}>{s.ap}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Glass confirm zone */}
      <GlassView radius={24} float intensity={65} style={styles.confirm}>
        <View style={styles.confirmTop}>
          <View style={[styles.pickChip, { backgroundColor: C.accentSoft }]}>
            <Ionicons name="calendar-outline" size={13} color={C.accent} />
            <Text style={[styles.pickText, { color: C.accent }]}>Tue, Sep 3 · {slot ?? '—'}</Text>
          </View>
          <View style={[styles.timerChip, { backgroundColor: urgency === 'ok' ? C.successSoft : urgency === 'warn' ? C.warningSoft : C.dangerSoft }]}>
            <Ionicons name="time-outline" size={14} color={urgency === 'ok' ? C.success : urgency === 'warn' ? C.warning : C.danger} />
            <Text style={[styles.timerText, { color: urgency === 'ok' ? C.success : urgency === 'warn' ? C.warning : C.danger }]}>{time}</Text>
          </View>
        </View>
        <View style={[styles.track, { backgroundColor: C.surface2 }]}>
          <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: urgency === 'ok' ? C.success : urgency === 'warn' ? C.warning : C.danger }]} />
        </View>
        <Pressable style={[styles.cta, { backgroundColor: C.accent }]}>
          <Text style={[styles.ctaText, { color: C.onAccent }]}>Confirm booking · ₹1,299</Text>
          <Ionicons name="arrow-forward" size={17} color={C.onAccent} />
        </Pressable>
      </GlassView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: layout.screenHPadding, paddingTop: 12 },
  back: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dots: { marginLeft: 'auto', flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 26, height: 4, borderRadius: 2 },
  mini: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: layout.screenHPadding, marginTop: 14, padding: 14, borderRadius: 16, borderWidth: 1 },
  miniThumb: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  miniLetter: { color: 'rgba(255,253,247,0.9)', fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 17 },
  miniName: { fontSize: 14.5, fontWeight: '800' },
  miniMeta: { fontSize: 12.5, fontWeight: '600', marginTop: 2 },
  miniPrice: { fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  days: { marginTop: 16 },
  day: { width: 64, paddingVertical: 12, borderRadius: 16, borderWidth: 1.5, alignItems: 'center' },
  dayW: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  dayN: { fontSize: 19, fontWeight: '800', marginTop: 3, letterSpacing: -0.3 },
  dayDots: { flexDirection: 'row', gap: 4, marginTop: 4 },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slot: { width: '31%', flexGrow: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 15, borderWidth: 1.5 },
  slotTime: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  slotAp: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 2 },
  check: { position: 'absolute', top: -8, right: -8, width: 23, height: 23, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
  confirm: { position: 'absolute', left: 18, right: 18, bottom: 22, padding: 16 },
  confirmTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 },
  pickChip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999 },
  pickText: { fontSize: 13, fontWeight: '800' },
  timerChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999 },
  timerText: { fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  track: { height: 5, borderRadius: 3, overflow: 'hidden', marginBottom: 13 },
  fill: { height: '100%', borderRadius: 3 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 16, borderRadius: 18 },
  ctaText: { fontSize: 16.5, fontWeight: '800' },
});

// DATA: mocks
const MOCK_DAYS = [
  { label: 'd0', w: 'Mon', n: 2, availability: [true, true, true] },
  { label: 'd1', w: 'Tue', n: 3, availability: [true, true, true] },
  { label: 'd2', w: 'Wed', n: 4, availability: [true, false, true] },
  { label: 'd3', w: 'Thu', n: 5, availability: [true, true, true] },
  { label: 'd4', w: 'Fri', n: 6, availability: [true, true, true] },
  { label: 'd5', w: 'Sat', n: 7, availability: [true, false, true] },
  { label: 'd6', w: 'Sun', n: 8, availability: [false, false, false] },
];
const MOCK_PERIODS = [
  { label: 'Morning', slots: [ { time: '9:00', ap: 'AM', available: false }, { time: '9:30', ap: 'AM', available: true }, { time: '10:00', ap: 'AM', available: true }, { time: '10:30', ap: 'AM', available: true }, { time: '11:00', ap: 'AM', available: true }, { time: '11:30', ap: 'AM', available: false } ] },
  { label: 'Afternoon', slots: [ { time: '12:00', ap: 'PM', available: true }, { time: '12:30', ap: 'PM', available: true }, { time: '1:00', ap: 'PM', available: true }, { time: '1:30', ap: 'PM', available: false }, { time: '2:00', ap: 'PM', available: true }, { time: '2:30', ap: 'PM', available: true } ] },
  { label: 'Evening', slots: [ { time: '5:00', ap: 'PM', available: true }, { time: '5:30', ap: 'PM', available: true }, { time: '6:00', ap: 'PM', available: true }, { time: '6:30', ap: 'PM', available: true } ] },
];
```

**Hold semantics:** the timer starts when the user lands here (i.e., a hold was created server-side). On expiry, re-fetch slots and clear the selection. Colors: `>2 min` green, `≤2 min` amber, `≤1 min` red — the chip and progress bar switch together.

## 7.4 `CheckoutScreen.tsx` — summary, payment methods, UPI sheet

```tsx
// mobile/src/screens/customer/CheckoutScreen.tsx
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';
import { useType } from '../../theme/typography';
import { layout } from '../../theme/layout';
import { VibeArt } from '../../components/vibe/VibeArt';

type PayMethod = 'salon' | 'upi' | 'card';

export function CheckoutScreen({ navigation }: any) {
  const { C } = useTheme();
  const t = useType();
  const [method, setMethod] = useState<PayMethod>('salon');
  const [upiSheet, setUpiSheet] = useState(false);
  const sheetY = useSharedValue(400);
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sheetY.value }] }));

  const openSheet = () => { setUpiSheet(true); sheetY.value = withTiming(0, { duration: 350 }); };
  const closeSheet = () => { sheetY.value = withTiming(400, { duration: 250 }, () => { runOnJS(setUpiSheet)(false); }); };

  // DATA: totals from cart store
  const subtotal = 1299, discount = 250, gst = 188.82, total = subtotal - discount + gst;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: layout.screenBottomInset }}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={[styles.back, { backgroundColor: C.surface, borderColor: C.border }]} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={19} color={C.text} />
          </Pressable>
          <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 26, color: C.text }}>Checkout</Text>
        </View>

        {/* Booking summary */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.cardTitle, { color: C.text }]}>Booking summary</Text>
          <View style={styles.salonRow}>
            <VibeArt vibe="gold" radius={10} style={styles.salonThumb}><Text style={styles.thumbLetter}>L</Text></VibeArt>
            <View>
              <Text style={[styles.salonName, { color: C.text }]}>Luxe Hair Studio</Text>
              <Text style={[styles.salonMeta, { color: C.textMuted }]}>Koramangala · 1.2 km</Text>
            </View>
          </View>
          <PriceRow k="Hair Colouring" v="₹1,299" border />
          <PriceRow k="Subtotal" v={`₹${subtotal.toLocaleString('en-IN')}`} muted border />
          <PriceRow k="TRIMIT50 discount" v={`-₹${discount}`} ok border />
          <PriceRow k="GST (18%)" v={`₹${gst.toFixed(2)}`} muted border />
          <View style={[styles.totalRow, { borderTopColor: C.border }]}>
            <Text style={[styles.totalK, { color: C.textMuted }]}>Total</Text>
            <Text style={[styles.totalV, { color: C.text }]}>₹{total.toFixed(2)}</Text>
          </View>
        </View>

        {/* Payment methods */}
        <Text style={[t.overline, { paddingHorizontal: layout.screenHPadding, marginTop: 18, marginBottom: 8 }]}>PAYMENT METHOD</Text>
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border, padding: 0, overflow: 'hidden' }]}>
          <PayOption radio title="Pay at salon" sub="No advance payment needed" selected={method === 'salon'} onPress={() => setMethod('salon')} />
          <PayOption radio title="UPI" sub="GPay, PhonePe, Paytm" selected={method === 'upi'} onPress={() => { setMethod('upi'); openSheet(); }} border />
          <PayOption radio title="Card" sub="Credit or debit card" selected={method === 'card'} onPress={() => setMethod('card')} border />
        </View>

        <View style={styles.trust}>
          <TrustChip label="Free cancellation" />
          <TrustChip label="Secure payment" />
        </View>
      </ScrollView>

      {/* UPI bottom sheet (glass over scrim) */}
      <Modal transparent visible={upiSheet} animationType="none" onRequestClose={closeSheet}>
        <View style={{ flex: 1, backgroundColor: C.overlayScrim, justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={closeSheet} />
          <Animated.View style={[sheetStyle, { backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 34 }]}>
            <View style={styles.sheetHead}>
              <Text style={[styles.sheetTitle, { color: C.text }]}>Pay with UPI</Text>
              <Pressable onPress={closeSheet} hitSlop={10}><Ionicons name="close" size={20} color={C.textMuted} /></Pressable>
            </View>
            <View style={styles.upiGrid}>
              {[['G', 'Google Pay', '#4285F4'], ['P', 'PhonePe', '#5B5FC7'], ['₹', 'Paytm', '#09C269']].map(([letter, name, color]) => (
                <Pressable key={name} style={[styles.upiTile, { borderColor: C.border }]}>
                  <View style={[styles.upiIcon, { backgroundColor: C.surface2 }]}><Text style={{ color, fontSize: 18, fontWeight: '800' }}>{letter}</Text></View>
                  <Text style={[styles.upiName, { color: C.text }]}>{name}</Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function PriceRow({ k, v, muted, ok, border }: { k: string; v: string; muted?: boolean; ok?: boolean; border?: boolean }) {
  const { C } = useTheme();
  return (
    <View style={[styles.priceRow, border ? { borderTopWidth: 1, borderTopColor: C.border } : null]}>
      <Text style={[styles.priceK, { color: ok ? C.success : C.textMuted }]}>{k}</Text>
      <Text style={[styles.priceV, { color: ok ? C.success : C.text }]}>{v}</Text>
    </View>
  );
}

function PayOption({ radio, title, sub, selected, onPress, border }: any) {
  const { C } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.payRow, border ? { borderTopWidth: 1, borderTopColor: C.border } : null]}>
      <View style={[styles.radioOuter, { borderColor: selected ? C.accent : C.border }]}>
        {selected ? <View style={[styles.radioInner, { backgroundColor: C.accent }]} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.payTitle, { color: C.text }]}>{title}</Text>
        <Text style={[styles.paySub, { color: C.textMuted }]}>{sub}</Text>
      </View>
    </Pressable>
  );
}

function TrustChip({ label }: { label: string }) {
  const { C } = useTheme();
  return (
    <View style={[styles.trust, { backgroundColor: C.accentSoft }]}>
      <Ionicons name="checkmark" size={13} color={C.accent} />
      <Text style={[styles.trustText, { color: C.accent }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: layout.screenHPadding, paddingTop: 12 },
  back: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  card: { marginHorizontal: layout.screenHPadding, marginTop: 14, padding: 16, borderRadius: 20, borderWidth: 1 },
  cardTitle: { fontSize: 15, fontWeight: '800', marginBottom: 12 },
  salonRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  salonThumb: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  thumbLetter: { color: 'rgba(255,253,247,0.9)', fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 16 },
  salonName: { fontSize: 14, fontWeight: '700' },
  salonMeta: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  priceK: { fontSize: 13.5, fontWeight: '600' },
  priceV: { fontSize: 13.5, fontWeight: '700', fontVariant: ['tabular-nums'] },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1.5, marginTop: 4, paddingTop: 12 },
  totalK: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  totalV: { fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 15 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  payTitle: { fontSize: 15, fontWeight: '700' },
  paySub: { fontSize: 12.5, fontWeight: '500', marginTop: 1 },
  trust: { flexDirection: 'row', gap: 9, paddingHorizontal: layout.screenHPadding, marginTop: 16 },
  trustChipX: {},
  trust: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999, alignSelf: 'flex-start' },
  trustText: { fontSize: 12.5, fontWeight: '800', color: '#000' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle: { fontSize: 17, fontWeight: '800' },
  upiGrid: { flexDirection: 'row', gap: 12 },
  upiTile: { flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: 14, borderWidth: 1, gap: 8 },
  upiIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  upiName: { fontSize: 12.5, fontWeight: '700' },
});
```

**Agent cleanup note:** `TrustChip` styles above were inlined twice for brevity — extract to the shared chip used in SalonProfile. Remove duplicate keys when integrating.

## 7.5 `BookingSuccessScreen.tsx` — ring ceremony + ticket

```tsx
// mobile/src/screens/customer/BookingSuccessScreen.tsx
import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';
import { useType } from '../../theme/typography';
import { layout } from '../../theme/layout';
import { VibeArt } from '../../components/vibe/VibeArt';

const R = 60;
const CIRC = 2 * Math.PI * R; // ≈ 377

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function BookingSuccessScreen({ navigation }: any) {
  const { C } = useTheme();
  const t = useType();
  const dash = useSharedValue(CIRC);
  const checkScale = useSharedValue(0);

  useEffect(() => {
    dash.value = withTiming(0, { duration: 1400 });
    checkScale.value = withDelay(950, withSpring(1, { damping: 12, stiffness: 180 }));
  }, []);

  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: dash.value }));
  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: checkScale.value }] }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <View style={styles.hero}>
          <View style={{ width: 126, height: 126 }}>
            <Svg width={126} height={126} style={{ transform: [{ rotate: '-90deg' }] }}>
              <Circle cx={63} cy={63} r={R} stroke={C.surface2} strokeWidth={5} fill="none" />
              <AnimatedCircle cx={63} cy={63} r={R} stroke={C.accent} strokeWidth={5} fill="none" strokeLinecap="round" strokeDasharray={CIRC} animatedProps={ringProps} />
            </Svg>
            <View style={styles.checkWrap}>
              <Animated.View style={[styles.check, { backgroundColor: C.accent }, checkStyle]}>
                <Ionicons name="checkmark" size={27} color={C.onAccent} />
              </Animated.View>
            </View>
          </View>
          <Text style={[t.displayItalic, { fontSize: 34, color: C.text, marginTop: 18 }]}>You're booked!</Text>
          <Text style={[styles.sub, { color: C.textMuted }]}>Confirmation sent to +91 98••• ••210</Text>
        </View>

        {/* Ticket */}
        <View style={[styles.ticket, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={[styles.ticketHead, { borderBottomColor: C.border }]}>
            <VibeArt vibe="gold" radius={13} style={styles.ticketThumb}><Text style={styles.thumbLetter}>L</Text></VibeArt>
            <View style={{ flex: 1 }}>
              <Text style={[styles.ticketName, { color: C.text }]}>Luxe Hair Studio</Text>
              <Text style={[styles.ticketMeta, { color: C.textMuted }]}>Koramangala · 1.2 km</Text>
            </View>
            <View style={styles.verified}>
              <Ionicons name="sparkles" size={12} color={C.success} />
              <Text style={[styles.verifiedText, { color: C.success }]}>Verified</Text>
            </View>
          </View>
          <TicketRow k="Service" v="Hair Colouring" />
          <TicketRow k="When" v="Tue, Sep 3 · 1:00 PM" border />
          <TicketRow k="Duration" v="90 min" border />
          <View style={[styles.totalBand, { backgroundColor: C.accentSoft, borderTopColor: C.border }]}>
            <Text style={[styles.totalK, { color: C.textMuted }]}>TOTAL · PAY AT SALON</Text>
            <Text style={[styles.totalV, { color: C.accent }]}>₹1,237.82</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable style={[styles.primary, { backgroundColor: C.accent }]}>
            <Ionicons name="calendar-outline" size={17} color={C.onAccent} />
            <Text style={[styles.primaryText, { color: C.onAccent }]}>Add to calendar</Text>
          </Pressable>
          <Pressable style={[styles.ghost, { borderColor: C.border, backgroundColor: C.surface }]}>
            <Ionicons name="navigate-outline" size={17} color={C.text} />
            <Text style={[styles.ghostText, { color: C.text }]}>Directions</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function TicketRow({ k, v, border }: { k: string; v: string; border?: boolean }) {
  const { C } = useTheme();
  return (
    <View style={[styles.row, border ? { borderTopWidth: 1, borderTopColor: C.border } : null]}>
      <Text style={[styles.k, { color: C.textMuted }]}>{k}</Text>
      <Text style={[styles.v, { color: C.text }]}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingTop: 38, paddingHorizontal: 24 },
  checkWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  check: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  sub: { fontSize: 14.5, fontWeight: '600', marginTop: 7, textAlign: 'center' },
  ticket: { marginHorizontal: 24, marginTop: 22, borderRadius: 22, borderWidth: 1, overflow: 'hidden' },
  ticketHead: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderBottomWidth: 1.5, borderStyle: 'dashed' },
  ticketThumb: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  thumbLetter: { color: 'rgba(255,253,247,0.9)', fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 18 },
  ticketName: { fontSize: 16.5, fontWeight: '800' },
  ticketMeta: { fontSize: 12.5, fontWeight: '600', marginTop: 2 },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedText: { fontSize: 11.5, fontWeight: '800' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 18 },
  k: { fontSize: 14.5, fontWeight: '600' },
  v: { fontSize: 14.5, fontWeight: '700', textAlign: 'right' },
  totalBand: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderTopWidth: 1.5 },
  totalK: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  totalV: { fontSize: 21, fontWeight: '800', fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', gap: 11, marginHorizontal: 24, marginTop: 18 },
  primary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 17 },
  primaryText: { fontSize: 14.5, fontWeight: '800' },
  ghost: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 17, borderWidth: 1.5 },
  ghostText: { fontSize: 14.5, fontWeight: '700' },
});
```

## 7.6 `MyBookingsScreen.tsx` — upcoming / past

```tsx
// mobile/src/screens/customer/MyBookingsScreen.tsx
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useType } from '../../theme/typography';
import { layout } from '../../theme/layout';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { StatusChip } from '../../components/ui/StatusChip';
import { VibeArt } from '../../components/vibe/VibeArt';

export function MyBookingsScreen({ navigation }: any) {
  const { C } = useTheme();
  const t = useType();
  const [tab, setTab] = useState<'Upcoming' | 'Past'>('Upcoming');

  // DATA: useQuery(['bookings']) split by status
  const upcoming = MOCK_UPCOMING;
  const past = MOCK_PAST;
  const list = tab === 'Upcoming' ? upcoming : past;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: layout.screenBottomInset }}>
        <View style={{ paddingHorizontal: layout.screenHPadding, paddingTop: 12 }}>
          <Text style={t.display}>My Bookings</Text>
          <Text style={[t.sub, { marginTop: 4 }]}>Your appointments, all in one place</Text>
        </View>
        <SegmentedControl options={['Upcoming', 'Past'] as const} value={tab} onChange={setTab} style={{ marginHorizontal: layout.screenHPadding, marginTop: 14 }} />
        <View style={{ marginTop: 16, gap: 12 }}>
          {list.map((b) => <BookingCard key={b.id} booking={b} />)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function BookingCard({ booking: b }: any) {
  const { C } = useTheme();
  const past = b.status === 'completed' || b.status === 'cancelled';
  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }, past && { opacity: b.status === 'cancelled' ? 0.5 : 0.85 }]}>
      <VibeArt vibe={b.vibe} radius={0} style={styles.thumb} />
      <View style={styles.body}>
        <Text style={[styles.name, { color: C.text }]}>{b.salon}</Text>
        <Text style={[styles.service, { color: C.textMuted }]}>{b.service}</Text>
        <Text style={[styles.date, { color: C.text }]}>{b.when}</Text>
        <View style={styles.statusRow}>
          <StatusChip status={b.status} />
          <Text style={[styles.price, { color: C.textMuted }]}>· ₹{b.price} · {b.pay}</Text>
        </View>
        <View style={styles.actions}>
          {past && b.status === 'completed' ? (
            <>
              <MiniButton primary label="Rebook" />
              <MiniButton label="★ Rate" />
            </>
          ) : !past ? (
            <>
              <MiniButton label="Reschedule" />
              <MiniButton label="Cancel" />
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function MiniButton({ label, primary }: { label: string; primary?: boolean }) {
  const { C } = useTheme();
  return (
    <Pressable style={[styles.miniBtn, primary ? { backgroundColor: C.accent } : { borderWidth: 1, borderColor: C.border, backgroundColor: C.surface }]}>
      <Text style={{ fontSize: 12.5, fontWeight: '800', color: primary ? C.onAccent : C.text }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: layout.screenHPadding, borderRadius: 20, borderWidth: 1, flexDirection: 'row', overflow: 'hidden' },
  thumb: { width: 88 },
  body: { flex: 1, padding: 14, gap: 3 },
  name: { fontSize: 16.5, fontWeight: '700', letterSpacing: -0.2 },
  service: { fontSize: 13.5, fontWeight: '500' },
  date: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3, marginTop: 3 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4 },
  price: { fontSize: 12.5, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  miniBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
});

// DATA: mocks
const MOCK_UPCOMING = [
  { id: '1', salon: 'Luxe Hair Studio', service: 'Hair Colouring · 90 min', when: 'Tue, Sep 3 · 1:00 PM', status: 'confirmed', price: '1,237.82', pay: 'pay at salon', vibe: 'gold' },
  { id: '2', salon: 'Glow Aesthetics', service: 'Hydra Facial · 60 min', when: 'Fri, Sep 5 · 11:00 AM', status: 'confirmed', price: '899', pay: 'UPI paid', vibe: 'blush' },
];
const MOCK_PAST = [
  { id: '3', salon: 'The Barber Shop', service: 'Beard Trim · 20 min', when: 'Mon, Aug 28 · 6:00 PM', status: 'completed', price: '199', pay: 'Cash', vibe: 'slate' },
  { id: '4', salon: 'Verdure Spa', service: 'Deep Tissue Massage', when: 'Fri, Aug 25', status: 'cancelled', price: '1,299', pay: 'refunded', vibe: 'spa' },
];
```

## 7.7 `ProfileScreen.tsx` — iOS-style grouped settings

```tsx
// mobile/src/screens/customer/ProfileScreen.tsx
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useType } from '../../theme/typography';
import { layout } from '../../theme/layout';
import { Toggle } from '../../components/ui/Toggle';
import { GlassView } from '../../components/glass/GlassView';

export function ProfileScreen({ navigation }: any) {
  const { C, mode, setMode } = useTheme();
  const t = useType();
  const [notif, setNotif] = React.useState(true);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: layout.screenBottomInset }}>
        {/* Identity */}
        <View style={styles.identity}>
          <View style={styles.avatar}><Text style={styles.avatarText}>A</Text></View>
          <Text style={[styles.name, { color: C.text }]}>Arqum Malik</Text>
          <Text style={[t.sub]}>+91 98••• ••210</Text>
          <Pressable style={[styles.edit, { borderColor: C.border }]}><Text style={[styles.editText, { color: C.text }]}>Edit</Text></Pressable>
        </View>

        <Group header="OFFERS">
          <Row icon="pricetag-outline" title="My offers & coupons" sub="TRIMIT50 · 3 available" chevron />
        </Group>
        <Group header="PREFERENCES">
          <Row icon="compass-outline" title="Discovery settings" sub="Radius 5 km" chevron />
          <Row icon="notifications-outline" title="Notifications" border
               right={<Toggle on={notif} onChange={setNotif} />} />
          <Row icon="contrast-outline" title="Appearance" sub={mode === 'dark' ? 'Dark' : 'Light'} border
               right={<View style={{ flexDirection: 'row', gap: 8 }}>
                 <MiniMode label="Light" active={mode === 'light'} onPress={() => setMode('light')} />
                 <MiniMode label="Dark" active={mode === 'dark'} onPress={() => setMode('dark')} />
               </View>} />
        </Group>
        <Group header="FOR SALON TEAMS">
          <Row icon="storefront-outline" title="List or manage my salon" sub="Create an owner workspace" chevron onPress={() => navigation.navigate('OwnerTabs')} />
          <Row icon="people-outline" title="Employee access" sub="Join with an invitation" chevron border />
        </Group>
        <Group header="LEGAL & SUPPORT">
          <Row title="Payments help" chevron />
          <Row title="Privacy policy" chevron border />
          <Row title="Terms of service" chevron border />
          <Row title="Contact us" chevron border />
        </Group>
        <Group>
          <Row title="Sign out" danger />
        </Group>
      </ScrollView>
    </SafeAreaView>
  );
}

function Group({ header, children }: { header?: string; children: React.ReactNode }) {
  const { C } = useTheme();
  return (
    <View style={{ paddingHorizontal: layout.screenHPadding, marginTop: 20 }}>
      {header ? <Text style={[styles.groupHeader, { color: C.textMuted }]}>{header}</Text> : null}
      <View style={[styles.group, { backgroundColor: C.surface, borderColor: C.border }]}>{children}</View>
    </View>
  );
}

function Row({ icon, title, sub, chevron, right, danger, border, onPress }: any) {
  const { C } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.row, border ? { borderTopWidth: 1, borderTopColor: C.border } : null]}>
      {icon ? (
        <View style={[styles.iconChip, { backgroundColor: C.surface2 }]}><Ionicons name={icon} size={17} color={C.accent} /></View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: danger ? C.danger : C.text }]}>{title}</Text>
        {sub ? <Text style={[styles.rowSub, { color: C.textMuted }]}>{sub}</Text> : null}
      </View>
      {right ?? (chevron ? <Ionicons name="chevron-forward" size={16} color={C.textMuted} /> : null)}
    </Pressable>
  );
}

function MiniMode({ label, active, onPress }: any) {
  const { C } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.miniMode, { backgroundColor: active ? C.accent : C.surface2 }]}>
      <Text style={{ fontSize: 11.5, fontWeight: '800', color: active ? C.onAccent : C.textMuted }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  identity: { alignItems: 'center', paddingTop: 24, paddingBottom: 6 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#17130E', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  avatarText: { color: '#E3C77F', fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 30 },
  name: { fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
  edit: { marginTop: 9, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1.5 },
  editText: { fontSize: 12.5, fontWeight: '700' },
  groupHeader: { fontSize: 12.5, fontWeight: '800', letterSpacing: 0.8, marginBottom: 8, paddingHorizontal: 6 },
  group: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, paddingHorizontal: 18 },
  iconChip: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 16.5, fontWeight: '600', letterSpacing: -0.2 },
  rowSub: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  miniMode: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
});
```
