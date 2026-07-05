# Versioning and Deployment Instructions

To ensure consistent app updates and safe deployment to the Play Store, always follow these instructions.

## Updating the App Version

Never manually edit `app-version.json`, `app.config.js`, or native Android/iOS files. Instead, use the automated script:

```bash
node scripts/bump_version.js <new-version>
```

### Example
If the current version is `1.0.2` and the `androidVersionCode` is `38`, running:
```bash
node scripts/bump_version.js 1.0.3
```
Will automatically:
1. Update `version` to `"1.0.3"`.
2. Increment `androidVersionCode` to `39`.
3. Increment `iosBuildNumber` to `"39"`.

This updates the single source of truth (`shared/app-version.json`), which is read by `mobile/app.config.js` during Expo compilation.

## Play Store Considerations
- The Google Play Store **requires** every new uploaded bundle (`.aab` or `.apk`) to have a strictly higher `versionCode` than the previous one. If you uploaded build `38`, the next one must be `39` or higher.
- If we accidentally upload build `37` when `38` is already live, the Play Store **will reject it**. 
- Because we automatically increment `+1` on each bump, the Play Store will gracefully accept our new builds.

## Final Checks Before Release
1. Run `node scripts/bump_version.js <version>`.
2. Verify tests pass: `cd backend && source .venv/bin/activate && pytest -v`.
3. Build the app using Expo/EAS (`eas build --platform android --profile production`).
