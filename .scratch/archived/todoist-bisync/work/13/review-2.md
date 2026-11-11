VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | major | resolved | Accepted as an owner decision, as the review proposed: the brake stays as built (`sync-now.service.ts:182` unchanged) and `.scratch/todoist-bisync/issues/16-line-brake-recovery.md` (needs-triage, Blocked by 13) records the stall, the options from the review and a criterion that the recovery must not weaken the brake for automatic cycles. |
| 2 | minor | resolved | `detach.logic.ts:41-54` `isLiveOutsideTree` walks the item's project up its parents: returns false on any tree id, a cycle, an unknown id, or a deleted/archived project, true only when a live chain ends at a top-level project outside the tree. This matches `treeProjectIds` (sync-scope.logic.ts), which leaves out archived/deleted projects and everything under them. The service passes the full pull's `projects` (`sync-now.service.ts:194`). Tests at `detach.logic.test.ts:94-120` cover unknown, archived, under-archived, deleted (all kept) and a live nested project outside the tree (detached); the existing move-to-`personal` and Inbox-excluded tests still pass, since `personal` and the Inbox are live top-level projects in those fixtures. |
| 3 | minor | resolved | Issue 10 gains the criterion "A line whose anchor already has a link row, detached ones (`isDetached`, Issue 13) included, is never sent as `item_add` ... With a test." |
| 4 | nit | resolved | `sync-scheduler.logic.ts:69` reads `const pad2 = (n: number)`; `git diff main...HEAD` no longer touches that line. |

## Acceptance criteria re-checked

- [met] Tree change (design rule 8c): a linked task moved in Todoist to a project outside the vault's tree (or to the Inbox when the vault does not include it) is detached the same way, line kept, logged. — `detach.logic.ts:84` detaches when the item's project is live and outside the tree; `detach.logic.test.ts` "detaches a link whose item moved under a live project outside the tree" and the unchanged `sync-now.service.test.ts` move-to-`personal` / Inbox-excluded / Inbox-included / within-tree cases pass. Unknown or archived destinations now keep the link, consistent with Issue 11.
- [met] Gate: frontend. — `pnpm check`: exit 0, 229 files, 0 errors, 0 warnings. `pnpm vitest run src/tests/lib/features/todoist-sync/`: exit 0, 22 files, 459 tests (3 more than round 1, none removed). The full suite is deliver's to run.

## Findings

None open or new.

## Checks run by the re-reviewer

- Fix diff `f760a57d8..HEAD` (commit c8be5d24c): `detach.logic.ts`, `sync-now.service.ts` (one argument), `sync-scheduler.logic.ts` (spacing), `detach.logic.test.ts` (3 tests added, fixture helper `input` gained a defaulted `projects` argument; no test weakened or deleted), plus Issues 10 and 16 under `.scratch`.
- No change under `src-tauri/` or `src/tests/lib/architecture/`; no baseline entry or composition root added.
- Note, not a finding: a task moved into a project created between the full and the incremental pull is kept this cycle and detached on the next, when the full pull knows the project. That delay is the intended safe side.
