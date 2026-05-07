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
  - `NEXT_PUBLIC_UI_V2=1`: enable V2 shell/routes
  - `NEXT_PUBLIC_UI_V2=0` or unset: keep legacy behavior
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
