VERDICT: APPROVED

# 13 review: dirty-safe, path-addressed frontmatter writer

Reviewed `git diff main...HEAD` (88b4be61, 735d739d, 954f923b) against the Issue, plan Task 12 (lines 292-325), Notes C2 and CLAUDE.md.

## Checks run by the reviewer

- `pnpm check`: 0 errors, 0 warnings (192 files). Log: `.claude/worktrees/test-logs/calendar-feature-13-review-check.log`.
- `pnpm vitest run src/tests/lib/features/properties src/tests/lib/core/editor`: 17 files, 644 tests passed. Log: `.claude/worktrees/test-logs/calendar-feature-13-review-vitest.log`.
- The test verdict rests on `src/tests/lib/features/properties/frontmatter-write.service.test.ts` (the new file, 16 cases), plus the unchanged `src/tests/lib/core/editor/editor.service.test.ts`, `editor.store.test.ts`, `editor.hooks` tests and `src/tests/lib/features/properties/properties.logic.test.ts`, which cover the functions the writer calls.
- A throwaway probe file (deleted, never committed) using the same harness confirmed: a vault switch during `exists` throws `vault-changed` with 0 writes; a vault switch during `saveFileByPath` throws `vault-changed` after the bytes are on disk; `mutate` runs twice on the restart path; a note with no frontmatter gains a block and loses it again cleanly; two concurrent calls on one closed note lose the first mutation; a failed save restores `base` over content typed during the save.
- Tauri capability `fs:allow-exists` is granted (`src-tauri/capabilities/default.json:189`), so the new `exists` call works outside the mock.

## Acceptance criteria

- [x] Exports `FrontmatterWriteError` with the four-part `reason` union and `updateNoteFrontmatter(path, mutate): Promise<string>` returning the written content: `frontmatter-write.service.ts:23-38`, `:61-67`.
- [x] `vaultStore.path` captured at entry (`:65`); `assertVault` after each await: read `:84`, save `:96`, exists `:105`, write `:112`. Test "throws vault-changed and writes nothing when the vault switches during the read" (test `:301-318`). The other three guards are exercised only by my probe (finding 3).
- [x] Base is the tab's `content` or `readTextFile`, errors unwrapped: `:78-85`. Test "propagates the read error..." (test `:292-299`) asserts it is not a `FrontmatterWriteError`.
- [x] Lossy refusal before `mutate`, no write, tab untouched; `next` formula and `next === base` no-op: `:87-91`. `it.each(LOSSY)` covers all six `LossyFrontmatterReason` values (`properties.logic.ts:197-203`) on a dirty open tab (test `:241-262`), plus a closed-note refusal (`:264-272`) and the no-op test (`:226-237`).
- [x] Tab branch sync with `(false, 'none')` then `await saveFileByPath`: `:93-101`. Clean tab (test `:211-224`) and dirty tab with merged content and clean tab afterwards (test `:125-139`).
- [x] `false` from `saveFileByPath` restores `base` with `(false, 'none')` and throws `save-failed`: `:97-100`. Test `:276-290` asserts the restore, the reason and exactly one toast.
- [x] `exists` re-check, `missing`, nothing written: `:104-106`. Test `:162-178` asserts the reason, the `exists(path)` call, no file at the path and no write.
- [x] Synchronous tab re-check right before the write, one restart onto the tab branch: `:109`. The restart reaches `findTab` at `:78` with no await in between, so a second restart cannot happen. Test `:141-160` asserts tab `content` = `savedContent` = `next`, disk = `next`, one write.
- [x] `writeTextFile`, `syncExternalContentToEditor(path, next, true, 'none')`, `notifyAfterSave(path, next)`: `:111-115`. Closed-file test (`:182-209`) asserts disk bytes, dedupe (`isAlreadyIndexed`), `areAllRecentSaves`, the `update_note_in_index` IPC, a real after-save observer and a real note-change consumer.
- [x] Only `@tauri-apps/plugin-fs`, `@tauri-apps/api/core` and `svelte-sonner` mocked; real `editorStore` / `vaultStore`; the three race tests are first in the file (test `:123-178`). Test-first ordering cannot be checked from git (one commit holds code and tests); the build report says the file failed with "module not found" first, and I accept it on the file's layout.
- [x] `editor.service.ts` and `file-icons/frontmatter-icon.service.ts` untouched: `git diff main...HEAD --stat` lists only the two new source/test files and two `.scratch` files.
- [ ] Gate green: left to deliver (not run here, as instructed). Commit 735d739d already follows docs/COMMITS.md (Context, Problem, Solution, Behavior, Files with line ranges, trailer).

## CLAUDE.md rules

- Layer: `features/properties` imports `core/editor` and `core/vault` only; `properties.service.ts` already has the same edges. No `core` → `features` import added.
- Tabs, JSDoc on every export and class field, import grouping order: OK. `$lib/` specifiers match every other file (no `#lib/` is in use in `src/`).
- Error handling: no swallowed errors. `saveFileByPath` toasts; the writer adds none (asserted). No catch blocks, so no `error()` logging is owed.
- Tests for every changed source file: the one new source file has its test file. No stores or `.logic.ts` mocked.
- No scope creep: the diff holds the writer, its tests and the scratch notes.

## Findings

1. **Low**, `src/lib/features/properties/frontmatter-write.service.ts:97-98`. On `save-failed` the tab is restored to `base` unconditionally. Anything that changed the tab while `saveFileByPath` was awaiting (a keystroke in that tab, or another `syncExternalContentToEditor`) is overwritten. The probe confirmed it: content typed during a failing save was replaced by `base`. The ticket asks for this restore literally, and in the calendar flow the note's tab is in the background, so this is unlikely. Fix (optional, deliver's call): restore only when `findTab(path)?.content === next`. Otherwise leave the tab alone and still throw `save-failed`. Add one test.
2. **Low**, `src/lib/features/properties/frontmatter-write.service.ts:50-60`. The JSDoc does not tell callers three things the probe showed. `mutate` can run twice (on the restart at `:109`), so it must be pure. Two concurrent calls on one closed note race, and the last write wins (the first mutation was lost in the probe), so callers must serialize per path, as ticket 24's queue does. `vault-changed` thrown after the save or write await (`:96`, `:112`) means the bytes may already be on disk. Fix: add these three sentences to the JSDoc, and to the `vault-changed` line at `:20`.
3. **Low**, `src/tests/lib/features/properties/frontmatter-write.service.test.ts`. The defaults recorded in discovery.md have no tests: `vault-changed` from the `exists`, write and save awaits (no sync, no `notifyAfterSave`, no restore), and the post-write sync for a tab opened during `writeTextFile` (`:114`). The ticket only requires the read-time case, so this does not block. Fix: add a vault-switch-during-`exists` case (no write) and a vault-switch-during-save case (no restore, `vault-changed`), with the same deferred-promise pattern.
4. **Nit**, `src/tests/lib/features/properties/frontmatter-write.service.test.ts:27`. The `localStorage` stub is defined on `globalThis` at module scope and never removed. Vitest isolates test files by default, so nothing leaks today. If you keep it, scope it with `vi.stubGlobal('localStorage', ...)` and `vi.unstubAllGlobals()` in `afterEach`.

None of these blocks delivery. Findings 1 and 2 are the ones worth taking before ticket 24 builds on the writer.
