VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | The review offered "keep the suffix rule, add a test that pins the precedence, and file a follow-up". `matches a path-style target by path suffix, first in tree order` (`wikilink-resolution.logic.test.ts:158-162`) runs inside the `for (const [name, resolve] of resolvers)` loop, so both resolvers are pinned in both tree orders. Follow-up `.scratch/ui-responsiveness/issues/17-path-style-target-exact-vault-path.md` describes the suffix match and the vault-folder-named-`b` case and names the pinning test. Logic code is unchanged. |
| 2 | minor | resolved | Out of TS scope, as the review said; follow-up `.scratch/ui-responsiveness/issues/18-vault-index-exact-first-resolution.md` names `resolve_with_cache` in `src-tauri/src/vault/index.rs` and the e2e mock. No `src-tauri/` change on the branch. |
| 3 | nit | resolved | `WikilinkResolutionCache` JSDoc (`wikilink-resolution.logic.ts:64-68`) now names the note-name map and `byFileName`. Comment-only change. |
| 4 | nit | resolved | `prefers an exact sibling file over a dotted note name` (`wikilink-resolution.logic.test.ts:152-155`) covers both directions (`.json` wins when present, the note when alone), for both resolvers. |
| 5 | nit | resolved | `counted(path, counter)` is hoisted to the `resolveLink memo` describe scope (`editor-host.test.ts:112-121`); both tests keep their own `{ reads }` counter and their `toBeLessThan(2 * files.length)` bounds are unchanged, so nothing was weakened. |

## Acceptance criteria re-checked

- [met] Failing first: with `foo.md` before `foo.png` in the tree, `![[foo.png]]` resolves to `foo.png` — the original test (`resolves to the file it names, not to an earlier note with the same stem`) is untouched by the fix commit (fix diff adds lines only in that file) and passes for both resolvers; round 1's red probe against `main`'s logic stands since the logic code changed only in a JSDoc comment.
- [met] `[[foo]]` still resolves to `foo.md`; the existing wikilink-resolution tests stay green — `git diff faffd81f..HEAD` on `wikilink-resolution.logic.test.ts` is additions only; the file passes (see Checks). Full suite is deliver's to run.
- [met] Issue 03's memoized cache serves both maps from one tree identity — `serves exact-file and note-name targets from one build per tree` (`editor-host.test.ts`) still asserts the same bound after the helper hoist and passes; `editor-host.ts` is unchanged on the branch.

## Checks

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/core/filesystem/wikilink-resolution.logic.test.ts src/tests/lib/app/editor-host.test.ts`: exit 0, 2 files, 67 tests passed. Deliver runs the full suite and `pnpm build`.
- Issue numbers 17 and 18: no other local branch (including `main`) carries `.scratch/ui-responsiveness/issues/17-*` or `18-*`.
- Scope: the fix commit touches one JSDoc comment, two test files and `.scratch` records. No layer-baseline, `BASELINE_SIZE` or composition-root change. Tabs throughout.

## Findings

None open or new.
