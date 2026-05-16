# EAS / Play Store ops (manual steps)

Code changes handle permissions, R8, and signing config hooks. These steps require your Expo/Google accounts.

## B1 — Upload keystore

```bash
cd mobile
eas credentials -p android
```

Choose production profile → set up a new Android Keystore. **Back up** the keystore file and passwords off-machine.

## B5 — Google Maps API key

1. GCP Console → APIs & Services → Credentials
2. Edit `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
3. Application restrictions → Android apps
4. Add package name: `com.trimit.app`
5. Add SHA-1 fingerprints:
   - From EAS upload keystore: `eas credentials -p android` → show fingerprints
   - From Play Console → App signing → **App signing key certificate** (after first internal upload)

## Production build

```bash
cd mobile
eas build --profile production --platform android
```

Upload the AAB to Play Console internal testing track.
