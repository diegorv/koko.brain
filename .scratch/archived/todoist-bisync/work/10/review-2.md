VERDICT: APPROVED

# Issue 10 re-review, round 2

Reviewed `git diff 54ca91a7d..HEAD` (one fix commit, c5778e246): `create.logic.ts`, `sync-now.service.ts` and their two test files, plus the `## Resolution` in `review.md`.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `addAnchor` (`create.logic.ts:344-351`) now takes `(?: \^[\w-]+)?\s*$` as the trailing part, so the anchor goes before a block id, which matches the single-space form in `block-reference.ts` (`/ \^([\w-]+)$/`). `planCreates` strips `TRAILING_BLOCK_ID` (`:26`, `:165`) and passes the stripped `content` into `addArgs` (`:175`, `:224`). An empty result (`^only`) is caught by `contentRoundTripProblem` and logged. `local_base` keeps the parsed description (`Call Bob ^blk-1`) and `remote_base` is the acked item (`:259`), so `fields.logic.ts:240-266, 339` sees no change on either side: the next cycle is quiet. Tests: `create.logic.test.ts:239-245, 389-393` (a mid-line `^abc` stays put) and `sync-now.service.test.ts:1568-1582` (end-to-end, line ends `🆔 td-… ^blk-1`, Todoist gets `Call Bob`, one task, link acked, next cycle "nothing new"). |
| 2 | minor | resolved | `sync-now.service.ts:311` drops `creates.log` on automatic cycles. `creates.log` only ever holds `create-skipped` entries (`create.logic.ts:161, 168`); `anchor-conflict` at `:330` belongs to `pairPendingAdds`, whose log (`adoption.log`) is still written on every cycle, and the `stale` entries of `writeBatches` go into the same array afterwards, unaffected. Test `sync-now.service.test.ts:1556-1566`: two auto cycles log nothing, the next manual cycle logs the entry. Keeping the `stale` create entry as is holds: it needs the line to change between scan and write. |
| 3 | nit | rejection stands | A follow-up framed by the reviewer (new logging for orphan anchors), not one of the Issue's criteria. For the main session to file. |
| 4 | nit | rejection stands | Changing `planDetach` for unacknowledged pending adds changes the detach and line-brake behavior; it belongs in its own Issue. For the main session to file. |

## Acceptance criteria re-checked

- [met] Anchor first (rule 2): write `🆔 td-<8 base36>` through the writer, insert the link row with `todoist_id` NULL and `pending_uuid`, then send `item_add` (that uuid, a temp_id, `autoParseLabels: false`, description ending with the line `kokobrain:td-<value>`). Labels: the line's tags, plus `personal` when `syncContext` is `'personal'`; nothing extra in a `'work'` vault (the owner's webhook adds `Work`); never `defaultLabel` (design rule 8b). On ack store the Todoist id. — The fix changes only where the anchor goes on a block-id line and the `content` arg; order, uuid, temp_id, description, labels and ack are untouched. The existing command-shape test and the new block-id test (`sync-now.service.test.ts:1568`, link `todoistId` equals the created item id) pass.
- [met] Content over 500 characters or with a newline is not created; logged. — Length and `contentRoundTripProblem` now run on the block-id-stripped content (`create.logic.ts:165-169`); still logged as `create-skipped`, on manual cycles (the cycle that shows the user the result). `create.logic.test.ts:182` and `sync-now.service.test.ts:1536` pass.
- [met] Gate: frontend. — `pnpm check`: exit 0, 0 errors, 0 warnings. `pnpm vitest run src/tests/lib/features/todoist-sync/`: exit 0, 24 files, 605 tests. No `src-tauri/` change in the fix. The full suite is deliver's to run.

## Findings

1. nit — `src/lib/features/todoist-sync/fields.logic.ts:339-351` (Issue 09 code, unchanged). The create now strips a trailing block id, but a later brain edit of such a line pushes `fields.description` with the ` ^id` to Todoist, and a Todoist content change is pulled as a description patch whose handling of the block id was not checked. The fix report names this. Fix: in a follow-up, strip a trailing block id from the pushed and compared description the same way, and keep it on the pulled line; add a test for each direction.

## Other checks

- No test was weakened or deleted: the fix diff only adds tests.
- No scope creep: the changes are limited to the two findings. `layer-baseline.json`, `BASELINE_SIZE` and the composition roots are untouched.
- Worktree clean before this file was written.
