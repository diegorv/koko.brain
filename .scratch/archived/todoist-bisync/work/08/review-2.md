VERDICT: APPROVED

Re-review, round 2, of the fix commit `07fcbe859` (`git diff ded611082..HEAD`), which changes `src/lib/features/todoist-sync/fields.logic.ts`, `src/tests/lib/features/todoist-sync/fields.logic.test.ts` and the Resolution section of `review.md`.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `fields.logic.ts:125-132`: when `contentRoundTripProblem(localBase.description)` is set, `planLink` logs `description-conflict`, plans no patch and leaves `local.description` as it is, while `remote.content` and `contentProblem` still move (:118-120). The both-sides `conflict` at :136 cannot be reached on that path any more, and the word-span replace that left `#42` behind is skipped. Reading `local_base` is the right key: `pulledTask` (`pull.logic.ts:326`) stores the raw content there, and `remote_base.contentProblem` turns null after the first edit, which the test's second cycle checks. Other producers of `local_base` (`localBaseFromLine`, `completion.logic.ts:131`, and the replace path at :138) store a parsed description or content that passed the check, so ordinary lines do not take the new branch. The parser drops a task with no text, so an empty parsed description cannot trigger it either. The new test "leaves a line inserted from content that failed the round trip alone on every later Todoist edit, without a both-sides conflict" asserts no line change, a single `description-conflict` log, an unchanged `local_base` and a moved `remote_base`, over two edits in a row. The pre-fix code would have planned `patch.description`, so the test's `lineChanges: []` assertion fails without the fix. |
| 2 | nit | resolved | The `planFields` JSDoc (`fields.logic.ts:66-69`) explains that links whose commands are dropped over the cap get field sync and that their push is planned again. |
| 3 | nit | resolved | The `planFields` JSDoc (`fields.logic.ts:55-57`) says the `📅` goes and the `🔁 <rule>` text stays when Todoist drops a recurring due. |
| 4 | nit | rejection stands | The review asked for no action. `pull.logic.ts` is unchanged by the fix. |

## Acceptance criteria re-checked

- [met] Per field against `remote_base`: content -> description text via ticket 02's replace (a conflict result leaves the line alone and logs); `due.date` -> `📅` (date part; a time stays in `remote_base`); priority -> emoji through the reverse of the moved priority map; labels -> tags per rule 8 (case-insensitive compare, unmapped labels kept, the `#todoist` scope tag, the configured default label and the context labels `Work` and `personal` excluded, design rule 8b). A test: a remote label change that only adds `Work` (the owner's webhook) writes nothing to the line. — The content path still goes through `replaceDescription` for ordinary lines (`fields.logic.ts:133-145`). The new branch is one more "leave the line alone and log" case. The due, priority and label paths are unchanged. `fields.logic.test.ts` and `sync-now.service.test.ts` pass.
- [met] Content that fails the round-trip check is not written; logged. — Unchanged at `fields.logic.ts:121-122`. The fix extends the same rule to a line that was inserted from such content, which is now left alone and logged on each later edit (new test).
- [met] Idempotent: two cycles in a row with no change write nothing (a test per field, including priorities `low` and `lowest`, which both map to Todoist 1). — The new branch runs only when `item.content !== remoteBase.content`. Because `remote.content` moves, a second cycle with no change skips it. The existing `rerun` tests pass.
- [met] Gate: frontend. — `pnpm check` exit 0 (229 files, 0 errors, 0 warnings). The targeted test files pass (below). Deliver runs the full `pnpm vitest run`.

## Checks I ran

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/todoist-sync/fields.logic.test.ts src/tests/lib/features/todoist-sync/sync-now.service.test.ts src/tests/lib/features/todoist-sync/task-line.logic.test.ts`: exit 0, 3 files, 157 tests passed.
- No test was deleted or weakened: the fix diff only adds a test. There is no scope creep: the diff touches only `fields.logic.ts`, its test and the review file, and it does not touch `layer-baseline.json`, `BASELINE_SIZE`, the ledger or `src-tauri/`.

## Findings

None open or new. The fix report already notes the known limit: while `local_base` keeps the raw content, such a line stays blocked for Todoist content edits for as long as `local_base` holds that content. That is the documented behavior in the `planFields` JSDoc and needs no change in this Issue.
