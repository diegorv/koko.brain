VERDICT: APPROVED

## Acceptance criteria

- [met] Failing test first, in src/tests/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.test.ts: detectBlockElement('- Source: [[Meeting#^abc123]]').existingBlockId is null, and so is detectBlockElement('Area is 5 m^2').existingBlockId. It fails today ('abc123]]' and '2'). — Tests "does not take a trailing block link for a block ID" and "does not take an exponent for a block ID" (copy-block-link.logic.test.ts:98-106) assert the full result with existingBlockId null. Red verified by probe: the old regex `/\^([^\s]+)\s*$/` returns 'abc123]]' and '2' on those lines, so both tests fail on main; the new regex returns null for both. The test commit and the fix are in one commit (9f096bf3f), so red-first rests on the probe and the build report.
- [met] 'Some text ^my-block', '- Task item ^todo1', '## My Heading ^abc123' and a line holding only '^abc123' still report their IDs (existing cases at :30, :85, :90). — Existing cases unchanged at copy-block-link.logic.test.ts:30 (heading, also headingText 'My Heading'), :85 (todo1), :90 (my-block); new case :94-96 asserts '^abc123' gives 'abc123'. All pass.
- [met] extractBlockIdsFromContent and findBlockIdPosition use the same rule (cases in completion.logic.test.ts and navigation.logic.test.ts). — Both call the shared BLOCK_ID_RE (completion.logic.ts:108, navigation.logic.ts:46); grep shows no other user. New cases: completion.logic.test.ts:225-233 (block link, embed, exponent skipped; CRLF), navigation.logic.test.ts:119-128 (block link skipped and real id found at offset 30; exponent not matched). All pass.
- [met] Frontend gate: pnpm check and pnpm vitest run pass. — `pnpm check` exit 0, 0 errors 0 warnings. Targeted tests pass (see below); the full suite is deliver's to run.

## Findings

1. minor, src/lib/core/markdown-editor/extensions/live-preview/embed-resolver.logic.ts:40-50: extractBlockContent, which renders `![[Note#^id]]` embeds, does not use the shared rule. It picks the first line that `includes('^' + blockId)`, so a line that only links to the block (`[[Meeting#^abc123]]`) or an id with the same prefix (`^abc` vs `^abc123`) wins over the real block, and it strips with the loose `/\s*\^[^\s]+\s*$/`. This bug is older than this branch and outside the acceptance criteria. Fix: open a follow-up Issue that makes it match lines with BLOCK_ID_RE and `match[1] === blockId`.
2. nit, src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts:14: `[\w-]` without the `u` flag is ASCII-only. An id the user already typed with non-ASCII letters (`^café`) or ending in punctuation (`^id.`) is no longer seen as an id: Copy Block Link appends a second id, and `[[Note#^café]]` no longer navigates. This is in line with Obsidian (block ids are Latin letters, digits and dashes) and generateBlockId only emits [0-9a-z], so no change is needed. It goes in the delivery notes.
3. nit, src/lib/core/markdown-editor/extensions/live-preview/parsers/block-reference.ts:2: the live-preview BLOCK_REF_RE (` \^([\w-]+)$`) still differs from BLOCK_ID_RE. It needs a literal space and allows no trailing whitespace, so `text\t^id` and `text ^id ` are ids for copy/navigation/completion but are not decorated. This is older than the branch and the acceptance criteria do not cover it. Fix, optional: a follow-up if the owner wants one rule everywhere.
4. nit, src/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.ts:43: the heading strip still uses its own `/\s*\^[^\s]+\s*$/`. It only runs when BLOCK_ID_RE matched, and then it removes the same last ` ^id` token, so the result is the same. No change needed.

No scope creep: the diff changes BLOCK_ID_RE and its JSDoc, three test files, and the Issue's discovery record. No layer-baseline or composition-root change.

## Checks run by the reviewer

- `taskpolicy -c background pnpm check`: exit 0, 221 files, 0 errors, 0 warnings.
- `taskpolicy -c background pnpm vitest run` on copy-block-link.logic.test.ts, completion.logic.test.ts, navigation.logic.test.ts, features/copy-block-link/copy-block-link.service.test.ts and app/editor-host.test.ts (a findBlockIdPosition caller): exit 0, 5 files, 136 tests passed.
- `taskpolicy -c background pnpm vitest run` on setup/editor-extensions.test.ts, app/commands.test.ts and command-palette/CommandPalette.test.ts, the other tests that reference the changed functions: exit 0, 3 files, 62 tests passed.
- Node probe of old vs new regex: block link, embed, exponent, `x ^a^b`, `^id.` and `^café` now give null; `^abc123`, `^my-block`, `^todo1`, the heading id, `^id\r`, a tab before `^`, trailing spaces and `See [[N#^x]] ^real` give the real id.
- Test verdict rests on: copy-block-link.logic.test.ts, completion.logic.test.ts, navigation.logic.test.ts, copy-block-link.service.test.ts, editor-host.test.ts, editor-extensions.test.ts, commands.test.ts, CommandPalette.test.ts. Full suite and `pnpm build` not run (deliver's).

## Resolution

1. Correct (embed-resolver.logic.ts:40-50 still matches with `line.includes('^' + blockId)` and strips with the loose regex), but older than the branch and outside this Issue's criteria. Not changed here, as the review recommends: it goes to a follow-up Issue (extractBlockContent matches with BLOCK_ID_RE and `match[1] === blockId`), to be filed by the main session.
2. No change. ASCII-only ids match Obsidian's id charset and generateBlockId's [0-9a-z]; noted for the delivery comment.
3. No change. Older than the branch and outside the criteria; optional follow-up if one rule everywhere is wanted.
4. No change. Same result whenever BLOCK_ID_RE matched.
