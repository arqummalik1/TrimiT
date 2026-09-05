# Returning a User to the Same Place After Sign-In

Last reviewed: 2026-09-03  
TrimiT implementation: React Native, React Navigation 7, Zustand

## What this pattern is called

The clearest name is **post-authentication intent restoration**. It is also
commonly called a **return-to-intent flow**, **deferred navigation**, or a
**post-login redirect**.

The important word is *intent*. The app remembers what the guest intended to do,
not merely which screen happened to be visible.

Example:

`Service details → Book → Sign in → Verify → Booking for the same service`

## The problem it solves

A basic authentication gate often sends everybody to Home after sign-in. That
forces a guest to find the salon and service again. A return-to-intent flow keeps
the public browsing history, pauses the protected action for authentication,
and resumes that exact approved action afterward.

## TrimiT's flow in simple steps

1. The guest presses a protected action such as **Book**.
2. Before opening sign-in, the app saves a small typed intent such as:

   ```ts
   {
     kind: 'customer_booking',
     salonId: '...',
     serviceId: '...',
     createdAt: 123,
     expiresAt: 456,
   }
   ```

3. The Auth flow opens above the existing customer navigation. The Discover,
   salon, and service screens remain underneath; they are not rebuilt.
4. Email OTP, Apple, Google, or password authentication updates the shared
   session state. An individual Auth screen does not guess the final route.
5. One coordinator waits until all required state is ready:

   - navigation is mounted;
   - the pending-intent store has finished loading;
   - authentication succeeded;
   - the user's profile and role are known.

6. The coordinator consumes the intent exactly once and maps it to an approved
   destination.
7. If the correct workspace already exists under Auth, one atomic `popTo`
   action removes the complete Auth modal and supplies the nested Booking
   destination. This preserves the customer's earlier Discover history.
8. If the required workspace does not exist—for example, an owner destination
   from a customer workspace—the app resets to one correct workspace instead of
   leaving incompatible navigation underneath.

In TrimiT the saved intent expires after **20 minutes**. It preserves the chosen
salon and service, not every unsaved form field. While the app stays open, the
existing screen stack preserves the browsing history. After an app restart,
the persisted intent can restore the destination, but it does not reconstruct
the exact old scroll position or every previous screen.

Returning to Booking does **not** automatically create or pay for a booking.
The user still confirms contact details, chooses current availability, and
completes the normal checkout. Server-side authorization and booking validation
remain authoritative; a saved destination is not permission to perform an action.

## Why the earlier implementation flashed and returned to OTP

The old completion step used an ordinary `navigate(CustomerTabs, ...)` call.
Auth was a root modal above `CustomerTabs`, so the Booking destination could be
updated underneath while the Auth modal remained mounted. Booking appeared
briefly during the transition, and the OTP screen then covered it again.

The repair uses a root-stack action with the meaning "remove Auth and resume
this destination". The app no longer treats those as two unrelated operations.

## The reusable architecture

Use four small responsibilities in another application:

### 1. A typed, allow-listed intent

Store business actions, not arbitrary route names:

```ts
type PendingAuthIntent =
  | { kind: 'checkout'; productId: string }
  | { kind: 'saved_items' }
  | { kind: 'write_review'; orderId: string };
```

This prevents stale or manipulated storage from navigating anywhere in the app.

### 2. One authentication gate

```ts
function requireAuthentication(intent: PendingAuthIntent) {
  if (session.isAuthenticated) {
    resume(intent);
    return;
  }

  pendingIntentStore.save(intent);
  rootNavigation.navigate('Auth');
}
```

Every protected action uses this gate instead of implementing its own login
redirect logic.

This is illustrative code for another app. In TrimiT, screens check whether
authentication is required before calling `requestAuthentication`; the helper
then saves the intent and opens Auth.

### 3. One post-auth coordinator

The coordinator observes authentication and profile readiness, takes the saved
intent once, validates it, resolves the permitted destination, and dispatches
one root navigation action. OTP, Apple, Google, and password screens therefore
all have identical return behavior.

### 4. An atomic root transition

With React Navigation 7:

```ts
if (rootRouteNames.includes(destination.name)) {
  navigation.dispatch(StackActions.popTo(destination.name, destination.params));
} else {
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: destination.name, params: destination.params }],
    }),
  );
}
```

Use `popTo` when the correct application workspace is already under Auth. Use
`reset` only when changing to a workspace that is not present. Do not first
navigate to the destination and then separately close Auth; that creates a race
and a visible flash.

## Cancellation and reliability rules

- Give Auth an explicit Close action.
- Closing Auth clears the saved intent and reveals the unchanged guest screen.
- Disable native swipe dismissal when it can bypass intent cleanup.
- Add an expiry time so an old intent cannot unexpectedly resume days later.
- Persist the intent only if an app restart must preserve the flow.
- Validate persisted data before using it.
- Consume the intent once to prevent navigation loops.
- Block duplicate OTP submissions while the first verification is unresolved.
- Never store passwords, OTP codes, access tokens, or unnecessary personal data
  in the intent.
- Resolve destinations using the authenticated user's current permissions and
  role; never trust a role saved before authentication.

## What to log while debugging

For the 1.1.0 release, the shared debug/info console output is commented out.
The trace code and call sites are retained, but do not currently print. See
[Restoring debug logs safely](../../mobile/docs/RELEASE_DIAGNOSTICS.md) to
temporarily enable them locally and turn them off again before release.

Development logs should contain only:

- the intent kind;
- the root route names before completion;
- the approved destination name;
- the active screen-name path after navigation;
- whether authentication succeeded.

Do not log email addresses, OTP codes, access tokens, full route parameters, or
customer records.

## Safe areas when authentication opens as a native modal

A modal is a separate native presentation, not just a view inside the page.
Give its root its own `SafeAreaProvider`, and let the screen's `ScreenWrapper`
apply the safe-area padding once. Do not add `insets.top` again inside a header
that is already below a top-safe-area wrapper.

TrimiT's `AuthStack` owns this provider. It does not reuse startup
`initialWindowMetrics` because the Auth provider remounts each time it opens.
The library recommends modal-level providers where needed and cautions against
using startup metrics for remounting providers. See the official
[provider guidance](https://appandflow.github.io/react-native-safe-area-context/api/safe-area-provider/)
and [initial-metrics guidance](https://appandflow.github.io/react-native-safe-area-context/optimizations/).

Login, OTP, and My Offers use `ScreenHeader`: the same minimum height, side
spacing, and 44-point control slots. The header stays outside scrolling content
and can grow for larger accessibility text. No device-specific notch height is
hard-coded.

## Tests that protect the flow

At minimum, test that:

1. every intent maps to the expected allow-listed destination;
2. an existing workspace produces `POP_TO`, removing Auth;
3. a missing workspace produces one clean `RESET`;
4. an intent is consumed only once and expires;
5. cancelling Auth clears the intent;
6. repeated Verify presses cause one OTP request;
7. logs contain screen names but no parameters or personal information;
8. a real device completes `guest → protected action → Auth → original action`.

## TrimiT reference files

- `mobile/src/lib/authGate.ts` — captures protected actions.
- `mobile/src/store/pendingAuthIntentStore.ts` — validates, persists, expires,
  consumes, and clears pending intents.
- `mobile/src/navigation/index.tsx` — coordinates authentication readiness.
- `mobile/src/navigation/postAuthNavigation.ts` — maps intents and builds the
  atomic root action.
- `mobile/src/navigation/navigationTrace.ts` — privacy-safe route tracing.
- `mobile/src/screens/auth/LoginScreen.tsx` — explicit cancellation behavior.
- `mobile/src/navigation/AuthStack.tsx` — native modal safe-area boundary.
- `mobile/src/components/ScreenHeader.tsx` — shared header geometry.

## Short rule to remember

**Save the intended action, authenticate once, validate current permissions,
remove Auth atomically, and resume the action exactly once.**
