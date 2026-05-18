# TrimiT Web Frontend — Complete Design & Product Context

> **Purpose:** Paste this document (or sections) into ChatGPT, Claude, or any AI assistant so it fully understands what the TrimiT web app is, how it looks, and how every screen and component is structured.
>
> **Live site:** https://trimit.online  
> **Codebase path:** `frontend/` (Create React App + React 19 + Tailwind CSS 3)

---

## 1. What TrimiT Is

**TrimiT** is a **salon marketplace and booking platform** for India. One product serves two audiences:

| Role | Who they are | Primary web experience |
|------|----------------|------------------------|
| **Customer** | People booking salon services | Discover salons → view details → book time slots → manage bookings |
| **Owner** | Salon business owners | Dashboard, manage salon profile, services, bookings, settings |

The **web frontend** is a marketing landing site + authenticated web portal. The **primary booking experience** is also available on **Android** (Expo React Native app); the web promotes app download heavily.

**Brand name:** TrimiT (capital T, capital T at end)  
**Tagline vibe:** Premium salon booking — elegant, warm, trustworthy  
**Geography:** India (INR currency, Indian phone formats)

---

## 2. Technology Stack (for accurate suggestions)

- **Framework:** React 19, **Vite 6** (`npm start` / `npm run build`; output `dist/`)
- **Legacy:** `npm run build:cra` still available via react-scripts if needed
- **Routing:** React Router v7
- **Styling:** Tailwind CSS 3 + custom CSS in `index.css`
- **Animation:** Framer Motion (`motion.div`, scroll/viewport animations)
- **Icons:** Phosphor Icons (`@phosphor-icons/react`) — duotone, fill, bold weights
- **UI primitives:** Radix UI (dialog, dropdown, select, tabs) — used sparingly
- **Data fetching:** TanStack React Query (`useQuery`, `useMutation`) — **never** raw `fetch` in pages
- **Auth state:** Zustand (`authStore`)
- **Toasts / notifications:** Zustand (`toastStore`, `notificationStore`)
- **Backend API:** FastAPI at `REACT_APP_API_URL` (axios client in `lib/api.js`)
- **Auth:** Supabase JWT (Bearer token on every API request)

**Architecture rule:** Pages are views. All API calls go through `lib/api.js` + React Query hooks. No direct axios in presentational logic scattered in random places.

---

## 3. Design System

### 3.1 Color Palette

The aesthetic is **warm neutral stone** + **burnt orange accent** + **emerald for success/positive**.

| Token | Hex (main use) | Usage |
|-------|----------------|--------|
| `stone-50` | `#fafaf9` | Page background (almost everywhere) |
| `stone-100`–`200` | borders, subtle fills | Cards borders, dividers, input borders |
| `stone-500`–`600` | — | Secondary text, labels |
| `stone-900` | `#1c1917` | Primary headings, body emphasis |
| `orange-400`–`800` | accent | CTAs, links hover, active nav, prices |
| `orange-800` | `#9a3412` | **Primary button** background (`btn-primary`) |
| `emerald-500`–`800` | — | Ratings badges, success states, secondary CTA |
| `red-50` / `red-600` | — | Errors, delete account, cancelled status |

**Gradients used:**
- Hero overlay: `from-stone-950/85 via-stone-900/70 to-orange-950/80`
- Owner CTA band: `from-stone-900 to-orange-950`
- Offer service cards: `from-orange-50 to-amber-50` with `border-orange-300`
- Offer badges: `from-orange-600 to-red-600`

### 3.2 Typography

| Role | Font | Weight | Notes |
|------|------|--------|-------|
| **Headings** | Cabinet Grotesk (`font-heading`) | 700–800 | Tight tracking (`-0.02em`), large display sizes |
| **Body** | Manrope (`font-body`) | 400–700 | Default on `body` |

**Scale examples:**
- Hero H1: `text-3xl sm:text-5xl md:text-6xl font-extrabold`
- Section H2: `text-4xl md:text-5xl font-bold`
- Page titles (app): `text-3xl font-bold`
- Card titles: `text-lg font-bold`
- Labels: `text-sm font-medium`
- Eyebrow labels: `text-xs font-bold tracking-[0.2em] uppercase text-orange-800`

### 3.3 Spacing & Layout

- **Max content width:** `max-w-6xl` (most pages), `max-w-4xl` (salon detail), `max-w-3xl` (forms, booking)
- **Horizontal padding:** `px-4 sm:px-6 lg:px-8`
- **Section vertical rhythm:** `py-16` to `py-24` on landing; `py-8` on app pages
- **Border radius:** `rounded-xl` (inputs, small chips), `rounded-2xl` (cards), `rounded-3xl` (auth forms, success modals), `rounded-full` (buttons, pills, nav items)

### 3.4 Global CSS Utilities (`index.css`)

| Class | Description |
|-------|-------------|
| `.glass` | Frosted header: `backdrop-blur(24px)`, white 70% opacity, subtle border |
| `.btn-primary` | Orange-800 filled pill button, hover lift + shadow |
| `.btn-secondary` | Emerald-800 filled pill button |
| `.card` | White bg, `rounded-2xl`, stone border, hover lift |
| `.download-app-btn` | Animated conic-gradient spinning border ring around CTA |
| `.animate-stagger` | Children slide up with staggered delays |

### 3.5 Motion & Interaction

- **Framer Motion:** fade/slide on page enter, `whileInView` on landing sections, `whileHover={{ y: -4 }}` on salon cards
- **Loading:** `animate-pulse` skeleton blocks (gray stone-200 rectangles)
- **Hover on cards:** `-translate-y-1`, `shadow-lg` or `shadow-xl`
- **Active nav:** `bg-orange-100 text-orange-800` pill behind link
- **Focus rings:** `focus:ring-2 focus:ring-orange-800/20 focus:border-orange-800` on inputs

### 3.6 Iconography

All icons from **Phosphor**. Common icons:
- Navigation: `House`, `CalendarCheck`, `User`, `ChartBar`, `Storefront`, `List`, `SignOut`
- Discovery: `MagnifyingGlass`, `MapPin`, `Star`, `Clock`, `NavigationArrow`
- Booking: `Calendar`, `Timer`, `CreditCard`, `CheckCircle`, `Warning`
- Landing: `MapPin`, `Calendar`, `CreditCard`, `Star`, `Sparkle`, `DeviceMobile`, `GooglePlayLogo`

---

## 4. Brand Assets

### TrimitLogo component

- **Icon:** `/public/branding/logo.png` (transparent)
- **Horizontal:** `/public/branding/logo-horizontal.png` (opaque black canvas — do NOT CSS-invert on dark backgrounds; use `mix-blend-screen` or icon-only variant)
- **Variants:** `icon` | `horizontal` | `icon-text`
- **Tones:** `light` (dark text wordmark) | `dark` (white text on hero/footer)
- **Wordmark:** "TrimiT" in Cabinet Grotesk bold

### AuthBrandMark

Centered logo + wordmark used on Login, Signup, Forgot/Reset password pages.

---

## 5. App Shell (Every Page Except Auth Callbacks)

```
┌─────────────────────────────────────────────────────────┐
│  HEADER (sticky, glass, h-16)                           │
│  [Logo]  [Role-based nav pills]  [Download App] [Auth]  │
├─────────────────────────────────────────────────────────┤
│  MAIN (page content, bg-stone-50)                       │
├─────────────────────────────────────────────────────────┤
│  FOOTER (stone-100, legal links, store badges)          │
│  (Landing page has its OWN dark footer — see below)     │
└─────────────────────────────────────────────────────────┘
│  TOAST overlay (top-right, z-9999)                      │
```

**Header** (`components/Header.js`):
- Sticky `top-0 z-50`, glass effect, bottom border `border-stone-200/50`
- Left: `TrimitLogo` icon + text
- Center (md+): role-based navigation (hidden on mobile — no hamburger menu currently)
- Right: `DownloadAppButton` (animated ring) + Login/Signup OR user chip + Logout

**Customer nav links:** Discover | Account | My Bookings  
**Owner nav links:** Dashboard | My Salon | Services | Settings | Bookings

**Footer** (`components/Footer.js`):
- Light stone-100 bar
- Links: Privacy, Terms, Contact
- `StoreDownloadLinks` (Google Play style badges)
- Copyright year

**Auth callback pages** (`/auth/email-confirmed`, `/reset-password`): No header/footer.

---

## 6. Route Map & Page Inventory

### Public (no login)

| Route | Page | Purpose |
|-------|------|---------|
| `/` | LandingPage | Premium marketing homepage (section components under `components/landing/sections/`) |
| `/explore` | ExplorePage | Public salon search (Jammu default) |
| `/for-salons` | ForSalonsPage | Owner acquisition funnel |
| `/salons-in-jammu`, `/best-haircut-in-jammu`, … | SeoCategoryPage | Programmatic local SEO (`config/seoPages.js`) |
| `/blog`, `/blog/:slug` | Blog | Content SEO |
| `/salon/:id` | SalonDetail | Public browse; sign in to book |
| `/login` | LoginPage | Email/password sign in |
| `/signup` | SignupPage | Register as customer or owner (`?role=owner`) |
| `/forgot-password` | ForgotPasswordPage | Request reset email |
| `/reset-password` | ResetPasswordPage | Set new password from email link |
| `/auth/email-confirmed` | EmailConfirmedPage | Supabase email verification landing |
| `/privacy` | PrivacyPage | Legal markdown |
| `/terms` | TermsPage | Legal markdown |
| `/contact` | ContactPage | Support contact info |

### Customer (role: `customer`)

| Route | Page |
|-------|------|
| `/discover` | Redirect → `/explore` |
| `/explore` | SalonDiscoveryView (same as public explore when authed) |
| `/salon/:id` | SalonDetail — hero, services, reviews |
| `/booking/:salonId/:serviceId` | BookingPage — date/slot picker |
| `/my-bookings` | MyBookings — list + cancel |
| `/account` | AccountPage — profile + delete account |

### Owner (role: `owner`)

| Route | Page |
|-------|------|
| `/owner/dashboard` | OwnerDashboard — stats, quick actions |
| `/owner/salon` | ManageSalon — create/edit salon profile |
| `/owner/services` | ManageServices — CRUD services + offers |
| `/owner/bookings` | ManageBookings — accept/reject/complete |
| `/owner/settings` | SettingsPage — salon settings |

**Post-login redirects:**
- Customer → `/explore`
- Owner with salon → `/owner/dashboard`
- Owner without salon → `/owner/salon`

---

## 7. Landing Page (`/`) — Section-by-Section

`LandingPage.js` composes sections from `frontend/src/components/landing/sections/`. **Single dark marketing Footer** via global `Footer.js` (no duplicate inner footer). Jammu-first copy and SEO.

**Section order:** Hero → TrustStrip → FeaturedSalons → TrendingServices → LocalSeoSections (×6) → WhyTrimit (8 bento cards) → HowItWorks → Offers → Nearby salons → OwnerGrowth → SocialProof → AppDownload → FAQ → SeoContent → BlogPreview → FinalCta → `StickyMobileCta` (mobile).

**Key config:** `config/jammu.js`, `config/localSeoSections.js`, `config/whyTrimitFeatures.js`, `hooks/usePublicSalons.js`.

### 7.1 Hero Section
- **Height:** `min-h-[85vh]` to `92vh`, full-bleed background photo (salon imagery via `LazyImage` + responsive srcSet)
- **Overlay:** Dark stone/orange gradient + subtle orange radial glow
- **Left column:**
  - Eyebrow pill: "Premium salon booking" with sparkle icon (glass/blur pill)
  - H1: "Book your perfect" + orange line "salon experience"
  - Subcopy: discovery + India mention
  - **Primary CTA:** `btn-primary` — "Find salons" → signup or /discover if logged in
  - **Secondary CTA:** glass/outline pill — "List your salon" → `/signup?role=owner`
  - Mobile: `HeroAccentIllustration` SVG below CTAs
- **Right column (lg+):** Large `HeroAccentIllustration` with orange blur glow behind
- **Scroll indicator:** Animated mouse-style pill at bottom center

### 7.2 Stats Strip (overlaps hero)
- White floating card (`-mt-8`), 3 columns:
  - "30 min" — Average booking time
  - "24/7" — Book anytime
  - "100%" — Salon-verified listings
- Values in `text-orange-800`, labels in stone-500

### 7.3 Features — "Why TrimiT"
- White section, centered header with orange eyebrow "WHY TRIMIT"
- **4 feature cards** in grid (1→2→4 cols):
  1. Discover Nearby (MapPin)
  2. Easy Booking (Calendar)
  3. Secure Payments (CreditCard)
  4. Verified Reviews (Star)
- Each card: gradient background (`from-orange-50` etc.), white icon box 56px, title + description, hover lift

### 7.4 Services — "What we offer"
- Stone-50 background
- **4 vertical portrait cards** (aspect 4/5):
  - Haircut & styling, Spa & wellness, Beard grooming, Skin & facial
- Each: `ServiceCardImage` photo, bottom gradient overlay, icon badge top-left, white title at bottom
- Ring colors vary per card (orange, stone, amber, rose)

### 7.5 Mobile App Section
- White, bordered top/bottom
- `DeviceMobile` icon, headline about Android
- Orange pill button with Google Play logo → external download URL
- "iOS app coming soon" subtext

### 7.6 How It Works
- Stone-50 bg, 3 steps: Discover → Book → Enjoy
- Each step: `StepIllustration` SVG, "Step N" label, title, description

### 7.7 For Salons CTA Band
- Full-width rounded-3xl card: gradient `stone-900 → orange-950`
- TrimiT icon (dark tone), "Grow your salon" headline
- White pill "Partner with us" button

### 7.8 Final CTA
- Full-width `bg-orange-800` section
- Logo, "Ready to look your best?", white "Get started now" button

### 7.9 Footer (global)
- `bg-stone-900`, columns: brand, Discover links, Jammu service SEO links, legal + app badges

**Env vars:** `VITE_*` or `REACT_APP_*` via `config/env.js`. **OG image:** `/branding/og-image.png`. **SSG:** optional `npm i -D puppeteer` then postbuild prerender.

---

## 8. Authentication Pages

Shared pattern across Login, Signup, Forgot Password, Reset Password:

- Full viewport centered layout, `bg-stone-50`
- `AuthBrandMark` at top
- White card: `rounded-3xl shadow-xl p-8 border border-stone-200`
- Inputs: left icon (Envelope, Lock, User, Phone), `rounded-xl`, orange focus ring
- Password toggle: Eye / EyeSlash button inside field
- Primary submit: full-width `btn-primary`
- Links to alternate flows in stone-500/orange-800

### Signup specifics
- **Role selector:** Two large selectable cards — Customer (Users icon) vs Salon Owner (Storefront icon); required before submit
- URL `?role=owner` pre-selects owner
- Terms checkbox linking to /terms and /privacy
- Success state: "Check your email" confirmation screen (no header nav needed)
- Owner signup → redirect `/owner/salon`; Customer → `/discover`

### Login specifics
- "Remember me" checkbox (persists email in localStorage)
- Forgot password link

---

## 9. Customer Experience — Screens & Components

### 9.1 Discover (`/discover`)

**Top search band** (white, border-b):
- H1: "Find Your Perfect Salon"
- Subtext: geolocation status message
- Search input with magnifying glass, placeholder "Search salons by name..."
- View toggle: List | Map (segmented control in stone-100 pill)

**Salon grid** (3 columns on lg):
Each **SalonCard**:
- Image aspect 4/3, hover scale
- Distance badge top-right (white/blur pill) if `distance` from API
- Title (heading font), emerald rating pill if `avg_rating > 0`
- Address row with MapPin
- Hours row with Clock
- "From ₹X" price in orange-800 (lowest service price)
- Entire card links to `/salon/:id`
- Hover: lift -4px, shadow-xl

**Empty state:** Large MapPin duotone, "No salons found"

**Map view:** Placeholder card — "Map View Coming Soon" (no Google Maps API key yet)

**Loading:** 6 skeleton cards with pulse rectangles

### 9.2 Salon Detail (`/salon/:id`)

**Hero** (40vh min):
- Full-width salon image + gradient overlay bottom
- Back button: white circle top-left
- Overlay: rating badge (emerald), salon name (white H1), address, hours, phone (clickable tel:)

**Body** (max-w-4xl):
- Description paragraph if present
- **Services list** — each service row card:
  - Normal: white card, border stone-200
  - **On offer:** orange/amber gradient, thicker orange border, shadow
  - Offer badge: "🔥 X% OFF" gradient pill + end date
  - Offer tagline italic if set
  - Duration (Timer icon), price (strikethrough original if offer)
  - "Book Now" pill — orange gradient if offer, else btn-primary
- **Reviews section** (if any): white cards, user avatar circle, 5-star row, comment, date

**Error state:** Scissors icon, "Salon Not Found", back CTA

### 9.3 Booking (`/booking/:salonId/:serviceId`)

**Sticky sub-header** (below main header):
- Back circle button, "Book Appointment" title, salon name subtitle

**Flow:**
1. **Service summary card** — name, duration, price
2. **Date picker** — horizontal scroll of 14 days; selected = `bg-orange-800 text-white`, else white bordered chips showing EEE / day / MMM
3. **Time slots** — grid 4–6 cols; states:
   - Available: white border, hover orange
   - Selected: orange-800 fill white text
   - Filling up (multi-booking): amber-50 border
   - Full: stone-100, line-through, "Booked" or "Full" label
   - Multi-booking shows `count/max booked` under time
4. **Booking summary** (appears when slot selected): date, time, duration, offer savings green box, total, "Confirm Booking" btn-primary with CreditCard icon
5. Payment method on web: `salon_cash` (pay at salon) — Razorpay is mobile-primary

**Success screen:** Centered white `rounded-3xl` modal card, emerald CheckCircle, booking details table, "View My Bookings" + "Back to Home"

**Toasts:** Processing, success, error with optional "Pick Another Slot" action

### 9.4 My Bookings (`/my-bookings`)

- NotificationBell in header area
- Realtime Supabase subscription for status updates
- Sorted booking cards (newest first)
- Each card shows: salon name, service, date/time, status badge (color-coded), payment status, cancel button for eligible statuses
- Status icons: pending (yellow hourglass), confirmed (blue), completed (green), cancelled (red)

### 9.5 Account (`/account`)

- Profile card: orange circle avatar icon, name, email, phone
- Danger zone card: red border, delete account with confirm dialog

---

## 10. Owner Experience — Screens & Components

### 10.1 Owner Dashboard (`/owner/dashboard`)

- Title + NotificationBell (realtime new booking toasts)
- **No salon state:** Storefront icon, CTA "Create Salon" → /owner/salon
- **With salon:**
  - **4 stat cards** (2x2 mobile, 4 col desktop):
    - Total Earnings (emerald) — INR formatted
    - Total Bookings (blue)
    - Today's Bookings (orange)
    - Pending (yellow)
  - **Booking Overview** card: counts for Pending, Confirmed, Completed, Cancelled with colored icons
  - **Quick Actions** card: links to Manage Salon, View Bookings, Settings — each row is stone-50 hover row with colored icon square
  - **Services preview:** up to 4 services with link "Manage All"

### 10.2 Manage Salon (`/owner/salon`)

- Multi-section form in white `rounded-2xl` card:
  - Basic info: name, description
  - Location: address, city, lat/lng, phone
  - Hours: opening_time, closing_time
  - Images upload area
  - Settings: max bookings per slot, allow multiple bookings toggle
- Save button: btn-primary full width or inline
- Shimmer skeleton while loading

### 10.3 Manage Services (`/owner/services`)

- List of services with edit/delete
- Add service form/modal: name, description, duration, price
- **Offer fields:** is_on_offer, discount_percentage, original_price, offer_tagline, offer_end_date
- Offer services visually distinct (orange styling)

### 10.4 Manage Bookings (`/owner/bookings`)

- Filterable list of incoming bookings
- Actions: confirm, complete, cancel (status patches)
- Customer name, service, time, payment info displayed per row

### 10.5 Settings (`/owner/settings`)

- Salon operational settings (notification preferences, etc.)

---

## 11. Shared Components Reference

| Component | Location | Role |
|-----------|----------|------|
| `TrimitLogo` | `components/brand/TrimitLogo.js` | Brand mark, link to home |
| `AuthBrandMark` | `components/brand/AuthBrandMark.js` | Centered logo on auth pages |
| `Header` | `components/Header.js` | Global sticky nav |
| `Footer` | `components/Footer.js` | Global footer |
| `DownloadAppButton` | `components/DownloadAppButton.js` | Animated APK download CTA |
| `StoreDownloadLinks` | `components/StoreDownloadLinks.js` | Play Store badge row (`variant`: light \| dark) |
| `Toast` / `ToastItem` | `components/Toast.js` | Global notification toasts |
| `NotificationBell` | `components/NotificationBell.js` | Dropdown bell with notification list |
| `LazyImage` | `components/ui/LazyImage.js` | Responsive lazy-loaded images |
| `MarkdownView` | `components/MarkdownView.js` | Renders legal markdown |
| `SeoHead` | `components/SeoHead.js` | Dynamic meta tags per route |
| `GoogleAnalytics` | `components/GoogleAnalytics.js` | GA script |
| `ErrorBoundary` | `components/ErrorBoundary.js` | React error boundary |
| `AccountDeletionSection` | `components/AccountDeletionSection.js` | Reusable delete UI |
| `ServiceCardImage` | `components/landing/ServiceCardImage.js` | Landing service category photos |
| `LandingIllustrations` | `components/landing/LandingIllustrations.js` | Hero + step SVGs |
| `ServiceIllustrations` | `components/landing/ServiceIllustrations.js` | SVG fallbacks |

---

## 12. UI Patterns & States

### Buttons
| Type | Classes |
|------|---------|
| Primary | `btn-primary` — orange-800, white text, rounded-full, hover lift |
| Secondary | `btn-secondary` — emerald-800 |
| Ghost/outline | white/10 border on dark hero; stone border on light |
| Destructive | red-600 text, red border cards |

### Form inputs
- `w-full px-4 py-3 border border-stone-200 rounded-xl`
- Focus: `ring-2 ring-orange-800/20 border-orange-800`
- Labels: `text-sm font-medium text-stone-700 mb-2`

### Cards
- Standard: `bg-white rounded-2xl border border-stone-200 p-5` (or p-6/p-8)
- Hover list cards: `hover:shadow-lg transition-all`
- Stat cards: icon in colored `rounded-xl` square + label + big number

### Status badges
- Booking: yellow pending, blue confirmed, green completed, red cancelled (via `getStatusColor`)
- Payment: yellow pending, green paid, red failed, purple refunded
- Rating: `bg-emerald-100` pill with Star icon

### Loading
- Pulse skeletons matching final layout shapes
- Spinner on buttons: white border spinning circle

### Empty states
- Large duotone Phosphor icon (64px), heading, helper text, optional CTA

### Toasts
- Positions: top-right default
- Types: success (emerald), error (red), info, new-booking (custom)
- Can include action buttons; "Clear all" when >2 toasts

---

## 13. Data & Formatting Conventions

- **Currency:** INR via `formatPrice()` — e.g. "₹499" (no decimals)
- **Dates:** Indian locale `en-IN` — "Mon, 18 May 2026"
- **Times:** 12-hour AM/PM via `formatTime("14:30")` → "2:30 PM"
- **Distance:** kilometers, one decimal from API `distance` or `distance_km`
- **Slot interval:** 30 minutes (backend-driven)
- **Booking statuses:** `pending` | `confirmed` | `completed` | `cancelled`

---

## 14. Responsive Behavior

| Breakpoint | Behavior |
|------------|----------|
| Mobile | Single column grids; header nav hidden (no mobile menu — gap); stacked CTAs full width |
| `sm` (640px+) | Some text size bumps; download button shows "Download App" text |
| `md` (768px+) | Header nav visible; 2-column grids |
| `lg` (1024px+) | 3–4 column salon grid; hero 2-column with illustration |

---

## 15. SEO & Legal

- `config/seo.js` — per-route titles/descriptions; build script generates static SEO files
- Legal content synced from `shared/legal/` via `npm run sync-legal`
- Pages: Privacy, Terms, Contact — rendered through `LegalLayout` + `MarkdownView`
- Public URL config: `REACT_APP_PUBLIC_SITE_URL` (default https://trimit.online)

---

## 16. What the Web App Does NOT Do (important for AI)

- **No embedded Google Maps** on web yet (placeholder only)
- **No Razorpay checkout on web booking** — uses `salon_cash`; online pay is mobile-focused
- **No customer notification page route in App.js** — `CustomerNotifications.js` exists but may not be routed
- **No dark mode toggle** — `darkMode: ["class"]` in Tailwind but UI is light-first
- **Mobile nav drawer:** Header navigation is desktop-only; mobile users rely on direct URLs or limited UI

---

## 17. Suggested Prompts for ChatGPT

When using this document, prefix your request with role context:

```
You are designing/copywriting/developing for TrimiT, an Indian salon booking web app.
Follow the design system in the context below: stone neutrals, orange-800 primary,
Cabinet Grotesk headings, Manrope body, rounded-2xl cards, Phosphor icons, Framer Motion.

[Paste relevant sections from this doc]

Task: [your specific request]
```

**Example tasks this context enables:**
- Write new landing section copy matching existing tone
- Design a new customer page that fits the salon card pattern
- Generate Tailwind markup for a promotional banner consistent with offer cards
- Explain user flow from discovery to booking confirmation
- Create Figma-style component specs with exact color tokens

---

## 18. One-Paragraph Visual Summary (quick reference)

TrimiT's web UI feels like a **premium wellness marketplace**: warm off-white (`stone-50`) pages, crisp white cards with soft stone borders, and **burnt orange** (`orange-800`) as the action color. Headlines are bold and tight in **Cabinet Grotesk**; everything else is friendly **Manrope**. Buttons are **fully rounded pills**; cards use **16px radius (2xl)**. The landing page is cinematic — full-bleed salon photography under dark gradients, floating stat card, feature grid with soft gradient tiles, portrait service cards, and orange CTA bands. The logged-in app is cleaner and utilitarian: search header, image-forward salon cards with distance and ratings, step-by-step booking with horizontal date chips and slot grids, and an owner dashboard of stat tiles and quick-action rows. Motion is subtle (fade up, hover lift). Success = emerald green; offers = orange-to-red gradients with fire emoji accents.

---

*Document generated from TrimiT frontend source. Update when major UI changes ship.*
