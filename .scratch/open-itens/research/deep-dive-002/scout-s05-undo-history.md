# Scout s05: undo and redo history vs the Issue 002 guard

Read-only research at HEAD `a946f22f9`. Nothing was run (no vitest, e2e or app). Facts are read from source and cited path:line; inference is marked. Library paths: `node_modules/.pnpm/@codemirror+commands@6.11.1/node_modules/@codemirror/commands/dist/index.js` (short: `commands`), `.../@codemirror+state@6.7.6/.../state/dist/index.js` (`state`), `.../@codemirror+view@6.43.15/.../view/dist/index.js` (`view`).

## Summary

1. Undo and redo are safe by construction, better than the Issue assumes. `HistoryState.pop` builds the undo/redo transaction with `filter: false` (`commands:553`), so neither `changeFilter` nor `transactionFilter` ever runs on it. The Issue's "undo and redo pass unchanged" does not depend on the `undo`/`redo` userEvent check.
2. Because the history field reads the final (post-filter) transaction (`commands:229-247`), a changeFilter that narrows or drops changes cannot desync history: it records the inverse of what was actually applied.
3. The real risks are not in history but in what the guard does to the SELECTION and to multi-part changes. Two of them are new, concrete and not covered by the Issue's test list:
   - R1: a dropped or narrowed `delete.backward` leaves the caret inside the hidden frontmatter (typing then vanishes silently).
   - R2: narrowing (instead of dropping) a `move.line` transaction applies half of it and leaves a stray `---` under the first body line. The Issue's own test "moveLineUp leaves the doc equal to DOC" fails under the Issue's own design.
4. Programmatic writers that ARE recorded in history (meta-bind writes, file-history restore) pass the guard because they carry no userEvent, and Cmd+Z of them bypasses the guard. This holds.
5. `undo-history-across-notes.test.ts` stays green, but one case quietly stops testing what it says (R7).

## Facts

### History mechanics (library)
- `commands:221-250` `historyField_.update`: for a normal transaction it calls `HistEvent.fromTransaction(tr)` on the resolved `tr` and `state.addChanges(...)`. A transaction with `addToHistory === false` only calls `state.addMapping(tr.changes.desc)` (`:240-241`). Both use the post-filter `tr.changes`.
- `commands:393-405` `HistEvent.fromTransaction` returns `null` when `tr.changes.empty` and no effects. Then `:246-247` calls `addSelection(tr.startState.selection, ...)` if `tr.selection` is set. So a fully dropped Backspace becomes a selection-only history entry, never a change entry (same as any cursor move today).
- `commands:540-558` `pop`: the undo/redo transaction is `state.update({ changes, selection: event.startSelection, effects, annotations: fromHistory.of(...), filter: false, userEvent: "undo" | "redo" })`. `filter: false` is the key line (`:553`). Selection-only undo (`undoSelection`, `Mod-u`) is different: it carries `userEvent: "select.undo"` / `"select.redo"` and no `filter: false` (`:531-539`), so it goes through the guard's selection clamp.
- `commands:229-236` the `fromHistory` annotation is what pops the branch. A filter that rewrites a `select.undo` transaction without carrying `tr.annotations` loses it and the redo/undo stack no longer advances.
- `state:2430-2467` `filterTransaction`: change filters run first; a `false` result replaces changes with an empty set and maps the selection back through `tr.changes.invertedDesc` (`:2441-2442`); an array result runs `ChangeSet.filter` and maps through `filtered.mapDesc(changes).invertedDesc` (`:2445-2446`). Transaction filters then run on the resulting transaction. `resolveTransaction` (`:2416-2428`) builds a spec's transaction from `changes`, `selection`, `effects`, `annotations`, `scrollIntoView` only: a returned spec with no `changes` drops the original changes.
- `state:892-922` `ChangeSet.filter(ranges)`: ranges are PROTECTED. Changes inside a range are suppressed, the rest apply. A replace section that starts inside a protected range loses its insert (`iter.off == 0 ? iter.ins : 0`). A pure insert at position 0 with a range starting at 0 is kept (`pos == next && iter.len == 0`).
- `state:2246-2247` `Transaction` adds a `time` annotation itself if absent, so a spec need not carry it.
- `commands:499-512` `addChanges` joins to the previous event only when `!userEvent || joinableUserEvent` and within `newGroupDelay` (500 ms) and adjacent. A transaction with no userEvent (meta-bind write, file-history restore) is joinable by this rule (existing behavior, not changed by the guard).
- `commands:1403-1430` `moveLine` (up): `changes.push({from: nextLine.from, to: block.from}, {from: block.to, insert: lineBreak + nextLine.text})`, `userEvent: "move.line"`. Two independent changes: delete the line above with its break, re-insert it below.
- `commands:1160-1190` `deleteBy`: Backspace selection is `EditorSelection.cursor(from)` in post-change coordinates, `userEvent` `delete.backward`; `commands:1366-1382` `transposeChars` is one replace with `move.character`.
- `view:4468-4475` DOM-driven edits (typing, composition) are `input.type`, `input.type.compose`, `input.type.compose.start`. `view:7532` the observer resets the DOM only if `view.state == startState`, which a dropped-changes dispatch does not satisfy (inference: a dropped composition change relies on the dirty-tile redraw instead).

### App wiring
- One history, one view for all tabs: `src/lib/core/markdown-editor/setup/editor-extensions.ts:133` (`history()`), `:163` (`historyKeymap`), `:159` (`defaultKeymap`).
- Programmatic writes that must stay undo-safe and pass the guard (no userEvent):
  - `src/lib/core/markdown-editor/MarkdownEditor.svelte:189-194` (`replaceDoc`: `Transaction.addToHistory.of(false)`, history mapped, not recorded) and `:226-233` (`showTabState`, same annotation).
  - `src/lib/features/todoist-sync/note-writer.service.ts:77-80` (`addToHistory false`).
  - `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:924` `dispatchMetaBindUpdate`: `view.dispatch({ changes: {from:0, to:frontmatterEnd, insert}, effects })`, NO userEvent and NO `addToHistory:false`, so it IS recorded in history and is joinable.
  - `src/lib/features/file-history/file-history.service.ts:92-94`: full-doc replace, no userEvent, recorded in history.
  - `src/lib/features/copy-block-link/copy-block-link.service.ts:51`, `widgets.ts:44` (task checkbox): no userEvent, body only.
- Dispatchers that carry a user event: `MarkdownEditor.svelte:345` (`delete.cut`), `:360-362` (`input.paste`), `paste-html-link-handler.ts:41`, `paste-tsv-handler.ts:36`, `code-block-widget.ts:180`, `widgets.ts:517,530`, `callout-field.ts:87`. All target body text (as in the dossier).
- Programmatic carets with no userEvent that can sit in the hidden range: `MarkdownEditor.svelte:308` (right-click in top padding puts the cursor at `posAtCoords`, 0), `:386`, `:606` (pending scroll cursor), fallback `freshState(text, 0)` at the catch in `showTabState`. The guard does not clamp these (no `select` userEvent).
- Per-note undo across tabs: `showTabState` revisit restores the saved `EditorState` (history included) and updates it with `addToHistory false` (`MarkdownEditor.svelte:223-247`); `tab-view-state.ts:48-64` stores and takes saved states. The saved state carries the guard through its config; `editorModeEffects` re-reconfigures the live-preview compartment on revisit (`MarkdownEditor.svelte:234-246`), so the guard follows mode and kill-switch changes.
- `frontmatterEnd`/`bodyStart` read `state.field(frontmatterField, false)` (`frontmatter-field.ts:53-65`): `null` without the field (decorator disabled, source mode), so the guard is off there. `bodyStart` is non-null for a frontmatter-only note that ends with a trailing `\n`: `end < doc.length`, so `bodyStart == doc.length` (inference from `:62-65`; the Issue's "out of scope: no line after the fence" only covers a note with no trailing newline).
- `src/tests/lib/core/markdown-editor/undo-history-across-notes.test.ts`: uses the real `MarkdownEditor` with live preview on (`editor.store.svelte.ts:14` defaults `isLivePreview = true`). Dispatches `delete.selection` on body text (`:78-83`), `input.type` at position 0 on notes without frontmatter (`:114,395,424,564`) and on the frontmatter-only note F at `:601`. The frontmatter case at `:179-195` rewrites frontmatter with `syncExternalContentToEditor(..., 'frontmatter')` (no userEvent) then `undo`.
- No other undo test touches the markdown editor (`rg` over `src/tests/lib/core/markdown-editor` and `e2e`: only event-calendar e2e uses Meta+z). So undo of a meta-bind write has no test today.
- `invariants-harness.test.ts:335-337` dispatches `input.type` insert then `delete` at the start of EVERY line of the fixture, including hidden frontmatter lines of `19-meta-bind.md`; `:316` and `:349-358` dispatch `select` and `select.pointer`.

## Regression risks for Issue 002

### R1. A dropped or narrowed Backspace moves the caret into the hidden frontmatter; typing then vanishes (HIGH impact, medium likelihood)
- Scenario: caret at the start of the first body line, Backspace (or a held repeat). `deleteBy` dispatches a delete of `[bodyStart-1, bodyStart)` with selection `cursor(bodyStart-1)` in post-change coordinates (`commands:1160-1190`). The changeFilter suppresses the change. `filterTransaction` then maps the selection back through the inverted suppressed change (`state:2441-2446`). A cursor at `bodyStart-1` mapped back across a re-inserted character at `bodyStart-1` with the default assoc -1 stays at `bodyStart-1`, which in the start doc is the end of the hidden closing-fence line (inference from `SelectionRange.map(change, assoc = -1)`, not run).
- The guard's selection clamp only handles transactions with no doc change and userEvent `select`. This transaction is `delete.backward`, so nothing clamps it. The caret now sits on an invisible line.
- What breaks: every following typed character, Enter or Delete at that caret is an insert inside `[0, bodyStart)` and is suppressed, silently. A second held-key Backspace deletes `[bodyStart-2, bodyStart-1)`, which is suppressed again, and the caret walks back one position per press into the hidden lines (down to 0). The doc stays intact, the user sees nothing happen and typing is eaten until they click or press an arrow. The Issue's test 26 (five Backspaces, doc equals FRONTMATTER) passes in this state, so it cannot catch it.
- Likelihood for this owner: medium. Deleting the first body line's text with Backspace and continuing past its start is a common gesture, and it is the very gesture the Issue targets. Typing with accents after it is the owner's daily use.
- Prevention: after the changeFilter, a `transactionFilter` must also clamp the selection of any user transaction (not only `select`), moving any range wholly inside `[0, bodyStart)` to `bodyStart` and clamping straddling ranges, and it must return `{ changes: tr.changes, selection, effects: tr.effects, annotations: tr.annotations, scrollIntoView: tr.scrollIntoView }` (a spec without `changes` drops the edit, see `state:2403-2428`). Alternative: when the changeFilter suppresses a `delete.backward`, return `false` AND clamp the selection; `false` alone restores the caret to its start position via the inverted full change only if the mapping lands at `bodyStart`, which must be tested, not assumed.

### R2. Narrowing a `move.line` transaction applies half of it (HIGH impact, medium likelihood)
- Scenario: Alt+ArrowUp on the first body line. `moveLine` emits two independent changes: delete `[closeFrom, bodyStart)` and insert `"\n---"` after the line (`commands:1425-1430` region above). With changeFilter ranges `[0, bodyStart]` (the Issue's design) the delete is inside the protected range and is suppressed, but the insert at `block.to` is outside it and applies.
- What breaks: the doc becomes `---\nstatus: todo\n---\nFirst body line.\n---\n\nEnd line.`: the fence stays and a second `---` is added under the first body line, which turns that line into a setext heading and adds a stray rule. The history records this applied half-change, so Cmd+Z undoes it, but the user sees a corrupted note first. This is a NEW corruption introduced by the guard, and it contradicts the Issue's own criterion "moveLineUp leaves the doc equal to DOC".
- Likelihood: low to medium (Alt+ArrowUp is not a reflex, but it is bound in `defaultKeymap`).
- Prevention: for `move.*` transactions (paired deletion plus insertion) do not narrow. Return `false` for the whole transaction when ANY change touches `[0, bodyStart)`. Keep range-narrowing only for `input.replace.all`, where each match is independent. Same rule protects `move.drop`: a drop whose insert lands inside the protected range would otherwise delete the dragged text from the body and lose the insert (text loss); with all-or-nothing nothing happens. The dossier's original "always `false`" and the refute's "always narrow" are each wrong for one family; the split is by userEvent.

### R3. Rewriting a transaction in the filter loses its history link or its edit (MEDIUM impact, depends on implementation)
- Scenario: the clamp returns a spec that omits fields. Omitting `annotations` drops `fromHistory` on `select.undo`/`select.redo` (`commands:531-539`), so `undoSelection` no longer pops its branch. Omitting `changes` on a transaction that has doc changes (R1 fix) silently drops the edit. Omitting `effects` drops announcements and the app's `forceDecorationRebuild`.
- Likelihood: certain if the implementer copies the dossier's selection-only spec onto non-`select` transactions; low for `Mod-u` itself, which is rarely used.
- Prevention: always return the full tuple (`changes`, `selection`, `effects`, `annotations`, `scrollIntoView`). Test `undoSelection` followed by `redoSelection` around a clamped selection.

### R4. Undo of a recorded programmatic frontmatter write is safe, but the restored selection may land in the hidden range (LOW to MEDIUM)
- Scenario: a meta-bind select/toggle/button or a file-history restore (no userEvent, recorded in history: `widgets.ts:924`, `file-history.service.ts:92-94`). Cmd+Z dispatches `changes: event.changes, selection: event.startSelection, filter: false` (`commands:549-556`). It is never filtered or clamped, by design.
- What breaks (inference): `startSelection` is the selection at the time of the write. If that was 0 or inside the hidden lines (right-click in the top padding `MarkdownEditor.svelte:308`, fallback `freshState(text, 0)`, or R1's stranded caret), undo restores the caret to the hidden range. Typing is then suppressed with no feedback, same symptom as R1.
- Likelihood: low. Prevention: the selection clamp should not only target `select` transactions: a transactionFilter clamp of the final selection for `undo`/`redo` is NOT possible (`filter: false`), so accept it, or add a `ViewPlugin`/`updateListener` fix-up (more code; the owner's rules say not to add complexity for rare cases). State the limit once; test it as documented behavior if kept.

### R5. Programmatic changes that carry a user-like event but are not body-only (LOW)
- Scenario: any future or plugin dispatch using `input.*`/`delete.*`/`move.*` against position 0 (for example a vault mod or template insertion at the cursor when the cursor is at 0). Current `src/lib` dispatchers are body-only (list above), so nothing breaks today.
- Likelihood: low, and silent: the edit is dropped with no toast.
- Prevention: keep the guard keyed on the three userEvent prefixes; do not extend it to un-annotated transactions. Note it in the doc comment so a later dispatcher knows why its `input.*` write at 0 vanishes.

### R6. Pure insert at 0 returning `false` must also cover the paired-deletion case (MEDIUM)
- Scenario: a transaction with a deletion in the body and an insertion at 0 (drag-drop of selected text onto the top padding, `move.drop`; or multi-cursor paste). The Issue says "a transaction that inserts at 0 returns `false`". If the implementer reads this as "a pure insertion" and narrows the rest, the body deletion applies and the insert is dropped: dragged text is lost.
- Likelihood: low for this owner (drag and drop onto the top padding). Impact is data loss, so it is worth one test.
- Prevention: rule = if any insertion lands in `[0, bodyStart)` and the transaction also has changes outside it, return `false`. Test: `{ changes: [{from:0, insert:'x'}, {from: bodyStart+2, to: bodyStart+4}], userEvent: 'move.drop' }` leaves DOC unchanged.

### R7. Existing undo test weakens silently (LOW, test hygiene)
- `undo-history-across-notes.test.ts:601`: note F is frontmatter-only with a trailing newline, so `bodyStart` is non-null and the guard is on. The test inserts `X` at 0 with `input.type`; the guard now drops it. The assertions (`tabContent(F)` does not contain B's text, B unchanged) still pass, but the dispatch no longer changes the doc, so the case stops exercising the tab-switch-with-edit path it was written for (inference; not run). Do not edit it silently: either change the position to `doc().length` or accept and mention it in the commit. The CLAUDE.md rule "never weaken tests" applies, so ask or keep the case equivalent by inserting at the end.
- `:114,395,424,564` insert at 0 in notes without frontmatter: guard is a no-op (`bodyStart` null). Safe.
- `:179-195`, `:486-535`: external syncs carry no userEvent, undo bypasses filters. Safe.

### R8. Grouping and key-repeat side effects (LOW)
- A dropped keystroke does not call `addChanges`, so it neither joins nor breaks the grouping of surrounding typing; a held Backspace over the fence adds at most one deduplicated selection entry (`commands:437-447` skips equal selections). No history growth or desync.
- Composition (Portuguese dead keys): `input.type.compose[.start]` at `bodyStart` passes (insertion at exactly `bodyStart` is outside the protected range, `state:892-922`). Compose events always join the previous event (`commands:504-506`); a composition change dropped by the filter would be absent from that group, so a later compose chunk could join the wrong earlier event. Only reachable when the composition range starts before `bodyStart`, which needs an engine DOM diff reaching into the hidden line (inference, not verified; applies to WebKit in Tauri). Low likelihood, so cover with one jsdom case at `bodyStart` and note the limit.

## Test cases the Issue must add

All in `frontmatter-field-keyboard.test.ts` unless stated. Use real `livePreviewExtensions`, no mocks, and assert on the selection as well as the doc (the Issue's tests assert only the doc, which is why R1 slips through).

1. R1: cursor at the start of the first body line, `deleteCharBackward(view)`. Assert `doc` equals DOC AND `view.state.selection.main.head >= bodyStart`. Then dispatch `{ changes: { from: head, insert: 'x' }, userEvent: 'input.type' }` and assert the doc gained `x` at the body start.
2. R1: extend the five-Backspace test (`FRONTMATTER + 'ab'`): after the five calls assert `selection.main.head === FRONTMATTER.length` (not 0 or inside the fence), and that one more typed `input.type` char lands in the body.
3. R1: `deleteCharForward` and `deleteGroupBackward` at the body start keep the caret at or after `bodyStart`.
4. R2: `moveLineUp(view)` on the first body line leaves the doc equal to DOC byte for byte (guards against the half-applied `\n---`). Also `moveLineDown` on the last body line and `transposeChars` at the body start leave frontmatter intact.
5. R2/R6: a `move.drop` style dispatch with a deletion in the body and an insertion at 0 leaves the doc equal to DOC (all-or-nothing).
6. Narrowing stays for replace-all: the Issue's `input.replace.all` case (frontmatter `todo` and body `todo`) changes only the body occurrence.
7. R3: `undoSelection` then `redoSelection` after a clamped `select` (for example `selectDocStart`): `canUndoSelection`/history advance and no exception; assert `undoDepth` and `redoDepth` before and after.
8. Undo of a recorded programmatic write (new, passes today and must keep passing): dispatch a meta-bind-shaped write (`{ changes: { from: 0, to: fmEnd, insert: newFm } }`, no userEvent) via `dispatchMetaBindUpdate` or the same shape, assert `undoDepth(view.state) === 1`, `undo(view)` restores the old frontmatter, `redo(view)` re-applies it, and the doc equals the original after the undo with the caret still `>= bodyStart` when the write started with the caret in the body.
9. R4: a recorded frontmatter write started with the caret at 0, then `undo`: document the resulting selection explicitly (the Issue should decide whether it is accepted).
10. Typing after undo: after case 8's `undo`, dispatch `input.type` at `bodyStart` and assert it applies (undo did not leave the guard in a bad state).
11. Grouping: type `a`, `b` at the body start with `input.type` within 500 ms, press a dropped Backspace at the fence, then `undo(view)` once: assert `undoDepth` and that the typed text is undone as one group (a dropped keystroke does not split or merge groups).
12. Composition: dispatch `input.type.compose.start` then `input.type.compose` at `bodyStart` and assert both apply and one `undo` removes the composed text.
13. R7: keep `undo-history-across-notes.test.ts:601` meaningful: leave it unedited and add an assertion in the new file that the same note shape (`---\ntitle: x\ntags: a\n---\n`) accepts `input.type` at its END; ask the owner before changing that existing case.
14. Cross-tab (new, real `MarkdownEditor`, in a new case next to `undo-history-across-notes.test.ts`): open a note with frontmatter, make a body edit, switch tabs and back, Backspace at the body start (dropped), then Cmd+Z: assert the body edit is undone and the frontmatter bytes are unchanged. This proves the guard survives `showTabState` restore.
15. Existing suites to run unchanged: `undo-history-across-notes.test.ts`, `invariants-harness.test.ts` (its `input.type` at hidden lines becomes a no-op, check it still reports zero violations), `frontmatter-field.test.ts`, `frontmatter-field-click.test.ts`, `meta-bind-writers.test.ts`.

## Not verified

- No code, test or app was run. The caret landing in R1 comes from reading `deleteBy`, `filterTransaction` and `SelectionRange.map`; the `assoc` default must be confirmed with a failing test first (the repo rules say reproduce before patching).
- Whether a dropped DOM-driven composition change redraws correctly in WebKit is inference from `view:7532` and the dirty-tile logic, not tested.
- Source mode and the decorator kill switch are inferred off because `frontmatterEnd` returns `null` without the field, not traced through `editorModeEffects`.
