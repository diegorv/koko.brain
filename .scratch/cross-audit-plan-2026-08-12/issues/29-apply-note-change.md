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
