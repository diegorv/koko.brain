VERDICT: APPROVED

## Acceptance criteria

- [met] Failing first: two files with identical block text and a script that renders `kb.current().file.path` each show their own path — `queryjs-block-widget.test.ts` "two notes with identical block text each show their own result" (script `kb.paragraph(kb.current()?.file.path ...)`, real stores, mocked invoke) passes. Mutation probe: reverting `resultKey` to return `jsContent` only makes it fail (domB re-attaches domA), so it is a real failing-first test.
- [met] Failing first: `execute` started for file A, with the active tab switched to B before the await resolves, still runs against A — test "execute runs against the file toDOM saw, even when the tab switches during the await" holds `get_all_vault_entries_v2` open, switches the tab, then releases; it asserts the rendered path is A and the result is cached under A only. Mutation probe: restoring `currentFilePath: editorStore.activeTabPath ?? ''` makes it fail.
- [met] Failing first: dropping a cached result calls `destroy()` on the charts it created — the store tests (`invalidate`, `clearResults`, `reset`, an overwriting `setResult`) and the widget `destroy(dom)` tests assert `destroy` spies on tracked charts. `kb-ui.test.ts` "registers the chart so dropping its container destroys it, once" proves `kb.ui.chart()` registers the real constructor result. Mutation probe: removing `trackChart(...)` in `kb-ui.ts:667` makes that test fail.
- [met] The `autoRunQueries` matrix tests stay green (CLAUDE.md live-preview rule 10; manual mode never marks `autoRunOnFirstOpen`) — `queryjs-block-widget.test.ts`, `queryjs-session.store.test.ts`, `settings.store.test.ts` and `invariants-harness.test.ts` all pass. The Run-button click handler still has no `markAutoRun` call; the diff only threads `filePath` through it.
- [met] ADR 0010 amendment written and dated, and CLAUDE.md live-preview rules 9 and 10 updated (they describe the cache as `Map<contentHash, HTMLElement>` keyed by `hasResult(jsContent)`) — `docs/adr/0010-queryjs-kb-api-caching.md` has "Amendment (2026-11-03)", and the stale `reset()` lifecycle line is corrected to `clearResults()`. CLAUDE.md rule 9 now reads `Map<filePath + jsContent, HTMLElement>` and adds the chart disposal rule. Rule 10 now reads `getResult(filePath, jsContent)`, detached.

## Findings

1. minor — `help/documentation/13-queryjs.md:36`: the user doc still says the result cache is "keyed by the script's content hash". After this change a block that appears in two notes renders once per note, which users can see. Fix: say the cache is keyed by the note and the script text.
2. minor — `src/lib/plugins/queryjs/queryjs-block-widget.ts:189,289`: the Run and retry handlers call `container.replaceChildren()` and never call `destroyChartsIn(container)`. A script that drew a chart and then threw leaves that chart in Chart.js's registry when the user clicks retry. A related case: a run whose widget was destroyed mid-flight (skipped through `runningContainers`) and then failed is never cached, so its charts are never destroyed either. Both are rare and recoverable. Fix: call `destroyChartsIn(container)` before `replaceChildren()` in the retry handler (and in the Run handler for symmetry), and destroy charts in the `catch` of `execute` when the container is no longer connected.
3. nit — `src/lib/plugins/queryjs/queryjs-block-widget.ts:62`: `runningContainers` and its JSDoc sit between the class's long JSDoc block and `export class QueryjsBlockWidget`, so the policy-matrix doc now attaches to the `const` and not to the class. Fix: move the `runningContainers` declaration above the class JSDoc.
4. nit — `docs/adr/0010-queryjs-kb-api-caching.md:65`: the "Cache by widget identity" alternative still gives the rationale "we want one cache entry per distinct script body", which the amendment overturns. The amendment does address it. Fix: add "(superseded by the 2026-11-03 amendment)" so that line does not read as current.
5. nit (pre-existing, not caused by this diff) — CLAUDE.md rule 10 says the "manual never marks `autoRunOnFirstOpen`" invariant is "exercised by the session-store + widget tests". No widget test clicks ▶ Run in manual mode and asserts `hasAutoRun(path) === false`. A follow-up could add it.

## Correctness review notes (no finding)

- Tab switches go through `view.setState`, which builds a new `DocView` (`@codemirror/view` 6.43.15, `setState` at dist/index.js:8143-8144). An `eq()` that ignores the path therefore cannot reuse note A's widget DOM in note B. `EditorView.destroy()` also destroys the `docView` (:8732), so `WidgetType.destroy` runs when the editor unmounts.
- I traced chart disposal through these paths: scroll-out/in of a cached result (kept), save while visible (the store keeps it, then the widget's `destroy` disposes it on removal), two identical blocks in one note (the replaced result is disposed when its widget goes away), and `teardownVault` / Settings "Clear cache" (`reset()`). I found no path that destroys a chart that is still visible.
- Layer baseline and `BASELINE_SIZE` are unchanged. `queryjs-charts.ts` is imported only within `plugins/queryjs/`.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/plugins/queryjs/ src/tests/lib/app/boot.test.ts src/tests/lib/core/trash/trash.service.test.ts src/tests/lib/architecture/`: exit 0, 20 files, 650 passed, 1 todo.
- `pnpm vitest run` on `fenced-block-renderers.test.ts`, `block-reveal.test.ts`, `queryjs-block-field.test.ts`, `special-fence-detection.test.ts`: exit 0, 102 passed.
- `pnpm vitest run` on `settings.store.test.ts` and `invariants-harness.test.ts`: exit 0, 76 passed.
- Three mutation probes (content-only key, active-tab read after await, untracked chart). Each made its criterion test fail. All were reverted with `git checkout`, and the worktree was clean afterwards.
- Full suite and `pnpm build` not run: deliver's.

## Resolution

All five findings are fixed; none rejected.

1. `help/documentation/13-queryjs.md`: the result cache is now described as keyed by the note and the script text, so a block shared by two notes renders once per note.
2. `queryjs-block-widget.ts`: the Run and retry handlers call `destroyChartsIn(container)` before `replaceChildren()`, and the `execute` catch destroys the charts when the container is detached (its widget was destroyed mid-flight, so `destroy()` skipped it). New widget tests "destroys the charts of a failed run when the user clicks Run again" and "destroys the charts of a run that failed after its widget was destroyed" failed before the fix.
3. `runningContainers` moved above the class JSDoc, so the policy-matrix doc attaches to `QueryjsBlockWidget` again.
4. ADR 0010's "Cache by widget identity" rationale is marked superseded by the 2026-11-03 amendment.
5. New widget test "clicking Run in manual mode runs the block without marking the file as auto-run". A probe adding `markAutoRun` to the Run handler made it fail; reverted.
