# @dnc/mobile

Expo 57 (React Native + Expo Router) mobile app. Not scaffolded yet — created
with `create-expo-app` in Sprint 0 week 2 so the generated native config
matches the pinned SDK.

House rules that apply from the first commit:

- Types and validation come from `@dnc/contracts`; business rules from `@dnc/domain`.
- Design tokens from `@dnc/tokens`; no components shared with web.
- Every user-facing string goes through an i18n key present in both catalogs of `@dnc/i18n`.
- Requires `node-linker=hoisted` in the workspace root `.npmrc` (Metro cannot follow nested symlinks).
