VERDICT: APPROVED

## Acceptance criteria

- [met] Failing first: a component test at a narrow width asserts the title text is not truncated below 4 characters and the two actions are icon buttons with accessible names — `src/tests/lib/features/rail-shell/RailNoteList.test.ts:193-223` mounts the Today lens in a 200px target and asserts the label carries `flex-1` + `min-w-16` (64px, the 4-character floor at `--text-title: 15px` / 600, `src/app.css:87-89`), and that `[data-note-list-header-action]` and `[data-note-list-new]` are `BUTTON`s with an svg, empty text, a non-empty `title` and `aria-label` "Daily note" / "New here". Failing-first verified by probe: with main's `RailNoteList.svelte` swapped in, the test fails with `expected "truncate text-title" to contain "flex-1"` (1 failed); restored afterwards, worktree clean. jsdom has no layout, so the floor is pinned through the class, not a measured width (see finding 3).
- [met] The count color pair is added to the theme readability pairs (or asserted in a test) at 4.5:1 in both built-in themes — the count now uses `text-tab-text-inactive` (`RailNoteList.svelte:425`); `READABILITY_PAIRS` already holds `['ui', 'tabTextInactive', 'ui', 'tabBar', 4.5]` (`theme-builder.logic.ts:119`), checked for every built-in theme by `theme-builder.logic.test.ts:239` ("holds for every pair in every built-in theme"), which I ran and passed. The component test pins both the token on the count and the pair's presence (`RailNoteList.test.ts:218-219`), so a later token change or pair removal fails it.

## Findings

1. minor — `src/lib/features/rail-shell/rail-shell.types.ts:161`: the JSDoc of `RailHeaderAction.label` still says "Button text", but the label is no longer rendered as text; it is now the button's accessible name (`aria-label`, `RailNoteList.svelte:475`). The branch made this comment wrong. Fix: change it to "Accessible name of the icon button" (or similar).
2. minor — `help/documentation/01-getting-started.md:57`, `help/documentation/02-file-explorer.md:18`, `help/documentation/25-types-and-relationships.md:74`: user docs say "Click **New here** in the note list header", but the button now shows only a + icon (name in `aria-label` / tooltip "Create a note in this list"). Fix: describe it as the **+** (New here) button in the note list header, or follow up in a docs Issue.
3. nit — `src/tests/lib/features/rail-shell/RailNoteList.test.ts:194`: `target.style.width = '200px'` has no effect in jsdom (no layout), so it suggests a narrow-width measurement the test does not perform. The assertions on `flex-1` / `min-w-16` are what carry the criterion. Fix: drop the line or add a short comment that the width documents intent only.
4. nit — `src/lib/features/rail-shell/RailNoteList.svelte:425`: `ml-auto` on the count is now a no-op (the title is `flex-1`). Discovery notes it was kept on purpose; harmless.

No correctness bugs found: `headerAction.icon` is required by `RailHeaderAction`, so every header action still renders a visible glyph; the E2E specs find the buttons by role name (`e2e/specs/rail-shell.spec.ts:194, :218, :239, :391, :411, :821`), which `aria-label` preserves. No scope creep: the diff touches only `RailNoteList.svelte`, its test file and the Issue's discovery note. No layer-baseline or composition-root changes.

## Checks run by the reviewer

- Typecheck: `taskpolicy -c background pnpm check` exit 0, 0 errors, 0 warnings.
- Tests (my verdict rests on these): `taskpolicy -c background pnpm vitest run src/tests/lib/features/rail-shell/RailNoteList.test.ts src/tests/lib/features/rail-shell/RailNoteList.view.test.ts src/tests/lib/core/settings/theme-builder.logic.test.ts` exit 0, 3 files, 121 passed.
- Failing-first probe described under criterion 1.
- Not run: full suite, `pnpm build` and E2E (deliver's to run); the header was not checked visually in the running app.

## Resolution

1. Fixed: `RailHeaderAction.label` JSDoc now reads "Accessible name of the icon button (its `aria-label`)".
2. Fixed: the three help pages now say "the **+** (New here) button in the note list header".
3. Fixed: dropped the `target.style.width = '200px'` line; the class assertions carry the criterion.
4. Rejected (no change): `ml-auto` on the count is a harmless no-op, kept on purpose per discovery; removing it is churn outside the criteria.
