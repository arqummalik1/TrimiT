# Release Checklist

Use for **every** backend deploy, web deploy, and mobile store submission.

---

## Backend (Render)

### Pre-deploy
- [ ] All migrations applied to production Supabase (document numbers)
- [ ] Env vars set: `JWT_SECRET`, `SUPABASE_*`, `RAZORPAY_*`, `ALLOWED_ORIGINS`, `ENVIRONMENT=production`
- [ ] `DEBUG=False`
- [ ] `SENTRY_DSN` set
- [ ] Rate limiter wired (verify 429 on staging)
- [ ] No P0 bugs open in [bug-tracker.md](./bug-tracker.md)

### Deploy
- [ ] Merge to deploy branch / trigger Render deploy
- [ ] `GET /health` returns `ok`
- [ ] Smoke: `POST /auth/login` (test user)
- [ ] Smoke: `GET /salons/` with lat/lng

### Post-deploy
- [ ] Monitor Sentry 15 min for new errors
- [ ] Notify team in standup channel

---

## Web (Vercel)

### Pre-deploy
- [ ] `REACT_APP_API_URL` points to production backend
- [ ] `REACT_APP_SUPABASE_*` are anon keys only
- [ ] `GENERATE_SOURCEMAP=false`
- [ ] API signing works OR backend signing disabled
- [ ] `npm run build` succeeds locally

### Deploy
- [ ] Vercel preview tested
- [ ] Promote to production
- [ ] Verify `/privacy`, `/terms` return 200

### Post-deploy
- [ ] Login + cash booking E2E on production URL
- [ ] No console errors on discover page

---

## Mobile (EAS)

### Pre-build
- [ ] Version bumped in `app.config.js`
- [ ] `eas.json` production env complete (API, Supabase, Sentry, signing secret, Maps)
- [ ] Upload keystore configured (not debug)
- [ ] Changelog written

### Build
```bash
cd mobile && eas build --platform android --profile production
```

### Pre-submit
- [ ] Install APK/AAB on physical device
- [ ] Full customer + owner E2E
- [ ] Push on physical device (not simulator)
- [ ] Razorpay test payment (if enabled)

### Play Console submit
- [ ] versionCode incremented
- [ ] Release notes entered
- [ ] Data Safety form current
- [ ] Reviewer credentials in App Access section
- [ ] Account deletion URL listed

### Post-submit
- [ ] Watch pre-launch report (24–48h)
- [ ] Triage crashes in Play Console + Sentry

---

## Rollback plan

| Layer | Rollback |
|-------|----------|
| Backend | Redeploy previous Render deploy |
| Web | Vercel instant rollback to prior deployment |
| Mobile | Halt rollout %; promote previous versionCode |
| Database | PITR restore (Supabase) — last resort only |

---

## Sign-off

| Check | Name | Date |
|-------|------|------|
| Engineering | | |
| QA | | |
| Product | | |
