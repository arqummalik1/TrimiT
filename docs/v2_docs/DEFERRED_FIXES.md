# TrimiT - Deferred Fixes & Tech Debt

This file stashes items that were discovered but deferred to avoid disrupting the current stability and live production environment of the TrimiT application.

## Test Refinements
- **`pytest` Warnings:** There are a few `StarletteDeprecationWarning`s for `HTTP_422_UNPROCESSABLE_ENTITY` and `PydanticDeprecatedSince20` warnings for class-based configs in `models/staff.py`. We should migrate these to Pydantic V2 schemas and updated Starlette constants in the next major API version.

## Mobile Architecture
- **Offline Caching:** Some UI components still rely heavily on immediate network availability. Implementing a more robust offline-caching layer using WatermelonDB or enhanced AsyncStorage logic should be scoped out.
- **Micro-Animations:** Look into migrating certain React Native `Animated` flows to `react-native-reanimated` (v3) for better UI performance on low-end Android devices.

## Backend Improvements
- **Rate Limiting Edge Cases:** Review the exact throttle behaviors for `/resend-confirmation` under extremely high loads to ensure distributed consistency across workers.

*Do not apply these fixes to the main branch without extensive testing and an approved plan.*
