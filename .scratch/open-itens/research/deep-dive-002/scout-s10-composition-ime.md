# Scout s10: text composition, IME and dead keys vs the Issue 002 guard

Read-only research. Nothing was run (no vitest, no e2e, no app). Library behavior comes from reading `node_modules/.pnpm/@codemirror+*` source: view 6.43.15, state 6.7.6, commands 6.11.1, autocomplete 6.20.4, language 6.13.1. Paths below are shortened: `view` = `@codemirror+view@6.43.15/node_modules/@codemirror/view/dist/index.js`, `state` = `@codemirror+state@6.7.6/.../state/dist/index.js`, `commands` = `@codemirror+commands@6.11.1/.../commands/dist/index.js`, `autocomplete` = `@codemirror+autocomplete@6.20.4/.../autocomplete/dist/index.js`. Facts carry path:line. Inference is marked "Inference". Behavior of the real macOS WKWebView (Tauri) is never verified here: Playwright runs Chromium only (`e2e/playwright.config.ts:23`).

Notation: `bodyStart` is the start of the first line after the hidden frontmatter; the hidden range is `[0, bodyStart)` (`F1 = bodyStart - 1` is the end of the closing fence line).

## Summary

The Issue's guard is safe for the owner's accent typing only if it obeys three rules the Issue does not state:

1. **Never drop, narrow or rewrite a DOM-originated change (typing, dead-key composition, accent popup, dictation, autocorrect).** CodeMirror reads these from DOM mutations. If the transaction does not apply the change, the editor redraws the line from the document and the composing text node is destroyed. The owner sees "the accent did not appear" or a flicker, which is exactly the kind of new bug the owner fears. The only safe policy for `input.type.compose*` is pass-through unchanged.
2. **Return the same `Transaction` object (or, for a spec, carry over all annotations) on the no-op path.** The Issue says the `changeFilter` returns `[0, bodyStart]` for every `input`/`delete`/`move` transaction. In `@codemirror/state` any array result rebuilds the transaction on every keystroke (`state:2443-2455`). That is harmless only if all annotations survive. A spec return that omits `annotations` silently loses `userEvent`, which breaks undo grouping of accents (`commands:506-507`), completion activation (`autocomplete:955-956`) and `indentOnInput` (`language:1190`).
3. **The caret must never rest inside the hidden range after any user transaction.** If it can (suppressed Backspace, right-click in the top padding, a search jump), the next dead key creates its composition inside a `display:none` line. Everything downstream is then either today's fence corruption or a silently dropped accent.

Beyond those, the exact boundary matters more for Portuguese than for other input: the first character typed in a new note, or right after Cmd+Up and Enter, is often an accent (`Á`, `É`, `Ã`, `Ó` via a dead key), and both composition steps land exactly at `bodyStart`. An off-by-one (`<=` instead of `<`, or a `touchesRange` that counts the boundary) breaks only this case and none of the mid-line cases the Issue's tests cover.

I found no way for a correctly scoped guard to move a composition's `from` below `bodyStart` when the caret is in the first body line (Facts F4), so composition and the guard do not interact on the happy path. The risk is all in the failure paths and in the rebuilt-transaction path.

## Facts

### F1. How composition and DOM edits reach the document (macOS WKWebView path)

- EditContext is used only on Android (`view:7214`: `window.EditContext && browser.android && ...`). On macOS WKWebView the editor uses the DOM mutation path for every text input, including dead keys, the press-and-hold accent popup, dictation and spellcheck or text-replacement edits.
- `compositionstart` (`view:5310-5326`): sets `compositionFirstChange = true`; if `composing < 0` and the main selection is non-empty and spans more than one line, it calls `view.dispatch({changes: <each non-empty range>, userEvent: "input"})` BEFORE setting `composing = 0`. So typing a dead key over a multi-line selection first dispatches an `input` delete of the whole selection.
- `compositionend` (`view:5327-5352`): `composing = -1`, `compositionEndedAt = Date.now()`, `compositionPendingChange` if mutation records are pending, then a microtask flush or a 50 ms `view.update([])`.
- `beforeinput` (`view:5356-5408`): Safari "forgets" `compositionend` for dead keys, so CodeMirror fakes it 20 ms after an `insertText` while composing (`view:5403-5406`).
- Mutation to change: `DOMObserver.flush` (`view:7516-7535`) -> `readChange` (`view:7502-7514`) -> `readMutation` (`view:7536-7553`) -> `applyDOMChange` (`view:4289-4372`) -> `applyDOMChangeInner` (`view:4373-4404`) -> `applyDefaultInsert` (`view:4405-4479`).
- `applyDOMChangeInner` bumps `composing` (`view:4397-4398`), runs the `inputHandler` facet (`view:4401`), else `view.dispatch(defaultInsert())`.
- `applyDefaultInsert` builds the transaction with `startState.update(tr, { userEvent, scrollIntoView: true })` (`view:4478`). `state.update` runs the filters at that moment, so the guard runs inside this call, before `view.dispatch`.
- The userEvent is `input.type`, plus `.compose` when `view.composing` (changes seen, `composing > 0`, getter at `view:7921`) or when a composition ended less than 50 ms ago with pending records (`view:4468-4478`), plus `.start` for the first change. `compositionStarted` is `composing >= 0` (`view:7928`).
- A dead key at a line start produces two transactions: `input.type.compose.start` (insert the composing glyph) then `input.type.compose` (replace it with the final glyph). The second is a replace `[p, p+1]`, so `fromA = p`.

### F2. What happens when a DOM-originated change is dropped (relevant to any `false`, any narrowing that empties the change)

- `flush` (`view:7529-7533`): if the state object is unchanged after `applyDOMChange` and the DOM changed, it calls `view.update([])`, a full redraw from the document. If a dispatched transaction ends up with empty changes the state object still changes, so this reset is skipped and the redraw must come from the update itself.
- In `DocView.update` (`view:2995-3036`) the composition is re-read via `findCompositionRange`. That function returns `null` when `doc.sliceString(found.from, found.to) != text` (`view:3582`), i.e. when the DOM text node holds the accent but the document does not. `readMutation` already marked the tile dirty (`view:7540`), so the tile is not `Synced` (`view:3028`) and `updateInner` rebuilds the line from the document, replacing the composing node.
- Inference: in WebKit, replacing the composing text node mid-composition cancels or corrupts the composition. The repo has already hit this class of bug: `src/lib/core/markdown-editor/extensions/composition-aware-bracket-matching.ts:26-51` documents that restructuring DOM nodes mid-composition makes text vanish on WKWebView.
- A selection change mid-composition has the same effect: `DocView.update` re-reads the composition only when `!update.selectionSet` or when the DOM-derived `newSel` is present (`view:2996-3001`). A guard that rewrites the selection of a composition transaction away from the DOM selection forces a redraw. Inference: this breaks the composition. It only triggers when the DOM caret was inside the hidden range.
- The repo's own failed attempt: dispatching a compartment reconfigure at `compositionstart` made the cursor jump to line start (`composition-aware-bracket-matching.ts:77-84`). A filter must not dispatch, reconfigure or add effects.
- Autocomplete notes Safari can fire `compositionend` synchronously from inside an update (`autocomplete:1285-1287` comment), so any re-entrant dispatch from a filter is unsafe.

### F3. Which key events CodeMirror ignores during composition

- `ignoreDuringComposition` (`view:4699-4715`) drops key events only when `composing > 0` (at least one change seen) or, on Safari, within 100 ms after `compositionend` when `compositionPendingKey` is set. At `composing == 0` (composition started, no change flushed yet) the keymap still runs. `keydown` skips `forceFlush` for `keyCode 229` (`view:4685-4686`).
- Consequence (Inference): a dead key followed immediately by Backspace at column 0 of the first body line can run `deleteCharBackward` while the composing glyph is in the DOM but not yet in the document. Today that deletes the break after the closing fence. With the guard it becomes a no-op (plus caret clamp if the R1 fix is made).

### F4. Where a DOM-originated change can start relative to `bodyStart`

- `readMutation` reports the whole tile (line) of the mutation target: `characterData` -> `tile.posAtStart .. tile.posAtEnd` (`view:7547-7548`), `childList` -> bounded by siblings (`view:7541-7546`).
- `domBoundsAround` (`view:4259-4288`) returns `from = fromStart`, the start of the first child whose end is at or after the mutation start. The closing fence line ends at `F1 = bodyStart - 1 < bodyStart`, so it is never the first child when the mutation is in the first body line. `hide-lines.ts:17-20` hides each line with a replace over `line.from..line.to` only, so the break is not inside the hidden line.
- `findDiff` (`view:4480-4509`) only moves `from` inside the bounded text, so `from >= bounds.from >= bodyStart`.
- Therefore, for a caret in the first body line (empty or not), both composition steps and autocorrect or text-replacement edits produce `change.from >= bodyStart`. Fact by reading the code; the WebKit DOM shape is not verified.
- A selection-replace branch exists (`view:4303-4309`): if the state selection is non-empty and inside the bounds, the change is `[sel.from, sel.to]`. With a selection that starts in the hidden range (`sel.from < bounds.from`) this branch is skipped and the diff path is used instead.

### F5. What the filter machinery does to a transaction

- `filterTransaction` (`state:2430-2468`): change filters first. `true` keeps the transaction object. `false` or an array rebuilds it with `Transaction.create(state, changes, tr.selection && tr.selection.map(back), mapEffects, tr.annotations, tr.scrollIntoView)` (`state:2443-2455`). So an array result rebuilds on every call, even when nothing is filtered. It keeps `annotations` (including `userEvent` and `time`), so the rebuild is semantically a no-op, but it is a new object each keystroke.
- Transaction filters run last-to-first (`state:2458`). Returning a `Transaction` or a one-element array keeps it; any other value is resolved as a spec with filtering off (`state:2460-2465`, `resolveTransaction` `state:2416-2428`). `resolveTransactionInner` (`state:2403-2415`) reads only `changes`, `selection`, `effects`, `annotations`, `scrollIntoView`, and `userEvent` (as a new annotation). A spec that omits `annotations` loses the original `userEvent` (a new `Transaction.time` is added, `state:2246-2247`).
- `ChangeSet.filter` (`state:892-922`): an insertion at exactly the range end passes, a pure insertion at 0 passes, and a replace that starts inside a suppressed range and ends outside keeps its outside deletion but drops its insert (`state:902-905`). I walked `filter([0, bodyStart])` for both composition shapes: insert at `bodyStart` is kept; replace `[bodyStart, bodyStart+1]` is kept whole. So the Issue's boundary choice is right for composition, provided the implementation does not use a stricter check of its own.
- Registration order: `indentOnInput()` is listed before `livePreview(...)` (`src/lib/core/markdown-editor/setup/editor-extensions.ts:136,146`), so the guard filter runs first, then `indentOnInput`'s filter sees the guard's result (`language:1188-1195` reads `tr.newDoc` and `tr.isUserEvent`).

### F6. Extensions that key off userEvent or replace ranges (all in the owner's editor)

- History: `joinableUserEvent = /^(input\.type|delete)($|\.)/` (`commands:488`), and "for compose (but not compose.start) events, always join with previous event" (`commands:506-507`). Cmd+Z of an accent relies on the exact `input.type.compose` string. A selection-only transaction creates a selection entry via `addSelection` (`commands:515-523`) and a non-empty `selectionsAfter` blocks the 500 ms typing join (`commands:503`).
- Autocomplete: `getUpdateType` (`autocomplete:949-961`) activates on `input.type` only; `completionPlugin.update` tracks `Changed`/`ChangedAndMoved` from `tr.isUserEvent("input.type")` and `tr.selection` (`autocomplete:1183-1189`), and `compositionend` re-triggers completion 20 ms later only in the `ChangedAndMoved` state (`autocomplete:1283-1288`). The app registers wikilink, date and tag sources with `activateOnTyping: true` (`editor-extensions.ts:142-145`).
- closeBrackets: its `inputHandler` returns false while `compositionStarted` (`autocomplete:1844-1846`), so dead-key typing is never auto-paired. For a non-empty selection typing `(`, `[`, `'` or `"` wraps it with two inserts, one at `range.from` and one at `range.to` (`autocomplete:1930-1933`, `1963-1966`). `deleteBracketPair` (the Backspace binding, first in the keymap, `editor-extensions.ts:158`) builds a `delete.backward` with `state.update` (`autocomplete:1878`).
- The repo has no `EditorView.inputHandler` of its own (`grep` over `src/lib` finds only the `autocompletion`/`closeBrackets` imports), and no `contentAttributes`, `spellcheck` or `autocorrect` on the editor. The global `src/app.html:10` sets `spellcheck="false" autocorrect="off" autocomplete="off" autocapitalize="off"` on `<body>`. Whether WKWebView inherits `autocorrect` into the contenteditable is not verified. CodeMirror's own double-space-period workaround reads `view.contentDOM.getAttribute("autocorrect")` (`view:4325-4326`), which is the element's own attribute, so it does not see the inherited one.

### F7. Programmatic writers and the repo's composition tests

- Programmatic frontmatter writers carry no userEvent (`widgets.ts:922-924` per s04 F4). Meta-bind inputs are native `<input>` elements whose key, input and composition events never reach the editor (`src/lib/core/markdown-editor/extensions/live-preview/core/form-control-events.ts:8-10`). The Properties panel is native Svelte input, so accent typing there never goes through the guard; only its write-back does, and that has no userEvent.
- The only composition test in the repo is for bracket matching (`src/tests/lib/core/markdown-editor/extensions/composition-aware-bracket-matching.test.ts`). `grep` for `compose` over `src/tests` and `e2e` finds no test that dispatches `input.type.compose` or fires a `compositionstart` event on the real editor.
- The invariants harness dispatches `input.type`, `delete` and `select` at line starts (`invariants-harness.test.ts:316,335-337,347-358` per refute-002), never a composition userEvent.

## Regression risks for Issue 002

Likelihood is for this owner: Brazilian Portuguese, dead keys (`'`, `` ` ``, `~`, `^`, `"`) and `Option` accents daily, in notes that nearly all have frontmatter.

### C1. Dropping or narrowing a composition transaction desyncs the DOM (high impact, low to medium likelihood)

- Scenario: the caret is inside the hidden range (see C3), or an implementation uses `touchesRange` or `<=` and a composition step touches the boundary. The user presses `~` then `a`.
- What breaks: the filter empties the composition's change. Per F2 the document keeps the old text while the DOM holds the accent, the line is redrawn from the document, and the composing node is destroyed. The accent vanishes, and on WebKit the composition may end half-applied. Nothing visible explains it. If the filter drops only one of the two compose steps, the pair is also inconsistent in history: the second step ("always join with previous event", `commands:506-507`) can join an unrelated older event.
- How likely: low on the happy path (F4: `from >= bodyStart` for a caret in the first body line), medium if the caret can rest in the hidden range.
- Prevention: treat `input.type.compose*` as pass-through. An early `return true` in the change filter and a `return tr` in the transaction filter for any transaction whose userEvent starts with `input.type.compose`, never a narrowing. Accept that a composition typed with the caret in the hidden range edits the fence exactly as today (fail-open, no regression), and prevent that state upstream with C3. Also never rely on `.compose` being present: the last change of a composition can arrive as plain `input.type` (`view:4469-4470`, within 50 ms of `compositionend`), so apply the same pass-through rule by position (`fromA >= bodyStart` means pass) rather than by userEvent.

### C2. The "always return `[0, bodyStart]`" change filter rebuilds every transaction, and a spec return can lose userEvent (medium impact, medium likelihood if implemented literally)

- Scenario: the Issue says to return `[0, bodyStart]` for every `input`/`delete`/`move` transaction. Every typed character and every composition step then takes the rebuild path (`state:2443-2455`). Separately, the selection stage returns a spec; the Issue says to carry "effects, annotations and scrollIntoView", but dossier-002 step 3 and the refute notes also mention `{selection}`-only shapes.
- What breaks: (a) With a spec that omits `annotations`, `userEvent` disappears. Then `input.type.compose` no longer always joins (`commands:506-507`), so one accented letter becomes two undo steps (Cmd+Z leaves the bare `´`); wikilink and tag completion stop activating or re-triggering after an accented character (`autocomplete:955-956,1185-1188`); `indentOnInput` skips the transaction (`language:1190`). (b) With the array path and correct annotations, behavior is the same as today but costs a ChangeSet rebuild per key; not a correctness problem.
- How likely: medium. It depends on the implementer. The owner types accents in wikilinks (`[[Ação]]`) and tags daily, so the completion regression would be seen quickly.
- Prevention: the change filter returns `true` unless a changed range has `fromA < bodyStart` (check with `tr.changes.iterChangedRanges`, strict `<`). Only then return the array (or `false`). The transaction filter returns `tr` itself when nothing needs changing and, when it builds a spec, passes `{ changes: tr.changes, selection, effects: tr.effects, annotations: tr.annotations, scrollIntoView: tr.scrollIntoView }`. Do not use `userEvent:` in the spec (it appends a second annotation).

### C3. A caret left in the hidden range turns the next accent into a silent loss (high impact, medium likelihood; shares its cause with s04 R1 and R5)

- Scenario: Backspace at `bodyStart` is suppressed but its explicit selection moves the caret to `F1` (s04 R1); or a right-click in the top padding (`MarkdownEditor.svelte:302-310`) or a search jump (`MarkdownEditor.svelte:606-609`) places a programmatic caret at 0. The user then types `é` via dead key.
- What breaks: the composition starts in a `display:none` line. With C1's pass-through it edits the fence as today. Without it, the first `compose.start` is narrowed or dropped (C1). For plain letters the insert is dropped. The owner sees an invisible caret and typing that does nothing.
- Prevention: clamp the post-change selection of every user transaction (not only `select`) as s04 R1 proposes, returning the same `tr` when every range is already `>= bodyStart`. Add a jsdom test for "after a suppressed Backspace, a compose pair at the caret lands in the body" (see Test cases T4).

### C4. Selection clamp that rebuilds a transaction during a composition (medium impact, low likelihood)

- Scenario: a `select`-userEvent transaction arrives while a composition is active. `applyDOMChange` dispatches DOM-derived selection changes as `select` when no key or pointer origin is recent (`view:4357-4367`); Safari's fake `compositionend` (`view:5403-5406`) and dictation also produce selection updates.
- What breaks: if the clamp returns a spec with a selection different from the DOM selection, `DocView.update` does not re-read the composition (`view:2996-3001`), so the composing text is redrawn from the document (F2).
- Likelihood: low. It needs the DOM caret in the hidden range during a composition.
- Prevention: a state filter cannot read `view.composing`, so the rule is structural: return `tr` unchanged unless some range is actually below `bodyStart`. A composition that started in the body never has a range there, so the clamp stays out of its way.

### C5. A paired change straddling the fence applies half (low likelihood, but composition and auto-pair adjacent)

- Scenario: a non-empty selection that reaches into the hidden range. Only pointer selections can do this after the clamp: a drag that starts in the body and ends in the top padding, or Shift+Click in the padding (`frontmatterClick` only acts when the press itself maps into the padding, `frontmatter-field.ts:88-90`). The user types `(` or `"`, or presses a dead key.
- What breaks: (a) `closeBrackets` wrap issues two inserts, one at `range.from` (hidden, suppressed) and one at `range.to` (applied), so a stray `)` or `"` appears at the end of the selection (`autocomplete:1930-1933`). (b) A dead key over the selection runs the `compositionstart` multi-line delete (`view:5317-5322`) as an `input` transaction straddling `bodyStart`; narrowing applies the body part and maps the selection to `[0, bodyStart]`, a non-empty selection spanning hidden text (Inference), and the composition then starts with that selection.
- Prevention: the same all-or-nothing rule as s04 R3/R4 (return `false` for any non-`replace.all` change that straddles or pairs across `bodyStart`) plus the post-change selection clamp. This is a case where `false` is safer than narrowing; it must not apply to compose events (C1), and a `compositionstart` delete is `input`, not `input.type.compose`, so it would be `false`d. Decide and pin it with test T6.

### C6. Off-by-one at `bodyStart` breaks only the first character of the note body (medium impact, medium likelihood if the boundary is written wrongly)

- Scenario: new note or Cmd+Up then typing `Á` (dead key `´` then Shift+a), `É`, `Ã`. Both compose steps hit exactly `bodyStart` (insert at `bodyStart`, then replace `[bodyStart, bodyStart+1]`). Also the first character typed after Enter on an empty first body line.
- What breaks: with `fromA <= bodyStart`, `touchesRange(0, bodyStart)` or an array that includes `bodyStart + 1`, this exact case is suppressed (C1 symptoms) while every mid-line accent still works, so the Issue's existing mid-body tests pass.
- Prevention: strict `fromA < bodyStart` for changes; explicit tests at exactly `bodyStart` for both steps, on an empty and a non-empty first body line (T1, T2). Also test a frontmatter containing accents (`título: ação`) so `bodyStart` is checked in UTF-16 offsets that differ from byte offsets (T7).

### C7. Guard design that adds decoration churn or a dispatch during composition (medium impact, low likelihood)

- Facts: `frontmatterField` rebuilds its whole `DecorationSet` on every `docChanged` (`frontmatter-field.ts:36-41`), including on every composition step. That is pre-existing and appears harmless because the rebuilt set compares equal (`PointDecoration.eq` uses `widgetsEq`, `view:355-358,378-380`; Inference that two `Decoration.replace({})` compare equal). `frontmatterEnd` iterates that set per call (`frontmatter-field.ts:52-58`), O(frontmatter lines).
- Risk: an implementation that makes the guard a new StateField, adds a decoration, or dispatches an effect on each transaction would change what is drawn on the composing line and reproduce the bug documented in `composition-aware-bracket-matching.ts`.
- Prevention: keep the guard as two pure filters with no state, no decorations, no effects, no `view` access, no dispatch. Compute `frontmatterEnd(tr.startState)` only after the cheap exits (no doc change and no selection; userEvent not in the list).

### C8. Dictation, accent popup, autocorrect and text replacement (low likelihood, same rules)

- These arrive through the same DOM-change path as composition (F1) and are `input.type` or `input.type.compose` changes with `from >= bodyStart` for a caret in the first body line (F4). Press-and-hold `a` inserts `a` then replaces it with the chosen accent (a replace `[p-1, p]`; at the first body line `p-1 = bodyStart`, which is fine).
- `src/app.html:10` turns spellcheck and autocorrect off, but whether the WKWebView contenteditable inherits `autocorrect` is unverified (F6). Text replacements and dictation can still replace a word at the first position of the first body line; the change starts at `bodyStart`, so it passes.
- Dictation behavior in WKWebView (marked text versus plain `insertText`) is unverified. Treat it as a composition: pass-through (C1).
- Prevention: nothing extra beyond C1 and C6; add manual checks (Test cases M1-M6).

### C9. Cmd+A followed by an accent: improves, but is an owner-visible path worth pinning (low risk)

- Today `selectAll` selects `0..length`; a dead key then runs the `compositionstart` multi-line delete of everything including the frontmatter (`view:5317-5322`). With the Issue's clamp the selection is `[bodyStart, length]`, so the delete removes only the body and the composition starts at `bodyStart`. That is correct, and the filter must let that `input` transaction through (it is `>= bodyStart`).
- Prevention: test T5 with a real `compositionstart` event so the actual CodeMirror path runs.

### C10. Safari ordering quirks the guard must not depend on (informational)

- Key events right after `compositionend` can be reordered on Safari (`view:4704-4713`), and the last change of a composition may be classified `input.type` without `.compose` (`view:4469-4470`). The guard must therefore decide by position and by `isUserEvent('input')`, never require `.compose` to recognize a composition.

## Test cases the Issue must add

jsdom cases go in the new `frontmatter-field-keyboard.test.ts` (real `livePreviewExtensions`, real history, no mocks). jsdom has no WebKit composition, so cases dispatch the same transaction shapes CodeMirror produces (F1) and fire real `compositionstart` and `compositionend` events on `view.contentDOM` where the editor's own handler matters (`CompositionEvent` exists in jsdom; Inference that the handlers run there, the existing bracket-matching test does not use them, so verify when writing).

- **T1. Dead-key pair at exactly `bodyStart`, non-empty first body line.** `DOC`, caret at `BODY_START`. Dispatch `{changes:{from:BODY_START, insert:'´'}, selection:{anchor:BODY_START+1}, userEvent:'input.type.compose.start'}`, then `{changes:{from:BODY_START, to:BODY_START+1, insert:'é'}, selection:{anchor:BODY_START+1}, userEvent:'input.type.compose'}`. Assert the full doc is `FRONTMATTER + 'éFirst body line.\n\nEnd line.'`, the caret is `BODY_START + 1`, and a single `undo(view)` restores `DOC` exactly (history join, `commands:506-507`). Fails if the filter suppresses either step or the transaction loses its userEvent.
- **T2. Same on an empty first body line** (`FRONTMATTER + '\nEnd'`, caret at `BODY_START`), and on the last line of a doc whose body is only the empty line after the fence (`FRONTMATTER` plus nothing, `bodyStart == doc.length`). Also the same pair mid-line and on the last line as controls.
- **T3. Guard-on equals guard-off for composition.** Mount twice (`mount(DOC, n)` and `mount(DOC, n, { frontmatter: true })`) and run T1's sequence on both. Assert identical doc, identical selection, identical `undoDepth(view.state)`, and, via an `updateListener`, identical `tr.annotation(Transaction.userEvent)` and `tr.isUserEvent('input.type')` for every transaction. Add the same for plain `input.type`, `delete.backward` in the body, `select`, and `input.complete`.
- **T4. Annotation and identity on the no-op path.** Put a recording `EditorState.transactionFilter` before `livePreviewExtensions` in the extension array (it runs last, `state:2458`) and assert that for a body-only `input.type.compose` the recorded transaction keeps `userEvent`, `scrollIntoView`, effects and its selection; and for the change filter that a body-only edit does not alter `tr.changes` (`tr.changes.eq`).
- **T5. Select all then a real composition start.** `selectAll(view)`, then `view.contentDOM.dispatchEvent(new CompositionEvent('compositionstart'))`; assert the frontmatter is intact, the body is deleted by CodeMirror's own multi-line delete, `view.compositionStarted` is true, and the caret is at `BODY_START`. Then run T1's pair at that caret and fire `compositionend`. This exercises `view:5317-5322` with the real guard.
- **T6. Pin the straddle policy.** With a non-empty `select.pointer` selection from `BODY_START + 5` back to 0: (a) `input.type` `a`, (b) the `compositionstart` event path, (c) typing `(` through `insertBracket`-shaped changes (`[{from:0, insert:'('}, {from:BODY_START+5, insert:')'}]`, `userEvent:'input.type'`). Assert the chosen outcome in full-doc terms: either unchanged (all-or-nothing) or body-only with no stray `)`; never "body deleted and the typed text missing" and never a lone `)`. After each, assert the selection is not left spanning or inside the hidden range.
- **T7. Accents inside the frontmatter and boundary in UTF-16.** `---\ntítulo: ação\ntags: [café]\n---\n` plus a body. Assert `frontmatterEnd` equals the end of the closing fence, Backspace at the body start leaves the doc unchanged, and T1's pair still lands at `bodyStart`. Add a decomposed accent (`'é'`, two UTF-16 units, one grapheme) inserted at `BODY_START` to confirm the boundary check is on offsets, not characters.
- **T8. Suppressed delete does not strand the next accent.** After `deleteCharBackward` at `BODY_START` (doc unchanged), assert `selection.main.head === BODY_START`, then run T1's pair and assert it lands in the body. This is the composition-specific check for s04 R1 and C3.
- **T9. Compose with the caret in the hidden range pins the fail-open policy.** Dispatch a bare `{selection:{anchor:0}}`, then the compose pair at 0 (`input.type.compose.start` insert at 0). Pin the chosen result: with fail-open it is applied (today's behavior); with the post-change clamp the caret never stays at 0 so the insert lands at `BODY_START`. Either way the doc must never lose the accent without a trace.
- **T10. `compositionstart` then Backspace race (`composing == 0`).** Fire `compositionstart` on the content element (so `composing` is 0), then `deleteCharBackward(view)` at `BODY_START`. Assert the doc equals `DOC` and the selection head is `BODY_START`. Documents that the keymap runs at `composing == 0` (`view:4702`).
- **T11. Composition-free regressions that touch the same filters** (already in the Issue; keep): programmatic no-userEvent frontmatter write plus `undo`; typing and Enter in the body; decorator disabled leaves Backspace at the first body line as today.
- **E1. Optional e2e (Chromium only).** Playwright has no IME API, so drive `Input.imeSetComposition` through a CDP session (`context.newCDPSession(page)`) at the first body line after `ControlOrMeta+Home`, commit it, and assert the first body line text and the intact hidden frontmatter. This validates the DOM-mutation path in Chromium, not WKWebView, so treat it as a smoke test. Feasibility of `Input.imeSetComposition` against this app is unverified; the repo has no such helper (`grep` over `e2e` for `CDPSession` and `insertText` returned nothing).

### Manual checks in the real Tauri app on macOS (not automatable)

- M1. Brazilian ABNT2 and US-International dead keys at column 0 of the first body line: `'` then `e`, `` ` `` then `a`, `~` then `a` and `o`, `^` then `o`, Shift variants for capitals (`Á`, `É`, `Ã`). Do each: on a fresh note, right after Cmd+Up then Enter, on a non-empty first line, and with the first line starting with `- ` or `> ` (the case from the bracket-matching write-up).
- M2. Dead key then a space (`'` + space) and dead key then an unmappable key (`~` then `x`) at column 0.
- M3. Press-and-hold accent popup (`a` held) at column 0 and mid-line.
- M4. Cmd+A then a dead-key accent (replaces the body only, frontmatter intact), then Cmd+Z.
- M5. Dead key immediately followed by Backspace at column 0 (F3), once with a non-empty first body line.
- M6. Dictation (Fn Fn) into an empty first body line; and macOS Text Replacement shortcuts at the first word.
- M7. Wikilink and tag completion after an accented character (`[[Ação`), undo of one accented letter with a single Cmd+Z, and a meta-bind input and button write while the caret sits in the first body line.

## Not verified

- No code was run. Everything about transaction filtering and DOM reading comes from reading the library source. The WebKit-specific results (a replaced composing node cancels the composition; where Safari places the caret relative to `display:none` lines; whether `autocorrect="off"` on `<body>` is inherited; how dictation and text replacements are delivered) are inference and need the real app.
- I did not confirm that jsdom runs CodeMirror's `compositionstart` handler from a dispatched `CompositionEvent`, nor that two rebuilt `Decoration.replace({})` sets compare equal so the per-keystroke rebuild causes no redraw (C7); the second is pre-existing and not changed by the Issue.
- `history` undo behavior after a suppressed edit (a selection-only history entry) was read, not run.
