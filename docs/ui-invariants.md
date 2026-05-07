# UI Invariants (V2 Redesign)

These rules are non-negotiable for the redesign.

## Navigation and Shell

- Primary app routes are `/users`, `/server`, `/logs`.
- Mobile uses a slide-in drawer and hamburger trigger.
- Theme system uses CSS variables via `data-theme` attribute.

- [x] Sidebar navigation is mandatory for desktop layouts.
- [x] Top tabs are removed in V2 shell.

## Token and Theme System

- [x] All themes share the same variable schema.
- [x] Cards use flat surfaces (`--bg-surface`) with subtle borders.
- [x] No heavy gradients on cards (only on primary CTA).
- [x] No card-level gradients (server page).
- [x] Single shadow `var(--shadow-card)` (server page).

## Typography and Spacing

- Allowed size scale: `11, 12, 13, 14, 16, 20, 24`.
- Radius scale: `6, 8, 10` for regular components.
- [x] UI font is Inter.
- [x] Technical values (IP, ports, hashes, byte counts) use JetBrains Mono.
- [x] Monospace tabular figures are used for all numeric values (users page: KPI values and TopUsersList bytes column).

## Components and States

- [x] Buttons use only `primary`, `secondary`, `ghost` variants (server page cards and daemon header actions in PR 5a).
- [x] Button heights are constrained to `28`, `32`, `36` (server page card actions use 32/36 in PR 5a).
- [x] Buttons via shared `Button` component (server page).
- [x] Form fields via shared `Field` component (server page).
- [x] Dirty state indicated by accent dot near section title (server page).
- [x] Every data view has loading state (skeleton) (users page: KPI strip cards).
- [x] Every data view has empty state (icon + title + description + CTA) (users page: TopUsersList today/month).
- [ ] Every data view has error fallback.
- [ ] Focus ring is visible and consistent (`2px` accent with offset).

## Motion and Interaction

- [x] Color/background/border transitions are short and subtle.
- [ ] Global layout animations are avoided; scoped framer-motion transitions only.
- [x] Sidebar expand/collapse behavior is smooth and deterministic.

## Form Behavior

- [x] Saves are scoped by section/card (no unrelated global save actions) (server page cards in PR 5a).
- [ ] While submitting, relevant controls are disabled.
- [ ] Validation and API errors are surfaced clearly.

## Logs and Data Density

- [x] Logs support high-volume rendering (logs page: virtualized stream with fixed row height in PR 5b).
- [x] Logs toolbar is sticky and compact with segmented level filter (logs page).
- [x] Logs include explicit pause and auto-scroll controls (logs page).
- [x] Logs search and filtered download operate on client-side buffer only (logs page).
- [ ] Status pill component is used everywhere (single source).
