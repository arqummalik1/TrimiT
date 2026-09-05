
---

# Chapter 8 — Owner Screens

Same design system, same components — data and layouts change. All files under `mobile/src/screens/owner/`.

## 8.1 `DashboardScreen.tsx`

```tsx
// mobile/src/screens/owner/DashboardScreen.tsx
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useType } from '../../theme/typography';
import { layout } from '../../theme/layout';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { StatusChip } from '../../components/ui/StatusChip';

const TREND = [38, 52, 44, 66, 58, 74, 90]; // % heights, Mon→Sun

export function DashboardScreen({ navigation }: any) {
  const { C } = useTheme();
  const t = useType();
  const [period, setPeriod] = useState<'Today' | '7d' | '30d' | 'All'>('Today');
  const [pending, setPending] = useState<'pending' | 'accepted' | 'declined'>('pending');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: layout.screenBottomInset }}>
        {/* Greeting */}
        <View style={{ paddingHorizontal: layout.screenHPadding, paddingTop: 14 }}>
          <Text style={[styles.greeting, { color: C.text }]}>Good morning, Arqum</Text>
          <View style={styles.salonRow}>
            <Text style={[t.sub]}>Luxe Hair Studio ·</Text>
            <View style={[styles.openDot, { backgroundColor: C.success }]} />
            <Text style={[styles.open, { color: C.success }]}>Open</Text>
          </View>
        </View>

        {/* Trial banner */}
        <View style={[styles.trial, { backgroundColor: C.accentSoft }]}>
          <Ionicons name="shield-checkmark-outline" size={18} color={C.accent} />
          <Text style={[styles.trialText, { color: C.text }]}>Free trial · 12 days left</Text>
          <Pressable><Text style={[styles.trialCta, { color: C.accent }]}>Subscribe ₹499/mo →</Text></Pressable>
        </View>

        {/* Period */}
        <SegmentedControl options={['Today', '7d', '30d', 'All'] as const} value={period} onChange={setPeriod}
          style={{ marginHorizontal: layout.screenHPadding, marginTop: 16 }} />

        {/* KPI grid */}
        <View style={styles.kpiGrid}>
          <KPI label="EARNINGS" value="₹4,250" accent />
          <KPI label="BOOKINGS" value="18" />
          <KPI label="TODAY'S" value="6" />
          <KPI label="PENDING" value="3" danger />
        </View>

        {/* Needs action */}
        <Text style={[t.sectionSerif, { paddingHorizontal: layout.screenHPadding, marginTop: 26, marginBottom: 12 }]}>Needs action</Text>
        <View style={[styles.pendingCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={styles.pendingHead}>
            <View style={[styles.avatar, { backgroundColor: '#8A6A38' }]}><Text style={styles.avatarText}>P</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.pName, { color: C.text }]}>Priya Sharma</Text>
              <Text style={[styles.pMeta, { color: C.textMuted }]}>Haircut + Colour · Today 4:30 PM</Text>
            </View>
            <Text style={[styles.pPrice, { color: C.text }]}>₹1,798</Text>
          </View>
          <View style={styles.pendingActions}>
            <StatusChip status={pending === 'accepted' ? 'confirmed' : pending === 'declined' ? 'cancelled' : 'pending'} />
            {pending === 'pending' ? (
              <View style={{ flexDirection: 'row', gap: 8, marginLeft: 'auto' }}>
                <Pressable style={[styles.decline, { borderColor: C.border, backgroundColor: C.surface }]}
                  onPress={() => setPending('declined')}>
                  <Text style={[styles.declineText, { color: C.text }]}>Decline</Text>
                </Pressable>
                <Pressable style={[styles.accept, { backgroundColor: C.accent }]} onPress={() => setPending('accepted')}>
                  <Text style={[styles.acceptText, { color: C.onAccent }]}>Accept</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>

        {/* Trend */}
        <Text style={[t.sectionSerif, { paddingHorizontal: layout.screenHPadding, marginTop: 26, marginBottom: 14 }]}>7-day trend</Text>
        <View style={styles.chart}>
          {TREND.map((h, i) => (
            <View key={i} style={[styles.bar, { height: `${h}%`, backgroundColor: C.accent, opacity: 0.55 + (h / 100) * 0.45 }]} />
          ))}
        </View>

        {/* Popular services */}
        <Text style={[t.overline, { paddingHorizontal: layout.screenHPadding, marginTop: 26, marginBottom: 10 }]}>POPULAR SERVICES</Text>
        <View style={{ paddingHorizontal: layout.screenHPadding, gap: 8 }}>
          <PopService label="Haircut" pct={42} />
          <PopService label="Colour" pct={28} />
          <PopService label="Facial" pct={18} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function KPI({ label, value, accent, danger }: { label: string; value: string; accent?: boolean; danger?: boolean }) {
  const { C } = useTheme();
  return (
    <View style={[styles.kpi, { backgroundColor: C.surface, borderColor: C.border }]}>
      <Text style={[styles.kpiValue, { color: accent ? C.accent : danger ? C.danger : C.text }]}>{value}</Text>
      <Text style={[styles.kpiLabel, { color: danger ? C.danger : C.textMuted }]}>{label}</Text>
    </View>
  );
}

function PopService({ label, pct }: { label: string; pct: number }) {
  const { C } = useTheme();
  return (
    <View style={styles.popRow}>
      <Text style={[styles.popLabel, { color: C.text }]}>{label}</Text>
      <View style={[styles.popTrack, { backgroundColor: C.surface2 }]}>
        <View style={[styles.popFill, { width: `${pct}%`, backgroundColor: C.accent }]} />
      </View>
      <Text style={[styles.popPct, { color: C.textMuted }]}>{pct}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  greeting: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  salonRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  openDot: { width: 6, height: 6, borderRadius: 3 },
  open: { fontSize: 13, fontWeight: '700' },
  trial: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: layout.screenHPadding, marginTop: 16, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16 },
  trialText: { flex: 1, fontSize: 13.5, fontWeight: '700' },
  trialCta: { fontSize: 12.5, fontWeight: '800' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11, paddingHorizontal: layout.screenHPadding, marginTop: 14 },
  kpi: { flexBasis: '47%', flexGrow: 1, borderRadius: 18, borderWidth: 1, padding: 16, gap: 4 },
  kpiValue: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  kpiLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6 },
  pendingCard: { marginHorizontal: layout.screenHPadding, borderRadius: 18, borderWidth: 1, padding: 14 },
  pendingHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  pName: { fontSize: 14.5, fontWeight: '800' },
  pMeta: { fontSize: 12.5, marginTop: 1 },
  pPrice: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  pendingActions: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  decline: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  declineText: { fontSize: 12.5, fontWeight: '700' },
  accept: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10 },
  acceptText: { fontSize: 12.5, fontWeight: '800' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 66, paddingHorizontal: layout.screenHPadding },
  bar: { flex: 1, borderRadius: 6 },
  popRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  popLabel: { width: 84, fontSize: 13, fontWeight: '700' },
  popTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  popFill: { height: '100%', borderRadius: 4 },
  popPct: { width: 36, fontSize: 12, fontWeight: '600', textAlign: 'right' },
});
```

**Accept/Decline:** the sample uses local state; wire to your mutation with optimistic update + rollback on error. Keep the chip transition (Pending → Confirmed/Cancelled).

## 8.2 `ManageBookingsScreen.tsx`

Same skeleton as My Bookings but owner-side: segmented `Pending (1) / Today / Upcoming`, pending cards carry Accept/Decline, today's rows show time + service + `StatusChip` + payment method (Cash/UPI) on the right. Reuse `StatusChip`, `MiniButton`, card styles from Chapter 7.6 with `styles.date` replaced by a time column.

```tsx
// Row pattern for Today list:
<View style={[styles.todayRow, { backgroundColor: C.surface, borderColor: C.border }]}>
  <Text style={[styles.time, { color: C.textMuted }]}>10:00 AM</Text>
  <View style={{ flex: 1 }}>
    <Text style={[styles.name, { color: C.text }]}>Ravi K</Text>
    <Text style={[styles.svc, { color: C.textMuted }]}>Haircut · ₹499</Text>
  </View>
  <StatusChip status="confirmed" />
  <Text style={[styles.pay, { color: C.textMuted }]}>Cash</Text>
</View>
```

## 8.3 `ManageServicesScreen.tsx`

Collapsible groups (same pattern as salon profile) + a `Toggle` per service row (active/inactive) + dashed "Add service" row:

```tsx
<Pressable style={[styles.addRow, { borderColor: C.border }]}>
  <Ionicons name="add" size={17} color={C.textMuted} />
  <Text style={[styles.addText, { color: C.textMuted }]}>Add service</Text>
</Pressable>
// styles.addRow: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 16, padding: 16,
//   flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginHorizontal: 24, marginTop: 16 }
```

Header link: `Manage categories →` in `C.accent`, 13px/700, top-right.

## 8.4 `OwnerSettingsScreen.tsx`

1. **Salon status row** — "Luxe Hair Studio" + `Toggle` (Open/Closed) + colored status text.
2. **Pro Plan card** (`accentSoft` bg, `accent`-tinted border): `Active` chip + "Pro Plan", renews date, ghost "Manage plan" button, hairline divider, then the **Pro AI upsell row** (shield icon + "Pro AI — Smart insights & pricing" + small accent "Try ₹499/mo" button).
3. Groups: **SALON** (Manage salon / Staff management · 3 staff / Promotions · 1 active), **PAYMENTS** (UPI settings / Bank details / Payment history), then **Sign out** (danger) — all via the shared `Group`/`Row` components from Chapter 7.7.

```tsx
// Pro AI upsell row (inside the Pro Plan card)
<View style={[styles.aiRow, { borderTopColor: C.border }]}>
  <Ionicons name="shield-checkmark-outline" size={17} color={C.accent} />
  <Text style={[styles.aiText, { color: C.text }]}>Pro AI — Smart insights & pricing</Text>
  <Pressable style={[styles.aiBtn, { backgroundColor: C.accent }]}>
    <Text style={[styles.aiBtnText, { color: C.onAccent }]}>Try ₹499/mo</Text>
  </Pressable>
</View>
```

---

# Chapter 9 — Auth: Login (Editorial Calm)

One canonical login screen, works in both modes (colors come from tokens). OTP-first flow — this is purely a visual restyle of your existing `Login.tsx`; keep `pendingAuthIntent` logic untouched.

```tsx
// mobile/src/screens/auth/LoginScreen.tsx
import React from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useType } from '../../theme/typography';
import { layout } from '../../theme/layout';

const APP_ICON = require('../../assets/tmark.png'); // your gold-T mark on transparent bg

export function LoginScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const t = useType();
  const [email, setEmail] = useState('');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          {/* Brand */}
          <Image source={APP_ICON} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.wordmark, { color: C.text }]}>TRIMIT</Text>
          <Text style={[styles.tagline, { color: C.textMuted }]}>PRECISION GROOMING</Text>

          {/* Editorial headline */}
          <Text style={[t.displayItalic, styles.headline, { color: C.text }]}>Precision grooming,{'\n'}booked.</Text>
          <Text style={[styles.lede, { color: C.textMuted }]}>Your appointment awaits — sign in to confirm.</Text>

          {/* Form */}
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email address"
            placeholderTextColor={C.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text }]}
          />
          <Pressable style={[styles.cta, { backgroundColor: C.accent }]}>
            <Text style={[styles.ctaText, { color: C.onAccent }]}>Continue with email code</Text>
          </Pressable>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.divLine, { backgroundColor: C.border }]} />
            <Text style={[styles.divText, { color: C.textMuted }]}>or</Text>
            <View style={[styles.divLine, { backgroundColor: C.border }]} />
          </View>

          {/* Social */}
          <Pressable style={[styles.apple, { backgroundColor: isDark ? '#FFFFFF' : '#000000' }]}>
            <Ionicons name="logo-apple" size={19} color={isDark ? '#000000' : '#FFFFFF'} />
            <Text style={[styles.appleText, { color: isDark ? '#000000' : '#FFFFFF' }]}>Sign in with Apple</Text>
          </Pressable>
          <Pressable style={[styles.google, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[styles.googleG, { color: '#4285F4' }]}>G</Text>
            <Text style={[styles.googleText, { color: C.text }]}>Sign in with Google</Text>
          </Pressable>

          <Text style={[styles.terms, { color: C.textMuted }]}>
            By continuing, you agree to our <Text style={{ color: C.text, fontWeight: '600' }}>Terms</Text> & <Text style={{ color: C.text, fontWeight: '600' }}>Privacy Policy</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: 28, paddingTop: 40, paddingBottom: 40 },
  logo: { width: 72, height: 72, borderRadius: 18, marginBottom: 16 },
  wordmark: { fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 24, letterSpacing: 1.6 },
  tagline: { fontSize: 10.5, fontWeight: '800', letterSpacing: 2, marginTop: 3 },
  headline: { fontSize: 30, textAlign: 'center', marginTop: 30, lineHeight: 36 },
  lede: { fontSize: 14, fontWeight: '500', textAlign: 'center', marginTop: 8, maxWidth: 300, lineHeight: 20 },
  input: { alignSelf: 'stretch', marginTop: 28, paddingHorizontal: 18, paddingVertical: 15, borderRadius: 15, borderWidth: 1.5, fontSize: 16 },
  cta: { alignSelf: 'stretch', marginTop: 12, paddingVertical: 15, borderRadius: 15, alignItems: 'center' },
  ctaText: { fontSize: 15.5, fontWeight: '800' },
  divider: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', gap: 12, marginVertical: 18 },
  divLine: { flex: 1, height: 1 },
  divText: { fontSize: 12.5, fontWeight: '600' },
  apple: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 15 },
  appleText: { fontSize: 14.5, fontWeight: '700' },
  google: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 14, borderRadius: 15, borderWidth: 1.5, marginTop: 9 },
  googleG: { fontSize: 18, fontWeight: '800' },
  googleText: { fontSize: 14.5, fontWeight: '700' },
  terms: { fontSize: 11.5, textAlign: 'center', lineHeight: 17, marginTop: 22, maxWidth: 320 },
});
```

**Note:** Apple button is black in light mode and white in dark (auto-inverts via `isDark`) — exactly like Apple's own guidelines.

---

# Chapter 10 — Migration Plan (mapped to your repo)

Execute in this order. Each phase is independently shippable and nothing breaks the production build midway.

| Phase | What | Files touched | Acceptance |
|---|---|---|---|
| **0. Foundation** | Tokens + ThemeProvider + fonts | `theme/colors.ts` (extend), `theme/ThemeProvider.tsx` (new), `theme/typography.ts` (new), `theme/layout.ts` (new), `App.tsx` (wrap provider + load fonts) | App builds & renders exactly as before (additive change only) |
| **1. Glass + Dock** | GlassView + FloatingTabBar rewrite | `components/glass/GlassView.tsx` (new), `components/FloatingTabBar.tsx` (replace internals), `CustomerTabs.tsx` / `OwnerTabs.tsx` (wire) | Dock floats over both tab stacks, pill springs, Android fallback legible |
| **2. Home** | Editorial Discover | `screens/customer/Discover*` rebuild + `SectionHeader`, `Rail`, `SalonCard`, `BentoCategories`, `SalonListItem`, `VibeArt` | Home matches mockup 01 in light & dark |
| **3. Booking flow** | Profile → Time → Checkout → Success | `SalonProfileScreen`, `TimeSelectScreen`, `CheckoutScreen`, `BookingSuccessScreen` + `AddButton`, `ServiceRow`, `SummaryBar`, `SegmentedControl` | Multi-select → summary slides up → slots + hold timer → UPI sheet → ring ceremony |
| **4. Bookings + Profile** | Customer remainder | `MyBookingsScreen`, `ProfileScreen` + `Toggle`, `StatusChip` | Upcoming/Past switch, grouped settings, mode switcher |
| **5. Owner stack** | Dashboard + 3 manage screens | `owner/*` + KPI/chart patterns | Accept/Decline, trend bars, service toggles, Pro card |
| **6. Auth** | Login restyle | `screens/auth/Login*` | OTP-first flow intact, both modes |

**Hard constraints for every phase:**

- Don't touch: API layer (`services/`), Zustand stores' logic, React Navigation *structure*, Supabase calls, payment logic.
- Do: replace presentation components, keep all `DATA:` seams wired to real hooks, keep route names identical.
- Every PR = one phase, screenshots light+dark for each changed screen.
- `npx tsc --noEmit` clean; test on a real Android device (blur fallback) and iOS simulator (blur).

---

# Chapter 11 — Master Agent Prompt (copy-paste for Antigravity)

```text
You are redesigning the TrimiT React Native app (Expo SDK 54, RN 0.81, React 19,
React Navigation, Zustand, TanStack Query) to the "Champagne Noir" design system
with an Editorial home layout and a Liquid Glass dock.

AUTHORITATIVE SPEC: read design/TRIMIT-REDESIGN-BLUEPRINT.md in the repo root
before writing any code. It contains the exact tokens, components, and screen
code. Follow it verbatim — do not invent colors, radii, or fonts.

RULES:
1. Presentation layer only. Never modify business logic, API clients, stores,
   navigation structure, or Supabase/payment code.
2. All colors from theme/colors.ts tokens. No hardcoded hex in components.
3. Glass = GlassView component only, chrome surfaces only (dock, summary bar,
   confirm zone, sheets, fabs). Never inside list items.
4. Every screen must work in light AND dark mode — verify both before finishing.
5. Android: rely on GlassView's built-in solid fallback; do not branch manually.
6. Work phase-by-phase per Chapter 10. One phase per PR. After each phase run
   `npx tsc --noEmit` and report the result.
7. Where the blueprint marks "// DATA:" seams, wire them to the existing hooks/
   queries in this repo (search before creating new ones). Keep route names and
   params identical to the current navigators in src/navigation/.
8. Add the required packages exactly as listed in the blueprint Chapter 0 via
   `npx expo install` (never npm-install raw RN packages).

DELIVERABLE PER PHASE: list of changed/created files, screenshots (light+dark)
for each changed screen, tsc result, and any deviation from the blueprint with
a one-line reason.
```

---

# Chapter 12 — QA Checklist

Run per screen, both modes, both platforms.

**Color & contrast**
- [ ] No hardcoded hex outside `theme/`
- [ ] Muted text is only used ≥13px/600 (AA)
- [ ] Status text always bold on soft-tint bg

**Glass**
- [ ] Dock legible over photos and plain backgrounds
- [ ] Max 2 blur surfaces on screen
- [ ] Android fallback: solid, correct radius, specular top edge present
- [ ] No blur inside scrolling lists

**Layout**
- [ ] 24px horizontal gutter everywhere
- [ ] Dock never covers content (bottom inset 130 on scrolls)
- [ ] Rails snap; bento tiles equal-width
- [ ] Dark mode: no white flashes, all borders visible

**Interactions**
- [ ] AddButton morph + haptic
- [ ] SummaryBar slide-up/out with spring
- [ ] Hold timer color transitions (green → amber ≤2:00 → red ≤1:00) and resets
- [ ] Segmented pill slides; slots show check burst; days select
- [ ] UPI sheet opens/closes with timing; scrim tap dismisses
- [ ] Success ring draws once on mount; check pops at ~1s
- [ ] Accept/Decline chips transition states

**Owner & Auth**
- [ ] 4-tab dock works with the same pill math
- [ ] KPI values use tabular-nums
- [ ] Login: Apple button inverts in dark; email OTP path unchanged

---

*Blueprint version 1.0 · matches `TrimiT Theme 1 Champagne Noir.html` + V3 master · Champagne Noir #8A6524 (light) / #E3C77F (dark) · Editorial layout · Liquid Glass dock · 14 screens, light & dark, customer + owner + auth.*
