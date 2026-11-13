# Scout s01: how the frontmatter is hidden and detected today (Issue 002 regression risk)

Read-only pass at HEAD `a946f22f9` (clean tree). Nothing was run. Library facts come from reading `@codemirror/state` 6.7.6, `@codemirror/view` 6.43.15, `@codemirror/commands` 6.11.1, `@codemirror/search` 6.7.2 and `@codemirror/language` 6.13.1 under `node_modules/.pnpm/`. Paths below are relative to the repo root; `LP/` means `src/lib/core/markdown-editor/extensions/live-preview/`. Facts (F) are read from code. Inferences (I) are marked.

## Summary

- The frontmatter is not removed from the document or the DOM tree model. It is covered by one pair of decorations per line: a line decoration with class `cm-lp-hidden-line` (`display: none !important`) and an empty `Decoration.replace({})` over the line text (`LP/core/hide-lines.ts:14-20`, `LP/styles.ts:24,572-574`). No line break is covered, nothing is atomic.
- "Where the frontmatter ends" is never stored. It is derived from the decoration set of `frontmatterField` (max `to` of its decorations, `frontmatterEnd`, `LP/plugins/frontmatter-field.ts:53-59`), and `bodyStart = end + 1` or `null` (`:62-65`). The field recomputes on `docChanged` and `forceDecorationRebuild` only (`:36-43`). It is a plain `StateField`, so a guard can read it from `tr.startState` in O(decorations).
- Only the mouse is guarded today: `frontmatterClick` (`:88-110`). Every other caret producer (keyboard commands, saved caret, search jump, right-click, mode switch) can leave the caret inside the hidden range, and the code assumes in a few places that it cannot (see "Caret assumptions").
- Source mode and the decorator kill switch drop the field (and would drop the guard, if registered in the same array), so `frontmatterEnd` returns `null` there (`:54-55`).
- The design in Issue 002 (changeFilter range `[0, bodyStart]` plus a selection clamp for `select` events) has five concrete failure modes that a literal implementation would ship: (R1) a suppressed Backspace moves the caret into the hidden fence, (R2) a changeFilter range drops the insert of a change that straddles the boundary but keeps its deletion, and applies half of `move.line`, (R3) pointer drags into the top padding are not clamped, (R4) every caret that is already hidden (restore, search jump, source to live preview) turns "edits invisible YAML" into "typing is silently swallowed", (R6) rebuilt transactions during dead-key composition on WKWebView. Details and prevention below.

## Facts

### How lines are hidden

- `hideLines(builder, doc, firstLine, lastLine)` adds, per line, `hiddenLineDeco` at `line.from` and `Decoration.replace({})` over `line.from..line.to`; an empty line gets an empty replace, which only the builder accepts (`LP/core/hide-lines.ts:14-20`).
- `computeFrontmatter` builds that for lines `openIdx..closeIdx` of `findFrontmatterBlock(getAllLines(state))` (`LP/plugins/frontmatter-field.ts:13-26`). `getAllLines` materialises every `Line` of the doc on each call (`LP/core/get-all-lines.ts:4-10`), so the field is already O(doc lines) per doc change.
- `findFrontmatterBlock`: needs at least 2 lines, line 0 matching `/^---\s*$/`, and the first later line matching it closes the block (`LP/parsers/frontmatter.ts:10,17-32`). There is no YAML validity check. A note that starts with a horizontal rule and has another `---` later is hidden between them.
- The gutter hides the same lines with `hiddenGutterMarker` (`LP/plugins/frontmatter-field.ts:113-127`, `LP/styles.ts:48-54`), computed from `doc` only.
- The CSS rule lives in `livePreviewStyles` (`LP/styles.ts:572-574`), which is part of the live-preview array (`LP/live-preview.ts:101`).
- `getAllLines`/field recomputation never looks at the selection: "always decorates regardless of cursor position" is pinned by `src/tests/.../plugins/frontmatter-field.test.ts` ("always decorates regardless of cursor position"). Moving the caret into the block does not reveal it.

### How the end is computed and kept current

- `frontmatterEnd(state)` returns `null` when the field is absent (`state.field(frontmatterField, false)`) or the set is empty, else the max decoration `to` (`LP/plugins/frontmatter-field.ts:53-59`). It is exported and covered by `frontmatter-field-click.test.ts` (`is the end of the closing fence line`, `null without frontmatter`, `null when the decorator is disabled`).
- `bodyStart` is private, returns `end + 1`, or `null` when `end >= doc.length` (no line after the closing fence) (`:62-65`). A doc ending `---\n` gives `bodyStart == doc.length` (guard on, caret target is the empty last line). A doc ending `---` with no newline gives `null` (guard off).
- The field value is current for any `tr.startState` because `update` recomputes on every `docChanged` (`:36-43`). A reconfigure does not recompute it, but a newly added field runs `create` (`:33-35`).
- Other code that locates the block independently: the doc-changed listener computes `fmChanged` from `update.startState.doc` with its own regex loop (`src/lib/core/markdown-editor/setup/editor-extensions.ts:173-193`); `getPositionAfterFrontmatter` re-parses the string (`src/lib/core/editor/editor.logic.ts:110-123`); the inline tag handler uses `frontmatterSlice` (`LP/inline/handlers/tag-handler.ts:28-33`); `dispatchMetaBindUpdate` uses `extractBody` (`LP/widgets.ts:899-925`). They share the regex but not code, so they agree only as long as the regex does.

### Registration, source mode, kill switch

- `BLOCK_EXTENSIONS.frontmatter = [frontmatterField, frontmatterGutter, frontmatterClick]` (`LP/live-preview.ts:46-47`). The block loop skips a disabled name (`:90-92`). Source mode is `livePreviewCompartment.of([])` (`:109-111`), switched by `editorModeEffects` (`editor-extensions.ts:115-124`, dispatched at `src/lib/core/markdown-editor/MarkdownEditor.svelte:657-664`).
- Consequences (F): in source mode the frontmatter is visible, editable, and `frontmatterEnd` is `null`. With `disabledDecorators.frontmatter` the lines are visible and a guard placed in the same array disappears with them.
- `filterTransaction` reads `changeFilter` and `transactionFilter` from `tr.startState` (`@codemirror/state` dist `:2430-2434,2457`). A transaction that reconfigures INTO live preview is therefore not guarded by the new guard; one that reconfigures out is.

### Mouse path (`frontmatterClick`)

- `EditorView.mouseSelectionStyle` that returns `null` unless the press maps (`posAtCoords(..., false)`) to a position below `bodyStart` (`LP/plugins/frontmatter-field.ts:88-91`). The doc comment says keyboard moves are not changed (`:86`).
- It anchors at `bodyStart`, except when the first body line is a sole block widget (`isBlockWidgetLine`, `:68-72,93`), where it keeps the old selection so the widget source is not revealed. Drag and shift heads below `bodyStart` clamp to it (`:100-108`).
- A press that starts in the body and is dragged up into the top padding does not take this style (the early `return null` at `:91`). The lowest-precedence default `bandDragHead` handles it and does not clamp (`LP/core/block-band-click.ts:172-203`, line 187 takes `posAndSideAtCoords`). In Chromium the top padding maps to position 0 (stated in `frontmatter-field-click.test.ts:8-10`).
- Tests: `src/tests/.../plugins/frontmatter-field-click.test.ts` (padding press, Enter after press, shift-click, drag, three block-widget cases, body press, no-body-line case at `:150-155`) and the e2e at `e2e/specs/live-preview/click-reveal/frontmatter.spec.ts:12-65`. The e2e at `:53-65` pins ArrowUp landing on the first hidden line (`:61-62`).

### Who can put the caret in the hidden range today (and does so without a userEvent)

All of these carry no `userEvent`, so a guard keyed on `select`/`input`/`delete`/`move` never sees them (F: `rg userEvent src/lib` finds only `delete.cut` and `input.paste` in `MarkdownEditor.svelte:345,362`, `input.table.*` in `LP/widgets.ts:517,532`, `input.callout.set-type` in `LP/plugins/callout-field.ts:87`, `input.codeblock.set-language` in `LP/widgets/code-block-widget.ts:180`, `input.paste` in the two paste handlers):

- Restored caret: `freshState(content, cursorPos)` clamps only to the doc length (`MarkdownEditor.svelte:107-111`); `cursorPos` is `saved.cursorPos` or `getPositionAfterFrontmatter` (`:405-409,494-495`). A saved caret of 0 stays 0. `getPositionAfterFrontmatter` itself returns the end of the closing fence when no line follows (`editor.logic.ts:110-123`, `Math.min(pos, content.length)`). Saved per-tab `EditorState`s keep their selection (`showTabState`, `:221-254`).
- Search/task/backlink jumps: the `pendingScrollPosition` effect dispatches `cursor(clampedPos)` with no userEvent (`:591-617`, dispatch at `:606-609`). A search hit inside the frontmatter text lands in the hidden range. `lineStartToOffset` also feeds it (`editor.logic.ts:127+`).
- Right-click: `handleContextMenu` dispatches `cursor(pos)` for the click (`:302-310`). `posAtCoords` in the top padding gives 0 (the Issue cites this). Menu Paste then dispatches `input.paste` at that selection (`:354-371`).
- Source mode to live preview with the caret inside the YAML: the reconfigure transaction has no selection change (`:657-664`).
- Typing a closing fence: completing `---` on line N of a note that has a body hides the new block under the caret (the field recomputes), leaving the caret at the end of the now hidden closing fence, i.e. `bodyStart - 1` (I, from `computeFrontmatter` semantics; not run).
- Keyboard commands (the Issue's scope): `cursorDocStart` (Cmd-ArrowUp on macOS, Mod-Home everywhere), `cursorPageUp`, `cursorLineUp`, `selectAll`, their shift variants, search `select.search*` (commands dist `:1750-1759`, `editor-extensions.ts:159,162`).

### Programmatic writers that must stay untouched (all lack a userEvent)

- Meta-bind writers: `dispatchMetaBindUpdate` replaces `[0, frontmatterEnd]` with rebuilt YAML, effects only (`LP/widgets.ts:899-925`, dispatch `:924`). Cursor at the end boundary of the replaced range maps to the end of the new text (`mapPos` side 1 for a replaced span, state dist `:751-752`).
- Properties panel and every `syncExternalContentToEditor` caller (`src/lib/core/frontmatter/frontmatter-write.service.ts:132,137,160`, `task-write.service.ts:28`, `link-updater.service.ts:66`, `deep-link-actions.ts:77`, `mod-vault.service.ts:162`): `replaceDoc` dispatches `docDiff` changes with `addToHistory: false` and no selection (`MarkdownEditor.svelte:175-204,189-192`); tab loads use `setState` (`:139-151`) or `saved.update(...)` (`:230-247`).
- `restoreSnapshot` replaces `0..doc.length` (`src/lib/features/file-history/file-history.service.ts:90-95`); Todoist note writer uses `docDiff` (`src/lib/features/todoist-sync/note-writer.service.ts:76-80`); task checkbox (`LP/widgets.ts:44`); wikilink completions use custom `apply` dispatches (`src/lib/core/markdown-editor/extensions/wikilink/completion.ts:77,104,163,215`); copy block link inserts ` ^id` at `line.to` of the caret line (`src/lib/features/copy-block-link/copy-block-link.service.ts:21-52`).
- Mods can reach `editorStore.editorView` (`src/lib/plugins/mods/mod-app.service.ts:27`, `src/lib/app/commands.ts:383,393`). Mod code lives outside the repo; unchecked.
- Rule that follows (F): the guard must use a positive list of user events and never treat "no userEvent" as user input.

### Library behavior that decides the design

- `changeFilter` returning an array means "suppress changes inside these ranges" (`ChangeSet.filter`, state dist `:892-922`). Outside ranges changes apply. A pure insertion at the range start or at the range end passes (`pos == next && iter.len == 0` branch, and the post-range loop). A pure insertion strictly inside is suppressed.
- For a replacement that starts inside the range and ends outside, the insert text is attached to the first sub-section (`ins = iter.off == 0 ? iter.ins : 0`, `:911-914`). The inside part is suppressed together with the insert, the outside part is kept as a bare deletion. Net effect: the deletion is applied and the replacement text is lost.
- After filtering, an explicit `tr.selection` (positions in the post-change doc) is mapped through `back = filtered.filtered.mapDesc(filtered.changes).invertedDesc` (`filterTransaction`, `:2442-2451`). A selection is not otherwise validated.
- `ChangeSet.filter` is applied whenever the facet returns an array, even if no change touches the range, and then rebuilds the `Transaction` object (`:2446-2451`). Returning `true` leaves the original untouched.
- Filters can return a spec (or `[tr, spec]`), which goes through `resolveTransaction(state, specs, false)`, so annotations (including `userEvent`), effects and `scrollIntoView` must be forwarded by hand (`:2416-2467`). Other transaction filters stack: `indentOnInput` is one (`@codemirror/language` dist `:1189`), running last to first (`:2457-2465`).
- Commands: `deleteCharBackward` builds `{changes: {from, to}, range: EditorSelection.cursor(from, from < range.head ? -1 : 1)}` with `userEvent: "delete.backward"` (commands dist `:1175-1203`). `moveLine` up emits `[{from: nextLine.from, to: block.from}, {from: block.to, insert: "\n" + nextLine.text}]` and an explicit selection (`:1403-1431`). `transposeChars` replaces `[pos-1, pos+1)` when `pos == line.from` (`:1370-1381`, `move.character`). `selectAll` and `cursorDocStart` dispatch `select`. `deleteLine` at the last line of the doc deletes the preceding break (pure deletion).
- DOM-originated changes (IME, dead keys, spellcheck) go through `applyDOMChange`: user event `input.type` (+ `.compose`, `.compose.start`) (`@codemirror/view` dist `:4468-4478`), change range from `domBoundsAround` and `findDiff` (`:4247-4300`). DOM-originated selection changes use `lastSelectionOrigin` or `select` (`:4358-4366`).
- Project note: the composition-aware bracket matching file documents that on WKWebView (Tauri on macOS) dead-key composition breaks when a transaction restructures the composing node, and that a reconfigure dispatched during `compositionstart` made the caret jump (header of `src/lib/core/markdown-editor/extensions/composition-aware-bracket-matching.ts:1-92`; its `update()` early-returns on `view.composing || view.compositionStarted`, `:153`).

### Existing tests and fixtures the guard touches

- `src/tests/lib/core/markdown-editor/extensions/live-preview/invariants-harness.test.ts`: mounts the real live-preview array (`:115-122`), corpus includes `19-meta-bind.md` (starts with frontmatter) and the edge doc `bullet list right under frontmatter` (`fixtures/edge-corpus.md:84`). For every boundary line (`:277`) it runs the step `type a character`, which dispatches `{insert: 'x'}` with `input.type` and then a 1-char `delete` at the line start (`:332-337`), and `select a range ending at a line start`, which dispatches `EditorSelection.single(prevLine.from, target.from)` with `userEvent: 'select'` (`:312-322`) and then compares against a state built by `update({selection})` with no userEvent (unguarded). Both steps hit lines inside the hidden range.
- `src/tests/lib/core/markdown-editor/undo-history-across-notes.test.ts:595-607`: dispatches `{from: 0, insert: 'X'}` with `input.type` into a frontmatter-only doc (`---\ntitle: x\ntags: a\n---\n`) and only asserts `not.toContain`.
- `src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts:329-336` (select all selects the whole doc) uses a doc without frontmatter.
- `e2e/specs/live-preview/click-reveal/frontmatter.spec.ts:53-65`.
- `frontmatter-field-click.test.ts` (all cases must stay green), `frontmatter-field.test.ts` (decoration shape), `meta-bind-writers.test.ts`.

## Regression risks for Issue 002

Likelihood is for this owner (Portuguese dead keys, meta-bind inputs and buttons, Properties panel, templates, Quick Capture, tables). Inference where marked.

### R1. A suppressed Backspace moves the caret into the hidden fence, and the next keystrokes are swallowed

- Scenario: caret at the start of the first body line (the exact case of the Issue: key repeat runs past the start of the line), Backspace. `deleteCharBackward` yields change `[bodyStart-1, bodyStart]` and explicit selection `cursor(bodyStart-1, assoc -1)`. The changeFilter removes the change; `tr.selection.map(back)` with `back` = insertion of one char at `bodyStart-1` and `assoc -1` returns `bodyStart-1` (state dist `:2442-2451`, `mapPos` `:751-752`). That is the end of the hidden closing fence (F by code reading, not run).
- What breaks: the caret is now on a hidden line. Each further repeat targets `[bodyStart-2, bodyStart-1]` etc., is suppressed again, and the caret walks left through the fence. Typing afterwards inserts at an interior position of `[0, bodyStart]`, which is suppressed, so the user sees nothing and the caret is invisible. Same family: Cmd+Backspace, Alt+Backspace at the body start, Delete at a position that maps back.
- Likelihood: high. It is the headline trigger of the Issue.
- Prevention: do the narrowing in a `transactionFilter` (not only a `changeFilter` range) and, after narrowing, clamp every explicit and implicit selection range to the mapped `bodyStart` (`max(pos, newBodyStart)`), for `input`, `delete` and `move` too, not only for `select`. Cover with: Backspace at body start leaves doc and caret (`head === bodyStart`); three more Backspaces keep `head === bodyStart`; then `input.type` of `x` lands at `bodyStart`.

### R2. A change that straddles the boundary loses its insert but keeps its deletion; `move.line` is half applied

- Scenario A: `moveLineUp` on the first body line (Alt+ArrowUp). Change 1 `[fence.from, bodyStart]` is inside the range and suppressed; change 2 inserts `\n---` after the body line and passes. Result: the original closing fence stays and a second `---` appears under the first body line, which turns that line into a setext heading and leaves a stray rule. This is worse than today's corruption in one respect: the doc still has valid frontmatter, so it looks fine until the body renders. It also contradicts the Issue's own criterion "moveLineUp leaves the doc unchanged" (refute-002 M5), which a range-narrowing implementation fails.
- Scenario B: `transposeChars` at the body start (Ctrl-T on macOS, `emacsStyleKeymap`): `[bodyStart-1, bodyStart+1)` replaced by `firstChar + "\n"`. The insert is dropped, the deletion of the first body character applies: one character of the note is deleted.
- Scenario C: any selection that starts inside the hidden range and ends in the body (see R3, R4), then typing: the typed text is dropped and the body part of the selection is deleted. Data loss, not a no-op.
- Likelihood: A medium (Issue's own trigger), B low, C medium given R3/R4.
- Prevention: implement the policy per change, not per range. For `move.*`: all-or-nothing (if any change has `from < bodyStart`, return the transaction with no changes). For `input.*` and `delete.*`: drop a change entirely (including its insert) when `from < bodyStart`; keep it when `from >= bodyStart`; a pure insertion at exactly `bodyStart` is kept, at `0` is dropped. Replace-all then still replaces body matches. Tests: moveLineUp, transposeChars at body start, a replace that starts at `bodyStart-1`, and replace-all with matches in both halves; always assert the full doc string.

### R3. Pointer drags into the top padding are not clamped

- Scenario: press in the body, drag upward past the first line. `frontmatterClick` returns `null` because the press is in the body (`frontmatter-field.ts:91`); the default `bandDragHead` takes `posAndSideAtCoords` for the head, which is 0 in the padding (`block-band-click.ts:187`). The Issue excludes `select.pointer` from the clamp, so the selection `[anchor, 0]` stands.
- What breaks: today, typing replaces the YAML too. With the guard, R2 scenario C: typed character lost, body part deleted. Cut and Backspace narrow to the body part (acceptable) but the caret then follows R1.
- Likelihood: medium (selecting to the top of a note by dragging is natural).
- Prevention: clamp the head in `bandDragHead.get` and in the double and triple click defaults with `max(pos, bodyStart)` exactly as `frontmatterClick.get` does (`:103-104`), keeping the block-widget exception; or make R2's per-change rule robust so a straddling selection edit only touches the body part and then clamp the selection after the edit (R1). Do both if cheap.

### R4. Carets that are already hidden turn into "typing silently swallowed"

- Scenario: caret in the hidden range via restore (`MarkdownEditor.svelte:405-409,494-495`), a search/task jump into frontmatter text (`:606-609`), right-click in the padding (`:308`), switching source to live preview with the caret in the YAML (the reconfigure tx is not guarded, `:662`), or completing a fence. The user types. Today the keystrokes edit the invisible YAML. With the guard they hit the interior of `[0, bodyStart]` and are dropped, a pure insertion at 0 is explicitly dropped by the Issue, and nothing tells the user.
- Special case: right-click then menu Paste (`input.paste`, `:360-364`) pastes nothing; right-click then Copy Block Link inserts ` ^id` into the `---` fence because that service dispatches without a userEvent (`copy-block-link.service.ts:21-52`, `detectBlockElement` returns `block` for `---`, `copy-block-link.logic.ts:52`); the guard cannot see it.
- Likelihood: medium. The source-mode round trip and the search jump are the plausible ones (I: owner edits properties through the panel, so source-mode YAML edits are probably rare; owner uses search).
- Prevention, pick one and test it: (a) relocate instead of drop: when the start selection head is below `bodyStart` and the transaction is `input` or `delete`, treat the caret as `bodyStart` (rewrite the change position and selection); (b) a small `ViewPlugin` in the same extension that moves a focused, non-composing caret out of the hidden range on `update` (schedule the dispatch, never dispatch inside `update`, skip while `view.composing`, see R6); (c) clamp at the producers (restore, `pendingScrollPosition`, context menu) with an exported helper. Option (a) covers every producer including mods; it changes what a core write path does, so state the trade-off to the owner (the project memory says no new core write-path behavior for rare corners; this one is reachable by search jumps and mode toggles, so it is not rare).

### R5. Typing a closing fence at the top of a note that has a body

- Scenario: owner types `---`, a property line, `---` at the top of an existing note in live preview, or pastes a template's frontmatter in two steps. The third dash of the closing fence makes the field hide the block with the caret at `bodyStart-1`. Before the guard, the next keystroke (`---x`) broke the fence and un-hid the block, which self-corrected visibly. With the guard, further typing and Enter are swallowed until the user clicks elsewhere. Pressing Enter at the end of the closing fence would be harmless (a line break after the fence) but is suppressed too.
- Likelihood: low (templates and the Properties panel create frontmatter).
- Prevention: same as R4. A narrower alternative is to allow an insertion at `bodyStart-1` that is exactly a line break.

### R6. Dead-key and IME composition (Portuguese on WKWebView)

- Scenario: composing `ã`, `é`, `ç` and similar at the first character of the first body line, or while a selection exists. These transactions have userEvent `input.type.compose` or `.compose.start`, so `tr.isUserEvent('input')` matches them and the changeFilter runs on them (F: `view` dist `:4468-4478`; `isUserEvent` matches subtypes, state dist `:2313-2316`).
- What breaks if the filter is written as "always return `[0, bodyStart]`": `filterTransaction` rebuilds the Transaction even when no change touches the range (`:2446-2451`); the project documents that on WebKit any extension that restructures the composing node, or a transaction at `compositionstart`, breaks composition (`composition-aware-bracket-matching.ts:1-92`). Also (I, not run) the DOM diff bounds (`domBoundsAround`, `findDiff` with `preferredPos`) could, for a change at the very start of a line, report a `from` one position early; that is not what the code reads for the usual case (the first body line starts a new child tile, so `from = bodyStart`), but it is the one place where the narrowing could drop a composition edit.
- Likelihood: medium to ship, because the owner types accents constantly and the e2e suite runs Chromium, not WKWebView (I; confirm in `e2e/` config).
- Prevention: return `true` or the unmodified `tr` unless `tr.changes` touches `[0, bodyStart)` (use `from < bodyStart` on `iterChanges`, which is O(changes)); never rewrite a transaction whose changes and selection are both outside the hidden range; do not add effects or annotations; do not dispatch from a plugin while `view.composing`. Tests: jsdom dispatch `input.type.compose.start` then `input.type.compose` at `bodyStart` and in the middle of the first body line with `Object.is(result.transaction, tr)`-style identity checked through a probe filter, plus a manual WKWebView check by the owner with `'` then `a` at the start of the first body line (cannot be automated here).

### R7. Block-widget first line: clamping reveals its source

- Scenario: a note whose first body line is a table, code block, math block, queryjs, collection or meta-bind button. Cmd+Up now places the caret at `bodyStart`, which touches the first body line and reveals the block as raw text. Before, the caret went to 0 and the widget stayed rendered. `frontmatterClick` goes out of its way to avoid this for mouse presses (`:82-85,93`, tests `frontmatter-field-click.test.ts:112-123`).
- Likelihood: medium. The owner uses tables and meta-bind buttons daily and frontmatter followed by a widget is a common shape. Severity is low (the block is shown as source until the caret leaves, and opening such a note already puts the caret at `bodyStart`, `editor.logic.ts:110-123`, so it is consistent).
- Prevention: accept and document, or add a test that Cmd+Up on such a note leaves the doc unchanged and does not loop. Do not try to read the DOM in the filter (no view is available there).

### R8. Selection rewrite fidelity

- Scenario: the clamp builds `EditorSelection.cursor(bodyStart)` or `create(...)`. That loses `goalColumn` and `assoc`, flips inverted ranges if anchor and head are not handled separately, and can reorder `mainIndex` when the main range is removed or two clamped ranges merge. A spec returned from the filter must also carry the original annotations (the `userEvent`), effects and `scrollIntoView` (`filterTransaction`, `:2457-2465`).
- What breaks: ArrowUp then ArrowDown column memory, shift-select direction after `selectDocStart`, multi-cursor from `Mod-Alt-ArrowUp`, scrolling after Cmd+Up, search match counters. Low severity each.
- Likelihood: low to medium.
- Prevention: clamp each range with `EditorSelection.range(max(anchor, b), max(head, b), goalColumn)` and drop ranges whose both ends are `< b`; keep `mainIndex` pointing at the same logical range or 0; forward `tr.effects`, `tr.annotations`, `tr.scrollIntoView`. Tests below.

### R9. Programmatic writers and "no userEvent" must stay a no-op

- Scenario: an implementation that treats a missing userEvent as user input, or that filters on `tr.docChanged` alone, breaks meta-bind writes (`LP/widgets.ts:924`), the Properties panel and every `syncExternalContentToEditor` caller (`MarkdownEditor.svelte:189-194`), snapshot restore (`file-history.service.ts:92`), tab loads, Todoist writes, wikilink completion and mods.
- Likelihood: low if the positive-list rule is followed; the cost of a mistake is high (Properties panel and meta-bind stop writing).
- Prevention: positive list only (`select`, `input`, `delete`, `move`, minus `select.pointer`); `undo` and `redo` never matched. Tests below keep the writers green, including the meta-bind writer with the caret at `bodyStart` (cursor maps to the new `bodyStart`).

### R10. Existing tests that will move or pass vacuously

- `frontmatter.spec.ts:53-65` must change (Issue says so).
- Invariants harness (`:312-337`): the `select` step with a range starting inside the hidden lines is rewritten by the clamp, while the comparison state `earlier` is built with no userEvent and stays unclamped; for the first body line this can report a false "revealed by a range ending at its start" (I: a clamped cursor at `bodyStart` touches the first body line, the unclamped range ending at `bodyStart` does not). The `type a character` step inserts at hidden line starts: with the guard the insert is dropped, and its follow-up `delete` of one character is dropped too, so the step passes but proves nothing for those lines; at the first body line both apply. Expect to adjust the harness (mark steps userEvent-less or skip lines `< bodyStart`) and say so in the commit.
- `undo-history-across-notes.test.ts:595-607` would pass vacuously: the insert at 0 is dropped, so `tabContent(F)` is unchanged and `not.toContain('Line one of B')` still holds. Rewrite its edit to land at `bodyStart` or at the end of the doc so it keeps exercising the keystroke pipeline.
- Likelihood: certain for the e2e and harness, so the Issue must list them.

### R11. Performance of the guard

- The guard runs on every transaction of every note with frontmatter. `frontmatterEnd` iterates the field's decorations (about two per hidden line). Cheap, but `computeFrontmatter` is already O(doc lines) per doc change (`getAllLines`), so the guard must not call `findFrontmatterBlock(getAllLines(...))` again. Order of checks: user-event string test first, then `frontmatterEnd`, then `iterChanges`/selection tests. `select.pointer` fires on every mouse move during a drag (`view` dist `:4884`), which the guard skips by event name.
- Likelihood: low if done as above. Do not read `view` or the DOM in a filter.

### R12. What "frontmatter" means to the guard

- `findFrontmatterBlock` accepts any `---` ... `---` at the top (`parsers/frontmatter.ts:25-30`). A note that starts with a horizontal rule and has another later is hidden today. With the guard its hidden text also becomes keyboard-immovable in live preview, and Cmd+A skips it; source mode remains the way out.
- Likelihood: low (I: such notes are unusual for this owner). State it once in Notes; do not widen the fix.

### R13. Search panel and replace-one

- `select.search*` (`findNext`, select all matches) that lands in the hidden text collapses to a cursor at `bodyStart`; with only frontmatter matches the panel appears not to move. `replaceNext` dispatches changes plus an explicit selection with `input.replace`: a selection inside the hidden range is not clamped because the Issue clamps only transactions without doc changes; the change itself is narrowed. Low likelihood (I). Test: replace-all with matches on both sides (already in the Issue); add one for replace-one with a match in frontmatter, asserting the doc is unchanged and `head >= bodyStart`.

## Test cases the Issue must add

jsdom, real stores, real `livePreviewExtensions`, as `frontmatter-field-click.test.ts` does (mount helper at `:30-37`). Always assert `view.state.doc.toString()` in full and the selection. `DOC = '---\nstatus: todo\n---\nFirst body line.\n\nEnd line.'`, `B = '---\nstatus: todo\n---\n'.length`.

1. Cmd+Up path: `cursorDocStart`, `selectDocStart`: head ends at `B`; with the caret on the second body line and a shift variant the range is `[B, pos]` with direction preserved.
2. `selectAll`: range `[B, doc.length]`, anchor `B`. Doc with an empty body (`---\na: 1\n---\n`, `B == doc.length`): a cursor at `B`, no throw.
3. Menu Select All path (`MarkdownEditor.test.ts` style) on a frontmatter doc selects the body only; the existing no-frontmatter test at `:329-336` stays green.
4. Backspace at `B` (`deleteCharBackward`): doc equals `DOC`, `head === B`; three repeats keep it; then `input.type` `x` yields `...---\nxFirst body line.` (R1).
5. Cmd+Backspace and Alt+Backspace at `B`: same assertions (R1).
6. Enter (`insertNewlineAndIndent`) at `B`: inserts the newline, frontmatter bytes unchanged, caret after the break; Enter after Cmd+Up equals the same.
7. `moveLineUp` with the caret on the first body line: doc equals `DOC`, selection unchanged or at `B`, no `---` inserted anywhere (R2A). `moveLineDown` from the second body line unaffected.
8. `transposeChars` at `B`: doc equals `DOC` (R2B).
9. Straddling replace: dispatch `{from: B-1, to: B+3, insert: 'Z'}` with `input.type`: doc equals `DOC`. Selection `[0, B+5]` then `input.type` `x`: doc equals `DOC` and selection clamped (R2C).
10. Paste at 0: `{from: 0, insert: 'x'}` with `input.paste` leaves `DOC`; at `B` it inserts.
11. Replace-all: one `input.replace.all` transaction replacing `todo` in frontmatter and a body `todo`: only the body occurrence changes.
12. Drop: `move.drop` and `input.drop` at 0 leave `DOC`.
13. No-op identity: a probe `transactionFilter` registered after the guard receives the same transaction object for (a) typing in the body, (b) `input.type.compose.start` and `.compose` at `B` and mid-line, (c) undo and redo, (d) a no-userEvent transaction; and a `select` fully in the body is not rewritten (R6, R9).
14. Programmatic writes pass: `dispatchMetaBindUpdate` with the caret at `B` (new `bodyStart`, doc has the new value), Properties-style `replaceDoc` change spanning the frontmatter with `addToHistory: false`, `changes: {from: 0, to: doc.length}` snapshot restore, tab `setState`. Undo (`undo`) after a meta-bind write restores the old frontmatter (R9).
15. Hidden caret producers (R4): caret at 0 from a saved state or a no-userEvent selection, then `input.type`: assert the chosen behavior (relocate to `B`, or a documented drop plus a clamped caret), not silence. Source to live preview with the caret inside the YAML: after the reconfigure, a focused-caret clamp or the relocate rule applies.
16. Pointer: drag from the body to the padding (stubbed `posAtCoords` returns 0) ends with `head === B`; `frontmatterClick` tests stay unchanged; first-line block-widget cases stay unchanged.
17. Selection fidelity (R8): inverted range after `selectDocStart` keeps `anchor > head`; two ranges both inside the frontmatter collapse to one cursor at `B`; `mainIndex` valid; `scrollIntoView` and effects survive a rewritten `select`.
18. Kill switch and source mode: with `disabledDecorators.frontmatter` or in source mode the guard is absent (`selectAll` selects `[0, len]`, Backspace at line 4 deletes the break). `frontmatterEnd` is `null` there.
19. No line after the fence (`---\na: 1\n---`): guard off, same as `frontmatter-field-click.test.ts:150-155`.
20. Block-widget first line (R7): Cmd+Up on a doc whose first body line is a table leaves the doc unchanged and does not throw.
21. Harness (R10): `invariants-harness.test.ts` stays green after skipping or marking the steps that target lines `< bodyStart`; `undo-history-across-notes.test.ts:595-607` edits at `B`.
22. e2e: change `frontmatter.spec.ts:53-65` to expect `.cm-activeLine` on the first body line and no hidden line active; add `ControlOrMeta+Home` and a Backspace-repeat-then-type case (R1). A real dead-key check on WKWebView is manual.

## Not verified

- Nothing was run: not the guard, not the commands, not the e2e. R1's caret position comes from reading `deleteBy`, `filterTransaction` and `mapPos`. R2's partial `move.line` comes from reading `moveLine` and `ChangeSet.filter`.
- Whether WKWebView relocates a native selection that sits inside a `display: none` line (which could soften R1 and R4 in practice) is unknown.
- Whether the DOM-change path can ever produce a change starting at `bodyStart - 1` for a composition at the start of the first body line is unchecked.
- Mods and templates outside this repo (`~/kokobrain-vaults/...`) were not searched; they may dispatch with a user event.
- `edge-corpus.md` was checked only for the one frontmatter document I found; other corpus entries may start with `---`.
