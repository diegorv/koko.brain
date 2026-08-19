# Issue 40: Delete the superseded task-metadata parser

Status: ready-for-agent
Phase: P4
Source: PONY #3 — plan-2026-08-12.md §P4 — Worth-exploring variants and heavy-collateral PARTIALs

Blocked by: none

## What

The TS task-metadata parser was superseded by the Rust parser in `src-tauri/src/vault/parsing.rs`.
Deleting it removes the source plus its own 388-line test file, but it is also the only tracked
anchor for a real regex bug, so that bug must be re-filed before the anchor disappears.

## How

- Delete the parser **source plus its own test file** (388 lines).
- Patch `makeTask` in `tasks.logic.test.ts` so the surviving suite still compiles.
- **Rewrite the 8 `parsing.rs` parity citations** — they currently point at the deleted TS parser.
- **Before deleting, RE-FILE the `dependsOn` regex bug against `src-tauri/src/vault/parsing.rs:1310-1316`.**
  The deleted test file is its only tracked anchor. Record the re-filed bug in this issue's Comments
  section (or as its own tracker entry) — the deletion must not land while the bug is untracked.
- **Keep `task-metadata.types.ts`** — the types survive the parser.
- Test collateral rides the same commit: the `makeTask` patch and the citation rewrites.

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`. If the citation rewrites touch
  Rust files, also `cargo test --manifest-path src-tauri/Cargo.toml`.
- Stage only this change's files (`git add <specific files>`), verify with `git diff --cached --stat`.
- One commit for the deletion + collateral, full commit format (Context, Problem, Solution,
  Behavior, Files with line ranges). The bug re-filing happens first, as its own tracker write.

## Comments

### 2026-08-19 - done

Supersedes the earlier `2026-08-19 - handed back to human` entry, which has been removed from this
file. That hand-back was infrastructure-driven - the implement agent process ended without
returning, twice (a session limit, then an API server error) - never a finding about the code, and
its open questions are all answered below. The `Status:` header is back to `ready-for-agent` for
the same reason. The parked stash commit `b56e8c9e` was treated as an untrusted draft: every part
of it was re-read and re-verified here, and the 114-line self-report it appended to this file was
dropped rather than kept.

**Precondition: already discharged, not repeated.** The `dependsOn` comma-space regex bug is
tracked as issue 51 (`51-depends-on-comma-space-regex.md`) and the 12 remaining stale
`tasks.logic.ts::` citations as issue 52 (`52-parsing-rs-stale-tasks-logic-citations.md`), both
filed by commit `4c697f99`; commit `83fa9580` recorded their pre-issue-40 line-number baseline.
This run re-filed nothing.

**Red-green evidence.** This is a pure deletion, so there is no red test. Two substitutes:

1. *Exhaustive caller trace.* `grep -rn -E "parseTaskMetadata|mapCheckboxChar|isDueToday|isDueSoon|\bisOverdue\b|task-metadata\.logic"`
   over `src`, `src-tauri`, `docs`, `e2e`, `scripts` and `.scratch` (node_modules and
   src-tauri/target excluded) finds ZERO production call sites for all five exports. Before the
   deletion the only hits were the module's own 388-line test file and the `parseTaskMetadata`
   import in `tasks.logic.test.ts`; after it, the only hits left are prose in issues 40, 51 and 52.
   Rust owns task parsing: `parsing.rs::parse_task_metadata` and `::map_checkbox_char`, consumed
   through `get_all_tasks_v2` and surfaced at `tasks.service.ts`.
2. *Mutation check on the surviving suite,* to prove the `makeTask` patch did not leave it vacuous.
   Flipping the descendant guard at `tasks.logic.ts:20` from `<=` to `>=` turns
   `src/tests/lib/features/tasks/tasks.logic.test.ts` red - `Tests 4 failed | 11 passed (15)`, with
   `filterCompletedTasks` and `filterCompleted` both reporting truncated hierarchies (e.g.
   `expected [...] to have a length of 3 but got 1` at line 80). Reverted immediately; the mutation
   is not in the diff. `tasks.logic.ts` contains no reference to `metadata` at all
   (`grep -n metadata` returns nothing), so the literal `{ description, tags: [] }` cannot weaken
   any assertion.

**Open question from the hand-back, now answered.** `isOverdue`, `isDueToday` and `isDueSoon` have
no Rust counterpart and do not need one: nothing calls them. Kanban's date colouring uses its own
`getDateProximity` (`src/lib/plugins/kanban/kanban.logic.ts:473-478`, string-comparison based and
unrelated). They leave the tree with the rest of the module.

**Gate (all four, because this step edits Rust).**

- `pnpm check` - 191 files, 0 errors, 0 warnings.
- `pnpm vitest run` - 283 files passed, 6286 passed / 1 todo (6287).
- `pnpm build` - exit 0.
- `cargo test --manifest-path src-tauri/Cargo.toml` - exit 0, 24 suites, 997 passed, 0 failed.

**Plan discrepancies.**

1. *Both the issue and the plan cite the wrong anchor for the re-file.* `## How` above and
   `plan-2026-08-12.md:153` point the `dependsOn` bug at `src-tauri/src/vault/parsing.rs:1310-1316`.
   That range is `pub fn map_checkbox_char`, unrelated to depends-on. The real anchors are
   `DEPENDS_ON_RE` and its consumer inside `parse_task_metadata`. Issue 51 already records both the
   correct anchors and this discrepancy; moot for execution, since the re-file already landed.
2. *`## How` frames this as deleting "the parser".* The module also carried `mapCheckboxChar` and
   the three date helpers. All five exports were dead, so the whole file went.
3. *Scope held at 8 citations, not 20.* The dead run's hand-back proposed widening to all 20
   `parsing.rs` citations and closing issue 52 in the same pass. Issue file wins: `## How` says 8,
   and issue 52's own `## How` says to sequence after 40. Lines 1145-1147 still point at deleted
   `tasks.logic.ts` symbols on purpose - they are issue 52's, and they sit in the same 1145-1149
   comment block, which is exactly why 52 asks to run second.

**Minor findings worth a follow-up (NOT fixed here, out of this step's scope).** Four comments in
`parsing.rs` still frame Rust behaviour as mirroring TS but do not use the
`task-metadata.logic.ts::` citation form, so they fell outside the 8 this step was scoped to and
outside issue 52's 12:

- `parsing.rs:1153-1157` - "Regex parity with TS: the same patterns are used here" in the Phase 7
  header block, covering the recurrence stop-list and the task-tag class.
- `parsing.rs:1220` - "Equivalent to TS `emojiRe(emoji)`" on `emoji_pattern`.
- `parsing.rs:1527` - "Mirrors TS lookahead semantics exactly" inside `parse_task_metadata`.
- `parsing.rs:1576-1577` - "The TS version does this on `text.trim()` then removes via
  `text.replace(TAG_RE, '')`" on the tag-extraction step.

Each describes real Rust behaviour correctly; only the "mirrors TS" framing is now dangling. Worth
folding into issue 52 when it lands rather than filing separately.

**Files.**

- `src/lib/features/tasks/task-metadata.logic.ts` - deleted (241 lines).
- `src/tests/lib/features/tasks/task-metadata.logic.test.ts` - deleted (388 lines).
- `src/tests/lib/features/tasks/tasks.logic.test.ts:16` - dropped the `parseTaskMetadata` import
  (was line 9); `makeTask` now builds `metadata` as a literal
  `{ description: overrides.text, tags: [] }`.
- `src-tauri/src/vault/parsing.rs:1148-1150, 1179-1181, 1201-1205, 1255-1262, 1301-1304, 1314-1316, 1485-1487`
  rewrites the 8 parity citations to document Rust's own behaviour, pointing at the surviving
  `task-metadata.types.ts` contract where a shape reference is still useful. The Rust-contract
  substance in the `RECURRENCE_RE` (lookahead-emulation) and `TASK_TAG_RE` (explicit ASCII class)
  doc comments was kept; only the "mirrors TS" framing went.
- `src/lib/features/tasks/task-metadata.types.ts` - KEPT. Live importers: `tasks.types.ts:1`,
  `todoist-bridge.logic.ts:2`, `todoist.service.ts:9`, `TodoistPopover.svelte:10`.
