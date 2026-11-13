# Scout 17: tests for editor completion and the composer route test

Read-only research. Nothing was run. Paths are relative to the repo root.

## 1. Existing tests of the completion sources

| File | Covers |
|---|---|
| `src/tests/lib/core/markdown-editor/extensions/tag/completion.test.ts` (134 lines) | `tagCompletionSource` direct calls (L47-87) and a mounted `EditorView` with `autocompletion()` that accepts a suggestion (L89-134) |
| `src/tests/lib/core/markdown-editor/extensions/tag/completion.logic.test.ts` (153 lines) | `detectTagContext`, `rankTags`; pure, no jsdom (imports at L1-2) |
| `src/tests/lib/core/markdown-editor/extensions/wikilink/completion.logic.test.ts` (234 lines) | `detectWikilinkContext`, `matchFilesForWikilink`, `extractHeadingsFromContent`, `extractBlockIdsFromContent`; pure (imports L2-8) |
| `src/tests/lib/core/markdown-editor/editor-host.test.ts` (473 lines) | One happy-path test per source over a fake host: wikilink L219-232, tag L234-243, heading L245-254 |
| `src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts` L1120-1170 | `wikilinkCompletionSource` against the app's real host with a hand-built fake `CompletionContext` (L1138-1146) |
| `src/tests/lib/core/markdown-editor/extensions/date-shortcut/completion.logic.test.ts` | the date shortcut source, out of scope |

There is no test file for `wikilink/completion.ts` itself. The wikilink source is only checked through `editor-host.test.ts` (labels only) and the lifecycle test. Nothing asserts the wikilink `apply()` behavior (closing `]]`, the alias form `Note|alias`) or the heading and block-id modes' options and `apply`. Those are source lines `wikilink/completion.ts:71-82`, `100-108`, `160-167` and `212-219`.

## 2. How the tests build state and context

- Direct source call (tag test L29-37, host test L219-243): `EditorState.create({ doc, extensions: editorHost.of(host), selection: EditorSelection.cursor(doc.length) })`, then `source(new CompletionContext(state, doc.length, explicit))`. No `markdown()` language and no `createMarkdownState` are needed. Asserts are on `result.options.map(o => o.label)`, `result.from`/`to`, and `result.filter === false` (tag test L48-57).
- Host mocking: tag test L24-27 builds `{ ...NOOP_HOST, listTags: vi.fn(() => Promise.resolve(tags)) } satisfies EditorHost`. `NOOP_HOST` is exported by `src/lib/core/markdown-editor/editor-host.ts:87-98`. `editor-host.test.ts:31-52` has `fakeHost(paths)`, a full spy host: `resolveLink`, `listLinkCandidates`, `readNote`, `listTags`, and the rest. Only the spies are `vi.fn`; there is no store mocking, which matches the CLAUDE.md rule against mocking stores.
- Error path: tag test L80-86 spies `console.error` and uses a host whose `listTags` rejects. `reportError` (`live-preview/core/profiling.ts:36-39`) calls `console.error` and the log port, which defaults to a no-op (`profiling.ts:9, 15`). The test needs no mock beyond the console spy.
- Accept path (`apply()`): tag test L95-108 mounts a real `EditorView` in jsdom with `autocompletion({ override: [tagCompletionSource], interactionDelay: 0 })`. It calls `startCompletion(view)`, then `vi.waitFor(() => completionStatus(view.state) === 'active')`. It reads `currentCompletions(view.state)` and calls `acceptCompletion(view)`, then asserts `view.state.doc.toString()` and `selection.main.head` (L110-133). The file header is `// @vitest-environment jsdom` (L1). Nothing is polyfilled there: no `getClientRects`, no `ResizeObserver`.
- Hand-built context (lifecycle test L1138-1146): a cast object with only `state.doc.toString/length/sliceString`, `state.facet`, `pos` and `explicit`. This works only because the wikilink source touches just those. Fragile if the source changes.

## 3. Helpers reusable for composer tests

- `tagHost()` and `complete()` (tag test L25-37) are file-local, not exported. A composer test would copy them (about 15 lines). Nothing exists in a shared helper module.
- `src/tests/lib/core/markdown-editor/test-helpers.ts` holds markdown-parse helpers (`createMarkdownState`, `mountMarkdownView`, `withFullParse`, `stepDateNow`). None are needed for completion: both sources take a plain `EditorState` without a language. Not relevant unless the composer editor loads `markdown()`.
- `NOOP_HOST` and the `editorHost` facet (`editor-host.ts:87-107`) are reusable as exported.
- `fakeHost()` in `editor-host.test.ts:31` is file-local too. If the composer ships its own host implementation, a test of that host can follow the lifecycle-test pattern (real host, fake `invoke`; see L1126-1131).

## 4. How `composer-page.test.ts` mounts the route

- jsdom is declared per file (`composer-page.test.ts:1`). `vitest.config.ts:7-18` has `conditions: ['browser']` so Svelte's client runtime is used and `mount()` works, plus `include: ['src/tests/**/*.test.ts']`. The svelte plugin is configured with `hot: false`.
- IPC is mocked at the module boundary, `vi.mock('#lib/contracts/ipc.js', ...)` with `call` and `on` (L5-8). Both are `vi.fn`; `on` resolves an unlisten function.
- Mounting: `mount(ComposerPage, { target })` then `settle()` (two microtask ticks plus `flushSync`, L21-25, L168-171).
- Driving the UI: `type(value)` sets `textarea.value` and dispatches `input` (L142-146). `press()` dispatches `keydown` on `window` (L148-150), which matches the page's `<svelte:window on:keydown>` (`+page.svelte:~185`). `summon()` pulls the `qc:open-composer` handler out of `on`'s mock calls (L116-121). `resultHandler()` does the same for `qc:composer-capture-result` (L111-114).
- Assertions read the DOM: `textarea().value`, `.composer-root` class `saved`, `.hint`, `[role="alert"]`, and `call` mock args. The draft persists through `localStorage`; tests that need no storage call `localStorage.clear()` and spy `Storage.prototype` (L441-449).
- The whole file is 459 lines and has 5 theme tests (L27-95) plus about 17 save tests (L97-459).
- `queueMicrotask(() => textareaEl?.focus())` in `resetForShow` (`+page.svelte:~158`) is where a CodeMirror swap would need a focus replacement; tests do not assert focus today (UNVERIFIED: no `focus` or `activeElement` assertion found in the file by reading).

## 5. Can CodeMirror mount in that jsdom test?

Yes for mounting a bare `EditorView`, with evidence:

- The tag test mounts `EditorView` plus `autocompletion` in jsdom with no polyfills (tag test L95-108), and uses `startCompletion`/`acceptCompletion`. So CM state, the completion state field and the accept path work in the default jsdom here.
- Other files mount CM under jsdom and add polyfills only when they need layout: `Range.prototype.getClientRects ??= () => []` (about a dozen live-preview tests, e.g. `invariants-harness.test.ts:404`, `table-widget.test.ts:423`). `MarkdownEditor.test.ts:15-27` patches `Element.prototype.scrollTo` and `HTMLElement.prototype.focus` for tab-switch scroll behavior. `TrashSection.test.ts:29` polyfills `ResizeObserver` (bits-ui, not CM).
- The completion tooltip: the tag accept test never asserts the tooltip DOM. It only reads `currentCompletions` and calls `acceptCompletion`. Rendering and positioning the real tooltip in jsdom (`@codemirror/autocomplete`'s tooltip uses view measuring) is UNVERIFIED in this repo; no test asserts `.cm-tooltip-autocomplete` DOM (grep for `cm-tooltip` was not run; treat as unknown).

## 6. Risks for the composer tests

1. The existing save tests drive a native `<textarea>`: `type()` (L142-146) sets `.value` and fires `input`; `textarea()` queries `target.querySelector('textarea')` (L138-140); the theme test L60 asserts a `textarea` exists. If the composer swaps to CodeMirror (the ADR 0028 route), those helpers stop working and every save test needs a new `type()` that dispatches into the `EditorView` (for example via `view.dispatch`, reached through `EditorView.findFromDOM(target.querySelector('.cm-editor'))`). That is a rewrite of the helper, not of each test, because all tests go through `type()`/`textarea()`. About 20 call sites use `textarea().value` for reads (L199, 213, 234, 238, 256, 267, 277, 309, 372, 419, 429, 438, 457).
2. If the composer keeps the `<textarea>` and adds a separate popup list, the tests stay untouched, but then the editor's `CompletionContext`-based sources cannot be fed by a textarea directly. A `CompletionContext` can still be built from an `EditorState.create({ doc: textarea.value, selection })` for the pure detection and ranking path, which is what the direct-call tests do. UNVERIFIED whether that design is acceptable to the owner.
3. The composer window cannot reach the main window stores, so its host must fetch vault data over IPC. In the test, `call` is `vi.fn(async () => undefined)` (L5-8), so a `listTags`/`listLinkCandidates` IPC call would resolve `undefined` unless the test mocks the specific command. `mockSubmit` (L124-136) only branches on `submit_composer_capture` and returns `undefined` for everything else. A new IPC command would need its own branch or the source would see `undefined` and take the error path (`tag/completion.ts:25-30` catches and returns null; the wikilink source `buildFileCompletions` at `wikilink/completion.ts:68` does NOT catch, so an `undefined` result throws a TypeError out of the source).
4. `commands()` (L164-166) asserts the exact list of `call` commands, for example `toEqual(['submit_composer_capture'])` at L201, L214, L224, L373. Any new IPC call made on mount or on typing (vault entries, tags) would break these exact-list assertions unless the new calls are filtered out or issued lazily only when a completion triggers.
5. `vi.mocked(call).mockReset()` in `afterEach` (L187) resets the default implementation to undefined-returning; `beforeEach` re-calls `mockSubmit()` (L176). A new command handler must be added inside `mockSubmit` or a similar function to survive that.
6. Wikilink `apply()` and heading/block-id modes have no direct tests (section 1). Reusing the source in the composer without adding tests for them would leave the reused behavior covered only by the thin `editor-host.test.ts` checks. The CLAUDE.md rule "never commit source changes without test changes" applies to the new composer code, not to unchanged editor files.
7. Layer rules: the composer route would import `#lib/core/markdown-editor/extensions/{tag,wikilink}/completion*.ts`. `tag/completion.ts` imports `reportError` from `live-preview/core/profiling` (L3), which has no imports (verified: the grep for `^import` in that file returned nothing) and defaults to a no-op log. `wikilink/completion.ts` imports `getNoteName` from `core/filesystem/wikilink-resolution.logic.js` (L2, which only imports a type) and `fuzzyMatch`. All light; none pulls in stores or Tauri APIs. The architecture tests (`src/tests/lib/architecture/layer-rules.test.ts`, named in CLAUDE.md) were not read; UNVERIFIED whether a route importing `core/markdown-editor` internals is flagged.

## 7. Reuse opportunities

- A new composer-completion test can copy the direct-call pattern verbatim (tag test L25-37) with a host whose `listTags`/`listLinkCandidates` are fed by a fake IPC; this asserts the real source and the real `.logic.ts` with only the Tauri boundary faked, which satisfies the project's mock rules.
- For accept behavior, copy the `openList` + `acceptCompletion` pattern (tag test L95-108) with `interactionDelay: 0`; it works in default jsdom.
- For the composer page test, extend `mockSubmit` or add a sibling `mockVaultData` that branches on the new command names, and keep `commands()` assertions by filtering the new commands out.
- For the host over IPC, the lifecycle test (L1126-1170) shows the repo's way to test a real host with a faked `invoke`, including cache invalidation concerns.
- `NOOP_HOST` plus spread lets a composer host implement only `listTags` and `listLinkCandidates` and satisfy `EditorHost`; the other eight methods stay no-ops (`editor-host.ts:87-98`). `readNote`/`resolveLink` matter only for `[[Note#heading` mode: `NOOP_HOST.readNote` rejects and `resolveLink` returns null, so heading and block-id completion silently returns null in the composer unless the composer host implements them (`wikilink/completion.ts:15-24, 131-141`).

## 8. Open questions

- Does the composer stay a `<textarea>` or become a CodeMirror editor? The answer decides whether `type()`/`textarea()` in `composer-page.test.ts` must be rewritten (risk 1).
- Which IPC command names would carry tags and link candidates? Needed to extend the mocked `call`.
- Should heading and block-id completion work in the composer? It needs `readNote` and `resolveLink` in the composer host.
- Does the real autocomplete tooltip render under jsdom well enough to assert on? UNVERIFIED; the existing tests avoid it.
- Does `layer-rules.test.ts` allow `src/routes/**` to import `core/markdown-editor/extensions/*`? Not read.
