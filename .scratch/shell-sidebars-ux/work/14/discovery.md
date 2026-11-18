# Issue 14 discovery: folder-lens subtitle, system folders last and muted, direct file counts

No `spec.md` in the feature folder; the Issue is the source. Line numbers below are at `ed162941f` (the Issue's are at `ab143a411`).

## Files that change

- `src/lib/features/rail-shell/lens.logic.ts`
  - `:252-260` `noteSubtitle(entry, vaultPath, { withFolder = true } = {})`; doc comment names the option. `:281` `toLensNote` takes and passes the same option.
  - `:924` `FILE_KIND_LABELS` doc: markdown `'Note'` is an unindexed note's label; every non-markdown row keeps its kind word.
  - `:935-943` beside `navigatorFolders`: export `folderFiles(nodes)` (direct, non-dot files), `systemFolderPredicate(vaultPath, folders)` (path equals or lies under a configured folder; blank entries dropped), `systemFoldersLast(folders, isSystem)` (stable two-way partition).
  - `:960-976` `fileToLensNote` calls `toLensNote(entry, vaultPath, { withFolder: false })`; `:1004-1006` `resolveFolderLens` maps `folderFiles(children)`.
- `src/lib/features/rail-shell/rail-shell.types.ts:40` `LensNote.subtitle` doc.
- `src/lib/features/rail-shell/FilesNavigator.svelte`
  - `:80` `topFolders`: `systemFoldersLast` unless `fsStore.folderOrder['.']` is set or a top folder is in `fsStore.contentOrder` (the same tests `orderLevel` uses, `fs.logic.ts:448-476`).
  - `isSystem` derived from `settingsStore.templates.systemFolder` and `.folder`.
  - `:542` name span: `text-file-explorer-muted-fg` when system, not picked and no `titleColor`.
  - after the name button/input: `<span data-files-navigator-count>` (`ml-auto shrink-0 text-meta tabular-nums text-file-explorer-muted-fg`, the TypesNavigator count shape `TypesNavigator.svelte:299`) when `folderFiles(node.children).length > 0`. Outside the button so its accessible name stays the folder name.
- `help/documentation/02-file-explorer.md:9` (counts, system folders last/muted), `:10` (row second line), `:87` (sorting).
- Tests: `lens.logic.test.ts` (`:1978`, `:2005-2006`, new nested + kind label + predicate + partition + `folderFiles` cases), `RailNoteList.test.ts:1103` (pinned clock, time only; `modifiedAt: 0` -> no subtitle node), `FilesNavigator.test.ts` (order, muted, custom order, titleColor, pick, counts; add `settingsStore.reset()`), `e2e/specs/file-explorer.spec.ts:57-75`.

## Prior art

- `pinClock()` (`lens.logic.test.ts:87`); the `Folder lens` fixtures `file`/`dir` (`:1888-1900`).
- FilesNavigator test harness `FilesNavigator.test.ts:43-80`; titleColor via `fileIconsStore.updateFrontmatterIcon(path, { titleColor })` (`:78`).
- Blank-means-disabled rule: `excludeSystemFolder` (`type-sidebar.logic.ts:65-75`).

## Risks

- `RailNoteList.test.ts:311` (inbox lens) keeps `'2h ago · Work'`: only `fileToLensNote` drops the folder.
- `focus-ring.spec.ts` takes the first folder row generically; with `_system` last the first is `Daily`, which has no subfolders but the toggle test tabs to any `[data-files-navigator-toggle]`.
- Count span inside the row: `text-row` and `rounded-md` checks are on the row wrapper only (`FilesNavigator.test.ts:159-179`).

## Defaults taken

- Muted applies to any row whose path is under a system folder, at any depth, picked rows excepted; the reorder is root level only.
- An empty `folderOrder['.']` array still counts as a custom root order (`orderLevel` treats any array as set).
- The count shows during inline rename too (it sits outside the input).
