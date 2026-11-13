# Deep dive 002 synthesis: regression risk of the frontmatter keyboard guard

This is a read-only synthesis at HEAD `84fc88230` (2026-11-12).

- **Inputs:** Issue 002, `.scratch/open-itens/research/deep-dive-2026-11-12/` (dossier-002, refute-002, SUMMARY, critique) and every report in `.scratch/open-itens/research/deep-dive-002/` (scout-s01 to s10, validate-1 to 3).
- **Disputed points:** I re-read them in `node_modules/.pnpm/@codemirror+{state@6.7.6,commands@6.11.1,view@6.43.15,search@6.7.2}`.
- **What was run:** nothing by me. The only executed evidence is scout-s02 section 3, which ran throwaway `node -e` snippets against `@codemirror/state` alone.

Evidence labels: F = fact read in code, E = executed by s02, I = inference.

Short names: `state:` = `@codemirror/state/dist/index.js`, and `commands:`, `view:` and `search:` follow the same pattern. `LP/` = `src/lib/core/markdown-editor/extensions/live-preview/`. `B` = `bodyStart`, the start of the first line after the closing fence. `F1 = B - 1`, the end of the closing fence line.

## 1. Verdict

If Issue 002 ships as written, it will very likely add at least two new bugs the owner will see. Its own tests would pass with them present.

Root causes (all F or E):
- **Blocked Backspace moves the caret into the fence.** `filterTransaction` maps the explicit selection of a blocked transaction back through the inverse of the dropped change (`state:2445-2455`). For Backspace at `B`, `deleteBy` sends an explicit `cursor(F1)` (`commands:1175-1206`). The caret therefore lands at `F1`, on a `display:none` line. s02 executed this (3.1, 3.2): the caret went to 20, 19, 18 after each press. The Issue clamps only `select` transactions with no doc change, so nothing moves the caret back.
- **Range narrowing works change by change.** `ChangeSet.filter` with `[0, B]` filters each change separately (`state:892-922`). It applies half of `moveLine`, which writes a second `---` under the first body line (E). A replacement that starts below `B` loses its inserted text but keeps its body deletion (E). A pure insertion at 0 passes (E).
- **`deleteLine` touches the hidden range.** It always deletes the line break before the line when `from > 0` (`commands:1471-1491`, `if (from > 0) from--`). On the first body line that change is `[F1, line.to]`. s02 said this happens only on the last line; the code says every line after line 1.

Ranked by likelihood times harm for this owner (Portuguese dead keys, meta-bind, Properties, templates, tables, daily):

| # | New bug if 002 ships as written | Likelihood | Harm | Caught by 002's tests? |
|---|---|---|---|---|
| 1 | Backspace (also held Backspace, Alt+Backspace, Cmd+Backspace) at the start of the first body line parks the caret in the hidden fence. Every later keystroke is swallowed until a click or an arrow key, so the editor looks frozen. | High (the Issue's own headline trigger) | High | No: the criteria assert only `doc.toString()` |
| 2 | Backspace on a blank first body line stops working. This hits templates with a blank line after the properties, and the Issue's own Cmd+Up, Enter flow. Deleting `[F1, B]` there is harmless today because the fence line stays exactly `---`. | High | Low to medium | No |
| 3 | Cmd+Shift+K on the first body line leaves an empty line (narrowed) or does nothing (`false`) instead of deleting the line. | Low to medium | Low | No |
| 4 | Alt+ArrowUp on the first body line writes a second `---` under it, because narrowing applies half of `move.line`. The fix text and criterion 5 contradict each other. | Low to medium | Medium (new corruption, autosaved) | Yes, the test fails, but the text prescribes the bug |
| 5 | `invariants-harness.test.ts` very likely goes red: the keyboard clamp changes `endsAtLineStart` ranges on the hidden lines and on the first body line. The Issue says the suite stays green with no edits, which pushes the implementer to bend either the guard or the test. | High (I, not run) | Process | n/a |
| 6 | A replacement that straddles `B` deletes body text and drops the typed or pasted text. Paths: Ctrl-T at `B`, typing or pasting over a drag that reaches the top padding. | Low to medium | Medium (silent, undoable) | No |
| 7 | A caret placed in the hidden range without a userEvent turns typing into silent drops instead of hidden YAML edits. Paths: right-click in the top padding, the source to live preview toggle, the first property added on a note with the caret at 0, a legacy search jump. | Low to medium | Medium | Partly (paste at 0 only) |
| 8 | Find Previous gets stuck when the term also appears in the frontmatter (`status: todo`). It selects the hidden match, the clamp moves it to `B`, and the next press finds the same match. | Low to medium | Low | No |
| 9 | The clamp removes the main range and leaves a stale `mainIndex`. `EditorSelection.create` does not validate it (`state:1463-1475`; E: `.main === undefined`), so the next selection read throws on a keypress. Paths: Cmd+Alt+ArrowUp, select-all-matches. | Low | High | Partly |
| 10 | An implementer who rebuilds every transaction (always returning `[0, B]`, or a spec without `annotations`) breaks three things: undo grouping of accents (`commands:506-507`), wikilink and tag completion after an accent (`autocomplete:955-956`), and `indentOnInput`. | Low to medium (depends on the implementer) | Medium for this owner | No |
| 11 | `undo-history-across-notes.test.ts:595-604` becomes vacuous. Its `input.type` insert at 0 of a frontmatter-only note is dropped, and both asserts still pass. | Certain | Process | No |

These owner-visible changes are not bugs, but the Issue must state them:
- **Cmd+A paste:** with Cmd+A selecting the body only, Cmd+A then Cmd+V of a whole note puts the pasted `---` block in the body.
- **Block widgets:** Cmd+Up onto a first-line table, code block or meta-bind button reveals its source. Note open already does this (`editor.logic.ts:110-123`).
- **Vault mods:** a mod that dispatches a guarded userEvent into the frontmatter is narrowed or dropped with no error. The mods source is outside the repo and was not read.

Claims I checked and found refuted or moot:
- **Undo and redo never reach the filters.** `HistoryState.pop` dispatches with `filter: false` (`commands:540-556`).
- **Programmatic writers carry no userEvent.** `rg userEvent src/lib` finds only `widgets.ts:517,532`, `callout-field.ts:87`, `code-block-widget.ts:180`, the paste handlers and `MarkdownEditor.svelte:345,362`. All of them edit body ranges or the current selection.
- **Composition is not affected by a correct filter.** A synchronous filter that returns the original transaction does not touch composition (validate-1 and validate-3 refute s10 C1).

## 2. Design that minimizes regression risk

### 2.1 The key observation: input events need no change filter

Every keyboard input command acts on the selection, or at or after the start of the caret's line (I, from reading each command; s02 R11, s10 F4):
- Enter: `insertNewlineContinueMarkup` (lang-markdown, per validate-2). `insertNewlineAndIndent` only moves `from` back when `from > line.from`.
- Typing and dead-key composition: the DOM change is bounded by the line tile (`view:7536-7553`, `view:4480-4509`, s10 F4).
- Autocomplete, closeBrackets, Tab and toggle comment.
- copyLine, which inserts at `block.from`.

So once the selection clamp keeps every keyboard selection at or after `B`, no keyboard `input.*` edit can reach the hidden lines.

An `input.*` edit can still reach the hidden lines from a caret or selection the keyboard did not make:
- a programmatic caret (right-click, mode toggle, Properties insert at caret 0)
- a pointer drag into the top padding
- a search match selected in the YAML
- a menu paste after a right-click

All of these exist today, and none is a keyboard edit next to the frontmatter. Filtering `input.*` is what creates risks 6, 7, 10 and 11. It also puts the guard on the owner's typing and accent path, which is the change the owner fears most.

From a visible caret, the keyboard crosses the boundary only through deletions (`delete.*` at `B` deletes `F1`) and moves (`move.line`, `move.character`, `move.drop`). Those are the only change families to guard.

### 2.2 Mechanism

Add one exported extension, `frontmatterGuard`, in `LP/plugins/frontmatter-field.ts`. Register it in `BLOCK_EXTENSIONS.frontmatter` (`LP/live-preview.ts:47`), so the decorator kill switch and source mode remove it together with the field.

It is two pure filters: no StateField, no decoration, no effect, no `view` access, no dispatch, and no read of `tr.state` (s10 C7; facet docs at `state:2930-2968`). Both read `B` from `tr.startState` with the existing `bodyStart` helper (`frontmatter-field.ts:62-65`), and only after the cheap userEvent check.

**Change filter** (`EditorState.changeFilter`):

| Transaction | Result |
|---|---|
| no doc change, or userEvent not `delete*` / `move*` (`tr.isUserEvent`), or `B` is null | `true` |
| no change with `fromA < B` (strict: an edit at exactly `B` passes) | `true` |
| exactly one change has `fromA < B`, and it is a pure deletion from `F1` to a `toA` below `doc.length` whose character is a line break | `true`: the fence line stays exactly `---` and is still followed by a line break, so CodeMirror's own result is safe. This covers Backspace on a blank first body line and Cmd+Shift+K on the first body line |
| `move*` | `false`: all or nothing, never half of `move.line`, `move.character` or `move.drop` |
| `delete*` where a change with `fromA < B` inserts text | `false` |
| `delete*` where only pure deletions reach below `B` | `[0, B]`: a straddling deletion keeps its body part, and one wholly inside is suppressed |

**Selection clamp** (`EditorState.transactionFilter`) runs on:
- **`select` and its subtypes,** with two exceptions:
  - `select.pointer` is owned by `frontmatterClick`, which keeps the selection on purpose when the first body line is a block widget (`frontmatter-field.ts:82-85,93`).
  - Exactly `select.search` (Find Next and Find Previous) is not clamped. Compare the annotation with `===`, because `isUserEvent('select.search')` also matches `select.search.matches` (`state:2313-2316`).
- **`delete*` and `move*`,** after the change filter. Transaction filters receive the already-filtered transaction (`state:2456-2466`).

Clamp rules:
1. **Base selection.** For a `delete*` or `move*` transaction with no doc change, use `tr.startState.selection`, so a blocked key leaves the caret where it was (Alt+ArrowUp at column 5 stays at column 5). Such a transaction can only come from the filter emptying it: `deleteBy` and `moveLine` never dispatch an empty change (`commands:1200-1201,1423-1424`). Otherwise use `tr.newSelection`.
2. **Pass path.** If the base is `tr.newSelection` and no range has `from < B`, return `tr` itself. Every body keystroke and every selection next to a composition takes this path, so nothing is rebuilt.
3. **Rewrite.** Otherwise:
   - drop ranges with `to < B`;
   - turn the other ranges into `EditorSelection.range(max(anchor, B), max(head, B))`;
   - use `EditorSelection.single(B)` when no range remains;
   - set `mainIndex` to the new index of the old main range if it survived, else 0.

   Never call `EditorSelection.create` with an empty array or an out-of-range index.
4. **Return value.** Return `{ changes: tr.changes, selection, effects: tr.effects, annotations: tr.annotations, scrollIntoView: tr.scrollIntoView }`. A spec without `changes` drops the edit (`state:2403-2415`, E). Do not add a `userEvent:` key; it would append a second one (`state:2405-2406`).

`B` taken from `tr.startState` stays valid in the new doc. The filter lets no change below `B` through except the line-break exception. After that exception the first body line still starts at `B`, because the line break at `toA` takes the place of the deleted `[F1, toA]`. No `Math.min` against the new doc length is needed.

### 2.3 What to avoid, with evidence

- **`atomicRanges`:** Backspace at `B` would delete the whole frontmatter (`skipAtomic`, `commands:1209-1217`). The range boundaries stay reachable (`view:3792-3806`), and programmatic selection ignores atomic ranges (`view:8962-8970`).
- **Filtering `input.*`:** see 2.1. It adds risks 6, 7, 10 and 11 and gains nothing on the keyboard path.
- **Range narrowing for `move.*`:** it half-applies `move.line` (E).
- **`false` for every `delete*`:** Cmd+Shift+K and a straddling Cut on the first body line would become no-ops. validate-1 refutes s02 section 5 on this point.
- **A clamp limited to transactions with no doc change:** this is risk 1.
- **Clamping `select.search`:** risk 8.
- **Clamping `select.pointer`:** it reveals a first-line block widget. Drags that straddle `B` are a pre-existing mouse issue.
- **Clamping selection-only transactions with no userEvent** (validate-3 option b): it would break the simple invariant that programmatic transactions are never touched, for a rare state that already exists today. Out of scope.
- **A keymap that swallows Backspace and Alt+ArrowUp at `B`:** it misses menu Cut, emacs bindings and future bindings, and the jsdom tests could no longer call the commands directly. The `delete*` / `move*` filter is generic and still never sees typing.
- **`Prec.high` on the guard:** it would flip the order relative to `indentOnInput` (`editor-extensions.ts:136,146`; transaction filters run last-registered first, `state:2457-2459`). Not needed.

### 2.4 Undo, composition, performance

- **Undo:** undo and redo dispatch with `filter: false` (`commands:553`), so a frontmatter write by Properties or meta-bind is always restorable. History records the post-filter transaction, so a dropped or narrowed deletion never desyncs it (validate-2). `undoSelection` (`select.undo`) is clamped like any `select`, and keeps its `fromHistory` annotation through `annotations: tr.annotations`.
- **Composition:** `input.type.compose*` and every other `input.*` return `true` or `tr` at the first check, so no transaction on the typing path is rebuilt. s10 C2 and C4 are satisfied by construction.
- **Cost:** typing pays two annotation reads. Cursor moves and deletions pay for `bodyStart`, which walks about two decorations per frontmatter line (`frontmatter-field.ts:53-59`). Pointer drags exit at the userEvent check.

## 3. Concrete edits to Issue 002

### 3.1 Replace "Fix direction"

Replace everything from the paragraph starting "Fix direction:" through the paragraph starting "Do not make the whole range atomic" with:

> Fix direction: add one exported extension `frontmatterGuard` in plugins/frontmatter-field.ts and register it in `BLOCK_EXTENSIONS.frontmatter` at live-preview.ts:47 beside `frontmatterField`, `frontmatterGutter` and `frontmatterClick`. The decorator kill switch and source mode then remove it with the rest (live-preview.ts:90-92, 109-111). It is two pure filters with no state, decoration, effect, dispatch or `view` access, and neither reads `tr.state`. Both read `B = bodyStart(tr.startState)` (the existing helper, :62) only after checking the userEvent, and do nothing when `B` is null.
>
> 1. **Change filter** (`EditorState.changeFilter`), only for transactions with a doc change whose userEvent is `delete` or `move` (`tr.isUserEvent`, which matches subtypes such as `delete.backward`, `delete.cut`, `delete.line`, `move.line`, `move.character`, `move.drop`). `input.*` is not filtered: once item 2 keeps keyboard selections at or after `B`, no keyboard input command edits below `B`, and leaving `input.*` alone keeps typing, dead keys, paste, autocomplete and search replace exactly as today. Return `true` when no change has `fromA < B` (strict). Return `true` when the only change with `fromA < B` is a pure deletion from `B - 1` to a `toA` below the doc length whose character is a line break: the fence line stays `---` followed by a line break, so Backspace on a blank first body line and Cmd+Shift+K on the first body line keep their normal result. Otherwise return `false` for `move*` (narrowing would apply half of `moveLine` and write a second `---`) and for a `delete*` whose change below `B` inserts text, and `[0, B]` for the other `delete*` transactions, so a straddling deletion removes only its body part.
> 2. **Selection clamp** (`EditorState.transactionFilter`) for userEvent `select` and its subtypes, except `select.pointer` (owned by `frontmatterClick`, which keeps the selection when the first body line is a block widget, :82-85, :93) and except exactly `select.search` (compare the annotation with `===`; clamping Find Next and Previous makes Find Previous stick on a frontmatter match), and for every `delete*` and `move*` transaction after the change filter. Base selection: `tr.startState.selection` for a `delete*` or `move*` transaction that ends with no doc change (the filter blocked it, so the caret stays where it was), else `tr.newSelection`. CodeMirror maps a blocked change's explicit selection back through its inverse (`@codemirror/state` `filterTransaction`), so without this a blocked Backspace leaves the caret on the hidden closing fence and swallows the next keystrokes. If the base is `tr.newSelection` and no range has `from < B`, return `tr` itself. Otherwise drop ranges with `to < B`, raise the lower end of the others to `B` (a range ending at `B` becomes a cursor there), use one cursor at `B` if none remain, keep the old main range as main if it survived (else index 0; `EditorSelection.create` throws on an empty array and does not check `mainIndex`), and return `{ changes: tr.changes, selection, effects: tr.effects, annotations: tr.annotations, scrollIntoView: tr.scrollIntoView }` with no `userEvent` key. This covers Cmd+Up, Mod+Home, ArrowUp, ArrowLeft, PageUp, their shift-extends, select-all-matches, Cmd+Alt+ArrowUp, and Cmd+A and the menu Select All: in live preview they select the body only, so copy and cut leave out the hidden frontmatter (owner decision 2026-11-12; source mode is unchanged).
>
> Do not use `atomicRanges` (Backspace at the first body line would delete the whole frontmatter, `skipAtomic`), do not filter `input.*`, and do not add `Prec`. Undo and redo dispatch with `filter: false` (`@codemirror/commands` `HistoryState.pop`), so neither filter sees them and Cmd+Z still restores any edit. Programmatic writes carry no userEvent and pass untouched: the Properties panel and tab sync (`replaceDoc`, MarkdownEditor.svelte:189-194), meta-bind writers (`dispatchMetaBindUpdate`, widgets.ts), tab loads and setState. Update the stale "Keyboard moves (ArrowUp into the frontmatter) are not changed" line in the `frontmatterClick` doc comment (:86) and the same sentence in docs/LIVE-PREVIEW.md:36. The e2e at e2e/specs/live-preview/click-reveal/frontmatter.spec.ts:53-65 pins today's ArrowUp behavior (the cursor lands on the first hidden line). That test only recorded the current behavior (Issue 03 Notes); change it to expect the first body line, and say so in the commit.

### 3.2 Replace the "Risk" Note with

> - **Risk:** medium, reduced by scope. The change filter sees only `delete*` and `move*`; typing, composition, paste and every programmatic write never reach it. Every pass path returns `true` or the same `tr` object, never a rebuilt spec. Check the userEvent before calling `bodyStart`. Before patching, the new failing tests must reproduce the caret descent (s02 3.2) and the half-applied `move.line` (s02 3.1); the policy above comes from reading `@codemirror/state` 6.7.6 and s02's state-only experiments, not from a running editor.

### 3.3 Replace the "Out of scope" Note with

> - **Out of scope (pre-existing, not keyboard edits next to the frontmatter):** an edit typed at a caret that a non-keyboard path left in the hidden lines (a right-click in the top padding, the source to live preview toggle, the first property added to a note whose caret was at 0, a legacy search jump into a property, a Find match in the YAML) still edits the hidden YAML as today; Backspace and Delete there are blocked and move the caret to the body start. A pointer drag from the body into the top padding still selects from 0, so typing over it replaces the frontmatter as today. Search replace and replace-all still replace frontmatter matches. A note with no line after the closing fence keeps `bodyStart` null (frontmatter-field.ts:62-65) and the guard off, as the mouse path does (frontmatter-field-click.test.ts:150-155). Do not widen the fix for any of these.
> - **Accepted:** Ctrl-T at the first body line start does nothing. A multi-cursor deletion that reaches the hidden lines applies only its body part. ArrowUp and Cmd+Up land at column 0 of the first body line (goal column reset). A first body line that is a block widget (table, code, math, queryjs, meta-bind button) shows its source after Cmd+Up, ArrowUp or Cmd+A, as it already does when the note opens. A frontmatter-only note with a trailing newline (what the Properties writer emits) has `bodyStart === doc.length`: typing at the end works, Backspace there does nothing, Cmd+A selects nothing.
> - **Owner-visible changes (commit message):** Cmd+A and menu Select All select the body only, so Cmd+A, Cmd+C copies no properties, and Cmd+A, Cmd+V of text that has its own `---` block keeps the current properties and puts that block in the body. Alt+ArrowUp on the first body line does nothing. Backspace at the start of a non-empty first body line does nothing.
> - **Vault mods:** a mod dispatch with a `delete*` or `move*` userEvent that touches the hidden frontmatter is narrowed or dropped in live preview. `input*` and dispatches without a userEvent are untouched. The mods source is outside this repo; the owner checks it for such dispatches before launch.

### 3.4 Replace the acceptance list

Setup for all jsdom cases:
- **File:** src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field-keyboard.test.ts.
- **Mount helper:** copy `mount(doc, cursorLine, disabled)` from frontmatter-field-click.test.ts and add `history()` and `EditorState.allowMultipleSelections.of(true)` to it. Production has both (editor-extensions.ts:133,135). Without them `undo` returns false, and multi-range cases collapse to `main` for the wrong reason.
- **Extensions:** the real livePreviewExtensions and the real `@codemirror/commands`, with no store or logic mocks.
- **Constants:** `FRONTMATTER = '---\nstatus: todo\n---\n'`, `DOC = FRONTMATTER + 'First body line.\n\nEnd line.'`, `B = FRONTMATTER.length`.
- **Assertions:** every case asserts both the full doc and `view.state.selection`. Each case fails today unless it is marked as a guard.

The list:

> - [ ] Failing test first: with the caret at `B`, deleteCharBackward leaves DOC with `selection.main.head === B`, and a following `view.dispatch({ ...view.state.replaceSelection('x'), userEvent: 'input.type' })` gives `FRONTMATTER + 'xFirst body line.\n\nEnd line.'`. Same doc and head for deleteGroupBackward and deleteLineBoundaryBackward.
> - [ ] In `FRONTMATTER + 'ab'` with the caret at the end, after each of five deleteCharBackward calls the head is `>= B`; the doc ends exactly FRONTMATTER and a typed `x` gives `FRONTMATTER + 'x'`.
> - [ ] `FRONTMATTER + '\nText'`, caret at `B`, deleteCharBackward: doc `FRONTMATTER + 'Text'`, head `B` (blank first body line still deletes).
> - [ ] moveLineUp with the caret at `B` and at `B + 5`: doc equals DOC and the head stays at `B` and `B + 5`. moveLineDown on the first body line still moves it down. moveLineUp on 'End line.' still moves it (guard path for `move.line` in the body).
> - [ ] transposeChars at `B` leaves DOC. A `move.drop` dispatch `{ changes: [{ from: B + 2, to: B + 4 }, { from: 0, insert: 'rs' }], userEvent: 'move.drop' }` leaves DOC.
> - [ ] A `delete.line` dispatch shaped like deleteLine on the first body line (`{ from: B - 1, to: B + 16 }`; call deleteLine itself if jsdom's `moveVertically` allows it) gives `FRONTMATTER + '\nEnd line.'`, which is CodeMirror's normal result, with the head `>= B`.
> - [ ] With a selection `[B - 3, B + 5]` set without a userEvent, deleteCharBackward deletes only `First` (doc `FRONTMATTER + ' body line.\n\nEnd line.'`), head `B`.
> - [ ] With the caret set to 0 without a userEvent, deleteCharForward leaves DOC and the head ends at `B`.
> - [ ] cursorDocStart from mid-body puts the head at `B`; cursorDocStart then insertNewlineAndIndent gives exactly `FRONTMATTER + '\nFirst body line.\n\nEnd line.'`; cursorDocStart then deleteCharForward gives `FRONTMATTER + 'irst body line.\n\nEnd line.'`. selectDocStart from mid-body gives anchor mid-body, head `B`. cursorCharLeft at `B` keeps the head at `B`.
> - [ ] selectAll gives `[B, doc.length]`; a following deleteCharBackward leaves exactly FRONTMATTER. On `FRONTMATTER` alone (`B === doc.length`), selectAll gives one cursor at `B` and does not throw.
> - [ ] Multi-range: a `select.search.matches` dispatch with ranges (hidden, body) and main = body, and (hidden, body, body) with main = hidden (`mainIndex` last): no throw, `selection.main` is defined and every range is `>= B`. A `select` dispatch shaped like addCursorAbove on the first body line (body cursor plus a hidden cursor as main) does not throw and leaves one body cursor.
> - [ ] Exemptions pinned (guards, pass today): a `select.pointer` dispatch `{ anchor: B + 5, head: 0 }` and an exact `select.search` dispatch selecting `todo` in the frontmatter keep the dispatched selection unchanged; a `{ selection: { anchor: 5 } }` dispatch with no userEvent stays at 5.
> - [ ] Typing path untouched (guards): `input.type` inserts at `B` and mid-body apply; an `input.type.compose.start` insert of `´` at `B` then an `input.type.compose` replace of `[B, B + 1]` with `é` gives `FRONTMATTER + 'éFirst body line.\n\nEnd line.'` and one undo restores DOC; a probe `EditorState.transactionFilter` registered before the guard in the extension list (so it runs after it) sees `tr.selection === undefined` for an `input.type` dispatch that set no selection (no rebuilt spec). An `input.replace.all` dispatch that changes `todo` in both the frontmatter and the body applies both, as today.
> - [ ] Programmatic writes and undo (guards): a dispatch with no userEvent that rewrites the frontmatter (meta-bind and Properties shape) applies, and undo(view) restores the old frontmatter. Enter and typing mid-body work as before.
> - [ ] With the frontmatter decorator disabled (`mount(..., { frontmatter: true })`), Backspace at `B` merges into the fence as today.
> - [ ] e2e: change frontmatter.spec.ts:53-65 so ArrowUp from the first body line keeps the cursor on that line (`activeLineText` stays the first body line, no hidden line is `.cm-activeLine`, the frontmatter stays hidden). Add `ControlOrMeta+Home` with the same expectation (`Mod-Home` is bound on every platform; `Cmd-ArrowUp` only on macOS). Add ArrowUp, then Backspace, then type `x`: the frontmatter stays hidden and intact and `x` starts the first body line. Add Alt+ArrowUp on the first body line: the frontmatter stays hidden and the first body line is unchanged. ArrowUp and PageUp need layout, so they are covered only here. Record the changed expectation in the commit message.
> - [ ] Existing suites: run `invariants-harness.test.ts` before changing it. If it fails only in `endsAtLineStart` on the hidden lines or the first body line (expected: the clamp moves a keyboard range that ends at or inside the hidden frontmatter, so the line it compares against differs), apply the owner-approved edit and nothing else: `endsAtLineStart` returns early when the line before `lineNo` starts below `bodyStart` (`frontmatterEnd(view.state) + 1`), with the reason in a comment and the commit. Any other failure is a guard bug. frontmatter-field.test.ts, frontmatter-field-click.test.ts, meta-bind-writers.test.ts, meta-bind-input-redraw.test.ts and undo-history-across-notes.test.ts stay green with no edits.
> - [ ] Manual, real app (WKWebView; not automatable, Playwright runs Chromium): after Cmd+Up, dead-key accents (`´` + `a`, `~` + `a`, `^` + `o`) at column 0 of an empty and of a non-empty first body line; held Backspace at the first body line; Cmd+A, Cmd+C; a meta-bind button and a Properties edit with the caret on the first body line, then Cmd+Z.
> - [ ] Gate: `pnpm check`, `pnpm vitest run` and `bash scripts/e2e.sh e2e/specs/live-preview/click-reveal/frontmatter.spec.ts` pass.

### 3.5 Add to "Answered" before launch (owner)

> Owner, 2026-11-1x: (1) the guard filters only `delete*` and `move*` edits plus the selection clamp; typing at a caret that a non-keyboard path left in the hidden lines stays as today (out of scope). (2) Approved: the one-line `endsAtLineStart` early return in invariants-harness.test.ts, only if it fails as described. (3) Find Next and Previous are not clamped.

Without approval (2), a build agent cannot keep the harness green honestly: CLAUDE.md forbids weakening tests without approval.

### 3.6 Risk to test map

| Risk (section 1) | Test that fails if it happens |
|---|---|
| 1 caret parked, typing swallowed | Backspace-at-`B` head and next-`x` case; five-Backspace head case; e2e ArrowUp, Backspace, `x` |
| 2 blank first line Backspace | `FRONTMATTER + '\nText'` case |
| 3 Cmd+Shift+K | `delete.line` shape case |
| 4 second fence from Alt+ArrowUp | moveLineUp at `B` and `B + 5`; e2e Alt+ArrowUp |
| 5 harness | the harness criterion with its narrow approved edit |
| 6 straddling replace | transposeChars and `move.drop` cases; `input.*` stays out of the filter, pinned by the replace-all and compose cases |
| 7 programmatic caret swallows typing | not reachable for `input.*` (unfiltered); Delete at a programmatic caret is covered by the caret-0 deleteCharForward case |
| 8 Find Previous stuck | exact `select.search` exemption case |
| 9 `mainIndex` throw | multi-range and addCursorAbove-shape cases |
| 10 rebuilt transactions, lost userEvent | probe `tr.selection === undefined` case; compose pair plus single undo |
| 11 vacuous undo-history test | no longer applies (its `input.type` insert is unfiltered); the suite stays unedited |
| programmatic writers, undo | no-userEvent frontmatter rewrite plus undo case |
| kill switch | decorator-disabled case |

## 4. Is the remaining risk acceptable, and which variant

| Variant | Fixes the Issue's triggers | New-bug surface | Verdict |
|---|---|---|---|
| A. Issue as written | Yes, but with risks 1 to 11 | Every user `input`, `delete`, `move` and `select` transaction, typing included | Reject |
| A'. Issue repaired per validate-1/2/3 (filter `input` too, with special cases for replace and insert-at-0) | Yes, plus some pre-existing mouse and programmatic paths | Typing and composition run through the filter; more policy branches; two existing tests need edits | Workable, but more risk than needed |
| **B. Recommended: `delete*` / `move*` change filter plus selection clamp (section 2)** | All four: Cmd+Up or ArrowUp then Enter (clamp), Backspace and held Backspace (filter plus clamp), Alt+ArrowUp (filter), Cmd+A then type or delete (clamp) | Deletions, moves and cursor motion only. Typing, accents, paste, completion, replace and programmatic writes are structurally untouched. At most one harness edit | Accept |
| C. Selection clamp only | Cmd+Up, ArrowUp, Cmd+A; not Backspace at the first body line, not Alt+ArrowUp | Smallest, but leaves held Backspace, the Issue's most likely trigger | Too little |
| D. Cmd+A only | Only the select-all path | Trivial | Too little |

**Recommendation: B.** It covers every trigger the Issue names: Cmd+Up or ArrowUp then Enter, and held Backspace (from the Trigger note), plus Alt+ArrowUp (from What to build). The only code on the owner's typing path is two annotation reads that return at once.

Residual risks are all visible and recoverable:
- a blocked key in rare multi-cursor or straddle cases
- a reset goal column after ArrowUp
- a revealed first-line block widget
- the documented pre-existing non-keyboard paths

Residual unknowns:
- WKWebView behavior for dead keys right after a clamp, and for native Select All (covered by the manual checks above)
- the harness outcome (run it first)
- vault mods that dispatch `delete` or `move` userEvents (outside the repo)

Size stays S to M. Status can stay ready-for-agent once 3.1 to 3.5 are applied and the owner records 3.5.

## Disagreements resolved

- **Change policy.** validate-1 narrows pure deletions and returns `false` for inserts. validate-2 returns `false` for everything but replace, plus a blank-line exception. validate-3 narrows `delete*` and replace-all. Resolved by taking `input*` out of the filter (2.1). For `delete*`: narrowing, plus the exception for a deletion from `F1` to a line break. That exception keeps CodeMirror's exact result for the blank-line Backspace (validate-2) and for deleteLine (`commands:1471-1491`, a case all three validators missed in this form).
- **Caret after a blocked key.** The validators clamp `tr.newSelection`, which sends the caret to column 0. This synthesis keeps `tr.startState.selection` for a blocked `delete*` or `move*`, because a blocked key should not move the caret. validate-2's moveLineUp `B + 5` criterion needs this.
- **`select.search`.** validate-2 exempts it; the Issue clamps it. Exempt exactly `select.search` (risk 8) and keep clamping `select.search.matches`.
- **Pointer straddle clamp (validate-3) and the no-userEvent selection clamp (validate-3 option b).** Both are out of scope: they fix pre-existing mouse and programmatic paths.
- **Harness edit.** Use an early return (validate-1, validate-2), not switching the step to `select.pointer` (validate-3), so the step does not depend on the guard's pointer exemption.
- **`undo-history-across-notes.test.ts` edit** (all three validators). Not needed under B.
- **s10 C1 (composition pass-through rule).** Moot under B. s10 C2 and C4 are satisfied by returning `tr` on every pass path.

## Not verified

- I ran nothing. The caret positions and doc results in section 1 rest on s02's state-only experiments and on reading the library. The harness failure is inference.
- WKWebView behavior needs the manual checks: dead keys at the first body line after a clamp, which userEvent native Select All produces, and where the DOM caret goes on `display:none` lines.
- I did not check whether jsdom can run deleteLine, addCursorAbove and the `search` commands directly. The criteria give the dispatch shape as a fallback.
- The vault mods source (`~/kokobrain-vaults/kokobrain-mods-src`) was not searched.

Relevant files:
- `/Users/diegorv/Dev/pet-projects/koko/brain/.scratch/open-itens/issues/002-keyboard-edits-next-hidden-frontmatter-never-change.md`
- `/Users/diegorv/Dev/pet-projects/koko/brain/src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts`
- `/Users/diegorv/Dev/pet-projects/koko/brain/src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts`
- `/Users/diegorv/Dev/pet-projects/koko/brain/src/tests/lib/core/markdown-editor/extensions/live-preview/invariants-harness.test.ts`
- `/Users/diegorv/Dev/pet-projects/koko/brain/.scratch/open-itens/research/deep-dive-002/` (scout and validate reports)
