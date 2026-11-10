# 09 discovery: note edits reach Todoist

No `spec.md`; design is `research/design.md` rules 3, 7, 8, 9, 13. Builds on 08 (`work/08/`): same `planFields`, same fakes (the fake `/sync` already applies `item_update`). Only what differs is listed.

## Files

- `fields.logic.ts:71-191` `planFields`/`planLink`: after the remote half, a local half per field (line fields vs `local_base`, in Todoist terms) plans one `item_update` per link. Returns `FieldsPlan` = `CompletionPlan` + `pushes` + `withholdToken`. `FieldsInput` gains `newUuid`.
- `fields.logic.ts:163-188`: priority conflict compared in Todoist terms; labels both-sides change -> Todoist wins (line set to Todoist's mapped tags, brain tags logged); a mid-sentence description conflict takes the line's description into `local_base` so the brain edit is not pushed over Todoist's later.
- `sync-now.service.ts:232-292`: field cap (50) after `planFields`, ask / auto-skip like the close/reopen cap; `pushFields` after `pushCompletions`: batches of 100, `ok` -> bases move to what was sent, terminal 4xx -> `local_base` takes the line (not retried), logged; other failures change nothing (replanned next cycle). Token withheld on `withholdToken` (Issue 08 finding). `SyncNowOutcome.skippedFieldPushes`.
- `sync-scheduler.service.ts:224` + `sync-scheduler.logic.ts:60`: third cap toast.

## Plan (per link planFields already visits; a field Todoist changed this cycle is never pushed)

- content: `fields.description !== local.description`; equal to remote -> bases only; >500 code points (which unit Todoist counts is unverified) or failing the round trip -> logged once via `local_base.unpushedDescription`; `local_base.description` keeps its value, so the line's other fields still push; else push.
- due: `fields.dueDate !== local.dueDate`; equal to the remote day -> bases only; push `{date: day + remote time part, timezone?}`, recurring `{date, string: remote string, lang}`; removal `null`, except a recurring task (logged, not pushed: a date-less push drops or re-derives the rule).
- priority: `mapPriorityToTodoist(line)` vs `mapPriorityToTodoist(local_base)`; `🔽`/`⏬` never push.
- labels: case-insensitive sets of mappable tags (excluded labels dropped); sent list = `unmapped_labels` + excluded labels the task carries + line tags (Todoist's casing kept).
- A link whose content is flagged (`remote_base.contentProblem` or a `local_base.description` that fails the round trip) gets no push at all.
- After `ok`: `local_base` = line values, `remote_base` = sent values, so the echo in the next incremental pull is no remote change (a due echo with Todoist's own `string` only moves `remote_base.due`).

## Tests to copy

- `fields.logic.test.ts` helpers (`input`, `line`, `link`); `sync-now.service.test.ts` "edits from Todoist" and "close/reopen cap" blocks (`edit`, `commandRequests`, `checkMany`).

## Defaults taken

- The cap counts `item_update` commands (one per task), not fields.
- No `pending_cmd` for field pushes: a lost response is resolved next cycle (Todoist already holds the brain value, so the remote half only moves the bases).
- Field pushes count in "N tasks updated in Todoist".

## Risks

- Labels both-sides rule changes 08's merge behaviour; 08 tests may move.
