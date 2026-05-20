# TrimiT — SEO & launch next steps (after merge)

Use this checklist after the **favicon / OG / manifest** PR is merged and **Vercel** (or your host) has redeployed `https://trimit.online`.

## 1. Verify production (5 minutes)

- [ ] Open `https://trimit.online` — hard refresh (cache bust).
- [ ] **View source** (first HTML response): confirm `<link rel="icon">` points to `/favicon.png`.
- [ ] **Rich results test**: [Google Rich Results Test](https://search.google.com/test/rich-results) — paste homepage URL; fix any JSON-LD errors.
- [ ] **Mobile-Friendly Test**: [Google Mobile-Friendly Test](https://search.google.com/test/mobile-friendly).

## 2. Google Search Console (required)

- [ ] Add property **Domain** `trimit.online` (DNS TXT) or **URL prefix** `https://trimit.online/`.
- [ ] Set env **`VITE_GOOGLE_SITE_VERIFICATION`** (or `REACT_APP_GOOGLE_SITE_VERIFICATION`; see `frontend/src/config/env.js` + `frontend/env.example`) to the meta token Google gives you — redeploy so `SeoHead` injects verification.
- [ ] Submit **sitemap**: `https://trimit.online/sitemap.xml`.
- [ ] **URL Inspection** → request indexing for `/`, `/explore`, `/for-salons`, one blog URL, one SEO pillar URL.

## 3. Google Analytics 4

- [ ] Create GA4 property + web data stream for `trimit.online`.
- [ ] Ensure `GoogleAnalytics.js` (or your tag) uses the **Measurement ID** in production env on Vercel.
- [ ] Link **GA4 ↔ Search Console** (GA4 Admin → Search Console linking).

## 4. Play Store ↔ website (trust + entity)

- [ ] Play Console listing URL in footer / press page when live.
- [ ] **Account deletion URL**: `https://trimit.online/contact#account-deletion` (already documented).
- [ ] Same **brand name**, **icon family**, and **support email** as the website.

## 5. Optional but high impact (this week)

- [ ] **Prerender**: install Puppeteer for CI/local and run `postbuild` prerender so crawlers see full HTML on key routes (see `frontend/scripts/prerender-routes.cjs`).
- [ ] **Dedicated favicon.ico** (multi-size 16/32/48) with **true black + gold** mark — replace generic PNG when design exports assets.
- [ ] **`sameAs`** in Organization JSON-LD: LinkedIn, Instagram, X, YouTube — only add real profiles.

## 6. Content & authority (ongoing)

- [ ] Publish **1–2 blog posts / month** (Jammu guides + owner tips); internal link from homepage sections.
- [ ] **Google Business Profile** for TrimiT (company / software) with correct category and website link.
- [ ] **Backlinks**: partner salons, local press, founder LinkedIn — no paid spam directories.

## 7. When you open the PR (GitHub)

1. Compare `main` ← `chore/seo-favicon-og-docs` (or your branch name).
2. Merge after CI green.
3. **Redeploy frontend** on Vercel from `main`.
4. Re-run Search Console **URL inspection** on `/` after deploy.

If `gh pr create` fails locally, run `gh auth login` once, then:

```bash
gh pr create --base main --head chore/seo-favicon-og-docs --title "chore(seo): favicon, OG image meta, manifest theme" --body-file -
```

(Paste summary + link to this doc.)
