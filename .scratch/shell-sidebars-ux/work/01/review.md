VERDICT: APPROVED

Reviewed `git diff main...HEAD` (5 commits, 86739faa3..1fc8e0844) in the worktree against `.scratch/shell-sidebars-ux/issues/01-palette-right-panel-toggles-trash.md`. There is no `.scratch/shell-sidebars-ux/spec.md`; the Issue's "What to build" and triage defaults (01.1, 01.2) are the decisions checked.

## Acceptance criteria

- [met] Failing test first, `src/tests/lib/core/layout/layout.service.test.ts` (real `settingsStore`, `editorStore`): `toggleRightPanel('backlinks')` flips `backlinksVisible` and no other flag; from `rightSidebarVisible: false` on a note tab, turning Backlinks on sets `rightSidebarVisible` true; with a `.kanban` tab active it stays false; turning a panel off leaves `rightSidebarVisible` as it was. — New `describe('toggleRightPanel / setRightPanelVisible')` at layout.service.test.ts:242-334 uses the real stores and covers each case (flip-only at :257, note tab shows sidebar and persists at :269, kanban stays false at :292, off leaves sidebar shown or hidden at :312), plus no-tab and virtual-tab cases. On main the imported `toggleRightPanel`/`setRightPanelVisible` do not exist, so these tests cannot pass there (red-first by construction; the commit history puts test and code in one commit, so the red run itself is not visible). Passes now.
- [met] Failing test first, `src/tests/lib/app/commands.test.ts`: the three new ids exist with label and category Layout; running one twice returns its flag to the start and changes no other panel flag. The existing TOC test (`:527-540`) passes unchanged. — `it.each` at commands.test.ts:571-585 checks id, label, category `Layout`, flips only its own flag of the four, and twice returns to start. The TOC test (commands.test.ts:527-540) is untouched by the diff and passes.
- [met] Failing test first, `commands.test.ts` (real `settingsPanelStore`): with a vault open, Open Trash sets `isOpen` and `activeSection === 'trash'`; a second run keeps both; with Settings open on `'editor'` it moves to `'trash'`; with no vault open the command does not exist. — `describe('Open Trash')` at commands.test.ts:598-628 covers all four cases with the real `settingsPanelStore`; implementation at commands.ts:427-436 uses `settingsPanelStore.open('trash')` (never toggles) behind `vaultStore.isOpen`.
- [met] The count pin at `commands.test.ts:151` (43) changes on purpose to the new fixed total. — commands.test.ts:148-151 now pins 46 with the vault closed (43 + three Layout toggles; Open Trash is absent with no vault). Passes.
- [met] E2E `e2e/specs/settings.spec.ts`: the palette command "Open Trash" shows the Trash section heading. — New test at settings.spec.ts:12-20 runs the command from the palette and asserts the `Trash` heading (TrashSection.svelte:66 `<h2>`) inside the Settings dialog. I ran `bash scripts/e2e.sh e2e/specs/settings.spec.ts`: 9 of 9 passed.
- [met] Help pages above updated. — 06-search-and-navigation.md:73-82 (three Layout rows, Open Trash Settings row), 20-keyboard-shortcuts.md:121-122, 07-sidebar-panels.md:14 and :163 ("from the palette"), 18-trash.md:15 (second way in). See nit 1.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check`: exit 0, 0 errors, 0 warnings. Targeted vitest (files below): exit 0, 190 of 190. The full `pnpm vitest run` is deliver's to run.

## Findings

1. nit — help/documentation/20-keyboard-shortcuts.md:120 and help/documentation/07-sidebar-panels.md:14. Toggle Table of Contents now also shows a hidden sidebar (it moved onto `toggleRightPanel`), but the TOC row at 20-keyboard-shortcuts.md:120 still reads only "Toggle the TOC panel", while the new row below it states the sidebar rule for the other three; and 07-sidebar-panels.md:14 says turning a panel on "also shows the sidebar if it was hidden" without the canvas/kanban/view/virtual-tab exception that 20-keyboard-shortcuts.md:121 gives. Fix: fold TOC into the new row (or give its row the same sentence) and add the exception to 07:14.
No blockers or majors. The `Shared by ...` JSDoc on `toggleRightPanel` (layout.service.ts:56) follows the file's existing style (:8, :26), so it is not a finding. Checked and found sound:
- `setRightPanelVisible` writes one `updateLayout` patch; `rightSidebarVisible` is added only when turning on and `!hidesRightSidebar(editorStore.activeTabPath)` (layout.logic.ts:23-28 covers canvas, kanban, `.view` and the four virtual tabs). Turning off writes only the panel flag. No new persisted state; the template-literal key `${panel}Visible` type-checks against `LayoutSettings`.
- Properties also hides Info: AppShell.svelte:278 and :290 both read `propertiesVisible`, so no code was needed.
- The palette re-reads the list reactively (`AppOverlays.svelte:19` `commands={getBuiltInCommands()}`), so Open Trash appears once a vault opens; the E2E confirms it.
- No change to `src/tests/lib/architecture/layer-baseline.json`, `BASELINE_SIZE` or composition roots; `commands.ts` (app) and `layout.service.ts` (core) imports stay within layer rules (`layer-rules.test.ts` passes).
- Scope: the diff touches only the Issue's listed files plus its own discovery record. No keyboard shortcuts added (none asked for).
- Issue-noted behavior change (TOC toggle now shows a hidden sidebar when turning on) matches "moves onto the same helper" and `showTableOfContents` (toc.service.ts:22-25).

## Checks run by the reviewer

- `pnpm check` (worktree root): exit 0, 234 files, 0 errors, 0 warnings.
- `pnpm vitest run` on: `src/tests/lib/core/layout/layout.service.test.ts`, `src/tests/lib/app/commands.test.ts`, `src/tests/lib/app/commands.new-commands.test.ts`, `src/tests/lib/app/commands.todoist.test.ts`, `src/tests/lib/app/global-keybindings.test.ts`, `src/tests/lib/features/command-palette/CommandPalette.test.ts`, `src/tests/lib/architecture/layer-rules.test.ts`, `src/tests/lib/plugins/table-of-contents/toc.service.test.ts`: exit 0, 8 files, 190 tests passed. The test verdict rests on these files.
- `bash scripts/e2e.sh e2e/specs/settings.spec.ts`: exit 0, 9 of 9 passed.
- Not run: the full `pnpm vitest run` (deliver's step).

## Resolution

1. Fixed. help/documentation/20-keyboard-shortcuts.md: the Toggle Table of Contents row is merged into the panel toggle row, so it carries the same "turning a panel on also shows a hidden sidebar" sentence. help/documentation/07-sidebar-panels.md:14 now names the exception (canvas, kanban, views and virtual tabs).
