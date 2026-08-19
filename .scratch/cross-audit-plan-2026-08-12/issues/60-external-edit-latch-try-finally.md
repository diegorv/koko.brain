# Issue 60: a throwing `view.dispatch` leaves `isTabSwitching` / `isExternalEdit` latched, and every keystroke after it is dropped

Status: ready-for-agent
Phase: P5 (follow-up)
Source: reviewer follow-up surfaced during the cross-audit run, verified 2026-08-19 by triage
Blocked by: none

## What

### The claim, and what survives verification

Claim as reported: "`isExternalEdit` and `isTabSwitching` are set true, work runs, they are set back
to false, with no `try`/`finally`. If the work throws, the latch stays stuck true and every
subsequent edit or tab switch is misclassified **for the rest of the session**."

**The structural half is confirmed. Two of the claim's embellishments are refuted, and the refutation
matters because it changes what the red test has to look like.**

### Confirmed: both windows are unguarded, and the enclosed call can throw

Both latches are plain (non-`$state`) `let`s declared at the top of
`core/markdown-editor/MarkdownEditor.svelte`. Each is raised, a `view.dispatch(...)` runs, each is
lowered - no `try`/`finally` at either site:

- The tab-switch `$effect` (the one whose comment reads "IMPORTANT: This effect MUST be defined
  before the content-sync effect below"): `isTabSwitching = true` → `debug('TAB_SWITCH', ...)` →
  `perfStart()` → `view.dispatch({ changes, selection, annotations, effects: langEffects ?? [] })`
  → `perfEnd(...)` → `isTabSwitching = false`.
- The content-sync `$effect` keyed on `editorStore.externalContentSignal`: `isExternalEdit = true` →
  `view.dispatch({ changes, selection, annotations })` → `isExternalEdit = false`.

Of the statements inside the two windows, only `view.dispatch` can throw. `debug` /
`perfStart` / `perfEnd` (`utils/debug.ts`) are settings reads plus `performance.now()`, and
`appendLog` (`utils/log.service.ts`) hands its work to a promise chain rather than throwing
synchronously. `EditorSelection.cursor(cursorPos)` is built *before* the window and both cursor
positions are clamped (`Math.min(saved.cursorPos, tab.content.length)`;
`editor.logic.ts::getPositionAfterFrontmatter` ends in `Math.min(pos, content.length)`;
`Math.min(view.state.selection.main.head, content.length)`), so the classic
"Selection points outside of document" `RangeError` is not reachable from here.

`view.dispatch` genuinely can throw. CodeMirror is selective about what it swallows - verified by
reading `node_modules/@codemirror/view/dist/index.js` and `node_modules/@codemirror/state/dist/index.js`
at the installed versions:

- **Caught** (routed to `logException`, dispatch returns normally): `ViewPlugin` `update()` and
  `destroy()`, and every `EditorView.updateListener` callback.
- **Not caught**: `StateField.update` and facet `compute` functions, which run eagerly inside
  `EditorState.applyTransaction` → `slot.update(state, tr)` during `this.state.update(...)`; and
  `docView.update(update)`, which reaches `WidgetTile.of` → `widget.toDOM(view)` with no
  `try` anywhere on the path. `EditorView.update` does wrap that region, but its `finally` only
  resets `this.updateState`; the exception still propagates out of `dispatch`.

So the repo's own uncaught surfaces sit squarely inside both windows:

- `live-preview/plugins/frontmatter-field.ts::frontmatterField.update` → `computeFrontmatter` →
  `RangeSetBuilder.add`, and the sibling `frontmatterGutter` (`gutterLineClass.compute`). Both are
  StateField/facet code, both run on the doc-replace transaction.
- Widget `toDOM()` bodies with no internal `try`, drawn for whatever is in the new tab's viewport:
  `widgets/collection-block-widget.ts::CollectionBlockWidget.toDOM` calls `executeQuery(...)` bare
  (only `parseCollectionYaml` is result-typed), `widgets/code-block-widget.ts::CodeBlockWidget.toDOM`,
  and the table widget in `widgets.ts` via `renderCellContent`. `math-widget.ts`, `mermaid-widget.ts`
  and `queryjs-block-widget.ts` do carry internal `try`/`catch` and are not the exposure.

### Refuted 1: there is no `await` in either window

Both windows are strictly synchronous. Neither latch is held across a microtask boundary, so the
"possibly worse" async variant the claim raised does not exist here. `applyLanguageForTab` (the async
leg) is called *after* `isTabSwitching = false`, deliberately.

### Refuted 2: "for the rest of the session" - each latch self-heals, on a different event

The latches are component-instance `let`s, not store state, so their lifetime is one
`MarkdownEditor.svelte` instance. `core/markdown-editor/EditorView.svelte` renders `MarkdownEditor`
in the final `{:else}` of its file-type chain, so the instance survives every markdown-to-markdown
tab switch and is torn down only when the user opens a collection / canvas / kanban / tasks / tags /
graph tab, or closes the last tab.

More precisely, each effect clears its own latch on its next successful run:

- **`isTabSwitching`**: the throw skips the trailing `lastTabPath = path`, so `lastTabPath` stays
  stale. The effect re-runs on the next `editorStore.activeTabPath` change; that run raises and
  lowers the latch normally. **Stuck window = from the failed switch until the next tab switch.**
- **`isExternalEdit`**: `lastSeenSignal = signal` is assigned *before* the dispatch, so the throw does
  not re-arm the effect. It re-runs on the next `externalContentSignal` bump (property-panel edit,
  task toggle, link rename, watcher reload). **Stuck window = until the next external content sync**,
  which for a user typing prose can be the entire sitting.

Bounded, then - but the bound is exactly the interval in which the damage happens.

### Who reads the latches, and the concrete user-visible harm

One reader: `core/markdown-editor/setup/editor-extensions.ts::createExtensions`, in its
`EditorView.updateListener`:

```ts
if (update.docChanged && !opts.isTabSwitching() && !opts.isExternalEdit()) {
	...
	opts.onDocChanged(update.state.doc.toString(), fmChanged);
}
```

`onDocChanged` is wired in `MarkdownEditor.svelte`'s `onMount` to
`core/editor/editor.service.ts::onContentChange`, whose whole body is
`editorStore.updateContent(content)` + `scheduleAutoSave(...)`.

With a latch stuck true, every keystroke therefore:

1. never reaches `editorStore.updateContent`, so `editor.store.svelte.ts` keeps the pre-edit
   `tabs[activeIndex].content`;
2. never arms either debounce, so nothing is written to disk;
3. leaves `editor.logic.ts::isTabDirty` (`content !== savedContent`) false.

The three consequences that fall out of (3) are the actual defect:

- `editor.service.ts::saveAllDirtyTabs` (app close, vault switch) filters on `isTabDirty` and skips
  the tab entirely - nothing is flushed.
- `editor.service.ts::closeTab` gates its "This file has unsaved changes. Discard changes?" prompt on
  `isTabDirty`, so the tab closes silently and the text is gone with no warning.
- On the next tab switch back, the tab-switch effect replaces the CodeMirror doc with `tab.content`
  (the stale store copy), destroying the typed text that only ever lived in the CM document.

Silent loss of typed text, with the "unsaved changes" guard disarmed at the same time.

There is a second, minor consequence worth knowing about but **not** in this issue's scope: the
skipped `lastTabPath = path` means the *following* switch writes the current view's scroll/cursor
into the previous path's `tab-view-state` entry.

### Repro path

No natural repro at HEAD. Reaching it needs a co-occurring second defect (a `StateField`, facet
compute, or widget `toDOM()` that throws on some real note's content), and triage did not find an
input that makes one of the unguarded call sites throw today. The fault-injected sequence is exact:

1. Two markdown tabs, A active. B contains a live-preview block whose widget `toDOM()` throws
   (in a test: patch `dispatch` on the `EditorView` instance for one call).
2. Switch to B. The tab-switch dispatch throws; `isTabSwitching` stays true.
3. Type in B. `onDocChanged` is gated off; `editorStore.activeTab.content` never moves;
   the tab never goes dirty.
4. Switch to C, or close B, or quit. The typed text is discarded with no prompt.

So this is a **defence-in-depth** issue, filed on impact rather than on likelihood: it converts "one
widget bug renders one block wrong" into "one widget bug silently eats a note's worth of edits". The
cost of removing it is four lines.

### Already fixed?

No. `git log -S"isTabSwitching" -- src/lib/core/markdown-editor/` returns exactly one commit,
`b7358e71` ("chore: initial project setup"). `git log -S"isExternalEdit" -- src/lib/core/markdown-editor/`
returns exactly one, `c0331fa1` ("refactor(editor): make the autosave schedule an explicit
parameter"), which introduced the second latch in the same unguarded shape. Neither window has ever
carried a `try`.

### Existing coverage

`src/tests/lib/core/markdown-editor/setup/editor-extensions.test.ts` already runs under
`// @vitest-environment jsdom` with a real `EditorView`, and its case
"suppresses onDocChanged while an external-content doc replace is in flight" covers the *suppression*
half - it flips a local `isExternalEdit` and asserts `onDocChanged` is not re-entered. Nothing
anywhere covers the *release* half. No test mounts `MarkdownEditor.svelte`; the folder has
`highlight-styles.test.ts`, `tab-view-state.test.ts`, `wikilink-click-capture.test.ts` and
`test-helpers.ts`, none of which instantiate the component.

A red mount-based test is writable. `vitest.config.ts` sets `conditions: ['browser']`, and
`src/tests/lib/features/collection/CollectionView.test.ts` ("CollectionView — selfUpdate latch") is a
working precedent for exactly this genre: a `src/tests/fixtures/CollectionViewHarness.svelte` that
owns the prop, `mount` + `flushSync`, real stores, and Tauri-only mocks.

## How

Minimal fix, two sites, both in `core/markdown-editor/MarkdownEditor.svelte`. `try`/`finally` - never
`try`/`catch`. The throw must keep propagating; swallowing it would hide the widget/StateField bug
that caused it, which is the only signal anyone gets.

Tab-switch effect - keep `perfEnd` inside the `try` so the success-path ordering and the measured
window are byte-identical to today, and so a throw still skips the timing line as it does now:

```ts
isTabSwitching = true;
debug('TAB_SWITCH', 'dispatching doc replace, path:', path, 'contentLen:', tab.content.length);
const t0 = perfStart();
try {
	view.dispatch({
		changes: { from: 0, to: view.state.doc.length, insert: tab.content },
		selection: EditorSelection.cursor(cursorPos),
		annotations: Transaction.addToHistory.of(false),
		effects: langEffects ?? [],
	});
	perfEnd('TAB_SWITCH', 'docReplace', t0);
} finally {
	isTabSwitching = false;
}
```

Content-sync effect - `perfBaseline` already sits after the latch is lowered, so it stays outside:

```ts
isExternalEdit = true;
try {
	view.dispatch({
		changes: { from: 0, to: view.state.doc.length, insert: content },
		selection: EditorSelection.cursor(cursorPos),
		annotations: Transaction.addToHistory.of(false),
	});
} finally {
	isExternalEdit = false;
}
perfBaseline('contentSyncEffect:dispatched', tBaseline);
```

**Red-first strategy.**

New suite, `src/tests/lib/core/markdown-editor/MarkdownEditor.latch.test.ts`, `// @vitest-environment jsdom`,
following `CollectionView.test.ts` for structure and `src/tests/fixtures/` for the harness
(`MarkdownEditorHarness.svelte`, seeding `editorStore` tabs and rendering `MarkdownEditor`). Reuse
`src/tests/fixtures/tauri-api.fixture.ts` / `tauri-fs.fixture.ts` rather than hand-rolling IPC mocks,
and stub `ResizeObserver` the way `CollectionView.test.ts` does - `MarkdownEditor` pulls in
`$lib/components/ui/context-menu` (bits-ui).

Shape of each of the two cases:

1. Mount with two markdown tabs; `flushSync()`.
2. Take the live view from `editorStore.editorView` - `onMount` calls
   `editorStore.setEditorView(view)` with the very instance the component's local `view` holds, so
   patching `dispatch` on it patches the call the effect makes.
3. Install a **one-shot** throwing `dispatch` (throw on the first call, restore the original
   immediately) and trigger the effect: `editorStore.setActiveIndex(1)` for the tab-switch latch,
   `editorStore.bumpExternalContentSignal()` (the `externalContentSignal` writer in
   `editor.store.svelte.ts`) for the content-sync latch.
4. `flushSync()` inside an explicit `expect(() => flushSync()).toThrow()` - see side channel (4).
5. Probe with a real user-style edit through the restored dispatch:
   `view.dispatch({ changes: { from: view.state.doc.length, insert: 'x' } })`.
6. Assert on real store state: `editorStore.activeTab?.content` ends with `'x'`. Green with the
   `finally`, red without it.

**Side channels that could fake a green - all five have to be closed:**

1. **Driving the probe through `syncExternalContentToEditor`.** That writer updates the tab content
   itself, so `editorStore.activeTab.content` is correct even with the latch stuck. The probe has to
   be a raw `view.dispatch({ changes })`, which is what a keystroke produces.
2. **Asserting on a spy.** Mocking `$lib/core/editor/editor.service` to spy on `onContentChange`
   removes the real store write, and `docs/TESTING.md` bans `.toHaveBeenCalled()` as the sole
   assertion. Assert `editorStore.activeTab.content`.
3. **Letting the effect self-heal before the probe.** Both effects clear their own latch on their next
   successful run (see `## What`). Any second `setActiveIndex` / signal bump between step 3 and step 5
   makes the test pass against broken code. Exactly one effect run between the injected throw and the
   probe.
4. **A fault injection that never fired.** If `flushSync()` does not throw, the patched `dispatch` was
   not the one the effect called, and the whole case is vacuous in both directions. Assert the throw
   rather than swallowing it in a bare `try {} catch {}`.
5. **A mount-time async dispatch eating the injection.** `onMount` calls
   `applyLanguageForTab(tab.name)` fire-and-forget; that function awaits
   `getLanguageEffects(...)` and then runs `view.dispatch({ effects })`. If the test yields at all
   (any `await`, tick, or microtask flush) between installing the one-shot throwing `dispatch` and
   triggering the effect, that pending dispatch consumes the injection instead. Side channel (4)
   does catch it, but it surfaces as a non-throwing `flushSync()` plus an unhandled rejection from
   the floating `applyLanguageForTab` promise, which reads as a broken harness rather than a vacuous
   case. Settle the mount-time async work first (await a microtask flush right after
   `mount` + `flushSync()`), and only then install the throwing `dispatch`, so the effect's own
   dispatch is the only one between the patch and the trigger.

Prove red before implementing: run the new file alone (`pnpm vitest run src/tests/lib/core/markdown-editor/MarkdownEditor.latch.test.ts`)
against unmodified `MarkdownEditor.svelte`, confirm both cases fail on the content assertion - not on
a mount error - and record that transcript in the closing `## Comments`.

**Fallback, only if mounting `MarkdownEditor.svelte` under jsdom proves intractable** (a Tauri or
live-preview import that cannot be stubbed without mocking a store, which rule 1 forbids): extract
the raise/dispatch/lower triple into `src/lib/core/markdown-editor/setup/latched-dispatch.ts` and
unit-test it directly with a throwing dispatch fn. Take this route only after the mount route has
actually been tried and failed, and say so in the commit message - it adds a production abstraction
for two call sites, which is worse than the four-line inline fix if the mount works.

**Must NOT change.**

- `core/markdown-editor/setup/editor-extensions.ts` and its existing test. The suppression gate and
  the `CreateExtensionsOptions` getter contract are correct as they stand; this issue is only about
  releasing the latch.
- The two latches stay plain `let`, not `$state`. Both effects read and write them; as `$state` the
  writes would dirty the effects' own tracked dependencies. `CollectionView.svelte::selfUpdate`
  carries the long-form version of this rationale.
- `lastTabPath = path` stays where it is, after the rAF wiring. Do not hoist it into the `finally` and
  do not add any recovery: the doc replace did not happen, so pretending the switch completed is
  worse than the stale-path consequence noted in `## What`.
- `lastSeenSignal = signal` keeps its position before the dispatch.
- The `tabSwitchRafAbort` chain (Phase 4.4), the `langEffects === null` async-language branch, and
  `view.focus()` ordering.
- The `perfStart` / `perfEnd` / `perfBaseline` labels. Precise reason, because half the obvious one
  is wrong: only the `perfBaseline` label `contentSyncEffect:dispatched` is consumed by
  `scripts/perf-baseline.py`, whose `LINE_RE` matches `[PERF-BASELINE] <label>: <ms>ms` lines and
  nothing else. `TAB_SWITCH docReplace` goes out through `perfEnd` -> `debug`, which emits
  `[FRONT-END:TAB_SWITCH]`, and no script parses it; it is an ad-hoc tag kept for log greppability.
  Keep both strings unchanged regardless.
- The unguarded widget / StateField call sites that make this reachable
  (`collection-block-widget.ts::toDOM` → `executeQuery`, `code-block-widget.ts::toDOM`, the
  `widgets.ts` table widget, `frontmatter-field.ts::computeFrontmatter`). Hardening those is a
  separate finding; folding it in here makes the red test unwritable, because the fault injection
  depends on a dispatch that throws.

## Gate

Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`. No Rust file moves, so
`cargo test` is not part of this gate.

Stage only this change's files (`git add <specific files>`), verify with `git diff --cached --stat`,
and land one commit in the full format (Context, Problem, Solution, Behavior, Files with line ranges)
carrying `MarkdownEditor.svelte`, the new suite and harness, and the closing `## Comments` entry with
the red-then-green transcript.

Line numbers are deliberately absent from this file; every anchor above is a symbol. Symbol
locations were read at HEAD `5e0b8bd3` and will drift.

## Comments

### 2026-08-19 - triage revision after adversarial review

Three findings applied. Verdict unchanged: partially-confirmed, medium, ready-for-agent.

- Corrected the perf-label rationale. `scripts/perf-baseline.py`'s `LINE_RE` matches
  `[PERF-BASELINE] <label>: <ms>ms` lines only, so it consumes `contentSyncEffect:dispatched` and
  not `TAB_SWITCH docReplace`, which `perfEnd` emits through `debug` as `[FRONT-END:TAB_SWITCH]`.
  The directive to keep both labels stands; only the stated reason narrowed.
- Added a fifth side channel. `onMount` calls `applyLanguageForTab` fire-and-forget and it ends in
  `view.dispatch({ effects })`, so any yield between installing the one-shot throwing dispatch and
  triggering the effect lets that pending promise consume the injection, surfacing as a
  non-throwing `flushSync()` plus an unhandled rejection.
- Style: 22 em-dashes replaced. The survivor is the verbatim `"CollectionView — selfUpdate latch"`
  describe string.

Metadata note for the orchestrator: the fix's file list must include this issue file, because the
Gate lands the closing `## Comments` entry in the fix commit.
