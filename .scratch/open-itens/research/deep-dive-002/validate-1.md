# Validate 1: adversarial check of scouts s01, s02, s03 for Issue 002

Read-only pass at HEAD `84fc88230` (the scouts read `a946f22f9`; none of the files below changed in between, checked by reading them at HEAD). Nothing was run: no vitest, e2e, app, or `node -e`. Library facts come from reading `@codemirror/state` 6.7.6, `@codemirror/view` 6.43.15 and `@codemirror/commands` 6.11.1 under `node_modules/.pnpm/` (versions read from each `package.json`). `LP/` = `src/lib/core/markdown-editor/extensions/live-preview/`, `state:` = state `dist/index.js`, and the same pattern applies to `view:` and `commands:`. F = fact read from code, I = inference.

## Verdict in one paragraph

The scouts are mostly right, and on the central defects the Issue as written is wrong. Three of them hold up against the library source: Alt+ArrowUp duplicates the fence under range narrowing, a suppressed Backspace walks the caret into the hidden YAML, and a straddling replacement loses its inserted text but still deletes the body part. Those defects mean the Issue's own `moveLineUp` criterion cannot pass. Its five-Backspace criterion passes while the caret is lost. Two scout claims are overstated. s01 R6 says that rebuilding a transaction alone breaks WebKit composition. s02's recommended "`false` for everything except replace" turns straddling pure deletions, which narrowing handles correctly, into no-ops. I found five risks the scouts missed or did not tie to a criterion. The most concrete: `invariants-harness.test.ts` very likely fails under the specified clamp, and the Issue forbids editing it. That pressure pushes the implementer toward weakening the clamp.

## Confirmed risks

Severity: what breaks. Likelihood: for this owner. Covered: whether Issue 002's current text prevents it.

### C1. `move.line` under range narrowing duplicates the closing fence

- Scenario: caret on the first body line, Alt+ArrowUp.
- Evidence (F): `moveLine` up emits `{from: nextLine.from, to: block.from}` and `{from: block.to, insert: lineBreak + nextLine.text}` with `userEvent: "move.line"` (commands:1417-1430). `ChangeSet.filter([0, B])` turns the first change into a retain because it lies inside the range. It keeps the second because it lies after `B` (state:892-922). Result: `---\nstatus: todo\n---\nFirst body line.\n---\n\nEnd line.`, a setext underline under the first body line.
- Severity: medium (wrong data, autosaved, undoable). Likelihood: low to medium.
- Covered: no. The fix direction (Issue line 10) lists `move` under narrowing, and the criterion at line 28 ("moveLineUp leaves the doc equal to DOC") cannot pass under it. The Issue contradicts itself.

### C2. A replacement that starts below `bodyStart` and ends in the body loses its insert and keeps the body deletion

- Scenario: a selection that straddles `B` (a pointer drag from the body into the top padding, see C5, or a programmatic selection), then a typed character, a paste or a dead-key composition. Also `transposeChars` (Ctrl-T, `move.character`, commands:1368-1385) at the body start.
- Evidence (F): `let ins = ... iter.off == 0 ? iter.ins : 0` attaches the insert to the first section, which is inside the range and suppressed. The section after `B` is kept as a bare deletion (state:900-917).
- Severity: high when hit (body text deleted, typed text gone, silent; Cmd+Z restores it). Likelihood: low to medium, through C5.
- Covered: no. The Issue's "pure insertion at 0 returns false" rule does not apply to a replacement.

### C3. A suppressed edit leaves the caret inside the hidden lines, and every later keystroke is swallowed

- Scenario: Backspace at the start of the first body line (the Issue's own key-repeat trigger). Also Cmd+Backspace, Option+Backspace, `delete.line`, and a dropped `move.*`.
- Evidence (F): `deleteBy` dispatches an explicit `EditorSelection.cursor(from, ...)` (commands:1197-1205). `filterTransaction` keeps the selection and only maps it through `back` (state:2445-2455). For an inverted one-character insertion at `B-1`, `mapPos(B-1, -1)` returns `B-1` (state:736-760, the `endA == pos && assoc < 0 && !len` branch). The Issue clamps only `select` transactions with no doc change (Issue line 9), so nothing moves the caret back. Each further Backspace targets `[pos-1, pos)` inside the range, is suppressed, and walks the caret one character further. Typing at an interior hidden position is suppressed too.
- Severity: high for the user (the editor looks frozen: no drawn caret, no typing) but no data damage. Likelihood: high. Held Backspace is the headline trigger.
- Covered: no. The criterion at line 26 ("five deleteCharBackward calls leave the doc exactly FRONTMATTER") passes in this broken state because it asserts only the doc.

### C4. A caret that is already hidden through a no-userEvent path turns "edits invisible YAML" into "typing silently dropped"

- Paths, all F:
  - Cmd+D or Cmd+E, or a first property added in the Properties panel, on a note without frontmatter whose caret is at 0. A note without frontmatter opens at 0 (`editor.logic.ts:110-123` returns 0). `docDiff` makes a pure insertion at 0 (`doc-diff.logic.ts`, `head = 0`, `tail` keeps the body). `replaceDoc` sets no selection (`MarkdownEditor.svelte:189-194`). `mapPos(0, -1)` keeps the caret at 0, which is now the hidden opening fence.
  - A right-click in the top padding (`MarkdownEditor.svelte:302-310`, plain `cursor(pos)`), then menu Paste (`:360-364`, `input.paste` at 0, returns `false` under the Issue).
  - Source mode to live preview with the caret in the YAML (`:657-664`, effects only).
  - A File History restore of `[0, len]`: a caret strictly inside the old doc maps to 0 (state:752).
  - A legacy text-search jump to a YAML match (`SearchResult.svelte:123-126`). This path runs only when FTS returns nothing (`SearchPanel.svelte:126-133`), so it is rare.
- Severity: medium (keystrokes lost, nothing explains why). Under the Issue text it never self-heals for plain typing, because only a `select` event clamps. Likelihood: low to medium. Cmd+D right after opening a note without frontmatter is the plausible daily path.
- Covered: no.
- Unknown: whether WKWebView relocates a DOM caret that CodeMirror puts in a `display:none` line. That would send a `select` and heal it. The e2e at `e2e/specs/live-preview/click-reveal/frontmatter.spec.ts:61-62` shows that Chromium keeps the state caret on a hidden line.

### C5. A pointer drag from the body into the top padding is not clamped

- Evidence (F): `frontmatterClick` returns `null` for a press below `bodyStart` (`LP/plugins/frontmatter-field.ts:91`). `bandDragHead` takes `posAndSideAtCoords` for the head (`LP/core/block-band-click.ts:187`), and that returns 0 in the padding in Chromium (comment at `frontmatter-field-click.test.ts:8-10`). The Issue exempts `select.pointer` from the clamp.
- What breaks: typing over that selection hits C2. Backspace or Cut narrows correctly to the body part, which is good, but then the caret follows C3.
- Severity: high when combined with C2, otherwise low. Likelihood: medium. Dragging to the top of a note is natural.
- Covered: no. The exemption is deliberate (block-widget reveal), but its consequence is not addressed.

### C6. Clamp rebuild traps

- `EditorSelection.create(ranges, mainIndex)` does not validate `mainIndex` (state:1463-1475), and it throws on an empty array.
- Concrete trigger: Cmd+Alt+ArrowUp (`addCursorAbove`) on the first body line adds the new range as main (`create(ranges, ranges.length - 1)`, commands:1146). After sorting, that range sits on a hidden line. With two body cursors and a hidden one, removing the hidden one leaves a `mainIndex` that can point past the end, so `selection.main` is `undefined` and the next read throws.
- A returned spec without `changes` drops the doc changes (state:2403-2415).
- Severity: high if hit (the editor throws). Likelihood: low.
- Covered: partly. The Issue says to forward effects, annotations and scrollIntoView and to fall back to one cursor, but it says nothing about remapping `mainIndex` or forwarding `changes`.

### C7. A blank first body line cannot be removed with Backspace

- Scenario: the Issue's own flow, Cmd+Up then Enter to make room, then Backspace on that new blank line to undo it. The break before it is the hidden fence's break, so the edit is suppressed. Delete (forward) and Cmd+Z work.
- Severity: low (UX). Likelihood: high for this exact flow.
- Covered: implicitly accepted (the e2e "ArrowUp then Backspace leaves the frontmatter hidden and intact"), never stated.

### C8. The test mount has no `history()` and no `allowMultipleSelections`

- Evidence (F): `frontmatter-field-click.test.ts:30-37` and `createMarkdownState` (`test-helpers.ts:59-82`) install neither. Production has both (`editor-extensions.ts:133,135`). Without `allowMultipleSelections`, the state collapses the selection to `main` after the filters (state:2632).
- Effect: the Issue's undo guard needs `history()` or `undo(view)` returns false. The `select.search.matches` criterion can pass for the wrong reason.
- Covered: no. The Issue says "copy its mount helper".

### C9. Some existing tests pass vacuously

- Evidence (F): `undo-history-across-notes.test.ts:595-607` dispatches `{from: 0, insert: 'X'}` with `input.type` into `---\ntitle: x\ntags: a\n---\n` (`bodyStart == doc.length`, guard on). The insert is dropped, and both `expect`s still hold.
- Covered: no. The Issue lists that suite as "stays green with no edits".

### C10. Search replace and find skip the frontmatter

- Replace-all leaves frontmatter matches unchanged. `findNext` onto a match that exists only in the YAML collapses to `B`. `replaceNext` (`input.replace`) cannot replace a hidden match.
- Severity: low. It is the intended behavior of the narrowing, but the owner sees it.
- Covered: partly. Replace-all is in a criterion, but the behavior change is not in the commit or Notes.

### C11. Block-widget first line: a keyboard clamp reveals its source

- When the first body line is a table, code block or meta-bind button, Cmd+Up or ArrowUp now lands on it and reveals the source. Opening the note already puts the caret there (`editor.logic.ts:110-123`).
- Severity: low. Likelihood: medium (the owner uses tables and buttons daily).
- Covered: no statement.

## Refuted or downgraded

- **s01 R6, "the rebuilt transaction breaks dead-key composition": refuted as stated.** A `changeFilter` array rebuilds the `Transaction`, but when no change is filtered it is equivalent: `tr.selection` stays `undefined` if it was, `back` is the identity, and effects are unchanged (state:2445-2455). The view never compares transaction identity. The project's WebKit bug is DOM restructuring by decorations plus an extra dispatched reconfigure (`composition-aware-bracket-matching.ts:26-84`). A synchronous filter adds neither.
  - What remains real (F): if a `transactionFilter` returns a spec with an explicit `selection` for a composition transaction that had none, `update.selectionSet` becomes true, and that changes how `DocView.update` finds the composition (`readCompositionAt`, view:2994-3001). So the clamp must return `tr` itself unless a range is actually below `B` (missed risk N4).
- **s02 section 5, "`false` (whole transaction) for every non-replace edit that touches below `bodyStart`": partly refuted.** For pure deletions that straddle `B`, narrowing is the correct result: it deletes the body part and keeps the fence and its break. Cases:
  - `deleteLine` on the last body line (commands:1471-1491, `from--`).
  - Cmd+A then Shift+Cmd+K.
  - Backspace or Cut over a dragged straddling selection.

  Under `false` they all become no-ops. Use `false` only for transactions whose change below `B` carries inserted text, and for `move.*` (see the policy below).
- **s01 R4 search jump: downgraded to low.** The legacy offset path runs only when FTS has no results (`SearchPanel.svelte:126-133`). Semantic and hybrid jump by line, and the chunker skips frontmatter.
- **s03 R2 "Cmd+D / Cmd+E are daily": real path, lower likelihood.** It needs a note with no frontmatter and the caret still at 0. Any click or arrow first moves the caret.
- **s02 R12 `indentOnInput` ordering: not a risk.** It returns `tr` for markdown (no language data). The ordering is informational only.
- **s01 R11, s02 R6, s03 R6 performance: confirmed low.** `frontmatterEnd` iterates about two decorations per frontmatter line (`frontmatter-field.ts:53-59`). Gating on the userEvent first keeps `select.pointer` mouse moves free.
- **s03 R11 (Quick Capture prepend) and copy block link from a padding right-click: pre-existing.** Neither carries a userEvent, the guard cannot see them, and they are not regressions of 002.
- **s03 R3 negative userEvent condition: confirmed, already covered** by "Programmatic writes must pass unchanged" plus the guard tests. Keep the positive-list wording.
- **s01 R12 (`---` horizontal-rule notes) and s03 R10 (null `bodyStart`): confirmed pre-existing and in Notes.** No change needed.

## Missed risks

### N1. `invariants-harness.test.ts` very likely fails under the specified clamp, and the Issue forbids editing it

- Evidence (F):
  - The edge doc "bullet list right under frontmatter" (`fixtures/edge-corpus.md:84-90`) has `- one` as its first body line.
  - `boundaryLines` takes top-level syntax nodes (`invariants-harness.test.ts:277-287`). Line 5 is the BulletList start, so `endsAtLineStart(5)` dispatches `select` over `[line4.from, B]`, which straddles `B` (`:313-323`).
  - The Issue clamps that range to a cursor at `B`. A cursor at `B` touches line 5, and `listMarkHandler` reveals the marker when the line is touched (`LP/inline/handlers/simple-widget-handlers.ts:63-64`).
  - The comparison state `earlier` is built without a userEvent and ends at `B-1`, so line 5 is not revealed there.
- Result (I, not run): "line 5 revealed by a range ending at its start".
- Risk: Issue line 36 says the suite stays green "with no edits". An implementer may then weaken the clamp, for example by not clamping straddling `select` ranges, which reopens C2.
- Fix: let that step skip targets whose range starts below `frontmatterEnd`, and say why in the commit. Changing a test premise needs the owner's approval, so the Issue should grant it explicitly.

### N2. Two Issue criteria do not exercise the filter

- `deleteCharForward after cursorDocStart` (line 27): under the clamp the caret is already at `B`, so the command deletes `F` and the filter never runs.
- The five-Backspace criterion (line 26): see C3.
- A hidden caret placed without a userEvent is needed to test Delete, Enter and typing below `B`.

### N3. Cmd+A then paste of a whole note text that has its own frontmatter

- The pasted `---` block now lands in the body under the old hidden frontmatter. It renders as a rule plus a setext heading and is autosaved. Today it replaces everything. This follows from the owner's Cmd+A decision.
- Likelihood: low to medium (copying a note or template text over another). State it in the commit message and Notes next to the copy change.

### N4. The clamp must be the identity when nothing is below `B`

- Covered in "Refuted" above (view:2994-3001). This matters for every keystroke the owner types with dead keys.

### N5. Non-note files keep live preview

- `EditorView.svelte:92-93` and `:136-146` mount `MarkdownEditor` for code files and kanban, canvas and collection sources. The frontmatter field is language-agnostic (`computeFrontmatter`, `frontmatter-field.ts:13-26`).
- A YAML or text file that starts with `---` and has a later `---` is hidden today (pre-existing). With 002 that hidden text also becomes keyboard-locked and excluded from Cmd+A in live preview.
- Likelihood: low (I). State it once; do not widen the fix.

## Policy that removes C1, C2, C3, C6 without the s02 regression

| Transaction | Condition | Result |
|---|---|---|
| no userEvent, `undo`, `redo`, `select.pointer`, `indent`, any other event | any | untouched (`true` / `tr`) |
| `input*`, `delete*`, `move*` | `!tr.docChanged`, or `bodyStart(tr.startState)` is null, or every changed range has `fromA >= B` | `true` |
| `move*` | some `fromA < B` | `false` |
| `input.replace*` | some change straddles (`fromA < B < toA`), or there is a pure insertion at 0 | `false` |
| `input.replace*` | otherwise | `[0, B]` |
| other `input*` / `delete*` | some change with `fromA < B` inserts text | `false` |
| other `input*` / `delete*` | only deletions reach below `B` | `[0, B]` (the straddling deletion keeps its body part) |
| `select*` except `select.pointer`, plus every `input*` / `delete*` / `move*` | some range of `tr.newSelection` has `from < B` (the change filter already ran) | rewrite the selection only (see below), else return `tr` |

Selection rewrite:
- Drop the ranges with `to < B`.
- Clamp the others to `EditorSelection.range(max(anchor, B), max(head, B))`.
- If nothing remains, use `EditorSelection.single(B)`.
- Otherwise compute `mainIndex` from the kept ranges: the index of the old main if kept, else 0.
- Return `{ changes: tr.changes, selection, effects: tr.effects, annotations: tr.annotations, scrollIntoView: tr.scrollIntoView }`.

`B` taken from `tr.startState` stays valid in the new doc, because no change below `B` survives the change filter.

Accepted costs, to state in the Issue:
- After a dropped keystroke the caret heals to `B`, and the next keystroke works.
- Typing over a straddling selection drops one keystroke and shrinks the selection to the body.
- Ctrl-T at the body start does nothing.
- A replace-all with a zero-width match at 0 does nothing.

## Text Issue 002 needs

Replace point 2 of "What to build" with:

> 2. **Change guard** (`EditorState.changeFilter`), only for `input*`, `delete*` and `move*` user events (`tr.isUserEvent`), and only when `tr.docChanged`, `bodyStart(tr.startState)` is not null, and some changed range has `fromA < bodyStart`. Otherwise return `true`. `move*`: return `false` (narrowing applies half of `moveLine` and duplicates the closing fence). `input.replace*`: return `false` if a change straddles `bodyStart` or inserts at 0, else `[0, bodyStart]`, so replace-all keeps its body matches. Any other event: return `false` if a change below `bodyStart` inserts text (narrowing would drop the insert and keep the body deletion), else `[0, bodyStart]`, so a straddling deletion removes only its body part. An insertion at exactly `bodyStart` passes.

Replace point 1's trigger sentence with:

> The clamp (`EditorState.transactionFilter`) runs on `select*` except `select.pointer`, and also on every `input*`, `delete*` and `move*` user transaction, against `tr.newSelection` after the change guard. A suppressed Backspace otherwise leaves its explicit selection inside the hidden lines (`deleteBy` sets it), and the next keystrokes are swallowed. Return `tr` itself unless some range has `from < bodyStart`. When rewriting, keep `changes: tr.changes`, recompute `mainIndex` from the kept ranges (`EditorSelection.create` does not validate it), and never add a selection to a transaction that does not need one (a `selectionSet` during composition changes how the view tracks it).

Add to Notes:

> **Accepted behavior:**
> - Backspace on the first body line never removes the line break above it, including on a blank line made by Cmd+Up then Enter (Delete and Cmd+Z do).
> - A keystroke on a caret that is already hidden (Cmd+D on a note without frontmatter, a right-click in the top padding then Paste, a source-to-live-preview toggle with the caret in the YAML, a File History restore) is dropped once, the caret moves to the body start, and the next keystroke works.
> - Ctrl-T at the body start, typing over a drag selection that reaches the top padding (one keystroke dropped, selection shrinks to the body), and a zero-width replace-all at 0 do nothing.
> - Search replace and find skip the hidden frontmatter.
> - Cmd+A then a paste of text with its own frontmatter puts that block in the body.
> - A first body line that is a block widget shows its source after Cmd+Up, as on note open.
> - Files other than notes that start with `---` behave the same in live preview.
>
> Put the user-visible items in the commit message.

Replace or add criteria:

> - [ ] Mount for this file adds `history()` and `EditorState.allowMultipleSelections.of(true)` to the copied helper.
> - [ ] moveLineUp with the caret on the first body line leaves the doc equal to DOC, and the head is `>= bodyStart`.
> - [ ] Backspace at the start of the first body line leaves DOC with `selection.main.head === bodyStart`. In `FRONTMATTER + 'ab'`, five deleteCharBackward calls leave FRONTMATTER with head `=== bodyStart`, then a dispatch `{insert 'x' at head, userEvent: 'input.type'}` gives `FRONTMATTER + 'x'`. The same head check applies to deleteGroupBackward and deleteLineBoundaryBackward.
> - [ ] With a selection set without a userEvent to `[0, doc.length]` or `[bodyStart - 3, bodyStart + 5]`, an `input.type` replacement leaves DOC, and the selection afterwards starts at `bodyStart`. transposeChars at the body start leaves DOC.
> - [ ] With a selection `[bodyStart - 3, bodyStart + 5]` set without a userEvent, deleteCharBackward deletes only `First` (`[bodyStart, bodyStart + 5)`). deleteLine on the only body line of `FRONTMATTER + 'only'` leaves exactly FRONTMATTER.
> - [ ] Caret set to 0 without a userEvent: deleteCharForward, insertNewlineAndIndent and an `input.type` insert each leave DOC, and the head ends at `bodyStart`. The next `input.type` applies at `bodyStart`.
> - [ ] Multi-range: a `select.search.matches` dispatch with ranges (hidden, body) where main is the body range, and with (hidden, body, body) where main is hidden. Each ends with `selection.main` defined and only body ranges. addCursorAbove on the first body line (with a stubbed `moveVertically` if jsdom needs it) does not throw.
> - [ ] Identity: for an `input.type` and an `input.type.compose.start` / `input.type.compose` pair at `bodyStart` and mid-body, and for a `select` fully in the body, a probe `transactionFilter` registered before the guard (it runs after it) sees `tr.selection` unchanged from the dispatched spec.
> - [ ] Widget writers as the first body block keep working: `input.table.add-row`, `input.callout.set-type` and `input.codeblock.set-language` shapes apply unchanged.
> - [ ] Replace the line "The existing suites stay green with no edits" with: frontmatter-field.test.ts, frontmatter-field-click.test.ts and meta-bind-writers.test.ts stay green with no edits. In invariants-harness.test.ts, `endsAtLineStart` skips a target whose previous line starts below `frontmatterEnd` (the clamp moves that selection to the body start, which reveals the first body line on purpose). undo-history-across-notes.test.ts:595-607 types at the end of the doc instead of position 0 so it still exercises the keystroke path. Both test edits are approved by this Issue and are named in the commit.

## Not verified

- Nothing was executed. N1's failure is an inference from reading the harness, the list handler and the clamp rule; run `invariants-harness.test.ts` first after the guard compiles. C1 to C3 match s02's EXECUTED results, and I re-derived them from the source.
- WKWebView behavior for a DOM caret inside a `display:none` line, and real dead-key composition at the first body line, need the owner's manual check.
- Vault mods (`~/kokobrain-vaults/kokobrain-mods-src`) were not searched (outside the working directory). The owner should grep there for `.dispatch(` with a `userEvent`.
