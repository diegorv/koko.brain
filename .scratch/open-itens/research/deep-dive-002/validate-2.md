# Validate 2: scouts s04, s05, s06, s07 vs Issue 002 (regression risk of the guard)

Read-only at HEAD `84fc88230`. Nothing was run (no vitest, e2e, build or app). Library facts come from reading `node_modules/.pnpm/@codemirror+*/.../dist/index.js`: state 6.7.6, commands 6.11.1, view 6.43.15, search 6.7.2, autocomplete 6.20.4, lang-markdown 6.5.2. Short names below: `state`, `commands`, `view`, `search`, `ac`, `lmd`. "Fact" means read in source. "Inference" means derived by reading, not executed.

Notation: `F1` = end of the closing fence line (the position of its line break), `B` = `bodyStart` = `F1 + 1`.

## Verdict in one paragraph

The scouts are right about the four headline regressions and I confirmed each in library source: (1) a dropped Backspace leaves the caret on the hidden fence and the next typing is eaten, (2) range narrowing applies half of `move.line` and writes a second `---`, (3) a straddling replace loses its inserted text, (4) Backspace on an empty first body line stops working. The Issue as written ships all four. Two more are real and missed or under-weighted: the invariants harness will very likely fail (so "existing suites stay green with no edits" is not achievable), and search Find Previous gets stuck on a frontmatter match. Undo and redo are safe for a stronger reason than the Issue gives (`filter: false`). Several scout risks are refuted or already covered by the Issue text. The fix is a small redesign of the two filters, not more special cases: drop whole transactions (except search replace), then clamp the resulting selection for every guarded user transaction.

## Library mechanics that decide everything (facts)

- `filterTransaction` (`state:2430-2465`): change filters run first. `false` drops all changes and maps the transaction's selection back through `tr.changes.invertedDesc`; a range array runs `ChangeSet.filter` and maps through the inverse of what was filtered (`state:2446-2454`, `tr.selection.map(back)` at `:2454`). Transaction filters run after, last to first, on the already-filtered transaction; a returned spec is re-resolved against `tr.startState` with filtering off (`:2457-2463`, `resolveTransaction` `:2416-2428`).
- `SelectionRange.map(change, assoc = -1)` (`state:1321-1331`): an empty range maps with the CALL's assoc (-1), not its own. A cursor at the edge of a re-inserted (dropped) character stays on the left side.
- `ChangeSet.filter(ranges)` (`state:892-922`): a pure insertion at the range start 0 passes (`pos == next && iter.len == 0`, `:898`); an insertion at the range end `B` passes; inside the range, deletions are kept as no-ops and insertions dropped; for a replace that straddles `B` the insert travels with the part before `B` (`iter.off == 0 ? iter.ins : 0`, `:902`, `:915`), so the inside part is dropped WITH its text and the outside part survives as a bare deletion.
- `deleteBy` (`commands:1175-1206`): the explicit selection is `EditorSelection.cursor(from, ...)` in post-change coordinates (`:1198`). Backspace at `B` deletes `[F1, B]` and puts the cursor at `F1`.
- `moveLine` up (`commands:1403-1432`): two independent changes, `{from: nextLine.from, to: block.from}` and `{from: block.to, insert: lineBreak + nextLine.text}`, explicit selection shifted by `-size`, `move.line`.
- History `pop` (`commands:540-558`): undo/redo dispatch with `filter: false` (`:553`), so neither filter ever sees them. `undoSelection` (`Mod-u`) is `select.undo`/`select.redo` WITHOUT `filter: false` and depends on its `fromHistory` annotation (`:531-539`).
- `EditorSelection.create([])` throws (`state:1465-1467`); a stale `mainIndex` is not validated.

## Confirmed risks

Severity: impact if it ships. Likelihood: for this owner (Portuguese with dead keys, meta-bind, Properties panel, views, templates, Quick Capture, tables, daily).

### C1. Dropped Backspace parks the caret on the hidden fence; typing is then silently eaten (s04 R1, s05 R1, s06 R1, s07 R1)

- Scenario: caret at `B`, Backspace (or held Backspace, Alt+Backspace, Cmd+Backspace, Ctrl-h at column 0). `deleteBy` sends `[F1, B]` with cursor `F1`. The changeFilter suppresses the change, the selection is mapped back with assoc -1 and stays at `F1` (`state:2454`, `:1321-1331`, `commands:1198`). The Issue's clamp only handles "no doc change and userEvent `select`" (Issue item 1), and this is `delete.backward`, so nothing clamps it. Each further Backspace walks one character left through hidden YAML; each typed character is an insertion strictly inside `[0, B)` and is dropped.
- Evidence it is invisible to the Issue's tests: the five-Backspace criterion and the Backspace criterion assert only the doc, which stays correct while the caret is hidden. The e2e "ArrowUp then Backspace leaves the frontmatter hidden and intact" passes too.
- Inference: in WebKit the DOM caret on a `display:none` line may land elsewhere and a typed character could come back through the DOM observer at a visible position; jsdom will show the dropped path. Either way the state caret is wrong.
- Severity high (looks like a dead editor on the exact keystroke the Issue targets). Likelihood high. **002 does not cover it.**

### C2. Narrowing `move.line` writes a second fence (s04 R3, s05 R2, s06 R2, s07 R3)

- Scenario: Alt+ArrowUp on the first body line. The deletion `[closing fence start, B]` is inside `[0, B]` and suppressed; the insertion `"\n---"` at the end of the body line is outside and applies. Result: `---\nstatus: todo\n---\nFirst body line.\n---\n\nEnd line.` (setext H2, autosaved). Fact from `commands:1403-1432` plus `state:892-922`.
- The Issue's own criterion "moveLineUp leaves the doc equal to DOC" fails under the Issue's own policy (item 2 prescribes narrowing for `move`). A build agent hits a contradiction between the fix direction and the test.
- Severity high (new corruption). Likelihood low to medium. **002's text causes it; its test would catch it.**

### C3. A straddling replace loses its text (s04 R4, s06 R3, s07 R3)

- Scenarios: (a) Ctrl-t (`transposeChars`, `move.character`, `commands:1368-1384`) at `B` is one replace `[F1, B+1)`: narrowing keeps `[B, B+1)` as a bare deletion, so the first body character disappears. (b) A mouse drag that starts in the body and ends in the top padding gives a `select.pointer` range with head 0 (`frontmatterClick` only acts when the PRESS maps into the padding, `frontmatter-field.ts:90-91`), which the Issue deliberately does not clamp. Typing or pasting over it is `{from: 0, to: X, insert}`. If the agent reads "a transaction that inserts at 0 returns `false`" as "a pure insertion" (the sentence before says "pure insertion"), narrowing deletes `[B, X)` and drops the typed or pasted text.
- Severity medium (body text deleted, typed text lost, Cmd+Z restores). Likelihood low (a) to low-medium (b: dragging up to select the first paragraph overshoots into the padding). **002 is ambiguous; not covered.**

### C4. Backspace on an empty first body line stops working (s04 R2, s07 R2)

- Scenario: doc `FRONTMATTER + '\nText'` (blank line right after the properties; also the direct result of the Issue's own trigger Cmd+Up, Enter). Backspace there deletes `[F1, B]`. Today the result is `---\n...\n---\nText`: the fence line is still exactly `---`, so `findFrontmatterBlock` (`parsers/frontmatter.ts:17-31`) still matches. That deletion is harmless. Under the guard it is suppressed (and C1 strands the caret).
- `help/examples/markdown-editor-vault/19-meta-bind.md:1-7` already has this shape (blank line 7 after the fence). Inference: the owner's own notes and templates were not read.
- Severity medium (a working keystroke becomes a no-op). Likelihood medium to high. **Not covered.**

### C5. Programmatic caret inside the hidden range: with the Issue as written, typing there is eaten until a click or arrow (s04 R5, s05 R4, s06 R5, s07 R4/R5)

Paths that put the caret below `B` with no userEvent, so the Issue's clamp never runs (all facts):
- Right-click in the top padding: `MarkdownEditor.svelte:302-309`, then typing or menu Paste (`:354-366`, `input.paste`).
- Source mode to live preview: `MarkdownEditor.svelte:662` dispatches effects only; a caret left in the YAML (the owner's raw-YAML escape hatch) is now hidden.
- Properties panel adding the first property to a note whose caret is at 0: `replaceDoc` carries no selection on purpose (`MarkdownEditor.svelte:157-160`, `:189-194`), the cursor maps through an insertion at 0 with assoc -1 and stays at 0, inside the new hidden block.
- Search jump: legacy search opens at `matches[0].position` (`features/search/SearchResult.svelte:123-126`, `core/editor/open-note-at.service.ts:44-48`, consumer `MarkdownEditor.svelte:600-609`); a match in a property value lands in the hidden range. Semantic chunks skip frontmatter (`src-tauri/src/semantic/chunker.rs:64-65`), so that path is safe.
- Typing a closing `---` by hand above existing text: the transaction that completes the fence has no block in `tr.startState`, so it applies, and the caret ends at `F1`; the following Enter is an insertion at `B - 1` and is dropped.
- Today these keystrokes corrupt the hidden YAML; with the Issue they vanish with no feedback. Better for data, but it is the owner's "guard drops typing" fear. Severity medium, likelihood low to medium. **Not covered.** The C1 fix (clamp after the filter for input/delete/move too) reduces each of these to one lost keystroke, with no extra rule.

### C6. Invariants harness: "stays green with no edits" is very likely false (s06 R4, s07 R9; extended here)

- `endsAtLineStart` (`invariants-harness.test.ts:312-322`) dispatches `select` `[line(n-1).from, line(n).from]` and compares against an UNCLAMPED reference (`view.state.update` with no userEvent, `:318`). `boundaryLines` (`:277-289`) takes top-level syntax nodes, and the markdown parser reads frontmatter as an HR plus a `SetextHeading2` (Inference from CommonMark; the harness comment at `:244` shows frontmatter lines are in scope).
- Edge doc "bullet list right under frontmatter" (`fixtures/edge-corpus.md:84-92`), 6 boundary lines so none sampled out:
  - L5 (`- one`, first body line): the range ends at `B`, the clamp makes it a cursor at `B`, line 5 is revealed, the bullet replace (`inline/handlers/simple-widget-handlers.ts:57-94`) disappears, so the diff reports it.
  - L4 (closing fence): the range is wholly below `B`, so the clamp's fallback cursor at `B` moves the touch from line 3 to line 5. `makeSetextHandler` picks `revealedBlockSyntaxDeco` vs `hiddenSyntaxDeco` for the underline line from `isRevealed(heading)` (`inline/handlers/heading-handler.ts:36-46`), so line 4's decoration differs from the reference.
- `19-meta-bind.md` L6 has the same setext case if it is sampled (it has more than 10 boundaries, `:283-288`).
- Severity: process. A build agent will either weaken the harness without approval (CLAUDE.md forbids it) or bend the guard to pass it. Likelihood high (Inference: must be confirmed by running the suite first). **002 asserts the opposite.**

### C7. `undo-history-across-notes.test.ts:595-604` silently stops testing its case (s05 R7, s06)

- Fact: note F is `---\ntitle: x\ntags: a\n---\n` (trailing newline), so `bodyStart = doc.length`, not null (`frontmatter-field.ts:62-65`), and the guard is on (live preview defaults on, `editor.store.svelte.ts:14`). The test inserts `X` at 0 with `input.type` (`:601`), which the guard drops. Both assertions still pass, but the keystroke-to-store path the test exists for no longer runs.
- Severity low (test hygiene). **002 lists this suite as "stays green with no edits", which is true and misleading.**

### C8. Find Previous gets stuck on a frontmatter match (missed by all scouts; s04 R7 says "one dead step")

- Fact: `findPrevious` searches before `selection.main.from` (`search:870-884`, `prevMatch` `:664-669` and `:731-734`). With the caret clamped to `B` and a match in the YAML (for example `todo`, `status`), it selects the hidden match, the clamp turns that into a cursor at `B`, and the next Find Previous finds the same hidden match again. It never wraps to the end of the note. Find Next loses one press per wrap. `replaceNext` (`:923-958`, `input.replace`) sets an explicit selection to the next match; if that match is hidden it is not clamped by the Issue's rule and the next Replace is suppressed.
- Severity low (no data impact, search navigation broken backwards). Likelihood low to medium. **Not covered.**

### C9. Multi-range clamp can throw or pick the wrong main range (s04 R11, s06 R7)

- Fact: `EditorSelection.create` throws on an empty array and does not validate `mainIndex` (`state:1465-1474`). `select.search.matches` (`search:886-916`) and `addCursorAbove` can leave the main range in the hidden part. A throw inside a transaction filter breaks every dispatch in that note.
- The Issue covers the empty case ("one cursor sits at `bodyStart`") but not "main removed, others remain". Severity high if it happens, likelihood low.

### C10. Stale doc line and two owner-visible consequences not written down

- `docs/LIVE-PREVIEW.md:36` says "Keyboard moves are not changed" for `frontmatterClick`; the Issue updates only the code comment at `frontmatter-field.ts:86`. Fact.
- After Cmd+A (body only), Cmd+V of a whole note copied from elsewhere replaces only the body, so its own `---` block lands as visible text (HR plus setext heading) under the kept properties. Today Cmd+A, Cmd+V replaces the properties too. Owner decision covers Cmd+A; this consequence is not stated.
- A first body line that is a block widget (table, code, math, queryjs, meta-bind button) is revealed by Cmd+Up, ArrowUp, PageUp and Cmd+A. The open path does the same today (`getPositionAfterFrontmatter`, `core/editor/editor.logic.ts:110-123`), so this is accepted, but it differs from `frontmatterClick` (`frontmatter-field.ts:82-85,93`) and the Issue does not say so.

## Refuted or already covered

- **s04 R10 / s05 R6, "drop at 0 if the insert-at-0 check runs after narrowing".** A changeFilter is one function returning `false` or ranges; there is no "after". The Issue says "a transaction that inserts at 0 returns `false`", which covers `move.drop` `[del, ins@0]` (`view:5141-5157`). Remaining risk is only the C3 wording ambiguity. Keep one test.
- **s04 R9 / s05 R5, programmatic writers caught by the guard.** Every writer found is keyed out: `dispatchMetaBindUpdate` has no userEvent (`widgets.ts:918-924`), nor do `replaceDoc` (`MarkdownEditor.svelte:189-194`), `note-writer.service.ts:77`, `file-history.service.ts:92`, `copy-block-link.service.ts:51`, wikilink navigation (`wikilink-navigation.ts:56`). App userEvent dispatchers are body-positioned: `widgets.ts:517,530` (table), `callout-field.ts:85-87`, `code-block-widget.ts:178-180`, paste handlers, `MarkdownEditor.svelte:345,362`. Templates and Quick Capture write files and reach the view through `replaceDoc` (`rg dispatch( src/lib/plugins src/lib/features` finds only the three services above). Covered by the Issue.
- **Undo/redo pass "because of the userEvent check".** True for a stronger reason: `filter: false` (`commands:553`). History records the post-filter transaction (`commands:221-250`), so a dropped or narrowed change cannot desync it. s05 R8 (grouping) is negligible. s05 R4 (undo restoring a hidden `startSelection`) is real only after a programmatic caret at 0 and cannot be filtered; accept.
- **s05 R3 / s06 R10, annotations lost on rewrite.** The Issue already requires effects, annotations and scrollIntoView in the returned spec. It must add `changes` once the clamp also runs on doc-changing transactions (C1 fix).
- **s04 R6 / s07 R10, dead-key composition.** No evidence that a composition change can start below `B`. `applyDefaultInsert` builds the change from the DOM diff of the edited line (`view:4410-4478`), and a dropped DOM change is resynced through `docView.domChanged` (`view:7512`, `:7529-7533`). The only real hazard is a filter that rebuilds a transaction it did not need to touch. Downgrade to low, prevented by "return the same `tr`".
- **s06 R9 / s07 R11 / s04 R12, cost.** `frontmatterEnd` iterates about 2 decorations per hidden line (`frontmatter-field.ts:53-59`); `computeFrontmatter` already does an O(doc lines) pass per doc change. Low, as long as the userEvent check comes first.
- **s07 R7, HR-delimited "frontmatter".** Pre-existing parser behavior; the guard just follows what is hidden. Not a guard regression.
- **s07 R8, re-deriving the range from text.** The Issue already says to use `frontmatterEnd`/`bodyStart` from `tr.startState`.
- **s04 R8, Cmd+Shift+K.** Real but cosmetic: narrowing leaves an empty line, dropping makes it a no-op. Pin whichever results.
- **Markdown keymap (not inventoried by any scout).** `markdown()` installs `Prec.high` Enter (`insertNewlineContinueMarkup`, `userEvent: "input"`) and Backspace (`deleteMarkupBackward`, `"delete"`) (`lmd:204-283`, `:350-389`, `:423-424`). Both act at or after the current line's start, and at column 0 they return false and fall through. Safe at `B`; `isUserEvent('delete')` matches the bare `"delete"`.
- **Autocomplete on a dropped `input.type`** still activates sources (`ac:949-961`); after the C1 clamp the context is at `B` with nothing typed. Harmless.

## Missed risks (new here)

- **M1 (C8).** Find Previous stuck on a hidden match.
- **M2 (C6 extension).** The harness fails on the setext underline at the closing fence (L4 edge doc, possibly L6 of `19-meta-bind.md`), not only on the bullet at L5.
- **M3 (C5 extension).** Properties panel's first-property insert keeps a caret at 0 inside the new block (`replaceDoc` maps with assoc -1). A new empty note followed by a Properties edit is a daily owner flow.
- **M4 (low, pre-existing).** `.view` files open as YAML in the same editor with live preview installed (`core/filesystem/fs.logic.ts:122`; no code-file switch in `MarkdownEditor.svelte`). A YAML file that starts with `---` and has a later `---` line is hidden today and would also become keyboard-locked. Inference that the owner opens such files in the editor.
- **M5 (low).** With all-or-nothing, a multi-cursor keystroke where one cursor is hidden drops the keystroke for all cursors once, then the clamp removes the hidden cursor. Acceptable; say so.

## Exact text Issue 002 needs

### Replace "Fix direction" items 1 and 2 with

> Both parts live in one exported extension in plugins/frontmatter-field.ts. They compute `B = bodyStart(tr.startState)` only after a cheap userEvent check, and they do nothing when `B` is null. A guarded transaction is a user transaction whose userEvent matches `input`, `delete`, `move` or `select` (`tr.isUserEvent`), except `select.pointer` (owned by `frontmatterClick`) and exactly `select.search` (see 3). Every path that changes nothing returns `true` (changeFilter) or the same `tr` object (transactionFilter), never a rebuilt spec, so typing and dead-key composition in the body pass untouched.
>
> 1. **Change policy** (`EditorState.changeFilter`, for `input`, `delete` and `move`). A change touches the hidden range when its `fromA < B`. This includes a pure insertion anywhere below `B`, 0 included; an insertion at exactly `B` does not touch. If no change touches, return `true`. For `input.replace` and `input.replace.all` (independent search matches) return `[0, B]`, so the body matches still apply. For every other event return `false`: the whole transaction's changes are dropped, so a paired or straddling edit (`move.line`, `move.character`, `move.drop`, a replace over a selection that starts in the hidden lines, a multi-cursor keystroke with one hidden cursor) never applies half. One exception keeps Backspace working on an empty first body line: return `true` for a transaction whose only change deletes exactly `[B - 1, B]` with no insert when the line at `B` is empty and `B < doc.length`. The fence line stays exactly `---`, so the result equals deleting that empty line.
> 2. **Selection clamp** (`EditorState.transactionFilter`, for every guarded transaction, after the change filter has run). Read `tr.newSelection`. Positions below `B` never move under this guard, so `B` is valid in new-doc coordinates; use `Math.min(B, tr.newDoc.length)`. If no range has `from < B`, return `tr`. Otherwise remove ranges whose `to < B`, raise the lower end of the others to `B` (a range that ends exactly at `B` becomes a cursor at `B`), and add one cursor at `B` if none remain. Keep the old main range as main if it survived, else use index 0; never call `EditorSelection.create` with an empty array or an out-of-range index. Return `{ changes: tr.changes, selection, effects: tr.effects, annotations: tr.annotations, scrollIntoView: tr.scrollIntoView }`. This covers Cmd+Up, Mod-Home, ArrowUp, PageUp, their shift-extends, Cmd+A and menu Select All (body only, owner decision 2026-11-12), select-all-matches, `select.undo` (it keeps `fromHistory`), and the caret left by a dropped Backspace, Alt+ArrowUp or typed character. A caret parked below `B` by a path with no userEvent (right-click in the padding, source-to-live-preview toggle, Properties first-property insert, a search jump into a property) therefore costs at most one keystroke, after which the caret sits at `B`.
> 3. `select.search` (Find Next / Find Previous) is not clamped: a match inside the frontmatter stays selected and invisible for one press, so Find Previous can step past it and wrap. Any edit there is still blocked by item 1.
>
> Undo and redo dispatch with `filter: false` (`@codemirror/commands` `HistoryState.pop`), so neither filter sees them. Do not use `atomicRanges`.

### Add to Notes ("Out of scope" / "Owner-visible change")

> - Accepted limits: a keystroke made with the caret below the body start (see Fix direction 2) is dropped once. Ctrl-t, Cmd+Shift+K and a cut whose selection starts in the hidden lines do nothing at the first body line. A replace-all match that crosses the closing fence is truncated (`ChangeSet.filter`). A first body line that is a block widget is revealed by keyboard moves to the top, as it already is when a note opens. A `.view` YAML file whose first line is `---` and that has a later `---` is hidden and keyboard-locked the same way (pre-existing hiding).
> - Owner-visible: Cmd+A, Cmd+C copies the body only; Cmd+A, Cmd+V of text that has its own `---` block keeps the current properties and puts the pasted block in the body as visible text.
> - A frontmatter-only note WITH a trailing newline (what the Properties writer emits) has `bodyStart === doc.length`, so the guard is on: typing at the end works, Backspace there does nothing, Cmd+A selects nothing.
> - Update `docs/LIVE-PREVIEW.md:36` ("Keyboard moves are not changed") together with the comment at `frontmatter-field.ts:86`.

### Replace the "existing suites stay green with no edits" criterion with

> - [ ] Run `invariants-harness.test.ts` before and after the guard. Expected to move: `endsAtLineStart` on the hidden-frontmatter lines (edge doc "bullet list right under frontmatter" L4 and L5; `19-meta-bind.md` L6 if sampled), because a keyboard selection can no longer end inside or at the end of the hidden frontmatter. Owner-approved edit, only if it fails there: skip that step when the line before `lineNo` starts below `bodyStart` (`frontmatterEnd(view.state) + 1`), and say why in the commit. No other harness change.
> - [ ] `undo-history-across-notes.test.ts:601` inserts at 0 of a frontmatter-only note, which the guard now drops. Owner-approved edit: insert at `view().state.doc.length` instead, so the case still drives an edit through the store.
> - [ ] frontmatter-field.test.ts, frontmatter-field-click.test.ts and meta-bind-writers.test.ts stay green with no edits.

(Both edits change existing tests, so the owner must approve them before launch; CLAUDE.md "never weaken tests".)

### Add acceptance criteria (same jsdom file; each asserts the full doc AND `view.state.selection`)

> - [ ] Backspace at `B`: doc equals DOC and `selection.main.head === B`. Then an `input.type` insert of `x` at the caret gives `FRONTMATTER + 'xFirst body line.\n\nEnd line.'`. Same for `deleteGroupBackward` and `deleteLineBoundaryBackward`.
> - [ ] Five `deleteCharBackward` on `FRONTMATTER + 'ab'`: after every call `head >= B`; after the fifth, the doc is exactly FRONTMATTER and a typed `x` lands at `B`.
> - [ ] `FRONTMATTER + '\nText'`, caret at `B`, `deleteCharBackward`: doc is `FRONTMATTER + 'Text'` and head is `B`.
> - [ ] `moveLineUp` on 'First body line.' at column 0 and at column 5: doc equals DOC, and head is `B` and `B + 5`. `moveLineDown` on the first body line still swaps it with the next line.
> - [ ] `transposeChars` at `B`: doc equals DOC.
> - [ ] A `select.pointer` dispatch `{anchor: B + 5, head: 0}` followed by `{changes: {from: 0, to: B + 5, insert: 'a'}, userEvent: 'input.type'}`: doc equals DOC (never body deleted with `a` missing).
> - [ ] `{changes: [{from: B + 2, to: B + 4}, {from: 0, insert: 'ab'}], userEvent: 'move.drop'}`: doc equals DOC.
> - [ ] A bare `{selection: {anchor: 0}}` (no userEvent), then an `input.type` insert at 0: doc equals DOC and head is `B`; a second insert at the caret lands at `B`.
> - [ ] Two cursors, main one at 2 (hidden), the other at `B + 3`; `input.type` at both: no throw, doc equals DOC, one cursor at `B + 3` is main.
> - [ ] `input.type.compose.start` then `input.type.compose` insertions at `B`: both apply, and the transaction filter returns the same object it received (no rebuilt spec on the pass path).
> - [ ] `input.replace.all` frontmatter and body `todo` case (already listed): keep it.
> - [ ] Search: with a `todo` match only in the frontmatter and one in the body, and the caret at `B`, `findPrevious` twice reaches the body match (it does not stay at `B`). `selectMatches` keeps only the body range, as main.
> - [ ] `undoSelection` after `selectDocStart`: no throw, `redoSelection` restores the clamped selection.
> - [ ] e2e, in addition to the listed ones: ArrowUp, Backspace, then type `x` puts `x` at the start of the first body line with the frontmatter hidden and intact; `Alt+ArrowUp` on the first body line leaves the doc unchanged.
> - [ ] Manual, real app (WKWebView, not automatable): dead-key accents (`'` + `e`, `~` + `a`, `^` + `o`) at column 0 of the first body line after Cmd+Up, on an empty and a non-empty line; a meta-bind button and a Properties edit with the caret on the first body line, then Cmd+Z.

### Change in "Risk"

> - **Risk:** medium. The filters run on every user transaction in every note with hidden frontmatter, and a bug there drops typing. Every pass path returns the original transaction object; no path may throw (pure arithmetic, no try/catch needed). Check the userEvent before calling `bodyStart`.

## Not verified

- Nothing was run. C1 caret positions, C2 and C3 doc results, and the C6 harness failures are traced from source; the new failing tests must confirm them first (the repo rule is to reproduce before patching).
- Whether WKWebView ever produces a composition change starting below `B`, and where the DOM caret goes on a `display:none` line, need the real app.
- The owner's real notes and templates were not read, so how often a blank line follows the frontmatter (C4) is inference. Vault mods (`MOD_APP.editorStore.editorView`, `plugins/mods/mod-app.service.ts:27`) can dispatch to the view; their source is outside the repo and was not read.
- The markdown parse of frontmatter as HR plus `SetextHeading2` is inference from CommonMark and the harness comment, not from running the parser.
