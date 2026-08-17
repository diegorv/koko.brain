# Issue 28: forgetNote — first slice of the note-change owner

Status: ready-for-agent
Phase: P3 Track C step 3 (cluster C08)
Source: ARCH 5.1 slice 1, LB6, ADR-0009:63 — plan-2026-08-12.md §P3 — ARCH Strong refactors (Track C — Filesystem/paths)
Blocked by: 26-sort-option-removal, 24-autosave-scheduling

## What

Ship `forgetNote` — the index-dedupe clear plus the Rust index removal — and call it from the
rename/move sites that today omit what the delete site already does. Closes live bug LB6: a file
renamed away and later recreated at the old path is silently skipped by the index dedupe, so real
content never gets re-indexed.

## How

- Extract `forgetNote(path)` = `clearIndexedEntry(path)` + `remove_note_from_index(path)`.
- Wire it at `fs.service.ts:229` and `fs.service.ts:269` (rename/move), which today omit what the
  delete site at `fs.service.ts:184` already does.
- **Per the P1 C06/C03 decision, `forgetNote` is the FIRST SLICE of the single note-change owner
  (arch 3.1 `applyNoteChange`) — never a second, competing module.** Issue 29 absorbs it; issue 35
  and the later path-change owner reuse it. Do not build a parallel owner.
- Closes the **ADR-0009:63 violation**: the named enforcer `removeFileFromIndex` no longer exists.
  **Amend ADR-0009 in this same commit series** to name the real enforcer.
- Drop the `vi.mock` at `fs.service.test.ts:40-42` — the real path must be exercised.
- Test collateral in the same commit: a regression test reproducing LB6 (rename away → recreate at
  the old path with identical bytes → the file is re-indexed), asserting real store/dedupe state,
  not a mock-call count.

## Gate

Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build` before the commit. Stage only the
files for this step, verify with `git diff --cached --stat`, and commit as one commit using the
repo's full commit format (Context, Problem, Solution, Behavior, Files with line ranges).

## Comments
