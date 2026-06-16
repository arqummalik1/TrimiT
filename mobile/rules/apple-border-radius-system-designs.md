# UI Border Radius Rule

**Objective:**
Maintain a cohesive, native iOS (Apple-inspired) look and feel across all components by strictly adhering to unified `borderRadius` theme tokens.

## Rule: Apple Design System Card Radius
Apple uses a consistent, soft, continuous corner radius (squircle) deeply rooted in the **Apple Design System**—matching the physical and software curves found on MacBooks, iPhones, and native iOS interface cards. To strictly adhere to this Apple Design System, **all main cards must use `theme.borderRadius.lg` (16px)**.

**Components that must follow this rule:**
- **Owner Section:**
  - Earning Cards
  - Booking Cards (Today, Pending, etc.)
  - Services Cards
  - Settings Cards / Inset Grouped Lists
  - Recent Activity Cards (BookingCard components)
- **Customer Section:**
  - Discover Cards (Salons, Services, Stylists, etc.)
  - Customer Booking Cards
- Any other primary content container or dashboard card.

**Exceptions (High-Radius Elements):**
Do not alter the radius of small interactive elements that require a fully rounded or "pill" shape. These must use `theme.borderRadius.pill` (40px) or `theme.borderRadius.full` (999px):
- Filter Chips (e.g., "All", "Pending", "Confirmed" on the booking screen)
- The "Free Trial" tip or other highly rounded badges/tips
- Avatars and pure circle icons

## Guidelines for AI Agents:
1. When creating or modifying a card component, do **not** hardcode border radii (e.g., `borderRadius: 12`, `borderRadius: 20`).
2. Always import the theme and apply `theme.borderRadius.lg` to card wrappers.
3. If a card is found to have a mismatched radius compared to the bottom navigation bar or other dashboard elements, update it to use `theme.borderRadius.lg`.
4. Ensure internal padding is proportional to the 16px radius to prevent content from looking crowded in the corners.
