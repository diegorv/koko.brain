VERDICT: APPROVED

Re-review, round 2, of the fixes after `.scratch/tasks-view-ux/work/245/review.md` (`git diff a649f8b92..HEAD`, which is fix commit 34880c6ec plus the Resolution section of the review file). The fix changes `src/lib/features/tasks/SourcesPanel.svelte` and `src/tests/lib/features/tasks/TasksView.sources.test.ts` only.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `SourcesPanel.svelte` `refocus()` calls `flushSync()` and then focuses the first connected candidate from `pick(panelEl)`. `removeCard` tries `[data-remove-card]` in the card now at `ci`, then at `ci - 1`, then `[data-add-card]`. `removeClause` tries `[data-remove-clause]` at `li`, then `li - 1`, then the card's `[data-add-clause]`. `removeEntry` gets the index before the removal and tries `[data-remove-entry]` at that index, then `index - 1`, then the list's input. The `data-*` attributes reach the DOM because `Button` spreads `restProps` (`button.svelte:54,67,78`), and on the dropdown trigger through `{...props}`. The order effect (`TasksView.svelte:382-399`) runs inside the `flushSync()`, while focus is on `<body>`. It can put focus on a row, and then `refocus` moves it back into the panel. A later refetch finds focus in the panel, `focusIsFree(false)` is false, and focus stays there. The two new tests assert `document.activeElement` after each kind of removal. |
| 2 | minor | resolved | New case "Remove card drops the card and its rows, ..." removes the last folder card, then the `#to-list` card, then the remaining card. It asserts `tasksStore.query.sources`, `rowTexts()`, `settingsStore.tasksView` `{ version: 1, sectionTag: '' }` and focus (previous card's Remove card, the sole Remove card, then Add card). |
| 3 | nit | resolved | The exclude entry's remove control is `<Button variant="ghost" size="icon-sm" class="size-5 text-muted-foreground">` with the same `aria-label`. The tests that look it up by name (`Remove excluded folder A`) pass. |
| 4 | nit | rejection stands | Excludes stay session-only, and a `setTaskExcludes` passthrough would hold no logic. The previous review already called this a recorded default with no behavior difference. |
| 5 | nit | rejection stands | Confirmed: `parseSectionTags('#a #b').join(' ')` gives back `#a #b`, so the suggested fix writes the same string and does not change the split after a restart. A real fix needs input validation on the heading clause, which is outside this Issue, and the input is unusual. |

## Acceptance criteria re-checked

- [met] Failing test first, a new `src/tests/lib/features/tasks/TasksView.sources.test.ts` with real stores: click "Edit", "Add card", "Add clause" > "Folder", type `Projects`: only `Projects` tasks are listed and the sentence says so; turn the "Templates folder" switch off: a template task comes back. Fails today (no panel). — The fix only adds cases to this file. The original case is unchanged and passes in the targeted run below.
- [met] Same file: a folder card that matches no note shows "No note matches the sources", and its "Edit sources" action sets the Edit button's `aria-expanded` to `true` and renders the panel. The same for "Every matching note is excluded" and "Edit excludes". — Unchanged by the fix, and it passes.
- [met] Same file: "Clear" shows only when `sources` is not empty, and clicking it lists every non-excluded task. — Unchanged by the fix, and it passes. Clear does not go through `refocus`.
- [met] e2e: every step that cleared the textbox clicks the sentence's Clear button and the specs still assert the listed tasks. Issue 242's two-tag test adds a `#work` heading card through the panel and asserts both tagged tasks visible and the untagged one at `toHaveCount(0)`. — `e2e/specs/tasks-view.spec.ts` is unchanged since round 1, which passed it (13 passed). The fix touches only the remove handlers and the exclude remove control, and the spec uses neither (grep finds no Remove or exclude-remove locators). I did not re-run the spec.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/tasks src/tests/lib/architecture src/tests/lib/pane-toolbar.test.ts src/tests/lib/chrome-state-styles.test.ts`: exit 0, 29 files, 810 tests passed. This includes `TasksView.sources.test.ts` and the other TasksView suites, which share the order effect.
- No test was deleted or weakened. The fix diff adds two `it` blocks and removes nothing.
- Layer baseline, `BASELINE_SIZE` and the composition roots are unchanged.
- I did not run the full suite. Deliver runs it.

## Findings

None open or new.
