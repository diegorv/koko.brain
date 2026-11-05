VERDICT: CHANGES_REQUESTED

# Review: issue 05, scope triada and templates

Diff reviewed: `git diff main...HEAD` (main 28a8cf0c, HEAD 6f464614), 4 commits.

## Checks run by the reviewer

- `pnpm vitest run src/tests/help/examples-scoping.test.ts src/tests/lib/plugins/templates`: 5 files, 56 tests passed.
- `pnpm check`: 0 errors, 0 warnings (211 files).
- Red probe: put main's `_shared-triada.js` and `triada-inbox.js` back into the worktree with the branch's allowlist and ran
  the guard: 1 failed / 14 passed, failing on exactly those two scripts. Restored them with `git checkout`.
- Read `DataArray.limit` (`src/lib/plugins/queryjs/data-array.ts:171`, a `slice(0, n)`), `kb.pages()`
  (`src/lib/plugins/queryjs/kb-api.ts:63`), every triada script and its callers in `triada/templates/`, and the
  `queryjs-features` scripts the period templates call.

The test verdict is based on `src/tests/help/examples-scoping.test.ts` (the guard) and `src/tests/lib/plugins/templates/`.
The diff changes only example content (`help/examples/**`) and the guard's allowlist. No app source changed, so no
other unit test applies.

## Acceptance criteria

- [x] **No query in either folder reads notes outside its folder, or it is allowlisted with a reason.** Met through the
  guard's "explicit limit" route (SCOPING.md: "reads only its own example folder, or caps its rows with an explicit
  limit"). It is not met through a folder scope. `notesIn` (`_shared-triada.js:29-34`) and the inbox
  (`triada-inbox.js:9`) still read the whole vault, and each is now capped by a `.limit(...)` in its own chain. The
  README "Scope" section (`triada/README.md:33-41`), the script comments and the period-template comments say why
  these reads cannot be scoped to a folder. The other triada scripts read only through `notesIn`. `help/examples/templates`
  has no direct read. Guard: 15/15 passed. The red probe shows the guard catches the old scripts.
- [x] **Allowlist entries for these folders removed.** `examples-scoping.test.ts:66-67` (main) is deleted. A grep for
  `'triada/`, `'templates/` and `05:` in the test finds nothing.

The Issue text asks for a capped read to stay "in the allowlist with a reason", and that conflicts with AC2. It also
cannot work: the guard's stale-entry test fails on any allowlisted file that has a `.limit(` in its chain. The build
followed AC2 and documented the gap. I accept that, under finding 4.

Scope: every changed file is under the Issue's Touches, except the guard test (`src/tests/help/examples-scoping.test.ts`).
Removing the folder's allowlist entries requires that change. No scope creep.

## Findings

1. **Minor (correctness)**, `help/examples/triada/__system/queryjs/triada-inbox.js:9,19`. The cap notice has an
   off-by-one. When exactly 20 notes hold open `#inbox` tasks, `pages.length === MAX_NOTES` is true and the note says
   "Process these to see the rest.", but nothing else is left. Fix: fetch one extra note and use it only to detect the
   cap: `const found = kb.pages().where(...).limit(MAX_NOTES + 1); const capped = found.length > MAX_NOTES;
   const pages = found.limit(MAX_NOTES);`, and show the notice when `capped`. The `.limit(` stays in the read's own
   chain, so the guard still passes.
2. **Minor (UX)**, `help/examples/triada/__system/queryjs/triada-inbox.js:11-12`. `Inbox (${total})` now counts only
   the tasks in the first 20 notes. In the weekly review this header is the inbox size, and when the cap is hit it
   silently undercounts. Fix: when `capped` (from finding 1), show the count as `${total}+`, or name the cap in the
   header.
3. **Nit**, `help/examples/templates/Yearly Note.md:47`. The comment says the block "reads this year's quarterly and
   monthly notes", but that block (`yearly-satisfaction-by-quarter`, `tag: 'type/journal/quarterly'`) reads only
   quarterly notes. The monthly read is the `yearly-*-by-month` block at line 59. Fix: say "quarterly notes" here, or
   word the comment so it covers the whole note.
4. **Info (closing commit)**: no code change. The closing commit must list the gap. The triada period reads (tag plus
   `created` range) and the inbox stay vault-wide. They pass the guard because of a limit, not a folder scope, because
   a script cannot read the Periodic Notes folder setting and inbox items are captured in any note. The cap of 100 on
   `notesIn` is nominal: the largest caller reads 14 weekly notes per quarter. It also carries over the build's
   unchanged pre-existing item: `help/examples/templates` call `_system/queryjs/...` while the scripts ship under
   `queryjs-features/__system/queryjs/`.

Findings 1 and 2 share one small edit in `triada-inbox.js`. After the fix, re-run
`pnpm vitest run src/tests/help/examples-scoping.test.ts` to confirm the guard still passes.

## Resolution

- Finding 1: fixed. `triada-inbox.js` reads `.limit(MAX_NOTES + 1)`, sets `capped = found.length > MAX_NOTES`, renders `found.limit(MAX_NOTES)` and shows the cap notice only when `capped`.
- Finding 2: fixed. The header reads `Inbox (${total}+)` when capped.
- Finding 3: fixed. The Yearly Note comment now says "quarterly notes".
- Finding 4: no code change. Recorded in the closing commit.
- Guard re-run: `pnpm vitest run src/tests/help/examples-scoping.test.ts` 15/15 passed.
