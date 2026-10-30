VERDICT: APPROVED

# Review: issue 07, auto-move, canvas, kanban and search-types examples

Reviewed `git diff main...HEAD` (c17f6f5c..98e97f16) in the worktree.

## Checks run by the reviewer

- `pnpm check`: 0 errors, 0 warnings (211 files).
- `pnpm vitest run src/tests/help src/tests/lib/features/auto-move src/tests/lib/plugins/kanban`: 9 files, 344/344 passed.
- Mutation probe (restored afterwards, tree clean): replaced `auto-move-rules.json` with the `main` version and changed one card back to `[[OKRs]]`. `src/tests/help/examples-scoping.test.ts` failed 4 tests: the guard's query-site test, both auto-move scope tests and the kanban card-link test. The new tests catch the regression they target.

The test verdict rests on `src/tests/help/examples-scoping.test.ts`, plus `src/tests/lib/features/auto-move/*` and `src/tests/lib/plugins/kanban/*` for the code the new tests call. No source under `src/lib` changed.

## Acceptance criteria

- [x] **Auto-move rules match only paths inside the example folder (test or documented check).** Met. All 5 expressions end with `file.folder.endsWith('/auto-move-features/Inbox')` and the destinations are `{parent}/...` or `{folder}/Bugs` (`auto-move-rules.json`). Evidence: `examples-scoping.test.ts:389` (each rule, forced enabled, matches an Inbox note at the vault root and nested, and resolves inside `auto-move-features/`), `:401` (no match at the vault root, at `/Inbox`, at the folder root, in `Cooking/` or in `Inbox/Bugs/`, so a moved note is never moved again), and `:417` (each real Inbox note still matches). The runtime builds the record from the absolute `filePath` (`auto-move.service.ts:152`), `file.folder` is absolute (`collection.logic.ts:32`) and `endsWith` is case-insensitive (`evaluator.ts:331`), so the test matches how the app runs.
- [x] **Each folder's README states what to expect inside a large vault.** Met. There is an "Inside a large vault" section in `auto-move-features/README.md`, `canvas-features/README.md` and `kanban-features/README.md`, and in the new `search-types/README.md`.
- [x] **Allowlist entries for these folders removed.** Met. The only entry, `auto-move-features/auto-move-rules.json`, was removed (`examples-scoping.test.ts:25`), and no entry for kanban, canvas or search-types remains. The guard passes without it and fails with the old JSON (probe above).

Issue body requirements:
- Kanban boards reference only their own notes: met. Six `notes/kanban-example-*.md` notes were added, aliases keep the card text, and the test is at `:435` and `:447`. Resolution is by basename (`kanban.service.ts:59-61`), so the prefix stops collisions with the owner's notes.
- Search examples say which results come from the example folder: met (`search-types/README.md`). The claim that semantic and hybrid modes strip `path:` checks out against `search.service.ts:157,255`.
- The gaps where today's API cannot scope (canvas vault-relative paths, `path:` only in text mode, folder-name matching) are documented in the READMEs and SCOPING.md, and the build report lists them for the closing commit.

No CLAUDE.md violations: only docs, example data and one test file changed, the test uses tabs, real logic is used and nothing is mocked, and there is no scope creep beyond the issue's folders plus SCOPING.md.

## Findings

1. **Low**, `help/examples/auto-move-features/README.md:33` (and the same claim in the build report's gap list): "the rules stop matching if you ... open it as a vault of its own" is wrong in the usual case. The record path is absolute, so a vault whose root folder is named `auto-move-features` still has notes in `/.../auto-move-features/Inbox`. The rules match, and `{parent}` resolves to the vault root, which is still the example folder. The rules only stop matching when the folder is renamed. Fix: drop "or open it as a vault of its own", or reword it to "or open it as a vault under another folder name".
2. **Low**, `help/examples/canvas-features/README.md:32-33` and `help/examples/SCOPING.md:104`: "as in the help vault" / "only resolve in the help vault" assume the help vault's root is the folder that contains `help/`. The queryjs examples use `Resources/help/examples/...` (`queryjs-features/yearly-2026.md:12`), and opening `help/` itself as the vault would not resolve `help/examples/...` either. Fix: say "only when the vault root is the folder that contains `help/`" instead of "the help vault".
3. **Low**, `help/examples/search-types/README.md:21-22`: semantic search returns at most 20 results with `minScore: 0.3` (`search.service.ts:258-260`), so in a ~10k-note vault the example notes may not appear at all. "Look for ... among your own notes" implies they will. Fix: add "if they rank in the top 20".
4. **Nit**, `.scratch/help-examples/issues/07-small-folders.md:16-18`: the three acceptance checkboxes are still `[ ]` although all three are met. Fix: tick them in the deliver step before the closing commit.
5. **Nit**, `src/tests/help/examples-scoping.test.ts:417`: this test checks that each Inbox note matches some rule, not the rule the README table names for it (first match wins). Today each note matches its documented rule (project-done: rule 1, recipe: rule 2, bug: rule 3). Optional fix: assert `findMatchingRule(...)?.name` against the README table.
