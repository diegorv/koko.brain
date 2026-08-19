# Issue 34: Delete the dead Rust vault commands

Status: ready-for-agent
Phase: P3 Track E step 1 (cluster C11)
Source: PONY #9 — plan-2026-08-12.md §P3 — ARCH Strong refactors (Track E — Rust index)
Blocked by: 10-rust-one-liners

## What

Cut the five unused Tauri vault commands and everything that references them, so the doc surfaces stop
enumerating commands nothing invokes. Safe only now: the P1 C11 decision fixed arch 7.0's producer
shape as option 2 (the `vault-index-updated` listener seam), which touches no Rust commands.

## How

Full corrected checklist — **all of it in one commit, or the crate does not compile**:

- 5 commands + their **5 registrations** + **3 `index.rs` lookups**.
- **ALL 19 test functions** — compile-breaking otherwise.
- 3 now-unused imports.
- `CLAUDE.md:262` and `vault-v2.types.ts:65`.
- The stale comments and the **'Phase 8' header**.
- The **e2e mock handlers**.

Hard constraint:

- **Do NOT delete `properties_index`** — accept it as **write-only**. Per the P1/C11 decision,
  re-adding readers is a later decision, not part of this program.

Ordering: **#25 (issue 10) must land first**; **this issue must land before issue 35 (arch 7.0)**, and
the later `rename_note` work is written against the post-cut `index.rs`.

## Gate

Rust surface: `cargo test --manifest-path src-tauri/Cargo.toml`. The e2e mock handler and
`vault-v2.types.ts` edits also touch the frontend surface — run `pnpm check` + `pnpm vitest run` +
`pnpm build` as well. Stage only this step's files, verify with `git diff --cached --stat`, and commit
as one commit using the repo's full commit format (Context, Problem, Solution, Behavior, Files with
line ranges).

## Comments

### 2026-08-19 — implemented (pending commit)

**Red-green substitute.** Pure deletion, so there is no red-first test; the substitute is the
repo-wide caller trace. Before the cut,
`grep -rnE 'get_notes_with_tag|get_tasks_in_path|query_notes_by_property|get_property_values|get_note_properties|getNotesWithTag|getTasksInPath|queryNotesByProperty|getPropertyValues|getNoteProperties' . --exclude-dir={node_modules,target,.git,build,.svelte-kit,.scratch}`
returned **23 hits** and
`grep -rnE "invoke[<(].*('|\")(get_notes_with_tag_v2|get_tasks_in_path_v2|query_notes_by_property|get_property_values|get_note_properties)" src e2e`
returned **0**. Every one of the 23 was a definition, a `generate_handler!` registration, a doc
string, or the single e2e mock handler. After the cut the same grep returns **3**: two are the new
`properties_index` write-only doc naming the deleted commands as history, one is
`e2e/mocks/vault-index.ts:402 getNoteProperties` (pre-existing dead, left alone — see Minor findings).

The green side is the surviving coverage: `properties_index` is still exercised through the
`properties_index()` accessor by `build_properties_indexed`, `update_entry_updates_properties`,
`build_with_properties_populates_properties_index`, `build_clears_properties_index_on_rebuild` and
`remove_entry_cleans_properties_index` — 5 tests, 19 accessor call sites, all green.

**Gate (all five run, all green).**

| Command | Result |
|---|---|
| `cargo test --manifest-path src-tauri/Cargo.toml` | 0 failed across all suites (571 lib + 107 + 65 + 40 + 38 + 28 + …) |
| `cargo check` / `cargo check --tests` | 0 warnings, matching the pre-change baseline of 0 |
| `pnpm check` | 191 files, 0 errors, 0 warnings |
| `pnpm vitest run` | 284 files, 6331 passed, 1 todo |
| `pnpm build` | exit 0 |
| `bash scripts/e2e.sh` | 181 passed |

**Discovery / plan discrepancies.**

1. **The issue says "3 `index.rs` lookups". It is 5.** Deleting the five commands strands
   `lookup_notes_with_tag`, `lookup_tasks_in_path`, `lookup_notes_by_property`,
   `lookup_property_values` and `lookup_note_properties` — each had exactly one production caller,
   the command being deleted. The issue's own "ALL 19 test functions" figure is the tiebreaker and
   confirms 5: the 19 decompose as 7 in `index.rs`'s `#[cfg(test)]` module (2 notes_with_tag,
   1 tasks_in_path, 2 notes_by_property, 1 property_values, 1 note_properties) plus 12 in
   `tests/vault_index_test.rs` (4 + 2 + 3 + 1 + 2). Cutting only the 3 property lookups would have
   killed 10 tests, not 19, and left two lookups with zero callers. Cut all 5.
2. **The issue says "the 'Phase 8' header" — there are two, and only one goes.** Removed:
   `index.rs`'s `// Phase 8 — Property lookups` section header, which became an empty section.
   Kept: `vault-v2.types.ts`'s `Phase 8 — Property + file-op IPC types` header (its
   `get_all_property_records` / `NoteRecordV2` are live) and `vault.rs`'s
   `Phase 8 — Property + file-op commands` header (still covers `project_note_record`,
   `get_all_property_records`, `create_note`, `create_folder`).
3. **The issue says "the e2e mock handlers" (plural). Exactly one command had a mock**, but removing
   it stranded three things, all deleted: the handler at `tauri-core.ts:84-86`, its map entry at
   `:265`, and the backing `vault-index.ts:341-346 getNotesWithTag` whose only caller was that
   handler. `get_tasks_in_path_v2` and the property trio never had mocks.
4. **The issue's `## Gate` omits e2e; it was run anyway.** `pnpm check` does not type-check `e2e/`
   (the tsconfig include list is `../src/**`, `../test/**` and the vite configs), and the mocks are
   aliased in only under `PLAYWRIGHT=true`. A broken mock is invisible to all four normal gates, so
   the playbook's step-4 rule wins over the issue's list. All 181 e2e specs pass.
5. **Two unused-import hazards the issue does not list**, both handled. `index.rs:15 Task` lost its
   only non-test use with `lookup_tasks_in_path` (the test module has its own import at :1105), so
   it was dropped from the parent import. `index.rs:18 BTreeMap` lost its only non-test use with
   `lookup_note_properties`, but `mod tests` still depends on it through `use super::*`
   (`make_entry_with_fm`, `make_entry_with_rels`, `fm`) — so it was dropped from line 18 **and** an
   explicit `use std::collections::BTreeMap;` was added inside `mod tests`. `JsonValue` at
   `index.rs:17` stays: `canon_value_key` still uses it. Verified with `cargo check` and
   `cargo check --tests`: zero warnings in both, same as the baseline.
6. **`Blocked by: 10-rust-one-liners` was already satisfied** — closed by `cbc36838`; #25's
   `extract_wikilinks_from_str` wrapper is live at `entry.rs:406-412` with its
   `.filter(|t| !t.is_empty())` intact. No action needed.

**`properties_index` kept, per the P1/C11 hard constraint.** The field, its `properties_index()`
accessor, `canon_value_key`, and the build / update-diff / remove-prune paths are all untouched. Its
field doc was rewritten to record the new write-only status honestly rather than keep naming the two
deleted lookups. One stale in-body comment in the prune path (`update_entry`) also named
`lookup_property_values`; it was reworded, since the change is what made it a lie.

**Minor findings — candidates for a follow-up issue, not touched here.**

- `e2e/mocks/vault-index.ts:402 getNoteProperties` is dead, but it was **already** dead before this
  change (there has never been a `get_note_properties` handler in `tauri-core.ts`). Per root
  CLAUDE.md § Surgical Changes it is mentioned, not deleted. Worth a one-line cleanup issue.
- `properties_index` is now genuinely write-only: the vault pays the build, diff and prune cost on
  every scan and every save for an index nothing reads. Either arch 7.0 re-adds a reader or the
  whole structure should be reconsidered. That decision is explicitly deferred by P1/C11, so it is
  flagged here rather than acted on.

**Not done here:** no commit, no staging — left in the working tree for the commit step.
