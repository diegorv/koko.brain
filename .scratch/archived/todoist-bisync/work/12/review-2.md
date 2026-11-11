VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | blocker | resolved | `planMoves` (`sections.logic.ts:385-391`): when `sectionId === undefined`, a link with `local.location === undefined` and `!remoteMoved` gets `placed(link, there, there, ...)`. On the next cycle the heading is linked, `here != there`, `local.location` is defined and `remoteMoved` is false, so the line reaches the `item_move` push branch. This holds for links made before this Issue: `RemoteBase.sectionId` already existed on main (`pull.logic.ts`), so `remoteMoved` is false for them. The write fires only once per link, because `location` is then set. Sync-now tests "moves a task whose link has no place yet into the section created for the heading its line sits under" and "... after a rebuild, then a normal cycle" assert `w1` in the new section, the note text, `['section_add', 'item_move']` and a quiet next cycle. The unit case in `sections.logic.test.ts` covers the `remoteMoved` guard. |
| 2 | minor | resolved | `unique_heading` (`task_lines.rs:341-343`) and `uniqueHeading` (`task-line-edits.logic.ts:152-153`) filter on level 2. The only callers are the sync's section inserts and renames (`sync-now.service.ts:1039-1043`, `sections.logic.ts:440`), and all of them name `##` headings. New Rust and TS cases cover insert and rename, and the sync-now test "writes the ## heading of a section whose name a ### heading of the note has, and keeps writing the note" asserts that no `stale` row is written. The bindings are fresh: `--lib export_bindings` left the worktree clean. |
| 3 | minor | resolved | An empty heading is skipped (`sections.logic.ts:234-235`), with a unit test. A refused `section_add` is logged on manual cycles only (`pushSections`, `logRefusals`), and the test "logs a refused section_add on a manual cycle only" asserts 3 sends and 1 log row. discovery.md records that lines under headings that can never be linked stay in place and keep their section. One residual remains, the fix step itself disclosed it, and it is listed as finding 1 below. |
| 4 | nit | rejection stands | No change was asked. |
| 5 | nit | rejection stands | `deleteSectionIds` is small, mirrors `deleteAnchors` and is tested. Dropping it would churn the IPC DTO and its bindings for no behavior gain. |

## Acceptance criteria

- [met] Failing tests first (fake `/sync`, real stores). — Every fix commit adds tests that run against the fake `/sync` and the real stores (`sync-now.service.test.ts`, with `refuseSectionAdds()` added to the fake and its own test in `todoist-sync.fake.test.ts`). The fix step reports that each test failed first. I did not re-run the tests against the code before the fix.
- [met] `todoist_section_link(todoist_section_id, project_id, heading)` table. A line under no linked heading has `section_id: null`. Section order is not synced. — The table did not change in this round. Lines under headings that can never be linked keep their Todoist section, a deviation recorded as a default in discovery.md and accepted in round 1. A new line under an unlinked heading still goes to `section_id: null`.
- [met] Pull: new section -> heading appended; renamed section -> heading text replaced; task `section_id` or `project_id` change -> line moved with the same anchor (same note: one writer call; another note: insert in the target first, then remove from the source). — The pull tests still pass. The level-2 match keeps appends and renames on `##` headings, as the new `### Next` test shows.
- [met] Push: a brain `##` heading with at least one task line and no link -> `section_add`; a line moved under another heading or into another project note -> `item_move` (one of section_id / project_id per command). A brain heading rename counts as a new section in this basic form (old link kept, logged). — Finding 1 of round 1 is fixed: links with no place now push `item_move` after `section_add`. Both new sync-now tests pass.
- [met] Gate: Both (schema change). — `pnpm check`: 0 errors, 0 warnings. vitest on `src/tests/lib/features/todoist-sync/`, `src/tests/lib/contracts/` and `src/tests/lib/architecture/`: 39 files, 830 tests passed. cargo `--test vault_task_lines_test`: 50 passed. cargo `--lib export_bindings`: 49 passed, and the worktree was clean afterwards. Deliver runs the full vitest and cargo suites.

## Findings

1. **minor** `src/lib/features/todoist-sync/sections.logic.ts:237-244` (emitted through `sync-now.service.ts:457`). When Todoist refuses the `section_add` for a brain-renamed heading, its `section-renamed` row is still logged on every cycle that sends the add, automatic cycles included. That fills the capped sync log, the same problem the `command-error` fix just solved. Fix: emit `sectionPlan.log` on manual cycles only, or drop the rows of adds that were refused. The fix step disclosed this, and it can go into a follow-up.

## Other checks

- Tests were only added. No test was weakened or deleted (`git diff ab1982da9..HEAD` under `src/tests` and `src-tauri/tests` shows only additions).
- No scope creep: the changes stay in the sync's writers, the planner, the fake and the bindings their doc comments regenerate.
- Layer baseline, `BASELINE_SIZE` and composition roots: untouched.

## Resolution

1. **minor, fixed.** The `section-renamed` row now travels with its add (`PlannedSectionAdd.renamed`; `SectionPlan.log` is gone) and `pushSections` writes it only when Todoist creates the section, on manual and automatic cycles alike. A refused add writes no rename row; its `command-error` stays manual-only. New sync-now test: "logs a brain-renamed heading only once Todoist creates its section, so refused retries write no rename rows" (failed first with three rename rows). A lost `section_add` response, which pairs by name on the next cycle, leaves the rename unlogged; the row is informational, so that is accepted.
