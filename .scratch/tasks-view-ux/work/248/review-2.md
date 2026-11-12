VERDICT: APPROVED

Re-review, round 2, of `git diff d6b70bcf7..HEAD` (831ebcc08, bd0e91849, e0d0e47fa) against `.scratch/tasks-view-ux/work/248/review.md` and `.scratch/tasks-view-ux/issues/248-todoist-tags-follow-the-new-task-tag-rule.md`.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | blocker | resolved | `fields.logic.ts:394-399`: the push-half label list now also keeps every Todoist label with `!has(local.tags, l)`. On that branch `tagsChanged` is false, so `local.tags` equals `localBase.tags` (the pull-half `else` at `:335` adds and removes nothing when `added`/`removed` are empty). A label leaves Todoist only when the brain knew it as a tag and the line dropped it. `has` is case-insensitive (`:434`), so a casing difference does not leak a removal. Every `LocalBase` writer records line tags (`create.logic.ts:191` from `line.fields`, `completion.logic.ts:131` from the line, `fields.logic.ts:327,335,391,401`), so a normal brain-side removal still has the tag in `local.tags` and still pushes. Test `fields.logic.test.ts:494-501` covers a tag add and a remove-all with a 4.4.0-style base. Red check: with `d6b70bcf7`'s `fields.logic.ts` restored temporarily, the test fails (`expected [deep, Work, next] to deeply equal [deep, Work, café, next]`); file restored, worktree clean. The fix step's reason for not taking "`before` minus `unmappedLabels`" holds: the pull half is gated on `!sameList(item.labels, remoteBase.labels)` (`:318`), so for an untouched Todoist task the tag would never reach the line while `tagsChanged` stayed true and blocked every later push at `:387`. |
| 2 | minor | resolved | `task-line.logic.ts:239-244` documents the signifier-glued gap; `task-line.logic.test.ts:334-337` pins `removeTag` keeping `🔺#shop` and `addTag` adding a second `#shop`. |
| 3 | minor | rejection stands | Deferred to the main session, as the first review rated it out of scope and pre-existing. The fix step's reason for not numbering an Issue on the branch (numbers are given out on main) holds. The suggested follow-up is recorded in the Resolution of `review.md`; the main session should file it. |
| 4 | nit | resolved | `task-line.logic.test.ts:223-225` now says why the `file #work/ now` case leaves out Rust's `file / now` description. |

## Acceptance criteria re-checked

- [met] Failing test first, `src/tests/lib/features/todoist-sync/pull.logic.test.ts` (or the closest existing pull test) with the sync's existing fakes: a Todoist task carrying the label `2026` and the label `work`; after one pull and one push cycle the line holds `#work` and no `#2026`, the Todoist task keeps both labels, and the pushed content has no `#2026`. Fails today (the label is written, then removed, and `#2026` is pushed as content). — the fixes do not touch `sync-now.service.test.ts:814-853`; it still passes in the targeted run below, and the new `!has(local.tags, l)` term can only keep more labels, never fewer.
- [met] `task-line.logic.test.ts`: `isTaskTagName` accepts `work`, `über`, `_x`, `a/b`, `a-b` and rejects `2026`, `-x`, `` (empty); `tagMatches` finds `#work` at the start and after a space, and not in `word#work`, `(#work)` or `[[note#work]]`. Existing cases that pinned the old rule (`(#tag)` and `word#tag` counting) change on purpose, and the commit says so. — the fixes only add a test (`:334-337`) and a JSDoc line; no existing case was removed or weakened (`git diff d6b70bcf7..HEAD` on the file has only additions plus the rewritten JSDoc line).
- [met] A parity test feeds the same inputs to `isTaskTagName` and to the cases the Rust parser pins (copy them from the Rust tests Issue 075 added; do not invent expectations). — `RUST_TAG_CASES` entries are unchanged; only its JSDoc changed (`:223-225`), and the table passes.

## Findings

None open or new.

## Checks run (re-reviewer)

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/todoist-sync/ src/tests/lib/architecture/pure-logic.test.ts src/tests/lib/utils/tag-extraction.test.ts`: exit 0, 29 files, 839 passed.
- Red check of the finding 1 test against the pre-fix `fields.logic.ts`: 1 failed, as expected.
- The full suite is deliver's to run. No scope creep: the fixes touch only `fields.logic.ts`, `task-line.logic.ts` (JSDoc), their tests and the review file. The layer baseline and composition roots are unchanged.

## Notes for delivery

- With the finding 1 fix, a label a 4.4.0 link stored as unmapped (`café`, `über`, `area/home`) stays in Todoist but is never written to the line, until Todoist itself changes that task's labels. No label is lost; say this in the delivery note.
- Finding 3's follow-up (align `INLINE_TAG_NAME_SOURCE` with Rust `is_alphabetic()`, or skip instead of throwing at `completion.logic.ts:342`) still needs an Issue filed on main.
