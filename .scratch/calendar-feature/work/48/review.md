VERDICT: APPROVED

# 48 review: case-only name collisions get a numbered file

Reviewed `git diff main...HEAD` (6fa84294, 9c153b41, 5ab22882 on top of main 0da29ab9). No PRD or plan file exists for `calendar-feature`; reviewed against the Issue, CLAUDE.md and docs/TESTING.md.

## Acceptance criteria

- [x] **Both dedupe paths compare names case-insensitively.** Met. Both `createFile` (`src/lib/core/filesystem/fs.service.ts:122`) and `resolveTypedNoteTarget` (`src/lib/features/type-definitions/type-definitions.service.ts:72`) call `generateUniqueName`, which now folds the sibling set and every candidate with `toLowerCase()` (`src/lib/core/filesystem/fs.logic.ts:196-197,218`) and returns the name in the requested casing. Rust `create_note` (`src-tauri/src/commands/vault.rs:837`) refuses on `Path::exists()`, which is true for a case-only variant on APFS; the TS dedupe now agrees with it.
- [x] **Tests: case-only collision gets ` 1`; distinct names unchanged.** Met. `fs.logic.test.ts:624-642` (case-only collision gives `standup 1.md`, a numbered case variant is skipped, extension case, directory case, names differing by more than case kept); `fs.service.test.ts:436-446` (`createFile('/vault', 'new.md')` next to `New.md` writes and returns `/vault/new 1.md`); `type-definitions.service.test.ts:415-428` (`createTypedNote` titled `standup` next to `Standup.md` returns `/vault/standup 1.md` and hands `standup 1` to `buildContent`). Without the fold, each of these returns the unnumbered name, so they fail on main.

## Checks run by the reviewer

- `pnpm vitest run` on every test file that references `generateUniqueName`, `createFolder`, `createView`, `planTitleChange`, `createTypedNote` or `createFile` (17 files: `fs.logic.test.ts`, `fs.service.test.ts`, `type-definitions.service.test.ts`, `TypeSidebar.test.ts`, `event-calendar-form.logic.test.ts`, `event-calendar.service.test.ts`, `kanban.service.test.ts`, `templates.service.test.ts`, `TemplatePicker.test.ts`, `collection.service.test.ts`, `canvas.logic.test.ts`, `canvas.service.test.ts`, `command-palette.service.test.ts`, `tauri-listeners.service.test.ts`, `wikilink-navigation.test.ts`, `click-handler.test.ts`, `queryjs-block-field.test.ts`): 17 files, 672 tests passed. The test verdict rests on these, chiefly the first three.
- `pnpm check`: 0 errors, 0 warnings.
- Full gate not run (deliver runs it).

## Correctness review

- Other callers of the shared helper: `createFolder` (`fs.service.ts:151`) now numbers `Projects` next to `projects`. Before, recursive `create_folder` silently reused the existing folder on APFS and the code expanded a path with the wrong casing, so the new behavior is better. `createView` (`type-definitions.service.ts:230`) gets the same fold, which is harmless. `planTitleChange` (`event-calendar-form.logic.ts:215`) already passes lowercased inputs, so a second fold changes nothing; its `unique !== self` comparison still compares lowercase strings. Its tests pass unchanged.
- Rename does not go through `generateUniqueName`, so a case-only rename of a note onto itself is not numbered by this change.
- Layer rules: the change stays in `core/filesystem/fs.logic.ts` (pure, no framework imports). No store or service orchestration changed.
- Comments: the new JSDoc gives the reason (APFS, Rust refusal) and does not narrate the change. The removed `createTypedNote` clause is correct: dedupe now avoids the case-folded refusal, and the remaining cause is the accepted same-instant race already described below it.
- Scope: no scope creep. The discovery records the side effect on `createFolder` / `createView` and accepts it.

## Findings

1. **Low (optional)**, `src/tests/lib/core/filesystem/fs.service.test.ts:494`: `createFolder` changes behavior for a case-only variant (it used to reuse `projects` silently, and now creates `Projects 1`), but no service test covers it. Only the directory branch of `generateUniqueName` is covered (`fs.logic.test.ts:636-638`). Fix: add a `createFolder` case next to `generates unique name when folder already exists` with `readDir` returning `projects` and `createFolder('/vault', 'Projects')`, asserting `create_folder` gets `/vault/Projects 1`, `expandedDirs` has it and the result equals it. Not blocking, because `createFolder` itself is unchanged.
2. **Info**, commit 9c153b41 Files block: it cites `src/tests/lib/core/filesystem/fs.service.test.ts:428-438`, but the added test is at `:436-446`. Fix: none needed. Do not rewrite history for a line-range typo.
3. **Info**, `src/lib/core/filesystem/fs.logic.ts:196`: `toLowerCase()` does not normalize Unicode (NFC vs NFD). APFS also ignores normalization, so a title typed as NFC `Café` next to an NFD `café` on disk would still collide in Rust. This is outside this Issue, which is about case-only collisions; note it as a possible follow-up (`.normalize('NFC').toLowerCase()`) only.
