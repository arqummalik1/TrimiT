# Identity + workspace membership migration plan

Status: planned for a later branch; **not implemented in release 1.1.0**  
Last verified: 2026-09-04  
Owners: mobile, web, backend, and database teams

## 1. Why this exists

Release 1.1.0 keeps the current Option 1 model: one `public.users.role` chooses the
active customer, owner, or employee experience. Owner setup is now reversible,
but after a salon is successfully created the identity becomes an owner.

Option 2 removes that limitation. One signed-in identity will always remain able
to act as a customer and may also hold membership in one or more salon
workspaces. “Customer” becomes a capability every identity has, while owner,
admin, and employee become permissions inside a specific workspace.

This document is the required implementation plan for that later change. Do not
skip phases or turn it into a single destructive migration.

## 2. Target model

### Identity

`public.users` represents the human account only: ID, name, email, phone,
preferences, safety state, and timestamps. It must not decide which workspace UI
the person may open.

### Business workspace

For the first release, an existing `public.salons` row is the workspace. A
separate `workspaces` table is unnecessary unless TrimiT later needs non-salon
businesses or multiple branches under one organization.

### Membership

Add a table similar to:

```sql
salon_memberships (
  id uuid primary key,
  salon_id uuid not null references salons(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'employee')),
  status text not null check (status in ('pending', 'active', 'revoked')),
  invited_by uuid null references users(id) on delete set null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (salon_id, user_id)
)
```

An active owner membership grants owner access to that salon. An active employee
membership replaces the authorization meaning currently split between
`public.users.role = 'employee'` and `staff.user_id`.

### Active workspace

The selected customer/business mode and selected salon are session preferences,
not authorization. The client may remember `activeWorkspaceId`, but every backend
request must re-check an active membership. A forged client preference must never
grant access.

## 3. Contracts that must not change

- `auth.users.id` and `public.users.id` remain stable. Never create replacement
  identities during migration.
- Existing customer, salon, service, booking, review, subscription, payment, and
  notification IDs remain stable.
- `bookings.user_id` continues to mean the customer who made the booking, even
  when that person also owns a salon.
- `bookings.verified_by` continues to mean the payment verifier. Keep the explicit
  PostgREST customer embed:
  `users:users!bookings_user_id_fkey(id,name,phone)`.
- Released mobile versions must keep working throughout the rollout. Do not
  remove or reinterpret `users.role` until those versions have been retired.
- Existing `/api/v1` response keys and status meanings stay backward compatible.
- A membership read never exposes bank details, service-role credentials, or
  another workspace's private data.

## 4. Expand-contract rollout

### Phase 0 — inventory, backup, and acceptance criteria

1. Freeze the relevant schema/API contract for the release window.
2. Take a restorable production backup and record the restore procedure.
3. Read-only audit counts:
   - users by current role;
   - salons by `owner_id`, including duplicate owners and missing owners;
   - staff rows by `user_id` and `app_access_status`;
   - users linked to more than one staff row;
   - subscriptions with missing or mismatched owner/salon references;
   - bookings whose customer or salon reference is invalid.
4. Define reconciliation acceptance: every salon has exactly one active owner
   membership; every active linked employee has the expected active membership;
   no customer, booking, salon, or subscription count changes.
5. Capture only aggregate counts and IDs required for repair. Never export PII to
   logs or migration reports.

Stop if the audit finds an ownership ambiguity. Resolve it explicitly before any
backfill.

### Phase 1 — additive schema only

1. Add `salon_memberships`, indexes on `user_id`, `salon_id`, and active status,
   timestamps, check constraints, and the unique `(salon_id, user_id)` key.
2. Enable RLS immediately. Users may read only their own membership rows; direct
   client writes remain denied. Backend service-role writes require explicit
   authorization.
3. Add backend-only membership RPCs for atomic invite acceptance, membership
   changes, and first salon creation.
4. Do not change `users.role`, `salons.owner_id`, `staff.user_id`, or any existing
   authorization read yet.
5. Deploy and verify that old clients behave exactly as before.

Rollback at this phase is an application rollback: stop using the new tables.
Leave additive schema in place until a later reviewed cleanup migration.

### Phase 2 — idempotent backfill

1. Insert one active `owner` membership for every `salons.owner_id`.
2. Insert an active `employee` membership only for staff rows with a non-null
   `user_id` and `app_access_status = 'active'`.
3. Use `INSERT ... ON CONFLICT ...` so the backfill can safely resume.
4. Backfill in bounded batches if table size requires it; record checkpoints.
5. Do not update user roles or delete legacy links.
6. Run both aggregate and anti-join validation after every batch.

The backfill is complete only when expected and actual membership sets match,
not merely when the SQL command exits successfully.

### Phase 3 — dual-write and shadow-read

1. Update all backend owner/staff mutation paths to write both the legacy fields
   and membership rows in one database transaction.
2. Keep legacy authorization authoritative initially.
3. For each authorization decision, compute the membership result in shadow mode
   and emit privacy-safe mismatch metrics. Do not change the response based on
   the shadow result.
4. Cover owner dashboard, bookings, services, salon updates, staff, promotions,
   subscriptions, banking, availability, uploads, and notifications.
5. Run until mismatch counts remain zero over a representative production period.

If mismatches appear, disable shadow evaluation and repair forward. Do not delete
membership rows wholesale.

### Phase 4 — membership-authoritative backend behind a flag

1. Add a server-side feature flag for membership authorization; default it off.
2. Change shared helpers such as salon-manager authorization first, then migrate
   endpoints in small groups.
3. The authenticated user ID plus requested salon ID must resolve to an active
   membership with sufficient role. Never trust a role or workspace ID sent by
   the client without this check.
4. Preserve old response shapes. Legacy clients may still receive a compatibility
   `profile.role` derived from membership while they are active.
5. Roll out to internal accounts, then a small percentage, then all accounts.
6. Roll back by switching the read flag to legacy authorization; dual-write stays
   enabled so no new relationship data is lost.

### Phase 5 — client workspace switcher

1. Mobile and web always offer the customer workspace.
2. If active memberships exist, show an explicit workspace switcher listing only
   authorized salons and the user's role in each.
3. Selecting a business workspace resets only business navigation state; signing
   out is not required. Selecting customer mode returns to the existing customer
   tabs and booking history.
4. Deep links and notifications carry a destination workspace ID. The backend
   validates membership before the client switches.
5. A revoked membership removes that workspace locally after the next refresh and
   returns the user safely to customer mode.
6. Persist only the workspace ID, never a locally trusted permission snapshot.

### Phase 6 — cutover and compatibility period

1. Make membership authorization authoritative only after shadow metrics and all
   acceptance tests pass.
2. Keep dual-write, `users.role`, `salons.owner_id`, and `staff.user_id` through a
   documented old-client support window.
3. Monitor authorization denials, cross-workspace attempts, missing membership
   errors, booking success, and owner task success by app version.
4. Publish updated privacy/terms copy. The current terms say one role per account
   and must be revised before multi-workspace behavior is released.

### Phase 7 — contract cleanup in a separate release

Only after old clients are below the agreed support threshold:

1. Stop dual-writing legacy role semantics.
2. Remove code reads of `users.role`, then prove repository-wide that none remain.
3. Retain `salons.owner_id` as a denormalized primary-owner reference if useful,
   or remove it only after every subscription/admin/reporting consumer is moved.
4. Retain `staff.user_id` if it still identifies the bookable staff profile; do
   not confuse it with authorization membership.
5. Drop legacy constraints/columns only through a new reviewed forward migration,
   never by editing old migrations.

## 5. First-salon transaction under Option 2

The final create action must atomically:

1. lock the identity and verify it is active;
2. ensure the requested idempotency key has not completed before;
3. insert the salon;
4. insert the active owner membership;
5. create/link the trial subscription;
6. return the salon, membership, and approved next destination.

Any failure rolls back all five writes. Merely opening onboarding, selecting a
business type, or uploading draft media must grant no permissions.

## 6. Testing matrix

- Existing customer upgrades and still sees all prior bookings/reviews.
- Owner books another salon as a customer using the same identity.
- Owner switches between customer and their salon without re-authentication.
- Multi-salon member switches only among authorized salons.
- Employee invite accept/revoke and owner/admin permission boundaries.
- Two concurrent first-salon requests create one salon and one owner membership.
- Lost-response retry returns the original successful result without duplicates.
- Membership denial cannot be bypassed with a forged salon/workspace ID.
- Customer/owner/employee booking list and detail retain the established nested
  `salons`, `services`, and `users` contract.
- Account deletion, salon deletion, subscription lifecycle, media cleanup,
  notification routing, and RLS behave correctly.
- Last supported legacy mobile build passes login, booking, and owner management
  smoke tests before every backend cutover.

## 7. Deployment checklist

1. Database additive migration.
2. Read-only schema/grant/RLS validation.
3. Backward-compatible backend with feature flags off.
4. Idempotent backfill and reconciliation report.
5. Dual-write plus shadow-read observation.
6. New web/mobile clients with workspace switcher.
7. Percentage backend cutover with rollback flag ready.
8. Booking and owner smoke tests after every stage.
9. Only later, and in a separate change, legacy contract cleanup.

No stage may be combined merely to save release time. The safe path protects the
existing customer base precisely because every structural change is additive,
measured, reversible at the application layer, and compatible with old clients.
