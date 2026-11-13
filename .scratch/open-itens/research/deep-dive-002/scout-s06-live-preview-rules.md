# Scout s06: live-preview rules vs the Issue 002 frontmatter guard

Read-only scout. Nothing was run (no tests, builds, e2e, app). Library behavior was read from `node_modules/@codemirror/{state 6.7.6, commands 6.11.1, view 6.43.15, search}` dist sources. "Inference" marks anything derived by reading that was not executed.

## Summary

- The live-preview rules in `docs/agents/live-preview-rules.md` and `docs/LIVE-PREVIEW.md` do not forbid the guard. No rule mentions `atomicRanges`, `transactionFilter` or `changeFilter`, and none exist under `src/lib`. The rules the implementation must follow: stateless (no memory between updates, rule 5), no full-document scans on the hot path (rule 6 and the `frontmatter-slice.ts` header), hide nothing a new way (rule 1), register inside `BLOCK_EXTENSIONS.frontmatter` so the kill-switch and source mode drop it, and do not touch `select.pointer` (owned by `frontmatterClick`).
- The design in the Issue has four holes that live-preview and CodeMirror behavior turn into new bugs, in order of likelihood for this owner:
  1. **Backspace at the start of the first body line moves the caret into the hidden fence** (the changeFilter drops the deletion, but CodeMirror maps the command's explicit post-delete selection back through the inverse, so the caret lands at `bodyStart - 1`). After that, typing, Enter and further Backspaces are silently dropped while the caret is invisible. The Issue's own held-Backspace test passes while this happens, because it asserts only the doc.
  2. **`move.line` is not "narrowed to the body", it is corrupted.** `moveLineUp` on the first body line emits two changes; the guard drops the fence deletion and keeps the insertion, which writes a stray `\n---` after the first body line (a setext heading underline). The Issue's moveLineUp test (doc equals DOC) will fail. `move.character` (Ctrl-T) loses the first body character.
  3. **A change that straddles `bodyStart` loses its inserted text** under `ChangeSet.filter` (typing over a selection that includes the hidden lines deletes the body part and drops the typed character).
  4. **The clamp turns a range that ends at `bodyStart` into a cursor on the first body line**, which reveals that line. This is expected to fail `invariants-harness.test.ts` for the edge document "bullet list right under frontmatter" (the refute report assumed it stays green; it is inference either way).
- Programmatic caret parking inside the hidden range (right-click in the padding, source-to-live-preview toggle, search-result jump, completing a typed fence) is untouched by a `select`-only clamp, and the changeFilter then silently eats typing there. That is a UX regression compared with today (today the text lands in invisible YAML, tomorrow it vanishes).
- Widgets at the top (tables, callouts, code, mermaid, queryjs, meta-bind buttons) conflict only through the reveal rule: a cursor clamped to `bodyStart` reveals a block widget that starts there. Opening a note already does the same (`getPositionAfterFrontmatter`), so this is a known, accepted state, but it differs from `frontmatterClick`, which deliberately avoids it.
- There is no inline-title or properties widget in the editor. Properties live in the right sidebar and the frontmatter is only hidden (`frontmatter-field.ts:30`). The only things "near the top" are the hidden lines and whatever block starts the body.

## Facts (path:line)

### How the frontmatter is hidden and where the hidden range comes from

- `core/hide-lines.ts:14-20` (under `src/lib/core/markdown-editor/extensions/live-preview/`): per line, a `hiddenLineDeco` line class (display:none) plus `Decoration.replace({})` over `line.from..line.to`. The line breaks between lines are not covered by any replace.
- `plugins/frontmatter-field.ts:13-26`: `computeFrontmatter` uses `getAllLines` + `findFrontmatterBlock` (full-document line array) and hides openIdx..closeIdx.
- `plugins/frontmatter-field.ts:32-46`: a hand-written `StateField`, recomputed only on `tr.docChanged` or a `forceDecorationRebuild` effect. A filter that reads it from `tr.startState` sees the state before the transaction.
- `plugins/frontmatter-field.ts:53-65`: `frontmatterEnd` iterates the field's decoration set (two decorations per hidden line) and `bodyStart` is `end + 1`, or `null` when no line follows. Cheap enough for a per-transaction call, but only after the userEvent check.
- `plugins/frontmatter-field.ts:88-110`: `frontmatterClick` is a `mouseSelectionStyle`. It keeps the selection when the first body line is a block widget (`:93`, `isBlockWidgetLine` at `:68` reads the DOM, so a state-only filter cannot copy this check).
- `live-preview.ts:46-59`: `BLOCK_EXTENSIONS.frontmatter = [frontmatterField, frontmatterGutter, frontmatterClick]`. `live-preview.ts:90-92` installs it unless the kill-switch is on; `live-preview.ts:109-111` swaps the whole array for `[]` in source mode.
- `parsers/frontmatter.ts:10,17-31`: line 0 and the first later line matching `/^---\s*$/`. Other code uses a looser rule (`core/frontmatter-slice.ts:12-19` closes at a line that starts with `---`), so those two can disagree on odd YAML; the guard must use the field, not the slice.

### Rules in `docs/agents/live-preview-rules.md` that touch the guard

- Rule 1 (`:5`): hide syntax only with `Decoration.replace({})`; never with font-size or max-width marks. The guard adds no visuals, so it must not "fix" the cursor problem by hiding the line break or re-styling lines.
- Rule 4 (`:15`): `frontmatterField` is a StateField that never sees a pure scroll; the guard is a facet on the state, so the scroll guard does not apply.
- Rule 5 (`:17`): `checkUpdateAction` is stateless and reads only the current `ViewUpdate`. The guard must derive everything from `tr.startState` and the transaction; it must keep no cursor or line memory between transactions.
- Rule 6 (`:19`): profile before optimizing. The existing field brackets its rebuild with `profileStart`/`profileEnd` (`frontmatter-field.ts:38-40`). A filter runs on every user transaction, so keep it O(hidden lines) and early-exit before touching the field.
- Rule 11 (`:27`): interactive widget controls `stopPropagation` on `mousedown`. Unaffected, but it is the reason clicks inside widgets never move the caret into the hidden range.
- `docs/LIVE-PREVIEW.md:36`: `frontmatterClick` doc says "Keyboard moves are not changed". Update it together with the comment at `frontmatter-field.ts:86`.
- `docs/LIVE-PREVIEW.md:192`: the "StateField exception" paragraph should mention the new guard extension if it is added to the same group.

### Reveal and click machinery

- `core/reveal.ts:26-77`: `touchedLines` and `revealPredicate`. A cursor on the first body line reveals every construct on that line, including a block widget that starts there. A non-empty range that ends exactly at a line start does not touch the line below (`:50-54`).
- `core/check-update-action.ts:19-43`: a selection change rebuilds block decorators only when the touched line set changes. Moving the caret from a hidden line (no decoration effect) to the first body line is a line-set change, so it triggers a rebuild of every block decorator.
- `core/mouse-selecting.ts:8-16,40-56`: `mousedown` dispatches an effect-only transaction (no userEvent), so the guard must be a strict no-op for it. During a drag nothing is revealed (`reveal.ts:67`).
- `core/block-band-click.ts:43-50,109`: bands skip `cm-lp-hidden-line` siblings; a block widget as the first body line has no visible sibling above, so a press in its top band keeps the selection. This already depends on the hidden lines being display:none lines.
- `getPositionAfterFrontmatter` (`core/editor/editor.logic.ts:110-123`, used at `MarkdownEditor.svelte:407,495`): a note opens with the caret at `bodyStart` (or at the end of the closing fence when no line follows). So a first body block widget is already revealed on open; clamping to `bodyStart` is consistent with that.

### CodeMirror behavior the guard relies on (read, not run)

- `@codemirror/state` `filterTransaction` (`dist/index.js:2430-2468`): changeFilter first, then transactionFilters from last to first; `false` drops all changes; an array of ranges goes through `ChangeSet.filter`; the explicit selection is mapped with `tr.selection.map(back)` (`:2446,2452,2456`). Sub-specs returned from a transactionFilter are resolved with filtering off (`:2465`).
- `ChangeSet.filter` (`:892-922`): ranges are suppression zones. A pure insertion at the range start (0) passes; an insertion at the range end (`bodyStart`) passes; an insertion strictly inside is dropped. For a replacement that straddles a range edge, the inserted text travels with the part before the edge (`iter.off == 0 ? iter.ins : 0`), so when that part is suppressed the surviving part becomes a pure deletion.
- `@codemirror/commands` `deleteBy` (`dist/index.js:1176-1204`): the command sets the selection to `cursor(from, assoc -1)` in post-change coordinates. `cursorDocStart`/`selectAll` use userEvent `select` (`:581,1085`). `moveLine` emits two changes, `{from: nextLine.from, to: block.from}` and `{from: block.to, insert: lineBreak + nextLine.text}`, userEvent `move.line` (`:1403-1430`). `transposeChars` emits one replacement `{from: pos-1, to: pos+1}` at a line start, userEvent `move.character` (`:1368-1382`). History `undo`/`redo` dispatch with `filter: false` (`:553`), so neither filter runs for them; `select.undo`/`select.redo` (`:537`) do not use `filter: false`.
- `@codemirror/view` `applyDOMChange` (`dist/index.js:4289-4470`): DOM-originated typing, composition and dictation arrive as `input.type`, `input.type.compose`, `input.type.compose.start`. Changes come from `findDiff` over the dirty DOM range and cannot start below the selection start, so composition at `bodyStart` stays at or after `bodyStart` (inference).
- `@codemirror/search` `replaceNext` is `input.replace` and sets an explicit selection to the next match (`dist/index.js:952`); `replaceAll` is `input.replace.all` (`:975`).

### Dispatches in the app that carry no userEvent (guard is a no-op for them)

- `MarkdownEditor.svelte:302-311` right-click: `dispatch({ selection: cursor(pos) })`, so a press in the top padding parks the caret at 0.
- `MarkdownEditor.svelte:~395-420` and the pending-scroll effect (`~560-580`): `dispatch({ selection: cursor(clampedPos) })`, no userEvent. A search or link navigation to a frontmatter offset can park the caret in the hidden range.
- `MarkdownEditor.svelte:156-186` (`replaceDoc`) and `showTabState`: docDiff changes with `addToHistory: false`, no userEvent. Properties-panel and watcher writes pass.
- `widgets.ts:885-919` (`dispatchMetaBindUpdate`): replaces `[0, frontmatterEnd]`, no userEvent. Passes.
- With userEvent: `widgets.ts:517,532` (`input.table.add-column/add-row`), `callout-field.ts:87` (`input.callout.set-type`), `code-block-widget.ts:180` (`input.codeblock.set-language`), `paste-*-handler.ts` (`input.paste`), `MarkdownEditor.svelte:345` (`delete.cut`), `:362` (`input.paste`). All of these change positions at or after `bodyStart` when a block is in the body, so they pass the narrowing.

### Existing tests the guard can move

- `invariants-harness.test.ts:316,335-337,347-358`: dispatches `select`, `input.type`, `delete`, `select.pointer` at every block boundary line, including hidden lines and the first body line of the "bullet list right under frontmatter" edge doc (`fixtures/edge-corpus.md:84-92`).
- `undo-history-across-notes.test.ts:595-604`: a frontmatter-only note (`---\ntitle: x\ntags: a\n---\n`) takes an `input.type` insertion at 0 through the real editor. Under the guard that insertion returns `false`; the assertions (`not.toContain('Line one of B')`, B unchanged) still pass but the test stops exercising the keystroke-to-store path (inference, only if live preview is on in that mount).
- `frontmatter-field-click.test.ts` and `frontmatter-field.test.ts`: use `base.update({ selection })` with no userEvent, so they do not hit the clamp.
- `e2e/specs/live-preview/click-reveal/frontmatter.spec.ts:53-65` pins ArrowUp landing on the first hidden line (Issue changes it). The other tests in that file are mouse and Enter after a padding click, all of which end on the first body line.

## Regression risks for Issue 002

Likelihood is for this owner (Portuguese dead keys, meta-bind, Properties panel, templates, Quick Capture, tables).

### R1. Backspace at the first body line parks the caret in the hidden fence, then typing vanishes

- Scenario: caret at `bodyStart`, Backspace (or held Backspace after deleting the first line's text, which is the Issue's own trigger). `deleteCharBackward` deletes `[bodyStart-1, bodyStart)` and sets the selection to `cursor(bodyStart-1, assoc -1)` in post-change coordinates. The changeFilter suppresses the deletion; `filterTransaction` maps the selection back through the inverse (a re-insertion at `bodyStart-1`), and assoc -1 keeps it before the re-inserted character, so the caret ends at `bodyStart-1`, the end of the hidden closing fence (`state dist:2446-2456`, `commands dist:1198`). Each further Backspace moves it one more character into the hidden YAML. Inference from reading; confirm in the new test.
- What breaks: the doc is intact, but the caret is invisible, and typing, Enter and Backspace are silently dropped (insertions strictly inside `[0, bodyStart]` are suppressed). The user sees a dead editor until an arrow key moves the caret out.
- Likelihood: high. Held Backspace at the top of a note is the Issue's headline trigger, and it is how the owner clears a first line.
- Prevention: clamp the final selection after the changeFilter for every user transaction, not only `select*` ones (in the transactionFilter, any `tr.selection` range with a lower end below `bodyStart` gets that end raised to `bodyStart`; coordinates are valid because the hidden prefix never changes under the guard). Keep `goalColumn`/`assoc` when the range already sits at or after `bodyStart` (return the same range object). Add a test that asserts the caret after each of five `deleteCharBackward` calls: `head >= bodyStart` every time.

### R2. `move.line` and `move.character` are corrupted by narrowing, not blocked

- Scenario: Alt+ArrowUp on the first body line. Changes are `{fence.from..bodyStart}` (inside the suppressed range) and `{block.to, insert "\n---"}` (outside). The filter drops the first and keeps the second.
- What breaks: the document gains a stray `---` line after the first body line, which CommonMark reads as a setext underline (the line becomes an H2) or a horizontal rule, and autosave writes it. The Issue's acceptance test (moveLineUp leaves DOC unchanged) would fail. Ctrl-T (`transposeChars`) at the first body column turns `{bodyStart-1 .. bodyStart+1}` into a pure deletion of the first body character (inference from `ChangeSet.filter`).
- Likelihood: Alt+ArrowUp on the first line is a medium-low frequency keystroke, but the corruption is silent and writes to disk.
- Prevention: handle `move*` (`move.line`, `move.character`, `move.drop`) all-or-nothing: if any change in the transaction starts below `bodyStart`, return `false` for the whole transaction. Use range narrowing only for `input` and `delete`. Keep the Issue's moveLineUp test and add a transposeChars one (cursor at `bodyStart`, doc unchanged, caret `>= bodyStart`).

### R3. Straddling replacements lose the typed text

- Scenario: a selection whose lower end is in the hidden range is replaced by typing or paste. Sources that survive a `select`-only clamp: a pointer drag from the body upward past the top edge (head maps to 0; `frontmatterClick` only handles drags that start in the padding), `select.pointer` double and triple clicks, the right-click path, and Cmd+A in a note whose `bodyStart` is `null` (the guard is off there).
- What breaks: `replaceSelection` becomes `{from: 0, to: X, insert: "a"}`; `ChangeSet.filter` drops the insertion with the suppressed part and keeps a deletion of `[bodyStart, X)`. The body text is deleted and the typed character never appears. Undo restores it, so it is wrong data, not loss.
- Likelihood: low to medium (an upward drag to the top edge is plausible with autoscroll).
- Prevention: either clamp non-empty `select.pointer` ranges that straddle `bodyStart` (lower end to `bodyStart`; this cannot change reveal because the range already covers the first body line), or in the transactionFilter rebuild straddling changes with `from` raised to `bodyStart` and the insertion kept. Do not clamp empty pointer cursors (that is `frontmatterClick`'s job; see R6). Add a test: select `[0, X]` through `select.pointer`, type, assert the typed text is present and the doc below `bodyStart` is the expected replacement.

### R4. Clamp makes a range that ends at `bodyStart` reveal the first body line (harness)

- Scenario: `invariants-harness.test.ts:316` `endsAtLineStart` dispatches `select` from the closing fence line start to `bodyStart` and compares against a state whose selection ends one character earlier (`:316-319`). That is the exact shape the clamp rewrites (both ends at or below `bodyStart`, so the range is removed or collapsed, then "one cursor at `bodyStart`"). The "bullet list right under frontmatter" edge document has a block boundary at its first body line (line 5).
- What breaks: the view now has a cursor on line 5 (list marker shown as source) while the reference state has the range touching only the fence line, so the harness reports "line 5 revealed by a range ending at its start" (inference; the refute report assumed this suite stays green).
- Likelihood: probable that the suite moves. This is a test problem, but the Issue says "no edits".
- Prevention: either state in the Issue that the harness needs a documented exception for ranges that end at `bodyStart` inside the hidden range (use `select` with `filter: false`, or start the helper at `bodyStart`), or make the clamp leave a selection alone when every range ends at or before `bodyStart` and no cursor would remain on a body line (still wrong: a leftover hidden selection). The honest choice is to edit the harness step for that case and say why in the commit. Run the suite first to confirm.

### R5. Caret parked in the hidden range by paths the guard does not own; typing then disappears

- Scenarios (all dispatch without a userEvent, so no clamp):
  - Source mode to live preview toggle with the caret inside the frontmatter (the reconfigure transaction sets no selection).
  - Right-click in the top padding (`MarkdownEditor.svelte:302-311`) then typing.
  - A search or link navigation to a frontmatter offset (`pendingScrollPosition` effect dispatches `cursor(clampedPos)`).
  - Finishing a typed or pasted frontmatter block above existing text: the new block is hidden and the caret sits at the end of the closing fence. `tr.startState` for the next keystroke has the field, so the insertion at `bodyStart - 1` is dropped.
  - Properties panel adding the first property to a note whose caret was at 0: the insertion at 0 maps a caret with assoc -1 to stay at 0, inside the new hidden block (inference; check `docDiff` for an empty prefix).
- What breaks: typing, Enter and paste are silently discarded; before the guard they edited invisible YAML (also bad, but the caret and text were consistent with the document).
- Likelihood: medium for the mode toggle and for a note created empty then given a property; low for the others. The owner uses the Properties panel and templates daily.
- Prevention options, smallest first: (a) also clamp selection-only transactions that carry no userEvent and no doc change when a range lands in the hidden range (safe: no write path sets a selection without a doc change into the hidden range on purpose); (b) relocate a pure insertion that lands inside `(0, bodyStart)` to `bodyStart` instead of dropping it, so a parked caret self-heals; (c) at least add the cases to the tests and write the limit in the Issue Notes. Without (a) or (b) the silent-drop behavior is new.

### R6. Reveal of a block widget that starts at `bodyStart`

- Scenario: the first body line is a table, callout, code fence, mermaid, math, queryjs, collection or meta-bind button. Cmd+Up, ArrowUp, PageUp, Cmd+A or search select-all-matches now put the caret or selection start on that line.
- What breaks: the widget turns into raw source and the layout jumps. Today the caret sits on a hidden line and the widget stays rendered. `frontmatterClick` avoids exactly this for the mouse (`frontmatter-field.ts:82-85,93`). Opening the note already reveals it (`getPositionAfterFrontmatter`), so it is consistent with navigating into any block.
- Likelihood: medium. Owner notes with properties followed directly by a table, a meta-bind button row or a queryjs block are plausible.
- Prevention: accept it and say so in the commit and doc comment; or skip the clamp for empty cursors when the first body line is a block widget (needs DOM, so the filter cannot do it; a state-only proxy is reading the block decorators' fields, which is more coupling than this Issue warrants). Add one jsdom case with a table as first body line so the behavior is pinned (`Cmd+Home` puts the caret at `bodyStart` and the table source is revealed) and does not become a surprise later.

### R7. Multi-range selections after clamping

- Scenario: `select.search.matches` or multi-cursor with one range in the frontmatter.
- What breaks: removing ranges before the main one shifts `mainIndex`; an unadjusted index points at the wrong range or past the end; two ranges clamped to the same position are not merged unless built through `EditorSelection.create`.
- Likelihood: low (owner rarely uses multi-cursor), but a thrown `RangeError` in a filter breaks every dispatch in the note.
- Prevention: build the result with `EditorSelection.create(ranges, adjustedMainIndex)` and let it normalize; wrap nothing in try/catch (the guard must not throw: pure arithmetic only). Test: three ranges, the main one after a removed one.

### R8. Search replace-next and find-next with matches in the hidden frontmatter

- Scenario: Cmd+F for a property value. `findNext` selects the hidden match (`select.search`, clamped to a cursor at `bodyStart`, so nothing visible happens). `replaceNext` is `input.replace` and sets an explicit selection on the next match without being clamped; if the match is hidden, Replace is then suppressed and the selection offset assumes the replacement happened (`search dist:952`).
- What breaks: nothing is written, but "Replace" appears to do nothing and the selection can be a few characters off in the body (the next press only reselects, it does not replace the wrong text; inference).
- Likelihood: low.
- Prevention: accept; mention in the Issue limits. Replace-all is handled by narrowing (Issue test 7).

### R9. Performance on every user transaction

- Scenario: the filters run on each keystroke and arrow press in every note.
- What breaks: reading `frontmatterEnd` iterates `2 x hiddenLines` decorations; `computeFrontmatter`/`getAllLines` would add an O(document) line array per keystroke (the same thing `core/frontmatter-slice.ts:3-11` was written to avoid).
- Likelihood: low if the guard reads the field; real if someone reuses `computeFrontmatter`.
- Prevention: order the checks as: userEvent match, then `tr.docChanged` (changeFilter) or `tr.selection` (transactionFilter), then `frontmatterEnd(tr.startState)`. Never call `getAllLines`, `findFrontmatterBlock` or `doc.toString()` in the filters. Effect-only transactions (`setMouseSelecting`, `forceDecorationRebuild`) must return before touching the field.

### R10. Transaction rewriting hazards

- Scenario: the clamp returns a new spec instead of the original transaction.
- What breaks: anything not copied is lost: `scrollIntoView`, effects, annotations (`addToHistory`, completion annotations). A rewrite also changes `update.selectionSet` and the touched lines, which triggers the block decorator rebuild at the moment of the move. During a WebKit dead-key composition a decoration rebuild that restructures the composing line can blank text (see `extensions/composition-aware-bracket-matching.ts:1-60`); the clamp only fires on `select*` or an out-of-range caret, never inside a composition at `bodyStart`, but a rewrite of an `input.type.compose` transaction would be a new risk.
- Likelihood: low if the guard returns the original `tr` object whenever nothing needs changing (the usual path).
- Prevention: return `tr` itself on every no-op path; copy `effects`, `annotations` and `scrollIntoView` on a rewrite; never rewrite `input.type.compose*` transactions beyond the changeFilter path (composition changes at or after `bodyStart` pass untouched).

### R11. Owner-visible side effects of Cmd+A body-only

- Scenario: Cmd+A, Cmd+C in live preview no longer copies the properties; pasting into another note gives the body only. Cmd+A then type or paste replaces only the body, so a pasted block that itself starts with `---` lands under the existing frontmatter.
- Behavior differs by note: with no line after the closing fence (`bodyStart` null) the guard is off and Cmd+A still selects the hidden lines, so the same keystroke behaves two ways.
- Likelihood: certain to be noticed; accepted by the owner (2026-11-12). Record both caveats in the commit message.
- Prevention: state them in the commit and the Issue Notes; keep the out-of-scope line about `bodyStart` null.

### R12. Minor: scroll and sticky column

- Cmd+Up now ends with the caret on the first body line instead of position 0, so `scrollIntoView` may leave the 16px top padding (`setup/editor-theme.ts:39`) slightly off screen (cosmetic, inference). A rebuilt cursor drops `goalColumn`, so ArrowUp then ArrowDown loses the sticky column. Return the existing range object when it needs no change; otherwise rebuild with `EditorSelection.cursor(bodyStart, 0, undefined, range.goalColumn)`.

## Rules the implementation must follow

1. One exported guard extension in `plugins/frontmatter-field.ts`, registered in `BLOCK_EXTENSIONS.frontmatter` (`live-preview.ts:47`). It disappears with the decorator kill-switch and in source mode; nothing may install it outside that array.
2. Read the hidden range with `frontmatterEnd`/`bodyStart` from `tr.startState` only. No memory between transactions (rule 5), no `getAllLines`, no `doc.toString()`.
3. Early exits in this order: userEvent not one of `select`, `input`, `delete`, `move` (undo and redo carry `filter: false` anyway); no doc change and no selection; `bodyStart` null. Return the original `tr` unchanged on every no-op.
4. `select.pointer` is not clamped for empty cursors (`frontmatterClick` owns that). A non-empty pointer range that straddles `bodyStart` may have its lower end raised without changing reveal.
5. `input` and `delete`: narrow with `[0, bodyStart]`, return `false` for a pure insertion at 0, and rebuild or avoid straddling replacements so typed text is not lost. `move*`: all-or-nothing `false` when any change starts below `bodyStart`.
6. After the changeFilter, clamp the transaction's final selection into `[bodyStart, docEnd]` for every guarded userEvent, not only `select*` (R1).
7. Do not use `atomicRanges` (a Backspace at the first body line would delete the whole range) and do not add any visual hiding (rule 1).
8. Comment the new code in English, update the stale `frontmatterClick` doc comment (`frontmatter-field.ts:86`), `docs/LIVE-PREVIEW.md:36` and the StateField paragraph at `docs/LIVE-PREVIEW.md:192`.

## Test cases the Issue must add

Keep the Issue's listed cases, with these corrections and additions (all in `frontmatter-field-keyboard.test.ts` unless noted; each asserts the full doc and, where marked, the caret).

Corrections to the listed cases:
- moveLineUp: keep "doc equals DOC", but expect it to need the all-or-nothing rule (R2). Also assert `head >= bodyStart`.
- Held Backspace (`FRONTMATTER + 'ab'`, five calls): assert after every call that `view.state.selection.main.head >= BODY_START`, and that a following `insertText 'x'` (`input.type` at the caret) is present in the doc (R1).
- Backspace at the start of 'First body line.': also assert the caret stays at `BODY_START`.
- selectAll: assert direction (anchor at `BODY_START`, head at doc end) and that Cmd+C text excludes the frontmatter if the copy path is testable; otherwise assert the selected slice.

New cases:
1. transposeChars (`Ctrl-t`) with the caret at `BODY_START`: doc equals DOC, caret `>= BODY_START` (R2).
2. `input.type` replacement over a `select.pointer` range `[0, X]` that straddles `BODY_START`: the typed character is present and the frontmatter is intact (R3).
3. Pure insertion strictly inside the hidden range (`from: 6, insert: 'x'`, `input.type`) leaves the doc equal to DOC; an insertion at `BODY_START - 1` (end of the closing fence) leaves it unchanged and, if option (b) is chosen, inserts at `BODY_START` instead (R5).
4. Caret parked at 0 or at `BODY_START - 1` with no userEvent (right-click, mode toggle, pending-scroll shape), then `input.type`: pin the chosen behavior (dropped, relocated, or pre-clamped) so it cannot change silently (R5).
5. A first body line that is a table (`| a | b |` block): `cursorDocStart` puts the caret at `BODY_START` and the table is revealed (R6). Same doc: Enter at `BODY_START` inserts the blank line and the table stays a table.
6. Multi-range: ranges `[inside hidden, body, body]` with the main one last, then clamp: main index valid, ranges merged, no throw (R7).
7. A dead-key composition shape: `input.type.compose.start` then `input.type.compose` insertions at `BODY_START` apply unchanged (cannot prove WebKit behavior; pins the filter path).
8. Effect-only and no-userEvent transactions (`setMouseSelecting`, `forceDecorationRebuild`, a meta-bind-shaped write `{from: 0, to: BODY_START, insert}`) are returned untouched; assert `view.state.doc` and that the selection object is identical when no clamp is needed (R10).
9. `dispatchMetaBindUpdate` then `undo(view)`: already listed as a guard; add the selection assertion `head >= BODY_START` after undo.
10. A frontmatter-only note with no trailing line (`bodyStart` null): all of the above are no-ops (the Issue's out-of-scope case, pinned).
11. Kill-switch: with `{ frontmatter: true }` Backspace at the first body line edits the fence as today (listed); also check that source mode (`[]` compartment) leaves Cmd+A selecting the whole doc.

Existing suites to run first and re-read the failures rather than edit blindly:
- `invariants-harness.test.ts`, expect the `endsAtLineStart` step to move for the "bullet list right under frontmatter" edge doc (R4).
- `undo-history-across-notes.test.ts:595-604`: check whether the insertion at 0 still reaches the store; if not, the test needs a body position to keep its purpose.
- `frontmatter-field-click.test.ts`, `frontmatter-field.test.ts`, `meta-bind-writers.test.ts`, `meta-bind-input-*.test.ts`, `table-widget.test.ts`.

e2e (Chromium, so no composition coverage): ArrowUp and `ControlOrMeta+Home` from the first body line keep the caret on that line and the frontmatter hidden; ArrowUp then Backspace then typing a character puts the character in the first body line and leaves the frontmatter intact (this one fails under R1 if the caret is not clamped after the filter).

Not verifiable here: WKWebView dead-key and composition behavior near the first body line, real layout effects of `scrollIntoView`, and the harness outcome in R4. They need the app or a test run.
