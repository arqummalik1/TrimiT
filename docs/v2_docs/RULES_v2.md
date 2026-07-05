# TrimiT - V2 Rules

These rules have been meticulously vetted to ensure a multi-million dollar, bug-free, and error-free application. 

## 1. Safety & Availability First
- **Zero Breakage:** The app is LIVE in the Play Store and actively used. Never modify code that could break backwards compatibility for existing app versions.
- **Cautious Execution:** Test exhaustively before applying any backend or frontend changes.
- **Zero Assumptions:** Do not invent APIs, assume external library behaviors, or guess database schemas. When in doubt, STOP and clarify.

## 2. Testing Standards
- **Mandatory Test Updates:** Whenever there is any change in the code (whether in the `frontend`, `backend`, or `mobile` folders), the corresponding tests MUST be updated or written immediately. If there is a new implementation, it must automatically include tests. The process MUST NOT stop until all tests pass successfully.
- **100% Pass Rate:** The test suites across all environments MUST pass with zero failures before committing any changes. 
- **Isolated Testing:** Use `MockSupabase` for all Supabase API interactions in backend tests. Never rely on external calls in tests.
- **Resilience:** All test functions should gracefully clean up their dependencies, e.g., restoring monkeypatched settings.

## 3. Architecture & Clean Code
- **Strict MVVM & Feature Folders:** Follow clear architectural separation. No business logic in UI components; no direct API calls from views.
- **Typed Systems:** Use strict typing everywhere (no `any` in frontend, properly annotated types in Python).
- **Graceful Failures:** Always include error states, loading states, retry logic, timeout handling, and input validation.

## 4. Automation 
- **Versioning:** Always use `node scripts/bump_version.js <version>` to increment versions for deployment. Do not manually edit `app-version.json`.
- **Migrations:** Never circumvent the defined database migration process. 

Follow these rules unconditionally to guarantee stability and scalability.
