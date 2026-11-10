VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | blocker | resolved | `planLink` strips `unpushedDescription` from the base (`fields.logic.ts:226-227`) and sets it again only for a brain text that is still unsendable (`:341-344`, and `:265-266` in the mid-sentence branch). `local.description` no longer takes that text, so the raw-insert checks at `:242` and `:326` still see only ticket 06's lines. The marker survives storage: `local_base` is a plain JSON string (`todoist_repo.rs:32`), it is read with an unvalidated `JSON.parse` (`fields.logic.ts:178`), and the completion step spreads the base (`completion.logic.ts:210-214,301,318`). Tests: "keeps syncing the other fields of a line whose brain text was not sent, both ways" (priority pushes `{priority: 3}` with no log; a Todoist content edit writes `Review spec` and logs a `conflict` naming the brain text, as on main) and "logs a mid-sentence brain text that fails the round trip without marking the line as raw inserted". |
| 2 | minor | resolved | The mid-sentence branch now writes one `description-conflict` with both texts (`fields.logic.ts:258-263`), and `conflict` is called only on the `line` replace (`:254`). The test "keeps a brain text edit out of Todoist ... (mid-sentence)" now asserts exactly one entry matching `/Buy oat milk.*Buy milk now/u`. That is stricter than the old `toContainEqual`, not weaker. `sync-now.service.test.ts:729` still passes with `stringContaining`. |
| 3 | nit | resolved | The `MAX_CONTENT_LENGTH` comment (`fields.logic.ts:24-28`) and discovery.md now both say code points, and both say Todoist's own unit is unverified. |
| 4 | nit | resolved | `uniq(minus(lineTags, remote.labels))` (`fields.logic.ts:381`, helper at `:425-428`). Test "sends one label for new line tags that differ only by case" expects `['deep', 'Work', 'next']`. |

## Acceptance criteria re-checked

- [met] Local change = parse(line) vs `local_base`, compared in Todoist terms (projected priority, normalized labels) so a lossy field never ping-pongs. Pushes are `item_update` commands with uuids, at most 100 per request. — After an unsendable brain text, the line's other local changes still push (finding 1 test: `{id: 'a', priority: 3}`, empty log). The priority projection (`:366`), case-insensitive tag sets (`:303-304,376-377`), one uuid per update (`:191`) and the 100-command batching in `sync-now.service.ts` are unchanged since review 1. `sync-now.service.test.ts` passes.
- [met] Content over 500 characters or with a newline is not queued; logged. Lines flagged by ticket 06's round-trip check are never pushed. — `:337-344`: content is not queued and is logged once per text. "does not queue text over 500 characters or that fails the round trip, and logs it once": the marker is set, the description is unchanged, and the rerun plans nothing. A 500-code-point text is still sent. "never pushes a line flagged by the round-trip check" still passes, and the raw-insert check at `:326` is unchanged.
- [met] Conflict per field: Todoist wins, the line is patched to the Todoist value, the brain value is logged. — Unchanged for due, priority and tags. For text, the `line` replace still patches and logs `conflict` with the brain value (`:253-256`). In the mid-sentence case, which Issue 08 cannot patch, the brain value is now in the single `description-conflict` entry (`:258`).

## Findings

1. **nit** `src/lib/features/todoist-sync/fields.logic.ts:265-266`. In the mid-sentence branch, a brain text that fails the round trip leaves `local.description` at the old base (for example `Fix bug`) while Todoist now holds `Fix the bug`. If the user later changes the line back to exactly `Fix bug`, then `fields.description === local.description` at `:335`, so nothing is pushed and nothing is logged, and the line and Todoist stay different. Before the fix, the base held the brain text, so the revert was pushed. This needs a both-sides edit, a mid-sentence tag, a non-tag `#` and an exact revert, so it is rare. Fix (optional): in that `else`, set `local.description = item.content`. That text passed the round trip at `:236`, so the raw-insert check stays clean, the next cycle still dedupes the brain text through the marker, and a later revert is pushed.

## Checks run by this review

- `pnpm check` (worktree root): exit 0, 229 files, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/todoist-sync/`: exit 0, 23 files, 539 tests passed. This includes `fields.logic.test.ts` (the only test file changed by the fixes) and `sync-now.service.test.ts`, the other test that checks the `description-conflict` and `content-not-pushed` kinds. The full suite is deliver's to run.
- Scope: the fixes touch only `fields.logic.ts`, `pull.logic.ts` (an optional `LocalBase` field), `fields.logic.test.ts` and this Issue's own `.scratch/.../work/09/` records. Nothing changed under `src-tauri/`, the layer baseline or the ledger. No test was deleted or weakened.

## Resolution

1. Fixed as suggested: in the mid-sentence branch, an unsendable brain text goes to `unpushedDescription` and `local.description` takes `item.content` (`fields.logic.ts:267-270`). The existing mid-sentence test now expects `description: 'Fix the bug'`, and the test "pushes a line reverted to the old text after a mid-sentence brain text failed the round trip" pushes `{content: 'Fix bug'}` with an empty log (it failed before the fix). `pnpm check` exit 0; `pnpm vitest run src/tests/lib/features/todoist-sync/` exit 0, 540 tests.
