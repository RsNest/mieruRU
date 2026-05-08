# UI V2 Migration Plan (PR 1 Baseline)

This document defines the migration sequence and gate checks for the panel UI redesign.

## Scope

- Stack stays: Next.js 15 App Router, Tailwind v4, Zustand, framer-motion.
- Migration order:
  1. Plan and baseline
  2. Tokens and theme rebalance
  3. Layout shell migration (tabs -> sidebar)
  4. Users content density + charts
  5. Server + Logs + consistency audit

## PR Breakdown

### PR 1 - Planning and Baseline

- Add migration docs and gate checklist.
- Capture baseline screenshots:
  - `Users`, `Server`, `Logs`
  - Theme: `midnight` + one alternate theme (`ghost`)
- Define feature-flag behavior:
  - Historical note: `NEXT_PUBLIC_UI_V2` controlled V1/V2 rollout during migration.
  - V2-only mode is now the default (legacy shell removed in `refactor(mieru-panel): remove legacy layout and feature flag`).
- Create i18n key map for existing and upcoming UI keys.

### PR 2 - Design Tokens and Theme System

- Rewrite token system in `app/globals.css` using a shared variable structure.
- Rebalance all themes (`midnight`, `sakura`, `ghost`, `daylight`, `solar`, `cyber`).
- Reduce heavy gradients and glows (cards become flat surfaces).
- Keep gradient only for primary CTA.

### PR 3 - Sidebar Shell and Route Migration

- Migrate top tabs to sidebar shell.
- Introduce routes: `/users`, `/server`, `/logs`.
- Add mobile drawer with hamburger.
- Keep auth guard behavior intact on new routes.
- Handle legacy links:
  - `?tab=users|server|logs` redirects to route equivalents.

### PR 4 - Users Page Density and Charts

- Compact KPI strip.
- Replace broken bar experience with:
  - 24h traffic chart (if hourly buckets exist),
  - top users monthly list with animated bars.
- If hourly buckets are unavailable, switch scope to last 7d chart or add API work item.

### PR 5 - Server/Logs Redesign and Final Audit

- Compact server header and 2-column section cards.
- Logs toolbar and virtualized stream polish.
- Final consistency pass for buttons/modals/focus/loading/empty states.
- Accessibility gate with axe-core or Lighthouse.

## Risk and Rollback Notes

- PR 3 is highest risk (shell and route split).
- Feature flag allows staged rollout and rollback to legacy shell without code revert.
- Theme rebalance in PR 2 requires smoke tests across all pages and all themes.

## Gate Checklist

- Baseline screenshots captured and committed.
- Feature flag path tested in both modes.
- i18n map reviewed before introducing new keys.
- Theme smoke test (`/users`, `/server`, `/logs`) across all themes.
- Legacy `?tab` deep links verified.
- A11y checks run before final merge.

## PR 2 Changelog

### Changed

- Replaced legacy panel color tokens with unified `--color-*` token system.
- Added Tailwind v4 `@theme` token declarations for color/radius/font baselines.
- Rebalanced all existing themes (`midnight`, `sakura`, `ghost`, `daylight`, `solar`, `cyber`) under one token schema.
- Simplified card and modal visuals to flat surfaces with subtle borders and a single card shadow.
- Reduced background pattern intensity to low-opacity grid + radial fade.
- Captured smoke-test screenshots for 6 themes × 3 pages in `docs/screenshots/pr2/`.

### Not Changed

- No layout shell migration (tabs and existing page structure remain as-is).
- No route migration to `/users`, `/server`, `/logs`.
- Historical note: this entry refers to pre-removal migration stage (`NEXT_PUBLIC_UI_V2` has since been removed and V2 is default).

## PR 3 Changelog

### Changed

- Added a dedicated V2 shell with sidebar + top bar (`LayoutV2`).
- Added route pages `/users`, `/server`, `/logs` and wired them to existing dashboard tab content.
- Added middleware redirects for legacy deep links:
  - `/?tab=users|server|logs` -> `/users|/server|/logs` (308)
  - `/?tab=<unknown>` -> `/users`
  - `/` -> `/users` (current behavior)
- Historical note: legacy shell path (`NEXT_PUBLIC_UI_V2=0`) existed during rollout and was removed later.
- Added PR3 screenshot artifacts for both legacy mode and V2 mode.
