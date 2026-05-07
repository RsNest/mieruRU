# UI Invariants (V2 Redesign)

These rules are non-negotiable for the redesign.

## Navigation and Shell

- Primary app routes are `/users`, `/server`, `/logs`.
- Mobile uses a slide-in drawer and hamburger trigger.
- Theme system uses CSS variables via `data-theme` attribute.

- [ ] Sidebar navigation is mandatory for desktop layouts.
- [ ] Top tabs are removed in V2 shell.

## Token and Theme System

- [ ] All themes share the same variable schema.
- [ ] Cards use flat surfaces (`--bg-surface`) with subtle borders.
- [ ] No heavy gradients on cards (only on primary CTA).

## Typography and Spacing

- Allowed size scale: `11, 12, 13, 14, 16, 20, 24`.
- Radius scale: `6, 8, 10` for regular components.
- [ ] UI font is Inter.
- [ ] Technical values (IP, ports, hashes, byte counts) use JetBrains Mono.
- [ ] Monospace tabular figures are used for all numeric values.

## Components and States

- [ ] Buttons use only `primary`, `secondary`, `ghost` variants.
- [ ] Button heights are constrained to `28`, `32`, `36`.
- [ ] Every data view has loading state (skeleton).
- [ ] Every data view has empty state (icon + title + description + CTA).
- [ ] Every data view has error fallback.
- [ ] Focus ring is visible and consistent (`2px` accent with offset).

## Motion and Interaction

- [ ] Color/background/border transitions are short and subtle.
- [ ] Global layout animations are avoided; scoped framer-motion transitions only.
- [ ] Sidebar expand/collapse behavior is smooth and deterministic.

## Form Behavior

- [ ] Saves are scoped by section/card (no unrelated global save actions).
- [ ] While submitting, relevant controls are disabled.
- [ ] Validation and API errors are surfaced clearly.

## Logs and Data Density

- [ ] Logs support high-volume rendering (virtualization target in PR 5).
- [ ] Status pill component is used everywhere (single source).
