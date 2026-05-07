# PR5c Audit Report (Stage 1, no code changes)

Scope reviewed: `mieru-panel/panel/components/` + related styles in `mieru-panel/panel/app/globals.css` and usage-level checks requested by grep commands.

## Invariant 1: Buttons

| инвариант | файл:строка | текущее состояние | предложенный fix |
| --- | --- | --- | --- |
| Only shared variants via `Button` | `mieru-panel/panel/components/AddUserModal.tsx:302` | Raw `<button className="btn-secondary">` and `<button className="btn-primary">` still used directly | Replace with shared `Button` component and explicit `variant` |
| Only shared variants via `Button` | `mieru-panel/panel/components/ConfirmModal.tsx:84` | Uses `btn-danger` class (4th variant outside invariant set) | Introduce `danger` tone through unified status/action API or remap destructive action to shared `Button` pattern |
| No raw `<button>` with ad-hoc styles | `mieru-panel/panel/components/SubPanel.tsx:155` | Multiple raw action buttons (`action-btn`, plain button usage) | Migrate to shared `Button` and normalize action size/spacing |
| Button heights 28/32/36 only | `mieru-panel/panel/app/globals.css:511` | `.btn-primary`/`.btn-secondary` use padding-based height (implicit, not constrained to 28/32/36) | Set explicit size classes and refactor all button usages to size tokens |
| Gradient only for single primary CTA | `mieru-panel/panel/app/globals.css:517` | Global `.btn-primary` applies gradient to every primary button across all pages | Restrict gradient to one CTA class per page and keep standard primary flat |

## Invariant 2: Modals

| инвариант | файл:строка | текущее состояние | предложенный fix |
| --- | --- | --- | --- |
| Max width 480px | `mieru-panel/panel/app/globals.css:1313` | `.modal` is `max-width: 420px` | Raise to 480px token or make modal sizes explicit by variant |
| Padding 16px | `mieru-panel/panel/app/globals.css:1311` | `.modal` uses `padding: 28px` | Reduce to 16px baseline and adjust internal spacing |
| Backdrop blur + 60% black | `mieru-panel/panel/app/globals.css:1298` | Backdrop is rgba(0,0,0,0.65), blur is correct | Adjust opacity to 0.60 for invariant compliance |
| X close button required | `mieru-panel/panel/components/AddUserModal.tsx:180` | Modal has title/actions but no top-right close button | Add shared close icon button in modal header for all modal components |
| Footer right-aligned actions | `mieru-panel/panel/app/globals.css:1399` | `modal-actions` right aligned (compliant) | Keep as-is; no change needed |

## Invariant 3: Empty states

| инвариант | файл:строка | текущее состояние | предложенный fix |
| --- | --- | --- | --- |
| Empty state requires icon + title + description + CTA | `mieru-panel/panel/components/UserTable.tsx:104` | Plain text empty (`users_empty`) without structured icon/title/CTA | Replace with reusable empty-state component |
| Empty state structure consistency | `mieru-panel/panel/components/logs/AuditList.tsx:18` | Audit empty is plain muted text | Add icon + title + description + optional action |
| Empty state structure consistency | `mieru-panel/panel/components/logs/LogStream.tsx:65` | Logs empty is one muted line | Use standardized empty block (icon/title/description) |
| Empty state structure consistency | `mieru-panel/panel/components/ConnectionsPanel.tsx:55` | Connections empty/unavailable are plain text lines | Introduce compact but structured empty/error view |

## Invariant 4: Loading states

| инвариант | файл:строка | текущее состояние | предложенный fix |
| --- | --- | --- | --- |
| Prefer skeleton over text loading | `mieru-panel/panel/components/ConnectionsPanel.tsx:51` | Uses text `loading` instead of skeleton placeholders | Add table/list skeleton rows |
| Prefer skeleton over text loading | `mieru-panel/panel/components/logs/AuditList.tsx:16` | Loading text only | Add compact skeleton audit rows |
| Spinner only allowed inline in buttons | `mieru-panel/panel/components/users/KpiStrip.tsx:59` | KPI already uses skeleton (compliant reference) | Reuse KPI skeleton pattern in other lists/cards |

## Invariant 5: Focus rings

| инвариант | файл:строка | текущее состояние | предложенный fix |
| --- | --- | --- | --- |
| 2px accent + 2px offset | `mieru-panel/panel/app/globals.css:1386` | Uses `box-shadow: 0 0 0 2px var(--color-accent)` without offset token | Add `outline: 2px solid ...; outline-offset: 2px` shared focus utility |
| Avoid removing default focus without replacement | `mieru-panel/panel/app/globals.css:1144` | `outline: none` on inputs before shared focus style | Move focus logic to consistent utility class and ensure keyboard-visible styling everywhere |
| Focus consistency across controls | `mieru-panel/panel/app/globals.css:2053` | Search input uses custom outline mix, differs from field controls | Unify all control focus styles via one tokenized rule |

## Invariant 6: Transitions

| инвариант | файл:строка | текущее состояние | предложенный fix |
| --- | --- | --- | --- |
| Only 150ms ease-out on color/bg/border | `mieru-panel/panel/app/globals.css:379` | `transition: all 0.15s ease` | Replace with explicit `background-color, border-color, color 150ms ease-out` |
| No transition: all | `mieru-panel/panel/app/globals.css:1087` | `transition: all 0.15s ease` remains | Replace with specific properties |
| Scoped timing consistency | `mieru-panel/panel/app/globals.css:531` | Uses `0.2s ease`, `0.5s ease`, `0.6s ease` in button/chip animations | Normalize to invariant timings or isolate exceptions in docs |

## Invariant 7: Tabular numbers

| инвариант | файл:строка | текущее состояние | предложенный fix |
| --- | --- | --- | --- |
| Numeric columns use tabular nums | `mieru-panel/panel/app/globals.css:2815` | `log-time-v2` has tabular numeric (compliant) | Keep as baseline |
| Numeric columns use tabular nums | `mieru-panel/panel/app/globals.css:2935` | `audit-time-v2` has tabular numeric (compliant) | Keep as baseline |
| Numeric values everywhere in tables/cards | `mieru-panel/panel/app/globals.css:2248` | `kpi-value` has no explicit `font-variant-numeric` | Add tabular numeric to KPI numbers for consistency |

## Invariant 8: Status pills single source

| инвариант | файл:строка | текущее состояние | предложенный fix |
| --- | --- | --- | --- |
| One shared status pill component | `mieru-panel/panel/components/TopBar.tsx:62` | `v2-status-pill` custom implementation | Introduce shared `StatusPill` component |
| One shared status pill component | `mieru-panel/panel/components/server/DaemonHeader.tsx:87` | `daemon-chip` custom implementation | Migrate to shared `StatusPill` variants |
| One shared status pill component | `mieru-panel/panel/components/logs/AuditRow.tsx:25` | `audit-result-v2` custom status chip | Reuse shared `StatusPill` with tone mapping |
| One shared status pill component | `mieru-panel/panel/components/ConnectionsPanel.tsx:45` | Generic `badge` count pill | Decide if this remains count badge or convert to shared badge/pill primitives |

## Invariant 9: Native confirm/prompt/alert

| инвариант | файл:строка | текущее состояние | предложенный fix |
| --- | --- | --- | --- |
| Zero native `confirm/prompt/alert` | `mieru-panel/panel/components/SubPanel.tsx:109` | `confirm(...)` still used in reset devices flow | Replace with existing `ConfirmModal` flow (same pattern as backup restore) |

## Invariant 10: Card-level gradients

| инвариант | файл:строка | текущее состояние | предложенный fix |
| --- | --- | --- | --- |
| No card-level gradients | `mieru-panel/panel/app/globals.css:172` | Background grid uses layered `linear-gradient` on app shell | Keep only if explicitly exempted as app-background, otherwise replace with flat token |
| No card-level gradients | `mieru-panel/panel/app/globals.css:517` | Primary button gradient globally enabled | Limit gradient to one page CTA and keep cards/surfaces flat |
| No card-level gradients | `mieru-panel/panel/app/globals.css:1371` | Select caret uses linear-gradients (functional icon rendering) | Keep as functional UI affordance; not card gradient |

## Priority Summary

- HIGH (нарушает UX/безопасность): **4 items**
  - Native `confirm` in `SubPanel`
  - Missing modal close affordance consistency
  - Button variant drift (`btn-danger` + raw button usage)
  - Global primary gradient over-application
- MEDIUM (косметика, видна юзеру): **12 items**
  - Empty/loading structural inconsistencies
  - Focus ring mismatch and missing offset
  - Transition rules divergence
  - Status pill duplication
- LOW (внутренняя консистентность): **6 items**
  - Numeric typography gaps outside strict table contexts
  - Modal size/padding token mismatch
  - Background gradient classification/documentation mismatch

## Legacy out of scope

Legacy shell/components are excluded from PR5c fixes (flagged path still present):

- `mieru-panel/panel/components/Layout.tsx` matches legacy patterns (`btn-primary|btn-secondary|tab-pane|active-tab` grep scope)

These locations are intentionally deferred and should be handled only in a dedicated legacy-removal or legacy-cleanup PR.
