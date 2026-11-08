# Issue 03 discovery: captioned and collapsed forms, the toggle and the Settings controls

Builds on `.scratch/rail-styles/work/01` and `02`. The row data, hooks and resize stay; the classes become per form.

## Files that change (read on a2f23133b)

- `src/lib/core/settings/settings.store.svelte.ts:62`, `settings.types.ts:90`: `railStyle`, `railCollapsed`.
- `src/lib/features/rail-shell/rail-items.logic.ts:143`: `RAIL_STYLES`, `RailStyle`, `parseRailStyle`, `parseRailCollapsed`, `railFormWidth`.
- `src/lib/features/rail-shell/Rail.svelte:199-312`: `form` derived, one class table per form (PRD § Values by form), frame width through `railFormWidth`, section title and handle only in labeled, title snippet part off in collapsed, the toggle before the frame.
- `src/lib/app/AppShell.svelte:186`: pad through `railHeaderPad(railFormWidth(...))`.
- `src/lib/features/rail-shell/RailNoteList.svelte:717`: the count hides through a container query.
- `src/lib/features/rail-shell/LayoutSection.svelte:50-51`: picker and switch above the groups; every `h3` takes `mt-6`.
- `e2e/specs/focus-ring.spec.ts:61`: click near the strip's left end.
- Tests: `rail-items.logic.test.ts`, `settings.logic.test.ts:285`, `settings.store.test.ts:157`, `Rail.test.ts`, `LayoutSection.test.ts`, `AppShell.test.ts:326`, `e2e/specs/rail-styles.spec.ts`.

## Store chain

`updateLayout` writes `settingsStore.layout`; readers: `Rail.svelte` (form, frame, toggle), `AppShell.svelte` (pad), `LayoutSection.svelte` (picker, switch). No computed getter involved.

## Plan

1. Settings and logic, test-first.
2. `Rail.test.ts` becomes `describe.each` over the three forms, labeled-only cases under `describe.runIf`. Captioned commit, then collapsed plus toggle plus pad commit (the Issue asks for one commit per form).
3. `LayoutSection` test-first.
4. Note list count, focus ring click, E2E in `rail-styles.spec.ts`.

## Prior art

- Look: `git show scratch/testes:src/lib/features/rail-shell/RailPrototypeVariant.svelte`, `rowB`, `rowSmall`, `data-rail-collapse`; `git diff main...scratch/testes -- src/lib/features/rail-shell/LayoutSection.svelte`.
- E2E: `pickStyle`, `headerClearance`, the mod and height cases in `git show scratch/testes:e2e/specs/prototype-rail.spec.ts`. Local helpers in `rail-styles.spec.ts`: `restartWithSettings`, `contrastOver`, `headerStart`, `loadMods`.

## Differs from the prototype

- Focus ring and busy mark in all forms, `text-label` badges, `text-rail` titles.
- No `aria-pressed` on the toggle: its label already changes, and the Issue lists only `title` and `aria-label`.
- No `w-full` on the pinned group: PRD § Values by form does not list it, and the nav's `items-center` centers it the same.

## Risks

- The container query measures the header's content box, which excludes the pad: the threshold has to be measured with the real header in E2E, and it must not hide the count in labeled at the same pane size.
- The toggle and the Settings switch share the name "Collapse rail", so E2E scopes each by role.

## Defaults taken

- `railFormWidth(style, collapsed, width)` takes parsed values; callers go through the parse functions, as `AppShell.test.ts:334` requires.
- The Rail style row's description is the picked style's, as in the prototype.
- `help/documentation/19-settings.md` is left to Issue 05, which owns the docs.
