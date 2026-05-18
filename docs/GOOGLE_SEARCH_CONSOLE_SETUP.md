# Google Search Console — trimit.online

Quick steps after deploying the SEO changes in this repo.

## 1. Verify ownership

1. Open [Google Search Console](https://search.google.com/search-console) → add property **`https://trimit.online`** (prefer URL-prefix or domain property as you prefer).
2. Choose **HTML tag** verification.
3. Copy the `content` value from the meta tag (the token only, not the full tag).
4. In **Vercel** → Project → Settings → Environment Variables → Production:
   - `REACT_APP_GOOGLE_SITE_VERIFICATION` = `your_token_here`
5. Redeploy the frontend (push to `main` or manual redeploy).
6. In Search Console, click **Verify**.

**Alternative:** Upload the HTML file Google gives you to `frontend/public/` (e.g. `google123abc.html`) and redeploy — no env var needed.

## 2. Submit sitemap

After deploy, confirm these URLs load in a browser:

- https://trimit.online/robots.txt
- https://trimit.online/sitemap.xml

In Search Console → **Sitemaps** → submit:

```text
https://trimit.online/sitemap.xml
```

## 3. Request indexing (optional)

For the homepage: **URL inspection** → enter `https://trimit.online/` → **Request indexing**.

## 4. Analytics

| Tool | What you get | Setup |
|------|----------------|-------|
| **Search Console** | Google Search clicks, impressions, queries | Verification + sitemap (above) |
| **GA4** (optional) | On-site visits, events | Create GA4 property → set `REACT_APP_GA_MEASUREMENT_ID` in Vercel → redeploy |

Search Console does **not** use `REACT_APP_GA_MEASUREMENT_ID`; that is only for Google Analytics 4.

## 5. Google Play Store (separate from Search Console)

Play ranking uses the **Play Console store listing** (title, short description, full description), not `sitemap.xml`.

Copy the suggested text from [PLAY_STORE_DEPLOYMENT_GUIDE.md](./PLAY_STORE_DEPLOYMENT_GUIDE.md) → section **Play Store ASO (keywords & listing copy)**.

## Files in this repo

| File | Purpose |
|------|---------|
| `frontend/public/robots.txt` | Crawl rules (generated at build) |
| `frontend/public/sitemap.xml` | Public URLs for Google |
| `frontend/scripts/generate-seo.cjs` | Regenerates robots + sitemap from `REACT_APP_PUBLIC_SITE_URL` |
| `frontend/src/config/seo.js` | Page titles, descriptions, keywords |
| `frontend/src/components/SeoHead.js` | Per-route meta + JSON-LD on landing |
