# 19 discovery: help/ QueryJS examples as contract tests

No spec.md for this feature; the Issue is the spec.

## Files that change
- `src/lib/plugins/queryjs/kb-api.ts`: new exported `runQueryjsBlock(api, jsContent)` (IIFE wrap, `new Function('kb','dv',…)`, `awaitAllPending`, rethrows). A free function, not a KBAPI method: `kb-api-contract.test.ts` snapshots the prototype keys, and a method would be script-reachable.
- `queryjs-block-widget.ts:196-202`: calls `runQueryjsBlock(api, this.jsContent)`; import widened on the existing `kb-api.js` line, so the layer baseline gains no key. Session-store calls stay in `execute`.
- `src/tests/lib/plugins/queryjs/kb-api.test.ts`: runner unit tests (unawaited `kb.view` finishes before resolve, throw rethrows, no `input` param).
- New `src/tests/help/queryjs-contract.test.ts` + its `__snapshots__/` file.

## Plan (commits)
1. Runner test (red), runner + widget switch (green). Widget test unchanged.
2. Contract test: fence-aware scanner over every `help/examples/**/*.md` (copied from `examples-scoping.test.ts:fencedBlocks`, langs `queryjs`/`dataviewjs`); scripts by walking `**/__system/queryjs/*.js`. Count assertion >= 93 / >= 35; the nested block in `live-preview-regressions/06-fenced-code.md` asserted skipped.
3. Fixture vault per example root (`/vault` = the root): `buildNoteRecord(path, content, mtime, ctime, size)` + `entryV2` with tags from `extractAllTags`, tasks from `- [ ]` lines, links via `outgoingLinksFromContent`. ctime/mtime from frontmatter `created`/`date` or a `YYYY-MM-DD` in the filename, else a fixed date before the clock.
4. Each block runs through `runQueryjsBlock` with `currentFilePath` = its own note; each script through `kb.view` with the current file and `input` recorded from the first real caller (a `kb.view` spy while the root's blocks run); uncalled scripts get the root's first note and no input.
5. Assertions per run: no throw, no `.cm-lp-qjs-error`, no "Chart error:", `toMatchSnapshot()` of `textContent`, and differs from the run over an empty vault.

## Prior art
- `src/tests/help/queryjs-features-scoping.test.ts` (KBAPI over example files, `loadScript` from disk, editor.service mock).
- `src/tests/help/templates-script-paths.test.ts` (`processTemplate` on templates).
- `src/tests/lib/plugins/queryjs/kb-ui.test.ts:6` (chart.js/auto mock).

## Defaults taken
- `templates` vault: the processed templates placed next to the queryjs-features notes, scripts loaded from queryjs-features (the template blocks query notes the templates themselves do not contain).
- `markdown-editor-vault` loads scripts from queryjs-features (it ships none; `23-queryjs-real-scripts.md` tells the reader to copy that `__system/` to the vault root).
- `triada/templates/*.md` also go through `processTemplate` (their `created` is a `<% %>` expression; raw, no period query matches).
- Chart.js mock writes the chart's type, labels and dataset data into the canvas text, so chart output reaches the snapshot.
- Clock 2026-02-15T12:00Z (the queryjs-features data week), `TZ=UTC` and `vi.useFakeTimers({ toFake: ['Date'] })` set in `vi.hoisted` (the vaults are built at collection time) so awaited timers still run.
- Blocks whose output does not depend on the vault go on a second allowlist (empty-vault equality), each with a reason.

## Risks
- Snapshot churn if a date leaks past the fixed clock (e.g. `ctime: Date.now()` style fixtures); none taken from wall time.
- Scripts writing `window.__triada` share state across runs; harmless because every caller re-runs `_shared-triada` first.

## Findings left as is
- `triada-parent-outcomes.js` / `triada-inbox.js` call `kb.span(page.file.link)`; `span` takes a string, so the link renders as `[object Object]`. The snapshots pin it; fixing the example is out of this Issue's scope.
- The templates' monthly/quarterly/yearly radars render their empty message: queryjs-features has no weekly/monthly notes with `satisfaction_*` / practice fields. Still differs from the empty-vault run (which has no current note).
