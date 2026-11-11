# 17 discovery: block ids, orphan anchors and dropped pending adds

No `spec.md`; design is `research/design.md` (Anchor, rules 4, 9). Same fakes and `syncNow` cycle as 09, 10 and 13 (`work/09/`, `work/10/`, `work/13/`); only what differs is listed.

## Files

- `task-line.logic.ts:298-311` `replaceDescription`: a trailing block id (`^id` as the last token, only whitespace after) is left out of the word span, so a Todoist content edit keeps it last. Today `Call Bob 🆔 td-x ^abc` is a mid-sentence conflict (the `🆔` sits between `Bob` and the `^abc` word). Also fixes the apply in `completion.logic.ts:335`, which calls the same function.
- `fields.logic.ts:215-394` `planLink`: when the line text ends with a block id, the description is compared and pushed without it (` ^abc` stripped from the end of `fields.description` and of `localBase.description`). Only a block id that ends the line counts (`live-preview/parsers/block-reference.ts`), so `Call ^abc 🆔 td-x` still pushes `Call ^abc`. `local_base` from Issue 10's creates keeps `Call Bob ^abc` raw (`create.logic.ts:191`); stripping both sides keeps such a link quiet without a migration.
- `create.logic.ts`: new `orphanAnchorLog(occurrences, owned, items)`, pure: one `orphan-anchor` entry per brain-born anchor (`td-` + 8 base36, as `kokobrainAnchor`) in the scan with no link row and no item naming it in its `kokobrain:` line. `sync-now.service.ts:449-458`: added to the log in normal mode on manual cycles only (rebuild already logs `unmatched`, `pull.logic.ts:537-543`), owned = `current` keys plus `plan.pairedLinks`.
- `detach.logic.ts:83-104` `planDetach`: the `todoistId === null` skip goes; a pending add has no item and no `remote_base`, so only the miss path applies (out-of-scope never lists it, `sections.logic.ts:271`). The detach clears `pending_cmd`, and `pendingAddOf` (`create.logic.ts:135`) already skips detached links, so it is never resent or paired; `belowLineBrake` already drops detached links.

## Plan (test-first, one commit each)

1. Block id: `replaceDescription` unit test, `planFields` unit tests (push without block id, pull keeps it last, rerun empty), `syncNow` test (brain edit and Todoist edit, next cycle "nothing new").
2. Pending add: update `detach.logic.test.ts:172` (it asserted the old skip), add miss counting for a pending add and the brake after detach; `syncNow` test: add offline, delete line, 3 cycles -> detached, logged, no `item_add` ever reaches Todoist.
3. Orphan anchor: `create.logic.test.ts` for `orphanAnchorLog`; `syncNow` test: `td-zzzzzzzz` line logged on manual, not on auto.

## Prior-art tests

- `sync-now.service.test.ts`: "edits from Todoist" / "edits from the brain" (quiet rerun), "a synced line deleted in the vault" (miss counts), "a create whose response is lost" (offline fetch), "logs skipped lines only on a manual cycle".
- `fields.logic.test.ts` `brainEdit`, `rerun`, `written`; `detach.logic.test.ts` `link`, `seen`.

## Defaults taken

- Orphan message: "<path>:<line>: the line's 🆔 <anchor> has no sync link and no Todoist task, so it does not sync; remove its 🆔 to create it in Todoist, or run a rebuild". Logged every manual cycle while the orphan stays (as `create-skipped`).
- A Todoist-born orphan (`td-<id>` with no link) is out of scope: the pull pairs it when the item exists.
- `create.logic.ts` keeps storing the raw description in `local_base` (its test asserts it).

## Risks

- `replaceDescription` changes for every caller: a line whose last word is `^word` keeps it. That is the block-id rule everywhere in the app.
