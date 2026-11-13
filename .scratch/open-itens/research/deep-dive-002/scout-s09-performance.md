# Scout s09: performance of the Issue 002 guard

Angle: per-keystroke cost of a `transactionFilter` and `changeFilter` on long notes with frontmatter, where `bodyStart` can come from, how neighbouring code computes similar ranges, and what could make typing slower. Read-only. Nothing was run (no vitest, no e2e, no app); every cost statement below is derived from reading code and is marked as inference where it is not a plain fact. Paths are relative to the repo root; library paths are under `node_modules/.pnpm/`.

## Summary

- A correctly written guard costs next to nothing per keystroke. The existing typing path is already O(N lines) several times over (five `getAllLines` calls plus a `doc.toString()` per doc change, see Facts 1-4), so a guard that does a field lookup and returns early is lost in the noise. A guard that adds one more full-document pass, or touches `tr.state`, is the only way to make typing measurably slower.
- `bodyStart` should come from `frontmatterEnd(tr.startState)` (`plugins/frontmatter-field.ts:53-65`), which reads the already-built decoration set (2 ranges per frontmatter line) and is O(frontmatter lines), not O(note). It must not be re-derived from the document with `getAllLines` or `findFrontmatterBlock`, and it must not read `tr.state`.
- Order of cheap checks matters: `tr.docChanged` / `tr.selection` first, userEvent second, field lookup last. Then external writes (no userEvent), scroll rebuild effects, undo/redo and pure body typing never reach the lookup.
- The no-op paths must return the right sentinel. A `transactionFilter` that returns `undefined` does not mean "unchanged": CodeMirror turns it into a blank transaction and the keystroke is dropped (Fact 9). It must return `tr`. A `changeFilter` returns `true`.
- Independent of speed, this scout found a correctness hole in the changeFilter design that makes typing appear dead after one suppressed Backspace (Risk R1). It is the highest-value finding in this report: the caret is mapped back into the hidden fence and every later keystroke is then swallowed. The Issue's tests would not catch it because they assert only on `doc.toString()`.

## Facts

Per-keystroke work that already exists (the baseline the guard is added to):

1. `frontmatterField.update` runs `computeFrontmatter` on every doc change (`plugins/frontmatter-field.ts:36-41`), and `computeFrontmatter` calls `getAllLines(state)` (`:14`), which builds a `Line[]` of the whole document with one `doc.line(i)` per line (`core/get-all-lines.ts:4-10`). O(N log N).
2. `frontmatterGutter` is `gutterLineClass.compute(['doc'], ...)` and calls `getAllLines` again (`plugins/frontmatter-field.ts:113-117`), on every doc change, even when typing at the bottom of the note.
3. Three more block decorators call `getAllLines` in their `compute`: `plugins/block-comment-field.ts:14`, `plugins/audio-plugin.ts:14`, `plugins/video-plugin.ts:14`. `blockDecorator` runs `compute` on every `docChanged` (`core/block-decorator.ts:75-86`, `core/check-update-action.ts:20`). So there are at least five full-line materializations per keystroke today.
4. The editor's update listener runs on every doc change and does `update.state.doc.toString()` (`setup/editor-extensions.ts:173,191`) plus a lazy scan from line 1 to the closing fence with early break (`:175-188`).
5. The repo has already paid for a full-doc string copy per rebuild: `core/frontmatter-slice.ts:3-10` says it exists to avoid "typing lag in large notes". Precedent that the owner's long notes make this cost visible.
6. No `transactionFilter`, `changeFilter` or `atomicRanges` exists under `src/lib` (grep over `src/lib`). The only filter active in the editor today is CodeMirror's own `indentOnInput()` (`setup/editor-extensions.ts:136`), whose source is the model for a cheap filter: it returns `tr` immediately unless `tr.docChanged` and the userEvent is `input.type` or `input.complete`, reads `tr.newDoc` (lazy) instead of `tr.state`, and only touches `tr.state` after three cheap bail-outs (`@codemirror/language@6.13.1/.../dist/index.js:1188-1216`).

Library mechanics that set the cost model (`@codemirror/state@6.7.6/.../dist/index.js`):

7. `filterTransaction` runs every changeFilter first, then every transactionFilter, against `tr.startState` (`:2430-2468`). If a changeFilter returns `true` nothing is rebuilt. If it returns a range array, `tr.changes.filter(result)` runs and a NEW `Transaction` is created (`:2443-2455`): allocation plus `StateEffect.mapEffects`, per keystroke, if the array is returned unconditionally.
8. `Transaction.state` computes the whole next state on demand (all StateFields, so `computeFrontmatter` and the four other O(N) passes) and the doc comment tells filters not to read it (`:2275-2285`). `tr.newDoc` and `tr.newSelection` are lazy and cheap (`:2263-2274`). `tr.isUserEvent` is one annotation lookup plus a string prefix compare (`:2313-2316`). `tr.docChanged` is `!changes.empty` (`:2298`).
9. A transactionFilter result that is not a `Transaction` goes through `asArray(filtered)` then `resolveTransaction(state, specs, false)` (`:2457-2466`, `:2478-2481`). `undefined` gives `none = []`, which resolves to an empty spec: a transaction with no changes, no selection, no annotations. Returning nothing therefore drops the user's edit.
10. A spec returned from a transactionFilter is built with `filter = false` (`:2465`), so changes added or rewritten there are not seen again by changeFilters. Changes appended by another filter (indentOnInput's `{ changes, sequential: true }`, language `:1215`) also bypass our changeFilter. Facet precedence puts earlier extensions later in the run (`:2458`, loop from the end), and `indentOnInput()` is earlier in the array than `livePreview(...)` (`setup/editor-extensions.ts:136` vs `:146`), so it runs after ours and its line-start reindent edits are only on the head line.
11. `state.field(f, false)` on a startState is an address lookup with `ensureAddr` already `Computed` (`:2023-2038`, `:2572-2581`). `RangeSet.size` is O(chunks) (`:3203-3210`); `set.iter()` builds a heap cursor (`:3318-3320`).
12. `ChangeSet.filter(ranges)` is O(sections) and the range array is a flat `[from, to, from, to...]` list (`:892-922`). A suppressed deletion still maps the explicit selection: after filtering, `tr.selection.map(back)` with `back = filtered.mapDesc(changes).invertedDesc` (`:2450-2454`), and `SelectionRange.map` uses `assoc = -1` for a cursor (`:1321-1329`), and `ChangeDesc.mapPos` returns the position BEFORE an insertion at that point when `assoc < 0` (`:736-756`).
13. `view.dispatch(spec)` runs filters once; commands that pass a ready `Transaction` (`applyDefaultInsert` ends in `startState.update(...)` then `view.dispatch(tr)`, `@codemirror/view@6.43.15/.../dist/index.js:4478`) do not refilter. Some helpers call `state.update` speculatively (closeBrackets, completion), so the filter can run two or three times per keystroke. Inference from reading; the count is not measured.
14. Composition goes through the same path: `applyDefaultInsert` tags `input.type`, plus `.compose` and `.start` (`view dist :4468-4478`). The DOM has already changed when this runs, so suppressing or rewriting a composition change is riskier than for a plain key (inference, see R6).

Existing helpers for "where does the frontmatter end":

15. `frontmatterEnd(state)` (`plugins/frontmatter-field.ts:53-59`): max `to` over the field's decorations, `null` when the field is absent (decorator disabled, source mode) or empty. `bodyStart` (`:62-65`) adds the `end >= doc.length` rule. Both are O(frontmatter lines) and both already take any `EditorState`.
16. `findFrontmatterBlock` (`parsers/frontmatter.ts:17-32`) uses `/^---\s*$/` for both fences. `frontmatterSlice` (`core/frontmatter-slice.ts:12-18`) requires line 1 to equal `---` exactly, starts looking at line 3, and accepts any line that `startsWith('---')` as the closer. `getPositionAfterFrontmatter` (`core/editor/editor.logic.ts:110-123`) does `content.split('\n')`. The update listener uses `FRONTMATTER_FENCE_RE` from line 2 (`setup/editor-extensions.ts:177-181`). Four rules; only the first one is what `hideLines` hides.
17. Cheap range patterns already in use: `touchedLines` is O(selection ranges) and merges intervals so select-all costs O(ranges) (`core/reveal.ts:25-41`, `:62-74`); the tag handler computes `frontmatterSlice(...).length` once per build and caches it in `scratch` (`inline/handlers/tag-handler.ts:27-33`); `checkUpdateAction` is stateless and reads only the current update (`core/check-update-action.ts:19-43`).
18. Transactions that must stay untouched and that carry no userEvent: `dispatchMetaBindUpdate` (`widgets.ts:895-896`, builds the whole `doc.toString()` itself), the external doc replace (`MarkdownEditor.svelte:189-194`, `Transaction.addToHistory.of(false)`), the context-menu caret move (`:308`), the scroll-debounce `forceDecorationRebuild` effect (`core/effects.ts:4`, dispatched by `core/scroll-debounce-plugin.ts`). Userevent writers: `delete.cut` (`MarkdownEditor.svelte:345`), `input.paste` (`:362`, `paste-html-link-handler.ts:41`, `paste-tsv-handler.ts:36`), `input.table.add-column/add-row` (`widgets.ts:517,532`), `input.callout.set-type` (`callout-field.ts:87`), `input.codeblock.set-language` (`code-block-widget.ts:180`). All edit body text.

## Cost model for the guard (inference from the facts above)

- Scroll rebuilds, external syncs, meta-bind and Properties writes, undo/redo: first check (`!tr.docChanged && !tr.selection`, or userEvent not in the list) fails. Cost: one `docChanged` getter and one annotation read. Negligible.
- Arrow key or select-all in a note with frontmatter: one `frontmatterEnd` (2F decoration visits, F = frontmatter lines, typically under 30) plus an O(ranges) pass over `tr.selection`. Microseconds. A multi-cursor of thousands of matches is O(matches), comparable to the work CodeMirror already does for that selection.
- Typing in the body: same lookup, then `iterChangedRanges` over one range, `fromA >= bodyStart`, return `true` / `tr`. Microseconds, no allocation if the no-op paths return the incoming `tr` and `true`.
- Replace-all with 10k matches: `iterChangedRanges` is O(sections) and so is `ChangeSet.filter`, the same order as applying the change.
- The 5x O(N) per-keystroke baseline for a 20k-line note is milliseconds; a guard that is O(F) is under 1 percent of it. Adding a sixth `getAllLines` or a `tr.state` read costs a full extra pass (and `tr.state` triggers ALL fields, then the rewritten transaction is recomputed if the filter returns a new one).
- A hidden range with a huge F (a note that starts with a horizontal rule and has the next `---` thousands of lines later is treated as frontmatter, `parsers/frontmatter.ts:25-29`) makes `frontmatterEnd` O(F) per event, about 2F visits. Still smaller than `computeFrontmatter` on the same note, which does the same F work through `hideLines` plus `getAllLines`. A cache is not needed for the owner's real notes; if wanted, record the closing `to` in a `WeakMap<DecorationSet, number>` inside `computeFrontmatter` (zero extra cost at creation). A WeakMap filled lazily inside the filter does not help typing, because every doc change creates a new set (`:36-41`), so each keystroke would miss.

## Regression risks for Issue 002

Each risk: scenario, what breaks, likelihood for this owner, prevention. R1 to R3 are not strictly performance; they were found while tracing the filter mechanics and are higher-impact than any speed issue. Likelihoods are inference.

### R1. A suppressed Backspace parks the caret inside the hidden fence, then every keystroke is swallowed

- Scenario: caret at the start of the first body line (the normal landing after opening a note, `MarkdownEditor.svelte:407`, or after the new Cmd+Up clamp). Backspace (or a held Backspace running past the line start, the Issue's own trigger). `deleteCharBackward` yields `changes: [bodyStart-1, bodyStart)` and an explicit `selection: cursor(bodyStart-1)`. The changeFilter returns `[0, bodyStart]`, the deletion is suppressed, and CodeMirror maps the explicit selection with `back` (Fact 12). Tracing `mapPos(bodyStart-1, -1)` through an inverted deletion lands on `bodyStart-1`, which is the end of the closing fence (`frontmatterEnd`), a hidden position. Each further Backspace suppresses again and walks the caret one character further back into the YAML. The selection clamp in the Issue only handles transactions with no doc change and userEvent `select`, so nothing repairs this.
- What breaks: after one Backspace at the body start, the next typed character is an insertion inside `[0, bodyStart]` and is suppressed (or returns `false` at 0). The owner sees keys doing nothing, with no visible caret, until a click. The doc stays intact, so no data loss, but it reads as a frozen editor. Cmd+Z may also look wrong because nothing was recorded.
- Likelihood: high once the guard ships. Backspace at the start of the first line is a reflex (clearing the first body line, key repeat). Caveat: derived from reading `@codemirror/state` 6.7.6, not run.
- Prevention: add a post-narrowing step so the resulting selection can never sit below `bodyStart`. In the transactionFilter, for transactions whose userEvent is `select`, `input`, `delete` or `move` (any of them, doc change or not), clamp `tr.newSelection` to `>= bodyStart` and return a spec with `changes: tr.changes`, `selection`, `effects`, `annotations`, `scrollIntoView`; return `tr` when nothing needs clamping. After a changeFilter narrowing, the hidden prefix is unchanged, so the new body start equals `bodyStart`. Alternative: also test the resulting selection in the same filter that suppresses. Do not rely on the changeFilter alone.

### R2. Typing is silently dropped when a caret sits in the hidden range by a non-user selection

- Scenario: a programmatic caret at or below `bodyStart - 1`: the context-menu caret move at the top padding (`MarkdownEditor.svelte:308`, no userEvent, so not clamped), an external replace that inserts frontmatter above a caret at 0 (the mapped caret stays at 0 with `assoc = -1`; Properties panel or a template adding frontmatter to an empty note, inference, not traced), or a note whose frontmatter becomes valid while the caret is on the closing line (typing the third `-` of the closing fence in a note that has text after it leaves the caret at `frontmatterEnd`; Enter there is then an insertion at `end < bodyStart` and is suppressed, while today Enter there works).
- What breaks: today those keystrokes edit the hidden YAML (bad, visible when it breaks). After the guard they vanish. The change returns `false` at 0 and narrows elsewhere, but the user gets no signal.
- Likelihood: medium for the Properties/template path (owner uses properties and templates daily), low for hand-typed fences.
- Prevention: decide explicitly, with a test, what the guard does with a user input whose selection is in the hidden range. Safer than dropping: re-target pure insertions and replacements to `bodyStart` (or clamp the caret first on the first user edit). At minimum, record the swallow as accepted and test that the first character after an external frontmatter write at caret 0 is not lost.

### R3. Tests that assert only the document would pass while R1 is present

- Scenario: the Issue's cases "deleteCharBackward leaves the doc equal to DOC" and "five deleteCharBackward calls leave the doc exactly FRONTMATTER" pass with the caret walking into the YAML (`FRONTMATTER + 'ab'` has bodyStart 21 and a valid empty last line, so the guard is active).
- Prevention: every suppressed-edit test must also assert `selection.main.head >= bodyStart` and that a following `input.type` lands at `bodyStart`. See test list below.

### R4. Filter implementation re-derives the range from the document (cost and correctness)

- Scenario: the implementer calls `getAllLines` / `findFrontmatterBlock` (an extra O(N log N) pass per event, the sixth) or `frontmatterSlice` / `getPositionAfterFrontmatter` (a different fence rule, Fact 16, and a `split` or string copy).
- What breaks: measurable typing lag on long notes, which the repo already fought once (`core/frontmatter-slice.ts:3-10`); or a guard range that does not match what is hidden, for instance a `---- ` line or a `---\n---` empty block.
- Likelihood: moderate (the helper is right there and the Issue text says "existing helpers", which is `frontmatterEnd`/`bodyStart`, not the parsers).
- Prevention: read `frontmatterEnd(tr.startState)` only. Do not read `tr.state`, `view` or `getAllLines`. The field is the single source of truth for what is hidden.

### R5. A no-op path returns `undefined` or a range array

- Scenario: the transactionFilter has a bare `return;` or an implicit return on the fast path, or the changeFilter returns `[0, bodyStart]` unconditionally.
- What breaks: `undefined` from a transactionFilter yields an empty transaction (Fact 9), so every keystroke in notes with frontmatter is dropped; this passes `pnpm check` only if the return type is loosened, and the TypeScript signature (`Readonly<TransactionSpec> | TransactionSpec[] | Transaction`) normally forbids it. An unconditional range array makes `filterTransaction` rebuild the transaction on every keystroke (Fact 7): allocation, `mapEffects`, and a selection remap, on composition changes too.
- Likelihood: low if the types are kept strict, but the cost of a miss is total (typing dead on every note with properties).
- Prevention: transactionFilter returns `tr` itself on every no-op path; changeFilter returns `true` unless some `fromA < bodyStart`; keep the signatures typed. A test that dispatches body typing and asserts the transaction is applied unchanged (doc, selection, effects, userEvent annotation) covers it.

### R6. Composition (dead keys, accents) at the first body line

- Scenario: the owner types Portuguese accents (`~` then `a`, `'` then `e`, `c` cedilla) at the start of the first body line, and in table cells and meta-bind inputs. CodeMirror reads the browser's DOM change and dispatches `input.type.compose` / `.start` (view dist `:4468-4478`). The first body line starts at `bodyStart`, so the replaced range begins at `bodyStart` and `fromA >= bodyStart`, which the planned filter lets through. Risk: CodeMirror's DOM-diff can widen a change backwards by a character at a line boundary in some browser paths (not traced), which would put `fromA = bodyStart - 1` and suppress the composition, desynchronizing the DOM from the state while the IME is mid-composition.
- What breaks: a lost or doubled accent at the first body line, or an aborted composition; only at the first line.
- Likelihood: low to medium; unverified. The fast path (return `true`, same `tr`) is what keeps every other composition untouched.
- Prevention: never rewrite or narrow a transaction whose changes all start at or after `bodyStart`; add the composition cases below; do a manual Portuguese check on the first body line before merging (jsdom cannot reproduce an IME).

### R7. Selection clamp breaks goal column and scroll on ArrowUp bursts

- Scenario: ArrowUp / PageUp / Cmd+Up from the first body line. `cursorLineUp` computes a head on a hidden line, the filter replaces the selection with `cursor(bodyStart)`.
- What breaks: the new selection object has no goal column, so a following ArrowDown restarts from the clamped column; each press still dispatches a transaction with `scrollIntoView` (harmless). Cost is negligible (one dispatch per press, `checkUpdateAction` answers `'none'` because `sameTouchedLines` is true, `core/check-update-action.ts:34-36`).
- Likelihood: certain, cosmetic. Keep the range's flags if easy (`EditorSelection.cursor(pos, assoc, bidiLevel, goalColumn)`); otherwise accept.

### R8. A changeFilter range array lets a pure insertion at 0 through, and a transactionFilter spec bypasses changeFilters

- Scenario: the `[0, bodyStart]` range keeps a pure insert at 0 (`ChangeSet.filter` branch `pos == next && iter.len == 0`, `:897`). The Issue handles it with `false`. A drag-drop onto the top padding (`move.drop`) is a delete plus an insert at 0: `false` drops both, which is correct; narrowing alone would apply the delete and put the dragged text above the opening fence.
- What breaks: only if the `false` branch is implemented as "whole transaction has an insert at 0" and is applied to replace-all or multi-cursor transactions that also contain legitimate body changes (they would all be dropped).
- Likelihood: low. Prevention: apply `false` only when every changed range lies below `bodyStart` and at least one is an insert at 0; otherwise narrow. Test with a replace-all that also has an insert at 0.

### R9. Key-repeat and event frequency

- Scenario: key repeat on Backspace or arrows runs the filter about 30 times per second, and speculative `state.update` calls can double that (Fact 13).
- What breaks: nothing, if the cost model holds. The risk is only R4/R5.
- Prevention: the structural test below (filter does not compute a new state) plus a report-only timing check.

## Test cases the Issue must add (beyond its list)

All in `frontmatter-field-keyboard.test.ts` unless noted. Real stores and logic, no mocks, per project rules. Timing checks are report-only, not gates (see the repo's stance that latency is reported, not gated).

Correctness of the narrowing (R1, R3, R2, R8):

1. After a suppressed Backspace at the first body line start, assert `view.state.selection.main.head === BODY_START` and doc equals DOC; then `view.dispatch({ ...view.state.replaceSelection('x'), userEvent: 'input.type' })` gives `FRONTMATTER + 'xFirst body line...'` (typing still works).
2. Five Backspaces in `FRONTMATTER + 'ab'`: assert the doc is exactly FRONTMATTER and `selection.main.head === FRONTMATTER.length`, then typing `x` appends at the end of the doc. Repeat with `deleteCharForward` after `cursorDocStart`.
3. Backspace with a range selection that straddles the fence (anchor 3, head in the body): fence untouched, selection has no end below `bodyStart`.
4. A transaction with `userEvent: 'delete.backward'` and a selection that is explicitly set inside the hidden range: resulting selection is clamped.
5. A pure insert at 0 mixed with a body change in one `input.replace.all` transaction: body change applies, doc otherwise unchanged; a `move.drop` style transaction (delete body text, insert at 0) leaves the doc equal to DOC.
6. After an external write with no userEvent that inserts frontmatter above a caret at 0 (the Properties path), assert the intended behavior of the first typed character (R2). The Issue must say whether it is re-targeted to `bodyStart` or dropped, and the test pins that choice.
7. Enter at the end of a just-completed closing fence that has text after it (caret at `frontmatterEnd`), pinning the chosen behavior.

Fast paths and no-op sentinel (R4, R5):

8. For each of `input.type`, `input.type.compose`, `input.type.compose.start`, `input.complete`, `input.paste`, `delete.backward`, `delete.cut`, `move.line`, `undo`, `redo`, no userEvent, `select.pointer`: a change or selection at or after `bodyStart` produces a transaction identical to the one produced with the guard extension removed (same `changes.toJSON()`, selection, effects, `userEvent` annotation, `addToHistory`). This also pins prefix semantics of `isUserEvent` for subtypes.
9. Filter does not force new-state computation: use the profiling port as the seam (`core/profiling.ts:20-25,51-55`, `configureProfiling({ isEnabled: () => true, log })`; `computeFrontmatter` brackets itself with `profileStart('frontmatter')` at `plugins/frontmatter-field.ts:38`). Call `state.update(spec)` without reading `.state` for each case in 8 and assert no `LP-TRACE enter: frontmatter` line was logged, then read `.state` and assert exactly one. Restore the port in `afterEach`.
10. No-op sentinel: a body keystroke through `state.update(...)` is applied (doc changed). This catches a `return;` in the transactionFilter, which would turn it into an empty transaction (Fact 9).
11. Decorator disabled or source mode: `mount(..., { frontmatter: true })` and a state built without the live-preview array: `frontmatterEnd` is null and the same edits behave as today (already in the Issue for Backspace; add moveLine and paste at 0).

Composition and Portuguese (R6):

12. Dispatch `{ changes: { from: BODY_START, insert: '´' }, userEvent: 'input.type.compose.start' }` then `{ changes: { from: BODY_START, to: BODY_START + 1, insert: 'á' }, userEvent: 'input.type.compose' }`: both apply unchanged and the doc starts with `FRONTMATTER + 'áFirst...'`. Repeat on line 2 of the body and with `ã`, `ç`.
13. Manual check (not automatable in jsdom): type `~a`, `'e`, `c` with the Brazilian layout at the first body line start, in a table cell on the first body line, and in a meta-bind input widget, with the guard on. Record the result in the Issue.

Scale (R4, R9), report-only:

14. Build a 20k-line body with a 20-line frontmatter and a 100-line body with the same frontmatter. Time 2000 `state.update({ changes: { from: end, insert: 'x' }, userEvent: 'input.type' })` calls (no `.state` read, so only filters and transaction creation are measured) on each and log the ratio; the cost should not grow with the body. Log the same with the guard removed. Not a gate.
15. Replace-all: `input.replace.all` with 5000 body matches plus one frontmatter match completes and changes only body occurrences (correctness at scale).
16. Huge hidden range: a note that starts with `---` and has the next `---` 3000 lines down: typing below it applies, and the guard stays correct (the range is hidden today, so it protects it; record that this is by design).

Suites to keep green with no edits (already listed by the Issue): `frontmatter-field.test.ts`, `frontmatter-field-click.test.ts`, `invariants-harness.test.ts`, `meta-bind-writers.test.ts`, `undo-history-across-notes.test.ts`. Also run the editor suites that dispatch `input.*` at body positions (table, callout, code-block widget tests) since they now pass through the filters.

## Not checked

- No code was run, so none of the cost figures are measured and R1 (the caret remap after a suppressed deletion) is a trace of `@codemirror/state` 6.7.6 source, not an observation. A five-line jsdom test (case 1 above) settles it before any implementation.
- Whether CodeMirror's DOM diff widens a composition change backwards at the first body line (R6) was not traced in `@codemirror/view`.
- The Properties panel and template paths that leave a caret at 0 (R2) were inferred from the replace-doc selection handling (`MarkdownEditor.svelte:182-200`), not traced end to end.
