# Issue 52: `parsing.rs` cites 12 `tasks.logic.ts` symbols that no longer exist

Status: ready-for-agent
Phase: unplanned
Source: issue 40 (2026-08-19) - discovered while rewriting the 8 `task-metadata.logic.ts` parity
citations; out of that issue's `## How` scope, filed rather than folded into its diff

Blocked by: none

Note on line numbers: every `parsing.rs` cite below is as of `4c697f99`, before issue 40's comment
rewrites land. Issue 40 shifts the table rows by 0 (1145-1147), +2 (1159-1171), +4 (1325-1428) and
+5 (1588), so anchor by symbol rather than by number.

## What

`src-tauri/src/vault/parsing.rs` carries 12 `Mirrors ... tasks.logic.ts::<symbol>` comments whose
target symbols were deleted from `src/lib/features/tasks/tasks.logic.ts` long ago (Audit Tier 4 #16,
2026-04-29 - the removal is tombstoned in that file's own header at
`src/lib/features/tasks/tasks.logic.ts:3-10`). The file's only remaining symbols are
`hasUncheckedDescendants:16`, `filterCompletedTasks:33`, `filterCompleted:58`, `filterByDate:75`,
`computeTaskStats:90` - none of which any of these comments name.

| parsing.rs line | cited symbol | exists in tasks.logic.ts |
|---|---|---|
| 1145 | `extractTasks` | no |
| 1146 | `extractTasksFromSection` | no |
| 1147 | `toggleTaskInContent` | no |
| 1159 | `TASK_RE` | no |
| 1165 | `ORDERED_TASK_RE` | no |
| 1171 | `HEADING_RE` | no |
| 1325 | `calculateIndent` | no |
| 1341 | `parseTaskLine` | no |
| 1385 | `CODE_FENCE_RE` | no |
| 1399 | `extractTasks` | no |
| 1428 | `extractTasksFromSection` | no |
| 1588 | `toggleTaskInContent` | no |

Comment-only, so nothing is broken at runtime. The cost is that a reader (human or agent) chasing a
parity question is sent to a file that has not owned task parsing since Phase 7.6 - Rust is the sole
implementation now.

Issue 40 rewrites the 8 sibling `task-metadata.logic.ts::` citations (lines 1148, 1149, 1178, 1199,
1256, 1296, 1309, 1479) because that file is being deleted. Fixing those 8 and leaving these 12 is
inconsistent, but widening issue 40's diff would break its scope contract, so they are tracked here.

## How

- Rewrite each comment so it documents the Rust behaviour on its own terms instead of pointing at a
  deleted TS symbol. Keep the substance that is Rust's own contract, not TS parity trivia:
  - 1151-1155 (the header's parity paragraph): the recurrence lookahead-stop list and the
    `#([A-Za-z0-9_][A-Za-z0-9_-]*)` ASCII rationale explain live Rust behaviour - keep them, drop
    only the "mirrors TS" framing.
  - The regex doc comments (1159, 1165, 1171, 1385) already inline the pattern; the citation adds
    nothing once the TS side is gone.
- Comment text only. No behaviour change, no test change expected.
- Sequence after issue 40 lands, so the two comment rewrites do not conflict in the same hunks
  (1145-1149 sit in one block).

## Gate

- Rust surface: `cargo test --manifest-path src-tauri/Cargo.toml` (comment edits can only regress it
  by accidental syntax damage, so the gate is cheap insurance).
- Stage only the files related to this issue, verify with `git diff --cached --stat`.
- One commit, full commit format (Context, Problem, Solution, Behavior, Files with line ranges).

## Comments

2026-08-19 - triage: CONFIRMED, Status flipped needs-triage -> ready-for-agent.

Per-symbol evidence. `src/lib/features/tasks/tasks.logic.ts` declares exactly five symbols today:
`hasUncheckedDescendants`, `filterCompletedTasks`, `filterCompleted`, `filterByDate`,
`computeTaskStats`. Every one of the 12 cited names (`extractTasks`, `extractTasksFromSection`,
`toggleTaskInContent`, `TASK_RE`, `ORDERED_TASK_RE`, `HEADING_RE`, `calculateIndent`,
`parseTaskLine`, `CODE_FENCE_RE`, and the three repeats) is absent from that list, so all 12 rows of
the `## What` table hold.

Refuted row: the `parsing.rs line` column itself. The file's own "Note on line numbers" caveat was
right - after issue 40 and the later commits, none of the 12 numbers resolved to the cited comment
any more. The fix anchored by symbol; the numeric column was ignored, not trusted.

2026-08-19 - fixed. All 12 `parsing.rs` citations rewritten to document the Rust behaviour on its own
terms.

Widened beyond the `## What` scope by 2 lines: `vault/task.rs::display_name` cited
`tasks.logic.ts:256-260::getDisplayName` and `vault/index.rs::VaultIndex::lookup_all_tasks` cited
`tasks.logic.ts::buildGroupsFromIndex`. Same defect, same cited file, both dead. Including them makes
the verification repo-wide: `grep -rn 'tasks\.logic\.ts' src-tauri/src` now returns nothing.

One factual correction beyond a citation swap: `toggle_task_in_content`'s doc listed "first
occurrence" semantics, which commit `04e901e8` abandoned - it flips the box in the task marker
(`TASK_RE` / `ORDERED_TASK_RE` group 2), never a stray `[ ]` elsewhere on the line. The doc now
matches the code.

Seen and deliberately left out of scope:

- `parsing.rs` cites two dead `backlinks.logic.ts` symbols: `stripNonBodyContent` (in
  `strip_non_body_content`) and `findPlainTextMentionPositions` (in
  `find_plain_text_mention_positions`). `backlinks.service.ts` also mentions the dead
  `findUnlinkedMentions`. Different cited file - file as a separate issue.
- Three filenameless "TS" orphans inside the rewritten functions: the `line.match(/^(\s*)/)` note in
  `parse_task_line`, and the two "Mirrors TS lookahead semantics" / "The TS version does this on
  `text.trim()`" notes in `parse_task_metadata`. The last two are issue-40 residue (they refer to the
  deleted `task-metadata.logic.ts`). They name no file or symbol, so they were not among the 12.

The 5 live `task-metadata.types.ts` citations issue 40 wrote were left untouched.

2026-08-19 - review verdict: findings, 3 minor, all accepted and applied in the same commit. No
major or blocking finding, no refuted finding.

1. Phase 7 header understated the consumer set. `get_all_tasks_v2` / `get_tasks_in_section_v2` /
   `toggle_task_status` are only the task-specific commands; parsed tasks also ride on
   `NoteEntry::tasks` (`vault/entry.rs`, filled by `extract_tasks`) through `scan_vault_v2`,
   `get_all_vault_entries_v2`, `get_backlinks_v2` and `get_unlinked_mentions_v2` - all four return
   `Vec<NoteEntry>`, and QueryJS `buildKBPage` reads `entry.tasks` off the second one. The header now
   names both routes.
2. `task.rs::display_name` doc overgeneralized "dotfiles keep their full name". `rfind('.')` only
   skips index 0, so `/vault/.env.local` -> `.env`. The doc now says extensionless dotfile and gives
   that counter-example.
3. The header wrote the recurrence stop atom as `#\w`, but `RECURRENCE_RE` pushes the ASCII literal
   `#[A-Za-z0-9_]`; the regex crate's `\w` is Unicode-aware, which is the exact distinction the next
   sentence draws for task tags. The header now writes the ASCII class.

Gate: `cargo test --manifest-path src-tauri/Cargo.toml` green (exit 0). Comment-only diff, no
TS-visible type, mock or fixture touched, so the frontend gate was not required.
