# Todoist API live check (2026-11-09)

Ticket 01's runbook, run against the owner's account through `/api/v1/sync` (form-encoded), in three throwaway projects (`kokobrain-sync-test`, `-2`, `-3`), each deleted at the end. Ids below are from those deleted projects.

## Answers

| # | Question | Answer |
|---|---|---|
| 5 | Incremental sync after `item_close` (non-recurring) | Item arrives with `checked: true`, `completed_at` set, `due` as before (null in the test). |
| 5 | Incremental sync after `item_delete` | Item arrives with `is_deleted: true`, `content: ""`, `labels: []`. |
| 5 | Incremental sync after `item_update` content | Item arrives with the new content. |
| 5b | Full sync (`sync_token=*`) after completion | Completed and deleted items are absent. |
| 6 | Incremental after `item_uncomplete` | Item arrives with `checked: false`, `completed_at: null`. |
| R | `item_close` on `every day` (due today) | Rolls forward: `checked: false`, `due.date` next day, `is_recurring: true`. |
| R | `item_close` on a rule with `starting <date>` (future `every week starting 16 Nov 2026`, and past `every week starting 2 Nov 2026`) | Completes for good: `checked: true`, `completed_at` set, `due: null`. |
| R | `item_update_date_complete` (`is_forward: 1`) on `every day` | Rolls forward like `item_close`. |
| R | `item_update_date_complete` on a `starting <date>` rule | Bad: `due` becomes null, task stays open. |
| R | `item_add` with `due: {date: "2026-11-16", string: "every week", lang: "en"}` | Recurring with that first date; `item_close` rolls to 2026-11-23. |
| 7 | `item_update` with only `due.date` on a recurring task | Recurrence lost: `is_recurring: false`, `string` becomes the date. |
| 7 | `item_update` with `due: {date, string: <original>, lang}` | Recurrence kept, date moved. |
| 2 | `item_add` with an unknown label name | The task carries the label; no personal label resource is created (the labels list does not show it). |
| 8 | Same `item_add` (same uuid and temp_id) sent twice | One task only; the replay answers `ok` and returns the same `temp_id_mapping`. |

## Account-specific finding

Every task created through the API got the personal label `Work`, even with `labels: []` in `item_add`. `Work` exists as a personal label in the account. Something on the owner's account adds it (an automation or a setting outside the API); the API call itself did not. Owner to confirm where it comes from.

## Consequences for the design

- Completion: `item_close` is right for non-recurring and for plain recurring rules. A rule containing `starting` ends on close; the brain never creates such rules, and a Todoist-made one is closed the same way Todoist's API does it (logged).
- Creation of recurring tasks: send `due: {date: <📅>, string: <🔁 text>, lang: "en"}`, never `"<rule> starting <date>"`. Without a `📅`, send `due: {string: <🔁 text>}`.
- Due edits on recurring tasks: always `{date, string, lang}` from `remote_base`.
- Deletion and completion are distinguishable in incremental sync (`is_deleted` vs `checked`); absence never means either.
- uuid replay is safe and returns the mapping again, so a lost `item_add` response can be resolved by resending the same command.
