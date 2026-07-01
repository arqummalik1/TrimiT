# Requirements Document

## Introduction

This feature adds phone-number OTP authentication to TrimiT for both login and signup, alongside
the existing email OTP flow, which remains a fully working fallback. In India, users frequently
mistype or forget email addresses, so a phone number is the more reliable identifier (matching
Zomato, Swiggy, Uber). A second driver is that Supabase's email OTP applies an aggressive
multi-hour lockout after a few rapid requests, producing poor UX. Phone-first authentication
plus an owned, short-cooldown throttle layer fixes both problems.

Phone OTP is delivered through Supabase native Phone Auth with Twilio Verify as the SMS
provider (Twilio credentials live in the Supabase dashboard, not in this repository). No custom
OTP table is introduced; TrimiT reuses Supabase sessions. A single smart input field accepts
either an email or a phone number and routes to the matching OTP path. At launch only India
(+91) is offered via a country-code selector, but the selector is architected to enable more
countries later through configuration. All phone numbers are stored and transmitted in E.164
format.

Identity is per-method with no account linking in v1: a user who registered with a phone logs in
only with that phone, and a user who registered with an email logs in only with that email.

This spec also bundles a required change to salon onboarding: the silent default Delhi
coordinates are removed and the salon owner is forced to drop a map pin (auto-filling latitude
and longitude) before Save is allowed, on both mobile and web.

This is a change to a **live production** product. All changes MUST be backwards-compatible and
MUST NOT break the existing email flow, active sessions, or the booking flow. There is no
existing-user migration concern for auth (the owner will recreate accounts), but old Play Store
builds and existing API contracts MUST continue to work.

## External Prerequisites and Assumptions

- **India DLT registration for SMS is PENDING** and will be completed by the product owner. This
  is an external operational prerequisite, not a code requirement, and phone OTP delivery in
  production depends on it being active.
- **Twilio Verify credentials** are configured in the Supabase dashboard by the product owner and
  are not stored in this repository.
- Supabase Phone Auth is enabled at the project level by the product owner.
- The new database migration is applied manually in the Supabase SQL Editor against the
  production project (forward-only, new numbered file).

## Glossary

- **TrimiT**: The salon marketplace platform (mobile app, web app, FastAPI backend, Supabase DB).
- **User**: A person who authenticates with TrimiT as either a Customer or a Salon_Owner.
- **Customer**: A User who books salon services.
- **Salon_Owner**: A User who owns and manages a salon.
- **Identifier**: The value a User enters to authenticate — either an Email or a Phone_Number.
- **Email**: An email address used as an authentication Identifier via email OTP.
- **Phone_Number**: A phone number used as an authentication Identifier, stored and transmitted in E.164_Format.
- **E.164_Format**: The international phone-number format `+<country_code><subscriber_number>`, e.g. `+919876543210`.
- **Country_Code**: The dialing prefix selected in the Country_Selector; the only enabled value at launch is `+91`.
- **Country_Selector**: The UI component that lets a User choose a Country_Code, extensible via configuration.
- **Smart_Input**: The single input field that accepts either an Email or a Phone_Number and routes to the matching OTP path.
- **OTP**: A one-time passcode (6 digits) sent to an Identifier for verification.
- **Phone_OTP_Path**: The authentication flow that sends and verifies an OTP via Supabase Phone Auth (Twilio Verify).
- **Email_OTP_Path**: The existing authentication flow that sends and verifies an OTP via Supabase email OTP.
- **Supabase_Auth**: Supabase's authentication service, the source of sessions and OTP verification.
- **Session**: A Supabase-issued authenticated session (access token + refresh token) reused by TrimiT.
- **Profile**: The `public.users` row for a User, containing name, role, optional email, and optional phone.
- **Role**: The User's role, one of `customer` or `owner`, set once at Profile creation.
- **Throttle_Layer**: TrimiT's own backend rate-limiting layer placed in front of Supabase for OTP sends.
- **Send_Window**: The rolling 15-minute window over which OTP send attempts per Identifier are counted.
- **Cooldown**: The short lockout applied after the send limit is reached, at most 15 minutes.
- **Resend_Countdown**: The client-side visible timer (30–60 seconds) during which the Send/Verify controls are disabled.
- **Map_Pin**: A geographic point (latitude, longitude) placed by a Salon_Owner on a map during salon onboarding.
- **ManageSalon**: The salon create/edit screen on mobile (`ManageSalonScreen`) and web (`ManageSalon`).

## Requirements

### Requirement 1: Single Smart Input Detection

**User Story:** As a User, I want one input field that accepts either my email or my phone number, so that I do not have to choose the login method up front.

#### Acceptance Criteria

1. WHEN a User submits a Smart_Input value that contains the character `@`, THE TrimiT SHALL route the request to the Email_OTP_Path.
2. WHEN a User submits a Smart_Input value that does not contain the character `@`, THE TrimiT SHALL route the request to the Phone_OTP_Path.
3. WHEN the Smart_Input is routed to the Phone_OTP_Path, THE TrimiT SHALL combine the selected Country_Code with the entered digits to form a Phone_Number in E.164_Format before sending the request.
4. IF a Smart_Input value routed to the Email_OTP_Path is not a syntactically valid Email, THEN THE TrimiT SHALL reject the request with a structured error code identifying the Email as invalid and SHALL NOT send an OTP.
5. IF a Smart_Input value routed to the Phone_OTP_Path does not form a valid E.164_Format Phone_Number for the selected Country_Code, THEN THE TrimiT SHALL reject the request with a structured error code identifying the Phone_Number as invalid and SHALL NOT send an OTP.

### Requirement 2: Country Code Selector

**User Story:** As a User, I want to select my country's dialing code, so that my phone number is formatted correctly, while the product can enable more countries later.

#### Acceptance Criteria

1. THE Country_Selector SHALL present `+91` (India) as an enabled, selectable Country_Code.
2. WHEN the Country_Selector is first displayed, THE Country_Selector SHALL default the selected Country_Code to `+91`.
3. THE Country_Selector SHALL determine its set of enabled Country_Codes from a configuration source, such that enabling an additional Country_Code requires only a configuration change and no change to the Smart_Input detection logic.
4. WHERE only one Country_Code is enabled in the configuration, THE Country_Selector SHALL display that Country_Code as the selected value.
5. WHEN a User selects an enabled Country_Code, THE TrimiT SHALL use that Country_Code as the prefix when forming the E.164_Format Phone_Number.

### Requirement 3: Send OTP (Phone and Email)

**User Story:** As a User, I want to receive a one-time passcode on my phone or email, so that I can authenticate without a password.

#### Acceptance Criteria

1. WHEN a User requests an OTP for a valid Phone_Number, THE TrimiT SHALL request Supabase_Auth to send a 6-digit OTP to that Phone_Number via the Phone_OTP_Path.
2. WHEN a User requests an OTP for a valid Email, THE TrimiT SHALL request Supabase_Auth to send an OTP to that Email via the Email_OTP_Path.
3. WHEN an OTP send request is accepted by the Throttle_Layer and forwarded to Supabase_Auth, THE TrimiT SHALL return a response indicating that an OTP has been sent, without disclosing whether a Profile already exists for that Identifier.
4. IF an OTP send request is rejected by the Throttle_Layer, THEN THE TrimiT SHALL NOT forward the request to Supabase_Auth and SHALL return the throttle response defined in Requirement 6.
5. IF Supabase_Auth returns an error for an OTP send request, THEN THE TrimiT SHALL return a structured error response containing an error code and a human-readable message and SHALL NOT expose raw provider error text to the User.

### Requirement 4: Verify OTP

**User Story:** As a User, I want to enter the code I received, so that I am authenticated and given a session.

#### Acceptance Criteria

1. WHEN a User submits an OTP together with a Phone_Number, THE TrimiT SHALL request Supabase_Auth to verify the OTP against that Phone_Number via the Phone_OTP_Path.
2. WHEN a User submits an OTP together with an Email, THE TrimiT SHALL request Supabase_Auth to verify the OTP against that Email via the Email_OTP_Path.
3. WHEN Supabase_Auth confirms that a submitted OTP is valid, THE TrimiT SHALL return the Supabase-issued Session to the client.
4. IF a submitted OTP is invalid or expired, THEN THE TrimiT SHALL return a structured error code indicating verification failure and SHALL NOT issue a Session.
5. WHEN OTP verification succeeds AND a Profile already exists for the verified Identifier, THE TrimiT SHALL treat the User as a returning User and SHALL NOT create a new Profile.
6. WHEN OTP verification succeeds AND no Profile exists for the verified Identifier, THE TrimiT SHALL require completion of the Profile via the complete-profile step defined in Requirement 5 before granting access to Role-protected resources.

### Requirement 5: New Signup — Complete Profile (Phone-Only Supported)

**User Story:** As a new User, I want to complete my profile after verifying my code, so that my account is created with the correct role and identifier.

#### Acceptance Criteria

1. WHEN a User completes Profile creation after verifying via the Phone_OTP_Path, THE TrimiT SHALL create a Profile whose `phone` equals the verified Phone_Number in E.164_Format and whose `email` is null.
2. WHEN a User completes Profile creation after verifying via the Email_OTP_Path, THE TrimiT SHALL create a Profile whose `email` equals the verified Email and whose `phone` is the value the User provided, if any.
3. WHEN a User completes Profile creation, THE TrimiT SHALL set the Role from the client-supplied role hint only when no Profile row already exists for that User.
4. IF a complete-profile request omits the Role, THEN THE TrimiT SHALL reject the request with a structured error code and SHALL NOT create a Profile.
5. IF a complete-profile request omits a name of at least 1 character, THEN THE TrimiT SHALL reject the request with a structured error code and SHALL NOT create a Profile.
6. IF a complete-profile request is submitted for a User that already has a Profile, THEN THE TrimiT SHALL return the existing Profile without changing the existing Role.
7. IF a complete-profile request supplies a Phone_Number that is already stored on another Profile, THEN THE TrimiT SHALL reject the request with a structured error code indicating the Phone_Number is already in use and SHALL NOT create a Profile.

### Requirement 6: Rate-Limit and Anti-Lockout Policy

**User Story:** As a User, I want a fast, forgiving retry experience with only a short cooldown, so that an accidental double-tap or a couple of retries never locks me out for hours.

#### Acceptance Criteria

1. WHILE an OTP send request or an OTP verify request is in flight, THE TrimiT client SHALL keep the corresponding Send or Verify control disabled until the request completes.
2. WHEN an OTP is sent from the client, THE TrimiT client SHALL start a Resend_Countdown between 30 and 60 seconds and SHALL keep the resend control disabled until the Resend_Countdown reaches zero.
3. THE Throttle_Layer SHALL permit at most 5 OTP send attempts per Identifier within any rolling Send_Window of 15 minutes.
4. IF a 6th OTP send attempt for an Identifier occurs within the Send_Window, THEN THE Throttle_Layer SHALL reject the attempt with a structured error code, SHALL apply a Cooldown of at most 15 minutes, and SHALL return a message stating how long the User must wait.
5. THE Throttle_Layer SHALL NOT apply any Cooldown longer than 15 minutes for any Identifier.
6. WHEN a Cooldown for an Identifier elapses, THE Throttle_Layer SHALL again permit OTP send attempts for that Identifier.
7. THE TrimiT SHALL apply the Throttle_Layer independently per Identifier so that throttling one Identifier does not restrict OTP sends for a different Identifier.
8. THE TrimiT SHALL configure the Supabase_Auth and Twilio Verify provider limits to be no more restrictive than the Throttle_Layer limits, so that provider limits act only as an outer anti-fraud net and do not impose a multi-hour lockout during normal use.
9. WHERE the Throttle_Layer detects OTP send attempts across many distinct Phone_Numbers from the same source beyond a configured fraud threshold, THE TrimiT SHALL reject further send attempts from that source with a structured error code to protect against SMS-pumping and SMS cost abuse.

### Requirement 7: Per-Method Identity (No Account Linking in v1)

**User Story:** As a User, I want to sign in with the same method I registered with, so that my account behaves predictably.

#### Acceptance Criteria

1. WHERE a Profile was created via the Phone_OTP_Path, WHEN that User authenticates, THE TrimiT SHALL grant access only through the Phone_OTP_Path for that User's Phone_Number.
2. WHERE a Profile was created via the Email_OTP_Path, WHEN that User authenticates, THE TrimiT SHALL grant access only through the Email_OTP_Path for that User's Email.
3. THE TrimiT SHALL NOT link, merge, or associate a phone-registered Profile with an email-registered Profile in v1.
4. WHEN a User authenticates via an Identifier that has no existing Profile, THE TrimiT SHALL treat the authentication as a new signup and apply Requirement 5.

### Requirement 8: Email OTP Fallback Preserved

**User Story:** As an existing or new User, I want the email OTP option to keep working, so that I can still sign in when I prefer email.

#### Acceptance Criteria

1. THE TrimiT SHALL keep the Email_OTP_Path available for both login and signup.
2. THE TrimiT SHALL preserve the existing request and response shapes of the current email OTP endpoints so that Play Store builds already in the wild continue to function without modification.
3. WHEN a User authenticates via the Email_OTP_Path, THE TrimiT SHALL produce the same Session and Profile behavior that exists before this feature.
4. THE TrimiT SHALL add only new optional fields to existing auth endpoint responses and SHALL NOT remove, rename, or change the type of any field that existing clients already read.

### Requirement 9: Database Schema Change for Phone Identity

**User Story:** As Admin, I want the users table to support phone as a first-class identifier, so that phone-registered users can be stored and uniquely identified.

#### Acceptance Criteria

1. THE TrimiT SHALL make the `public.users.email` column nullable so that a Profile can exist with a Phone_Number and no Email.
2. THE TrimiT SHALL add a `phone` column to `public.users` that stores a Phone_Number in E.164_Format.
3. THE TrimiT SHALL enforce uniqueness of non-null `public.users.phone` values so that at most one Profile exists per Phone_Number.
4. THE TrimiT SHALL create an index on `public.users.phone` to support lookup of a Profile by Phone_Number.
5. THE TrimiT SHALL deliver the schema change as a single new numbered, forward-only migration file in `database/` that contains no DROP, rename, or data-deleting operation against existing tables, columns, policies, triggers, or RPCs.
6. THE TrimiT SHALL keep the schema change backwards-compatible so that existing email-registered Profiles remain valid and readable with no data loss.

### Requirement 10: Map-Pin Required at Salon Onboarding

**User Story:** As a Salon_Owner, I want to place my salon's exact location on a map, so that customers see the correct location and I cannot accidentally submit a wrong default.

#### Acceptance Criteria

1. THE ManageSalon SHALL NOT pre-fill latitude and longitude with the default coordinates `28.6139, 77.2090` or any other silent default location.
2. WHEN a Salon_Owner taps a location on the map in ManageSalon, THE TrimiT SHALL set the salon's latitude and longitude to the tapped Map_Pin coordinates and display the placed Map_Pin.
3. WHILE no Map_Pin has been placed for a salon being created or edited, THE TrimiT SHALL keep the Save control disabled and SHALL indicate that a map location is required.
4. IF a Salon_Owner attempts to save a salon without a placed Map_Pin, THEN THE TrimiT SHALL block the save and display a message that a map location must be selected.
5. WHEN a Salon_Owner places a Map_Pin and saves, THE TrimiT SHALL submit the Map_Pin latitude and longitude to the existing SalonCreate request, which already requires latitude and longitude.
6. THE TrimiT SHALL enforce the Map_Pin requirement consistently on both the mobile ManageSalonScreen and the web ManageSalon.

### Requirement 11: Backwards Compatibility and Live-Safety

**User Story:** As Admin, I want this change rolled out without breaking live users, so that existing sessions, logins, and bookings keep working.

#### Acceptance Criteria

1. THE TrimiT SHALL preserve all existing active Sessions so that currently signed-in Users remain signed in through this change.
2. THE TrimiT SHALL keep the booking flow, including slot holds, atomic booking, capacity, reschedule, and realtime subscriptions, unchanged by this feature.
3. WHEN an old Play Store build calls the existing email OTP endpoints, THE TrimiT SHALL respond with the existing contract so that the old build continues to function.
4. THE TrimiT SHALL NOT store, log, or place Twilio credentials in this repository, and SHALL rely on Supabase-managed provider configuration for SMS delivery.
5. IF phone OTP delivery is unavailable because the external SMS prerequisite is not active, THEN THE TrimiT SHALL return a structured error code for phone OTP requests and SHALL keep the Email_OTP_Path fully functional.
