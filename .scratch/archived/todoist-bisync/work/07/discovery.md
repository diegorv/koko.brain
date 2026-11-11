# 07 discovery: completion syncs both ways, recurring included

No `spec.md`; design is `research/design.md` rules 3, 5, 6, 7, 9, 10, 13 and `research/live-check.md`. Builds on 06 (`work/06/`): same fakes, same `syncNow` cycle. Only what differs is listed.

## Files

- `pull.logic.ts` hardening: `pulledTask` (:260-284) due string CR/LF -> space, `due.date` checked against `^\d{4}-\d{2}-\d{2}` (else no due, logged); `planPull` (:359-398) skips content with a signifier (`contentProblem === 'signifier'`) and any line whose `readAnchor` is not `td-<id>`, logged; inserted lines with `\r`/`\n` throw; `kokobrainAnchor` (:241) only `kokobrain:td-[0-9a-z]{8}`; rebuild tries `td-<id>` before the description anchor; an anchor claimed by 2+ unlinked items pairs none, all logged. `ScannedLine` gains `status` (the status char) and `fields` (from Rust `TaskMetadata`, or null); `extractTaskLines` also returns `status`.
- `vault-scan.service.ts:39-48`: status char from `Task.status`, metadata from the index (tab lines take the index task with the same anchor).
- `task-line.logic.ts:164`: export `taskLineStatus`, `isClosedStatus`, `nextStatusChar` (what `setTaskStatus` writes) for the bases.
- New `completion.logic.ts` (pure): `isClosedStatus`, `planCompletion` (per link: line patches, base moves, pushes, log) and `planAck` (after an `ok`).
- `sync-now.service.ts`: after the full pull, an incremental `items` pull from the stored token (closed items are absent from a full sync, live-check 5b); completion line writes after the inserts; pending commands committed with the token; one command request per 100; on `ok` an incremental pull and the line rewrite; cap check with `ask` (`@tauri-apps/plugin-dialog`) before any write.
- `PullCounts` + `formatPullResult`: `todoistUpdated` (commands acked) and `linesUpdated`.
- Fakes: `todoist-sync.fake.ts` `item_close` rolls a recurring item (`every day` +1, `every week` +7; a `starting` rule completes for good with `due: null`, live-check R) and `refuseCommandsFor` (400 status); `todoist-vault.fake.ts` maps every status char and parses `📅`, priority and tags into metadata.

## Plan (per link: one line, item observed, not deleted, remote base set)

- local = closed(line.status) vs closed(local_base.status); remote = item.checked vs remote_base.checked; dueMoved = item.due.date vs remote_base.due.date.
- Both changed: agree -> bases only; else Todoist wins (status written, brain value logged). Remote only: write status (+ new `📅` for a recurring roll). Local close: dueMoved -> close dropped, line gets Todoist's state and `📅`, logged; else `item_close`. Local reopen: `item_uncomplete`. No change but a recurring item open with a moved due: write `📅`.
- Bases move per field (status, dueDate / checked, due) so later Issues still see other remote changes.
- Pending: same command type reuses the stored uuid; otherwise cleared (logged when dropped).
- Ack: incremental pull from the cycle's token; line rewritten from the item; a stale rewrite clears `pending_cmd` only and the next cycle reconciles. A 4xx (not 429) status: terminal, pending cleared, local status taken as base, logged. Network failure: pending kept, run fails.

## Defaults taken

- Null `local_base`: filled from the line (index metadata + status char), no push that cycle; no metadata (a line only in an unsaved tab) -> left null.
- The token after the command step is not stored: the next incremental pull repeats our echo, which matches the bases.
- Any stale completion write keeps the token out, as for stale inserts.
- Cap ask only in `syncNow` (manual); "No" aborts before any write. Automatic cycles are Issue 14's.
- Linked lines sync completion wherever they sit (scope (b) is for creation, Issue 10).
- Rebuild mode end (owner call) not touched.

## Risks

- Issue 14 edits `sync-now.service.ts` in parallel: merge conflict likely.
- `readNoteContent` reads disk for closed notes; tests feed plugin-fs `readTextFile` from the fake vault.
