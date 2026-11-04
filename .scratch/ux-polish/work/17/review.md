VERDICT: APPROVED

## Acceptance criteria

- [met] Failing first: class assertions that the row element carries `rounded-md` and no bare `rounded` token (`/(^|\s)rounded(\s|$)/`), following the existing class assertions in each file: `src/tests/lib/features/rail-shell/FilesNavigator.test.ts` (the row loop at about line 147), `TypesNavigator.test.ts` (one type row and one lens row), `RailNoteList.test.ts` (the `row('beta')` NoteRow at about line 243) and `src/tests/lib/plugins/one-on-one/MyPeopleSection.test.ts`. They fail before the change and pass after — assertions added at FilesNavigator.test.ts:149-151 (row loop), TypesNavigator.test.ts:180-182 (`rowEls()` type rows) and :444-445 (`viewEl(PROJECTS)` lens row), RailNoteList.test.ts:245-247 (`row('beta')`), MyPeopleSection.test.ts:136-140 (new case on `rowEl('Ana')`). Probe: with the four components checked out from main, the four files ran exit 1, 5 failed / 135 passed, the 5 failures being exactly these assertions; restored to HEAD they pass (see Tests below).
- [met] `TasksView.svelte:201` and `EventCalendarNeedsAttention.svelte:44` have no component test; their change is held by the radius-scale baseline, whose counts for those two files drop by one — both lines went from 1 to 0 and were removed from the `bare rounded` baseline (radius-scale.test.ts, zero-count files are omitted by `scan()`); the ratchet compares with `toEqual`, so reverting either site makes it fail. A grep of each file now finds no bare `rounded`.
- [met] The already-`rounded-md` sites listed above are unchanged — `git diff main...HEAD --name-only` touches none of Rail.svelte, TableOfContentsPanel.svelte, BacklinksPanel.svelte, LinkItem.svelte, OutgoingLinksPanel.svelte, TagItem.svelte or SettingsPanel.svelte.
- [met] The radius-scale baseline is lowered for the six files and the ratchet passes — FilesNavigator 3->2, TypesNavigator 3->1, NoteRow 5->3, MyPeopleSection 2->1, TasksView and EventCalendarNeedsAttention 1->removed. A grep of the remaining bare sites matches the new counts exactly (FilesNavigator :440/:458, TypesNavigator :238, NoteRow :57/:99/:109, MyPeopleSection :67), and radius-scale.test.ts passes.

## Checks run by the reviewer

- `taskpolicy -c background pnpm check`: exit 0, 0 errors, 0 warnings.
- Targeted tests, exit 0, 13 files / 366 tests passed: radius-scale, FilesNavigator (+ .menu, .new-view), TypesNavigator, RailNoteList (+ .view), MyPeopleSection, NoteRowMenu (+ .favorite, .convert-to-view), EventCalendarView, EventCalendarSection. The test verdict rests on these files. TasksView has no component test (e2e/specs/tasks-view.spec.ts asserts no class string; grep).
- Red probe described under the first criterion; worktree clean afterwards.
- The full suite and `pnpm build` are deliver's to run.

## Scope and correctness

The diff is exactly the eight class swaps the Issue lists, the baseline edit and the four test additions. The nested controls the Issue keeps (NoteRow :57/:99/:109, FilesNavigator :440/:458) and the other inner buttons (TypesNavigator :238, MyPeopleSection :67) keep bare `rounded`. No text, size or color class changed. No layer-baseline or composition-root change.

## Findings

1. nit, src/lib/features/note-list/NoteRow.svelte:44: the rename wrapper's swap has no component assertion; only the NoteRow baseline count (5->3) holds it, and that count cannot tell which two sites changed. Fix (optional): in RailNoteList.test.ts, set `fsStore.renamingPath` to a row's path and assert the wrapper carries `rounded-md`.
2. nit, src/tests/lib/features/rail-shell/FilesNavigator.test.ts:151 (and the same regex in TypesNavigator.test.ts, RailNoteList.test.ts, MyPeopleSection.test.ts): radius-scale.test.ts notes that Tailwind's source detection scans src/tests, and the regex text `rounded(` likely yields a `rounded` candidate. Harmless today because the app still uses bare `rounded`; once Issue 18 removes the last site, these tests would keep `.rounded` in the bundle. The Issue prescribes this regex, so no change here; Issue 18 can build it from parts as radius-scale.test.ts does.

## Resolution

1. Fixed: RailNoteList.test.ts gains "a row being renamed keeps the 8px row corner", which sets `fsStore.renamingPath` and asserts the rename wrapper (the input's parent) carries `rounded-md` and no bare `rounded`. Red probe: with NoteRow.svelte:44 back to `rounded` the test fails; restored it passes.
2. Rejected for this Issue: the Issue prescribes this regex and the bundle effect only appears once Issue 18 removes the last bare `rounded` site. Left for Issue 18 (`.scratch/ux-polish/issues/18-bare-rounded-to-rounded-xs.md`) to build the regex from parts, as radius-scale.test.ts does.
