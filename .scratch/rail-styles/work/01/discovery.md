# Issue 01 discovery: labeled rail at 192 px

## Files that change (read on 2bb533a90)

- `src/lib/features/rail-shell/rail-items.logic.ts:119`: add palette, `railItemColor`, `RAIL_PIN_COLOR`, `RAIL_ACTION_COLOR`, `RAIL_WIDTH`, `railHeaderPad`.
- `src/lib/features/rail-shell/Rail.svelte:92-203`: replace `buttonClass` and the three button snippets with `Row`, one row snippet and one icon snippet; frame, strip, edge, section titles, whole-rail scroll.
- `src/app.css:74-92`, `src/lib/utils/text-roles.ts:6`: `rail` role.
- `src/tests/lib/chrome-type-scale.test.ts:20-22`: drop the Rail entry from `BELOW_FLOOR`.
- `src/lib/app/AppShell.svelte:186,253-254`: root `--rail-header-pad`; spacer width and comment.
- `RailNoteList.svelte:707-709`, `SearchPanel.svelte:73-75`, `FilesNavigator.svelte:300-302`, `TypesNavigator.svelte:214-216`, `CalendarNavigator.svelte:86-88`: `pl-[var(--rail-header-pad)]` and comment.
- `src/lib/core/settings/settings.store.svelte.ts:67-71`: `navigatorSize: 13`, `noteListSize: 18`, comment.
- `e2e/specs/rail-shell.spec.ts:296-298`: spacer and tab measured against the rail's right edge.
- New `e2e/specs/rail-styles.spec.ts`.

## Plan

1. Logic and its tests (`rail-items.logic.test.ts`).
2. `rail` text role (`text-roles.test.ts` gets the 13px case).
3. `Rail.svelte` plus `Rail.test.ts` adapted from the prototype diff, and the `BELOW_FLOOR` entry.
4. Header clearance plus `RailNoteList.test.ts`, `SearchPanel.test.ts`, `AppShell.test.ts`.
5. Pane defaults plus `settings.store.test.ts:151-152`, `settings.service.test.ts:524`.
6. E2E: `rail-shell.spec.ts`, new `rail-styles.spec.ts`; run the Issue's E2E list.

## Prior art

- Look: `git show scratch/testes:src/lib/features/rail-shell/RailPrototypeVariant.svelte`, branch `style === 'A'`, snippets `dragStrip`, `edge`, `icon`. PRD § Values by form holds the classes.
- Tests: `git diff main...scratch/testes -- src/tests/lib/features/rail-shell/Rail.test.ts`, `tinted()` helper.
- E2E: `git show scratch/testes:e2e/specs/prototype-rail.spec.ts`: `files()`, `dividerContrast`, active title contrast, `mod rail buttons`, `headerClearance` minus the toggle.

## Differs from the prototype

- Focus ring, `aria-busy` and `[data-rail-busy]` come from main; the row gets `relative` for the dot.
- `--rail-header-pad` is an inline style on AppShell's root, with no `document.documentElement` write and no CSS fallback.
- Pill uses `text-label`, no `text-[11px] leading-4`. Titles use `text-rail`.

## Risks

- Saved pane sizes win over the new defaults (PRD § Known limits): no migration.
- `settings.logic.ts:26-27` hands the rail defaults to pre-rail files, so those get 13 and 18 too. Intended.
- Busy is read in the row snippet, not when the row is built, so a `busy()` change does not rebuild every row.

## Defaults taken

- `RAIL_WIDTH` holds only `default: 192` for now; Issue 02 adds the clamp bounds.
- `BELOW_FLOOR` stays as an empty record, so the test keeps its allowlist shape.
- A pin passes `resolved.color` to `IconRenderer` unchanged, as main does; the row color for the tint is `iconColorCss(resolved?.color) ?? RAIL_PIN_COLOR`.
