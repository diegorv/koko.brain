VERDICT: APPROVED

Review of `git diff main...HEAD` (c18fae346..5259d18e0) in the Issue 14 worktree. No `spec.md` exists in `.scratch/shell-sidebars-ux/`; the Issue is the source.

## Acceptance criteria

- [met] Failing test first, `src/tests/lib/features/rail-shell/lens.logic.test.ts` `describe('resolveFolderLens through resolveLens')` under `pinClock()`: the `Plan` row of `folder(WORK)` reads `'2h ago'` (today `'2h ago · Work'` at `:1978`), the tree-order test reads `'4d ago'`, `'10m ago'` (`:2004-2007`), and a nested folder (`Work/projects`) also drops the folder. These are expected updates, not weakened tests. — `lens.logic.test.ts:1986-1987` now expects `'2h ago'`, `:2038-2039` `'4d ago'` / `'10m ago'`, new nested case `:2006-2014` (`PROJECTS = ${WORK}/projects`, `:1910`) expects `['5m ago']`; all inside the `describe` at `:1951` with `pinClock()` at `:1952`. On main these assertions fail by construction (main's `noteSubtitle` always appends the folder). Passes here.
- [met] Kind labels unchanged: `:1979` `'Canvas'` and the Kanban, View, PDF, Image, File cases; an unindexed `.md` node still reads `'Note'`. Other lenses unchanged: the `noteSubtitle` tests (`:742-771`), Today, Favorites and type cases (`:235`, `:275`, `:417`, `:429`), neighbourhood `:1062`. — `:1988` keeps `subtitle: 'Canvas'`; new test `:1991-2004` checks Canvas, Kanban, View, PDF, Image, File and an unindexed `Draft.md` -> `'Note'`. The other lenses' tests are not edited (diff only adds one `noteSubtitle` case at `:777-780`) and pass; only `fileToLensNote` passes `withFolder: false` (`lens.logic.ts:998`).
- [met] `RailNoteList.test.ts:1035`: `ALPHA`'s entry gets a `modifiedAt` under a pinned clock and the row reads the time only; `Board` still reads `'Canvas'` (`:1036`); a folder-lens markdown row with `modifiedAt: 0` renders no `[data-note-row-subtitle]`. — `RailNoteList.test.ts:1097-1114` fakes `Date`, gives `ALPHA` `modifiedAt` 2h back, expects `'2h ago'` and `'Canvas'`; `:1116-1120` expects no subtitle node for the default `modifiedAt: 0` entry. Passes.
- [met] Failing test first, `lens.logic.test.ts`: the system-folder predicate is true for `_system`, `_system/templates` and `_templates` (when `templates.folder` is `_templates`), false for `_notes` and `Work/_people`; blank settings make it false for everything; `systemFoldersLast` keeps relative order within each half. — `lens.logic.test.ts:2095-2132`: `systemFolderPredicate` true/false cases incl. `_systemic` prefix guard, nested/slash case, blank `['', '  ']` all false; `systemFoldersLast` order-preserving partition and empty input. Helpers at `lens.logic.ts:956-975`. The helpers did not exist on main, so the tests fail there.
- [met] Failing test first, `FilesNavigator.test.ts` (real `settingsStore`, `fsStore`, `vaultStore`; no store mocks): tree `_notes, _system, Areas, Daily` renders `[root, _notes, Areas, Daily, _system]`; the `_system` name span has `text-file-explorer-muted-fg`, `_notes` does not; a custom root order (`fsStore.setFolderOrder({ '.': [...] })` or a top-level folder in `setContentOrder`) keeps the incoming order with `_system` still muted; an expanded `_system/templates` is muted; a `titleColor` rule wins over the muted class; picking `_system` shows the primary colour. — `FilesNavigator.test.ts:196-278` (`describe('system folders')`), real stores, `settingsStore.reset()` in `beforeEach` (`:63`). Covers default order, muted/not muted, templates folder, both-blank settings, `folderOrder['.']`, top-level `contentOrder`, nested-only custom order not triggering, expanded `_system/templates` muted, `titleColor` winning, picked row `text-file-explorer-primary`. Only the icon-data module is mocked (pre-existing). Passes.
- [met] Counts: a folder with two notes, a canvas, a dotfile and a subfolder shows `3`; an empty folder shows nothing; the number equals `resolveLens(folder(path)).notes.length` for the same tree; it updates after `fsStore.setFileTree` adds a file. — `FilesNavigator.test.ts:280-333` (`describe('file counts')`): `Mixed` -> `'3'` with `tabular-nums` and muted class; `Empty` and root render no count; equality with `resolveLens(...).notes.length`; `'4'` after adding `c.pdf` via `setFileTree`. Both sides use `folderFiles` (`lens.logic.ts:956-958`, `resolveFolderLens` `:1040`, `FilesNavigator.svelte:506`).
- [met] E2E `file-explorer.spec.ts:57-75` expects `[root, Daily, Projects, _system, _templates]` (comment and title updated) and passes together with `focus-ring.spec.ts` (`:74-80,97,108` take the first folder row). — `e2e/specs/file-explorer.spec.ts:57-70` updated order, title and comment. I ran `bash scripts/e2e.sh e2e/specs/file-explorer.spec.ts e2e/specs/focus-ring.spec.ts`: exit 0, 13 passed.
- [met] `FilesNavigator.test.ts:92-98` and `lens.logic.test.ts:2036-2046` (the `navigatorFolders` tests) stay green. — Unchanged (now `lens.logic.test.ts:2069-2079`), pass in the runs below.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check` exit 0 (0 errors, 0 warnings). Targeted vitest: `src/tests/lib/features/rail-shell` (all 46 files incl. `lens.logic`, `RailNoteList*`, `FilesNavigator*`) plus `src/tests/lib/architecture`: exit 0, 1430 passed, 53 skipped. The full `pnpm vitest run` is deliver's to run.

## Findings

1. minor — `src/lib/features/rail-shell/FilesNavigator.svelte:569-572`: the count span sits outside the folder button, so the strip it occupies at the row's right end no longer picks the folder on click (before, the `flex-1` button reached the row end; the row `div` has no click handler). `TypesNavigator.svelte:295-299` keeps its count inside the button. Fix (optional): move the span inside the button with `aria-hidden="true"` (excluded from the accessible name), or accept the small dead zone.
2. nit — `src/tests/lib/features/rail-shell/FilesNavigator.test.ts:302-310`: the count test asserts `tabular-nums` and the muted class but not the right alignment (`ml-auto`) the Issue names. Fix (optional): add `expect(count.classList).toContain('ml-auto')`.

No blockers. No scope creep: the diff touches only the files the Issue names (`lens.logic.ts`, `rail-shell.types.ts`, `FilesNavigator.svelte`, the help page, the E2E spec, tests). `NoteRow.svelte`, `RailNoteList.svelte`, `fs.service.ts`, `fs.watcher.ts`, `fs.logic.ts` and `src-tauri/` are untouched. No `layer-baseline.json` or `BASELINE_SIZE` change. Tabs only; `git diff --check` clean.

## Correctness checks done

- Custom root order detection mirrors `orderLevel` (`fs.logic.ts:442-477`): `folderOrder['.']` truthy (an empty array counts, as there), or a top-level folder path in `contentOrder`, whose folder keys come from `addContentOrder` (folder note dir, `folder-notes.logic.ts:46`).
- `systemFolderPredicate` normalizes like `excludeSystemFolder` (`type-sidebar.logic.ts:70-73`): trim, strip slashes, blank disables; matches on `root` or `root + '/'`, so `_systemic` is not matched.
- Defaults: `templates.folder` is `_system/templates`, `systemFolder` is `_system` (`settings.store.svelte.ts:97-100`); the E2E fixture sets `templates.folder: '_templates'`, which the spec expects last.
- Muted rule: `!active && !titleColor && isSystem(path)` (`FilesNavigator.svelte:504-505`), any depth; reorder at root only (`topFolders`, `:97-101`).
- `scan_vault` returns the full recursive tree, so `node.children` is populated for collapsed folders and the count is correct before expanding.
- Help: `02-file-explorer.md:9-10` and `:87-89`; the settings labels it cites ("Files & Folders", "System folder", "Templates folder") exist (`settings.logic.ts:277`, `FilesSection.svelte:12,24`).

## Tests my verdict rests on

- `pnpm check` (exit 0).
- `pnpm vitest run src/tests/lib/features/rail-shell/lens.logic.test.ts src/tests/lib/features/rail-shell/RailNoteList.test.ts src/tests/lib/features/rail-shell/FilesNavigator.test.ts src/tests/lib/features/rail-shell/FilesNavigator.menu.test.ts src/tests/lib/features/rail-shell/FilesNavigator.new-view.test.ts` (exit 0, 466 passed).
- `pnpm vitest run src/tests/lib/features/rail-shell src/tests/lib/architecture` (exit 0, 46 files, 1430 passed, 53 skipped).
- `bash scripts/e2e.sh e2e/specs/file-explorer.spec.ts e2e/specs/focus-ring.spec.ts` (exit 0, 13 passed).

Not verified: the full `pnpm vitest run` (deliver runs it). I did not re-run the tests against main to watch them fail; the changed expectations and the new helper imports cannot pass on main.

## Resolution

1. Fixed: the count span moved inside the folder button with `aria-hidden="true"` (`FilesNavigator.svelte`), so clicking the number picks the folder and the accessible name stays the folder name. While a folder is being renamed the button is replaced by the input, so its count is not shown then. New test `picks the folder when the number is clicked`; the count test now asserts `aria-hidden`.
2. Fixed: the count test asserts `ml-auto`.
