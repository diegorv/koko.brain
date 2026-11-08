# 03: Captioned and collapsed forms, the toggle and the Settings controls

**What to build:** the two other forms of the rail, the toggle next to the traffic lights, and both controls in Settings > Layout. PRD § Captioned, § Collapsed, § Toggle and § Values by form hold the values. The owner rejected a tighter Captioned, so keep its spacings. The look is the prototype's `rowB` and `rowSmall` forms and its `data-rail-collapse` button.

- **Settings:** `railStyle: 'labeled'` and `railCollapsed: false` in the layout defaults and `LayoutSettings`.
- **Logic in `rail-items.logic.ts`:** `RAIL_STYLES` (key, name, description), `parseRailStyle(saved: unknown)` (only `'captioned'` gives captioned, anything else `labeled`), `parseRailCollapsed(saved: unknown)` (only the boolean `true` collapses), and `railFormWidth`, the rail's width in px from style, collapsed state and saved width: 48 when collapsed, else 84 for captioned, else the saved width. The labeled description is "Titles, sections and counts; drag the edge to resize"; the captioned one is "A caption under each icon".
- **`Rail.svelte`:** draw the same data through the one row snippet from Issue 01, with the classes of the form, and set `data-rail-form` to `labeled`, `captioned` or `collapsed`. Same hooks, focus ring, tint, colors, busy mark and whole-rail scroll in all of them. The resize handle shows only in labeled. Collapsing keeps `railStyle` and `railWidth`, and expanding returns to them.
- **Captioned:** titles use `text-rail`, so both titled forms match. Long names truncate, with the full name in `title`. No section titles. The Inbox badge sits absolutely on the button at 11 px (`text-label`).
- **Collapsed:** no titles, native tooltip only. The Inbox badge sits absolutely on the button at 11 px (`text-label`).
- **Toggle:** in `Rail.svelte`, outside the `nav` so it never scrolls: `PanelLeft` at `size-3.5` in a `size-6` button, same classes as the right sidebar toggle (`AppShell.svelte:190`), `fixed` at `left: 88px; top: 7px`, `z-40`, `data-rail-collapse`. `title` and `aria-label` are "Collapse rail" or "Expand rail". In every form, so a second click undoes the first. No new keybinding, and Cmd+Shift+B stays "Toggle Rail Panels".
- **Header pad:** `AppShell.svelte` computes `--rail-header-pad` through `railHeaderPad(railFormWidth(...))`. Collapsed gives 72 px and captioned 36 px, so header text starts at 120 px, 8 px past the toggle.
- **Note list header:** collapsed at 1440 px with the default list size, the sort arrow touches the search icon in `RailNoteList.svelte`'s header. Fix it by hiding `[data-note-list-count]` through a container query when the header is narrow (the header already has `@container`).
- **`LayoutSection.svelte`:** above the "Rail top" group, with no new `h3`: a `SettingItem` "Rail style" with one `Button` per style (`data-rail-style-picker`, `aria-pressed`), then a `SettingItem` "Collapse rail" with a `Switch`, described as "Show the small rail with colored icons. The toggle next to the window controls does the same." The first `h3` now has rows above it, so all of them take the top margin.
- **`e2e/specs/focus-ring.spec.ts:61`** clicks the center of `[data-rail] [data-tauri-drag-region]` to start tabbing. At 192 px that point is under the toggle, so Playwright's click fails on the intercepting element. Click a `position` near the strip's left end, keeping the test's intent.

**Blocked by:** 02

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, then `bash scripts/e2e.sh e2e/specs/rail-styles.spec.ts e2e/specs/rail-shell.spec.ts e2e/specs/sidebars.spec.ts e2e/specs/focus-ring.spec.ts e2e/specs/vault-mods.spec.ts e2e/specs/rail-list-toolbar.spec.ts`.

- [x] Failing tests were written first and seen failing, for each item below.
- [x] `parseRailStyle`: `labeled`, `captioned`, the prototype's `A` and `B`, a number, `null`.
- [x] `parseRailCollapsed`: `true`, `false`, `"true"`, `1`, `null`.
- [x] `railFormWidth`: labeled with a saved width, captioned ignoring a saved width of 300, and 48 for each style when collapsed. `railHeaderPad` of 84 is 36 and of 48 is 72.
- [x] `mergeLayout` keeps `railStyle` and `railCollapsed` from a saved file, and an old file gets `labeled` and `false`.
- [x] `Rail.test.ts` runs its form-independent cases against all three forms (`describe.each`): hooks, divider token, tint, active title class where a title shows, focus ring, whole-rail scroll, pin behavior, busy mark, the Inbox badge hidden by `railInboxBadge: false`, and the actions block placed after its divider and before the bottom group, with both gone after the last action unregisters.
- [x] `Rail.test.ts` covers a registered action in captioned: `[data-rail-actions] [aria-label="Tasks"]`, the title shown, `run` on click, `onSelect` not called, no `aria-current`, no tint.
- [x] `Rail.test.ts` covers a registered action in collapsed: `[data-rail-actions] [aria-label="Tasks"]`, no `[data-rail-title]`, `run` on click, `onSelect` not called, no `aria-current`, no tint.
- [x] `Rail.test.ts`: captioned and collapsed have no `[data-rail-section-title]` and no `[data-rail-resize]`.
- [x] `Rail.test.ts`: the toggle is outside `[data-rail]`, its label follows the real store, and a click flips `railCollapsed` in the real store and leaves `railStyle` and `railWidth` alone.
- [x] `LayoutSection.test.ts`: the picker shows both styles, `aria-pressed` follows the real store, a click writes the real store; the switch follows and writes the real store; the existing heading list passes unchanged.
- [x] E2E, captioned: picked through Settings > Layout, the rail is 84 px, the buttons 72 px; the file on the mock FS holds `railStyle`; a restart from that saved file (`restartWithSettings` in `e2e/specs/rail-shell.spec.ts`) opens captioned; a hand-edited unknown value opens labeled.
- [x] E2E, captioned: title font family, size, weight and letter spacing equal labeled's, idle and active; every built-in caption fits with no truncation.
- [x] E2E, captioned: with a real mod loaded, clicking `[data-rail-actions] [aria-label="<title>"]` opens the picker and shows the mod's action.
- [x] E2E, captioned: header clearance, divider contrast of at least 1.5 and active title contrast of at least 4.5 on Lavender Haze and the default dark theme, and the 600 px height case from Issue 01.
- [x] E2E, collapsed: from labeled and from captioned, collapsing gives 48 px and expanding returns to that style and, for labeled, to the dragged width; the toggle's bounding box is identical before and after, and a second click undoes the first; a restart from the saved file opens collapsed.
- [x] E2E, collapsed: with a real mod loaded, clicking `[data-rail-actions] [aria-label="<title>"]` opens the picker and shows the mod's action.
- [x] E2E, collapsed: divider contrast of at least 1.5 on Lavender Haze and the default dark theme, and the 600 px height case from Issue 01.
- [x] E2E, collapsed at 1440 px with the default list size: the sort trigger and the search icon in the note list header do not overlap.
- [x] E2E, toggle in every form: stays at left 88 and top 7; its bottom is above the 40 px where the rail's edge starts; it never overlaps the rail's edge (in captioned and collapsed its left is past the rail's right edge); header text starts past its right edge, also with the navigator open.
- [x] E2E: with the panels hidden (Cmd+1), the editor tabs start past the toggle in collapsed and captioned.
- [x] `e2e/specs/sidebars.spec.ts` and the Cmd+Shift+B test in `rail-shell.spec.ts` pass unchanged.

## Notes

- `git diff main...scratch/testes -- src/tests/lib/features/rail-shell/RailPrototypeVariant.test.ts` shows the form cases; move them into `Rail.test.ts`, not into a file named for the prototype.
- The traffic lights exist only in Tauri. E2E proves the toggle's position, not its look beside them; the owner checks that after the last delivery.
- This is the largest diff of the feature. Commit captioned and collapsed separately on the branch, so a review can read each form on its own.

## Comments

2026-11-06, branch `issue/03-captioned-and-collapsed`: the rail has its captioned (84 px) and collapsed (48 px) forms through the one row snippet, the `data-rail-collapse` toggle at left 88, top 7 in every form, and the Rail style picker and Collapse rail switch in Settings > Layout. `layout.railStyle` and `layout.railCollapsed` are saved, and `--rail-header-pad` follows the form. The note list count hides under a 12rem container query. Deliver changed no app code: finding 1 became Issue 08, finding 2 a note in Issue 05.
Tests: full suite at 78fdbab32 (`pnpm vitest run && pnpm build`) exit 0, 568 files, 13656 passed, 54 skipped, 1 todo, build done. E2E in the review on the six gate specs: 111 passed.
Reviews: round 1 APPROVED (one minor and one nit, both resolved with no code change).
