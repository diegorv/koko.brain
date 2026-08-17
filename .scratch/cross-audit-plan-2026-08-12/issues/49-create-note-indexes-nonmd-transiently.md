# Issue 49: create_note indexes non-md files that the next full rescan silently drops

Status: needs-triage
Phase: unplanned
Source: issue 06 adversarial review (2026-08-17) — pre-existing, not introduced by the createFile content fix

## What

`create_note` (`src-tauri/src/commands/vault.rs:885-911`) runs `update_note_in_index_inner` for
whatever path it is given, so creating a `.canvas` / `.kanban` / `.collection` file inserts a
`VaultIndex` entry for it. But full rescans collect only `.md` / `.markdown` / `.view`
(`is_markdown_filename`, `src-tauri/src/utils/fs.rs:114-117`), so those entries exist only until the
next full rebuild drops them. The index is inconsistent depending on whether the last touch was a
create/save or a rescan.

Consequence today is benign: the default canvas/kanban/collection bodies are index-inert (no
frontmatter delimiters, no wikilinks/tags/tasks that parse), so nothing user-visible flickers. But a
kanban board whose cards contain `[[wikilinks]]` would contribute backlinks right after a save and
lose them after the next full rescan — silent, timing-dependent data in query results.

## How

- Decide the invariant first: either the `VaultIndex` covers md+view only, or it covers everything
  `create_note`/`update_note_in_index` touch. Then make both sides agree:
  - Option A (likely lazy fix): make `create_note` / `update_note_in_index` skip index insertion for
    paths failing `is_markdown_filename`, matching the scan. One guard in
    `update_note_in_index_inner` covers every caller.
  - Option B: include the extra extensions in the scan walk — only if non-md content is actually
    meant to participate in backlinks/tags/tasks (product decision).
- Regression test FIRST (red): index a `.kanban` file via the create/update path, run a full scan,
  assert the entry set is identical before and after.

## Gate

- Rust surface: `cargo test --manifest-path src-tauri/Cargo.toml`.
- Stage only the files related to this issue, verify with `git diff --cached --stat`.
- One commit, full commit format (Context, Problem, Solution, Behavior, Files with line ranges).

## Comments
