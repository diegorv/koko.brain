VERDICT: APPROVED

Re-review round 2 of the fix commit f5c0f41aa (`git diff 4670c39af..HEAD`), against `.scratch/todoist-bisync/work/02/review.md` and its "## Resolution".

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `tagMatches` (task-line.logic.ts:207-212) matches `#tag(?![A-Za-z0-9_-])` with no left boundary, like `TASK_TAG_RE`, and drops matches that start inside a `LINK_SOURCE` span (the link pattern `TOKEN_RE` also uses). `addTag`/`removeTag` use it (:225, :236). New tests: `(#shop)` and `milk#shop` for both (task-line.logic.test.ts:194-197, :232-235). The test that keeps tags inside links still passes (:237). |
| 2 | minor | resolved | `insertToken` adds a gap when the char before `🆔` is not whitespace (:142-145). The test checks the add and that a second add does nothing (test :199-203). |
| 3 | minor | resolved | The text group is `([^\n]*)` (:36-39), and `$` without the `m` flag anchors at the end of the string. Tests: `setTaskStatus` keeps `\r` (test :69-71), and `setDueDate` inserts before it (:94-96). See new finding 1 for a leftover edge case. |
| 4 | nit | rejection stands | The literal reading of rule 4 is what discovery.md records and what the Issue's criterion says ("a tag, link or unmapped signifier before its last word"). This is an owner decision before ticket 08, not a defect in this ticket. |
| 5 | nit | resolved | `contentRoundTripProblem` returns `'empty'` after the newline check (:301). The rule list in the test JSDoc includes rule 5, and a test covers `''` and `'   '` (test :380-383). |
| 6 | nit | resolved | `hasForeignId` treats `value === 'td-'` as foreign (anchor.logic.ts:47). `readAnchor` still returns null for it (:35). Test at anchor.logic.test.ts:49-51. |

## Acceptance criteria re-checked

- [met] Token patches on a raw task line string (both `- [ ]` and ordered `1. [ ]` forms, any indent): set status (open/closed per rule 5: opening keeps `/ ? ! >`, closing keeps `-`, otherwise `x` / space), set or remove `📅 YYYY-MM-DD`, set or remove the priority emoji (`🔺⏫🔼🔽⏬`), add or remove a `#tag` (inserted before the anchor), replace the description text. — Both forms still use the same regexes, with only the text group changed (:36-39). The tag add/remove fixes and the gap insert are tested. Every earlier patch test still passes (94 of 94 in `src/tests/lib/features/todoist-sync/`).
- [met] Every patch preserves everything it does not own: `⏳ 🛫 ➕ ✅ ❌ 🔁 ⛔ 🏁`, links, wikilinks, the anchor and its position, trailing text. — The `removeSpan` change (:121-127) only affects a span glued to a word on its left. I probed it: removing a glued priority or due date before `🆔` gives `Buy milk 🆔 td-x`, which keeps the gap; before the fix it gave `Buy milk🆔`. The `RICH` exact-match tests still pass, and links that contain `#shop` are kept (test :237-240).
- [met] A round-trip check: given Todoist content, report whether writing it into a line and parsing it back would change it (contains `#`, a signifier emoji, `🆔`, a newline, or would be collapsed). Pure, no parser call: the rules are listed in the test. — The `'empty'` rule is added to the type, the code and the rule list in the test JSDoc. All earlier round-trip tests still pass.
- [met] Anchor helpers: read the `td-` value from a line (`🆔 td-…` anywhere on the line); detect a user `🆔` without the prefix; build `🆔 td-<todoist id>` and `🆔 td-<8 base36>`; generate a value unique against a given set; build the anchor -> occurrences map from a list of `{relPath, line}`; scope filter that excludes the templates folder (from settings, passed in), `_system/`, `.view` files and `.kokobrain/`. — Only `hasForeignId` changed. Its earlier tests and the new bare `td-` test pass.
- [met] Gate: frontend (`pnpm check` + `pnpm vitest run`). — `pnpm check` exit 0 (227 files, 0 errors, 0 warnings). `pnpm vitest run src/tests/lib/features/todoist-sync/` exit 0 (2 files, 94 tests). `pnpm vitest run src/tests/lib/architecture/` exit 0 (9 files, 80 tests). The full suite is deliver's to run.

## Findings

1. **nit** `src/lib/features/todoist-sync/task-line.logic.ts:72`. The recurrence group in `TOKEN_RE` uses `.+?` up to `$`. JS `.` does not match `\r`, so on a CRLF line a trailing `🔁 every day\r` matches only as the bare `🔁`, and `every` and `day` become words. Probed: `replaceDescription('- [ ] Buy milk 🔁 every day\r', 'X')` returns `{conflict, mid-sentence}`, while the same line without `\r` returns `- [ ] X 🔁 every day`. The failure is conservative (a conflict, nothing lost), and the call returned null before the fix. To fix it, use `[^\n]+?` in the recurrence group, or stop at `\r`, and add a CRLF test for `replaceDescription`.

## Other checks

- Scope: the fix commit touches only the two logic files, their tests and review.md. No test was deleted or weakened, since the test diff only adds tests. No layer-baseline or composition-root change. Tabs are used throughout.
- A throwaway probe test, deleted before this commit, gave the results quoted above. It also showed that `removeTag` at the text start (`#shop Buy milk` becomes `Buy milk`), next to a wikilink (`[[N]]#shop` becomes `[[N]]`) and next to a markdown link with `#shop` in its URL behaves as intended.
- Not verified: the TS regexes against the Rust parser by running both. They were compared by reading the code only.
