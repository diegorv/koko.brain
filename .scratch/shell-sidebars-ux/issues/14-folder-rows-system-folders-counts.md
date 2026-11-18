# 14: Folder-lens rows stop repeating the folder; the Files tree puts system folders last and muted, with direct file counts

**Origin:** design review 2026-11-17, proposals P117 (first half) and P119, prototype `.scratch/design-review/prototypes/note-list-rail.html`, research `.scratch/shell-sidebars-ux/research/verdict-nl-rows-sections.md` (T1, T2) and `breakdown.md` (old tickets 04, 34). No open-itens Issue is replaced.

**What to build:**

1. **Folder-lens subtitle drops the folder.** In a folder lens a markdown row's second line shows only its modified time (`2h ago`), not `2h ago · Work`: a folder lens lists direct children only (`src/lib/features/rail-shell/lens.logic.ts:1004-1006`), so the folder always equals the lens. Canvas, kanban, view, PDF, image, other files and unindexed markdown keep their kind word (`FILE_KIND_LABELS`, `:925-933`). Every other lens keeps `<time> · <folder>`. Use an explicit option on `toLensNote` / `noteSubtitle` (for example `{ withFolder: false }`), used by `fileToLensNote` (`:960-976`); not a `null` vault path. Update the doc comments on `noteSubtitle` (`:252-257`), `FILE_KIND_LABELS` (`:924`) and `LensNote.subtitle` (`rail-shell.types.ts:40`). `NoteRow.svelte` and `RailNoteList.svelte` are untouched.
2. **System folders last and muted.** At the vault root of the Files navigator, the configured system folder (`templates.systemFolder`, default `_system`) and the templates folder (`templates.folder`) move after the other folders and their names are muted (their subfolders too, unless picked; a file-icon `titleColor` still wins). Not every `_` folder: `_notes` and `Work/_people` are user folders in a default vault. A blank setting disables that half. A custom root order (`fsStore.folderOrder['.']`, or any top-level folder in `fsStore.contentOrder`) keeps the incoming order and stays muted. Only the navigator changes; `scan_vault`, the Rust sort, `fs.service.ts`, `fs.watcher.ts` and every other `fileTree` consumer keep scan order.
3. **Direct file counts.** Each folder row (not the root) shows its direct, non-hidden file count, right-aligned, `tabular-nums`, muted, from a pure helper that `resolveFolderLens` (`:1004-1005`) also uses, so the number equals the note-list header for that folder. No number for zero.
4. **Code.** In `lens.logic.ts`, beside `navigatorFolders` (`:941-943`): a system-folder predicate (path equals or lies under either configured folder) and a stable `systemFoldersLast(folders, isSystem)`, applied to `topFolders` (`FilesNavigator.svelte:77`) only. The name span is `FilesNavigator.svelte:493` (picked rows keep `text-file-explorer-primary`; the row wrapper is `:434-440`).
5. **Help.** `help/documentation/02-file-explorer.md:86` (today "same order: by name") and `:9` (counts).

Not in this ticket: a relative modified time on canvas, kanban, view, PDF and image rows (the tree `modifiedAt` is never updated on content saves, `fs.watcher.ts:119-124,185-196`, so an edited board would read "3d ago"; fixing it needs a tree write per autosave in the watcher hot path); an underscore-prefix rule; a "Show note counts" setting.

**Blocked by:** 13

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` for `e2e/specs/file-explorer.spec.ts` and `e2e/specs/focus-ring.spec.ts`.

- [x] Failing test first, `src/tests/lib/features/rail-shell/lens.logic.test.ts` `describe('resolveFolderLens through resolveLens')` under `pinClock()`: the `Plan` row of `folder(WORK)` reads `'2h ago'` (today `'2h ago · Work'` at `:1978`), the tree-order test reads `'4d ago'`, `'10m ago'` (`:2004-2007`), and a nested folder (`Work/projects`) also drops the folder. These are expected updates, not weakened tests.
- [x] Kind labels unchanged: `:1979` `'Canvas'` and the Kanban, View, PDF, Image, File cases; an unindexed `.md` node still reads `'Note'`. Other lenses unchanged: the `noteSubtitle` tests (`:742-771`), Today, Favorites and type cases (`:235`, `:275`, `:417`, `:429`), neighbourhood `:1062`.
- [x] `RailNoteList.test.ts:1035`: `ALPHA`'s entry gets a `modifiedAt` under a pinned clock and the row reads the time only; `Board` still reads `'Canvas'` (`:1036`); a folder-lens markdown row with `modifiedAt: 0` renders no `[data-note-row-subtitle]`.
- [x] Failing test first, `lens.logic.test.ts`: the system-folder predicate is true for `_system`, `_system/templates` and `_templates` (when `templates.folder` is `_templates`), false for `_notes` and `Work/_people`; blank settings make it false for everything; `systemFoldersLast` keeps relative order within each half.
- [x] Failing test first, `FilesNavigator.test.ts` (real `settingsStore`, `fsStore`, `vaultStore`; no store mocks): tree `_notes, _system, Areas, Daily` renders `[root, _notes, Areas, Daily, _system]`; the `_system` name span has `text-file-explorer-muted-fg`, `_notes` does not; a custom root order (`fsStore.setFolderOrder({ '.': [...] })` or a top-level folder in `setContentOrder`) keeps the incoming order with `_system` still muted; an expanded `_system/templates` is muted; a `titleColor` rule wins over the muted class; picking `_system` shows the primary colour.
- [x] Counts: a folder with two notes, a canvas, a dotfile and a subfolder shows `3`; an empty folder shows nothing; the number equals `resolveLens(folder(path)).notes.length` for the same tree; it updates after `fsStore.setFileTree` adds a file.
- [x] E2E `file-explorer.spec.ts:57-75` expects `[root, Daily, Projects, _system, _templates]` (comment and title updated) and passes together with `focus-ring.spec.ts` (`:74-80,97,108` take the first folder row).
- [x] `FilesNavigator.test.ts:92-98` and `lens.logic.test.ts:2036-2046` (the `navigatorFolders` tests) stay green.
- [x] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P117.** The note row's second line differs across lenses. Leave the folder out of the subtitle in a folder lens; non-markdown rows show their modified time and let the icon carry the kind. Validation: revise (the "Note" subtitle is a mock artifact). This ticket ships the first half only.
- **P119.** System folders mix into the Files tree, with no counts. Show underscore folders in muted text and sort them after user folders when no custom order exists; note counts optional. Validation: revise (folder ordering already exists). This ticket replaces the underscore rule with the configured System and templates folders.

## Problem

In a folder lens every markdown row repeats the folder the list is already titled with. In the Files tree `_system` and `_templates` sit at the top and look like user folders, and no folder shows how many files it holds.

## Evidence

Checked at `ab143a411`.

- `src/lib/features/rail-shell/lens.logic.ts:258-260` `noteSubtitle` joins time and folder; `:281-295` `toLensNote`; `:960-976` `fileToLensNote`; `:986-1008` `resolveFolderLens`.
- `src/lib/features/rail-shell/FilesNavigator.svelte:77` `topFolders`, `:493` name span. `vault.rs:1784-1809` sorts directories first with `natural_cmp` (`_` before letters). `countFiles` (`src/lib/core/filesystem/fs.logic.ts:187`) has no UI caller.
- `src/lib/core/settings/settings.types.ts:176-183` (`templates.folder`, `templates.systemFolder`); `excludeSystemFolder` (`type-sidebar.logic.ts:65-75`) treats a blank value as disabled.
- `help/documentation/02-file-explorer.md:86`: "The navigator's folders and the note list of a folder use the same order: by name". The archived Issue that set today's rule kept the kind label on purpose (`.scratch/archived/rail-shell-ux/issues/14-note-rows-show-relative-modified-time.md:17,26`).

## Why blocked

- 13: (Files header "+" menu; same `FilesNavigator.svelte` and its tests)

## Sequence with

- 15 (note-actions group): adds `organized` and `archived` to `toLensNote` and to the non-markdown literal in `fileToLensNote`, the lines part 1 edits; blocked by this ticket.
- 24 (breadcrumb and Reveal): `withExpandedAncestors` in `lens.logic.ts`, a different function; rebase only. Also `lens-open.service.ts`.
- `FilesNavigator.svelte` and `FilesNavigator.test.ts` / `.menu.test.ts`: 13 (this ticket is blocked by it), 34 (pane-band at `:305`).
- 20 (palette Go to focus) also edits `lens.logic.ts`; rebase only.
- 15's `NoteRow.svelte` and 19's roving key edit the rows, not the subtitle.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided by the owner: old 34.1 to 34.3 = yes (the system folders are the configured System and templates folders, only the root level is reordered and a custom order turns it off, counts are the direct file count). Defaults (not individually answered): 14.1 (old 04.1) non-markdown folder-lens rows keep the kind word (`Canvas`, `Kanban`, `PDF`).
- 2026-11-18, deliver (branch issue/14-folder-rows-system-folders-counts): folder-lens rows show only the time (kind word kept for non-markdown), the Files tree puts the configured System and templates folders last at the root and mutes them, folders show their direct file count. Fix round after review 1: the count moved inside the folder button with `aria-hidden`, test asserts `ml-auto`. Reviews: round 1 APPROVED (review.md), round 2 APPROVED (review-2.md). Tests: `pnpm check` exit 0; full suite at 533c0eec7 exit 0, 649 files, 17204 passed, 54 skipped, 1 todo.
