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
