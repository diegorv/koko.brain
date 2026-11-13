# Scout s02: CodeMirror filter semantics for Issue 002

Angle: real `@codemirror/state` 6.7.6, `@codemirror/view` 6.43.15, `@codemirror/commands` 6.11.1, `@codemirror/search` 6.7.2, `@codemirror/language` 6.13.1, `@codemirror/lang-markdown` 6.5.2 (pnpm store under `node_modules/.pnpm/`, linked from `node_modules/@codemirror/`). Repo HEAD `a946f22f9`. Read-only on the codebase.

Method: I read the library source and the repo. For the semantics that decide the design (what `changeFilter` ranges do to compound and straddling changes, where the selection lands after a suppressed change) I also ran throwaway `node -e` snippets against `@codemirror/state` only (no view, no DOM, no file written, no test, build, e2e or app). Those results are labeled EXECUTED. Everything else is READ. Inference is marked INFERENCE.

Paths below: `state/dist/index.js` = `node_modules/@codemirror/state/dist/index.js`; same pattern for `view`, `commands`, `search`, `language`, `lang-markdown`.

## 1. Summary

The Issue's fix direction (changeFilter returning `[0, bodyStart]` plus a select-only clamp) is sound for the common single-change cases (Enter, Backspace, Delete, replace-all) but has four defects that a literal implementation would ship. All four are EXECUTED, not guessed:

1. **`move.line` is corrupted, not guarded, by range narrowing.** Alt+ArrowUp on the first body line dispatches two changes (delete the closing-fence line, insert `\n---` after the body line). `ChangeSet.filter` suppresses the first and keeps the second, so the doc becomes `...---\nFirst body line.\n---\n...`: a duplicate fence under the first body line (setext heading). The Issue's own `moveLineUp` test ("doc equal to DOC") fails under the specified guard.
2. **A replacement that starts in the hidden range and ends in the body loses its insert and still deletes the body part.** `transposeChars` (Ctrl-T) at the start of the first body line deletes the first body character. A typed character over a selection `[0, len]` (select-all that was not clamped, or a programmatic selection) deletes the whole body and drops the typed character. This is real data loss, and it follows from `ChangeSet.filter` dropping an insert attached to a deletion that begins in a suppressed range.
3. **A suppressed change leaves the caret inside the hidden range.** After the filter removes a Backspace at the body start, the transaction still carries its explicit selection `bodyStart - 1`, mapped through the inverse of the dropped change. The caret ends at the end of the closing fence line (hidden). Each further Backspace walks it one character further into the hidden YAML (position 20, 19, ... 16 after five presses in the test doc) with no visible change, and typing there is silently dropped. The Issue's select-only clamp never runs on `delete.*` / `input.*` transactions, so nothing heals it. Same for `delete.line` and for a dropped `move.*`.
4. **`EditorSelection.create(ranges, mainIndex)` does not validate `mainIndex`.** Removing ranges in the clamp without remapping `mainIndex` yields `selection.main === undefined` (EXECUTED), which crashes at the next read.

Recommended policy (EXECUTED against the state library with a sketch, see section 4): all-or-nothing (`false`) for any user `input` / `delete` / `move` transaction that has a changed range starting below `bodyStart`, narrowing with `[0, bodyStart]` only for `input.replace` / `input.replace.all`; and run the selection clamp on every user-event transaction (not only `select`) against `tr.newSelection`, after the change filter, so a dropped edit never leaves the caret in the hidden lines.

`atomicRanges` is a poor fit (section 3.5): it only skips positions strictly inside a range, never blocks landing on a boundary, never blocks programmatic selection, and an atomic range that includes the line break turns Backspace at the body start into "delete the whole frontmatter".

## 2. Facts (path:line)

### 2.1 Filter pipeline (state)

- `state/dist/index.js:2049-2051`: `changeFilter`, `transactionFilter`, `transactionExtender` are plain facets (no combiner).
- `:2416-2428` `resolveTransaction(state, specs, filter)`: builds the transaction, then `extendTransaction(filter ? filterTransaction(tr) : tr)`. `state.update(...)` calls it with `filter = true` (`:2598`). Filters therefore run when the transaction is BUILT (`state.update` / `view.dispatch(spec)`), also for off-view `state.update(...)` calls (tab-state rebuilds, tests). A spec with `filter: false` skips both filter kinds (`:2418-2424`); `transactionExtender` still runs.
- `:2430-2468` `filterTransaction(tr)`:
  - Change filters run first, in facet order, and each receives the ORIGINAL `tr` (not the previous filter's output). A `false` stops at once; arrays are merged with `joinRanges` (`:2434-2444`, `:2362-2381`).
  - If the result is not `true` (an array, even an empty `[]`), a NEW `Transaction` is created (`:2445-2455`): `false` gives `ChangeSet.empty`, `back = tr.changes.invertedDesc`; an array gives `tr.changes.filter(ranges)` and `back = filtered.filtered.mapDesc(filtered.changes).invertedDesc`. In both cases only `tr.selection` is mapped through `back` (`tr.selection && tr.selection.map(back)`), effects through `StateEffect.mapEffects(tr.effects, back)`, annotations and `scrollIntoView` are kept. A selection-only transaction that gets an array back is rebuilt for nothing: return `true` unless `tr.docChanged`.
  - Transaction filters then run on the (possibly narrowed) transaction, in REVERSE facet order (`for (let i = filters.length - 1; i >= 0; i--)`, `:2457-2467`). A returned `Transaction` is used as is; `[Transaction]` too; anything else goes through `resolveTransaction(state, asArray(filtered), false)`, which does NOT re-run filters (`:2465`).
- `:2403-2415` `resolveTransactionInner`: a returned spec without `changes` gets `ChangeSet.of([], docSize)`, i.e. the doc changes are DROPPED (EXECUTED: `{selection}` alone made `update({changes: insert x})` return `"abc"`). A spec must repeat `changes: tr.changes`, `effects`, `annotations` (carries `userEvent`, `addToHistory`, `Transaction.time`) and `scrollIntoView`. EXECUTED: passing `annotations: tr.annotations` keeps `isUserEvent("input")` true and adds no duplicate `time`.
- `:2471-2481` `extendTransaction`: extenders run after filters and can only add effects/annotations. None exist in the repo.
- `:2245` the `Transaction` constructor runs `checkSelection(selection, changes.newLength)`; `:1520-1524` only checks `range.to <= docLength`, NOT `mainIndex`.
- `:1415`, `:1420`, `:1463-1475`, `:1504-1519`: `EditorSelection.main` is `ranges[mainIndex]`; `create` only re-normalizes when ranges are unsorted or overlapping and never validates `mainIndex`; `asSingle()` returns `new EditorSelection([this.main], 0)`.
- `:2632` (`applyTransaction`) and `:2766-2767` (`create`): without `allowMultipleSelections` the state collapses to `main` AFTER the filters ran. Production has it on (`src/lib/core/markdown-editor/setup/editor-extensions.ts:135`).
- `:2313-2316` `isUserEvent(e)`: true when the annotation equals `e` or starts with `e.`. `select` matches `select.pointer`, `select.search`, `select.undo`; `input` matches `input.type.compose.start`, `input.replace.all`, `input.table.add-row` (`widgets.ts:517,532`), `input.codeblock.set-language` (`code-block-widget.ts:180`).
- `:2354`, `:2361`: `addToHistory` and `remote` are annotations; neither is consulted by the filters unless the guard reads them. All repo programmatic writers set no `userEvent` (rg over `src/lib`: only `MarkdownEditor.svelte:345,362`, `paste-html-link-handler.ts:41`, `paste-tsv-handler.ts:36`, `code-block-widget.ts:180`, `widgets.ts:517,532`, `callout-field.ts:87` set one; `MarkdownEditor.svelte:191,232` and `note-writer.service.ts:79` set only `addToHistory:false`).
- Facet doc for the filters: `:2930-2968` ("used with care"; `false` stops all changes; ranges suppress; "avoid accessing `Transaction.state` in a filter"). `Transaction.state` / `newDoc` would apply the unfiltered transaction first (`:2263-2290`); `frontmatterField.update` recomputes `getAllLines` on every `docChanged`, so touching `tr.state` in the guard would double that work.

### 2.2 `ChangeSet.filter` (what ranges really do)

- `state/dist/index.js:892-922`. A range array `[a0, b0, a1, b1, ...]` marks suppressed zones. Changes before `a0` and after `b_last` are kept; sections inside are turned into retain sections and moved to `filtered`.
- Pure insertion at exactly `a0` passes: the first loop is `while (pos < next || pos == next && iter.len == 0)` (`:896`). With `[0, bodyStart]` an insertion at position 0 is KEPT (EXECUTED: `input.paste` insert `x` at 0 gave `x---\n...`).
- Pure insertion strictly inside the range is suppressed (EXECUTED: typing at `bodyStart - 1` changed nothing). Insertion at `bodyStart` is kept (EXECUTED: Enter at body start works).
- A replacement section is split at range boundaries; only the piece with `off == 0` carries the insert (`:900-904`, `:911-913`). So a replacement that STARTS in the range loses its insert and the part past `bodyStart` is still deleted (EXECUTED: `{from: B-3, to: B+2, insert: "Z"}` deleted `Fi`, no `Z`; `transposeChars` shape deleted the first body char; select-all typed `q` left only the frontmatter and no `q`).
- Compound transactions are filtered change by change: a suppressed change does not stop a sibling change that is outside the range (EXECUTED: `moveLine` shape, see 4).
- The selection is only remapped through `back` (`:2452-2454`). For a dropped Backspace, `back` is "insert 1 char at `bodyStart - 1`", and `SelectionRange.map(change, assoc = -1)` keeps the cursor BEFORE that insert, i.e. at `bodyStart - 1` (EXECUTED).

### 2.3 Commands the owner hits at the body start (commands 6.11.1)

- `commands/dist/index.js:580-589` `setSel` / `moveSel`: every cursor motion is `state.update({selection, scrollIntoView: true, userEvent: "select"})`, and `moveSel` returns `false` (falls through to the next binding or the browser) only when the NEW selection equals the old one BEFORE filtering. After a filter rewrites the selection the command already returned `true`, so no fall-through.
- `:1084-1087` `selectAll`: anchor 0, head `doc.length`, `userEvent: "select"`.
- `:1175-1207` `deleteBy` (all Backspace/Delete/Ctrl-H/Ctrl-D/Option-Backspace/Cmd-Backspace paths): one `changeByRange` with an EXPLICIT cursor selection, `userEvent` `delete.backward|forward|selection`. It returns `true` and dispatches even if a filter later empties the change.
- `:1209-1217` `skipAtomic`: expands the delete target only when the target is strictly inside an atomic range (`from < pos && to > pos`).
- `:1218-1235` `deleteByChar`: at a line start the target is `pos - 1` (the line break). `:1253-1275` `deleteByGroup` and `:1311-1320` `deleteLineBoundaryBackward` do the same at a line start.
- `:1368-1385` `transposeChars` (Ctrl-T on macOS, `emacsStyleKeymap`): at a line start it replaces `[pos - 1, pos + 1)` with the swapped text, `userEvent: "move.character"`.
- `:1403-1431` `moveLine`: `moveLineUp` on a block starting at `bodyStart` emits `{from: nextLine.from, to: block.from}` (the closing fence line and its break) AND `{from: block.to, insert: "\n" + nextLine.text}`, `userEvent: "move.line"`, explicit selection.
- `:1440-1458` `copyLine` (`input.copyline`): inserts at `block.from` / `block.to`; at the first body line both are `>= bodyStart`.
- `:1471-1491` `deleteLine` (`delete.line`): for a block that is not at doc start it extends `from` by one (`from--`), so deleting the LAST/ONLY body line emits `[bodyStart - 1, docEnd]`, which straddles the range; explicit selection.
- `:1362`, `:1497`, `:1511`, `:1563`, `:1623`, `:1673`: Enter/split/indent commands use `userEvent: "input"` or `"input.indent"`. `:1611` `indentSelection` uses `"indent"`, which matches none of `input` / `delete` / `move` (a gap in the Issue's list, low impact because the Cmd+A clamp keeps the selection in the body).
- `:537`, `:554`: `undoSelection`/`redoSelection` use `select.undo`/`select.redo` (matched by the `select` clamp); `undo`/`redo` use `undo`/`redo`.
- `lang-markdown/dist/index.js:398-424`: the markdown language installs `Prec.high(keymap.of(markdownKeymap))` (Enter = `insertNewlineContinueMarkup`, `userEvent: "input"` `:282`; Backspace = `deleteMarkupBackward`, `userEvent: "delete"` `:388`) because `markdownLanguage()` leaves `addKeymap` at its default (`src/lib/core/markdown-editor/highlight-styles.ts:86-87`). Both only edit within the cursor's line markup; at `bodyStart` they fall through to the generic commands.
- `search/dist/index.js:860,880` `select.search`; `:894,916` `select.search.matches`; `:923-953` `replaceNext` (`input.replace`, sets `selection` to the NEXT match, which can be in the hidden frontmatter); `:975` `replaceAll` (`input.replace.all`, no explicit selection, all matches in one transaction).

### 2.4 View: atomicRanges, DOM-driven changes, composition

- `view/dist/index.js:3792-3806` `skipAtomicRanges`: only skips when `pos > from && pos < to` (strictly inside); positions at either boundary are allowed. `:3808-3832` `skipAtomsForSelection` is applied to pointer selections only (`:4364` in the DOM-selection branch when the origin is `select.pointer`; `:4880` in `MouseSelection.select`). `:3834-3837` `skipAtoms` is applied by `moveByChar`/`moveVertically`.
- `:8962-8970`: atomic ranges "do not prevent direct programmatic selection updates from moving into such regions".
- `:4289-4371` `applyDOMChange`: DOM mutations become a change by `findDiff` over the dirty tile bounds, preferred anchor `sel.from` (or `sel.to` after key code 8). The selection-only branch (`:4358-4366`) dispatches `userEvent = "select"` unless a key/pointer set `lastSelectionOrigin` less than 50 ms ago, in which case it takes that origin (can be `select.pointer`).
- `:4401-4479` `applyDefaultInsert`: typed text is `input.type`; during composition `input.type.compose`, plus `.start` for the first change. Mac dead keys (Option+E then a) are this path. The change bounds come from the dirty line tile (`:7541-7550` `readMutation`: `posAtStart` of the tile), so a composition in the first body line starts at `bodyStart` (INFERENCE from reading; not run in a browser).
- `:7521-7535` `flush`: after `applyDOMChange`, `if (this.view.state == startState && (domChange.domChanged || selChange)) this.view.update([])`. A transaction that the filter rewrote still creates a NEW state, so this forced redraw does not run; `DocView.update` (`:2982-3037`) redraws only when the tile is no longer `Synced` or ranges changed. INFERENCE: dirty tiles keep the DOM resync working for a dropped DOM-originated change; not verified in a browser.
- `:4883-4886` `MouseSelection.select` dispatches `select.pointer`; `:5155` drop is `move.drop` / `input.drop`; `:5262` cut `delete.cut`; `:4985` paste `input.paste`.

### 2.5 Other extensions and the repo

- Only one transaction filter exists in the whole dependency set: `language/dist/index.js:1188-1213` `indentOnInput` (returns `[tr, {changes, sequential: true}]`). It is a no-op for markdown (no `indentOnInput` language data). It sits before `livePreview(...)` in the array (`editor-extensions.ts:136` vs `:146`), so in the reverse-order loop the guard runs FIRST and `indentOnInput` sees the guard's output. A `Prec.high` on the guard would flip that.
- `rg 'transactionFilter|changeFilter|transactionExtender|atomicRanges' src e2e` is empty; no code passes `filter: false` to a transaction (the `filter: false` hits are autocomplete result options).
- `frontmatter-field.ts:53-65`: `frontmatterEnd` reads the maximum `iter.to` of the field's decoration set (cost O(frontmatter lines x 2)); `bodyStart` is `end + 1` and `null` when `end >= doc.length`. `:36-44` the field recomputes on `docChanged`. `live-preview.ts:47` is the kill-switch entry (`BLOCK_EXTENSIONS.frontmatter`); source mode empties the whole compartment (`editor-extensions.ts:121`).
- Hidden lines: `core/hide-lines.ts:14-20` per-line replace `[line.from, line.to]`; the line breaks are not covered.
- Production stack relevant to the guard (`editor-extensions.ts`): `history()` `:133`, `allowMultipleSelections` `:135`, `indentOnInput` `:136`, `closeBrackets` `:138`, `autocompletion` `:142`, `rectangularSelection` `:147`, `defaultKeymap` `:159`, search keymap `:162`, `historyKeymap` `:163`, `indentWithTab` `:165`.
- macOS native Edit menu has predefined undo, redo, cut, copy, paste, select all (`src-tauri/src/lib.rs:226-233`). INFERENCE: Cmd+A may reach the editor as a native `selectAll:` whose DOM selection CodeMirror turns into a `select` transaction at `view/dist/index.js:4358-4366`, not through the `Mod-a` keymap. Either way the userEvent starts with `select`, except in the 50 ms window after a pointer event (`:4359-4363`).
- `MarkdownEditor.svelte:302-310` `handleContextMenu` dispatches `{selection: cursor(pos)}` with no userEvent; a right-click in the top padding gives position 0 (the Issue cites `:308`). `:339-346` cut, `:354-366` paste, `:373-377` select-all via `selectAll(view)`.
- Test helper `src/tests/lib/core/markdown-editor/test-helpers.ts:59-82` `createMarkdownState` installs neither `history()` nor `allowMultipleSelections`; `frontmatter-field-click.test.ts:28-34` `mount` copies that.
- `invariants-harness.test.ts:277-287` `boundaryLines` come from the syntax tree top nodes (includes frontmatter lines); steps at `:330+` dispatch `input.type` + `delete` at `lineNo` start (`:331-337`) and a `select` range ending at a line start (`:312-326`, the diff is limited to the target line).

## 3. EXECUTED experiments (`@codemirror/state` 6.7.6 only)

Doc: `FM = "---\nstatus: todo\n---\n"` (21 chars, `B = 21`) + `First body line.\n\nEnd line. todo`. Cursor at `B`.

### 3.1 Issue as written (changeFilter `[0, B]` for `input|delete|move`)

| Dispatch (userEvent) | Resulting doc | Selection after |
|---|---|---|
| delete `[B-1,B)` + selection `B-1` (`delete.backward`) | unchanged | **20** (hidden) |
| moveLine shape: delete `[17,B)` + insert `\n---` after body line (`move.line`) | **`...First body line.\n---\n\nEnd line.`** (fence duplicated) | 17 (hidden) |
| replace-all `todo` -> `DONE` in frontmatter and body (`input.replace.all`) | only the body occurrence | ok |
| insert `x` at 0 (`input.paste`) | **`x---\n...`** (passes) | 22 |
| insert `\n` at B (`input`) | blank line at top | 22 |
| replace `[B-3,B+2)` by `Z` (`input.type`) | **`Fi` deleted, no `Z`** | 21 |
| select-all replaced by `q` (`input.type`, `[0,len)`) | **frontmatter only, body gone, no `q`** | 21 |
| insert `x` at `B-1` | unchanged | 20 |
| move.drop: delete `[B+1,B+5)` + insert at 0 | **`irst---...`** (insert at 0 passes, source deleted) | 4 |
| transposeChars shape `[B-1,B+1)` -> `F\n` (`move.character`) | **first body char `F` deleted** | 21 |
| deleteLine on a single body line `[B-1, end]` (`delete.line`) | `---\n...---\n` (body part deleted) | **20** (hidden) |

### 3.2 Caret descent under `false` (the Issue's test shape)

Five consecutive `delete.backward` dispatches starting at `B` with a `false`-for-edits filter: doc unchanged every time, caret `20, 19, 18, 17, 16`. A typed `x` at 16 (`input.type`) is dropped; caret stays 16. The Issue's test "five deleteCharBackward leave the doc exactly FRONTMATTER" passes while the caret is lost in the hidden YAML.

### 3.3 Sketch that passes every row (not shipped code, only to validate the policy)

```
changeFilter: if (!tr.docChanged || !(input|delete|move)) return true
  start = bodyStart(tr.startState); if null return true
  touches = any iterChangedRanges fromA < start; if none return true
  return tr.isUserEvent('input.replace') ? [0, start] : false
transactionFilter: if not (select && !select.pointer || input|delete|move) return tr
  sel = tr.newSelection; if no range has from < start return tr
  drop ranges with to < start (remap mainIndex), clamp the others to >= start,
  none left -> single cursor at start
  return { changes: tr.changes, selection, effects, annotations, scrollIntoView }
```

Results: Backspace@B doc unchanged and caret `21`; moveLineUp doc unchanged, caret `21`; transposeChars doc unchanged; replace-all body only; paste@0 unchanged; Enter@B ok; selectAll `[21, 53]`; select-all then type `q` gives `FM + "q"`; multi-cursor `[3, B+4]` leaves one cursor at `B+4` with `mainIndex 0` for both main-hidden and main-body orders; `select.pointer` and no-userEvent selections inside the hidden range pass untouched; a write with no userEvent and one with `userEvent: "undo"` change the frontmatter; deleteLine on the only body line is dropped (nothing happens). `EditorSelection.create([cursor(25)], 1).main` is `undefined`.

## 4. Regression risks for Issue 002

Likelihood is for this owner (Portuguese typing with dead keys, meta-bind inputs and buttons, Properties panel, views reading frontmatter, templates, Quick Capture, tables, daily).

### R1. `move.line` narrowing duplicates the closing fence (certain, high)
- Scenario: caret on the first body line, Alt+ArrowUp (or Alt+ArrowUp with a selection spanning the first body lines).
- Breaks: with `[0, bodyStart]` the `{from: block.to, insert: "\n---"}` half survives, so the body gets a `---` underline (setext heading) and the caret is left in the hidden range. The Issue's `moveLineUp` jsdom test fails.
- Likelihood: low to medium (Alt+ArrowUp is a habit for moving lines, and the first body line is where the owner works after Cmd+Up).
- Prevent: for `move.*` (and by default for every event except `input.replace*`) return `false` when any changed range has `fromA < bodyStart`. Keep narrowing only for replace.

### R2. Straddling replacement loses data (certain when triggered, high)
- Scenario: Ctrl-T (macOS transpose) at the body start; a typed character over a selection that starts in the hidden range (programmatic selection, an unclamped select-all, an external caret at 0 plus Shift+arrows); any command that replaces across `bodyStart`.
- Breaks: the insert is dropped, the body part of the deletion is applied: first body character lost, or the whole body deleted with the typed character gone (3.1 rows). Cmd+Z restores it, but it is silent.
- Likelihood: Ctrl-T low; selection-from-0 low once Cmd+A is clamped; consequences are data loss, so treat as must-fix.
- Prevent: all-or-nothing outside replace (see R1). If narrowing is kept for `input.replace.all`, no match straddles the fence in practice.

### R3. Suppressed edit leaves the caret in the hidden lines (certain, high)
- Scenario: first body line, Backspace (the Issue's own trigger: "Backspace held down, key repeat runs past the start of the line"), also Cmd+Backspace, Option+Backspace, Ctrl-H, `delete.line`, dropped `move.*`.
- Breaks: doc is safe, but the caret goes to the end of the closing fence and then descends one char per Backspace. No caret is drawn (display:none line). Typing is then silently dropped (3.2). It looks like the editor froze. The Issue's tests assert only the doc.
- Likelihood: high for the held-Backspace path.
- Prevent: run the clamp on `tr.newSelection` for every user-event transaction (`select` except pointer, `input`, `delete`, `move`), in the transactionFilter, which sees the already narrowed transaction. Positions below `bodyStart` never shift because all changes there are suppressed, so `bodyStart` from `startState` stays valid. Return `tr` itself when nothing needs clamping.

### R4. Caret already hidden through a programmatic path: first keystroke vanishes (likely, medium)
- Scenarios: (a) source mode with the caret inside the YAML, then toggle to live preview (reconfigure effect, no userEvent: no clamp); (b) Properties panel or meta-bind inserts frontmatter at position 0 into a note whose caret was at 0 (`selection.map` keeps the caret at 0, inside the new hidden block); (c) right-click in the top padding (`MarkdownEditor.svelte:302-310`); (d) a saved tab state (`showTabState`) restored with the caret in the YAML.
- Breaks: today typing there edits invisible YAML (breaks the fence); with the guard the first character is dropped and nothing shows. With the R3 clamp the second keystroke works.
- Likelihood: medium for (a) and (b), low for (c) and (d).
- Prevent: R3 clamp heals after the first user transaction. Do not widen the clamp to programmatic selections (the Issue deliberately leaves them, and the click path keeps a hidden-range selection on purpose for a block-widget first line, `frontmatter-field.ts:82-85,93`). Add a test for "caret at 0, type x: doc unchanged, caret at bodyStart, next x applies".

### R5. Selection rebuild bugs (certain if unhandled, medium)
- `EditorSelection.create(ranges, mainIndex)` does not validate `mainIndex` (`state/dist/index.js:1463-1475`; EXECUTED `.main === undefined`). When removing ranges, recompute `mainIndex` from the kept ranges; with every range removed use `EditorSelection.single(bodyStart)`.
- `EditorSelection.range(a, h)` drops `goalColumn`/`assoc`/`bidiLevel`; after a clamp ArrowDown restarts from column 0. Acceptable; say so.
- Without `allowMultipleSelections` the collapse to `main` happens after the filter (`:2632`), so a bad `mainIndex` also crashes single-cursor editors.
- Likelihood: certain if the implementer copies the Issue text literally ("ranges with both ends below `bodyStart` are removed"); fix is small.

### R6. Cost and allocation on every keystroke (low)
- The filters run on every transaction including selection-only and programmatic ones. Return `true` before touching anything when `!tr.docChanged` (change filter) or when the userEvent does not match; never read `tr.state` / `tr.newDoc`; compute `bodyStart` lazily (it iterates the decoration set). An array result (even `[]`) forces a new Transaction object (`:2445-2455`).
- Likelihood: low; cost is small if gated.

### R7. Backspace on a blank first body line does nothing (likely UX complaint, medium)
- Scenario: the Issue's trigger flow: ArrowUp/Cmd+Up, Enter to make room at the top, then Backspace on that blank line. The break before it belongs to the hidden fence, so the edit is dropped. Delete (forward) works; Cmd+Z works.
- Likelihood: medium to high for someone who just made that blank line.
- Prevent: either accept and document (the Issue's e2e "ArrowUp then Backspace leaves the frontmatter hidden and intact" pins it), or in this exact case rewrite the drop into "delete the blank line forward". The owner's rule against new core write-path behavior for rare cases points to accepting; this case is not rare, so state the decision in the Issue.

### R8. Clamp reveals the first body line when it is a block widget (likely, low to medium)
- Scenario: note whose first body line is a table, code block, queryjs block or meta-bind button (the owner's daily use). Cmd+Up, ArrowUp, ArrowLeft at the body start, Shift+Up all put the caret on that line; live preview then reveals the block source. Today the caret goes to an invisible hidden line and the widget stays rendered.
- The Issue exempts only `select.pointer` for this reason. Keyboard has no exemption.
- Prevent: document it in the commit message; e2e one case with a first-line table or button if cheap. Not a data risk.

### R9. Cmd+A path and copy semantics (medium)
- Cmd+A and the menu Select All become body-only (owner decision). Two entry paths: the `Mod-a` keymap (`select`) and, INFERENCE, native `selectAll:` from the Edit menu (`src-tauri/src/lib.rs:226-233`) turned into `select` by `applyDOMChange` (`:4358-4366`). In the 50 ms after a pointer event the DOM path reports `select.pointer` and would bypass the clamp (rare: Cmd+A right after a click).
- Frontmatter-only notes (`bodyStart` null) keep Cmd+A as today.
- Prevent: test `select` and `select.search.matches` dispatches `[0, len]`; test `delete.selection`, `delete.cut`, `input.type` after select-all; mention in the commit that Cmd+A then Cmd+C no longer copies properties.

### R10. Search panel interplay (low)
- `findNext`/`findPrevious` (`select.search`) landing on a frontmatter match is clamped to a cursor at `bodyStart`; the match counter still counts hidden matches. `replaceNext` (`input.replace`) can set the NEXT-match selection inside the hidden range (`search/dist/index.js:943-952`); with the R3 clamp it lands on `bodyStart`, so repeated Replace skips hidden matches instead of "replacing" them as no-ops. Replace-all leaves hidden matches in place, so "N matches" never reaches 0 when the frontmatter also matches.
- Regex replace-all that matches zero-width at position 0 (`^`): a pure insertion at 0 would pass the range filter (3.1 `paste@0` row), so a replace-all transaction with an insertion at 0 must return `false`, which drops the whole replace-all (silent). Rare for this owner; document.

### R11. userEvents not covered (low)
- `indent` (`indentSelection`, `commands:1611`), programmatic dispatches with no userEvent, and `select.pointer` pass unfiltered by design. `input.complete` (autocomplete), `input.type.compose[.start]` (dead keys, IME) and `delete.cut` are covered by the `input`/`delete` prefixes. Table/callout/code-block widgets use `input.table.*` / `input.callout.*` / `input.codeblock.*` with changes at `>= bodyStart`, which pass because the check is `fromA < bodyStart` (a table as the FIRST body block starts exactly at `bodyStart`).

### R12. Filter ordering (low)
- Only `indentOnInput` coexists (`language:1188`); it runs after the guard and returns `tr` for markdown. Do not give the guard `Prec.high`. Two change filters would not see each other's output. `filter: false` on a spec bypasses the guard, which tests can use to build broken fixtures and future code could use to bypass it. Because the guard is in `BLOCK_EXTENSIONS.frontmatter`, the kill-switch and source mode remove filters and field together in the same reconfigure transaction (the filter runs on `startState`, which still has both).

### R13. `atomicRanges` is the wrong tool (informational)
- Only strict-interior positions are skipped (`view:3792-3806`); the closing-fence line end (`bodyStart - 1`) and `0` stay reachable, so ArrowLeft from the body start still lands at `bodyStart - 1` with a range `[0, bodyStart - 1]`. With `[0, bodyStart]` ArrowLeft from `bodyStart` jumps to 0 and `deleteBy` expands the Backspace target `bodyStart - 1` to `from = 0`, deleting the whole frontmatter (`commands:1209-1217`). Programmatic selection and `selectAll` ignore atomic ranges. Do not add it; the Issue already says so.

### R14. Test-harness fidelity gaps (medium)
- `createMarkdownState` and the click test `mount` lack `history()` and `allowMultipleSelections`: the Issue's undo test and the multi-range search test cannot be meaningful without adding them to the mount (production has both, `editor-extensions.ts:133,135`). Without `allowMultipleSelections` a two-range selection collapses to `main` after the filter, so a "keeps only the body range" assertion can pass for the wrong reason.
- jsdom has no layout and no DOM-change path coverage for typing/IME: `input.type` and `input.type.compose.start` have to be dispatched directly; ArrowUp, PageUp need e2e. Real dead-key composition at the first body line is covered by no automated test (see "Not verified").
- `invariants-harness.test.ts`: hidden-line `lineNo` steps become no-ops (insert and delete both suppressed) or clamped selections; the diff is limited to the target line (`:312-326`), so it likely stays green (INFERENCE). Run it first after the guard compiles.

### R15. DOM desync if a DOM-originated change is dropped (low, unverified)
- Only reachable when the caret is hidden (R4), since composition and typing in the first body line start at `bodyStart`. `flush` forces a redraw only when the state object is unchanged (`view:7532`); otherwise it relies on dirty tiles (INFERENCE). The R3 clamp makes this reachable at most once.

## 5. Policy table recommended for the Issue text

| Event | Condition | Result |
|---|---|---|
| any non-user, `undo`, `redo`, `indent`, `select.pointer` | any | untouched |
| `input.replace`, `input.replace.all` | a changed range starts below `bodyStart` | `[0, bodyStart]`, except `false` if any empty range sits at 0 |
| other `input*`, `delete*`, `move*` | a changed range has `fromA < bodyStart` | `false` (whole transaction) |
| same | all changes at or after `bodyStart` | `true` |
| `select*` except pointer, and every `input*`/`delete*`/`move*` | resulting selection has a range with `from < bodyStart` | rewrite the selection (drop ranges wholly below, clamp the rest, remap `mainIndex`, single cursor at `bodyStart` if none left), keep `changes`, `effects`, `annotations`, `scrollIntoView` |

Cost of the "false" default: `deleteLine` on the only body line, Ctrl-T at the body start and a replace-all with a zero-width match at 0 become no-ops. All three are visible, recoverable and rare; narrowing them would reintroduce R2.

## 6. Test cases the Issue must add (beyond its list)

All in `frontmatter-field-keyboard.test.ts` with `history()` and `EditorState.allowMultipleSelections.of(true)` added to the mount, real `livePreviewExtensions`, real commands, full-doc equality plus selection assertions.

1. Backspace at `bodyStart`: doc equals DOC AND `selection.main.head === bodyStart` (R3). Repeat five times from `FRONTMATTER + 'ab'`: doc `FRONTMATTER`, head stays `bodyStart`, then `insertText x`-style dispatch (`input.type`) at the caret applies.
2. Same head assertions for `deleteGroupBackward`, `deleteLineBoundaryBackward`, `deleteToLineStart`, `deleteCharBackward` with the caret at the body start.
3. `moveLineUp` with the caret on the first body line, and with a selection over the first two body lines: doc equals DOC, head at or after `bodyStart` (R1).
4. `transposeChars` at the first body line start: doc equals DOC (R2). Typed `input.type` replacing `[0, doc.length)` set by a programmatic selection: doc equals DOC.
5. `deleteLine` on the only body line (`FRONTMATTER + 'only'`): doc unchanged or body removed, but never fence damage and head `>= bodyStart` (pin the chosen behavior).
6. `moveLineDown` and `copyLineUp/Down` on the first body line, `indentMore` (Tab) and `indentLess` on it: frontmatter byte-identical, edits apply (changes start exactly at `bodyStart`).
7. Enter via the production Enter command (`insertNewlineContinueMarkup` from `@codemirror/lang-markdown`) at `bodyStart` with a first body line `- item`: frontmatter intact, new blank line above.
8. Programmatic caret inside the hidden range (no userEvent) at 0, then `input.type` `x` at 0: doc equals DOC; head moved to `bodyStart`; second `x` applies (R4). Same with the caret at `bodyStart - 1`.
9. Reconfigure sequence: source mode extensions off, caret inside YAML, switch to live preview (`editorModeEffects`), then type: first char dropped, caret healed (R4).
10. Multi-range selections (`select.search.matches`): main hidden + one body range; main body + one hidden range; both hidden; assert `ranges.length`, `mainIndex`, `selection.main` defined (R5).
11. `select` dispatch `[0, len]` equals `selectAll`; `select.undo`; `select.pointer` `[0, len]` untouched; a no-userEvent selection into the hidden range untouched (pins the exemptions).
12. Replace-all shapes: frontmatter + body match (body only), match only in frontmatter (doc unchanged), zero-width at 0 (whole transaction dropped, doc equals DOC); `input.replace` single (`replaceNext` shape) with selection set to a hidden match then clamped.
13. `move.drop` and `input.drop` at 0 (dropped), at `bodyStart` (applies).
14. Table, callout and code-block widget dispatches (`input.table.add-row`, `input.callout.set-type`, `input.codeblock.set-language`) when the widget is the FIRST body block: applied unchanged.
15. `input.type.compose.start` then `input.type.compose` at `bodyStart` (Portuguese accent shape: insert `´`, replace by `á`, then continue): all applied, history groups them.
16. Programmatic writers pass: no-userEvent frontmatter rewrite (meta-bind shape), `addToHistory:false` full-doc `docDiff` replace, `userEvent: 'undo'` / `'redo'` changes (via `undo(view)` / `redo(view)`), external insertion of a frontmatter block at 0 into a note whose caret is at 0.
17. Guard inert states: `bodyStart` null (frontmatter-only note, decorator disabled `{ frontmatter: true }`, no frontmatter); a doc whose only body line is empty (`bodyStart === doc.length`): Backspace there keeps head at `bodyStart`.
18. No-op identity: for a body-only `input.type` transaction the filters return `true` / the same transaction (spy on `Transaction.create` is not needed: assert doc, selection and `tr.annotations` equal a fixture state without the guard).
19. e2e (`frontmatter.spec.ts`): ArrowUp, `ControlOrMeta+Home`, ArrowLeft at the body start keep the caret on the first body line; ArrowUp then Backspace leaves frontmatter hidden and intact AND a following typed character lands in the first body line; Cmd+A then type replaces the body only; one case with a table as the first body line to pin R8.
20. Existing suites to run first: `invariants-harness.test.ts` (R14), `frontmatter-field.test.ts`, `frontmatter-field-click.test.ts`, `meta-bind-writers.test.ts`, `undo-history-across-notes.test.ts`, `decorator-toggles.test.ts`.

## 7. Not verified

- Nothing was run in a browser or WKWebView. Dead-key and IME composition at the first body line, the DOM resync after a dropped DOM-originated change (R15), whether Cmd+A reaches CodeMirror's keymap or the native Edit menu (R9), and `view.moveVertically` landing positions over `display:none` lines are INFERENCE from reading `view/dist/index.js`.
- The state-library results (section 3) were run against hand-built transaction specs that mirror what the commands emit (read from `commands/dist/index.js`), not against the real commands in a view. Section 3.3 is a validation sketch, not tested production code.
- I did not trace `Properties` panel, templates or Quick Capture write paths beyond confirming (rg over `src/lib`) that no other code sets a `userEvent`; `scout-s03-programmatic-writers.md` owns that angle.
