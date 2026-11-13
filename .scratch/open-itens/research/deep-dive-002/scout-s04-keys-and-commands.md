# Scout s04: keys and commands vs the Issue 002 guard

Read-only research. Nothing was run (no vitest, no e2e, no app). Library behavior comes from reading `node_modules/@codemirror/*` source: state 6.7.6, view 6.43.15, commands 6.11.1, search 6.7.2, autocomplete 6.20.4, language 6.13.1. Facts carry path:line. Inference is marked "Inference".

Notation: `F1` is the end of the closing fence line (the position of the line break after `---`), `bodyStart = F1 + 1`, `B` is the end of the first body line. The hidden range is `[0, bodyStart]`.

## Summary

The Issue's design (selection clamp on `select.*` except pointer, plus a `changeFilter` that returns `[0, bodyStart]` for `input`/`delete`/`move`) handles the headline cases (Cmd+Up then Enter, Backspace at the first body line, Cmd+A). Reading how each command builds its transaction shows five places where the design as written ships a NEW bug:

1. **A suppressed delete leaves the caret inside the hidden fence, and the clamp never runs** because it only looks at `select` events. Backspace at the first body line, held Backspace, Cmd+Backspace, Alt+Backspace and Ctrl-h then leave an invisible caret, and everything typed next is silently dropped. This is the owner's own fear, produced by the guard, on the exact keystroke the Issue targets.
2. **Narrowing a paired edit applies half of it.** `moveLineUp` on the first body line becomes "keep the fence, insert a second `---` below the body line" (the body line turns into a setext heading). `transposeChars` (Ctrl-t) at the first body line loses a character. A straddling replace (drag-select upward, then type or paste) deletes the body part and drops the typed or pasted text.
3. **Backspace on an empty first body line** (the natural "Cmd+Up, Enter, then Backspace to undo") works today and becomes a silent no-op with the caret moved into the fence.
4. **Drop at position 0** (`move.drop`): if the "insert at 0 returns false" rule is checked after the range narrowing instead of before, the dragged text lands in front of `---`.
5. **Mid-composition rewrites.** The owner types accents with dead keys on WebKit (WKWebView). The repo already documents that DOM restructuring during a dead-key composition breaks it (`extensions/composition-aware-bracket-matching.ts:1-60`). A guard that returns a rebuilt transaction for a no-op case, or drops a composition change, is a risk for the owner's daily typing.

Everything else on the inventory (Cmd+A, Cmd+Up, ArrowUp/Left, PageUp, Enter, Tab, indent, Cmd+X, copy line, move line down, paste, TSV paste, replace all) is either handled by the design or unaffected. Recommended shape: all-or-nothing (`false`) for any transaction whose changes straddle or pair across the boundary, narrowing only for `input.replace.all`, and a post-filter selection clamp for every user transaction, not only `select`.

## Facts

### F1. Which bindings exist (the full keymap the guard sees)

- One keymap, built in `src/lib/core/markdown-editor/setup/editor-extensions.ts:150-166`, in this order: Copy Block Link (Cmd+Shift+L, :151-157), `closeBracketsKeymap` (:158), `defaultKeymap` (:159), `searchKeymap` minus `Mod-d` (:162), `historyKeymap`, `completionKeymap`, `indentWithTab` (:165). `src/lib/core` has no `keybindings` folder; the global app shortcuts are in `src/lib/app/global-keybindings.ts` (Cmd+S, Cmd+P, Cmd+O, Cmd+\\, Cmd+D favorite and so on) and none of them edits the doc.
- Mod-d is removed from the search keymap so Cmd+D never reaches `selectNextOccurrence` (`editor-extensions.ts:160-162`, `global-keybindings.ts` Cmd+D = favorite). Multi-cursor in this app therefore comes only from Cmd+Alt+ArrowUp/Down (`addCursorAbove/Below`), Alt-drag (`rectangularSelection()`, :147), Cmd+click (default) and search "select all matches".
- Extensions that also act on transactions: `history()` (:133), `dropCursor()` (:134), `indentOnInput()` (:136, a `transactionFilter`), `closeBrackets()` (:138), `autocompletion` (:142), `rectangularSelection()` (:147). Live preview (and with it any guard in `BLOCK_EXTENSIONS.frontmatter`) sits in a compartment at :146 via `livePreview(...)`.
- Default keymap, from `node_modules/@codemirror/commands/dist/index.js:1706-1805` (macOS bindings named): ArrowUp/Down, Cmd+ArrowUp (`cursorDocStart`, :1751 per refute), Cmd+Home / Mod-Home (:1759), Ctrl+ArrowUp (`cursorPageUp`), PageUp, Cmd+A (`selectAll`), Backspace/Delete, Alt+Backspace (`deleteGroupBackward`), Cmd+Backspace (`deleteLineBoundaryBackward`), Ctrl-h/d/k/o/t/p/n, Alt+ArrowUp/Down (`moveLineUp/Down`), Shift+Alt+ArrowUp/Down (`copyLineUp/Down`), Cmd+Alt+ArrowUp/Down (`addCursorAbove/Below`), Cmd+Enter (`insertBlankLine`), Cmd+I (`selectParentSyntax`), Cmd+[ / Cmd+] (`indentLess/More`), Cmd+Shift+K (`deleteLine`), Cmd+/ (`toggleComment`), Escape, Tab/Shift+Tab (`indentWithTab`).
- The app's context menu Cut, Paste and Select All dispatch their own transactions: `MarkdownEditor.svelte:339-348` (`delete.cut` via `replaceSelection('')`), `:354-371` (`input.paste` via `replaceSelection(text)`), `:373-377` (`selectAll(view)`, userEvent `select`).
- Right-click moves the caret with a bare dispatch and no userEvent (`MarkdownEditor.svelte:302-310`, :308), so a right-click in the top padding (posAtCoords maps it to 0) puts the caret in the hidden range.

### F2. What each command dispatches (userEvent, change shape, selection)

All in `node_modules/@codemirror/commands/dist/index.js` unless noted.

- `selectAll`: `selection {anchor 0, head doc.length}`, `userEvent: "select"` (:1084-1087).
- `cursorDocStart` / `selectDocStart`: through `setSel`, `"select"` (:581 per refute). `selectLine`, `selectParentSyntax` (:1102-1123, returns `node.from..node.to`, so repeated Cmd+I can reach the Document node starting at 0), `addCursorAbove/Below` (:1124-1158), `simplifySelection`: all `"select"`.
- `deleteBy` (the base of Backspace, Delete, Alt/Cmd+Backspace, Ctrl-h/d/k, :1175-1208): builds `state.changeByRange`, so the transaction carries an EXPLICIT selection (`EditorSelection.cursor(from, ...)`, :1198). Event is `delete.backward`, `delete.forward` or `delete.selection`. At a line start `deleteByChar` targets `pos - 1`, the line break (:1229-1232); `deleteByGroup` does the same when `pos == line.from` (:1257-1259); `deleteLineBoundaryBackward` and `deleteToLineStart` use `Math.max(0, head - 1)` (:1305, :1313).
- `deleteLine` (Cmd+Shift+K): for a block starting after 0 it deletes `[block.from - 1, block.to]`, i.e. the preceding line break plus the line (:1471-1492); `delete.line`; explicit selection from `moveVertically` then `.map(changes)`.
- `moveLine` (Alt+ArrowUp/Down): two changes per block. Up: `{from: nextLine.from, to: block.from}` (delete the line above with its break) and `{from: block.to, insert: lineBreak + nextLine.text}` (:1403-1432), explicit selection `anchor - size`, `move.line`. On the first body line `nextLine` is the closing fence line.
- `copyLine` (Shift+Alt+ArrowUp/Down): single insert at `block.to` (up) or `block.from` (down), `input.copyline` (:1441-1459). Both positions are >= bodyStart for a body line.
- `transposeChars` (Ctrl-t on macOS): at a line start the change is `{from: pos - 1, to: pos + 1, insert: swapped}`, a replace that straddles the line break, `move.character` (:1368-1384).
- `splitLine` (Ctrl-o): `input`, replace at the selection (:1355-1363). `insertNewline`, `insertNewlineAndIndent`, `insertBlankLine`: `input`, change at the selection or at `line.to` (:1496-1566). `indentMore/Less`, `indentSelection`: changes at `line.from` of each selected line, `input.indent` / `delete.dedent` / `indent` (:1589-1642). `insertTab`: `input` (:1673).
- `deleteTrailingWhitespace` (not bound): `delete`.
- View (`node_modules/@codemirror/view/dist/index.js`): typing and composition go through `applyDOMChange` / `applyDefaultInsert`, userEvent `input.type` with `.compose` and `.start` suffixes (:4468-4478); paste `input.paste` (:4984-4987); drop `input.drop` or `move.drop` with `changes = [del, ins]`, `ins` at `posAtCoords` of the drop (:5141-5157); cut `delete.cut` with linewise `[line.from, line.to + 1]` when nothing is selected (:5231-5262); composition start with a multi-line selection dispatches `input` deleting the selection (:5317-5322); DOM-selection sync dispatches `select` or the last selection origin (:4357-4367); mouse selection `select.pointer` (:4884).
- Search (`node_modules/@codemirror/search/dist/index.js`): find next/prev `select.search` (:860, :880), select matches `select.search.matches` (:894, :916), replace `input.replace` (:952), replace all `input.replace.all`, one transaction with all matches (:975).
- Autocomplete: `input.complete` (:202, :1614), closeBrackets backspace `delete.backward` (:1878), `input.type` for bracket pairs (:1943, :1955, :1998). `indentOnInput` (`language/dist/index.js:1188-1215`) is a transactionFilter that returns `[tr, {changes, sequential: true}]` for `input.type` and `input.complete`.
- History: `undo`/`redo` transactions carry userEvent `undo`/`redo` (`commands/dist/index.js:554`), selection-only undo `select.undo` / `select.redo` (:537).

### F3. Filter mechanics that decide every case below

- `filterTransaction` (`@codemirror/state/dist/index.js:2430-2465`): change filters run first on `tr.startState`. `false` drops all changes and maps the transaction's selection through `tr.changes.invertedDesc` (:2441-2444). A range array calls `ChangeSet.filter` and maps the selection through the inverse of what was filtered (:2445-2449). Transaction filters then run last-to-first over the result (:2452-2461), each may return the transaction itself (kept as is), an array of one transaction, or a spec that is re-resolved with `filter: false` (:2457-2460, `resolveTransaction` :2416-2427). A spec return rebuilds the transaction: only `changes`, `selection`, `effects`, `annotations`, `scrollIntoView` survive (:2398-2407).
- `ChangeSet.filter(ranges)` (:892-922): inside a suppressed range a deletion is kept as a no-op and an insertion dropped; an insertion at exactly the range end passes (second loop stops at `pos == end`, the next pass keeps it); a pure insertion at exactly position 0 passes (`pos == next && iter.len == 0`, :898); and for a replace section that starts inside the range and ends outside, the remaining deletion is kept with `ins = 0` because `iter.off != 0` (:904-905). So the inserted text of a straddling replace is dropped while the outside part of its deletion is applied.
- `indentOnInput`'s filter reads `tr.newDoc` and `tr.newSelection`, so it sees the result of any change filter. It is registered before live preview in the extension array, so (filters run last-to-first) a guard filter runs BEFORE it.
- A transaction filter that returns `tr` keeps the same Transaction; one that returns a spec builds a new one. Existing code treats a rebuilt transaction as a possible redraw trigger (see R6).
- When a DOM-originated change is filtered to nothing, the observer's `view.update([])` reset is guarded by `view.state == startState` (`view/dist/index.js:7532`), but a dispatched empty transaction still yields a new state object, so the resync relies on `docView.domChanged` being applied by the update (Inference, not traced to the end).

### F4. Programmatic writers carry no userEvent, so a userEvent-keyed guard passes them

- `dispatchMetaBindUpdate` replaces `{from: 0, to: frontmatterEnd}` with no userEvent (`extensions/live-preview/widgets.ts:922-924`).
- External sync `replaceDoc` and `showTabState` (`MarkdownEditor.svelte:175-204`, :221-254): `addToHistory: false`, no userEvent. Same for `note-writer.service.ts:77-80` (task writes), `file-history.service.ts:92-94` (restore, replaces 0..doc.length), `copy-block-link.service.ts:51-53` (block id at `line.to`).
- Meta-bind inputs and selects keep their own keys: `core/form-control-events.ts:1-35` makes `ignoreEvent` true for key, input and composition events from `input`/`select`/`textarea`, so Backspace typed in a meta-bind input never reaches the editor keymap.
- Wikilink completion applies with a bare dispatch (`extensions/wikilink/completion.ts:77-80, 104-107, 163, 215`); the completion pick is `input.complete` and happens in the body.
- User-event dispatchers with their own strings: `input.table.add-column` and `input.table.add-row` (`widgets.ts:517, 530-532`, positions at table lines, so >= bodyStart), `input.codeblock.set-language` (`code-block-widget.ts:180`), `input.callout.set-type` (`callout-field.ts:87`), `input.paste` in the HTML-link and TSV paste handlers (`handlers/paste-html-link-handler.ts:30-41`, `handlers/paste-tsv-handler.ts:24-37`, both `replaceSelection`-like with an explicit `selection.anchor = from + markdown.length`).
- The owner's global search can open a note at a match inside the frontmatter: `MarkdownEditor.svelte:606-609` dispatches `selection: cursor(clampedPos)` with no userEvent.

### F5. Existing tests that touch these paths

- `e2e/specs/live-preview/click-reveal/frontmatter.spec.ts:53-65` pins ArrowUp onto the first hidden line (the Issue changes it). No e2e uses Cmd+A or Backspace near the frontmatter (`rg` over `e2e/specs/live-preview` found none).
- `src/tests/lib/core/markdown-editor/extensions/live-preview/invariants-harness.test.ts` dispatches `input.type`, `delete`, `select` and `select.pointer` at the start of every line, including the frontmatter lines of `19-meta-bind.md` (:316, :335-337, :347-358, :427). After the guard those become no-ops or clamps. Its `diffAgainstFresh(... view.state.update({selection}) ...)` goes through the same filters (`state.update` filters), so the comparison stays self-consistent (Inference).

## Inventory: each command near the hidden fence, what it should do, what a naive guard breaks

"Naive guard" means the Issue's literal text: clamp only `select.*` selections that are not `select.pointer`, plus `changeFilter` returning `[0, bodyStart]` for `input`/`delete`/`move` (and `false` for a pure insert at 0).

| Key or command | Event | Should do next to the fence | Naive guard result |
|---|---|---|---|
| Cmd+Up, Cmd+Home / Mod-Home, `cursorDocStart` | `select` | Caret at `bodyStart` | Clamped. OK |
| Shift+Cmd+Up (`selectDocStart`) | `select` | Anchor kept, head at `bodyStart` | Clamped. OK |
| ArrowUp, Ctrl-p, PageUp, Ctrl+ArrowUp (mac) | `select` | Caret at `bodyStart` (like a normal editor on line 1) | Clamped. OK (needs layout, e2e only) |
| ArrowLeft, Ctrl-b, Alt+ArrowLeft, Home at `bodyStart` | `select` | Stay at `bodyStart` | `cursorCharLeft` goes to `F1`, both ends < `bodyStart`, range removed, fallback cursor at `bodyStart`. OK |
| Shift+ArrowLeft at `bodyStart` | `select` | Stay | Range `[F1, bodyStart]` clamps to an empty cursor. OK if the clamp uses `max` on both ends |
| Cmd+A, menu Select All | `select` | Body only (owner decision) | Clamped. OK. Then Delete/cut/type/paste act on the body only |
| Cmd+I (`selectParentSyntax`) repeated | `select` | Grow up to the body | Can reach the Document node at 0, clamped. OK |
| Cmd+Alt+ArrowUp (`addCursorAbove`) on line 1 | `select` | Nothing | Added hidden cursor is removed. OK |
| Search next/prev onto a frontmatter match | `select.search` | Skip it, or stay | Becomes a cursor at `bodyStart`: one dead step on wrap, selection never equals the hidden match so Replace never edits it (R7) |
| Enter at `bodyStart` | `input` insert at `bodyStart` | New empty first body line | Passes (insert at range end). OK |
| Enter / Ctrl-o / Cmd+Enter in the body | `input` | Normal | `>= bodyStart`. OK |
| Tab, Shift+Tab, Cmd+[ , Cmd+] on first body line | `input.indent`, `delete.dedent` | Normal | Changes at `line.from = bodyStart`. OK |
| Backspace at `bodyStart`, first line non-empty | `delete.backward` `[F1, bodyStart]` | Nothing changes, caret stays at `bodyStart` | Doc unchanged, caret moves to `F1` inside the fence (R1) |
| Held Backspace | repeats | Same, each repeat a no-op | Caret marches left through the hidden lines (R1) |
| Backspace at `bodyStart`, first line EMPTY | `delete.backward` | Today: removes the empty line, fence intact | Silent no-op plus caret into the fence (R1, R2) |
| Delete (forward) at `bodyStart` on an empty first line | `delete.forward` `[bodyStart, bodyStart+1]` | Removes that line | Passes. OK |
| Cmd+Backspace, Alt+Backspace, Ctrl-h at line start | `delete.*` | As Backspace | As Backspace (R1) |
| Cmd+Shift+K on the first body line | `delete.line` `[F1, B]` | Remove the line, keep the fence | Fence break suppressed, body text deleted, empty line stays (R8) |
| Cmd+X with no selection on the first body line | `delete.cut` `[bodyStart, B+1]` | Remove the line | Passes. OK |
| Cmd+X / Cut menu after Cmd+A | `delete.cut` | Body only | OK because of the select clamp |
| Alt+ArrowUp on the first body line | `move.line` two changes | Nothing | Delete half suppressed, insert half applied: a second `---` below the body line (R3) |
| Alt+ArrowDown on the first body line | `move.line` | Swap with the next line | Insert at `bodyStart` passes. OK |
| Shift+Alt+ArrowUp/Down | `input.copyline` | Duplicate the line | `>= bodyStart`. OK |
| Ctrl-t at `bodyStart` | `move.character` replace `[F1, bodyStart+1]` | Nothing | First body character is deleted, swapped text dropped (R4) |
| Typing at `bodyStart` | `input.type` insert at `bodyStart` | Types | Passes. OK |
| Dead-key accent at `bodyStart` | `input.type.compose[.start]` | Composes | Passes if `from >= bodyStart` (R6) |
| Cmd+V / menu Paste at a body caret | `input.paste` | Pastes | OK |
| Cmd+V of a TSV table with a straddling selection | `input.paste` replace | Pastes over the body part | Insert dropped, body part deleted (R4) |
| Cmd+V with caret at 0 (right-click in padding first) | `input.paste` insert at 0 | Nothing, or paste at `bodyStart` | Issue says `false`; paste silently lost (R5) |
| Drag-drop text onto the top padding | `move.drop` `[del, ins@0]` | Nothing | Dragged text deleted and inserted before `---` if the "insert at 0" check runs after the range filter (R10) |
| Alt-drag rectangle, Cmd+click multi-cursor | `select.pointer` | Body only | Pointer selections are not clamped, a hidden cursor can exist (R4, R11) |
| Cmd+F replace all | `input.replace.all` | Replace in the body, leave the fence | Narrowing works. OK (any `false` variant breaks it, which the Issue already tests) |
| Cmd+Z / Cmd+Shift+Z | `undo`/`redo` | Restore | Not filtered. OK |
| Meta-bind input commit, Properties panel, task toggle, file restore | none | Write the frontmatter | Not filtered. OK |

## Regression risks for Issue 002

Likelihood is for this owner: Portuguese with dead keys, meta-bind inputs, Properties panel, templates, Quick Capture, tables, daily.

### R1. A suppressed delete leaves the caret in the hidden fence and typing is then dropped (high)

- Scenario: caret at the start of the first body line, press Backspace (or hold it, or Cmd+Backspace, Alt+Backspace, Ctrl-h). `deleteBy` returns `changes {from: F1, to: bodyStart}` plus an explicit cursor at `F1` (`commands/dist/index.js:1198`). The `changeFilter` suppresses the deletion. The transaction keeps its selection, only mapped through `back` (`state/dist/index.js:2445-2449`); the mapped cursor sits at or inside `F1`. The Issue's selection clamp only handles `tr.isUserEvent('select')` with no doc change, so `delete.backward` is not clamped (Issue text, item 1; dossier-002 step 3 has the same condition).
- What breaks: the caret is now on a `display:none` line, so it is invisible. Each further key repeat targets `F1 - 1` (a `-` inside the fence, `deleteByChar` :1230), is suppressed again and nudges the caret left through the hidden lines. Typed characters are inserts inside `[0, bodyStart)` and are dropped by `ChangeSet.filter`. The owner sees a cursor that disappeared and typing that does nothing. That is the "guard drops user typing" failure the Issue lists as its main risk, and the Issue's test for Backspace only asserts the doc, not the selection.
- Inference: the exact mapped position after `back` depends on assoc rules; the position is inside or at the end of the hidden range for every variant I traced (cursor at `F1`, start of a len-1 deletion, mapped with default assoc).
- Prevention: add a second stage to the transaction filter: for ANY user transaction (`input`, `delete`, `move`, `select`, but not pointer), after the change filter has run, clamp every selection range of the result to `>= bodyStart` (same rules as the select clamp: drop ranges entirely below, clamp straddlers, fallback cursor at `bodyStart`, valid `mainIndex`). Compute `bodyStart` from `tr.startState`. Return `tr` untouched when nothing is below `bodyStart` (R6).
- Tests: after `deleteCharBackward` at `bodyStart` assert `view.state.selection.main.head === bodyStart`; then dispatch `input.type` `x` through `insertText`-style userEvent and assert the doc has `x` at the start of the first body line. Same for `deleteGroupBackward`, `deleteLineBoundaryBackward`, five repeated `deleteCharBackward` on `FRONTMATTER + 'ab'`: after the fifth the caret must be at `bodyStart` and a following insert must land in the body.

### R2. Backspace on an empty first body line stops working (high, ask the owner)

- Scenario: Cmd+Up, Enter (to make room, which the Issue itself calls the trigger), then Backspace to take it back. Doc `FRONTMATTER + '\nFirst'`, caret at `bodyStart` on the empty line. Today `deleteCharBackward` deletes the break at `F1` and gives `---\nFirst`, a correct result. With the guard the same deletion lies fully inside the suppressed range, so nothing happens (and R1 applies).
- What breaks: the owner cannot undo the empty line with Backspace; only Delete or Cmd+Z remove it. Likelihood high because the Issue's own trigger sequence ends exactly here.
- Prevention options (decide before launch): (a) rewrite a `delete.backward` whose deleted slice is exactly the break at `F1` on an empty first body line into `[bodyStart, bodyStart + 1]` (deletes the empty line, keeps the fence; one special case in the transaction filter, about 6 lines); (b) accept the no-op and state it in Notes. The owner's rule against core changes for corner cases (`no-core-changes-for-corner-cases`) is about new write-path behavior for rare failures; this one is the direct follow-up of the headline keystroke, so ask rather than assume.
- Tests: `FRONTMATTER + '\nFirst'` caret at `bodyStart`, `deleteCharBackward`: assert the doc is either `FRONTMATTER + 'First'` (a) or unchanged with caret at `bodyStart` (b). Pin whichever is chosen.

### R3. `moveLineUp` under range-narrowing writes a second fence (high if narrowing is kept for `move.*`)

- Scenario: Alt+ArrowUp on the first body line (the Issue's own example). Changes are `[F0, bodyStart]` (delete the fence line and its break) and `{from: B, insert: '\n---'}` (`commands/dist/index.js:1418`). With `changeFilter` returning `[0, bodyStart]` the delete is suppressed and the insert at `B >= bodyStart` is kept.
- Result: `---\nstatus: todo\n---\nFirst body line.\n---\n\nEnd line.` The fence stays and a second `---` appears under the first body line, which markdown reads as a setext H2 heading (the body line turns into a heading in the preview and is saved that way). This is a NEW corruption, not today's.
- Why it matters: the Issue's own acceptance test ("moveLineUp leaves the doc equal to DOC") fails under narrowing, so an agent will notice, but the fix direction text (M1/M2 in refute-002) tells it to narrow `move.*`.
- Prevention: partial application only for `input.replace.all`. For every other user event, if any change touches `[0, bodyStart)` return `false` (drop the whole transaction) so paired changes never split. Keep the explicit "insert at 0" check first (R10).
- Tests: `moveLineUp` leaves the doc equal to DOC AND the caret stays on the first body line (col 0 and a mid-line column; the explicit selection `anchor - size` maps to `F0` at col 0, which the R1 clamp must fix). Also `moveLineDown` on the first body line still works (pass today and after).

### R4. Straddling replaces lose the inserted text or a character (medium-low)

- Mechanism: `ChangeSet.filter` keeps the outside part of a straddling deletion and drops its inserted text (`state/dist/index.js:904-905`).
- Cases: (a) Ctrl-t at `bodyStart` deletes the first body character and inserts nothing (`transposeChars` :1368-1384). Ctrl-t is a Mac emacs binding, rarely hit by accident, but it is a visible one-character loss. (b) A selection that starts in the hidden range and is not clamped: a mouse drag that starts in the body and ends above the first line (`select.pointer`, head 0, `frontmatterClick` only acts when the press itself maps into the padding, `frontmatter-field.ts:88-90`), an Alt-drag rectangle, or the right-click-at-0 caret followed by Shift+Click. Then typing a letter, an accent (`input.type.compose`), or pasting a table (`input.paste`, TSV handler `paste-tsv-handler.ts:24-37`) deletes the body part and DROPS the typed or pasted text. Pasting a table is a daily owner action, but only reaches this state after an upward drag, so likelihood is low.
- Prevention: return `false` for any change that straddles `bodyStart` (from < bodyStart < to) in any event but `input.replace.all`; the R1 clamp then moves the selection so the next try works. Better: make the select clamp also cover `select.pointer` when the first body line is not a block widget (needs the doc text or a view check; the Issue excludes pointer on purpose, so this is a design choice for the Issue author, not a given).
- Tests: dispatch `select.pointer` with `anchor` in the body and `head 0`, then `input.type` `a` over it. Assert the doc is either unchanged (false) or `FRONTMATTER + 'a'...` (clamp), never body deleted plus `a` missing. Ctrl-t: `transposeChars` at `bodyStart` leaves the doc equal to DOC.

### R5. Programmatic caret inside the hidden range makes typing a silent no-op (medium-low)

- Scenario: right-click in the top padding (`MarkdownEditor.svelte:308`) or a global-search or backlink jump to a match inside the frontmatter (`MarkdownEditor.svelte:606-609`): the caret goes to a hidden position with no userEvent, so the Issue's clamp does not run. Pre-guard, typing there edits the fence. With the guard, typing is silently dropped (insert at 0 returns `false`; insert inside the range is filtered).
- What breaks: after a search hit on a property (tags, status) the owner opens the note, types and nothing happens, with an invisible caret.
- Prevention: either clamp selection-only transactions that have no userEvent too (they are never meant to land in hidden lines; check that `replaceDoc` and tab loads do not rely on it: they carry no `selection`, `MarkdownEditor.svelte:157-160`), or retarget a pure caret insert at `p < bodyStart` to `bodyStart` instead of dropping it (loses nothing, one rule). Also log every suppression with `debug('FRONTMATTER-GUARD', ...)` from `#lib/utils/debug.js` (per CLAUDE.md "Logging is ALWAYS the first debugging tool") so a silent drop can be diagnosed in the session log.
- Tests: bare `{selection: {anchor: 0}}` then `input.type` `x`: doc must end with `x` in the body or be unchanged with a logged suppression, and the caret must not stay at 0.

### R6. Dead-key composition on WebKit (medium impact, unknown likelihood; the owner's daily input path)

- Facts: the app already carries a custom extension because rebuilding DOM mid-composition destroys the composing text node on WKWebView (`composition-aware-bracket-matching.ts:1-60`). Composition changes arrive as `input.type.compose` / `.compose.start` through `applyDefaultInsert` (`view/dist/index.js:4468-4478`); `compositionstart` with a multi-line selection dispatches an `input` delete (:5317-5322).
- Risks: (a) a filter that returns a rebuilt spec (new Transaction) for a transaction it does not need to change forces extra work and may restructure what CodeMirror draws mid-composition; (b) a composition change whose computed `from` lies below `bodyStart` is suppressed, which discards the accent and may desync the DOM (`flush` resets only if the state object is unchanged, :7532; the empty-transaction path relies on `docView.domChanged`, Inference).
- Inference (not verified): DOM bounds for a mutation at the first body line start begin at `bodyStart` (`domBoundsAround`, :4259-4281, uses tile ends; a hidden line tile ends at `F1`), so composition diffs should start at `>= bodyStart`. This needs a real WebKit check.
- Prevention: the guard returns the SAME `tr` object (not a spec) whenever every change and every selection range is at or after `bodyStart`; check cheap things first (`tr.docChanged || tr.selection`, then `tr.isUserEvent(...)`, then `frontmatterEnd`). Never annotate or rewrite compose transactions that pass.
- Tests (jsdom): dispatch `input.type.compose.start` then `input.type.compose` at `bodyStart` and at a mid-line position; assert the doc changes and the returned transaction is untouched (compare `tr.annotations` and selection with a state built without the guard). Manual, in the real Tauri app on macOS (Playwright Chromium cannot reproduce WKWebView IME): dead key `'` then `e`, `~` then `a`, `^` then `o` at column 0 of the first body line, empty and non-empty, right after Cmd+Up, and while the first body line holds a bullet or `>` (the case from the bracket-matching write-up).

### R7. Find and replace with matches in the frontmatter (low)

- Find next / previous onto a hidden match becomes a cursor at `bodyStart` (clamp fallback) so the match counter does not advance for one press when wrapping; Replace never edits a hidden match because the selection never equals it (replace uses the selection, per search `:952`). Replace all narrows correctly and the panel's match count still includes hidden matches.
- Prevention: none needed; list it in Notes so the agent does not try to fix the panel count.
- Test: one jsdom case for `select.search` onto a frontmatter match asserting the caret is at `bodyStart` and the doc is unchanged.

### R8. Cmd+Shift+K on the first body line (low-medium)

- `deleteLine` deletes `[F1, B]` (`commands/dist/index.js:1471-1492`). Range-narrowing keeps `[bodyStart, B]`: the text is cleared but an empty line stays. With `false` it does nothing. Neither matches "delete the line".
- Prevention: either accept (state it), or rewrite for the case `delete.line` on the first body line to `[bodyStart, min(B + 1, doc.length)]`. Under the all-or-nothing rule from R3 it becomes a no-op unless rewritten.
- Test: `deleteLine` with caret on the first body line, doc is either `FRONTMATTER + '\nEnd line.'` (rewrite) or equal to DOC (no-op); pin one.

### R9. Programmatic writes must not be caught (high if wrong, easy to keep right)

- The meta-bind writer, Properties panel and task toggles all rewrite or insert inside the frontmatter and carry no userEvent (F4). A guard keyed on "any change touching the range" or on `addToHistory === false` instead of the userEvent whitelist would break meta-bind inputs, buttons, Properties and file restore, all daily for the owner.
- Prevention: key strictly on `tr.isUserEvent('input'|'delete'|'move')`; `undo`, `redo`, no-userEvent writes, `select.*` only pass through the selection stage.
- Tests (all in the Issue already, keep them): a no-userEvent `{changes: {from: 0, to: fmEnd, insert: ...}}` rewrite, then `undo`; plus the existing `meta-bind-writers.test.ts`, `undo-history-across-notes.test.ts`.
- Also assert the file-history restore shape: no userEvent, replace `0..doc.length`.

### R10. Drop at position 0 (low likelihood, corrupting if mis-ordered)

- A drag of selected body text to the top padding calls `dropText` with `dropPos = posAtCoords(...)` = 0 and `changes = [del, ins]` (`view/dist/index.js:5141-5157`), userEvent `move.drop`. If the code applies the `[0, bodyStart]` range first and checks "pure insert at 0" afterwards, `ChangeSet.filter` lets the insert at 0 through and the deletion applies: the dragged text moves in front of `---` and the fence is broken.
- Prevention: check "any insertion at `pos < bodyStart`" FIRST and return `false` for the whole transaction in every non-replace-all event. (The Issue says "a transaction that inserts at 0 returns false", which is right only if it runs before the range.)
- Test: `{changes: [{from: 25, to: 30}, {from: 0, insert: 'abc'}], userEvent: 'move.drop'}` leaves the doc equal to DOC. Also `input.drop` insert at 0 leaves the doc equal to DOC.

### R11. Multi-cursor and `mainIndex` (low)

- The select clamp can remove the main range (a hidden added cursor from `addCursorAbove`, a search matches list whose main match is hidden). `EditorSelection.create` throws on an empty list (`state/dist/index.js:1465`) and a stale `mainIndex` picks the wrong range; the Issue's fallback cursor covers the empty case but not "main removed, others remain".
- Prevention: recompute `mainIndex` as the last surviving range at or before the old main, else 0.
- Test: two cursors, main one inside the hidden range, other in the body: the result keeps the body one as main. A multi-cursor `input.type` with one hidden cursor: body cursor types, hidden one is dropped, no exception.
- Cmd+D is not multi-cursor here (filtered from the search keymap, `editor-extensions.ts:160-162`), so the common Obsidian-style flow is absent; Alt-drag and Cmd+Alt+Arrow are the only entry points.

### R12. Cost and ordering (low)

- `frontmatterEnd` iterates the whole decoration set (`frontmatter-field.ts:53-58`); the field holds only frontmatter lines, so it is O(frontmatter lines) per user transaction. Fine for properties-heavy notes. Do the cheap checks first (docChanged or selection, userEvent), then compute once per transaction and share it between the change filter and the selection stage.
- Use `tr.startState`, never `tr.state`, for `bodyStart` (a transaction that grows the frontmatter would otherwise see the new end). Use `tr.changes.touchesRange(0, bodyStart)` or `iterChangedRanges` with explicit boundary tests; off-by-one at `bodyStart` is the Enter case (insert at exactly `bodyStart` must pass) and the `fromA < bodyStart` vs `<=` choice also decides whether an insert at `F1` is suppressed.
- Registration: the guard filters run before `indentOnInput` (F3). The selection stage never adds `changes`, so it cannot drop `indentOnInput`'s `sequential` changes; if a later edit makes it return a spec for a doc-changing transaction it must include them (they are applied after it runs, so they are not in `tr` yet; fine).
- Kill switch and source mode remove the guard with the rest of `BLOCK_EXTENSIONS.frontmatter` (`live-preview.ts:47, 90-92, 109-111`). Source mode (`Cmd+\`) is the owner's raw-YAML escape hatch and must stay unguarded; the Issue already has a decorator-disabled test, but not a source-mode toggle test (`editorModeEffects`, `editor-extensions.ts:112-120`).

## Test cases the Issue must add (beyond its current list)

All in `frontmatter-field-keyboard.test.ts`, real `livePreviewExtensions`, full-doc equality plus selection assertions. `bodyStart = FRONTMATTER.length`.

1. R1: after `deleteCharBackward` at `bodyStart` on DOC the selection main head equals `bodyStart` and a following user-event insert lands at the start of the first body line. Same for `deleteGroupBackward`, `deleteLineBoundaryBackward`, and the fifth `deleteCharBackward` on `FRONTMATTER + 'ab'`.
2. R2: `FRONTMATTER + '\nFirst'`, caret at `bodyStart`, `deleteCharBackward`: pin the chosen outcome (empty line removed, or unchanged with caret at `bodyStart`).
3. R3: `moveLineUp` leaves DOC unchanged with the caret still on the first body line, at column 0 and a mid-line column. Add `moveLineDown` on the first body line (still swaps with the next line).
4. R4: `transposeChars` at `bodyStart` leaves DOC unchanged. A `select.pointer` selection `{anchor: mid body, head: 0}` then `input.type` `a` never drops `a` while deleting body text.
5. R5: a bare `{selection: {anchor: 0}}` followed by `input.type` `x` does not silently vanish and the caret is not left at 0.
6. R6: `input.type.compose.start` and `input.type.compose` at `bodyStart` apply; a passing transaction is the same Transaction (selection, annotations unchanged).
7. R8: `deleteLine` on the first body line pins the chosen outcome.
8. R10: `move.drop` with `[del in body, insert at 0]` and `input.drop` insert at 0 leave DOC unchanged.
9. R11: two ranges with the main one hidden keep a valid main in the body; `addCursorAbove` on the first body line leaves the selection unchanged.
10. Boundary: an `input.type` insert at `bodyStart` applies; an insert at `bodyStart - 1` (`F1`) and at 0 is dropped (doc equals DOC) and leaves the caret clamped.
11. Cmd+X shapes: no-selection cut (`delete.cut` `[bodyStart, B+1]`) on the first body line removes the line; `selectAll` then a `delete.cut` of the selection leaves exactly FRONTMATTER.
12. TSV paste: `selectAll` then the paste dispatch shape (`replaceSelection(md)` with `input.paste` and an explicit anchor) replaces only the body and the caret ends after the pasted table.
13. Search: `select.search` onto a frontmatter match clamps to `bodyStart`; `input.replace` with the selection at a hidden match does not edit it.
14. Source-mode toggle: `editorModeEffects(false, ...)` removes the guard (Backspace at the first body line edits the fence as today), `editorModeEffects(true, ...)` restores it.
15. Programmatic passes: file-history restore shape (`{changes: {from: 0, to: len, insert}}` no userEvent) and the task-write shape (`addToHistory: false`) both apply.
16. e2e (`frontmatter.spec.ts`), in addition to the Issue's three: `ControlOrMeta+a` then `Backspace` leaves the frontmatter hidden and intact; `ArrowUp`, `Enter`, `Backspace` leaves the doc as it started with the caret on the first body line (R2 outcome); `Alt+ArrowUp` on the first body line leaves the doc unchanged (R3). These need the real browser because only layout drives ArrowUp.
17. Manual, real app (not automatable): dead-key accents at column 0 of the first body line after Cmd+Up (R6); a meta-bind input and button write while the caret sits on the first body line; Properties panel edit then Cmd+Z.

## Not verified

- Nothing was executed. Mapped caret positions after `ChangeSet.filter` and `tr.selection.map(back)` (R1, R3) are traced from source, not run; test 1 and 3 exist to confirm them.
- Whether WKWebView composition diffs ever start below `bodyStart` (R6), and whether a filtered DOM change always redraws (F3 last bullet), need the real app.
- How `invariants-harness.test.ts` behaves with the clamp on `19-meta-bind.md` is inference.
- Whether code files (non-markdown tabs) also mount live preview and therefore the guard was not traced (`editor.service.ts` toggles the compartment; not read in full).
