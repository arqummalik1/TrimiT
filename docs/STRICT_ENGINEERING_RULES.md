# TrimiT Production Engineering Rules

Last verified: 2026-09-01  
Applies to: the entire repository, production database, backend, mobile app, and web app

## 1. Authority and purpose

TrimiT is a live production system. These rules are mandatory for every human or
AI agent that reviews or changes this repository. Read this file completely
before doing any work. The root `AGENTS.md` makes this document part of the
repository-wide instructions.

The goal is to prevent a change in one layer from silently breaking an existing
contract in another layer. A database migration, PostgREST query, backend route,
mobile type, and web consumer are parts of one production contract.

## 2. Non-negotiable working rules

1. Never assume the current branch, schema, relationship names, API shape,
   deployed migration state, user roles, or client behavior. Inspect and verify.
2. Start every task with `git status`, the current branch, relevant history, and
   the closest source, tests, migrations, and consumers.
3. Preserve unrelated user changes. Never clean, reset, overwrite, or reformat
   unrelated work.
4. Diagnose before editing. Record the observed failure, the exact failing layer,
   the root cause, and the smallest safe repair.
5. Prefer the smallest compatible change. Do not redesign, refactor, harden, or
   migrate unrelated behavior during a bug fix.
6. Do not change public response keys, field meanings, status values, role
   behavior, or endpoint paths without inspecting every mobile and web consumer
   and obtaining explicit approval for a breaking change.
7. Never expose secrets, service-role keys, bank details, private user data, or
   production row contents in logs, tests, screenshots, commits, or reports.
8. Never push, merge, deploy, publish, or apply a production migration unless the
   user explicitly requests that action.
9. Do not claim success from mocked tests alone. Verify the contract that actually
   failed and then run the relevant test/build gates.
10. If evidence conflicts or required information is unavailable, stop and ask;
    do not guess.

## 3. Sources of truth

Use all applicable sources. No single source is sufficient for a cross-layer
change.

- Database structure: ordered SQL files under `database/` plus the verified live
  schema when production behavior is at issue.
- Migration order and operating notes: `docs/database/MIGRATION_ORDER.md`.
- Backend API behavior: `backend/routers/`, `backend/services/`, models, and
  dependencies.
- Mobile contract: `mobile/src/services/`, `mobile/src/repositories/`,
  `mobile/src/types/`, stores, hooks, and screens/components.
- Web contract: `frontend/src/repositories/`, `frontend/src/lib/`, hooks, and
  pages/components.
- Booking design: `docs/architecture/booking-flow.md`.
- Historical intent: the exact commits that introduced or changed the relevant
  schema and code. History explains intent but does not override current code or
  live evidence.

When inspecting production, use the least-privileged read-only check that can
prove the issue. Never print credentials or personal field values.

## 4. Production booking contract — protect this behavior

The current booking system is intentionally split into several flows. A fix to a
read endpoint must not rewrite the booking engine.

### 4.1 Creation and capacity

- Slot discovery is handled by `GET /api/v1/bookings/slots`.
- A checkout hold is requested through `POST /api/v1/bookings/reserve` and the
  `reserve_slot_v1` database RPC, with the documented service-role fallback.
- Booking creation uses `POST /api/v1/bookings/`, an idempotency key, and the
  `create_atomic_booking` RPC.
- Capacity, holds, overlapping service duration, staff availability, and
  duplicate-request protection are concurrency-sensitive. Do not replace the
  atomic RPC with application-side read-then-write logic.

### 4.2 Read endpoints

These routes return joined booking data and share an established response shape:

- Customer or manager list: `GET /api/v1/bookings/`
- Explicit salon-manager list: `GET /api/v1/bookings/salon/{salon_id}`
- Authorized detail: `GET /api/v1/bookings/{booking_id}`

Existing clients expect these nested keys:

- `salons`: the booked salon
- `services`: the booked service
- `users`: the customer who owns `bookings.user_id`

The `users` key is consumed by mobile booking cards and notifications and by web
owner booking pages and dashboard notifications. Preserve that key. Do not rename
it to `customer`, `booking_user`, or a constraint-generated name without a
coordinated, versioned client migration.

### 4.3 Authorization and private data

- A customer may list and open only their own bookings.
- An owner or linked employee may list and open only bookings for salons they
  manage. Keep the `assert_salon_manager` / managed-salon authorization checks.
- Service-role reads bypass RLS; therefore backend authorization must happen
  before data is returned. Service role is not a substitute for relationship
  disambiguation or access control.
- Nested salon objects returned to clients must have all `_BANK_FIELDS` removed.
- Never broaden a booking query or response merely to make a failing request pass.

### 4.4 Status and payment behavior

- Customers may cancel only their own eligible bookings.
- Managers follow the transition table in `backend/routers/bookings.py`.
- UPI confirmation/completion remains blocked until manual payment verification
  succeeds.
- `bookings.verified_by` records the verifier and is separate from
  `bookings.user_id`, which records the customer.
- Cash/UPI semantics, booking statuses, payment statuses, rescheduling, push
  notifications, reviews, and realtime invalidation are outside the scope of a
  booking-read fix unless evidence proves otherwise.

## 5. PostgREST relationship rules

PostgREST derives embedded-resource relationships from foreign keys. Therefore a
foreign-key migration is also an API-query change even if no column or endpoint is
renamed.

The production `bookings` table has two relationships to `public.users`:

| Meaning | Column | Constraint | Delete behavior |
| --- | --- | --- | --- |
| Booking customer | `bookings.user_id` | `bookings_user_id_fkey` | cascade |
| Payment verifier | `bookings.verified_by` | `bookings_verified_by_fkey` | set null |

Rules:

1. Never use an ambiguous embed such as `users(*)` from `bookings`.
2. Select the intended foreign key explicitly and preserve the public alias. For
   the booking customer, use
   `users:users!bookings_user_id_fkey(id,name,phone)`.
3. Select only fields required by current consumers. Do not return every user
   column with `*` when a small allowlist satisfies the contract.
4. When adding, dropping, or renaming any foreign key, search the entire backend,
   mobile app, web app, tests, SQL functions, and documentation for every embed or
   relationship-dependent query involving both tables.
5. Test the exact generated PostgREST `select` expression. A mock that returns
   HTTP 200 for every `/bookings` request cannot detect relationship ambiguity.
6. When possible, run a read-only schema-compatible query against the target
   environment before deployment. Validate status, error code, top-level keys,
   nested keys, and authorization without printing row values.
7. Do not remove a valid integrity constraint merely to make shorthand embeds work.
   Fix the query to state which relationship it needs.

## 6. Database migration rules

1. Production migrations are forward-only. Never edit an already-applied SQL file
   as a substitute for a new migration, and never roll it back casually.
2. Before writing a migration, inspect the complete ordered migration history and
   the current live schema. `IF EXISTS` / `IF NOT EXISTS` does not prove semantic
   safety.
3. Every migration must document purpose, prerequisites, data behavior,
   constraints, RLS/grant effects, backward compatibility, validation query, and
   rollback or forward-repair strategy.
4. Treat all of these as cross-layer API changes: foreign keys, grants, RLS,
   column privileges, constraints, enums/checks, triggers, RPC signatures,
   defaults, nullability, and cascade behavior.
5. For every changed table, inventory all PostgREST embeds and direct Supabase
   queries before applying the migration.
6. Validate migration behavior on a representative schema before production and
   run smoke tests immediately after application.
7. Keep migration-order documentation synchronized.
8. Migration 63 is valid and must remain: `bookings_verified_by_fkey` preserves a
   booking while setting a deleted verifier to null. The correct repair for the
   2026-09-01 incident is an explicit customer embed, not removal of this
   constraint and not another migration.

## 7. API compatibility rules

1. Existing released mobile apps may remain installed after a backend deploy.
   Backend responses must remain backward compatible with those clients.
2. Before changing a response, search for the endpoint and every affected field in
   both `mobile/` and `frontend/`.
3. Preserve nesting and nullability unless all callers are migrated together.
4. Additive fields are safer than renames/removals, but still require privacy and
   serialization review.
5. Error handling must retain the repository's structured API error convention.
   Log actionable upstream status/error codes on the server without leaking
   secrets or personal data to clients.
6. Backend routes using service role must perform explicit tenant authorization
   and return only authorized, allowlisted data.

## 7.1 Owner onboarding contract (release 1.1.0)

1. Opening owner onboarding is navigation, not authorization. It must not change
   `public.users.role`, create a subscription, or remove customer navigation.
2. Mobile keeps `CustomerTabs` below the reversible `OwnerOnboarding` root stack
   until final salon creation succeeds. Header back, iOS gesture back, and
   Android hardware back must return to the customer Profile screen. Web owner
   setup routes must likewise remain escapable to the customer account.
3. The first salon and customer-to-owner role transition must use
   `activate_owner_and_create_salon_v1`; never reintroduce an application-side
   role-update followed by a separate salon insert.
4. Update the local role and reset to `OwnerTabs` only after the atomic endpoint
   returns a salon row. On failure or app restart, the identity remains customer.
5. Customers cannot use the owner-only upload endpoint during draft setup. Add
   salon photos after successful creation unless a separately authorized draft
   media design is reviewed and implemented.
6. Recovery from a legacy owner-without-salon state may never delete a salon or
   paid billing history. Use the guarded backend/database recovery contract.
7. The later multi-role design is governed by
   `docs/architecture/identity-workspace-membership-migration.md` and must use an
   additive expand-contract rollout.

## 8. Required testing and verification

Tests must prove behavior and integration contracts, not merely execute lines.

For any booking read change, cover at minimum:

1. Customer list filters by the authenticated `user_id`.
2. Owner/employee list filters by managed salon IDs.
3. Explicit salon list enforces manager access.
4. Detail returns 404 when absent and 403 for an unauthorized customer/manager.
5. Customer relationship uses `bookings_user_id_fkey` and retains the `users`
   alias on list and detail queries.
6. Supabase reads use the intended credential mode.
7. Salon bank fields are stripped from every returned nested salon object.
8. Upstream PostgREST errors are not mistaken for empty booking lists.

For mocked Supabase tests, assert the exact method, query path/select expression,
filters, and security kwargs in `mock_supabase.called`. Returning a canned 200 is
not enough.

Before handing off a booking/backend change, run as applicable:

- Targeted backend tests for the changed routes.
- Full backend test suite.
- Mobile TypeScript typecheck and relevant mobile tests.
- Web test suite and production build.
- Read-only PostgREST contract probe when the defect depends on live schema
  relationships, RLS, grants, or RPC signatures.
- Final `git diff --check`, `git diff`, and `git status` review.

If any required gate cannot run, report exactly which gate and why. Do not replace
it with a success claim.

## 9. Deployment and incident rules

1. Separate code changes, database migrations, and deployment steps in the plan.
   A backend-only repair must not include an unnecessary SQL migration or mobile
   release.
2. Define smoke tests before deployment: customer list, manager list, detail,
   create, cancel/reschedule, and UPI verify/status behavior as relevant.
3. Monitor structured backend logs for the affected route and upstream PostgREST
   error code after deployment.
4. Keep a fast forward-fix path. Do not “repair” production by weakening RLS,
   dropping integrity constraints, or exposing service-role credentials.
5. Record incidents with evidence: introduction commit/migration, exact upstream
   error, why tests missed it, the compatibility-preserving fix, and the new
   regression test.

## 10. 2026-09-01 booking incident — permanent lesson

Migration 63 added `bookings_verified_by_fkey` for correct account-deletion
behavior. The booking read query still used `users(*)`, which had worked when
`bookings.user_id` was the only relationship from bookings to users. After the new
foreign key, PostgREST could no longer infer whether `users` meant the customer or
the payment verifier and returned `PGRST201` with HTTP 300. The backend converted
that upstream failure to a 500, so clients showed a booking load error.

Switching the same ambiguous query to service role did not and cannot fix this:
service role bypasses RLS, while `PGRST201` is relationship-resolution failure.
Booking creation continued to work because its RPC path does not use this embed.

Permanent repair requirements:

- Keep migration 63 and both relationships.
- Embed the customer explicitly with
  `users:users!bookings_user_id_fkey(id,name,phone)`.
- Apply the same contract to customer list, manager/salon list, and detail reads.
- Preserve the nested `users` key expected by released mobile and web clients.
- Lock the exact query into regression tests so a generic mocked 200 cannot hide
  the same class of failure again.

## 11. Completion checklist for every agent

Before reporting completion, confirm all applicable items:

- [ ] Read `AGENTS.md` and this entire document.
- [ ] Verified branch, status, relevant history, current code, migrations, tests,
      and consumers.
- [ ] Reproduced or proved the root cause with evidence.
- [ ] Kept the patch minimal and preserved unrelated work.
- [ ] Reviewed database relationship, RLS/grant, privacy, and API compatibility
      impact.
- [ ] Added meaningful regression tests that assert the real contract.
- [ ] Ran the required targeted and full verification gates.
- [ ] Reviewed final diff and status for accidental or generated changes.
- [ ] Clearly reported changed files, test results, residual risks, and deployment
      needs.
- [ ] Did not push, deploy, or apply a migration without explicit user approval.
