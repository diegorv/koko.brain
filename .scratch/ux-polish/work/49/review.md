VERDICT: APPROVED

## Acceptance criteria

- [met] Failing first: `note-action-bar.logic` tests pin the new default fold set and the reserved width — `src/tests/lib/features/note-action-bar/note-action-bar.logic.test.ts` pins `BAR_RESERVED_WIDTH` at 960. It expects all five actions folded at 0, 400, 600, 900 and 991 px, Neighbourhood alone back at 992 px and all five inline at 1120 px. Probe: with main's `note-action-bar.logic.ts` checked out, "folds everything for an unmeasured bar (width 0)" and "keeps every foldable action in More on a bar under 992 px" fail. With the branch version they pass.
- [met] A component test asserts the floating raw toggle is absent for a Markdown tab and present for a kanban, canvas and view tab — `src/tests/lib/app/EditorView.test.ts` "EditorView floating source toggle" mounts the real EditorView on four tabs: `.md`, `.kanban`, `.canvas` and `.view` (`fileType: 'collection'`). On `.md` it expects no "Switch to ..." button and does find the bar's "Show raw Markdown". Each of the other three renders exactly one toggle, and the canvas one is `top-3`, not `bottom-3`. The source is `EditorView.svelte:131` (`{:else if !isMarkdownNote}`) and `:107` (`top-3 right-3`). The xyflow MiniMap is bottom-right by default (`CanvasInner.svelte:602`), and `CanvasToolbar` sits at the bottom left, so the top-right corner is free. Probe: against main's EditorView, the Markdown and canvas cases fail.
- [met] Only one sidebar toggle is rendered for a Markdown note — `src/tests/lib/app/AppShell.test.ts` "renders one right-sidebar toggle, the tab-band one" mounts the whole shell with `alpha.md` open. With the sidebar visible and then hidden, it finds exactly one button whose title or aria-label matches /right sidebar/, the AppShell one (`AppShell.svelte:190`, not changed). `NoteActionBar.test.ts` asserts the bar has no sidebar button. The `PanelRight` button, `toggleRightSidebar`, `rightVisible` and `sidebarLabel` are gone from `NoteActionBar.svelte`, and none of them is left unused. Probe: both tests fail against main's bar.
- [met] The bar height matches the Properties header (both `h-10`) — `NoteActionBar.svelte:124` is `h-10`, and the Properties header at `PropertiesView.svelte:152` is `h-10`. "gives the note action bar the Properties header height (both h-10)" in `AppShell.test.ts` checks both rendered elements, and `NoteActionBar.test.ts` asserts `h-10` and not `h-9`. Probe: fails against main.

## Checks run by this review

- `taskpolicy -c background pnpm check`: exit 0. 216 files, 0 errors, 0 warnings.
- `taskpolicy -c background pnpm vitest run src/tests/lib/features/note-action-bar src/tests/lib/app/EditorView.test.ts src/tests/lib/app/AppShell.test.ts src/tests/lib/architecture`: exit 0, 14 files, 171 of 171 tests pass. The test verdict rests on these files. They are the four test files the diff changes (`note-action-bar.logic.test.ts`, `NoteActionBar.test.ts`, `EditorView.test.ts`, `AppShell.test.ts`), the other note-action-bar tests and the layer-rule tests.
- Failing-first probe: I wrote main's `note-action-bar.logic.ts`, `NoteActionBar.svelte` and `EditorView.svelte` into the worktree and ran the four changed test files. 12 tests failed and 67 passed (exit 1), and every failure is an assertion this Issue adds or changes. Then I ran `git checkout -- src/lib`, and the worktree is clean again.
- Search for labels the branch removed or moved ("Close/Open the right sidebar", "Switch to source mode", the five foldable labels): the only E2E specs that still click the floating "Switch to source mode" are `canvas-view.spec.ts:51` and `kanban-view.spec.ts:54`, and those tabs keep their toggle. No unit test still expects an inline foldable button without first widening the bar.
- The diff does not touch `layer-baseline.json`, `BASELINE_SIZE`, the composition roots or `ledger.md`.
- Scope: the help page edit (`help/documentation/03-editor.md`) and the E2E updates follow directly from the behavior change. I found no unrelated edits.
- Not run here: the E2E specs (outside the gate), the full suite and `pnpm build` (deliver's).

## Findings

1. **minor**, `help/documentation/03-editor.md:59`: the Note width row in the new "These actions start in More" table still says "Highlighted while wide." In More, the item only swaps its label and icon (`NoteActionBar.svelte:192-197`, with no pressed state). It is highlighted only when it sits inline on a wide bar. Fix: say that the menu item reads "Use the normal note width" while wide, and that the inline button is highlighted.
2. **nit**, `e2e/specs/note-action-bar.spec.ts:164` (also `source-mode-toggle.spec.ts` and `rail-shell.spec.ts:901-903`): no one has run the updated E2E specs, and the 3000 px viewport for the unfold case is an estimate (the bar needs at least 1120 px after the rail, navigator, note list and right sidebar). Fix: run `bash scripts/e2e.sh` on these three specs before or right after delivery.
3. **nit**, `src/lib/features/note-action-bar/note-action-bar.logic.ts:98`: "into More by default" is done through width, not as a fixed default. With the side panes hidden, a 1440 px window gives the bar about 1390 px, and all five actions come back inline. That matches option one of `work/layout.md` R4 ("raise `BAR_RESERVED_WIDTH` or default them to folded"), and the Issue Notes leave the visible set to the owner, so no change is needed. It is listed here so the owner check covers it.

## Resolution

1. Fixed: `help/documentation/03-editor.md` Note width row now says the More item reads "Use the normal note width" while wide and the inline button is highlighted.
2. Done: `bash scripts/e2e.sh e2e/specs/note-action-bar.spec.ts e2e/specs/source-mode-toggle.spec.ts e2e/specs/rail-shell.spec.ts` exit 0, 45 passed (log: `brain.worktrees/test-logs/ux-polish/49-e2e.log`). The 3000 px unfold viewport holds.
3. No change: width-driven folding is the intended option one of `work/layout.md` R4; left for the owner's taste check.
