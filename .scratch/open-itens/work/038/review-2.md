VERDICT: APPROVED

## Previous findings

| # | Finding | Status | Evidence |
|---|---------|--------|----------|
| 1 | nit, fs-capabilities.test.ts:137, `PLUGIN_FS_IMPORT` parsed only static single-quoted brace imports | resolved | Commit 2f9d6cda2 adds `parses every @tauri-apps/plugin-fs mention as a static named import` (fs-capabilities.test.ts:187-197): per file under src/lib and src/routes, the count of `@tauri-apps/plugin-fs` mentions must equal the count of `PLUGIN_FS_IMPORT` matches (the regex carries the `g` flag, so `matchAll` is valid). The file walk moved into `sourceFiles()` (:150-160), and `importsByName()` iterates it unchanged in behavior. My own red probe: a temporary `src/lib/zz-probe.ts` with a dynamic `await import('@tauri-apps/plugin-fs')` made the new case fail (exit 1); probe removed, worktree clean. |

## Acceptance criteria re-checked

- [met] Failing test first, in src/tests/lib/architecture/fs-capabilities.test.ts (new file next to layer-rules.test.ts): collect the names imported from '@tauri-apps/plugin-fs' under src/lib and src/routes, map each to its permission (readFile -> fs:allow-read-file, readTextFile -> fs:allow-read-text-file, and so on), and assert each is present in src-tauri/capabilities/default.json. It fails today on readFile. An imported name with no known mapping fails the test too. — The fix only refactors the walk into `sourceFiles()` and adds a stricter case; the grant and unmapped-name cases are unchanged and pass (fs-capabilities.test.ts, 9 tests, exit 0). No test was weakened or removed.
- [met] Both gates green. — Only a test file changed since round 1: `pnpm check` exit 0 (0 errors, 0 warnings) and `pnpm vitest run src/tests/lib/architecture/fs-capabilities.test.ts` exit 0. No src-tauri change since round 1, whose cargo test (exit 0) still holds. The full `pnpm vitest run` is deliver's to run.

## Findings

None open or new.

- Noted, not a finding: the per-file count would also flag a comment or string naming `@tauri-apps/plugin-fs` in app code. grep of src/lib and src/routes finds none (search.service.ts:92 says "plugin-fs" without the scope, which does not match). Such a failure would be visible and easy to resolve.

## Checks run by this re-review

- `pnpm check`: exit 0.
- `pnpm vitest run src/tests/lib/architecture/fs-capabilities.test.ts`: exit 0, 9 passed.
- Red probe (dynamic import) failed the new case, exit 1; removed afterward.
- Scope: the fix diff touches only fs-capabilities.test.ts and the workflow's review.md. No layer-baseline or BASELINE_SIZE change.
