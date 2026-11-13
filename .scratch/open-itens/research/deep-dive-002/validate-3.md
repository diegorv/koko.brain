# Validate 3: scouts s08 (tests), s09 (performance), s10 (composition) for Issue 002

Adversarial pass over `scout-s08-tests-inventory.md`, `scout-s09-performance.md` and `scout-s10-composition-ime.md`. I treated every claim as wrong until the code or the library source showed it was right. Read-only. Nothing was run (no vitest, no e2e, no app). Library paths: `state` = `node_modules/.pnpm/@codemirror+state@6.7.6/node_modules/@codemirror/state/dist/index.js`, `commands` = `...@codemirror+commands@6.11.1/.../commands/dist/index.js`, `view` = `...@codemirror+view@6.43.15/.../view/dist/index.js`, `lang-md` = `...@codemirror+lang-markdown@6.5.2/.../lang-markdown/dist/index.js`. "Fact" means I read it in the code. "Inference" means it follows from what I read but nobody ran it.

Notation: `b` = `bodyStart` (start of the first line after the closing fence), and the hidden range is `[0, b)`.

## Verdict in one screen

| # | Risk | Source | Real at HEAD? | Likelihood for owner | 002 covers it? |
|---|---|---|---|---|---|
| V1 | A suppressed Backspace or Delete moves the caret into the hidden fence, and every later keystroke is swallowed | s09 R1, s10 C3 | Confirmed by trace | High | No. The Issue's doc-only tests pass with the bug present |
| V2 | Narrowing `move.line` adds a stray `---` (fix text contradicts criterion 5) | s08 R1 | Confirmed by trace | Low-medium | Partly: the test catches it, but the text prescribes the bug |
| V3 | Narrowing a replacement that straddles `b` deletes body text and drops the typed or pasted text | s08 R2, s10 C5, new | Confirmed by trace | Low-medium (drag-select upward) | No |
| V4 | `invariants-harness.test.ts` goes red on the edge doc, contrary to "no edits" | s08 R6 | Confirmed by reading (not run) | Certain if V1-V3 are fixed as written | No |
| V5 | An `undo-history-across-notes.test.ts` case becomes vacuous | new | Confirmed by reading | Certain | No |
| V6 | A programmatic caret in the hidden range swallows typing with no feedback | s08 R5, s09 R2, s10 C3 | Confirmed | Low-medium (search jumps, right-click) | Partly: paste at 0 only |
| V7 | Backspace on a blank first body line becomes a no-op | s08 R4 | Confirmed | Medium (typical template layout) | No |
| V8 | Removing ranges can leave an invalid `mainIndex` or an empty array, and the filter throws | new | Confirmed by reading | Low | Partly: "if no range remains" only |
| V9 | Mods that edit frontmatter with a userEvent are silently blocked | new | Confirmed API surface, owner mods not checked | Unknown | No |
| V10 | Cmd+Up onto a first-line table, code or math block reveals its source | s08 R9 | Confirmed | Low | No (dossier accepts it, the Issue says nothing) |
| V11 | Test-harness traps: no `history()`, doc-only asserts, criterion 4 | s08, s09 R3 | Confirmed | Certain | No |
| V12 | An unconditional `[0, b]` range rebuilds every keystroke's transaction | s09 R5/Fact 7, s10 C2b | Confirmed, cost only | Certain, harmless | No |
| V13 | Smaller items: goal column lost, `deleteLine` leaves a blank line, regex replace-all with `^` dropped whole, Cmd+A paste-over | s08 R3, R8, R10, R11 | Confirmed | Low | No |

Refuted or unnecessary: s10 C1 (compose pass-through), s10 C2a (annotations lost: the Issue already requires them), s10 C6 (off-by-one under the Issue's semantics), s10 C7, s09 R4 and R5, s09 tests 9 and 14, s08 R14 (mostly), and s08 T22 (unverified). Details below.

## Confirmed risks

### V1. A suppressed delete parks the caret inside the hidden fence (highest value)

- **Scenario.** The caret is at `b`. This is the normal landing when a note opens (`MarkdownEditor.svelte:407,495` with `getPositionAfterFrontmatter`, `editor.logic.ts:110-123`), and also where the new Cmd+Up clamp leaves it. The owner presses Backspace, or holds it, which is the Issue's own trigger. `deleteBy` emits the change `[b-1, b]` with an explicit `selection: cursor(b-1)` (`commands:1175-1199`). The change filter suppresses the change. `filterTransaction` then builds the new transaction with `tr.selection.map(back)`, where `back` is the inverse of the suppressed deletion (`state:2443-2454`). `EditorSelection.map` and `SelectionRange.map` use `assoc = -1` for a cursor (`state:1321-1324,1390-1393`), and `mapPos` with `assoc < 0` at a zero-length insertion returns the position before it (`state:744-751`). Result: the caret lands at `b-1`, the end of the hidden closing fence. Each further Backspace walks it one more character back into the YAML.
- **What breaks.** The next typed character is an insertion strictly inside `[0, b]`, which `ChangeSet.filter` drops (`state:908-918`, traced). Enter, typing and paste all appear dead, the caret is on a `display:none` line, and only a click or an arrow key recovers. The document is intact, so nothing is lost on disk, but it reads as a frozen editor on the most common path. A dead key there hits s10 C1's DOM desync as well.
- **Evidence it is real.** The same thing happens with `false`: `back = tr.changes.invertedDesc` (`state:2445-2447`). The Issue's clamp handles only transactions with no doc change and a `select` userEvent, so nothing repairs this one.
- **Severity.** High. It hits every note with frontmatter and comes from a reflex keystroke.
- **002 coverage.** None. Criteria 2 and 3 check only `doc.toString()`, so they pass with this bug present (s09 R3 is right).
- **Fix.** After the change filter runs, the transaction filter clamps the resulting selection of every `input`, `delete` and `move` transaction, not only of `select` transactions. Transaction filters run after change filters and receive the rebuilt transaction (`state:2456-2466`). The hidden prefix is unchanged after filtering, so `b` is still valid in the new document.

### V2. Narrowing `move.line` corrupts the body

- **Fact.** For Alt+ArrowUp on the first body line, `moveLine` emits a delete `[fence.from, b]` and an insert of `"\n---"` at the end of the body line (`commands:1403-1430`). With `[0, b]`, the delete is fully inside the suppressed range and the insert at `block.to > b` passes. The doc becomes `---\nstatus: todo\n---\nFirst body line.\n---\n...`, and the body line turns into a setext H2.
- **Severity.** Medium as written. Criterion 5 would catch it, but the fix text (item 2: narrow every `move`) prescribes the bug, so the implementer has to deviate from the Issue to pass its own test.
- **002 coverage.** Contradictory. The text must change.

### V3. A straddling replacement deletes body text and loses the insert

- **Fact.** In `ChangeSet.filter`, a replacement that starts inside the suppressed range and ends past it loses its insert there (`iter.off == 0 ? iter.ins : 0`, `state:902-905`). The tail outside the range keeps its deletion with `ins = 0` (`state:899-900`). I traced `transposeChars` at `b` (`[b-1, b+1] -> "F\n"`, `commands:1368-1383`, `move.character`): the first body character is deleted and nothing is inserted.
- **Missed case, more likely.** A pointer selection can still straddle `b`. `frontmatterClick` acts only when the press itself maps into the padding (`frontmatter-field.ts:88-93`), so a drag that starts in the body and moves up into the top padding gets head 0. `posAtCoords` maps the padding to 0, per the comment at `frontmatter-field.ts:79-81`; that it does so mid-drag in WKWebView is inference. Under the Issue's narrowing, typing a letter over that selection deletes the selected body text and the letter vanishes. Menu Paste and native paste (`input.paste`, `view:4985`, `MarkdownEditor.svelte:357-364`) delete the body text and lose the pasted text. Copy and Cut put the hidden frontmatter on the clipboard, which contradicts the owner's Cmd+A decision.
- **Severity.** Low-medium. The edit is visible and Cmd+Z restores it, but typed or pasted content disappears.
- **002 coverage.** No.
- **Fix.** Two parts. (a) Narrow only `delete.*` and `input.replace.all`, and return `false` for every other `input` or `move` change with `fromA < b`. (b) Clamp non-empty `select.pointer` ranges that straddle `b` (raise the lower end to `b`). The clamped range touches the same body lines as the unclamped one, so it reveals nothing new. Pointer cursors and ranges wholly in the hidden range stay with `frontmatterClick`, which keeps the block-widget exception (`:82-85,93`).

### V4. The invariants harness goes red on the edge document

- **Facts.** The edge doc `bullet list right under frontmatter` (`fixtures/edge-corpus.md:84-93`) has the frontmatter on lines 1-4 and `- one` on line 5. `boundaryLines` takes top-level node boundaries, so line 5 is included (`invariants-harness.test.ts:277-287`; 6 boundaries, under `MAX_BOUNDARIES = 10`). For line 5, `endsAtLineStart` dispatches `[line4.from, line5.from]` with `userEvent: 'select'` (`:312-322`). Under the Issue's clamp this is a straddling range, so it becomes a cursor at `b`, which is line 5. `listMarkHandler` then reveals the raw `-` (`simple-widget-handlers.ts:57-64`, `isRevealed(line.from, line.to)`). The comparison state ends on line 4 (`:318`) and keeps the bullet widget, so `diffAgainstFresh` reports `missing` on line 5. `19-meta-bind.md` is not affected, because its first body line (7) is blank and is not a boundary.
- **Severity.** Process risk: a red suite that CLAUDE.md forbids weakening without approval, while the Issue says "stays green with no edits".
- **Fix.** The Issue must state the edit and that it needs owner approval: in `endsAtLineStart`, dispatch with `userEvent: 'select.pointer'`. A drag can still produce that range, so the step keeps testing reveal logic. Alternatively, skip lines whose previous line starts below `b`. The other harness steps on hidden lines become no-ops and still pass, but they no longer test anything there.

### V5. An undo-history case becomes vacuous (missed by all scouts)

- **Fact.** `undo-history-across-notes.test.ts:593-605` opens the frontmatter-only note `FM_ONLY` (`'---\ntitle: x\ntags: a\n---\n'` after LF normalization) in a live-preview editor. Live preview is on in this suite (`:466`). The test then dispatches `{ changes: { from: 0, insert: 'X' }, userEvent: 'input.type' }`. Here `b === doc.length`, so the guard is on (`frontmatter-field.ts:62-65`), and the Issue's "insert at 0 returns false" drops the edit. The assertions (`not.toContain('Line one of B')`, B unchanged) still pass, but no doc change happens, so the test no longer exercises the write-to-the-wrong-tab bug it pins.
- **Fix.** Change that dispatch to `from: doc().length` (or `view().state.doc.length`), which keeps an edit on the path, and assert `tabContent(F)` ends with `X`. This restores the test's intent and needs approval because it edits an existing test. The suite's other insert-at-0 cases (`:114,395,424,564`) use docs without frontmatter and are unaffected.

### V6. A programmatic caret in the hidden range turns typing into silent loss

- **Facts.** These selection changes carry no userEvent, so the Issue never clamps them:
  - a right-click in the top padding (`MarkdownEditor.svelte:307-308`)
  - `pendingScrollPosition` (`:599-609`), fed by search results by line or offset (`SearchResult.svelte:112,119,126`), by `scrollToAnchor` (`app/editor-host.ts:46`), by the TOC, by Tasks, and by mods (`mod-app.service.ts:32`)
  - `replaceDoc` (`:189-194`), which dispatches changes with no selection, so a caret at 0 stays at 0 (assoc -1) when the Properties panel creates frontmatter in an empty note (inference, not traced end to end)
- **What breaks.** The next keystroke is an insert at or inside `[0, b]`, and it is dropped. With the V1 fix, the first keystroke is lost and the caret jumps to `b`. Without it, every keystroke is lost.
- **Severity.** Low-medium. Search hits on property values are plausible. Today the same keystrokes corrupt the hidden YAML, so this is a swap of a visible bug for a silent one, not a new failure class.
- **Fix options.** (a) Accept one lost keystroke (falls out of the V1 clamp). (b) Recommended: also clamp selection-only transactions with no userEvent (`!tr.docChanged && tr.selection && !userEvent`). They carry no content, so the Issue's "programmatic writes pass unchanged" still holds for every doc change. `rg "dispatch\("` over `src/lib` found no feature that means to put a caret in the frontmatter. Cost of (b): the harness's own cursor placement on hidden lines (`invariants-harness.test.ts:419`) lands at `b`. I traced the steps: they still pass, but they test less. This is an owner decision.

### V7. Backspace on a blank first body line stops working

- **Fact.** In the typical layout `---\n...\n---\n\n# Title` (`editor-extensions.test.ts:356-376`), Backspace at `b` deletes the break after the fence. The result `---\n# Title` is safe today. The guard suppresses it, and with V1 unfixed it also walks the caret into the YAML.
- **Severity.** Low (no data at risk) but common. The owner will notice that the blank line under the properties cannot be Backspaced away (Delete still works).
- **Fix.** Record it as an accepted owner-visible change with a test, and say it in the commit. Allowing the deletion only when the first body line is empty and `b < doc.length` is possible, but it is extra logic for a cosmetic case. Ask the owner, and by default accept.

### V8. Rebuilding the selection can throw

- **Fact.** `EditorSelection.create([])` throws `RangeError` (`state:1463-1465`), and `create` never checks `mainIndex` against the new length (`state:1466-1472`). The view then reads `selection.main` as `undefined`. A throw inside a filter aborts the user's command. `selectSelectionMatches` (`select.search.matches`) and multi-cursor (`editor-extensions.ts:135,147`) can remove the main range.
- **Severity.** Low likelihood, high cost (an exception on a key press).
- **002 coverage.** "If no range remains, one cursor sits at `b`" covers the empty case only.

### V9. Vault mods that write the frontmatter with a userEvent (missed)

- **Facts.** The mod API gives mods the live `editorView` (`mod-app.service.ts:27`), and the documented spec type invites `userEvent?: string; // e.g. 'input', groups undo steps` (`help/documentation/mods/09-raw-app.md:151-156`). The docs say positions include the frontmatter (`:159`) and that editor dispatches may change the frontmatter (`04-vault-files.md:355`, `09-raw-app.md:123`). After 002, a mod dispatch with an `input`, `delete` or `move` userEvent that touches `[0, b)` is narrowed or dropped with no error. `editNote` and `updateNoteFrontmatter` carry no userEvent (grep finds no `userEvent` in `04-vault-files.md` or `14-cookbook.md`), so they still pass.
- **Not verified.** The owner's 12 mods live outside this repo (`~/kokobrain-vaults/kokobrain-mods-src`). I did not search there (the scope rule).
- **Fix.** Before the build step, the owner checks that tree for `userEvent`, or allows the agent to. Update `09-raw-app.md` to say that in live preview a dispatch with a user event cannot change the hidden frontmatter, and that frontmatter writes should go through `updateNoteFrontmatter` or a dispatch without `userEvent`.

### V10. Cmd+Up onto a first-line block widget reveals its source

- **Fact.** The keyboard clamp has no block-widget exception, while `frontmatterClick` has one (`frontmatter-field.ts:93`). Today Cmd+Up leaves the caret on a hidden line and the table stays rendered. After 002 the caret sits at `b` and the table's source shows. `dossier-002.md:52` accepted this, but the Issue text does not say so.
- **Severity.** Low (cosmetic; tables are daily, a table as the very first body line is less common).
- **Fix.** State it as accepted and pin it with one `it.each` over code, table and math, in the same shape as `frontmatter-field-click.test.ts:128-140`.

### V11. Test-harness traps in the Issue's own criteria

- The `mount` helper the Issue says to copy has no `history()` (`frontmatter-field-click.test.ts:29-37`). `undo` returns false without the history field, so the undo guard criterion cannot pass as written. Add `history()` to the helper.
- Criterion 4 checks only the three frontmatter lines. With the clamp, `deleteCharForward` after `cursorDocStart` deletes `F` of the body. Pin the full doc.
- Criteria 2 and 3 are doc-only and pass with V1 present (s09 R3). Add selection and next-keystroke assertions.
- `meta-bind-writers.test.ts` never installs live preview (`:40-44`), so "stays green" proves nothing for the guard (s08 is right). The real guard coverage for programmatic writes is `meta-bind-input-redraw.test.ts` and `undo-history-across-notes.test.ts:179-195`.

### V12. An unconditional range return rebuilds every transaction

- **Fact.** Any array result takes the rebuild path (`state:2443-2454`). Annotations are kept (`tr.annotations` is passed through), so history joining (`commands:500-507`), completion and `indentOnInput` still see `userEvent`. The selection maps through an empty `back`. This is semantically a no-op with a small per-keystroke allocation, including on composition steps.
- **Fix.** Add a fast path: return `true` unless some changed range has `fromA < b` (strict `<`, via `tr.changes.iterChangedRanges`). This also makes the composition at `b` case structurally untouched.

### V13. Smaller confirmed items (accept and document)

- `deleteLine` (Cmd+Shift+K) on the first body line deletes `[b-1, line.to]` (`commands:1471-1490`). Narrowed, it leaves an empty line, which is harmless. Pin it.
- Goal column is lost after a clamp, so ArrowDown after a clamped ArrowUp starts from the clamped column. Cosmetic. `EditorSelection.cursor(pos, assoc, bidiLevel, goalColumn)` keeps it if wanted (`state:1478`).
- A regex replace-all whose matches include an empty match at 0 (`^`) is dropped whole under the Issue's insert-at-0 rule. Rare. Accept.
- Cmd+A then paste no longer replaces the frontmatter: the paste lands in the body, and pasted frontmatter becomes body text. The Cmd+A decision covers copy, not this. Say it in the commit.

## Refuted, or already covered

- **s10 C1 (pass compositions through unchanged).** Not needed, and it works against the goal. For a caret in the first body line, a DOM-originated change starts at `>= b`. `readMutation` bounds a line mutation by its tile (`view:7536-7548`). When a root `childList` bound starts at `posAfter(fence line) = b-1` (`view:1832-1834`, the scout missed this), `findDiff` trims the common prefix and uses `preferredPos = sel.from - from` to resolve an ambiguous insert (`view:4293-4310`), so `from` still lands at the caret. The failure path needs the caret in the hidden range, and V1 and V6 remove that. A compose-specific bypass would re-open fence corruption. Keep one composition test (below). The WKWebView side was not checked.
- **s10 C2a (a spec drops `userEvent`).** The Issue already says the spec carries "effects, annotations and scrollIntoView". Add only: do not also pass `userEvent:` (`state:2405-2406` would append a second one).
- **s10 C6 (off-by-one).** Under the Issue's `ChangeSet.filter` semantics, an insert at `b` and a replace `[b, b+1]` both pass (I traced `state:893-912`). It only matters for the new fast path, which V12 pins to a strict `<`.
- **s10 C4 and C7.** C4 is structural: return `tr` unless a range is below `b`. C7 is pre-existing and does not apply as long as the guard has no state, effects or dispatch.
- **s09 R4 (re-deriving the range) and R5 (`undefined` return).** R4 is covered: the Issue already says to read `frontmatterEnd`/`bodyStart` from `tr.startState`. For R5, `undefined` does not type-check against `TransactionSpec | readonly TransactionSpec[]` under strict null checks. The body-typing guard criterion catches `{}`.
- **s09 tests 9 (profiling seam) and 14 (timing).** Unnecessary complexity. The guard is O(frontmatter lines) on a startState field (`frontmatter-field.ts:53-59`). Repo policy reports latency and does not gate on it.
- **s08 R14 (gate misses programmatic writes).** Mostly refuted. Meta-bind and Properties writes carry no userEvent (`widgets.ts:899-924`, `MarkdownEditor.svelte:189-194`). Undo and redo use `filter: false` (`commands:546-555`), so no filter ever sees them, which the library guarantees. Table, callout and code-block writers that carry a userEvent edit body ranges only (`widgets.ts:501-533`, `callout-field.ts:84-88`, `code-block-widget.ts:170-181`). Templates and Quick Capture do not dispatch into the editor (no `dispatch(` under `src/lib/plugins/quick-capture`, `templates` or `core/note-creator`). The jsdom guard criterion is enough, and an extra e2e is optional.
- **s08 T22 (ArrowUp in jsdom).** `arrow-reveal.test.ts:55-68` runs `cursorLineUp` with Range stubs, but not over `display:none` lines. Unverified, so keep ArrowUp and PageUp in e2e.
- **s09 Fact 10 and s10 F5 (filter order).** Confirmed, not a risk: filters run last-registered first (`state:2457-2459`), so the guard (`editor-extensions.ts:146`) runs before `indentOnInput` (`:136`).

## Text Issue 002 needs

Replace fix-direction item 2 with:

> 2. **Change policy** (`EditorState.changeFilter`): return `true` unless the userEvent is `input`, `delete` or `move` (`tr.isUserEvent`) and some changed range has `fromA < bodyStart` (strict, via `tr.changes.iterChangedRanges`). For such a transaction: when the userEvent is `delete` (any subtype) or `input.replace.all` and it holds no pure insertion at 0, return `[0, bodyStart]`. Otherwise return `false`, which covers every other `input`, every `move` and any pure insertion at 0. Narrowing anything else corrupts the body. `ChangeSet.filter` keeps the body half of a replacement that straddles `bodyStart` and drops its insert: `moveLineUp` on the first body line would keep its `\n---` insert without the matching delete, typing or pasting over a straddling selection would delete body text and lose the input, and `transposeChars` would lose a character. An insertion at exactly `bodyStart` and any change starting at or after it return `true` untouched.

Add to fix-direction item 1:

> The same transaction filter also runs on `input`, `delete` and `move` transactions, after the change filter: if any range of `tr.selection` (the selection after filtering) is below `bodyStart`, clamp it with the same rules and return `{ changes: tr.changes, selection, effects: tr.effects, annotations: tr.annotations, scrollIntoView: tr.scrollIntoView }`, with no `userEvent` key. CodeMirror maps the selection of a suppressed change back through its inverse with assoc -1 (`@codemirror/state` `filterTransaction`), so without this step a suppressed Backspace at the body start leaves the caret at the end of the hidden closing fence and every later keystroke is suppressed. Non-empty `select.pointer` ranges that straddle `bodyStart` get their lower end clamped too (a drag from the body up into the top padding); pointer cursors and pointer ranges wholly inside the hidden range stay with `frontmatterClick`. When ranges are removed, keep `mainIndex` pointing at a remaining range and never pass an empty array to `EditorSelection.create` (it throws). On every path that changes nothing, return `tr` itself.

Constraints to add under Risk:

> The guard is two pure filters: no StateField, decoration, effect, `view` access or dispatch, and no read of `tr.state`. Read `frontmatterEnd(tr.startState)` only after the cheap exits (no selection and no doc change, or a userEvent not listed). It does not special-case composition events: compositions at or after `bodyStart` take the fast path.

Owner decisions to record in Answered (ask before launch):

> (1) Backspace on a blank first body line does nothing in live preview (Delete still removes the line). Accept, or allow it. (2) Selection-only transactions with no userEvent (search jumps, right-click in the top padding) are also clamped to the body. Recommended; otherwise the first keystroke after such a jump is lost. (3) Cmd+Up onto a first-line table, code or math block reveals its source. Accept. (4) The test edits in V4 and V5 are approved.

Replace the "existing suites stay green with no edits" criterion with:

> - [ ] `frontmatter-field.test.ts`, `frontmatter-field-click.test.ts`, `meta-bind-input-redraw.test.ts` and `meta-bind-writers.test.ts` stay green with no edits. In `invariants-harness.test.ts`, `endsAtLineStart` dispatches with `userEvent: 'select.pointer'` (the edge doc `bullet list right under frontmatter` otherwise fails at L5 because the keyboard clamp now moves that range onto line 5); owner approval recorded in the commit. In `undo-history-across-notes.test.ts:593-605`, the edit goes at the doc end instead of 0 (the guard drops an insert at 0, which made the test vacuous), and the test asserts the tab content ends with `X`.

New jsdom criteria (same file, with `history()` added to the mount helper):

> - [ ] After `deleteCharBackward` at `BODY_START`: doc equals DOC, `selection.main.head === BODY_START`, and a following `view.dispatch({ ...view.state.replaceSelection('x'), userEvent: 'input.type' })` gives `FRONTMATTER + 'xFirst body line.\n\nEnd line.'`. In the five-Backspace case, the head is `FRONTMATTER.length` and typing `x` appends at the doc end.
> - [ ] `cursorDocStart` then `deleteCharForward`: the full doc equals `FRONTMATTER + 'irst body line.\n\nEnd line.'` (replaces the frontmatter-lines-only assertion).
> - [ ] `FRONTMATTER + '\nFirst body line.'`, Backspace at `BODY_START`: the full doc matches the owner's decision (1), and the head is `BODY_START`.
> - [ ] `moveLineUp` on `End line.` moves it (guard path for `move.line` in the body); `transposeChars` at `BODY_START` leaves DOC; `deleteLine` on the first body line gives `FRONTMATTER + '\n\nEnd line.'`.
> - [ ] A `select.pointer` dispatch `{ anchor: BODY_START + 5, head: 0 }` yields `[BODY_START, BODY_START + 5]`. A direct `input.paste` dispatch `{ from: 3, to: BODY_START + 5, insert: 'x' }` leaves DOC.
> - [ ] A `select.search.matches` dispatch whose main range (`mainIndex` = last) is inside the frontmatter does not throw, and the main range is a body range.
> - [ ] Composition: `{ changes: { from: BODY_START, insert: '´' }, selection: { anchor: BODY_START + 1 }, userEvent: 'input.type.compose.start' }` then `{ changes: { from: BODY_START, to: BODY_START + 1, insert: 'é' }, selection: { anchor: BODY_START + 1 }, userEvent: 'input.type.compose' }` give `FRONTMATTER + 'éFirst body line.\n\nEnd line.'`, and one `undo(view)` restores DOC.
> - [ ] If decision (2) is yes: `view.dispatch({ selection: { anchor: 5 } })` puts the head at `BODY_START`.
> - [ ] `cursorCharLeft` at `BODY_START` keeps the head at `BODY_START` (ArrowLeft into the fence).

Docs criterion:

> - [ ] `help/documentation/mods/09-raw-app.md` (TransactionSpec section) says that in live preview a dispatch with an `input`, `delete` or `move` user event cannot change the hidden frontmatter, and that frontmatter writes should use `updateNoteFrontmatter` or a dispatch without `userEvent`. Before the build, the owner checks the mods source for `userEvent` dispatches that touch the frontmatter (it is outside the repo).

Notes line (owner-visible changes for the commit):

> Cmd+A selects the body only, so Cmd+A then paste no longer replaces the frontmatter. A drag-selection that reaches the top is clamped to the body. A regex replace-all with an empty match at the start of the note is dropped whole. Goal column resets after a clamped ArrowUp.

## Not verified

- Nothing was run. V1, V2, V3 and V8 come from tracing `@codemirror/state` and `@codemirror/commands`. V4 assumes the harness's L5 step reaches `diffAgainstFresh` the way the code reads, and that the cursor reveal on line 5 matches `listMarkHandler`. A five-line jsdom check settles each one in the build step.
- WKWebView: where a drag above the first body line puts the head, composition after a filtered transaction, and native ArrowUp over `display:none` lines.
- The owner's mods source (V9) and the semantic search chunking of frontmatter lines (V6 frequency).
