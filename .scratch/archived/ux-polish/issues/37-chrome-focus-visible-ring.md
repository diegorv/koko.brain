# 37: Chrome buttons and rows show the app's focus-visible ring

**What to build:** The main chrome controls carry no focus class, so keyboard focus on them shows only the browser fallback ring, which a scrolling column can clip. Give them the two focus recipes the review standardises (review section 2 "State styles"; `work/states.md` R2), using `focus-visible:` utilities only, so mouse clicks and the existing selected and drop-target states do not change:
- Standalone buttons: `focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50` (the `src/lib/components/ui/button/button.svelte:7` recipe).
- Dense rows and rail buttons: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset`, so the ring is not clipped.

Sites:
- `src/lib/features/rail-shell/Rail.svelte` `buttonClass()` (about line 78), used by rail items and pinned items: row recipe.
- `src/lib/app/SettingsPanel.svelte` close button (about line 125): button recipe; section nav buttons (about line 140): row recipe.
- `src/lib/features/note-list/NoteRow.svelte` `data-note-row` button (about line 61): row recipe.
- `src/lib/features/rail-shell/FilesNavigator.svelte` `rowClass()` (about line 283): row recipe, as `focus-visible:` utilities so the drop-target `outline-dashed outline-1 outline-ring` stays as it is.
- `src/lib/features/rail-shell/TypesNavigator.svelte` row buttons (about lines 265 and 403): row recipe; "Create a type" and "New view" header buttons (about lines 207 and 237): button recipe.
- `src/lib/features/rail-shell/RailNoteList.svelte` header action and "New here" buttons (about lines 468 and 480): button recipe.
- `src/lib/app/EditorView.svelte` the four source-mode toggle buttons (about lines 92, 105, 118, 131): button recipe.
- `src/lib/core/settings/sections/EditorSection.svelte:53` "Browse" `Popover.Trigger`: replace `focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none` with the button recipe (today the ring also shows on a mouse click).

**Blocked by:** 36

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`, plus `./scripts/e2e.sh e2e/specs/focus-ring.spec.ts e2e/specs/file-explorer.spec.ts e2e/specs/file-operations.spec.ts e2e/specs/rail-shell.spec.ts e2e/specs/settings.spec.ts`.

- [x] Failing first: `e2e/specs/focus-ring.spec.ts` gains cases that focus by keyboard a rail item (`[data-rail-item]`), a Files navigator row, a note-list row (`[data-note-row]`) and a Settings nav button; each first asserts `el.matches(':focus-visible')`, then asserts the computed `boxShadow` is not `none` (ring utilities draw with box-shadow). Run them before the class changes and see them fail
- [x] One case clicks a rail item with the mouse and asserts its `boxShadow` stays `none` (no ring on pointer focus), which pins the `focus-visible:` choice
- [x] Every site listed above carries its recipe; no plain `focus:` utility is added anywhere
- [x] `src/tests/lib/features/rail-shell/FilesNavigator.menu.test.ts` (about line 572, drop-target `outline-ring`) and the rest of the rail-shell, note-list and settings unit tests stay green unchanged
- [x] No hover, selected or drop-target class changes: each class-string diff adds only `focus-visible:` utilities, plus the EditorSection `focus:` removal
- [x] The commit carries the E2E change, so no `Test-Exempt` trailer is needed

## Notes

- **Blocking note:** shares `e2e/specs/focus-ring.spec.ts`.
- **Other tickets:** If another cluster owns an interaction-state or focus-visible sweep (review section 4 row 10, states.md larger change 3), it should build on this ticket rather than re-edit the same class strings.
- **Source:** review section 2 "State styles" (focus row) and the Settings drawer chrome row (close button with no focus ring); `work/states.md` P2, R2 and larger change 3; `work/overlays.md` P4 (close button part).
- **Layer rule:** class-only edits inside each file; no new imports.
- **Out of scope:** the rest of the 55-file raw-button sweep (moving icon buttons to `Button variant="ghost"`); reveal-on-focus for the 12 hover-only controls (`EditorTabs.svelte:70` and others); the `focus:` utilities on text inputs and selects (SentrySection, TodoistSection, GraphControls, TasksView, Kanban, Properties, SearchPanel), where `:focus` and `:focus-visible` match together; the Settings nav "selected equals hover" token.
- **Not verified:** the rendered ring in WKWebView; the E2E runs in Chromium.
- **Size:** M.

## Comments

- 2026-11-04, branch `issue/37-chrome-focus-visible-ring`: the rail, Settings, note-list, Files and Types navigator, RailNoteList, EditorView and EditorSection chrome now carries the `focus-visible:` row or button ring recipe, and `e2e/specs/focus-ring.spec.ts` has four keyboard cases and one mouse case for it. Review round 1: APPROVED (1 minor, 2 nits; the minor, the folder-row buttons in FilesNavigator not getting the ring, is left to a follow-up Issue; see review.md Resolution). Deliver full suite: vitest 493 files, 11721 passed, 1 skipped, 1 todo; `pnpm build` ok (exit=0).
