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
