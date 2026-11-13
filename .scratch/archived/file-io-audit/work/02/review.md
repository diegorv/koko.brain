VERDICT: APPROVED

## Acceptance criteria

- [met] Failing tests come first. Move `.scratch/file-io-audit/repro/o02-task-toggle/task-toggle-dirty-buffer.test.ts` and `.scratch/file-io-audit/repro/o03-deep-link/deep-link-dirty-buffer.test.ts` under `src/tests/` — `git diff main...HEAD --stat` shows the o02 file renamed to `src/tests/lib/features/tasks/task-toggle-dirty-buffer.test.ts` and the o03 file deleted from `.scratch/` and re-added as `src/tests/lib/features/deep-link/deep-link-dirty-buffer.test.ts` (the other o03 repro files are untouched, as they belong to other Issues). Red-first probe: I checked out main's `tasks.service.ts`, `deep-link.service.ts` and `deep-link-actions.ts` (plus a stub for the new export so the import resolves), ran both files, and 12 of 15 failed (every dirty-tab case); the 3 that passed are the clean-tab and closed-note "as today" cases. Source restored afterwards (`git status --short` clean).
- [met] Ticking a task of a note with unsaved typing keeps the typing in the tab and on disk, with the task toggled — `tasks.service.ts:107-121` awaits `saveFileByPath(filePath)` before `call('toggle_task_status')` when the open tab is dirty. Test "keeps the typed text in the tab and on disk after ticking a task of that note" asserts the typed paragraph and `- [x] buy milk` in both `tab.content` and the fake disk, and `content === savedContent`. When the typing shifted the task's line, the toggle is skipped with a refresh and an info toast (see the notes below); the typing is still kept, and it is covered by the "skips the toggle when the unsaved typing moved the task" test.
- [met] Daily append, daily prepend, and `new` with append, prepend and overwrite keep (or, for overwrite, snapshot) the unsaved typing — `deep-link-actions.ts:55` pre-saves before `readTextFile`; `deep-link.service.ts:266-269` pre-saves before the prepend/append/overwrite branches. Tests: daily append, daily prepend (exact `CLIP\n# Today\n<typed>\n` on tab and disk), new+append, new+prepend, and new+overwrite asserting the write order `[typed, 'CLIP']`. The overwrite snapshot holds: `saveFileByPath` calls `notifyAfterSave`, whose File History observer (`file-history.service.ts:190-196`) calls Rust `save_snapshot`, which dedupes only on an identical hash (`history.rs:57-74`), so the typed text gets its own snapshot before CLIP's.
- [met] When the pre-save fails, nothing is written and the tab stays dirty with its text — toggle: "writes nothing and keeps the tab dirty when the pre-save fails" (no `toggle_task_status` call, disk unchanged, `content`/`savedContent` unchanged, toast). Deep link: daily append failure plus `it.each` over new+append/prepend/overwrite with the same assertions.
- [met] A clean tab or a closed note behaves as today — `saveFileByPath` returns true without writing for a closed, virtual or clean tab (`editor.service.ts:161-165`), and `toggleTask` checks `isTabDirty` before it does anything. Tests: "does not write before the toggle when the tab is clean" (no `writeTextFile`, one toggle), deep-link "clean tab writes once, as before" and "closed note writes the disk copy, as before". The existing `tasks.service.test.ts` toggleTask suite runs with no tab open and still passes.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/tasks/ src/tests/lib/features/deep-link/ src/tests/lib/architecture/ src/tests/lib/raw-write-ratchet.test.ts`: exit 0, 23 files, 448 tests passed. My test verdict rests on these files, in particular `task-toggle-dirty-buffer.test.ts`, `deep-link-dirty-buffer.test.ts`, `tasks.service.test.ts`, `deep-link.service.test.ts`, `deep-link.service.race-audit.test.ts`, `raw-write-ratchet.test.ts` and `layer-rules.test.ts`. No other test imports `deep-link-actions.ts`.
- Not run, as this step requires: the full suite and `pnpm build` (deliver runs them). The diff does not touch `src-tauri/`, so no cargo run is needed.
- Layer baseline / BASELINE_SIZE / composition roots: unchanged.

## Notes verified (not findings)

- Line-shift guard (`tasks.service.ts:107-120`): this goes beyond the Issue's text, but the pre-save makes it necessary. The Tasks view's `lineNumber` comes from the index of the disk copy, and Rust's `toggle_task_in_content` uses the same 1-based `split('\n')` indexing as `lineAt`, so without the guard a save that shifted lines would make Rust tick a different line. The refresh reads fresh line numbers: `notifyAfterSave` → `applyNoteChange` sends `update_note_in_index` with no prior `await` (`note-change.service.ts:235`), and both it and `get_all_tasks_v2`/`toggle_task_status` are sync Tauri commands, so they run in order. I do not count this as scope creep.
- The Rust command is unchanged, as the Issue requires.
- Remaining race (typing between the pre-save and the write) is left unhandled, which follows the CLAUDE.md "no code for rare races" rule.

## Findings

1. nit — src/lib/features/tasks/tasks.service.ts:112 and src/lib/features/deep-link/deep-link.service.ts:248: a failed pre-save shows two error toasts, the generic "Failed to save file." from `saveFileByPath` plus the specific abort message. Fix (optional): leave it as is, or drop the generic one only if `saveFileByPath` gains a quiet mode later. Not worth an API change here.
2. nit — src/lib/features/tasks/tasks.service.ts:116: the guard compares line text only. If the typing shifted lines and line N now holds an identical line (e.g. a duplicated `- [ ] call mom`), the guard passes and Rust toggles that identical-looking line instead of the one the user clicked. This is harmless in practice. Fix (optional): none needed. A note in the JSDoc would make the limit explicit.
3. nit — src/tests/lib/features/tasks/task-toggle-dirty-buffer.test.ts: no case covers unsaved typing that edits the task line itself without shifting it (the guard should skip and refresh). The code path is the same as the shift case. Fix (optional): add one `it` with `onContentChange('# Groceries\n- [ ] buy oat milk\n')`.

## Resolution

1. Rejected, as the finding itself recommends: removing the generic "Failed to save file." toast would need a quiet mode on `saveFileByPath`, an API change not worth making for a rare failure path.
2. Fixed: the `toggleTask` JSDoc now states that the line check compares text only, so an identical line shifted into `lineNumber` is the one toggled.
3. Fixed: added "skips the toggle when the unsaved typing edited the task line itself" to `task-toggle-dirty-buffer.test.ts`.
