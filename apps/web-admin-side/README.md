# @dnc/web-admin

Next.js 16 (App Router) operations console for Da Nang Connect staff
(curator, moderator, admin, super admin). Scaffolded to mirror
`apps/web-client-side` (same framework versions, same rewrite-to-API pattern,
same design tokens) — see the task board at
`.agent/specs/_changes/rbac-admin-shell/task-board.md` for the sequence this
was built in.

House rules that apply from the first commit:

- Every route lives behind the staff login gate; the console is never public.
  `robots.ts` disallows all crawlers and every page's metadata sets
  `robots: { index: false, follow: false }`. No sitemap, no Open Graph.
- Types and validation come from `@dnc/contracts`; business rules from `@dnc/domain`.
- Design tokens from `@dnc/tokens`; no components shared with mobile.
- Every user-facing string goes through an i18n key present in both catalogs of `@dnc/i18n`.
- Desktop-first, but still responsive at 768px / 1280px / 1920px.
