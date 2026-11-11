# 08 discovery: Todoist edits reach the note

No `spec.md`; design is `research/design.md` rules 3, 4, 7, 8. Builds on 07 (`work/07/`): same fakes, same `syncNow` cycle, same `LineChange` write path. Only what differs is listed.

## Files

- `task-line.logic.ts:298-315` `replaceDescription`: a tag, link or unmapped signifier blocks only when strictly between the first and last word (owner decision, rule 4). Tests in `task-line.logic.test.ts:343-360` flip for the leading cases.
- `pull.logic.ts:288-315` `pulledTask`: `🔁` text left out when `due.string` has a signifier or `#` (`recurrenceProblem`); `planPull` (:437-450) logs it. Export `PRIORITY_EMOJI`.
- `completion.logic.ts:173`: drop the close only when `item.due?.isRecurring`. `LineChange` (:33-44) gains `description`, `priority`, `addTags`, `removeTags`; `applyLineChange` (:314) applies the description first (the plan checked it on the same text), then status, due, priority, tags.
- New `fields.logic.ts` (pure): `planFields` per link, after `planCompletion`, merged into its plan.
- `sync-now.service.ts:169-177`: call `planFields` on the links as completion left them; merge line changes and links per anchor.
- `research/design.md` rule 6: "drop the pending close" only for a recurring task.
- Fake vault `metadataOf`: description strips tags and signifiers like Rust `parse_task_metadata` (a leading `#todoist` is not description).

## Plan (`planFields`, per link: one line with parsed fields, item seen in the tree, not deleted, both bases set, no command planned this cycle)

- content: `item.content !== remote_base.content`. Round-trip problem -> not written, logged, base moves with `contentProblem`. Else `replaceDescription(line, content)`; conflict -> line kept, logged with the Todoist text, remote base moves. Local description also changed: equal -> bases only; else Todoist wins, brain value logged.
- due: date part of `item.due` vs `remote_base.due`; written with `setDueDate` (null removes). A due with the same date only moves `remote_base.due` (time stays there). Not `YYYY-MM-DD` -> logged, line kept.
- priority: `item.priority !== remote_base.priority`; nothing written when `mapPriorityToTodoist(line priority)` already equals it (so `low`/`lowest` stay on 1), else the emoji of `mapPriorityFromTodoist` (null removes).
- labels: mapped = tag-name labels not excluded (`excludedLabels`), compared lower-cased. Added mapped labels missing from the line -> `addTag`; removed ones on the line -> `removeTag`. `remote_base.labels`/`unmappedLabels` always move; `local_base.tags` gets the same adds/removes (a local tag edit stays visible to Issue 09).
- Both bases move per field written; untouched fields keep their base.

## Defaults taken

- A content conflict moves `remote_base.content`, so it is logged once, not every cycle (the brain line keeps its text).
- Links with a close/reopen planned this cycle get no field sync; the next cycle does it (the ack rewrite would otherwise go stale).
- A line with no parsed fields (unsaved tab edit) is skipped until saved.
- A checked item still gets field changes (Todoist wins).

## Risks

- Issue 13 edits `sync-now.service.ts` in parallel: merge conflict likely.
- Fake metadata is an approximation of Rust; the description change may move other tests' expectations.
