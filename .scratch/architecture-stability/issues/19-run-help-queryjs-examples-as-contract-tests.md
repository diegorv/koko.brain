# 19: Run every help/ QueryJS example through the widget's runner against fixture vaults

**What to build:** Extract the execution step at `queryjs-block-widget.ts:196-202` (the IIFE wrap, `new Function('kb','dv',…)` and `awaitAllPending`; KBAPI construction at 186-194 stays in the widget) into one exported function in a module the widget already imports (`queryjs.service.ts` or `kb-api.ts`), so issue 04's baseline gains no new key. Both the widget and the tests call it.

Then add `src/tests/help/queryjs-contract.test.ts`. For each example root (`queryjs-features` 18 blocks, `markdown-editor-vault` 55, `triada` 9, `templates` 11; 93 in total, plus 35 `__system/queryjs` scripts) it:
- builds a fixture vault from the folder's own `.md` files (records via `buildNoteRecord`, entries via `vault-entries.fixture.ts`), deriving tags and tasks from the file content and setting realistic mtime/ctime, so blocks do not snapshot their empty state;
- for `templates`, runs `processTemplate` first and uses the queryjs-features scripts, as `templates-script-paths.test.ts` does;
- fixes the clock (`vi.setSystemTime`) and sets `process.env.TZ` for the whole file (`withTimeZone` only works with synchronous code);
- mocks `chart.js/auto`;
- runs every ```queryjs / ```dataviewjs block and every `__system/queryjs/*.js` script, with a recorded `input` where a script needs one;
- requires each run to produce no `.cm-lp-qjs-error`, no "Chart error:" text (`kb-ui.ts:579-587` renders chart failures in a plain div) and no throw, and compares its `container.textContent` to a golden snapshot.

**Blocked by:** none

**Status:** needs-triage

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** src/lib/core/markdown-editor/extensions/live-preview/widgets/queryjs-block-widget.ts:170-210; src/tests/help/queryjs-features-scoping.test.ts; src/tests/fixtures/vault-entries.fixture.ts; help/examples/**

- [ ] The widget and the test call the same runner function, and the widget test still passes unchanged
- [ ] Blocks and scripts are discovered by glob with a fence-aware scanner, so a new example file is picked up automatically and the queryjs block nested inside a ```` fence in `live-preview-regressions/06-fenced-code.md:13` ("THIS MUST NOT RUN") is skipped
- [ ] Every discovered block or script runs without error, or sits on an allowlist where each entry carries a reason
- [ ] Golden snapshots exist per block, and changing a DataArray method's output makes the suite fail
- [ ] A count assertion guards the scanner: at least 93 blocks and 35 scripts
- [ ] Each snapshot is asserted to differ from the block's empty-vault output
- [ ] The existing scoping test keeps passing (do not fold it in)

## Notes

- **Runner rules:** the extracted runner makes no `queryjsSessionStore` calls (no `setResult`, no `markAutoRun`; those stay in `toDOM` and `renderRunPrompt`), keeps `awaitAllPending` ordering, and rethrows so `renderStructuredError` still runs. It is not merged with `runView`, which wraps only code containing `await` and passes `input`.
- **Stability:** `Math.random` only paints canvas pixels, and the one `toLocaleDateString` call is pinned to `'en-US'`.
- **Snapshot churn:** if dates leak past the fixed clock, the golden snapshots will churn.
- **Size:** M.
