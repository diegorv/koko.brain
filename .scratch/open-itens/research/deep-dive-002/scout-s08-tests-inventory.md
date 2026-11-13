# Scout s08: tests inventory for Issue 002 (guard next to hidden frontmatter)

Read-only scout. Nothing was run (no vitest, no e2e, no app). Library behavior comes from reading `node_modules/.pnpm/@codemirror+state@6.7.6`, `commands@6.11.1`, `view@6.43.15`, `language@6.13.1`. Facts carry path:line. Inference is marked "(inference)".

## Summary

- Today only the MOUSE path next to the hidden frontmatter has tests. The keyboard path has one e2e that pins the buggy landing (`e2e/specs/live-preview/click-reveal/frontmatter.spec.ts:53-65`) and no jsdom test at all. Nothing in the suite dispatches a keyboard command against a live-preview view that has frontmatter.
- The Issue's 14 criteria cover the main corruption paths (Enter, Backspace, Delete, Alt+ArrowUp, paste at 0, replace-all, Cmd+A, search matches, undo, decorator off). They miss: the empty-first-line case, `transposeChars`, `deleteLine`, composition user events, a caret that is already inside the hidden range, multi-cursor, drag and drop, mode switch, a block widget as first body line, and the production keymap (markdown `deleteMarkupBackward` / `insertNewlineContinueMarkup`, closeBrackets) which the raw-command tests bypass.
- Two claims in the Issue are probably wrong. (1) "invariants-harness.test.ts stays green with no edits": the edge doc `bullet list right under frontmatter` should fail its `select a range ending at a line start` step once Select clamps (details in R6). (2) "meta-bind-writers.test.ts stays green" proves nothing about the guard, because that suite never installs the live-preview stack (`meta-bind-writers.test.ts:40-44` uses a bare `EditorState.create`).
- The Issue's own fix direction for `move.*` (narrow with `[0, bodyStart]`) contradicts its criterion 5: narrowing `moveLineUp` on the first body line inserts a stray `\n---` after the body line (R1). The test catches it, but the text should say "drop the whole transaction" for `move.*`.
- Highest regression risks for this owner, in order: (a) Backspace on the blank first body line becomes a no-op (R4, typical layout of every note), (b) typing is silently dropped when the caret is already in the hidden range via search/backlink navigation or saved caret (R5), (c) harness edit needed (R6), (d) narrowing corrupts `move.line` and deletes a character on `transposeChars` (R1, R2), (e) the gate does not run any e2e that writes frontmatter through the guard (R14).

## Facts

### Source today

- Hidden range: per-line `Decoration.replace({})` over `line.from..line.to`, no line break covered (`src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts:14-20`).
- `frontmatterEnd` / `bodyStart` (`plugins/frontmatter-field.ts:53-65`): `bodyStart` is `end + 1`, or `null` when `end >= doc.length`. A doc `---\nx\n---\n` has `bodyStart === doc.length` (an empty last line), so the guard is ON there. `---\nx\n---` (no final newline) is OFF.
- Kill switch wiring: `BLOCK_EXTENSIONS.frontmatter` at `live-preview.ts:47`; `decorator-toggles.test.ts` only checks the installed count is smaller (`toBeLessThan`), so a new entry in that array does not break it.
- No filter exists under `src/lib` for this purpose, but the production stack already has one library filter: `indentOnInput()` (`setup/editor-extensions.ts:136`) is `EditorState.transactionFilter` for `input.type` and `input.complete` (`@codemirror/language@6.13.1 dist/index.js:1188-1200`). It returns `[tr, {changes, sequential: true}]`. Change filters run before all transaction filters (`@codemirror/state@6.7.6 dist/index.js:2430-2468`), so extra changes it adds are not seen by a changeFilter. They re-indent the typed line, which is in the body (inference: low risk).
- `ChangeSet.filter(ranges)` semantics, read at `state dist/index.js:892-922`: ranges are the SUPPRESSED spans. A pure insert at exactly `ranges[0]` passes. A replacement that starts inside a suppressed span and continues past its end keeps the deletion of the tail but loses its insert text (the `iter.off == 0 ? iter.ins : 0` branch). This is the source of R1 and R2.
- Production keymap order (`setup/editor-extensions.ts:157-166`): `closeBracketsKeymap`, `defaultKeymap`, search (minus Mod-d), history, completion, `indentWithTab`; markdown's own keymap (`deleteMarkupBackward`, `insertNewlineContinueMarkup`) comes from `markdownLanguage()` in the language compartment (`:171`). Raw `deleteCharBackward` / `insertNewlineAndIndent` calls in a test skip closeBrackets and markdown.
- DOM-originated edits (typing, spellcheck, dead keys, IME) go through `applyDOMChangeInner` -> `applyDefaultInsert`, userEvent `input.type`, plus `.compose` and `.compose.start` during composition (`@codemirror/view@6.43.15 dist/index.js:4468-4478`). When a filter leaves the state unchanged, `DOMObserver.flush` calls `view.update([])` to re-sync the DOM (`:7530-7536`). Whether a filtered, composition-time transaction leaves stray composed text in WKWebView is not verified.
- DOM-originated selection changes carry `select` (or the last pointer origin) (`view dist:4356-4366`).
- Programmatic writers carry no userEvent: `dispatchMetaBindUpdate` (`widgets.ts:918-924`), `replaceDoc` (`MarkdownEditor.svelte:189-194`, `addToHistory: false`), task writer (`todoist-sync/note-writer.service.ts:77`), snapshot restore (`file-history.service.ts:92`), copy-block-link (`copy-block-link.service.ts:51`). Dispatchers with a userEvent: `MarkdownEditor.svelte:345` (`delete.cut`), `:362` (`input.paste`), `widgets.ts:517,532` (`input.table.*`), `callout-field.ts:87`, `paste-tsv-handler.ts:36`, `paste-html-link-handler.ts:41`, `code-block-widget.ts:180`. All target body text.
- Programmatic carets that can land inside the hidden range (no userEvent, so never clamped): right-click in the top padding (`MarkdownEditor.svelte:308`, also `:386`), `pendingScrollPosition` navigation (`MarkdownEditor.svelte:606-609`, fed by `open-note-at.service.ts:48` and `app/editor-host.ts:46`, i.e. search/backlink hits), saved tab caret (`MarkdownEditor.svelte:407,495`), `wikilink-navigation.ts:56`.
- Commands read in `@codemirror/commands@6.11.1 dist/index.js`: `moveLine` `:1401-1430` (up on the first body line deletes `[closingFence.from, bodyStart]` and inserts `\n---` after the body line), `transposeChars` `:1368-1383` (at a line start replaces `[pos-1, pos+1]`), `deleteLine` `:1471-1490` (on the first body line deletes `[bodyStart-1, line.to]`), `copyLine` `:1441-1462` (no touch of the fence), `splitLine` `:1355`.

### Tests that cover this area today

| File | Mounts | What it pins | Covers keyboard guard? |
|---|---|---|---|
| `src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.test.ts:24-102` | `computeFrontmatter` only, no view | 6 decos for 3 lines, none without frontmatter, rebuild on doc change | No |
| `.../plugins/frontmatter-field-click.test.ts:55-157` | real `livePreviewExtensions`, jsdom, no history, no keymap | `frontmatterEnd` (null without frontmatter or with decorator off, `:55-70`); mouse remap, shift-click, drag clamp, block-widget first line, no-body-line (`:72-157`); `insertNewlineAndIndent` after a padding click (`:82-90`) | No (mouse only) |
| `.../parsers/frontmatter.test.ts:15-77` | parser | fence detection incl. trailing spaces | No |
| `.../invariants-harness.test.ts` | real stack, corpus; frontmatter docs: `19-meta-bind.md` (`:79`) and edge `bullet list right under frontmatter` (`fixtures/edge-corpus.md:84-89`) | per boundary line: type a char (`input.type` then `delete`, `:332-340`), select ending at a line start (`userEvent: 'select'`, `:312-328`, `:341`), pointer ranges, rebuild, scroll | Indirectly, see R6 |
| `.../meta-bind-writers.test.ts:40-44` | bare `EditorState`, NO live-preview stack | writer output, lossy refusal | No (vacuous for the guard) |
| `.../meta-bind-input-redraw.test.ts:29-45` | real `livePreviewExtensions`, frontmatter doc, `change` and `blur` on controls | widget redraw after a real `dispatchMetaBindUpdate` write | Yes for "programmatic write passes", by accident (assertion is on doc content, `:60-110`) |
| `.../meta-bind-input-keydown.test.ts:7-60` | no live-preview stack, frontmatter docs | keys inside controls do not reach the keymap | No |
| `src/tests/lib/core/markdown-editor/undo-history-across-notes.test.ts:179-195, 477-600` | full `MarkdownEditor.svelte`, frontmatter docs, `syncExternalContentToEditor` | Properties-panel rewrite then undo, caret mapping across frontmatter rewrites, CRLF notes | Yes for "no-userEvent writes pass and undo works" (real stack) |
| `src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts:329-336` | full editor, doc `First paragraph\n...` (no frontmatter) | menu "Select all" selects `0..DOC.length` | No (no frontmatter variant) |
| `src/tests/lib/core/markdown-editor/setup/editor-extensions.test.ts:356-376` | `createExtensions`, doc `---\ntags: [a]\n---\n\n# Title\n`, caret on the blank first body line | active-line CSS only | No (but shows the typical layout, R4) |
| `src/tests/lib/core/markdown-editor/extensions/live-preview/arrow-reveal.test.ts:47-68` | real stack, jsdom, no frontmatter | `cursorLineUp` / `cursorLineDown` DO run in jsdom with `Range` geometry stubs (`:55-58`) | No, but contradicts "ArrowUp needs layout" (see test list T22) |
| `src/tests/lib/features/properties/*`, `frontmatter-write.service.test.ts`, `panel-meta-bind-lossy-rewrite.test.ts` | stores and services, no editor | Properties logic | No |
| `e2e/specs/live-preview/click-reveal/frontmatter.spec.ts:12-65` | Chromium | 3 mouse cases, `Enter` after padding click, ArrowUp lands on first hidden line (`:53-65`) | Pins the bug |
| `e2e/specs/live-preview/click-reveal/meta-bind-{toggle,inline-select,text-input,button}.spec.ts`, `frontmatter-write-keeps-scroll.spec.ts:168,191`, `properties-cross-note.spec.ts:100-110`, `meta-bind.spec.ts` | Chromium, real writes through the stack | meta-bind and Properties writes | Only if run; the Issue gate does NOT run them (R14) |

Other e2e files with frontmatter docs (`combined-stress`, `misc-features`, `collection-block`, `table-cell-controls`, `offscreen-block-rerender-keeps-scroll`) press no key near the first body line (grep of `keyboard.press` in them: only `ArrowDown` at `meta-bind.spec.ts:164-165`, `Escape`). No e2e uses select-all (grep for `+a`, `Select all` returns nothing).

Playwright runs one project, Chromium (`e2e/playwright.config.ts:24`). The app ships in WKWebView on macOS. Caret, composition and dead-key behavior is therefore not covered in the engine the owner uses.

## Acceptance criteria review (14 items)

1. Cmd+Up then Enter, full-doc equality. Catches the original Enter-in-fence bug. Weakness: both guards act (clamp moves the caret to `bodyStart`, filter would also block), so a pass does not tell which guard works. Add the selection assertion and a direct `input` dispatch at a hidden position.
2. Backspace at start of `First body line.` leaves DOC. Good. Only the non-empty case.
3. Five Backspaces on `FRONTMATTER + 'ab'`. Good: Backspace 3 hits the filter, 4 and 5 are no-ops.
4. `deleteCharForward` after `cursorDocStart`: asserts only the three frontmatter lines. With the clamp the caret sits at `bodyStart`, so `F` of the body line is deleted. Assert the full doc so the intended semantics is pinned.
5. `moveLineUp` leaves DOC. Catches R1, but only if the implementation drops the transaction, which the fix direction text does not say.
6. Paste at 0 leaves DOC. Good.
7. Replace-all narrowed, full-doc assertion. Good. It also protects against a `false` for the whole transaction.
8. `selectAll` then Backspace leaves exactly FRONTMATTER. Good. Add the menu path (`MarkdownEditor.svelte:373-376`) and `Mod-a` through the keymap.
9. `selectDocStart` and `select.search.matches`. Good. Missing: single-range search match fully inside the frontmatter (fallback cursor), and `findNext` loop.
10. Guards: no-userEvent rewrite changes the frontmatter and `undo(view)` restores it. The helper copied from `frontmatter-field-click.test.ts:29-37` has NO `history()`, so `undo(view)` returns false there. The mount helper must add `history()` or use `createExtensions`. Also use the real `dispatchMetaBindUpdate`, not a handcrafted dispatch.
11. Decorator disabled keeps today's behavior. Good. Source mode (compartment reconfigure) is not covered.
12. e2e change. Needed. Chromium only. `ControlOrMeta+Home` is cross-platform, `Meta+ArrowUp` is mac only.
13. "Existing suites stay green with no edits." Probably false for the harness (R6). Vacuous for `meta-bind-writers.test.ts` and for `undo-history-across-notes.test.ts` on its non-frontmatter cases. Real value only from `undo-history-across-notes.test.ts:179-195, 477-600` and `meta-bind-input-redraw.test.ts`.
14. Gate. Runs one e2e spec. Meta-bind and Properties writes through the guard are only exercised by jsdom tests (R14).

Existing tests that WILL change or must be re-read:
- `e2e/specs/live-preview/click-reveal/frontmatter.spec.ts:53-65` (Issue says so).
- `invariants-harness.test.ts` step `select a range ending at a line start` (`:312-328`) for the edge doc (R6). Also the `type a character` step becomes a silent no-op on frontmatter lines (`:332-340`): it still passes but stops testing anything there.
- `frontmatter-field.ts:86` doc comment (stale).
Unchanged but should gain a frontmatter variant: `MarkdownEditor.test.ts:329-336` (Select all).

## Regression risks for Issue 002

Likelihood is for this owner: Portuguese dead keys and accents, meta-bind controls, Properties panel, views reading frontmatter, templates, Quick Capture, tables, daily.

### R1. Narrowing `move.*` corrupts the body (stray `---`)
- Scenario: Alt+ArrowUp on the first body line. `moveLine` emits two changes: delete `[closingFence.from, bodyStart]` and insert `\n---` after the body line (`commands dist:1420-1421`). A changeFilter returning `[0, bodyStart]` suppresses the delete and lets the insert pass (`state dist:892-922`).
- What breaks: doc becomes `---\nstatus: todo\n---\nFirst body line.\n---\n\nEnd line.`; the body line turns into a setext H2 and autosave writes it. This is a NEW corruption introduced by the guard (inference from reading; not run).
- Likelihood: low to medium (line moving is a power-user key, Alt+ArrowUp is bound by default).
- Prevent: use a per-event policy. `input.replace.all` (independent per-match changes) may be narrowed; every other `input`, `delete` and `move` transaction that touches `[0, bodyStart)` returns `false`. Criterion 5 already tests this; the Issue text (fix direction item 2) should be changed to match. Add a guard test: `moveLineUp` on the SECOND body line still works.

### R2. Narrowing deletes a character on `transposeChars` and other straddling replacements
- Scenario: Ctrl-T on macOS (`emacsStyleKeymap`) with the caret at `bodyStart`. `transposeChars` replaces `[pos-1, pos+1]` (`commands dist:1368-1383`, userEvent `move.character`). Under narrowing the head of the replacement is suppressed, the tail (the first body character) is deleted and the insert is dropped.
- What breaks: the first character of the first body line vanishes. Cmd+Z restores it.
- Likelihood: very low (Ctrl-T). Same cause as R1.
- Prevent: same policy as R1 (drop, do not narrow, for anything but replace-all). Test: `transposeChars` at `bodyStart` leaves DOC.

### R3. `deleteLine` on the first body line
- Scenario: Cmd+Shift+K on the first body line. The command deletes `[bodyStart-1, line.to]` (`commands dist:1472-1480`). Today the fence stays intact and the line disappears. Under narrowing the line text goes but a blank line stays; a second press does nothing. Under "drop" nothing happens.
- Likelihood: low.
- Prevent: pick one behavior and pin it with a test. Narrowing leaves a blank line (acceptable), dropping makes the key dead on that line (also acceptable); neither damages the fence. Do not leave it unspecified.

### R4. Backspace on a blank first body line becomes a no-op
- Scenario: the typical note. `editor-extensions.test.ts:356` shows the layout (`---\ntags: [a]\n---\n\n# Title`) and the caret lands on the blank first body line when a note opens (`getPositionAfterFrontmatter`, `editor.logic.ts:110-123`). Backspace there deletes the single break after the fence. Today that is safe (the blank line just disappears, the fence stays). The guard suppresses `[fenceEnd, bodyStart]`, so Backspace does nothing; only Delete or Cmd+Z removes the blank line.
- What breaks: an edit that works today and is harmless stops working. Not data loss, but it is on the owner's first keystroke path in new notes.
- Likelihood: medium to high that the owner presses Backspace there at least once.
- Prevent: when the character at `bodyStart` is `\n` (or `bodyStart === doc.length`), allow a deletion whose only protected part is that single break; it merges nothing into the fence. Keep suppressing it when the first body line has text. Test both layouts (T8).

### R5. Caret already inside the hidden range: typing is dropped silently
- Scenario: the caret gets there with no userEvent (search or backlink hit in a property such as `tags` or `status`: `MarkdownEditor.svelte:606-609`; saved tab caret; right-click in the top padding `:308`). The clamp only runs for `select` userEvents, so it never fires. The owner then types: a pure insert at 0 returns `false`, an insert inside the range is suppressed. The text vanishes with no feedback. Today the same keystrokes edit hidden YAML (also bad, but visible in Properties and recoverable).
- Dead keys and composition: the DOM shows the composed character, the state refuses it; `view.update([])` re-syncs (`view dist:7534-7536`); whether WKWebView leaves a stray composition node is not verified.
- Likelihood: low to medium (semantic search results often point into frontmatter chunks; owner uses search).
- Prevent: either also clamp selection-only transactions without a userEvent whose result lies in the hidden range (no doc change involved, so programmatic writes are unaffected), or clamp at the producers (`pendingScrollPosition` consumer). Whichever is chosen, add test T11. At minimum the Issue should say what happens here.

### R6. `invariants-harness.test.ts` probably fails on the edge doc, contrary to "no edits"
- Scenario: edge doc `bullet list right under frontmatter` (`fixtures/edge-corpus.md:84-93`): lines 1-4 frontmatter, line 5 `- one`. `boundaryLines` includes line 5. Step `endsAtLineStart` (`invariants-harness.test.ts:312-328`) dispatches selection `(line4.from, line5.from)` with userEvent `select`. The clamp turns it into a cursor at `bodyStart` (line 5), which reveals `- one`. The step then compares against a state whose selection ends one character earlier on line 4, where line 5 stays rendered, and reports "line 5 revealed by a range ending at its start" (inference from reading, not run).
- `19-meta-bind.md` is not affected: its first body line (7) is blank.
- What breaks: a red test that tests a state the guard now makes unreachable by user events. CLAUDE.md forbids weakening a test without approval.
- Prevent: say in the Issue that the harness step must skip (or dispatch without userEvent) when `from` is inside the hidden range, state why in the commit, and ask for that approval explicitly. Keep the rest of the harness unchanged.

### R7. Composition and dead keys (Portuguese) near the guard
- Scenario: `´` then `a` at the start of the first body line, or `~` + `a`, `^` + `e`, `c` cedilla via Option-C. userEvents are `input.type.compose.start`, `input.type.compose`, `input.type`; all match `isUserEvent('input')`. Edits start at `>= bodyStart`, so they pass. They only hit the filter when the caret is in the hidden range (R5).
- Likelihood of a bug: low. Cost if it happens: high for this owner (typing is the core path). The suite has no test with a composition userEvent and none in the engine the owner uses.
- Prevent: jsdom test that `input.type.compose.start` and `.compose` dispatches at `bodyStart` and mid-body apply exactly; e2e via CDP `Input.imeSetComposition` / `insertText` at the first body line (Chromium only). Add a manual smoke step for the owner in WKWebView (see T24).

### R8. Select-all semantics (owner decided, still needs pinning)
- Cmd+A, Cmd+C copies the body only; Cmd+A, Cmd+V no longer replaces the whole note including frontmatter (the pasted text lands after the existing fences, and pasted frontmatter becomes a body `---` block). Cmd+A on a frontmatter-only note (guard off, `bodyStart` null) still selects everything and Backspace wipes the fences (out of scope per the Issue).
- Likelihood: medium that the owner notices the paste-over workflow. Accepted by the owner for copy; the paste-over side effect was not mentioned in the Issue.
- Prevent: tests T9 and T10; mention the paste-over in the commit message.

### R9. Cmd+Up / Home onto a first body line that is a block widget reveals its source
- `frontmatterClick` deliberately keeps the selection when the first body line is a code block, table or math block (`frontmatter-field.ts:82-85,93`; tests `frontmatter-field-click.test.ts:128-140`). The keyboard clamp has no such exception, so Cmd+Up puts the caret at `bodyStart` and reveals that widget's source. Today the caret goes to a hidden line and the widget stays rendered.
- Likelihood: low (a table directly under the properties is uncommon; tables are daily for this owner though).
- Prevent: decide explicitly (accept, or skip the clamp when `soleBlockWidget` applies) and pin it with the same `it.each` shape as the click tests.

### R10. ArrowUp and goal column
- A clamp rewrites the range, so `goalColumn` is lost: ArrowUp from column 20 of the first body line goes to column 0, and the following ArrowDown lands on column 0 of line 2 (inference from `EditorSelection.range` building a new range). Shift+ArrowUp selects to the line start. Minor, visible.
- Prevent: accept and document, or keep `goalColumn` when building the clamped range. Cover by the e2e (T20).

### R11. Search and replace
- `findNext` onto a match that exists only in the frontmatter clamps to a cursor at `bodyStart` and loops on the same match; `replaceNext` never replaces a frontmatter match; replace-all skips frontmatter matches (intended). A regex replace-all that creates pure inserts (for example `^` -> `> `) includes an insert at 0, so the whole transaction is dropped, body lines included.
- Likelihood: low. Prevent: tests T13 and T14; accept and state.

### R12. Multi-cursor, rectangular selection, drag and drop
- `allowMultipleSelections` and `rectangularSelection()` are on (`editor-extensions.ts:135,147`). Backspace with a cursor at `bodyStart` plus a body cursor applies only the body edit (accepted by the Issue). A pure insert at 0 anywhere in the transaction drops every cursor's edit. `move.drop` / `input.drop` with the drop point in the top padding (position 0) is dropped entirely. Likelihood: low. Prevent: tests T15, T16.

### R13. Test design trap: the clamp hides the filter
- Because `select` events never leave the caret in the hidden range, every command-driven test passes through the clamp first, and the changeFilter is reachable only with a direct `dispatch` or a programmatic caret. A suite built only from commands can pass with a broken filter. Prevent: each guard gets one test where the other is bypassed (T4 vs T5).

### R14. Gate gap for programmatic writes
- The Issue gate runs one e2e spec. Real meta-bind and Properties writes through the guard are covered only by jsdom tests (`meta-bind-input-redraw.test.ts`, `undo-history-across-notes.test.ts:179-195`) and by specs the gate does not run (`click-reveal/meta-bind-*.spec.ts`, `frontmatter-write-keeps-scroll.spec.ts`, `properties-cross-note.spec.ts`). A guard that drops a user-tagged programmatic write would show only there.
- Prevent: add T6 (real `dispatchMetaBindUpdate` on the live-preview stack) to the jsdom file, and add `frontmatter-write-keeps-scroll.spec.ts` plus one `meta-bind-inline-select.spec.ts` to the targeted e2e run (still one spec file at a time to respect the one-E2E rule).

### R15. Performance (not measured)
- The guard runs on every user transaction. `frontmatterEnd` iterates the whole decoration set (2 entries per frontmatter line) on each call (`frontmatter-field.ts:53-59`). Cheap for normal notes. Order the checks cheapest first: userEvent test, then `tr.docChanged` / `tr.selection`, then `frontmatterEnd`, then a position compare. No existing test would catch a slowdown; the LP-PROFILE logs exist but no test reads them. Likelihood of a user-visible cost: very low.

### R16. Interactions with other transaction filters and mode switches
- `indentOnInput` is a transaction filter already in the stack (see Facts). The new selection clamp must return a spec built from `tr` (selection, effects, annotations, scrollIntoView) and must not touch `docChanged` transactions. A `select` transaction with no `selection` (effects only) must not throw.
- Source mode and the Troubleshooting kill switch remove the guard (`live-preview.ts:90-92,109-111`); no test covers switching live preview off and on at runtime with a note that has frontmatter.

## Test cases the Issue must add

All jsdom cases go in `frontmatter-field-keyboard.test.ts`, with the Issue's `FRONTMATTER` and `DOC`. Use full-doc equality. The copied `mount` helper must add `history()` (criterion 10). Items marked (prod keymap) should run through the real `createExtensions` stack and `runScopeHandlers(view, new KeyboardEvent('keydown', { key }), 'editor')` so closeBrackets and markdown commands are in the chain; one test per key is enough.

Criteria hardening (the Issue's items, changed):
- T1. Cmd+Up then Enter (criterion 1): also assert `selection.main.head === BODY_START` after `cursorDocStart` (proves the clamp).
- T2. `cursorDocStart` then `deleteCharForward`: assert the full doc equals DOC without its first body character (pins the clamp semantics).
- T3. Criterion 10 undo test with `history()` in the helper, and a second one that calls the real `dispatchMetaBindUpdate(view, 'status', 'done')` on the mounted live-preview view, then `undo(view)`.

New jsdom cases:
- T4. Filter without clamp: direct dispatch `{ changes: { from: 5, to: 8 }, userEvent: 'delete' }` (inside the hidden range) leaves DOC; also `{ from: 3, to: 5, insert: 'x' }` with `input.type`.
- T5. Clamp without filter: `select` dispatch with a range wholly inside the frontmatter yields a cursor at `BODY_START`; a range `[closingFence.from, BODY_START]` (head at `bodyStart`) yields a cursor at `BODY_START`; an effects-only transaction with `userEvent: 'select'` does not throw.
- T6. Real writers on the live-preview stack: `dispatchMetaBindUpdate` changes the property; a no-userEvent `replaceDoc`-shaped dispatch (`addToHistory: false`) rewriting the frontmatter applies; a `userEvent`-less selection into the hidden range is left alone (documents R5).
- T7. Body edits stay untouched: `input.type` at `BODY_START`, mid-body, and at the doc end; `moveLineUp` on the SECOND body line; `copyLineUp` on the first body line; `insertBlankLine`; Tab (`indentMore`) at `BODY_START`.
- T8. Blank first body line (`FRONTMATTER + '\nFirst body line.'`): Backspace at `BODY_START` removes the blank line and leaves the fence (if R4 is fixed) or leaves the doc unchanged (if accepted); either way assert the full doc. Same for `FRONTMATTER` alone (`bodyStart === doc.length`) and for `---\n---\nbody` (empty frontmatter).
- T9. Select-all variants: `selectAll` then `insertNewlineAndIndent`, then typing a character, then `input.paste` of `x`: each replaces only the body. Menu Select all in a mounted `MarkdownEditor` with a frontmatter doc (extend `MarkdownEditor.test.ts:329`): selection is `BODY_START..length`.
- T10. Frontmatter-only note `---\nstatus: todo\n---` (`bodyStart` null): guard off, `selectAll` selects `0..length`, Backspace behavior unchanged (pins the "out of scope" decision from the Issue Notes, as `frontmatter-field-click.test.ts:150-156` does for the mouse).
- T11. Caret programmatically at 0 and at 5 (no userEvent): typing `input.type` is dropped (pin the current choice) or clamped (if R5 is fixed); Backspace changes nothing; an ArrowDown (`cursorLineDown`) afterwards recovers to the body.
- T12. Composition userEvents: `input.type.compose.start` then `input.type.compose` then `input.type` of `a` with `'á'` at `BODY_START` and mid-body apply exactly; same dispatches at 0 are dropped without throwing. Use accented Portuguese text (`a`, `c`, `~`).
- T13. Search: `select.search` single range wholly inside the frontmatter becomes a cursor at `BODY_START`; `select.search.matches` with one range in each part keeps only the body range (criterion 9); `replaceAll`-shaped dispatch where a match straddles the boundary changes nothing for that match.
- T14. `input.replace.all` that includes a pure insert at 0 (regex `^`): pin whether it drops everything (Issue text) or narrows.
- T15. Multi-cursor: cursors at `BODY_START` and mid-body, Backspace: only the mid-body edit applies and the fence is intact.
- T16. `move.drop` / `input.drop` with the insert at 0 leaves DOC; `move.drop` inside the body works.
- T17. `deleteLine` and `transposeChars` at `BODY_START` (R2, R3): full-doc assertion for the chosen behavior.
- T18. Block widget as first body line (code, table, math), `cursorDocStart`: assert the chosen behavior (R9), same `it.each` shape as `frontmatter-field-click.test.ts:128-140`.
- T19. Mode switch: `livePreviewCompartment.reconfigure([])` then Backspace at the start edits the fence as in source mode; reconfigure back and the guard blocks again.
- T20. Production keymap (prod keymap): Backspace, Enter, Mod-a, Delete, Alt-ArrowUp at `BODY_START` through `runScopeHandlers` on `createExtensions({ isLivePreview: true })`, including the markdown first-line list item `- one` (edge corpus case) where `deleteMarkupBackward` and `insertNewlineContinueMarkup` run before the default commands.

Harness and existing-suite work:
- T21. Edit `invariants-harness.test.ts` `endsAtLineStart` for lines whose previous line start is inside the hidden range (R6), with owner approval stated. Add one assertion in the same file that a `select` dispatch whose range starts in the frontmatter ends up with no selection inside it (`checkInvariants`-level invariant), so the harness covers the guard on the whole corpus.

e2e (`frontmatter.spec.ts`, Chromium):
- T22. ArrowUp from the first body line keeps `activeLineText` on it (the Issue's change). Before leaving ArrowUp to e2e only, try `cursorLineUp` in jsdom: `arrow-reveal.test.ts:55-68` shows it works there with the `Range` stubs (not verified with hidden lines, so treat as a try).
- T23. `ControlOrMeta+Home`, ArrowUp then Backspace, and Backspace on the blank first body line of `---\nstatus: todo\n---\n\nFirst body line.` (R4).
- T24. Composition through CDP `Input.imeSetComposition` + `Input.insertText` at the first body line, asserting the accented character reaches the doc; and a Select all (`ControlOrMeta+a`) then Backspace leaving the frontmatter hidden and intact. Note in the commit that Chromium is not WKWebView; give the owner a 5-step manual smoke list for the app (dead-key accent on the first body line, Cmd+Up then Enter, Cmd+A then Cmd+C then paste into another app, Backspace on the blank first line, Properties panel edit then Cmd+Z).
- T25. Add to the Issue gate one write-through-the-guard e2e (`click-reveal/meta-bind-inline-select.spec.ts` or `frontmatter-write-keeps-scroll.spec.ts`), run alone.

## Not verified

- No test, build or app was run. R1, R2, R3 and R6 come from reading `ChangeSet.filter`, the command sources and the harness code; a short throwaway jsdom check (not written here, read-only task) would settle each.
- WKWebView behavior of a filtered composition transaction, native ArrowUp over `display:none` lines, and the Playwright Chromium result of `ControlOrMeta+Home` on the CI platform.
- Whether jsdom `cursorLineUp` lands on a hidden line (T22).
- Performance cost of the guard (R15).
- `scripts/e2e.sh` accepting the extra spec paths in T25 (the Issue states it takes one file; not opened).
