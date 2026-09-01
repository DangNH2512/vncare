# @dnc/web

Next.js 16 (App Router) web app. Not scaffolded yet — created with
`create-next-app` in Sprint 0 week 2 so the generated config matches the
pinned framework version instead of a hand-written imitation.

House rules that apply from the first commit:

- Types and validation come from `@dnc/contracts`; business rules from `@dnc/domain`.
- Design tokens from `@dnc/tokens`; no components shared with mobile.
- Every user-facing string goes through an i18n key present in both catalogs of `@dnc/i18n`.
