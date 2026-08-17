# Issue 06: createFile indexes new notes as empty

Status: ready-for-agent
Phase: P0.6
Source: ARCH LB5 + arch 0.1 (reduced, module merge dropped) — plan-2026-08-12.md §P0 — Live-bug surgical fixes
Blocked by: none

## What

New kanban, canvas, collection and typed notes are created empty and then overwritten with their real content, so the index captures the empty version and never re-indexes. The note is unsearchable and unlinkable until something else touches it. Goal: new content participates in the vault from the first second.

## How

- Write the failing regression test FIRST: creating a file with initial content must index that content, not an empty document. Confirm it fails before the fix.
- Add an optional `content` param to `fs.service.createFile`.
- Delete the empty-then-overwrite two-step and its comments at the 5 callers: canvas, kanban, collection, type-definitions, note-creator.
- Reduced scope: the arch 0.1 module merge is DROPPED. Do not widen the `openOrCreateNote` seam (ADR-0007).
- Update the affected caller tests and `fs.service` tests in the same commit.

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Stage only the files related to this issue (`git add <specific files>`), then verify with `git diff --cached --stat`.
- One commit for this fix, using the repo's full commit format (Context, Problem, Solution, Behavior, Files with line ranges). Test collateral lands in the same commit as the source change.

## Comments

**2026-08-17 — resolved.**

- Red-green: new fs.service regression test ("passes initial content through to create_note")
  written first and run against the broken code — failed with `create_note` receiving
  `content: ''` (the bug), passes after the fix.
- Fix: `createFile(parentPath, fileName, content = '')` forwards content to Rust `create_note`,
  which writes atomically AND indexes the real content (`update_note_in_index_inner`) and emits
  `vault-index-updated` (`src-tauri/src/commands/vault.rs:885-911`). Callers collapsed to one step:
  canvas, kanban, collection, type-definitions (`createTypeDefinition` also dropped its explicit
  `update_note_in_index` workaround — the Rust path is a strict superset; `createView` now dedups
  the filename BEFORE createFile so the body can embed the final title, aborting if the vault root
  can't be read).
- Discovery: note-creator (listed in ## How as the 5th caller) needed NO change — it already
  passes content to `create_note` in one step (`note-creator.service.ts:81`), fixed earlier in
  Phase 8.7. command-palette / wikilink-navigation / explorer callers intentionally create empty
  `.md` files; default param preserves them.
- Adversarial review (Fable 5, refute stance): could not refute the core fix. One MINOR
  (createView title/filename divergence when the pre-dedup readDir fails) — fixed by aborting on
  readDir failure, delta re-reviewed: could not refute. Pre-existing NIT (create_note indexes
  non-md files that full rescans drop) filed as issue 49.
- Gate: `pnpm check` 0 errors, `pnpm vitest run` 6699 passed, `pnpm build` succeeded.
