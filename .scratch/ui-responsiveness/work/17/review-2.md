VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | Filed as `.scratch/ui-responsiveness/issues/20-wikilink-callers-pass-vault-root.md` (needs-triage, Blocked by 17). `grep resolveWikilink src/lib` confirms the caller list is complete: queryjs.logic.ts:134, graph-view.logic.ts:29, kanban.service.ts:73, lens.logic.ts:310,319, NoteRow.svelte:95, properties.logic.ts:741 (wired from PropertiesView.svelte:61); editor-host.ts:87 is the only one passing `vaultStore.path`. The Issue keeps `.logic.ts` files store-free. Main has no Issue 20 file today (latest is 19), so no number clash yet. |
| 2 | nit | resolved | `wikilink-resolution.logic.test.ts:165` renamed to `prefers the vault-relative file over a root-level one when the vault folder shares the first segment`; the assertion at :166 is byte-identical, so the test is not weakened. The suffix fallback is untouched, per the owner decision. |
| 3 | nit | rejection stands | Reviewer said no change needed; `vaultStore.path` is the folder-picker path without a trailing slash, and normalizing an input no caller passes is speculative. |

## Acceptance criteria

- [met] Owner decision recorded in Notes: is the suffix rule acceptable, or does the vault-relative path win first? — unchanged by the fixes; Issue Notes record that the vault-relative path wins first with the suffix match as fallback, and the source in `wikilink-resolution.logic.ts` is untouched since round 1.
- [met] Failing first: with `/vault/x/b/foo.png` before `/vault/b/foo.png`, `[[b/foo.png]]` resolves to `/vault/b/foo.png` — the fix touched only a test name in this file; the asserting test at `wikilink-resolution.logic.test.ts:160-163` and the editor-host case pass (72/72, see Checks). Round 1 verified red on main.
- [met] The cached and linear resolvers stay in parity — the renamed test still runs inside the per-resolver loop for both resolvers; no source change since round 1; both test files pass.

## Findings

None open or new. The fixes change one test name, add the follow-up Issue 20 file and the review Resolution section; no source code, no layer-baseline change, no composition root.

## Checks run

- `git diff 0de839af..HEAD`: 3 files (Issue 20, review.md Resolution, one test-name line).
- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/core/filesystem/wikilink-resolution.logic.test.ts src/tests/lib/app/editor-host.test.ts`: exit 0, 72/72 passed.
- Full suite and `pnpm build` not run; deliver runs them.
