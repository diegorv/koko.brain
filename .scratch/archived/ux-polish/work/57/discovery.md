# Issue 57 discovery

No `spec.md` for ux-polish; sources are the Issue, `review-2026-11-04.md` section 2 "Overlay anatomy" and `work/overlays.md` P17 / R3. Scan test copies `work/67` (`src/tests/lib/chrome-state-styles.test.ts`: readdirSync over `src/lib`, `components/ui` skipped, fixture class names built from parts).

## Files that change

- `src/lib/utils/keybindings.ts`: gains `formatShortcut(combo: KeyCombo)`, moved from `features/command-palette/command-palette.logic.ts:11`. `core/` (MarkdownEditor) may not import `features/` (ADR-0003 baseline only shrinks), so the formatter moves to `utils/`. Callers: `CommandPalette.svelte:5`, tests `command-palette.logic.test.ts:3,12-56` (the `formatShortcut` block moves to `src/tests/lib/utils/keybindings.test.ts`), `src/tests/lib/app/commands.test.ts:86`.
- `src/lib/core/markdown-editor/MarkdownEditor.svelte:719-741`: drop `mr-2` from 6 icons; `:738` `⌘⇧L` -> `{formatShortcut(COPY_BLOCK_LINK_SHORTCUT)}` (the keymap's own constant, `setup/editor-extensions.ts:36`).
- `src/lib/core/markdown-editor/EditorTabs.svelte:98-108`: drop `mr-2` (2), "Pin/Unpin/Close Tab" -> "tab", drop the separator between the two single items.
- `src/lib/plugins/kanban/KanbanCard.svelte:236-271`: drop `mr-2` (4), "Card color", "Remove color", drop the separator before the lone Delete.
- `src/lib/plugins/kanban/KanbanLane.svelte:270-305`: drop `mr-2` (5), "auto-complete", "Set card limit", "Archive completed", "Delete lane"; drop the separators before lone "No limit" and lone "Delete lane".
- `src/lib/features/collection/CollectionView.svelte:458-482`: drop `text-xs` spans (5), "Linear calendar", drop the separator before lone "Delete view".
- `src/lib/features/collection/toolbar/{FilterRow,CalendarConfigPanel,SortPanel,FilterPanel}.svelte`: drop `text-xs` on item labels (same drift, 12px items).
- `src/lib/features/note-action-bar/NoteActionBar.svelte:199-216`: More menu becomes [folded actions + Copy deeplink] | [Archive, Delete]; the one separator only when something is folded (otherwise group 1 would be a single item).
- `src/lib/features/note-list/NoteRowMenu.svelte:256` `F2` literal -> `formatShortcut(RENAME_SHORTCUT)`, with `RENAME_SHORTCUT` in `note-row-menu.context.ts`, also read by `NoteRow.svelte:66`.

## Plan

1. Move `formatShortcut` to `utils/keybindings.ts` (refactor, tests moved, green).
2. Test first: `src/tests/lib/menu-item-anatomy.test.ts` scans `.svelte` outside `components/ui` for `(ContextMenu|DropdownMenu)[.]?(Item|SubTrigger|CheckboxItem|RadioItem)` element content and fails on `mr-2` or `text-xs`, and on a `Shortcut` element whose content is not `{formatShortcut(...)}`. Fails on the sites above; then fix them.
3. MarkdownEditor test: the Copy link to block hint equals `formatShortcut(COPY_BLOCK_LINK_SHORTCUT)`.
4. NoteActionBar test: separators in More with and without folded actions (test first), then the change. Sentence case + other separators in the same commits as their files.

## Defaults taken

- Primitives in `components/ui` stay: items already render the anatomy (`px-2 py-1.5` + 20px line = 32px = `h-8`, `gap-2`, `rounded-sm`, `text-sm` is pixel-identical to `text-row`; the review says migrate `text-sm` per area, not as a sweep). A fixed `h-8` would clip the wrapping "Show this note's neighbourhood..." item in the w-56 More menu.
- "Separators only between groups of 2 or more": a separator is removed when either side is a single item. The KanbanCard color sub-menu keeps its separator (it divides a swatch row, not items).
- Out of scope, listed for a follow-up: single-item groups in NoteRowMenu, FilesNavigator, TypesNavigator (not named by the Issue or review R3); the non-parallel "Copy block embed" label; the hand-rolled canvas menu; `class="text-destructive"` vs `variant="destructive"` on kanban Delete items.

## Risks

- jsdom computes no Tailwind: the scan is the guard for classes; rendered tests cover the shortcut text and separators.
- E2E `tabs.spec.ts:74`, `tab-pinning.spec.ts` match `/Pin Tab/i` (case-insensitive), so the relabel keeps them passing.
