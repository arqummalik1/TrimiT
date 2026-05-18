# Google Search Console — trimit.online

## Ownership verification (you did this — DNS / Hostinger)

If you verified with **Domain name provider** (TXT record in Hostinger):

- You do **not** need `REACT_APP_GOOGLE_SITE_VERIFICATION` in Vercel.
- You do **not** need an HTML meta tag or `google*.html` file in the repo.
- Keep the TXT record in Hostinger — do not delete it after verification.

**Recommended property type:** **Domain** property (`trimit.online`) covers `https://trimit.online` and `www` if both point to the site.

---

## What to do next (in Search Console)

Do these in order after ownership shows **Verified**:

### 1. Submit your sitemap

1. [Google Search Console](https://search.google.com/search-console) → your property → **Sitemaps**
2. Enter: `sitemap.xml` (or full URL `https://trimit.online/sitemap.xml`)
3. Click **Submit**

Status should become **Success** after Vercel redeploys (see below).

**If you see “URL not allowed” with a different domain** (e.g. `*.vercel.app`): Production `REACT_APP_PUBLIC_SITE_URL` must match your Search Console property (e.g. `https://trimit.online`). Redeploy, then **Resubmit** the sitemap in Search Console.

### 2. Confirm robots.txt (optional check)

Open in a browser:

- https://trimit.online/robots.txt  
- https://trimit.online/sitemap.xml  

You should see:

- `Sitemap: https://trimit.online/sitemap.xml` in robots.txt  
- XML listing `/`, `/signup`, `/login`, `/contact`, `/privacy`, `/terms`

If robots still mentions `trimi-t.vercel.app` or sitemap returns an error, fix Vercel env and redeploy (next section).

### 3. Request indexing for the homepage (optional)

1. **URL inspection** → `https://trimit.online/`
2. **Request indexing**

Google still decides when to crawl; this only asks faster.

### 4. Use Search Console reports (no extra code)

After a few days:

- **Performance** — queries, clicks, impressions  
- **Pages** — which URLs are indexed  
- **Core Web Vitals** — speed signals  

No GitHub change required for these.

---

## Vercel checklist (fixes wrong robots/sitemap on live site)

In **Vercel** → Project → **Settings** → **Environment Variables** (Production):

| Variable | Correct value |
|----------|----------------|
| `REACT_APP_PUBLIC_SITE_URL` | `https://trimit.online` |

Must match your live marketing domain and Search Console property (not a `*.vercel.app` preview URL unless that is what you verified).

Then **Redeploy** production (Deployments → … → Redeploy).

`vercel.json` uses `"handle": "filesystem"` so `/robots.txt` and `/sitemap.xml` are served as static files, not the React app.

---

## Optional: HTML tag verification (not needed if you used DNS)

Only if you add a **new** URL-prefix property later:

1. Search Console → **HTML tag** method  
2. Set `REACT_APP_GOOGLE_SITE_VERIFICATION` in Vercel to the token only  
3. Redeploy  

Or upload Google's `googleXXXXXXXX.html` to `frontend/public/` and redeploy.

---

## Optional: Google Analytics 4 (separate product)

Search Console ≠ GA4.

| Tool | Purpose | Setup |
|------|---------|--------|
| **Search Console** | Google Search traffic | DNS verify + sitemap (above) |
| **GA4** | On-site visits, events | Create GA4 property → `REACT_APP_GA_MEASUREMENT_ID` in Vercel → redeploy |

---

## Google Play Store (separate)

Play listing keywords: [PLAY_STORE_DEPLOYMENT_GUIDE.md](./PLAY_STORE_DEPLOYMENT_GUIDE.md) → **Play Store ASO**.

---

## Files in this repo

| File | Purpose |
|------|---------|
| `frontend/public/robots.txt` | Generated at build; crawl rules |
| `frontend/public/sitemap.xml` | Generated at build; public URLs |
| `frontend/scripts/generate-seo.cjs` | Writes robots + sitemap (`prebuild`) |
| `frontend/vercel.json` | Serves static SEO files before SPA fallback |
