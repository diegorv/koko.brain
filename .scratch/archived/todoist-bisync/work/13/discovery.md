# 13 discovery: a task deleted on either side is detached

No `spec.md`; design is `research/design.md` rule 9, rule 8c and Deletion. Builds on 07 (`work/07/`): same fakes (`todoist-sync.fake.ts` already has `updateItem(id, { is_deleted | project_id })`), same `syncNow` cycle. Only what differs is listed.

## Files

- New `detach.logic.ts` (pure): `DETACH_AFTER_MISSES = 3`, `isDetached(link)`, `belowLineBrake(links, occurrences)`, `planDetach({ links, occurrences, items, treeIds })`.
- `sync-now.service.ts:155-189`: brake right after `scanVault` (before any write, dialog or push); `planDetach` on the links after `planPull`'s frozen updates; `planCompletion` gets only non-detached links; detach cap (10) next to the close/reopen cap; detach links go into the commit before completion's (which spread from them, so a reset `missCount` is kept). `SyncFailure` gains `lines-missing`; `SyncNowOutcome` gains `skippedDetaches`.
- `pull.logic.ts`: unchanged after all (a detached link's frozen flag flipping is harmless).
- `sync-scheduler.logic.ts`: `lines-missing` failure kind + message; `autoSyncDetachCapMessage`. `sync-scheduler.service.ts:214-235`: a second over-cap toast id for skipped detaches.

## Plan

- Detached = the link row is kept with `missCount >= 3` and `pendingCmd` cleared. No schema change: the column exists and its doc ("consecutive cycles the line or item was not observed") still holds; a deleted or out-of-tree item jumps straight to 3. Keeping the row (instead of deleting it) is what stops the pull from inserting the still-open Todoist task again after a vault-side detach (`linkedIds`, pull.logic.ts:385), keeps a table of only tombstones out of rebuild mode, and holds the anchor so it is never sent as a create.
- Per link not detached, with a `todoistId`: item in this cycle's items with `isDeleted` -> detach (`deleted`); item seen in a project outside `treeIds` -> detach (`moved out`); no line in the scan -> `missCount + 1`, detach at 3 (`missing`); line present and `missCount > 0` -> reset to 0. An item absent from the pull (full or incremental) never counts. Each detach logs `kind: 'detach'`; the line and the Todoist task are left as they are.
- Brake: active = non-detached links; seen = active links with >= 1 occurrence; `active > 0 && seen * 2 < active` -> `SyncStop` with a fixed message (manual: error toast via `syncNowFromUi`; auto: persistent failure toast). No miss is counted in an aborted cycle.
- Cap: over 10 detaches, manual asks (Cancel aborts, nothing written); auto drops the detaching links from the plan (left as stored, so the next cycle plans them again) and reports `skippedDetaches`. That cycle commits no `sync_token`: a deletion is reported only by an incremental pull (the full sync leaves deleted items out), so a moved token would lose it.

## Prior-art tests

- `sync-now.service.test.ts` "close/reopen cap" (ask / auto skip), "completion" (`edit`, `commandRequests`); `sync-scheduler.service.test.ts` "over the close/reopen cap"; `completion.logic.test.ts` for the pure planner shape.

## Defaults taken

- A detached link stays detached when the item later moves back into the tree or the line reappears (adoption would duplicate the anchor).
- Links with `todoistId` null (Issue 10's pending adds) are left out of miss counting and remote checks.
- The cycle result message has no detach count (the log has them); keeps `PullCounts` unchanged.

## Risks

- The brake as written also stops a vault whose only one or two synced lines were deleted (1 active, 0 seen): every cycle aborts until a line is restored. Owner call whether a floor is wanted.
- Issue 08 edits `sync-now.service.ts` and `pull.logic.ts` in parallel: merge conflicts likely.
