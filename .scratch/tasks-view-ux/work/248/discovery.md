# 248 discovery: Todoist tags follow the new task tag rule

Follows `work/075` (Rust `scan_inline_tags`, `parsing.rs:456`; TS mirror `findInlineTags`, `src/lib/utils/tag-extraction.ts:119`).

## Files that change

- `src/lib/features/todoist-sync/task-line.logic.ts`
  - `:41-45` `TAG_NAME` (old ASCII rule) goes.
  - `:222-224` `isTaskTagName(name)`: true when `findInlineTags('#' + name)` yields exactly one tag equal to `name` spanning the whole string. Rejects `2026`, `-x`, ``, `work/` (Rust reads `work`), `a b`.
  - `:226-237` `tagMatches(text, tag)`: `findInlineTags(text)` filtered by lower-cased name and by the link spans (`LINK_SOURCE`, kept). Spans are `[from, to)` (trailing `/` excluded, as Rust). `removeMatches` takes `{index, length}`-like spans, so it gets a small span type instead of `RegExpExecArray`.
  - `:76` `TOKEN_RE` tag group (mid-sentence rule of `replaceDescription`) uses the same rule: `(?<!\S)#` + the name source exported from `tag-extraction.ts`, so `#2026`, `word#tag`, `(#tag)` become words, as Rust keeps them in the description.
  - Comments naming the gone Rust `TASK_TAG_RE` (`:7-8`, `:42`, `:228`, `removeSpan`'s `milk#shop` example) updated.
- `src/lib/utils/tag-extraction.ts:2`: export the tag name pattern source (`INLINE_TAG_NAME_SOURCE`) and build `INLINE_TAG_REGEX` from it. One regex source, no third copy.
- `src/tests/fixtures/todoist-vault.fake.ts:81-103`: the fake parser reads tags with `findInlineTags` on the signifier-stripped text and cuts their spans, as Rust `parse_task_metadata` (`parsing.rs:1938-1952`). Without this the fake hides the loop.
- `help/documentation/10-tasks-and-todoist.md:127` and `help/documentation/29-todoist-sync.md:252` (the latter states the old ASCII rule and is now wrong).
- `pull.logic.ts` needs no change: `mappedLabels` (`:326`) calls `isTaskTagName`; unmapped labels already stay in Todoist (`fields.logic.ts:394`).

## Tests

- First, failing: `src/tests/lib/features/todoist-sync/sync-now.service.test.ts` (the pull+push cycle over the fake vault and fake Todoist; `pull.logic.test.ts` is pure and has no cycle). A task with labels `2026`, `deep`: after the first cycle the line holds `#deep`, no `#2026`; the second cycle sends no command, the Todoist task keeps both labels, no pushed content holds `#2026`. Plus a linked task whose labels gain `2026`: line unchanged, label kept.
- `task-line.logic.test.ts`: `isTaskTagName` and `addTag`/`removeTag` cases from the Issue; old `(#shop)` / `milk#shop` cases flipped on purpose; `replaceDescription` with `#2026` mid-text.
- Parity: `task-line.logic.test.ts` table copied from the Rust tests of 075 (`parsing.rs:3360-3395`, `scan_inline_tags_*`): each tag Rust reads passes `isTaskTagName` and is found by `removeTag`; each other `#name` in those texts is rejected or not found.
- `pull.logic.test.ts`: `pulledTask` leaves `2026` unmapped and maps `über`.

## Defaults taken

- The Issue's example label `work` is an always-excluded context label (`pull.logic.ts:234`, documented in `29-todoist-sync.md`), so it is never written as `#work` under any tag rule. The cycle test uses `deep` (the seed's mapped label) for the valid label. Same intent, no change to the exclusion list.
- Case-insensitive compare by `toLowerCase()` on both sides (old: regex `i` flag).
- Links still skipped by `tagMatches`, as the Issue says, though Rust reads `[x #a](u)`'s `#a`.
- `RECURRENCE_STOP` keeps the old ASCII stop (mirrors Rust `RECURRENCE_RE`, out of scope).

## Risks

- `replaceDescription` now replaces across `#2026` / `word#tag` instead of refusing: correct by Rust's reading (they are description text).
