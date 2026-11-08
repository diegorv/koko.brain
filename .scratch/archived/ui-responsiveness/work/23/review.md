VERDICT: APPROVED

## Acceptance criteria

- [met] Owner decision recorded in Notes: the operator-only branch follows `entry.tags` — The Issue's Notes record it (triage 2026-11-03). `performOperatorOnlySearch` (src/lib/features/search/search.logic.ts:162-184) reads only `entry.tags` and `entry.path`.
- [met] Failing first: an operator-only `tag:` query makes no `read_files_batch` call and returns the notes that carry the tag, including a nested tag — The test is search.service.test.ts:323 (`answers an operator-only tag query ...`): it asserts no `read_files_batch` and no `search_fts` call, and that `['/vault/a.md', '/vault/c.md']` come back, where c has `Review/Weekly`. Probe: I ran this file against main's search.service.ts and it failed (3 failed: :323, :342, :363). I restored HEAD afterwards and the worktree is clean.
- [met] A note whose only match is `#security-team` is not returned for `tag:security` (today's false positive) — search.service.test.ts:342 gives the note `#security-team` content and `['security-team']` entry tags, and expects only `sec.md`. It failed against main, because `matchesTagFilter` accepts `-` after the tag. search.logic.test.ts covers `matchesIndexTag(['security-team'], 'security') === false`.
- [met] A `path:` operator-only query still filters by path, and a query with operators and text still goes through FTS — The path filter is search.service.test.ts:363 (`path:daily/`, no content read, one result) plus the logic tests `filters by the vault-relative path` and `combines path and tag filters`. Text with operators: the existing test at :294 (`tag:javascript fix` calls `search_fts` with `fix`) and the one at :400 (`path:` with text) still pass. The routing condition at search.service.ts:188 did not change.
- [met] The FTS-with-operators branch and the `FTS failed` fallback keep their current behavior — search.service.ts:197-239 matches main line for line (`git diff main...HEAD` touches only :8, :13-21 and :188-193). The existing tests :129, :147, :294, :400, :420 and :443 pass, and the new :377 shows that an entries-read failure on an operator-only query still reaches the content-reading catch, as an error there did before.
- [met] The comment at `search.service.ts:13-24` matches what the code does — search.service.ts:13-22 now says the function serves only the `FTS failed` fallback. grep shows that the only call left is at :233.

## Findings

1. minor — CLAUDE.md:301 still says "`loadVaultContentMap` fires only on the two fallback paths (an operator-only query, or FTS5 unavailable)". That is now wrong, and ADR 0025:194-195 was updated in this diff. Fix: change that one clause to match the ADR wording ("fires only when FTS5 is unavailable; an operator-only query reads the entries' tags and paths directly"). The build report flagged this and held it for the owner; it needs a one-line edit before or with delivery.
2. nit — src/tests/lib/features/search/search.service.test.ts:48-53: the `mockSearchIPCs` JSDoc still says "the operator-only and FTS-fallback paths now load content via these IPCs". Only the FTS fallback reads content now. Fix: drop "operator-only and" from that sentence.
3. nit — docs/adr/0025-rust-vault-index.md:195: the edited line is about 100 columns long, while the paragraph around it wraps at about 76. Fix: rewrap lines 194-197.

## Checks run by this review

- `pnpm check`: exit 0, 0 errors, 0 warnings (213 files).
- `./node_modules/.bin/vitest run src/tests/lib/features/search src/tests/lib/features/tags`: exit 0, 13 files, 255/255 passed. The test verdict rests on these files, chiefly src/tests/lib/features/search/search.service.test.ts and src/tests/lib/features/search/search.logic.test.ts.
- Failing-first probe: I ran src/tests/lib/features/search/search.service.test.ts with main's search.service.ts and HEAD's search.logic.ts. Exit 1, 3 failed (the new tag, security-team and path tests), 41 passed. The fallback test passes on both sides, which is expected.
- I did not run the full suite or `pnpm build`; deliver runs them.

## Notes (no change requested)

- Parity with the old path holds. `get_all_vault_entries_v2` returns entries sorted by path (src-tauri/src/commands/vault.rs:565-566), the 100 cap is applied before the sort as in `performSearchOverFiles`, and every match count is 0, so the old sort by match count and then name becomes a sort by name only. The result shape is unchanged. One small difference: a `path:` query used to drop an entry whose file `read_files_batch` failed to read, and now it keeps it. The entry is in the index, so this is acceptable.
- `get_all_vault_entries_v2` is also a sync command, so each tag click still serializes the full entry list on the main thread. That costs far less than reading 10.6k files, and the Issue does not ask for more. Following ADR 0025, the search maps keep a direct `invoke` (not the version-keyed memo) for freshness. File a follow-up only if a later owner session still shows a stall here.
- Scope is clean: there are no changes outside search.logic/service, their tests, the ADR sentence and the workflow's own `.scratch` records. There are no layer-baseline changes.

## Resolution

1. Not applied: CLAUDE.md:301 still says `loadVaultContentMap` fires on an operator-only query. The finding is correct, but CLAUDE.md edits need the owner's sign-off, so it is left for the owner (suggested wording: "fires only when FTS5 is unavailable; an operator-only query reads the entries' tags and paths directly").
2. Fixed: the `mockSearchIPCs` JSDoc now names only the FTS-fallback path.
3. Fixed: rewrapped ADR 0025 lines 194-198 to the paragraph's width.
