# UI Invariants (V2 Redesign)

These rules are non-negotiable for the redesign.

## Navigation and Shell

- Sidebar navigation is mandatory for desktop layouts.
- Top tabs are removed in V2 shell.
- Primary app routes are `/users`, `/server`, `/logs`.
- Mobile uses a slide-in drawer and hamburger trigger.

## Token and Theme System

- All themes share the same variable schema.
- Cards use flat surfaces (`--bg-surface`) with subtle borders.
- Heavy card gradients are not allowed.
- Only primary CTA may use gradient treatment.

## Typography and Spacing

- UI font: Inter.
- Technical values (IP, ports, hashes, byte counts): JetBrains Mono.
- Allowed size scale: `11, 12, 13, 14, 16, 20, 24`.
- Radius scale: `6, 8, 10` for regular components.

## Components and States

- Buttons: only `primary`, `secondary`, `ghost`.
- Button heights: `28`, `32`, `36`.
- Every data view must define:
  - loading state (skeleton),
  - empty state (icon + title + description + CTA),
  - error fallback.
- Focus ring must be visible and consistent:
  - `2px` accent with offset.

## Motion and Interaction

- Color/background/border transitions are short and subtle.
- Avoid global layout animations; use scoped framer-motion transitions.
- Sidebar expand/collapse target is smooth and deterministic.

## Form Behavior

- Saves are scoped by section/card; avoid unrelated global save actions.
- While submitting, relevant controls are disabled.
- Validation and API errors must be surfaced clearly.

## Logs and Data Density

- Logs must support high-volume rendering (virtualization target in PR 5).
- Numeric columns should use tabular figures for alignment.
- Status indicator style is unified via one status-pill component.
