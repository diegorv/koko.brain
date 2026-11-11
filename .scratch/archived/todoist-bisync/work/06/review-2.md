VERDICT: APPROVED

# Re-review (round 2): Issue 06, "Todoist: Sync now" pulls projects and open tasks

Reviewed the fix commit `git diff f0436962e..HEAD` (d43c54245) against review.md and its "## Resolution".

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved (partly, rest is an owner call) | `planPull` counts unpaired anchors in `linesUnmatched` (`pull.logic.ts:404`), `formatPullResult` appends the explanation only when nothing paired and lines stay unmatched (`pull.logic.ts:479-483`). Tests: `pull.logic.test.ts` "says why new tasks stay out...", `sync-now.service.test.ts` "says why nothing comes in when a rebuild pairs no line". How rebuild mode ends is recorded in Issue 07's Notes. |
| 2 | minor | resolved | `anyStale` gates the `sync_token` kv (`sync-now.service.ts:111, 126, 138`). Test "keeps the sync token out of the commit when an insert went stale" asserts `commits[1].kv` is `[]`, no `td-w3` link and a `stale` log entry; it would fail if the token were still committed. |
| 3 | minor | resolved (recorded) | Issue 07 Notes now define null `local_base`: fill from the line on the first cycle, no push. No code change needed in this pull-only Issue. |
| 4 | minor | resolved | Test "stops after the first note when the vault switches between writes" switches after `create_note`, asserts one write on the first vault, none on the second, and no commit on either. |
| 5 | minor | resolved | `normalizeSyncFolder` filters empty and `.` segments (`pull.logic.ts:197-201`). Tests for `./Todoist`, `Areas//./Todoist`, `.`. See new finding 1 for a side effect on trailing backslashes. |
| 6 | nit | rejection stands | Refusing a leading `/` is the safer reading (the original review said so); left for the owner. |
| 7 | nit | resolved | `treeOrder` (`pull.logic.ts:416-432`) emits each parent then its subtasks, siblings by `childOrder`; an item whose parent is filtered out counts as a root. Test "writes each subtask after its parent...". |
| 8 | nit | resolved | `todoist-sync.store.svelte.ts:1` imports `./pull.logic.js`. |
| 9 | nit | resolved | JSDoc on every field of `PullItem`, `PullDue`, `LocalBase`, `RemoteBase` and the new `PullPlan`/`PullCounts` fields. |

## Acceptance criteria re-checked

- [met] `syncFolder` is normalized before use (trimmed, surrounding slashes removed) and a value that is absolute or contains `..` is refused with a toast (deferred from Issue 05's review, finding 3). — `normalizeSyncFolder` trims, drops empty/`.` segments (so trailing and doubled `/` go), refuses absolute and `..`; tests in `pull.logic.test.ts` `normalizeSyncFolder` block pass. Leading `/` refused, as in round 1 (finding 6).
- [met] Inserted at the end of the project note (sections come in ticket 12) through the writer from 04. Bases (`local_base`, `remote_base`) and the `sync_token` committed together. — Unchanged write path; the token is now withheld only when an insert went stale, so a committed token never skips an unlinked item. Tests pass.
- [met] Rebuild mode (rule 1): empty link table with anchored lines or remote items present -> pair by `td-<todoist id>` (and by a description `kokobrain:` line, see ticket 10), create nothing, log unmatched. — Logic unchanged apart from the `linesUnmatched` counter; rebuild tests in both files pass, including the new zero-pair case.
- [met] Safety (rule 9): refuses before the index is ready; captures the vault path at start and rechecks it before every write; a vault switch mid-cycle writes nothing to the new vault. — New test covers a switch between writes; passes.
- [met] Gate: frontend, or Both if IPC changes. — No `src-tauri/` change. `pnpm check` exit 0 (227 files, 0 errors, 0 warnings); targeted vitest exit 0. The full suite is deliver's to run.

## Findings

1. nit — `src/lib/features/todoist-sync/pull.logic.ts:199`: the new segment filter splits only on `/`, and the old `replace(/[/\\]+$/u, '')` is gone, so a trailing backslash is no longer removed: `Todoist\` now yields `Todoist\` (a folder literally named `Todoist\` on macOS) where round 1 yielded `Todoist`. No test covered it before or now. Fix: split on `/[/\\]/u` when filtering segments (joining with `/`), or keep stripping trailing `[/\\]+`, and add a case.

No regressions found otherwise: no test was weakened or deleted (the `formatPullResult` and `planPull` equality tests only gained the `linesUnmatched` field), no scope creep (Issue 07's Notes are workflow records), `layer-baseline.json`, `BASELINE_SIZE` and the composition roots are unchanged.

## Checks run

- `pnpm check`: exit 0.
- `pnpm vitest run src/tests/lib/features/todoist-sync src/tests/lib/app/commands.todoist.test.ts`: exit 0, 16 files, 297 tests.
