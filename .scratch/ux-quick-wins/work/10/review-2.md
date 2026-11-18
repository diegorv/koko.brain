VERDICT: APPROVED

Re-review, round 2, of the fix commits after `5d45a3f7f` (the first commit of `review.md`): `211bddaa2` (code and tests) and `cfc9600e0` (Resolution section).

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | blocker | resolved | `KanbanCard.svelte:135-146`: the grow effect captures `inputEl` and measures inside `tick().then(...)`, after `bind:value` has written the value set by the open effect (`:127-133`). New test "opens a long card at its full height" opens a 42-character card under the length-dependent `scrollHeight` stub and expects `60px` with `textarea.value` equal to the full text, which is exactly the case that gave `20px` before. "grows when a wikilink suggestion rewrites the text" covers a programmatic `editText` change through the real suggestion flow (real `fsStore` file tree, reset in `afterEach`). Both pass. |
| 2 | major | resolved | `KanbanView.svelte:521`: the board root carries `outline-none`, matching the `EventCalendarView` precedent. Pinned by "the board root draws no focus ring when focused from code" (class assertion; the real-browser `:focus-visible` probe was not re-run, but `outline-none` sets `outline-style: none` over the base layer's colour-only rule). |
| 3 | minor | resolved | The Enter test asserts `document.activeElement` is not the root right after `press(Enter)` and before `settle()`, so an early focus move fails it. |
| 4 | nit | resolved | The preview clamp test uses `mockResolvedValueOnce`. |

## Acceptance criteria re-checked

- [met] With a stubbed `scrollHeight`, typing in the edit textarea sets its height to it. — "sets the textarea height to its scrollHeight on every input" awaits `settle()` after each `typeInto` and expects 20px, 60px, 20px; passes. The open case is now covered by its own test.
- [met] After Enter, `document.activeElement` is the board root and the harness persisted exactly once (`getPersistCount`); after Escape, focus is the board root and nothing persisted; after a click elsewhere (blur), the commit persists once and focus is not moved to the root. — the three "focus after the edit" tests pass; the Enter test now also checks that focus does not move before the textarea unmounts.
- [met] Frontend gate: pnpm check and pnpm vitest run pass. — `pnpm check` exit 0 (236 files, 0 errors, 0 warnings, run by me); targeted files pass (below). The full suite is deliver's to run.

## Findings

None open, none new.

Checked for regressions: no test was weakened or deleted (the old combined test was split, and the "on open" claim moved to a test that discriminates); the deferred measure holds a captured element, so a pending `tick()` after unmount only writes a style on a detached node; no scope creep (two source lines plus tests); `layer-baseline.json` and `BASELINE_SIZE` untouched; no E2E selector changed.

## Checks run (this review)

- `pnpm check`: exit 0.
- `pnpm vitest run src/tests/lib/plugins/kanban/KanbanView.test.ts src/tests/lib/chrome-state-styles.test.ts src/tests/lib/pane-toolbar.test.ts src/tests/lib/menu-item-anatomy.test.ts src/tests/lib/plugins/kanban/KanbanWikilinkSuggestions.test.ts`: exit 0, 5 files, 77 of 77 passed.
