# Requirements Document

## Introduction

This feature integrates the **PayU** payment gateway with **automatic split settlements** into TrimiT, a live production salon marketplace in India. When a Customer books and pays online for a salon service, the captured money is automatically routed and settled to that specific Salon_Owner's bank account, minus a platform Commission that TrimiT retains.

To enable this, Salon_Owners provide bank and KYC details during onboarding. These details are stored securely now and used later to register each salon as a PayU vendor (sub-merchant). PayU split settlement is not yet activated on the account (2-3 days away), but PayU test mode is available, so the full integration is built and verified in test mode first.

This is an **additive, feature-flagged** change to a live product. The entire online-payment and payout path is gated behind a server-controlled Feature_Flag that is **disabled by default**. While the flag is disabled, every existing flow — booking, slot holds, atomic booking RPC, auth, realtime, and the current Pay-at-Salon / cash path — behaves exactly as it does today, and old Play Store builds keep working unchanged.

This document also reconciles an existing storage bug:
- Migration `database/47_salon_bank_details.sql` added `bank_account_number`, `bank_ifsc`, and `bank_account_holder_name` columns directly to `public.salons`.
- `backend/services/bank_account_service.py` instead reads and writes a separate `salon_bank_accounts` table that has **no migration** in `database/`, so it does not exist in production and the current "register bank account" endpoints are effectively broken.
- The service stores only `account_number_last4`, never the full account number, which is unusable for real payouts.

This feature defines a single canonical, secure storage location for full bank and KYC details and corrects the broken behavior additively.

## Glossary

- **TrimiT**: The salon marketplace platform (mobile app, web app, FastAPI backend, Supabase database).
- **Customer**: A user who books and pays for salon services.
- **Salon_Owner**: A user who owns a salon, submits bank and KYC details, and receives settlements.
- **Admin**: A TrimiT operator who monitors payments, settlements, and failures.
- **Booking**: A reservation of one or more services at a salon for a specific slot.
- **PayU**: The payment gateway and split-settlement provider used by this feature.
- **PayU_Test_Mode**: The PayU sandbox environment used to verify the integration before live split settlement is activated.
- **Vendor**: A PayU sub-merchant record representing a single salon that receives split settlements.
- **Vendor_Status**: The state of a salon's Vendor registration: `not_registered`, `pending`, `active`, `rejected`, or `suspended`.
- **Bank_Details**: A Salon_Owner's payout bank data: account holder name, full bank account number, and IFSC.
- **KYC_Details**: A Salon_Owner's identity and business data: PAN, business/legal name, phone, email, address, pincode, and optional GSTIN.
- **Bank_KYC_Record**: The single canonical stored record holding a salon's Bank_Details and KYC_Details.
- **Commission**: The platform fee, in paise, that TrimiT retains from each online Payment. Default 5% of the Payment amount, configurable by an Admin.
- **Commission_Rate**: The percentage TrimiT retains, stored server-side, default 5, adjustable by an Admin.
- **PayU_Fee**: PayU's gateway fee (approximately 2%) deducted on each Payment, borne by the salon as part of the total disclosed deduction.
- **Total_Deduction**: The combined Commission plus PayU_Fee disclosed to the Salon_Owner (default approximately 7%).
- **Split_Settlement**: PayU's routing of the captured Payment so the salon's portion settles to the salon's Vendor and TrimiT retains the Commission.
- **Settlement**: PayU's actual transfer of the salon's portion into the salon's bank, which occurs after a PayU-defined delay (T+n), separately from the Payment reaching `paid`.
- **Settlement_Status**: The state of a salon's Split_Settlement: `pending`, `settled`, or `failed`.
- **Payment**: A record linking a PayU order/transaction to a Booking, with a lifecycle status.
- **Payment_Status**: The state of a Payment: `pending`, `paid`, `failed`, `refunded`, or `partially_refunded`.
- **Refund**: A full or partial return of funds to a Customer for a Payment.
- **Refund_Status**: The state of a Refund: `initiated`, `processing`, `completed`, or `failed`.
- **Callback**: A browser redirect from PayU to TrimiT carrying a transaction result (success/failure).
- **Webhook**: An asynchronous server-to-server event sent by PayU about a transaction, refund, or settlement.
- **Idempotency_Key**: A unique key on a mutating request that prevents duplicate processing on retry.
- **Feature_Flag**: A server-controlled toggle named `PAYU_PAYOUTS_ENABLED` that gates the entire online-payment and payout path.
- **Hash**: A PayU request/response signature (SHA-512) used to authenticate and verify PayU traffic.
- **Sensitive_Field**: Any stored field that must never appear in a public or owner-facing API response, specifically the full bank account number, full PAN, and full GSTIN.

## Requirements

### Requirement 1: Canonical Secure Storage of Bank and KYC Details

**User Story:** As a Salon_Owner, I want my full bank and KYC details stored securely in one place, so that TrimiT can register me for payouts and settle my earnings correctly.

#### Acceptance Criteria

1. THE TrimiT SHALL store each salon's Bank_KYC_Record in a single canonical dedicated table named `salon_bank_accounts`, created by a new numbered forward-only migration.
2. THE TrimiT SHALL accept, as required Bank_KYC_Record inputs, the account holder name, full bank account number, IFSC, PAN, business/legal name, phone, email, address, and pincode.
3. THE TrimiT SHALL accept GSTIN as an optional Bank_KYC_Record input.
4. WHEN a Salon_Owner submits a Bank_KYC_Record, THE TrimiT SHALL store the complete bank account number and SHALL NOT reduce the stored value to only the last four digits.
5. THE TrimiT SHALL store each Sensitive_Field encrypted at rest using application-managed encryption before persistence.
6. WHEN a Bank_KYC_Record is returned in any API response, THE TrimiT SHALL mask the full bank account number to expose at most its last four digits, and SHALL exclude the full PAN and full GSTIN values.
7. IF a Salon_Owner submits a Bank_KYC_Record with a missing required field, THEN THE TrimiT SHALL reject the submission with a field-level structured error code containing an error code and message, and SHALL retain any previously stored Bank_KYC_Record unchanged.
8. IF a submitted IFSC does not match the pattern `^[A-Z]{4}0[A-Z0-9]{6}$`, THEN THE TrimiT SHALL reject the submission with a structured error code indicating an invalid IFSC.
9. IF a submitted PAN does not match the pattern `^[A-Z]{5}[0-9]{4}[A-Z]$`, THEN THE TrimiT SHALL reject the submission with a structured error code indicating an invalid PAN.
10. WHEN a Salon_Owner submits a Bank_KYC_Record for a salon that already has one, THE TrimiT SHALL update the existing Bank_KYC_Record so that at most one Bank_KYC_Record exists per salon.

### Requirement 2: Bank and KYC Submission Access Control

**User Story:** As a Salon_Owner, I want only myself to manage my salon's payout details, so that no other user can read or change my bank information.

#### Acceptance Criteria

1. WHEN a Salon_Owner submits or retrieves a Bank_KYC_Record, THE TrimiT SHALL operate only on the Bank_KYC_Record belonging to a salon owned by that Salon_Owner.
2. IF a user whose role is not `owner` attempts to submit or retrieve a Bank_KYC_Record, THEN THE TrimiT SHALL reject the request with a structured authorization error and expose no Bank_KYC_Record data.
3. IF a Salon_Owner attempts to submit or retrieve a Bank_KYC_Record for a salon the Salon_Owner does not own, THEN THE TrimiT SHALL reject the request with a structured authorization error and expose no Bank_KYC_Record data.
4. THE TrimiT SHALL enforce Bank_KYC_Record row tenancy with a Row-Level-Security policy that restricts read and write access to the owning Salon_Owner, with service-role access used only by server-side payout processing.

### Requirement 3: PayU Vendor Registration

**User Story:** As a Salon_Owner, I want my stored details registered with PayU as a vendor, so that I can receive automatic split settlements.

#### Acceptance Criteria

1. WHEN a Salon_Owner has a complete Bank_KYC_Record AND the Feature_Flag `PAYU_PAYOUTS_ENABLED` is enabled, THE TrimiT SHALL register the salon as a PayU Vendor and set Vendor_Status to `pending`.
2. WHEN PayU confirms a Vendor registration as active, THE TrimiT SHALL set the salon's Vendor_Status to `active`.
3. IF PayU rejects a Vendor registration, THEN THE TrimiT SHALL set Vendor_Status to `rejected`, retain the submitted Bank_KYC_Record, record the rejection reason, and allow the Salon_Owner to resubmit corrected details.
4. IF a PayU Vendor registration request does not complete within 30 seconds, THEN THE TrimiT SHALL leave Vendor_Status unchanged, retain the submitted Bank_KYC_Record, and return a retryable structured error code.
5. WHEN a Salon_Owner views payout onboarding, THE TrimiT SHALL display the current Vendor_Status as one of `not_registered`, `pending`, `active`, `rejected`, or `suspended`.
6. WHILE the Feature_Flag `PAYU_PAYOUTS_ENABLED` is disabled, THE TrimiT SHALL store the Bank_KYC_Record without contacting PayU and SHALL keep Vendor_Status at `not_registered`.
7. WHILE a salon's Vendor_Status is any value other than `active`, THE TrimiT SHALL prevent that salon from receiving online Payments.

### Requirement 4: Feature-Flag Gating of the Online Payment Path

**User Story:** As an Admin, I want the entire online-payment and payout path gated behind a server flag, so that nothing reaches live users until I enable it from the backend.

#### Acceptance Criteria

1. WHEN any online-payment or payout behavior is requested, THE TrimiT SHALL evaluate the Feature_Flag `PAYU_PAYOUTS_ENABLED` at request time and permit that behavior only WHERE the flag resolves to enabled.
2. IF the Feature_Flag `PAYU_PAYOUTS_ENABLED` is unset or cannot be resolved, THEN THE TrimiT SHALL treat the flag as disabled.
3. THE TrimiT SHALL default the Feature_Flag `PAYU_PAYOUTS_ENABLED` to disabled.
4. WHILE the Feature_Flag `PAYU_PAYOUTS_ENABLED` is disabled, THE TrimiT SHALL preserve the existing Booking, Pay-at-Salon, and cash flows with the same request inputs, response fields, and Booking outcomes that exist before this feature.
5. WHILE the Feature_Flag `PAYU_PAYOUTS_ENABLED` is disabled, IF a Customer requests online payment initiation, THEN THE TrimiT SHALL reject the request with a structured error code indicating online payment is unavailable, and SHALL NOT create a Payment or contact PayU.
6. THE TrimiT SHALL allow the Feature_Flag `PAYU_PAYOUTS_ENABLED` to be changed only from server-side configuration controlled by an Admin.

### Requirement 5: PayU Test-Mode and Live-Mode Selection

**User Story:** As an Admin, I want the integration to run against PayU test mode before live split settlement is activated, so that I can verify everything safely.

#### Acceptance Criteria

1. THE TrimiT SHALL select the PayU environment, PayU_Test_Mode or live, from server-side configuration.
2. WHILE PayU_Test_Mode is selected, THE TrimiT SHALL direct all PayU order, callback, webhook, refund, and Vendor operations to PayU test endpoints using test credentials.
3. THE TrimiT SHALL compute and verify every PayU Hash using the credentials of the currently selected PayU environment.
4. THE TrimiT SHALL select the PayU environment independently of the Feature_Flag `PAYU_PAYOUTS_ENABLED`, so that test-mode verification does not require enabling online payments for live users.

### Requirement 6: Online Payment Initiation Linked to a Booking

**User Story:** As a Customer, I want to pay the booking amount online, so that my booking can be confirmed.

#### Acceptance Criteria

1. WHEN a Customer initiates online payment for a Booking AND the Feature_Flag `PAYU_PAYOUTS_ENABLED` is enabled AND the salon's Vendor_Status is `active`, THE TrimiT SHALL create a Payment linked to that Booking with Payment_Status `pending`.
2. WHEN a Customer initiates online payment, THE TrimiT SHALL create a PayU order for an amount in paise equal to the Booking amount payable, where the amount is an integer between 1 and 9,999,999,999 paise inclusive.
3. WHEN a Customer initiates online payment, THE TrimiT SHALL compute the request Hash for the PayU order using the SHA-512 algorithm over the PayU-specified field sequence.
4. THE TrimiT SHALL require an Idempotency_Key between 1 and 255 characters on the payment initiation request.
5. IF a payment initiation request is received without an Idempotency_Key, THEN THE TrimiT SHALL reject the request with a structured error code, and SHALL NOT create a Payment or a PayU order.
6. WHEN a payment initiation request is retried with an Idempotency_Key matching a previously processed request for the same Booking and amount, THE TrimiT SHALL return the existing Payment without creating a new Payment or a new PayU order.
7. IF a payment initiation request reuses an Idempotency_Key previously stored against a different Booking or a different amount, THEN THE TrimiT SHALL reject the request with a structured idempotency-conflict error and SHALL NOT create a Payment or a PayU order.
8. IF a Customer initiates online payment for a Booking that already has a Payment with Payment_Status `paid`, THEN THE TrimiT SHALL reject the request with a structured error code indicating the Booking is already paid, and SHALL preserve the existing paid Payment unchanged.
9. IF the salon's Vendor_Status is not `active` when payment is initiated, THEN THE TrimiT SHALL reject payment initiation with a structured error code indicating the salon is not ready to receive online payments, and SHALL NOT create a PayU order.
10. IF creation of the PayU order does not succeed, THEN THE TrimiT SHALL set the Payment_Status to `failed` and return a structured error code indicating the order could not be created.

### Requirement 7: Automatic Split Settlement, Commission, and Gateway Fee

**User Story:** As a Salon_Owner, I want the customer's payment to reach my account automatically minus a clearly disclosed total deduction, so that TrimiT never manually handles my money and I know exactly what I receive.

#### Acceptance Criteria

1. THE TrimiT SHALL denominate every Payment, Commission, PayU_Fee, and Split_Settlement amount in Indian Rupees, stored as integer paise.
2. THE TrimiT SHALL compute the Commission for each Payment by applying the configured Commission_Rate (default 5 percent) to the Payment amount and rounding to the nearest whole paise, where a residual of half a paise or more rounds up.
3. THE TrimiT SHALL compute the PayU_Fee for each Payment as the gateway fee defined by the active PayU configuration (approximately 2 percent), expressed as a non-negative integer paise.
4. WHEN a PayU order is created for a Booking, THE TrimiT SHALL configure a Split_Settlement that routes, to the salon's Vendor, an amount in paise equal to the Payment amount minus the Commission minus the PayU_Fee, expressed as a non-negative integer.
5. THE TrimiT SHALL ensure that, for each captured Payment, the sum of the salon's Split_Settlement amount, the retained Commission, and the PayU_Fee equals the captured Payment amount exactly in paise, with zero residual.
6. THE TrimiT SHALL route the salon's portion to the salon's Vendor such that no portion of the salon's funds settles into a TrimiT-owned account beyond the Commission.
7. THE TrimiT SHALL disclose to the Salon_Owner, before and during onboarding, the Total_Deduction as the sum of Commission_Rate and the PayU_Fee percentage (default approximately 7 percent), and the resulting amount the salon receives.
8. IF the salon's Vendor is missing, inactive, or ineligible to receive a Split_Settlement when the order is created, THEN THE TrimiT SHALL block creation of the PayU order, SHALL NOT charge the Customer, and SHALL return a structured error code indicating the salon account is not ready.
9. IF a Split_Settlement fails to be configured or executed after the Payment is captured, THEN THE TrimiT SHALL record the Settlement_Status as `failed` for reconciliation, notify Admin, and SHALL NOT send any partial amount to the Vendor.

### Requirement 8: Payment Result Verification and Booking Confirmation

**User Story:** As a Customer, I want my booking confirmed only after a verified successful payment, so that I am never charged without a confirmed booking.

#### Acceptance Criteria

1. WHEN TrimiT receives a PayU Callback or Webhook for a Payment, THE TrimiT SHALL verify the PayU response Hash before changing any Payment_Status.
2. WHEN a PayU response Hash is valid AND the PayU transaction status is success, THE TrimiT SHALL set the Payment_Status to `paid`.
3. WHEN a Payment reaches Payment_Status `paid`, THE TrimiT SHALL set the linked Booking status to confirmed.
4. IF a PayU response Hash is invalid or absent, THEN THE TrimiT SHALL reject the result with a structured error code, leave the Payment_Status and the linked Booking unchanged, and record the rejection in the audit log.
5. IF a PayU response Hash is valid but the PayU transaction status is failure, THEN THE TrimiT SHALL set the Payment_Status to `failed` and SHALL NOT confirm the linked Booking.
6. WHEN the same payment result is received more than once for a Payment that has already reached a final Payment_Status, THE TrimiT SHALL acknowledge the result without re-mutating the Payment or the linked Booking.
7. THE TrimiT SHALL confirm a Booking from a verified server-to-server Webhook independently of whether the Customer's client completed the Callback redirect.

### Requirement 9: Payment Failure Handling

**User Story:** As a Customer, I want a clear outcome when payment fails, so that I am not blocked and can retry.

#### Acceptance Criteria

1. WHEN a Payment reaches Payment_Status `failed`, THE TrimiT SHALL keep the linked Booking unconfirmed and retain the Booking record for retry.
2. WHEN a Payment reaches Payment_Status `failed`, THE TrimiT SHALL present to the Customer a failure outcome indicating that payment did not succeed.
3. WHEN a Customer retries payment for a Booking with a failed Payment, THE TrimiT SHALL create a new Payment for the same Booking, up to a maximum of 3 payment attempts per Booking.
4. IF a Customer attempts payment for a Booking that already has 3 failed Payments, THEN THE TrimiT SHALL reject the attempt with a structured error code indicating the retry limit is reached.
5. THE TrimiT SHALL keep the linked Booking's slot, hold, and capacity handling under the existing booking flow unchanged, regardless of Payment_Status.

### Requirement 10: Webhook and Callback Processing

**User Story:** As an Admin, I want PayU events processed reliably and auditable, so that payment and booking state stays correct even if the client disconnects.

#### Acceptance Criteria

1. WHEN TrimiT receives a PayU Webhook, THE TrimiT SHALL verify the Webhook Hash before processing the event.
2. IF a Webhook Hash is invalid or absent, THEN THE TrimiT SHALL reject the Webhook with an authentication error, alter no Payment, Booking, or Refund state, and record the rejection in the audit log.
3. WHEN a Webhook Hash is valid, THE TrimiT SHALL acknowledge receipt within 5 seconds.
4. WHEN TrimiT receives a Webhook whose PayU event identifier already exists in the audit log as processed, THE TrimiT SHALL acknowledge it without reprocessing and without changing any state.
5. THE TrimiT SHALL record each received Webhook and Callback in the audit log with its event identifier, event type, and processing outcome of `success`, `rejected`, or `failed`.
6. IF processing of a valid Webhook fails after acknowledgment, THEN THE TrimiT SHALL leave affected Payment, Booking, and Refund state unchanged, record the outcome as `failed`, and retain the event identifier as unprocessed so a PayU retry can reprocess it.

### Requirement 11: Refunds

**User Story:** As a Customer, I want full or partial refunds when eligible, so that I am repaid when a booking does not proceed.

#### Acceptance Criteria

1. WHEN a Refund is triggered by Customer cancellation, Salon_Owner cancellation, or Admin action, THE TrimiT SHALL create a Refund linked to the Payment with Refund_Status `initiated`.
2. THE TrimiT SHALL support full and partial Refunds, where the Refund amount is an integer number of paise between 1 and the captured Payment amount minus the sum of prior completed and in-progress Refunds.
3. IF a Refund amount exceeds the captured Payment amount minus the sum of prior completed and in-progress Refunds, THEN THE TrimiT SHALL reject the Refund with a structured error code.
4. WHEN PayU confirms a full Refund of the remaining captured amount, THE TrimiT SHALL set the Payment_Status to `refunded`.
5. WHEN PayU confirms a partial Refund that leaves a remaining captured amount above zero, THE TrimiT SHALL set the Payment_Status to `partially_refunded`.
6. WHEN a Refund_Status changes, THE TrimiT SHALL display the Refund_Status to the Customer as one of `initiated`, `processing`, `completed`, or `failed`.
7. THE TrimiT SHALL require an Idempotency_Key between 1 and 255 characters on each Refund request.
8. IF a Refund request is received without an Idempotency_Key, THEN THE TrimiT SHALL reject the request with a structured error code and SHALL NOT initiate a Refund.
9. IF a Refund fails at PayU, THEN THE TrimiT SHALL set the Refund_Status to `failed`, retain the existing Payment_Status, and return a structured error code for reconciliation.

### Requirement 12: Role-Scoped Payment Views

**User Story:** As each role, I want a view scoped to my needs, so that I can act on payments relevant to me.

#### Acceptance Criteria

1. WHEN a Customer requests their payment view, THE TrimiT SHALL display, for that Customer's own Payments only, Payment_Status, Booking confirmation status, and Refund_Status.
2. WHEN a Salon_Owner requests their payout view, THE TrimiT SHALL display, for that Salon_Owner's own salon only, the masked Bank_KYC_Record, Vendor_Status, Payment history, and settled earnings.
3. WHEN an Admin requests the payment monitoring view, THE TrimiT SHALL display Payments, failed transactions, Refunds, and Split_Settlement outcomes across all salons and Customers.
4. IF a role requests payment data outside its permitted tenancy scope, THEN THE TrimiT SHALL deny the request, return a structured authorization error, and expose none of the requested data.

### Requirement 13: Security and Compliance

**User Story:** As an Admin, I want payments handled securely and compliantly, so that TrimiT protects users and meets regulatory requirements.

#### Acceptance Criteria

1. THE TrimiT SHALL delegate all card and payment-instrument data entry and capture to PayU so that no card data passes through, is stored by, or is logged by TrimiT.
2. THE TrimiT SHALL store all monetary amounts in paise as integers and SHALL NOT store monetary amounts as floating-point values.
3. WHEN any Payment, Refund, Split_Settlement, Vendor, or Webhook state changes, THE TrimiT SHALL record an append-only audit log entry containing the entity type, entity identifier, prior state, new state, actor or source, and a UTC timestamp.
4. THE TrimiT SHALL store audit log entries as append-only records that cannot be modified or deleted through the application.
5. THE TrimiT SHALL exclude every Sensitive_Field and every PayU credential value from application logs.
6. THE TrimiT SHALL require an Idempotency_Key between 1 and 255 characters on every mutating payment endpoint, specifically payment initiation, payment result handling, and Refund.
7. IF a mutating payment request reuses an Idempotency_Key from a previously completed request, THEN THE TrimiT SHALL return the stored result without repeating the operation.

### Requirement 14: Backwards Compatibility with Live Builds

**User Story:** As an Admin, I want online payments rolled out without breaking live users or old app builds, so that the product stays stable in production.

#### Acceptance Criteria

1. THE TrimiT SHALL add only new optional fields to existing API responses, without removing, renaming, or changing the type of any field that shipped Play Store builds already read.
2. THE TrimiT SHALL expose all new payment and payout behavior through new additive API endpoints, leaving existing endpoint request and response contracts unchanged.
3. THE TrimiT SHALL deliver all new database changes as a single new numbered, forward-only migration that contains no DROP, no destructive ALTER, no rename, and no data-deleting operation against existing tables, columns, policies, triggers, or RPCs.
4. WHILE the Feature_Flag `PAYU_PAYOUTS_ENABLED` is disabled, WHEN an old Play Store build performs a Booking, THE TrimiT SHALL return the same Booking outcome and response shape that the build receives today.
5. THE TrimiT SHALL leave the existing booking slot-hold, atomic booking RPC, capacity, reschedule, auth, and realtime behavior unchanged by this feature.

## Requirement 15: Admin-Configurable Commission Rate

**User Story:** As an Admin, I want to set the platform commission rate, so that I can adjust TrimiT's take without a code deploy.

#### Acceptance Criteria

1. THE TrimiT SHALL store the Commission_Rate as a server-side configuration value with a default of 5 percent.
2. WHEN an Admin sets the Commission_Rate, THE TrimiT SHALL apply the new rate to Payments initiated after the change and SHALL NOT retroactively alter Commission on already-captured Payments.
3. IF a Commission_Rate outside the range 0 through 100 percent is submitted, THEN THE TrimiT SHALL reject the change with a structured error code and retain the prior Commission_Rate.
4. THE TrimiT SHALL allow the Commission_Rate to be changed only by an Admin through server-side configuration, and SHALL NOT expose Commission_Rate modification to Customers or Salon_Owners.
5. WHILE no Commission_Rate override is configured, THE TrimiT SHALL use the default 5 percent.

## Requirement 16: Settlement Status Tracking

**User Story:** As a Salon_Owner, I want to see when my money has actually reached my bank, so that I understand that a paid booking is not yet a settled payout.

#### Acceptance Criteria

1. WHEN a Payment reaches Payment_Status `paid`, THE TrimiT SHALL set the associated Settlement_Status to `pending` to reflect that funds have not yet been transferred to the salon.
2. WHEN PayU confirms the salon's Split_Settlement has transferred, THE TrimiT SHALL set the Settlement_Status to `settled`.
3. IF PayU reports the salon's Split_Settlement as failed, THEN THE TrimiT SHALL set the Settlement_Status to `failed` and notify Admin for reconciliation.
4. WHEN a Salon_Owner views earnings, THE TrimiT SHALL display the Settlement_Status as `pending`, `settled`, or `failed`, and SHALL NOT represent a `paid` Payment as money already in the salon's bank.
5. THE TrimiT SHALL treat Settlement timing as governed by PayU's settlement schedule and SHALL NOT promise instant transfer to the salon.

## Requirement 17: Server-Authoritative Amounts and Transparent Fee Disclosure UI

**User Story:** As a Customer and a Salon_Owner, I want amounts computed by the server and fees shown clearly in a consistent interface, so that charges are trustworthy and tamper-proof.

#### Acceptance Criteria

1. THE TrimiT SHALL derive the Payment amount solely from server-side Booking data and SHALL NOT accept a client-supplied payable amount.
2. IF a client supplies a payment amount in a request, THEN THE TrimiT SHALL ignore the client-supplied amount and use the server-computed Booking amount.
3. WHEN a Salon_Owner views payout onboarding, THE TrimiT SHALL display the Total_Deduction breakdown (Commission plus PayU_Fee) and the net amount the salon receives per transaction.
4. WHEN a Customer views the payment screen, THE TrimiT SHALL display the total amount payable in Indian Rupees before redirecting to PayU.
5. THE TrimiT SHALL render all new payment and payout screens using the application's existing shared theme, typography, and component styles in both light and dark modes, and SHALL NOT show raw error strings to users.
6. WHILE a salon's Vendor_Status is not `active`, THE TrimiT SHALL display a clear payout status indicator (for example, "Payouts: pending activation") on the Salon_Owner's onboarding or dashboard view.

## Non-Goals

1. THE TrimiT SHALL NOT modify the booking RPC capacity or concurrency logic; capacity and concurrency remain enforced inside the existing booking RPC.
2. THE TrimiT SHALL NOT enable live online payments by default; the Feature_Flag `PAYU_PAYOUTS_ENABLED` ships disabled.
3. THE TrimiT SHALL NOT change the existing auth, OTP, signup, login, realtime, or push-notification flows.
4. THE TrimiT SHALL NOT edit, reorder, or "fix" any already-applied migration, including `database/47_salon_bank_details.sql`; corrections are delivered as a new numbered migration.
5. THE TrimiT SHALL NOT collect, store, or log raw card data; card capture stays entirely with PayU.
6. This feature does not cover Salon_Owner subscription billing (the existing ₹299/month system), which remains unchanged.
7. This feature does not migrate or backfill historical bookings into the online-payment model.
8. THE TrimiT SHALL NOT implement refund-after-Settlement clawback in this feature; only Refunds processed before the salon's funds are settled (or where PayU natively supports post-settlement reversal) are in scope, and full post-settlement clawback is deferred to a later feature.
9. This feature does not implement GST computation, GST invoicing, or tax reporting; TrimiT is pre-GST at this stage and tax handling is deferred.
10. This feature supports Indian Rupee transactions only; multi-currency is out of scope.
11. This feature does not build a separate self-service Admin web console; the Commission_Rate is set through server-side configuration controlled by an Admin.
