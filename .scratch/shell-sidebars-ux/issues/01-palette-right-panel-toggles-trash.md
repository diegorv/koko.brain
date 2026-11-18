# 01: Palette commands toggle each right sidebar panel and open Trash

**Origin:** design review 2026-11-17, proposals P104 (palette half), P105 (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/shell-tabs-navigation.html` (sections `#P104`, `#P105`), research `.scratch/shell-sidebars-ux/research/verdict-sh-menus-settings.md` and `breakdown.md` (old ticket 01). The header-menu half of P104 is ticket 05.

**What to build:**

1. **Panel toggles.** The palette gets "Toggle Properties Panel", "Toggle Backlinks Panel" and "Toggle Outgoing Links Panel" (category Layout). "Toggle Table of Contents" keeps its id and label (`src/lib/app/commands.ts:330-337`) and moves onto the same helper.
2. **Sidebar follows.** Turning a panel on also shows a hidden right sidebar, except where the sidebar never shows (canvas, kanban, `.view` and virtual tabs, the `hidesRightSidebar` rule in `src/lib/core/layout/layout.logic.ts`), as `showTableOfContents` already does (`src/lib/plugins/table-of-contents/toc.service.ts:22-25`). Turning a panel off leaves the sidebar alone. Properties also hides Info (`src/lib/app/AppShell.svelte:278,290`).
3. **Open Trash.** "Open Trash" (category Settings) opens the Settings sheet on Trash, never toggles it closed, and is listed only while a vault is open (with no vault the sheet would say "Trash is empty", `src/lib/core/settings/sections/TrashSection.svelte:17-21`). It calls `settingsPanelStore.open('trash')` (`src/lib/core/settings/settings-panel.store.svelte.ts:11`).
4. **Code.** `setRightPanelVisible(panel, visible)` and `toggleRightPanel(panel)` in `src/lib/core/layout/layout.service.ts` beside `toggleRightSidebar`, over the four existing layout flags (`panel` is `'properties' | 'backlinks' | 'outgoingLinks' | 'tableOfContents'`). No new persisted state. `Open Trash` is added as `...(vaultStore.isOpen ? [openTrash] : [])`, the pattern of `eventCalendarStore.canUndo` in `commands.ts:254-265`.
5. **Help.** Palette rows in `help/documentation/06-search-and-navigation.md:69-78` and `20-keyboard-shortcuts.md:101-125`, "or from the palette" in `07-sidebar-panels.md:13,162`, a second way in `18-trash.md:13-15`.

Not in this ticket: Configure links on Backlinks, Outgoing links and TOC (their only setting is the Layout switch that Hide panel writes); a rail lens for Trash, a native Trash menu item and Undo after Move to Trash (out of scope per the review).

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh settings.spec.ts`

- [x] Failing test first, `src/tests/lib/core/layout/layout.service.test.ts` (real `settingsStore`, `editorStore`): `toggleRightPanel('backlinks')` flips `backlinksVisible` and no other flag; from `rightSidebarVisible: false` on a note tab, turning Backlinks on sets `rightSidebarVisible` true; with a `.kanban` tab active it stays false; turning a panel off leaves `rightSidebarVisible` as it was.
- [x] Failing test first, `src/tests/lib/app/commands.test.ts`: the three new ids exist with label and category Layout; running one twice returns its flag to the start and changes no other panel flag. The existing TOC test (`:527-540`) passes unchanged.
- [x] Failing test first, `commands.test.ts` (real `settingsPanelStore`): with a vault open, Open Trash sets `isOpen` and `activeSection === 'trash'`; a second run keeps both; with Settings open on `'editor'` it moves to `'trash'`; with no vault open the command does not exist.
- [x] The count pin at `commands.test.ts:151` (43) changes on purpose to the new fixed total.
- [x] E2E `e2e/specs/settings.spec.ts`: the palette command "Open Trash" shows the Trash section heading.
- [x] Help pages above updated.
- [x] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P104.** Sidebar panels and feature settings can be reached only through the Settings sheet. Add palette toggles for Properties, Backlinks and Outgoing links, a "Hide panel" item in each header menu, and "Configure..." links through `settingsPanelStore.open(section)`. Validation: revise.
- **P105.** Trash can be browsed only from inside Settings. Add an "Open Trash" palette command that calls `settingsPanelStore.open('trash')`. Undo stays with the review's P01. Validation: revise, no rail lens.

## Problem

Properties, Backlinks and Outgoing links have no palette command, keybinding or header control; their only switches are in Settings > Layout. Trash is a Settings page with no palette command and no rail item, so recovery takes a walk through the Settings sheet.

## Evidence

Checked at `ab143a411`.

- `src/lib/features/rail-shell/LayoutSection.svelte:127-151`: the only panel switches. `commands.ts:330-337`: only TOC has a command. `toc.service.ts:22-25`: `showTableOfContents` already turns on `rightSidebarVisible` and `tableOfContentsVisible` together.
- `src/lib/core/layout/layout.service.ts:24-29`: `toggleRightSidebar` returns early when `hidesRightSidebar(activeTabPath)`.
- `src/lib/core/settings/settings.logic.ts:280` (`{ id: 'trash' }`) mapped at `src/lib/app/SettingsPanel.svelte:55,82`; no rail item (`rail-items.logic.ts:37-48`).
- `src/lib/features/search/SearchPanel.svelte:190`: `open('search')` precedent.
- The four panel flags are read only by `AppShell.svelte:278-291`, `LayoutSection.svelte`, `commands.ts:334-335` and `toc.service.ts:23`.
- `src/tests/lib/app/commands.test.ts:151`: pins 43 built-in commands with the vault closed.

## Sequence with

Same `commands.ts` list and the count pin `commands.test.ts:151`, each ticket changing the number on purpose: 08, 13, 15, 20, 24, 28, 29 and 32. Ticket 28 is no longer blocked by this ticket; it shares the pin and the `06-search-and-navigation.md` category table. `layout.logic.ts`, `layout.service.ts` and `layout.service.test.ts:140-161`: tickets 05 (adds `anyRightPanelVisible`) and 26 (rewrites `hidesRightSidebar`, edits `toggleRightSidebar` tests). `help/documentation/07-sidebar-panels.md`: 04, 05, 06, 07, 09, 10, 26. `claude-code-integration` 03 on `mvp-claude`: the `commands.ts` list, a merge-time edit only.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided by the owner: the consolidated 34-ticket numbering and granularity. Defaults (not individually answered): 01.1 turning a panel on shows a hidden sidebar except on canvas, kanban and view tabs; 01.2 no Open Trash command while no vault is open.
- 2026-11-18, deliver (branch issue/01-palette-right-panel-toggles-trash): palette commands toggle Backlinks, Outgoing links and Properties panels (turning one on shows a hidden sidebar except on canvas, kanban, view and virtual tabs) and Open Trash opens Settings on the Trash section when a vault is open. Fix round after review 1: help pages 20-keyboard-shortcuts.md and 07-sidebar-panels.md aligned. Full suite `pnpm vitest run` at c42b443b6: exit 0, 646 files, 17122 passed, 54 skipped, 1 todo. Reviews: round 1 APPROVED, round 2 APPROVED (no findings).
