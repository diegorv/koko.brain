# Issue 29: applyNoteChange — the one note-change owner

Status: ready-for-agent
Phase: P3 Track C step 4 (cluster C06/C08, C03 wiring)
Source: ARCH 3.1 (absorbs 5.1 writeNote), C03, M08 — plan-2026-08-12.md §P3 — ARCH Strong refactors (Track C — Filesystem/paths)
Blocked by: 27-path-helper-consolidation, 28-forget-note

## What

Build `applyNoteChange({kind:'upsert'|'delete'})` as **THE one module** owning "a note's bytes
changed", per the P1 C06 decision. It absorbs arch 5.1's `writeNote` as its upsert branch and issue
28's `forgetNote` as its delete branch. Also closes M08 (deleted notes lingering as phantom pages in
collection views) by wiring the collection eviction saved from deletion by conflict C03.

## How

- **Prerequisites — write these FIRST, they do not exist:** `removeFrontmatterIconForFile` and
  `removeCalendarForFile`.
- One nullable **FTS-key derivation**, built on issue 27's shared path helper. **Watcher semantics:
  skip, never fall back to the absolute path.**
- **Registration API instead of core→features imports** (respects ADR-0003's four-layer taxonomy);
  consumers register into the owner.
- Explicit per-source policy (save / edit / watcher / create / fs) for the index-dedupe guard.
- **`afterSaveObservers` are deliberately NOT fired from writes. Auto-move is NOT delegated.**
- Wire **all eight call sites**.
- Include the collection `removeNoteFromIndex` wiring saved by conflict C03 (`fs.service.ts:188/:229/:269`,
  `watcher-handler.service.ts:156`) — deleting it would have made **M08** permanent.
- Route the six external writers — frontmatter-icon, file-icons, link-updater, type-definitions,
  kanban, collection — through the **upsert branch**.
- **Amend ADR-0009 + ADR-0003 in-series** with the code.
- Test collateral in the same commit: service-layer vitest seam (mock the Tauri invoke boundary only,
  real stores), asserting real store state after each branch and source.

## Gate

Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build` before the commit. Stage only the
files for this step, verify with `git diff --cached --stat`, and commit using the repo's full commit
format (Context, Problem, Solution, Behavior, Files with line ranges).

## Comments

### Step 1 review, deferred follow-ups

Two minor findings from the step 1 review were deliberately NOT applied here (they add a
test or change behaviour, both outside this additive step's scope):

1. `removeCalendarForFile`'s `fileFilesystemKeys.delete(filePath)` is unpinned by any test.
   The suite only seeds via `updateCalendarForFile`, which writes `fileFrontmatterKeys` and
   `fileDateKeys` but never `fileFilesystemKeys` (only `scanFilesForCalendar` writes that map,
   from `node.createdAt`), so a mutant dropping that line still passes. Real consequence of the
   mutant: a scan records the fs `createdAt` for a path, the file is deleted (entry survives),
   the path is re-created with a `created:` frontmatter date, the user later removes that
   property, and `updateCalendarForFile` falls back to the stale pre-deletion filesystem key and
   files the note under the wrong day. Fix: seed `fileFilesystemKeys` through the real scan path
   (an `fsStore` tree node with `createdAt` plus `scanFilesForCalendar`), remove, then re-add and
   remove a `created` property and assert the file does not reappear under the old day. Land it in
   step 2 alongside the delete-branch wiring.

2. `removeFrontmatterIconForFile`'s early return `if (!fileIconsStore.getFrontmatterIcon(filePath)) return;`
   checks only the file key, so a stale folder-note parent-directory key survives when the file key
   was already cleared. Sequence: a folder icon is indexed for `X/X.md` (both `X/X.md` and `X` keys
   set), the user clears it via `removeIconForPath` on the `.md` file, which clears only the file
   key; the later `updateFrontmatterIconForFile` hits its own `if (!newRef && !oldRef) return` and
   never cleans `X` either. When step 2 wires deletion, `removeFrontmatterIconForFile` then early
   returns and the folder keeps a phantom icon until the next full `buildFrontmatterIconIndex`.
   This is a pre-existing gap that the new function mirrors rather than introduces (the step spec
   asked for parity with `updateFrontmatterIconForFile`). Root-cause fix belongs in
   `removeIconForPath`'s isMarkdown branch (clear the parent key there too); own issue, not a
   widening of this step.

### Step 2 notes: plan discrepancies

- "Wire all eight call sites" does not resolve to eight. The real surface is 5 upsert sites
  (`editor.hooks.ts::notifyAfterSave`, `index-updater.service.ts::updateIndexesForFile`,
  `watcher-handler.service.ts::incrementalUpdateFiles`, `note-creator.service.ts::openOrCreateNote`,
  `fs.service.ts::createFile`) plus 2 delete locations (`fs.service.ts::forgetNote`, which already
  collapses `deleteItem` / `renameItem` / `moveItem`, and the watcher's `content === null` branch).
  Wired on the enumerated surface, not on the number.
- The C03 line cites `fs.service.ts:188/:229/:269` for the collection eviction. Those line numbers
  pre-date issue 28; the wiring belongs inside `forgetNote` (one place), which is where it landed.
- "Route the six external writers ... kanban, collection" overcounts by two. Neither
  `kanban.service.ts` nor `collection.service.ts` writes to disk: `KanbanView.svelte::applyChange`
  and `CollectionView.svelte::commitStructural` both go through `EditorView.svelte` into the editor
  save path, so both are routed transitively as of this step. Step 3 only has to touch
  `frontmatter-icon.service.ts`, `file-icons.service.ts::ensureFolderNote`, `link-updater.service.ts`
  and `type-definitions.service.ts`.
- The issue mandates amending ADR-0009 and ADR-0003 only, but `CLAUDE.md` Indexing rules 6 and 8
  described the exact mechanics this step relocates. Amended them in the same commit rather than
  shipping known-stale docs.
- Step 1 comment 1 (`fileFilesystemKeys` unpinned) is CLOSED: the regression test landed in this
  step, in `calendar.service.test.ts`. Step 1 comment 2 (`removeFrontmatterIconForFile` folder-note
  parent key) is still open and still belongs in `removeIconForPath`.

### Step 2 review, deferred follow-ups

1. Non-markdown index leak WIDENS, deliberately (option A: strict parity with the three
   pre-existing sources). Routing `fs.service.ts::createFile` through the upsert branch means
   creating a `.kanban` / `.canvas` / `.collection` file now inserts a `NoteRecord` (empty
   properties) into `collectionStore.propertyIndex` that `kb.pages()` and `CollectionView` see until
   the next `buildPropertyIndex`. The leak class pre-exists (`notifyAfterSave` re-adds those records
   on every save, and Rust stopped indexing them in b077fe35), so this step only adds two more entry
   points. Root-cause fix, deferred to its own issue because it is a behaviour change nobody asked
   for here: an `isMarkdownFile(name) || isViewFile(name)` guard at the top of the owner's upsert
   branch, which would close it for all five sources at once. Needs its own verification that no
   consumer relies on `.collection` records.
2. A rapid double vault switch (B's `initializeVault` starting after A registered its consumers but
   before A reached the `onFileChange` subscription) overwrites `unregisterNoteChangeConsumers`
   without unwinding A's three, leaving duplicates in the owner's registry for the session.
   Consequence is benign (all three consumers are idempotent over the same store singletons) and it
   is exact parity with the pre-existing `unsubscribeFileHistory` / `unsubscribeSearchIndex` leak, so
   it is not fixed here. If that hook-leak pattern is ever fixed, include the consumer array in the
   same fix.
3. `search.service.ts::registerSearchIndexHook` still derives the FTS key inline and falls back to
   the absolute path on a prefix miss, which is the corruption `vaultRelativeKey` exists to prevent.
   It cannot be folded in here: the issue mandates that `applyNoteChange` never fires
   `afterSaveObservers`, and search's FTS update is one. Own bug issue.

### Step 3 (2026-08-19): external writers routed, issue closed

Red-green evidence, four probes written before the fix and run against unfixed code:

- `frontmatter-icon.service.test.ts` - `setFrontmatterIcon indexes the written bytes into the real
  per-file indexes` failed with `expected undefined to be 'lucide:star'`
  (`collectionStore.propertyIndex.get('/vault/a.md')?.properties.get('_icon')`);
  `removeFrontmatterIcon re-indexes the stripped bytes` failed with `expected true to be false`
  (the `_icon` key survived in the real record).
- `file-icons.service.test.ts` - `indexes the auto-created folder note placeholder as well as the
  icon write` failed with `expected "vi.fn()" to be called with arguments: [ 'update_note_in_index',
  ... ] / Number of calls: 0`.
- `link-updater.service.test.ts` - `rebuilds the rewritten source note in the real property index`
  failed with `expected 'stale' to be 'fresh'`.
- `type-definitions.service.test.ts` - `toggleFavoriteForPath indexes the written bytes into the
  real property index` failed with `expected undefined to be true`; `renameType indexes each
  rewritten open tab into the real property index` failed with
  `expected undefined to be 'Initiative'`.

After the fix: those four files run 105 passed / 0 failed. Full gate green - `pnpm check`
0 errors 0 warnings, `pnpm vitest run` 285 files / 6402 passed + 1 todo, `pnpm build` built in 4.55s.

What discovery found:

- All four writers use `syncExternalContentToEditor(..., 'none')`, which arms no auto-save, so
  `notifyAfterSave` never fires for them. Nothing indexed their bytes until the watcher's 500 ms
  debounce, and `link-updater` / `type-definitions` only told Rust, never the TS per-file indexes.
- Source `save` is the right policy row for all of them: `consumers: 'deduped'` (a repeated identical
  write skips the fan-out), `rust: 'always'` (Rust has not seen the bytes and has its own
  `UpdateResult.changed` short-circuit), `mark: true` (so the layout's 1 s content-effect does not
  re-parse the same file). No sixth source was added.
- `toggleFavoriteForPath` swapped `await invoke('update_note_in_index', ...)` for
  `await applyNoteChange(...)`, so a Rust index failure is now logged instead of rejecting. Its only
  caller is `TypeNoteList.svelte:610`, a fire-and-forget `onclick` that never caught the rejection -
  strictly better.
- `link-updater.service.ts` and `type-definitions.service.ts` both keep their `invoke` import
  (`get_backlinks_v2`, `get_all_vault_entries_v2`, `propagate_type_rename`) and their `error` import.
- Test collateral: three describes reset `invoke` to a bare `vi.fn()` returning `undefined`, which
  made the owner's `invoke(...).catch(...)` throw once these paths started calling it. Fixed by
  giving those describes a `mockResolvedValue(undefined)`, not by hardening the owner against a
  non-promise `invoke`.

Plan discrepancies surfaced:

- The `.view` writers `updateViewIcon` (`:175`) and `updateViewQuery` (`:193`) were in the step's
  scope list but are deliberately NOT routed, exactly the fallback the discovery brief authorised
  ("if it degrades the record, scope step 3 to the `.md` writers only and say so"). Measurement: a
  `.view` body is bare YAML with no `---` fences, so `parseFrontmatterProperties` returns `[]` and
  `extractAllTags` returns `[]`, meaning `buildNoteRecord` yields an EMPTY property map. That would
  overwrite the Rust-projected record, which `project_note_record` (`src-tauri/src/commands/vault.rs:744-757`)
  always stamps with `organized` / `archived` / `favorite` / `tags`. The icon consumer
  (`extractIconFromFrontmatter`, fence-gated) and the calendar consumer (`created:` frontmatter) can
  read nothing from a fenceless file either. Zero upside, one measurable downgrade, so the two call
  sites stay as they are. Pinned by `leaves .view writes out of the property index` in
  `type-definitions.service.test.ts` and recorded in ADR-0009's Consequences so a later reader does
  not "fix" it.
- `ensureFolderNote` IS routed even though its only caller (`setIconForPath`'s directory branch)
  immediately supersedes the `---\n---\n` placeholder with the real icon write. Kept because it is
  explicitly in scope and it closes the window where a failing icon write leaves a brand new note
  invisible to every index. Cost is one extra fire-and-forget IPC on a rare action.
- Confirmed again from the step 2 comment: kanban and collection needed no edit. `KanbanView.svelte::applyChange`
  and `CollectionView.svelte::commitStructural` both reach `EditorView.svelte` and the editor save
  path, so they were already routed the moment step 2 landed. The "six external writers" line in the
  issue resolves to four.

Minor findings worth their own follow-up issue (not fixed here):

1. `updateViewIcon` writes a `.view` file and then does nothing - no `refreshViewDefinition(path)`,
   unlike `updateViewQuery` (`:194`). The view parse cache therefore serves the pre-icon YAML until
   something else refreshes it. Out of scope here (this step only moves indexing calls), but it looks
   like a real staleness bug in the `.view` icon picker.
2. Still open from step 1: `removeFrontmatterIconForFile`'s early return only checks the file key, so
   a stale folder-note parent-directory key can survive. Root-cause fix belongs in
   `removeIconForPath`'s isMarkdown branch.
3. Still open from step 2: `search.service.ts::registerSearchIndexHook` derives the FTS key inline
   and falls back to the absolute path on a prefix miss - the corruption `vaultRelativeKey` exists to
   prevent. Cannot be folded in while `applyNoteChange` is forbidden from firing `afterSaveObservers`.
4. Still open from step 2: routing `fs.service.ts::createFile` through the upsert branch widened the
   non-markdown index leak (`.kanban` / `.canvas` / `.collection` get an empty `NoteRecord`). Root
   cause is a missing extension guard at the top of the owner's upsert branch.
