VERDICT: APPROVED

## Acceptance criteria

- [met] Failing test comes first. Move `.scratch/file-io-audit/repro/o03-deep-link/deep-link-silent-new-overwrites.test.ts` under `src/tests/` (next to deep-link.service.test.ts) and see both cases fail — commit 32a8a272 deletes the repro and adds `src/tests/lib/features/deep-link/deep-link-silent-new-overwrites.test.ts`, before fix commit 18d61f90. I put main's `deep-link.service.ts` back in the worktree and ran the moved file: exit 1, the 2 bug cases fail (`expected '' to be '# Journal\nYears of entries.\n'`, `expected 'hello' to be '# Journal\n...'`) and the 4 guard cases pass. Then I restored the file, and the worktree is clean.
- [met] `new` with `silent=true` and `content=hello` naming an existing note leaves its bytes unchanged on disk and shows the info toast — `deep-link.service.ts:330-336` returns before `mkdir`/`writeTextFile` when `exists(fullPath)` is true. The test at line 78 checks `disk.get(JOURNAL) === EXISTING` and `toast.info` called with the exact text from the Issue, and it passes.
- [met] `new` with `silent=true` and no content naming an existing note does not truncate it — the test at line 69 (`clipboard=true` with an empty clipboard, so content is '') checks that the bytes are unchanged and the toast is shown, and it passes.
- [met] `new` with `silent=true` naming a note that does not exist still creates it with the given content (current behavior, covered by deep-link.service.test.ts:287-304) — the new test "creates a note that does not exist" (`Fresh.md` === 'hello', no info toast) passes, and deep-link.service.test.ts passes too, including its silent-create and `markRecentSave` silent-create cases (exists is mocked false).
- [met] `new` with `overwrite=true` still replaces an existing note, and append and prepend are unchanged — the diff does not touch the prepend, append or overwrite branches (`deep-link.service.ts:279-326`). The guard tests for overwrite (bytes === 'hello', no info toast), append (`EXISTING + '\nhello'`) and prepend (`'hello\n' + EXISTING`) pass.

## Findings

1. minor — src/tests/lib/features/deep-link/deep-link-silent-new-overwrites.test.ts:69-83 — The two existing-note cases only compare the final bytes, so they would still pass if the code wrote the same bytes back, or called `markRecentSave`/`notifyAfterSave`. The Issue says "write nothing, call no `notifyAfterSave`". Fix: in both cases, also assert `expect(vi.mocked(writeTextFile)).not.toHaveBeenCalled()` (import it from the mocked `@tauri-apps/plugin-fs`). Not a blocker: the code returns before any of those calls (`deep-link.service.ts:332-335`).
2. nit — help/documentation/23-deep-links.md:84,88 — The user docs say that with no mode set, an existing note "is opened without modifying its content". They do not say what `silent=true` does there: it now leaves the note untouched and shows an info toast. Fix (optional): add one sentence to the `silent` row or the content-mode paragraph.

## Checks run

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/deep-link/`: exit 0, 6 files, 219 tests passed. This covers the new test file, deep-link.service.test.ts, deep-link.service.race-audit.test.ts, deep-link-dirty-buffer.test.ts and the other files in that directory.
- `pnpm vitest run` on the other files that import deep-link.service (raw-write-ratchet, vault.service.switch-save, deep-link-capture-frontmatter, quick-capture.service, app-lifecycle.service): exit 0, 5 files, 115 tests passed.
- Red probe: with main's service file, the moved test fails exactly the 2 bug cases (see criterion 1).
- My test verdict rests on these test files. I did not run the full suite or `pnpm build`; deliver runs them.

## Notes

- Scope: the source change is 6 lines in the silent create branch. There is no layer-baseline or BASELINE_SIZE change and no new composition root. The other changes are the moved test and the workflow's own `.scratch` records.
- The window where the file appears between `exists` and `writeTextFile` stays open, the same as in `openOrCreateNote`. The Issue does not ask to close it, so it is not a finding.
- `deep-link.service.test.ts` and `deep-link.service.race-audit.test.ts` mock `svelte-sonner` without `info`. No test there reaches the new branch today. A future test that does would get a TypeError, which `executeAction`'s catch turns into `toast.error`.

## Resolution

1. Fixed: both existing-note cases in `deep-link-silent-new-overwrites.test.ts` now also assert `writeTextFile` was not called.
2. Fixed: the `silent` row in `help/documentation/23-deep-links.md` now says an existing note with no mode set is left untouched and a notice says so.
