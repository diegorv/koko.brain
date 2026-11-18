# 22: Tabs can be dragged to reorder, show their full path on hover, and markdown labels drop .md

**Origin:** design review 2026-11-17, proposal P34 (reorder and tooltip half, counted in new 21; `.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/shell-tabs-navigation.html`, research `.scratch/shell-sidebars-ux/research/verdict-sh-tabs.md` and `breakdown.md` (old tickets 29 and 44). Absorbs `.scratch/open-itens/issues/153-tab-strip-shows-overflow-hides-md-extension.md` criterion 1 (the `.md` tab label); its criteria 2 and 3 are new 21 and its breadcrumb part new 24, so 153 is wholly replaced once all three land.

**What to build:** in `src/lib/core/markdown-editor/EditorTabs.svelte` (per-tab markup `:49-113` after new 21), `editor.logic.ts` and `editor.store.svelte.ts`:

1. **Drag to reorder.** Tabs are `draggable="true"`. One drop marker shows the slot; the strip auto-scrolls within 40 px of its edges. Pinned tabs stay first: a pinned tab stays inside the pinned group and an unpinned one outside it. The active tab stays active. Keyboard reorder is not built.
2. **Safe payload.** `dragstart` sets ONLY the private type `application/x-kokobrain-tab` (the index) with `effectAllowed = 'move'`, never `text/plain`: a `text/plain` path dropped on a Files folder moves the note on disk (`src/lib/features/rail-shell/FilesNavigator.svelte:279-291`, `handleDrop`), on a canvas it adds a node, in CodeMirror it inserts text. Precedent: `RailPropertiesPicker.svelte:70-73` (`application/x-kokobrain-list-property`). The strip's `dragover` acts only when `dataTransfer.types` includes that type, so a note row dragged over the strip shows no marker.
3. **Hover path.** A native multi-line `title` on the tab from pure `tabTooltipText(tab, vaultPath)`: the name, the vault-relative path (`relativePath`, `utils/path.ts:98`) for file tabs, "Unsaved changes" for a dirty file tab, "Pinned" for a pinned one, one per line; a virtual tab shows its name only. Every tab, pinned ones included, gets `aria-label={tab.name}` (pinned tabs show no visible name). The dirty dot gets `title="Unsaved changes"`.
4. **No `.md` in markdown labels.** The label span renders `isMarkdownNoteTab(tab) ? stem(tab.path) : tab.name` (`editor.logic.ts:28`, `utils/path.ts:79`; the same rule as new 24's breadcrumb). `tab.name` does not change (`MarkdownEditor.svelte:413,502,528` pick the language from it); the close button's `aria-label` ("Close Roadmap.md"), the tab `aria-label` and the tooltip keep the full name.
5. **Code.** Pure `moveTab(tabs, activeIndex, from, to)` in `editor.logic.ts` beside `reorderTabsAfterPinChange` (`to` is an insertion index, `to > from` compensates for the removal; clamps with `getPinnedBoundary`; keeps `activeIndex` on the same path; returns `{ tabs, activeIndex }` holding the same tab objects, so per-tab state such as new 31's history moves with a tab; no-op for the same slot or invalid indices). `editorStore.moveTab(from, to)` assigns both, as `togglePin` does (`editor.store.svelte.ts:147-153`).
6. Help `03-editor.md` Tabs: drag to reorder (pinned tabs stay first), the hover path, the label without `.md`.

Size note: the source change is small, but item 4 edits every E2E assertion on rendered tab text, 27 or more sites (including the `activeTab(page)` and `[aria-selected="true"]` forms in `e2e/specs/live-preview/click-reveal/`), so plan it as M.

Not in this ticket: a styled bits-ui tooltip (needs a `Tooltip.Provider`, `tooltip.svelte.js:192`, and a third trigger on the tab); "Move tab left/right" menu items; keying the `{#each}` by path.

**Blocked by:** 21

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` for `tabs`, `tab-pinning`, `rail-shell` and every spec touched by the label change.

- [x] Failing test first, `editor.logic.test.ts`: `moveTab` forward and backward; no-op for the same slot and out-of-range; clamps a pinned tab into the pinned group and an unpinned one out of it; keeps `activeIndex` on the same path when the active tab moves, when another tab moves across it and elsewhere; returns the same objects (`toBe`).
- [x] `editor.store.test.ts`: `moveTab(0, 3)` reorders and keeps `activeTab`; invalid indices change nothing.
- [x] `EditorTabs.test.ts`: tabs are `draggable="true"`; `dragstart` stores `application/x-kokobrain-tab` and no `text/plain` (stub `dataTransfer` recording `setData`); `dragover` past a midpoint shows exactly one marker; `drop` reorders the real store with pinned tabs first; `dragend` without a drop removes the marker. A `dragover` with only `['text/plain']` is not prevented and shows no marker; its `drop` changes nothing.
- [x] `tabTooltipText` cases (file, `TASKS_VIRTUAL_PATH`, dirty, pinned); every tab has `aria-label` equal to its name and a `title` equal to `tabTooltipText`; the dot has `title="Unsaved changes"`; tabs keep `tabindex="0"`; the context-menu tests at `EditorTabs.test.ts:114-158` stay green.
- [x] Failing test first, `EditorTabs.test.ts`: `Roadmap.md` renders `Roadmap`, `Map.canvas` renders `Map.canvas`, `notes.txt` renders `notes.txt`, the close button is still "Close Roadmap.md", and `editorStore.tabs[i].name` still ends in `.md`.
- [x] Every E2E assertion on rendered tab text is updated; find them with `grep -rnE 'role="tab"[^)]*\.md|editor-tabs-bar[^)]*\.md' e2e` and `grep -rnE "(toContainText|toHaveText)\(['\"][^'\"]*\.md" e2e/specs`, plus the `activeTab(page)` and `[aria-selected="true"]` forms. No fixed count; `bash scripts/e2e.sh` is green for every touched spec.
- [x] E2E `tabs.spec.ts`: a real `dragTo` (precedent `rail-shell.spec.ts:901`) of the last tab onto the first unpinned slot reorders and keeps it active; a pinned tab dragged past the unpinned group stays at the end of the pinned group; a tab dragged onto a Files folder moves nothing on disk (the inverse of `rail-shell.spec.ts:897-905`).
- [x] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P34 (reorder and tooltip half).** Tabs cannot be reordered and have no tooltips; pinned tabs show only an icon. Support drag-to-reorder with a marker and give every tab a full-path tooltip.
- **153 (absorbed, criterion 1).** Markdown tab labels hide the `.md` extension.

## Problem

`editorStore` has no move mutator, `EditorTabs.svelte` has no `draggable`, `ondrag*` or `title=`, and a pinned tab has no accessible name (the name sits behind `{#if !pinned}` at `:87`). The label shows `tab.name` with its extension.

## Evidence

Checked at `ab143a411`.

- `src/lib/core/markdown-editor/EditorTabs.svelte:87-88` name and label span (`{tab.name}`); `:64-66` dirty dot with no `title`; `:101-112` the menu (Pin, Close only).
- `src/lib/core/editor/editor.store.svelte.ts:121-127` `updateTabPath` mutates the same object; `:147-153` `togglePin`; no move method. `editor.logic.ts:58` `getPinnedBoundary`, `:73` `reorderTabsAfterPinChange`, `:28` `isMarkdownNoteTab`.
- `src/lib/utils/path.ts:79` `stem` strips the last extension and keeps a leading-dot name.
- `src/lib/features/rail-shell/FilesNavigator.svelte:279-291`: a `text/plain` drop moves the note on disk (proven by `rail-shell.spec.ts:897-905`).
- `src/lib/core/filesystem/link-updater.service.ts:95-108`: rename re-paths tabs through `updateTabPath`, so a moved tab object keeps following renames.

## Why blocked

- 21: The tab strip shows what is off screen, tabs shrink, and the sidebar toggle stops covering them

## Sequence with

- `EditorTabs.svelte` and `EditorTabs.test.ts`: new 21 (blocker), new 23 (blocked by this ticket), new 34.
- `editor.store.svelte.ts`, `editor.types.ts`, `editor.logic.ts`: new 25 (`sourceMode`), new 31 (`history`; `moveTab` carrying the tab object whole is what lets 31's history move with the tab).
- E2E specs asserting tab text: any ticket editing the same specs (the click-reveal specs especially).
- `help/documentation/03-editor.md`: new 21, 23, 24, 25, 27, 31, 32, 33.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided by the owner: hide `.md` in markdown tab labels (old 44.1, yes). Defaults (not individually answered): 22.1 (old 29.1) a native multi-line `title` rather than a styled tooltip; 22.2 (old 29.2) no keyboard reorder for now (if wanted later, "Move tab left/right" goes into new 23's menu).
- 2026-11-18, deliver (branch issue/22-tab-drag-path-tooltip-no-md): tabs drag to reorder within their pinned group (`moveTab`, `application/x-kokobrain-tab` payload), a full-path `title` tooltip, and markdown labels without `.md`. Review round 1 APPROVED (findings fixed: text/plain drag test now isolates the payload gate; label span and WebKit hand check noted), round 2 APPROVED with no findings. Tests: EditorTabs.test.ts 42 passed; `pnpm check` 0 errors; full suite 651 files / 17312 tests passed, exit 0.
