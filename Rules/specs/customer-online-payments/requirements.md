# Requirements Document

## Introduction

This feature lets TrimiT customers discover salons, add one or more services to a single
booking, pick a slot, and pay online before the booking is confirmed. Salon owners can
optionally enable "Pay at Salon"; when online payment is required, the booking is not
confirmed until payment succeeds.

The defining constraint is that customer money must reach the salon owner's account
**automatically**. TrimiT must never manually collect and transfer funds. This is built on
Razorpay Route (marketplace split payments via Linked Accounts) so funds legally settle to
the salon, not into TrimiT's account — keeping TrimiT outside the RBI 2025 payment-aggregator
licensing requirement. TrimiT retains only a platform commission on each transaction.

This is an **additive, feature-flagged** change to a live production product. Existing
cash / "Pay at Salon" bookings, old Play Store builds, and the live ₹299/month subscription
system MUST continue to work unchanged.

## Glossary

- **TrimiT**: The salon marketplace platform (mobile app, web app, FastAPI backend, Supabase DB).
- **Customer**: A user who books and pays for salon services.
- **Salon_Owner**: A user who owns a salon, configures payment settings, and receives payouts.
- **Admin**: A TrimiT operator who monitors payments, refunds, and settlements.
- **Booking**: A reservation of one or more services at a salon for a specific slot.
- **Cart_Total**: The sum, in paise, of all selected service prices in a single booking.
- **Razorpay**: The licensed payment aggregator and payment gateway used by TrimiT.
- **Route**: Razorpay's marketplace product that splits a payment between TrimiT and a salon.
- **Linked_Account**: A Razorpay sub-account representing a salon that receives payouts.
- **Transfer**: The portion of a captured payment routed from Razorpay to a Linked_Account.
- **On_Hold_Transfer**: A Transfer held by Razorpay (not yet released to the salon) until the
  service is delivered or a hold window elapses, enabling refunds before payout.
- **KYC**: Know Your Customer verification (bank account + identity documents) a salon must
  complete before it can receive online payments.
- **KYC_Status**: The verification state of a salon's Linked_Account (e.g. not_started,
  pending, under_review, activated, rejected, suspended).
- **Settlement**: Razorpay's movement of settled funds from a Linked_Account to the salon's
  real bank account.
- **Settlement_Status**: The state of a Settlement (e.g. pending, processed, failed).
- **Commission**: The platform fee, in paise, that TrimiT retains from each Cart_Total.
- **Slot_Hold**: A temporary reservation of a slot during checkout, released if payment fails
  or expires.
- **Payment**: A record linking a Razorpay order/payment to a Booking, with a lifecycle status.
- **Payment_Status**: The state of a Payment (pending, paid, failed, refunded, partially_refunded).
- **Refund**: A full or partial return of funds to a Customer for a Booking.
- **Webhook**: An asynchronous event sent by Razorpay to TrimiT about payment/transfer/refund state.
- **Idempotency_Key**: A unique key on a mutating request that prevents duplicate processing on retry.
- **Feature_Flag**: A server-controlled toggle (`online_payments_enabled`) that gates rollout.

## Requirements

### Requirement 1: Multi-Service Cart and Cart Total

**User Story:** As a Customer, I want to select one or more services in a single booking, so that I can pay one combined total.

#### Acceptance Criteria

1. WHEN a Customer adds a service to a Booking, THE TrimiT SHALL include that service's price in the Cart_Total such that the Cart_Total equals the integer sum, in paise, of all currently selected services in that Booking.
2. THE TrimiT SHALL store and compute the Cart_Total in paise as a non-negative integer in the range 0 to 99,999,999,99 paise.
3. WHEN a Customer adds or removes a service before checkout, THE TrimiT SHALL recompute the Cart_Total within 1 second to equal the sum of all selected service prices for Bookings containing between 1 and 10 services.
4. WHERE a valid promo code is applied, THE TrimiT SHALL compute the amount payable in paise as the Cart_Total minus the discount, clamped to a minimum of 0 so that the amount payable is never negative.
5. IF a Booking contains zero services, THEN THE TrimiT SHALL reject checkout with a structured error code and SHALL NOT create a payable amount.
6. IF a Customer attempts to add more than 10 services to a Booking, THEN THE TrimiT SHALL reject the addition with a structured error code and leave the Cart_Total unchanged.
7. IF an applied promo code is invalid, expired, or not applicable to the Booking, THEN THE TrimiT SHALL reject the promo code with a structured error code indicating the reason and set the amount payable equal to the unchanged Cart_Total.

### Requirement 2: Salon Owner Payment Settings

**User Story:** As a Salon_Owner, I want to control whether I accept online payments and pay-at-salon, so that I can decide how customers pay.

#### Acceptance Criteria

1. WHEN a Salon_Owner sets "Accept Online Payments" to enabled or disabled, THE TrimiT SHALL persist the new value and confirm the change to the Salon_Owner within 2 seconds.
2. WHEN a Salon_Owner sets "Accept Pay at Salon" to enabled or disabled, THE TrimiT SHALL persist the new value and confirm the change to the Salon_Owner within 2 seconds.
3. IF a Salon_Owner attempts to disable both "Accept Online Payments" and "Accept Pay at Salon", THEN THE TrimiT SHALL reject the change with a structured error code, retain the previous settings, and indicate to the Salon_Owner that at least one payment method must remain enabled.
4. WHEN a salon is first created, THE TrimiT SHALL default "Accept Pay at Salon" to enabled and "Accept Online Payments" to disabled.
5. WHERE "Accept Online Payments" is disabled and "Accept Pay at Salon" is enabled, THE TrimiT SHALL allow a Booking to be confirmed without an online Payment.
6. WHERE "Accept Online Payments" is enabled and "Accept Pay at Salon" is disabled, THE TrimiT SHALL NOT confirm a Booking until its Payment reaches Payment_Status paid.
7. WHERE both "Accept Online Payments" and "Accept Pay at Salon" are enabled, THE TrimiT SHALL allow the Customer to choose between paying online and paying at the salon before Booking confirmation.
8. IF "Accept Online Payments" is enabled for a salon whose KYC_Status is not activated, THEN THE TrimiT SHALL treat online payment as unavailable for that salon and present only Pay at Salon, while retaining the Salon_Owner's enabled setting so online payment activates automatically once KYC_Status becomes activated.

### Requirement 3: Salon Payout Onboarding and KYC

**User Story:** As a Salon_Owner, I want to register my bank account and submit KYC, so that I can receive online payments automatically.

#### Acceptance Criteria

1. THE TrimiT SHALL accept, as required payout onboarding inputs, the salon's PAN, bank account number, and IFSC, and SHALL accept GST as an optional input.
2. IF a Salon_Owner submits payout onboarding with a missing or malformed required field, THEN THE TrimiT SHALL reject the submission with a field-level structured error code and retain the previously entered values.
3. WHEN a Salon_Owner submits validated payout onboarding details, THE TrimiT SHALL create or update a Razorpay Linked_Account for the salon and set KYC_Status to pending within 10 seconds.
4. IF creation or update of the Razorpay Linked_Account does not succeed within 30 seconds, THEN THE TrimiT SHALL retain the submitted details, leave KYC_Status unchanged, and return a retryable structured error code.
5. WHEN a Salon_Owner views payout onboarding, THE TrimiT SHALL display the salon's current KYC_Status as one of not_started, pending, under_review, activated, rejected, or suspended, and SHALL display the current Settlement_Status.
6. WHILE a salon's KYC_Status is any value other than activated, THE TrimiT SHALL prevent that salon from receiving online Payments.
7. WHERE a salon's "Accept Online Payments" is enabled, WHEN the salon's KYC_Status changes to activated, THE TrimiT SHALL allow online Payments for that salon.
8. IF Razorpay penny-drop bank account verification fails, THEN THE TrimiT SHALL set KYC_Status to rejected, display the failure reason to the Salon_Owner, and allow the Salon_Owner to resubmit corrected details.

### Requirement 4: Online Payment Creation Linked to Booking

**User Story:** As a Customer, I want to pay the cart total online for my chosen slot, so that my booking can be confirmed.

#### Acceptance Criteria

1. WHEN a Customer initiates online payment for a Booking, THE TrimiT SHALL create a Payment record linked to that Booking with Payment_Status set to pending.
2. WHEN a Customer initiates online payment, THE TrimiT SHALL create a Razorpay order for an amount in paise equal to the cart total payable, where the amount is an integer between 1 and 99,999,999 paise inclusive.
3. WHEN a Customer initiates online payment, THE TrimiT SHALL place a Slot_Hold on the selected slot that remains active for a fixed checkout window of 300 seconds from the time the hold is placed.
4. WHILE an active Slot_Hold placed during payment creation has not expired and the associated Payment_Status is pending, THE TrimiT SHALL prevent any other Customer from placing a Slot_Hold or creating a Payment for the same slot.
5. THE TrimiT SHALL require an Idempotency_Key on the payment creation request.
6. IF a payment creation request is received without an Idempotency_Key, THEN THE TrimiT SHALL reject the request with a structured error code, SHALL NOT create a Payment record, and SHALL NOT create a Razorpay order.
7. WHEN a payment creation request is retried with an Idempotency_Key that matches a previously processed request, THE TrimiT SHALL return the existing Payment record without creating a new Payment record or a new Razorpay order.
8. IF the selected slot is no longer available at payment creation, THEN THE TrimiT SHALL reject payment creation with a structured error code indicating slot unavailability, SHALL NOT create a Razorpay order, and SHALL NOT create a Payment record.
9. IF the Razorpay order creation fails, THEN THE TrimiT SHALL set the Payment_Status to failed, SHALL release the Slot_Hold placed for that request, and SHALL return a structured error code indicating that the payment order could not be created.

### Requirement 5: Automatic Marketplace Split

**User Story:** As a Salon_Owner, I want the customer's payment to reach my account automatically minus TrimiT's commission, so that TrimiT never manually handles my money.

#### Acceptance Criteria

1. WHEN a Razorpay order is created for a Booking, THE TrimiT SHALL configure a Route Transfer to the salon's Linked_Account for an amount equal to the captured Payment amount minus the Commission, expressed as a non-negative integer number of paise.
2. THE TrimiT SHALL compute the Commission for each Payment by applying the configured commission rate to the Payment amount and rounding the result to the nearest whole paise (residual fraction of 0.5 paise or more rounds up), and SHALL retain that Commission, in paise, as the platform fee.
3. WHEN a Transfer is configured, THE TrimiT SHALL set it as an On_Hold_Transfer, and SHALL release the hold when the Booking is marked completed or when the configured hold window (default 168 hours from capture) elapses, whichever occurs first.
4. THE TrimiT SHALL ensure that, for each captured Payment, the sum of the retained Commission and the salon Transfer amount equals the captured Payment amount exactly, in paise, with zero residual.
5. THE TrimiT SHALL route the salon's portion directly to the salon's Linked_Account such that no portion of the salon's funds settles into a TrimiT-owned account.
6. IF the salon's Linked_Account is missing, inactive, or ineligible to receive a Route Transfer when the order is created, THEN THE TrimiT SHALL block creation of the payment order, SHALL NOT capture any customer Payment, and SHALL return an error indication that the salon account is not ready to receive transfers.
7. IF a Route Transfer fails to be created or executed after the Payment is captured, THEN THE TrimiT SHALL retain the full captured amount in paise with no partial amount sent to the Linked_Account, SHALL mark the Transfer as failed for reconciliation, and SHALL return an error indication of the transfer failure.

### Requirement 6: Payment Verification and Booking Confirmation

**User Story:** As a Customer, I want my booking confirmed only after a verified successful payment, so that I am not charged without a confirmed booking.

#### Acceptance Criteria

1. WHEN TrimiT receives a payment verification request, THE TrimiT SHALL verify the Razorpay HMAC signature computed over `order_id|payment_id` within 5 seconds before changing any Payment_Status.
2. WHEN a payment signature is valid AND the payment status is captured, THE TrimiT SHALL set the Payment_Status to paid.
3. WHEN a Payment reaches Payment_Status paid, THE TrimiT SHALL set the linked Booking status to confirmed.
4. IF the Razorpay signature is invalid, THEN THE TrimiT SHALL reject verification with a structured error code and SHALL leave both the Payment_Status and the linked Booking status unchanged.
5. IF the Razorpay signature is valid but the payment status is not captured, THEN THE TrimiT SHALL leave the Payment_Status as pending and SHALL NOT confirm the linked Booking.
6. THE TrimiT SHALL require an Idempotency_Key between 1 and 255 characters on the verification request.
7. WHEN the same verification request is retried with a matching Idempotency_Key, THE TrimiT SHALL return the original final Payment_Status without re-mutating any Payment or Booking state.
8. IF a verification request is received without an Idempotency_Key, THEN THE TrimiT SHALL reject the request with a structured error code and SHALL leave the Payment_Status unchanged.

### Requirement 7: Payment Failure and Slot Release

**User Story:** As a Customer, I want a clear outcome when payment fails, so that I am not blocked and the slot is freed for others.

#### Acceptance Criteria

1. WHEN a Payment reaches Payment_Status failed, THE TrimiT SHALL keep the linked Booking in unconfirmed state and SHALL retain the Booking record for retry.
2. WHEN a Payment reaches Payment_Status failed, THE TrimiT SHALL release the Slot_Hold for the linked Booking within 5 seconds, making the slot available to other Customers.
3. WHEN a Payment reaches Payment_Status failed, THE TrimiT SHALL display to the Customer a failure outcome indicating that payment did not succeed and that the slot has been released.
4. IF a Slot_Hold remains active for more than its hold duration of 300 seconds before payment succeeds, THEN THE TrimiT SHALL release the slot and set the Payment_Status to failed.
5. WHILE a Payment_Status is pending, THE TrimiT SHALL display a pending state to the Customer and SHALL NOT confirm the Booking.
6. IF a Payment_Status remains pending for more than 120 seconds, THEN THE TrimiT SHALL set the Payment_Status to failed and apply the failure handling in criteria 1 through 3.
7. WHEN a Customer retries payment after a failure AND the slot is still available, THE TrimiT SHALL create a new Slot_Hold and a new Payment for the same Booking, up to a maximum of 3 retry attempts per Booking.
8. IF a Customer retries payment after a failure AND the slot is no longer available, THEN THE TrimiT SHALL reject the retry and display an outcome indicating the slot is no longer available.

### Requirement 8: Duplicate Payment Prevention

**User Story:** As a Customer, I want to never be charged twice for one booking, so that I trust paying through TrimiT.

#### Acceptance Criteria

1. IF a Customer submits a payment attempt for a Booking that already has a Payment with Payment_Status paid, THEN THE TrimiT SHALL reject the attempt without initiating any new charge, return a structured error response containing an error code and message indicating the Booking is already paid, and preserve the existing paid Payment unchanged.
2. WHEN two payment requests are received with the same Idempotency_Key within the idempotency retention window of 24 hours, THE TrimiT SHALL execute the payment operation exactly once and return the identical result, including Payment_Status and Payment identifier, for each subsequent retry.
3. THE TrimiT SHALL maintain at most one Payment with Payment_Status paid per Booking at all times.
4. IF a payment request reuses an Idempotency_Key that was previously stored against a different Booking or a different payment amount, THEN THE TrimiT SHALL reject the request with a structured error response indicating an idempotency key conflict, without initiating any charge.
5. WHILE a payment request for a Booking is being processed, IF a concurrent payment request is submitted for the same Booking, THEN THE TrimiT SHALL reject the concurrent request with a structured error response and ensure that no more than one Payment for that Booking reaches Payment_Status paid.

### Requirement 9: Webhook Processing

**User Story:** As Admin, I want payment events processed reliably and auditable, so that booking and payment states stay correct even if the client disconnects.

#### Acceptance Criteria

1. WHEN TrimiT receives a Razorpay Webhook, THE TrimiT SHALL verify the Webhook HMAC-SHA256 signature before processing the event.
2. IF a Webhook signature is invalid or absent, THEN THE TrimiT SHALL reject the Webhook with an authentication error, SHALL NOT alter any Payment, Booking, or related state, and SHALL record the rejection in the audit log.
3. WHEN a Webhook signature is valid, THE TrimiT SHALL acknowledge receipt within 5 seconds and process the event asynchronously.
4. WHEN TrimiT receives a Webhook whose event identifier already exists in the audit log as processed, THE TrimiT SHALL acknowledge it without reprocessing and without changing any state.
5. THE TrimiT SHALL record each received Webhook event in the audit log with its event identifier, event type, and processing outcome (success, rejected, or failed).
6. WHEN a payment-captured Webhook is processed for a Payment in the pending state, THE TrimiT SHALL set the Payment_Status to paid and confirm the linked Booking.
7. IF a payment-captured Webhook references a Payment that does not exist or is not in the pending state, THEN THE TrimiT SHALL leave Payment_Status and the linked Booking unchanged and SHALL record the outcome as failed in the audit log.
8. IF asynchronous processing of a signature-valid Webhook fails after acknowledgment, THEN THE TrimiT SHALL leave affected Payment and Booking state unchanged, SHALL record the outcome as failed in the audit log, and SHALL retain the event identifier as unprocessed so a Razorpay retry can reprocess it.

### Requirement 10: Refunds

**User Story:** As a Customer, I want full or partial refunds when eligible, so that I am repaid when a booking does not proceed.

#### Acceptance Criteria

1. WHEN a Refund is triggered by Customer cancellation, Salon_Owner cancellation, no-show policy, or Admin action, THE TrimiT SHALL create a Refund linked to the Payment within 5 seconds.
2. THE TrimiT SHALL support both full Refunds and partial Refunds, where the Refund amount is an integer number of paise between 1 and the captured Payment amount minus the sum of prior completed and in-progress Refunds.
3. IF a Refund amount exceeds the captured Payment amount minus the sum of prior completed and in-progress Refunds, THEN THE TrimiT SHALL reject the Refund with a structured error code.
4. WHEN a full Refund is confirmed by Razorpay, THE TrimiT SHALL set the Payment_Status to refunded.
5. WHEN a partial Refund is confirmed by Razorpay, THE TrimiT SHALL set the Payment_Status to partially_refunded.
6. WHEN a Refund's state changes, THE TrimiT SHALL display the Refund status to the Customer as one of initiated, processing, completed, or failed for the refunded Booking.
7. WHERE the salon's Transfer has already been released when a Refund is required, WHEN the Refund is initiated, THE TrimiT SHALL initiate a reverse transfer from the salon's Linked_Account to fund the Refund.
8. IF a Refund or its reverse transfer fails at Razorpay, THEN THE TrimiT SHALL set the Refund status to failed, retain the existing Payment_Status, and return a structured error code for reconciliation.

### Requirement 11: Booking Cancellation Effects on Payment

**User Story:** As a Customer or Salon_Owner, I want cancellation to apply the correct payment outcome, so that money handling matches the cancellation reason.

#### Acceptance Criteria

1. WHEN a Customer cancels a confirmed Booking before the salon's cancellation cutoff time, THE TrimiT SHALL initiate a Refund within 60 seconds according to the salon's cancellation policy, where the policy fee is between 0% and 100% of the Booking amount.
2. WHEN a Salon_Owner cancels a confirmed Booking, THE TrimiT SHALL initiate a full (100%) Refund to the Customer within 60 seconds.
3. WHERE a Customer cancels a confirmed Booking after the salon's cancellation cutoff time (late cancel), THE TrimiT SHALL apply the salon's late-cancellation policy fee (between 0% and 100% of the Booking amount) to compute the Refund amount.
4. WHERE a Booking is marked no-show by the Salon_Owner after the Booking start time, THE TrimiT SHALL apply the salon's no-show policy fee (between 0% and 100% of the Booking amount) to compute the Refund amount.
5. WHEN a Booking is cancelled before its Transfer is released, THE TrimiT SHALL reverse the On_Hold_Transfer before completing the Refund.
6. IF reversal of a Transfer fails, THEN THE TrimiT SHALL withhold the Refund, preserve the existing Payment and Transfer state, and surface a structured error for reconciliation.
7. WHERE a Booking is cancelled after its Transfer has been released, THE TrimiT SHALL fund the Refund from the platform and record the amount owed by the Salon_Owner for recovery.
8. IF initiation of a Refund fails, THEN THE TrimiT SHALL retry up to 3 times, and on continued failure SHALL flag the Refund for manual reconciliation and notify the Customer that the Refund is being processed.

### Requirement 12: Settlements and Payouts

**User Story:** As a Salon_Owner, I want my earnings settled to my bank account automatically, so that I receive money without manual steps.

#### Acceptance Criteria

1. WHEN a Booking is marked completed or its configured hold window (default 168 hours from capture) elapses, THE TrimiT SHALL release the On_Hold_Transfer to the salon's Linked_Account within 5 minutes.
2. THE TrimiT SHALL track Settlement_Status for each released Transfer as one of pending, processed, or failed.
3. IF a Settlement fails, THEN THE TrimiT SHALL set Settlement_Status to failed and notify Admin within 5 minutes.
4. IF a payout to a Linked_Account fails, THEN THE TrimiT SHALL retry the payout up to 3 times, and on continued failure SHALL retain the failure reason, preserve the Transfer record, and surface the failure to Admin.
5. WHEN a Salon_Owner views earnings, THE TrimiT SHALL display earnings and Settlement_Status history ordered most-recent first.

### Requirement 13: Role Views

**User Story:** As each role, I want a view scoped to my needs, so that I can act on payments relevant to me.

#### Acceptance Criteria

1. WHEN a Customer requests their payment view, THE TrimiT SHALL display, for that Customer's own transactions only, payment status, payment success indication, payment failure indication, booking confirmation status, and refund status.
2. WHEN a Salon_Owner requests their payment view, THE TrimiT SHALL display, for that Salon_Owner's own salon only, payment settings, bank setup, KYC verification status, transaction history, and earnings/settlements.
3. WHEN an Admin requests the payment monitoring view, THE TrimiT SHALL display payment monitoring data, failed transactions, refund management, and settlement monitoring across all salons and customers on the platform.
4. THE TrimiT SHALL restrict each role's view to only the data permitted by its tenancy scope, with no cross-salon or cross-customer access.
5. IF a role requests payment data outside its permitted tenancy scope, THEN THE TrimiT SHALL deny the request, return an error indicating the data is not accessible, and expose none of the requested data.

### Requirement 14: Security and PCI Compliance

**User Story:** As Admin, I want payments handled securely, so that TrimiT meets PCI SAQ-A and protects users.

#### Acceptance Criteria

1. THE TrimiT SHALL delegate all card data entry and capture (including card number, CVV, expiry, and track data) to Razorpay so that no card data passes through, is stored by, or is logged by TrimiT (PCI SAQ-A scope).
2. WHEN TrimiT receives a payment verification request or a Webhook, THE TrimiT SHALL verify the Razorpay signature before acting on it.
3. IF a Razorpay signature is missing or invalid on a verification request or Webhook, THEN THE TrimiT SHALL reject it, preserve all related state, record the rejection in the audit log, and return an error indication.
4. WHEN any Payment, Refund, Transfer, or Webhook state changes, THE TrimiT SHALL record an audit log entry containing the entity type, entity identifier, prior state, new state, actor or source, and a UTC timestamp.
5. THE TrimiT SHALL store audit log entries as append-only records that cannot be modified or deleted.
6. THE TrimiT SHALL require an Idempotency_Key between 1 and 255 characters on every mutating payment endpoint (payment creation, verification, and refund).
7. IF a mutating payment request is received without an Idempotency_Key, THEN THE TrimiT SHALL reject the request with a structured error code.
8. WHEN a mutating payment request reuses an Idempotency_Key from a previously completed request, THE TrimiT SHALL return the stored result without repeating the operation.
9. THE TrimiT SHALL store all monetary amounts in paise as integers and SHALL NOT store monetary amounts as floating-point values.

### Requirement 15: Compliance with RBI 2025 and Data Localization

**User Story:** As Admin, I want the architecture to keep TrimiT compliant, so that TrimiT operates legally without a payment-aggregator licence.

#### Acceptance Criteria

1. THE TrimiT SHALL route 100% of customer payment funds through Razorpay Route directly to the target salon's Linked_Account, such that no portion of customer funds settles into any TrimiT-owned account.
2. THE TrimiT SHALL store all payment records and customer personal data exclusively on infrastructure physically located within India.
3. IF a salon's KYC_Status is not activated, THEN THE TrimiT SHALL block initiation of any online Payment to that salon, make no charge to the customer, and display an error message indicating the salon is not currently accepting online payments.
4. IF routing of a captured customer payment to the salon's Linked_Account fails, THEN THE TrimiT SHALL reverse the customer charge in full and display an error message indicating the payment could not be completed.

### Requirement 16: Scalability

**User Story:** As Admin, I want the payment system to scale, so that it serves thousands of salons and millions of bookings.

#### Acceptance Criteria

1. THE TrimiT SHALL support payment processing for at least 10,000 active salons and at least 5,000,000 total Bookings without any per-salon configuration change to shared code and without manual intervention as salon or Booking volume grows.
2. WHEN two or more payment requests target the same slot concurrently, THE TrimiT SHALL confirm exactly one Booking for that slot.
3. IF a payment request targets a slot for which a Booking is already confirmed, THEN THE TrimiT SHALL reject that request with an error indicating the slot is no longer available and SHALL NOT confirm a second Booking for that slot.
4. WHEN a Webhook event is received, THE TrimiT SHALL process it asynchronously such that payment confirmation completes independently of whether the Customer's client remains connected.
5. IF asynchronous processing of a Webhook event fails, THEN THE TrimiT SHALL retry processing up to 5 times and SHALL preserve the unprocessed event for reprocessing until it either succeeds or exhausts all retries.

### Requirement 17: Backwards Compatibility and Feature-Flagged Rollout

**User Story:** As Admin, I want online payments rolled out safely, so that live users and old app builds keep working.

#### Acceptance Criteria

1. WHEN any online payment behavior is requested, THE TrimiT SHALL evaluate the Feature_Flag `online_payments_enabled` at request time and permit that behavior only if the flag resolves to enabled for the target salon.
2. IF the Feature_Flag `online_payments_enabled` cannot be resolved or is unset, THEN THE TrimiT SHALL treat it as disabled.
3. WHILE the Feature_Flag `online_payments_enabled` is disabled, THE TrimiT SHALL keep the existing Pay-at-Salon and cash booking flows with the same request inputs, response fields, and booking outcomes that exist before this feature.
4. THE TrimiT SHALL add only new optional fields to existing API responses, without removing, renaming, or changing the type of any field that existing Play Store builds already read, so that clients ignoring unknown fields continue to function.
5. THE TrimiT SHALL deliver all new database changes as a single new numbered, forward-only migration that contains no DROP, destructive ALTER, rename, or data-deleting operation against existing tables, columns, policies, triggers, or RPCs.
6. WHERE the Feature_Flag `online_payments_enabled` is enabled for a salon whose online payment prerequisites are unmet, THE TrimiT SHALL fall back to Pay at Salon and present an indication to the customer that online payment is unavailable, while preserving the booking request data.
