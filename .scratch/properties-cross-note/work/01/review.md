VERDICT: APPROVED

# Issue 01 review: panel commit writes stale properties

Reviewed `git diff main...HEAD` at 1e7a62cb (commits b5a0eec1, 0e3619a6, 1e7a62cb).

## Acceptance criteria

- [x] **Both repro scenarios are tests that fail first and pass after the fix.** Met.
  `src/tests/lib/features/properties/properties-cross-note.test.ts` holds both windows
  (L85-99 window 1, L101-122 window 2). Probe: with `src/lib/features/properties/` checked
  out from `main`, all 12 tests fail. The first failure for window 1 and the `it.each` cases is
  the new `sourcePath` precondition (L90, L144), so I re-ran a copy with every `sourcePath` and
  panel assertion stripped: the data assertions alone still fail on `main` (B's content becomes
  `---\nstatus: doing\nprioridade: media…`, L79). With the fix, all 12 pass.
- [x] **A commit for note A while note B is active never changes B's content or file.** Met.
  `propertiesMatchActiveNote()` (`properties.service.ts:44-49`) gates `commitChanges`
  (L57) and `commitLifecycleChange` (`lifecycle.service.ts:15`). That covers every writer
  of `propertiesStore` into the editor: the only external callers of the mutators are
  `PropertiesView.svelte` and `LifecycleActions.svelte`. The test `it.each` (L133-152) checks
  all 5 property mutators and 3 lifecycle actions. B's tab content is unchanged, and
  `writeTextFile` is never called for B after 2500 ms of fake time.
- [x] **After a tab switch the panel shows the new note's properties even when a panel edit
  happened within 300 ms before the switch.** Met. `consumeSkipNextParse(path)`
  (`properties.service.ts:31-35`) only skips for the note the commit wrote and always clears.
  The window-2 test (L101-122) shows B parsed and a later commit writing only B's own
  properties. In the real view, the immediate parse on a path change
  (`PropertiesView.svelte:108-112`) makes this happen at once. That branch has no test
  (finding 2) and has one stale-flag hole (finding 1). Neither one corrupts data.
- [ ] **Remove the item from `.scratch/suspected-bugs/notes-2026-10-30.md` and
  `.scratch/properties-cross-note/repro/` in the closing commit.** Pending by design (closing
  commit). Item 1 is the one to remove. Item 2 (table cell move) stays, so the file is not
  emptied.

## Other checks

- Layers: `lifecycle.service.ts` imports `properties.service.ts`, both in the same feature
  folder. There is no import cycle (`properties.service.ts` does not import lifecycle).
- Scope: `lifecycle.service.ts` is not in the Issue's Touches. It has the same bug
  (properties plus the active body written into the active tab), and the cross-note test covers it. Justified.
- Teardown: `resetProperties()` clears both `skipNextParseFor` and `sourcePath`. Its caller,
  `app-lifecycle.service.ts:623`, is unchanged, and its tests pass.
- Tab opening: `openFileInEditor` adds the tab with its content in one step
  (`editor.service.ts:110`), so the immediate parse never sees a path with empty content first.
- JSDoc is present on the new getter, the store state, the guard and the changed signatures.
  Tabs are used for indentation.

## Test verdict rests on

Run by me in the worktree (`./node_modules/.bin/vitest run`):
- `src/tests/lib/features/properties/` (11 files, including the new
  `properties-cross-note.test.ts` and the changed `properties.service.test.ts`,
  `properties.store.test.ts`, `lifecycle.service.test.ts`)
- `src/tests/lib/core/app-lifecycle/app-lifecycle.service.test.ts` (calls `resetProperties`)

Result: 12 files, 528 tests passed. `pnpm check`: 0 errors, 0 warnings. Probes: the new test
against `main` sources, as described above, and the finding-1 probe below. All probes were
temporary and have been removed.

## Findings

1. **Low:** `src/lib/features/properties/PropertiesView.svelte:104-112` with
   `src/lib/features/properties/properties.service.ts:44-48`. The immediate-parse branch
   (active path differs from `sourcePath`) still checks the skip flag. When the guard
   re-parses another note, `skipNextParseFor` stays armed. The panel can then keep the wrong
   note's properties:
   - Commit on A, which sets the skip flag to A.
   - Switch to B, then commit in the same tick before the effect flushes. The guard
     re-parses B, so `sourcePath` is now B, and the flag still names A.
   - Switch back to A. The immediate branch consumes the flag for A and skips the parse.

   I reproduced this with a probe that copies the real effect (both branches): active A,
   `sourcePath` B, B's keys shown. Data stays safe, because the next commit is refused and
   re-parses A. Today's UI cannot reach this state, because every caller is a click handler
   and effects flush between tasks. Fix: on the path-change branch, clear the flag and parse
   without checking it. A skip is never right there, because a commit always sets
   `sourcePath` to the path it armed. Alternatively, clear `skipNextParseFor` in
   `propertiesMatchActiveNote` when it re-parses. Add a test for the sequence above.
2. **Low:** `src/lib/features/properties/PropertiesView.svelte:98-117`. The immediate-parse
   branch has no test. The helper in `properties-cross-note.test.ts:33-50` copies only the
   debounced branch, so the "panel never shows another note's properties" part of the
   Issue is checked only by `pnpm check`. Fix (optional): move the branch decision into a
   service function the effect calls, for example
   `syncPropertiesFromActiveTab(path, content): boolean`, which returns true when it parsed
   immediately. Test it, including finding 1's sequence. The effect would then hold only the
   timer.
3. **Info:** `src/lib/features/properties/PropertiesView.svelte:98`. The comment "Re-parse
   properties when active tab content changes (debounced)" is now only half true. Change it
   to say the parse is debounced for content edits and immediate on an active-path change.
4. **Info (pre-existing, out of scope):** `properties.service.ts:44-49`. The guard compares
   paths, not content. Within the same note, frontmatter typed in the editor less than 300 ms
   before a panel click is still overwritten by the stale store. This is not a cross-note
   write. It could be a follow-up Issue if the owner wants one.
5. **Info:** In the commit messages, the Files line ranges are off. 0e3619a6 gives
   `properties-cross-note.test.ts:1-155`, and the file has 160 lines. b5a0eec1 gives
   `discovery.md:1-33`, and the file has 24 lines. Do not amend. Noted for the record.
