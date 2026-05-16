# Performance Audit

---

## Summary

TrimiT is optimized for **MVP scale** (hundreds of users), not high concurrency. Primary bottlenecks are **blocking I/O in async handlers**, **uncached slot generation**, and **mobile bundle size**.

**Performance score: 62/100**

---

## Backend

| Bottleneck | Severity | Location | Mitigation |
|------------|----------|----------|------------|
| Sync httpx in `async def` | High | `core/supabase.py` | Async client + connection pool |
| New HTTP client per request | Medium | `core/supabase.py` | Singleton |
| Full-day bookings fetch per slots call | High | `routers/bookings.py` | Redis cache 30s TTL per salon+date |
| All-salons Python filter | Medium | `routers/salons.py` | Always use `get_nearby_salons_v1` RPC |
| Bloated Docker image | Medium | `requirements.txt` | Remove unused deps |
| 4 gunicorn workers on free tier | High | `render.yaml` | 1–2 workers on starter |
| No response compression | Low | FastAPI | GZip middleware |
| Profile TTL cache | ✅ Good | `dependencies/auth.py` | Extend to salon list |

### Load test targets (pre-scale)
- `GET /bookings/slots` p95 < 500ms @ 50 RPS
- `POST /bookings/` p95 < 800ms @ 20 RPS
- `GET /salons/` p95 < 400ms @ 30 RPS

---

## Database

| Item | Status |
|------|--------|
| Indexes on bookings FKs | ✅ |
| Partial UNIQUE on slot | ❌ Missing — also correctness issue |
| `get_nearby_salons_v1` | ✅ Reduces app-side Haversine |
| Realtime replication lag | Monitor on growth |
| Connection pooling | Use Supabase pooler URL on Render |

---

## Mobile

| Issue | Impact | Fix |
|-------|--------|-----|
| R8 disabled | ~80MB AAB | Enable shrink + ProGuard rules |
| Large `BookingScreen` | Slow re-renders | Split components, memoize slot grid |
| Query persist 1h stale | Stale UI | Lower global staleTime; override per query |
| 77+ console.logs | Minor perf | Babel strip in prod |
| Unused deps | Bundle size | Remove `crypto-js`, `react-native-web` if unused |
| Map clustering | Main thread | Limit markers; virtualize list |

### React Query defaults (`App.tsx`)
- Consider `staleTime: 5 * 60 * 1000` global
- Bookings/slots: `staleTime: 0`, `refetchOnWindowFocus: true`

---

## Web

| Issue | Impact | Fix |
|-------|--------|-----|
| CRA bundle size | Slow FCP | Code split routes (lazy) |
| No lazy routes | Large initial JS | `React.lazy` per page |
| Console API logging | Main thread | Remove |
| Full salon list images | LCP | Image CDN + lazy load |

---

## Caching strategy (recommended)

| Resource | TTL | Store |
|----------|-----|-------|
| Salon detail | 5 min | React Query |
| Slots | 30 sec | React Query + realtime invalidate |
| User profile | 5 min | Zustand + `/auth/me` |
| Nearby salons | 2 min | React Query |

---

## Scalability path

**Phase 1 (0–1k DAU):** Current stack + rate limits + slot index  
**Phase 2 (1k–10k):** Redis, async Supabase, Render autoscale  
**Phase 3 (10k+):** Read replicas, CDN for images, queue for push

---

## Monitoring

| Signal | Tool |
|--------|------|
| API latency | Sentry performance |
| Error rate | Sentry |
| DB slow queries | Supabase dashboard |
| Mobile crashes | Sentry (set DSN) |
| Push delivery | Expo push receipts (to implement) |
