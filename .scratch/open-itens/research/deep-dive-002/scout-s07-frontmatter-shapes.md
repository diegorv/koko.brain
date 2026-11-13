# Scout s07: frontmatter shapes vs the Issue 002 guard

Read-only. Checked at HEAD `a946f22f9`. Nothing was run (no vitest, no e2e, no app). Facts are cited path:line; inference is marked "Inference". Library facts come from reading `node_modules/@codemirror/*/dist/index.js`, not from running them.

## Summary

The shape list itself is mostly safe, because the guard reads the hidden range from the decoration set (`frontmatterEnd`, plugins/frontmatter-field.ts:53-59) and so agrees with what is hidden for every shape: no frontmatter, unterminated, one fence, CRLF, comments, long blocks, later `---` rules all give either `null` (guard off) or the right `bodyStart`. A naive bodyStart that re-parses text would get several shapes wrong (section 3).

The real regression risks are not the shapes but what the specified filters do next to the fence. Three of them I could trace to library source and they are likely for this owner:

1. A suppressed edit at the start of the first body line moves the caret INTO the hidden fence (`tr.selection.map(back)` with assoc -1, state dist :2454, :1321-1331), and the Issue's selection clamp only handles `select` events, so the next typed character is dropped silently.
2. Backspace on an EMPTY first body line (a blank line right after the frontmatter) is harmless today and becomes a blocked edit.
3. `[0, bodyStart]` narrowing is wrong for `move.line`: the deletion half is suppressed but the reinsertion half applies, so Alt+ArrowUp on the first body line appends a duplicate `---` below it (a setext heading). The Issue's own test "moveLineUp leaves the doc equal to DOC" would fail under the specified policy.

Plus: a single replacement that straddles `bodyStart` is truncated to a bare deletion (data loss of one character), and typing a closing `---` by hand leaves the caret hidden so the following Enter is dropped.

## 1. Facts (path:line)

Hidden range and bodyStart
- `computeFrontmatter` hides lines `openIdx..closeIdx` with a per-line replace plus line class: plugins/frontmatter-field.ts:13-26, core/hide-lines.ts:14-20. Line breaks are not covered.
- `frontmatterEnd` = max `to` of the decoration set, `null` when no set, empty set, or decorator disabled: frontmatter-field.ts:53-59. It iterates every decoration (about 2 per hidden line).
- `bodyStart` = `end + 1`, or `null` when `end >= doc.length`: frontmatter-field.ts:62-65. So `---\nk: v\n---` (no trailing newline) is `null`; `---\nk: v\n---\n` gives `bodyStart === doc.length` (an empty last line).
- Fence regex `/^---\s*$/` (parsers/frontmatter.ts:10); block = line 0 fence plus FIRST later fence line (parsers/frontmatter.ts:17-31). `\s*` allows trailing spaces/tabs. Parser tests: empty block (parsers/frontmatter.test.ts:49), trailing spaces (:57), "stops at the first closing fence" (:77), no closing fence returns null (:35), single line returns null (:44).
- `frontmatterField.update` recomputes on `docChanged` or `forceDecorationRebuild` only: frontmatter-field.ts:36-44. `computeFrontmatter` calls `getAllLines` (whole doc, core/get-all-lines.ts:4-10) on every doc change, so the guard's own per-keystroke cost is small next to what already runs.
- Registration: live-preview.ts:47 (`BLOCK_EXTENSIONS.frontmatter`), pushed only when the decorator is enabled, live-preview.ts:90-92. Rules doc: docs/agents/live-preview-rules.md rule 4 (frontmatter is a hand-written StateField, kill switch via `BLOCK_EXTENSIONS`).

CRLF
- The doc never holds `\r`: `toDocText` normalizes `\r\n?` to `\n` before every doc build (MarkdownEditor.svelte:96-98, used in `freshState` :108 and `replaceDoc` :178). No `lineSeparator` facet anywhere in `src/lib` (rg empty). CodeMirror splits on `\r\n?|\n` by default, so even a test that builds a state from a CRLF string gets LF lines.
- `getPositionAfterFrontmatter(toDocText(...))` places the open caret: MarkdownEditor.svelte:407, :495; editor.logic.ts:110-123 returns `min(pos, content.length)`, so a frontmatter-only note without trailing newline opens with the caret at the end of the closing fence (inside the hidden range, but `bodyStart` is `null` there so the guard is off).

Other parsers disagree with the editor (the guard must not reuse them)
- Properties side uses `/^---\r?\n([\s\S]*?)\r?\n---/` (core/frontmatter/properties.logic.ts:39): needs at least one line between fences (so the empty block `---\n---` is not a match, see :523-525), and closes on any line that merely STARTS with `---` (`----`, `---x`). The editor needs a whole-line fence. Same split in core/note-creator/explicit-organization.logic.ts:15-17.
- Properties writer always emits a trailing newline: properties.logic.ts:696 (`---\n${yaml}\n---\n${body}`), so after the first Properties write a note has `bodyStart != null` even with an empty body.

Writers that must keep passing (no userEvent)
- `dispatchMetaBindUpdate` replaces `[0, frontmatterEnd]` in one change: widgets.ts:915-924. A caret at `bodyStart` maps to after the new frontmatter (replacement section, caret at its end edge; state dist mapPos). A caret at 0 stays at 0.
- Tab/external content sync `replaceDoc`: MarkdownEditor.svelte:175-204 (`addToHistory: false`, no userEvent, no explicit selection), driven by MarkdownEditor.svelte:623-650.
- Table widget buttons carry `input.table.add-column` / `input.table.add-row` (widgets.ts:517, :531-533); changes sit at or after the first table line end, so a table that is the first body line stays at or after `bodyStart`.
- Programmatic caret dispatches with no userEvent that can land in the hidden range: right-click moves the caret to `posAtCoords` (MarkdownEditor.svelte:308, posAtCoords in the top padding maps to 0), pending scroll-to-position (MarkdownEditor.svelte:~605, `lineStartToOffset` can return 0 for a hit on line 1), `moveCursorToContextMenuPos` (:386). None carry a userEvent, so the Issue's clamp does not touch them.
- Menu Paste is `input.paste` at the caret (MarkdownEditor.svelte:360-364); cut is `delete.cut` (:345); Select All is `selectAll(view)` (:373-377).

Library behavior (read)
- `ChangeSet.filter(ranges)` (state dist :892-922): changes inside a range are dropped; a REPLACEMENT section that straddles the range end is split: the inner part is dropped WITH its insert, the outer part stays as a deletion with `ins 0` (`iter.off == 0 ? iter.ins : 0`, :902, :915). A pure insertion at the range start passes; an insertion strictly inside is dropped.
- `filterTransaction` (state dist :2430-2468): when a change filter narrows, the selection is mapped with `tr.selection.map(back)` (:2454), default assoc -1 (:1321). A cursor at the edge of a dropped deletion therefore stays on the hidden side.
- `deleteBy` (commands dist :1175-1203) returns `EditorSelection.cursor(from)` where `from` is the deletion start; for Backspace at the first body line that is `bodyStart - 1`.
- `moveLine` (commands dist :1402-1427): up on the first body line emits `{from: nextLine.from, to: block.from}` (deletes the closing fence line and its break) plus `{from: block.to, insert: "\n" + fenceText}`, selection shifted by the fence size, userEvent `move.line`.
- `transposeChars` (commands dist :1370-1383, `Ctrl-t` via the emacs keymap on macOS): at a line start emits one replacement `[pos - 1, pos + 1)` with `move.character`.
- Composition: `applyDOMChangeInner` tags `input.type.compose` / `.compose.start` (view dist :4467-4475). A transaction that ends with no doc change after filtering is recovered by the observer marking tiles dirty on mutation (view dist :7516-7545, `readMutation` `markDirty`); Inference: a dropped composition change redraws the line, not run.

Existing tests that overlap shapes
- frontmatter-field.test.ts:64 (empty block), :72 (many properties), :98 (frontmatter not on line 1), :93 (empty doc).
- frontmatter-field-click.test.ts:17-37 (constants and `mount`), :125-140 (first body line is a code block, table or math block), :150-155 (no body line after the fence).
- e2e/specs/live-preview/click-reveal/frontmatter.spec.ts:36-47 pins Enter after a padding click inserting a blank line above the first body line (stays valid under the guard), :53-65 pins ArrowUp onto a hidden line (the Issue changes it).
- invariants-harness.test.ts: corpus includes `19-meta-bind.md` (:79); step "type a character" inserts `x` with `input.type` at each boundary line start and deletes it with `delete` (:331-340); `endsAtLineStart` dispatches a `select` range ending at a line start (:313-322).

## 2. Shape by shape: what the guard should do, what a naive bodyStart gets wrong

`B` = `bodyStart`, `E` = `frontmatterEnd`. "Guard off" means `bodyStart` is `null`.

| # | Shape | Should do | Naive bodyStart error |
|---|---|---|---|
| 1 | No frontmatter | Guard off, zero behavior change. Must also be cheap: `frontmatterEnd` returns at `set.size === 0`. | Running `findFrontmatterBlock`/`getAllLines` in the filter instead (O(doc) per keystroke). |
| 2 | Empty block `---\n---\nText` | B = 8. Guard on. Backspace at B blocked (see R2), Enter at B works. | Properties regex (properties.logic.ts:39) does not match this shape; a regex like `---\n(.+\n)*---\n` misses it. |
| 2b | `---\n---` (no newline after) | Guard off (`E >= doc.length`). | `doc.line(closeIdx + 2)` throws RangeError. |
| 3 | Unterminated `---\nk: v\n\nBody` | No block, guard off, typing free. | Treating line 1 as hidden anyway. |
| 3b | Unterminated but a later `---` rule exists | The editor hides everything up to that rule (parsers/frontmatter.ts:25-29). The guard follows the hidden range: edits there are blocked, Cmd+A excludes it. Consistent with what the user sees (nothing), but see R7. | Assuming "later `---` is body". |
| 4 | Only one fence line (`---` alone, or last line) | Guard off (`lines.length < 2` or no match). | n/a |
| 5 | YAML comments (`# c` lines) | No effect: lines inside the block are hidden whatever they hold. `--- # c` as the opening fence is NOT a fence (regex), so no block and no guard. | Matching `---` prefix (`startsWith('---')`) closes on `----` or `---x`. |
| 6 | CRLF file | Identical to LF: the doc has no `\r` (MarkdownEditor.svelte:96-98). | Measuring raw `content` offsets (the store keeps raw CRLF text until first edit, :92-94): positions are longer than doc positions. The guard only sees doc positions, so it is safe if it never reads the store. |
| 7 | Body starts right after the fence, no blank line (the normal case; e2e SAMPLE) | B = start of that line. Enter at B works, Backspace at B blocked, caret may sit at B. | `B = E` (no +1) leaves the break after the fence unprotected, so Backspace at B still glues `---First`. `B = E + 1` is right only when `E + 1 <= doc.length`; the existing helper handles it. |
| 8 | First body line is a table, code fence, math block or callout (frontmatter-field-click.test.ts:125-140) | Selection clamp puts the caret at B, which touches the widget's first line and reveals its source (reveal rule: core/reveal.ts touchedLines). The mouse path avoids this on purpose (frontmatter-field.ts:82-85). Keyboard Cmd+Up reveals it. Inference: acceptable, because the open path already puts the caret at B (MarkdownEditor.svelte:407 via editor.logic.ts:110-123), so "caret at B with a block widget on line B" already exists. Table +col/+row (widgets.ts:513-533) stay at or after B. | Special-casing widgets in the keyboard clamp (would leave the caret hidden). |
| 9 | First body line is a heading | Caret at B reveals the `#` marker, normal. | none |
| 10 | First body line is `---` (HR) | `findFrontmatterBlock` closes on the FIRST later fence, so this line is body. B correct. | Scanning for the last `---`, or re-parsing after a user edit. |
| 11 | Later `---` rules in the body | Ignored (block closes at the first). Edits near them are unaffected. | Using the last fence line as E. |
| 12 | Very long frontmatter (hundreds of lines) | Per user transaction one iteration over about 2N decorations: microseconds, small next to `computeFrontmatter`. Check `userEvent` first and compute B only if it matches; skip `select.pointer` before computing B (frontmatterClick already calls `bodyStart` per mouse move, frontmatter-field.ts:91,103). | Computing B in both filters unconditionally on every transaction, including viewport/effect-only ones. |
| 13 | Frontmatter-only note WITH trailing newline (`---\nk: v\n---\n`; what Properties writes) | B = doc.length, guard on. Typing at B works. Backspace at B blocked (R2). Cmd+A gives a cursor at the end. | Treating `B == doc.length` as "no body, off" (mismatch with `bodyStart`, which is non-null here). |
| 14 | Frontmatter-only note WITHOUT trailing newline | Guard off (Issue: out of scope). The open caret sits at the end of the fence, Enter appends a newline and from then on the guard is on (evaluated per `tr.startState`). | n/a |
| 15 | Frontmatter typed into existence | See R4. At the keystroke that completes the closing fence, `tr.startState` has no block, so the guard is off for that transaction and the edit applies; the NEXT transaction sees the block. | Computing B from `tr.state` vs `tr.startState` inconsistently for ranges (changes are in startState coordinates). |
| 16 | BOM before the first `---` | Regex fails on the BOM, so no block and guard off. Inference: not verified whether the file loader strips a BOM. | n/a |
| 17 | YAML block scalar containing a `---` line | The editor closes at it and shows the rest as body. The guard protects only up to that line. Same as today's hiding. | n/a |

## 3. Regression risks for Issue 002

Likelihood is for this owner (Portuguese typing, meta-bind, Properties panel, templates, Quick Capture, tables).

### R1. Suppressed edit leaves the caret in the hidden fence, next typing is dropped  (high likelihood, user-visible)
- Scenario: caret at the start of the first body line, Backspace (or Cmd+Backspace, Alt+Backspace, a held Backspace running past the line start), then type.
- What breaks: `deleteBy` returns `cursor(bodyStart - 1)` (commands dist :1190-1192). The changeFilter drops the deletion and maps the selection back with assoc -1 (state dist :2454, :1321), so the caret ends at `bodyStart - 1`, the end of the closing fence. The transactionFilter clamp the Issue specifies fires only for `select` events with no doc change, and this transaction is `delete.backward`. Every later `input.type` at `bodyStart - 1` is an insertion strictly inside `[0, bodyStart]`, which `ChangeSet.filter` drops (state dist :895-918). The user presses keys and nothing happens until they click or press an arrow (an arrow is a `select` event and clamps). The Issue's tests ("doc equals DOC", "five Backspaces leave exactly FRONTMATTER") all pass in this broken state.
- Prevention: in the transactionFilter, also clamp the resulting selection (ranges below B go to B) for any user transaction of type `input`, `delete` or `move`, using the selection the filtered transaction ends with. Keep it a no-op when no range is below B.
- Same hazard for `move.line` and any `delete.*` whose cursor target is in the hidden range.

### R2. Backspace on an empty first body line is blocked  (high likelihood if the owner's notes or templates keep a blank line after the frontmatter; Inference, templates not read)
- Scenario: doc `---\nk: v\n---\n\nText`, caret on the empty line after the fence, Backspace to remove the blank line. Also the frontmatter-only note with trailing newline (shape 13) and the note where Enter at the end of a bare fence created the first body line.
- What breaks: today this deletes `[E, E+1]` and yields `---\nText`, fence intact (the result equals deleting the break AFTER the empty line). Under `[0, bodyStart]` it is suppressed (also R1's hidden caret). The owner cannot delete a blank line below the properties with Backspace; Delete forward still works.
- Prevention: when `doc[B] === '\n'` (first body line empty), rewrite a deletion of exactly `[E, B]` into `[B, B+1]` in the transactionFilter (identical resulting text, fence untouched), or state the limitation in the Issue and the commit. Test it either way so the behavior is a decision, not an accident.

### R3. `move.*` narrowing keeps half of a paired change  (certain for Alt+ArrowUp on the first body line; the Issue's own test exposes it)
- Scenario: `moveLineUp` on the first body line (doc: FRONTMATTER + `First body line.\n\nEnd line.`).
- What breaks: changes are `{[E-3.. fence line start, B)}` delete (wholly inside `[0, B]`, suppressed) and `{from: block.to, insert: "\n---"}` (after B, applies). Result: `---\nstatus: todo\n---\nFirst body line.\n---\n\nEnd line.`, a duplicated fence under the body line, which markdown renders as a setext heading. The Issue's criterion "moveLineUp leaves the doc equal to DOC" fails under the specified policy.
- Same class: `transposeChars` at the start of the first body line (macOS `Ctrl-t`) is one replacement `[B-1, B+1)`; `ChangeSet.filter` splits it, drops the inner half with its insert and keeps `[B, B+1)` as a bare deletion (state dist :902, :915), so the first body character is deleted. A replace-all whose regex match crosses the fence boundary (a multi-line pattern such as `todo\n---\nFirst`) has the same truncation. Likelihood: low for the owner (rare shortcuts), certain for `moveLineUp`.
- Prevention: per-userEvent policy. `move.*`: return `false` if any change has `fromA < B`. Everything else: narrow, but return `false` when any change with a non-empty insert has `fromA < B < toA` (straddling replacement). Pure deletions that straddle can stay narrowed (deleting the body part of `deleteLine` on a single body line leaves the break, which is fine). Keep the replace-all test (it needs narrowing) and add the straddle test.

### R4. Typing the frontmatter by hand: the caret ends hidden and Enter is dropped  (low to medium; the owner uses the Properties panel mostly)
- Scenario: note with a body, caret on an empty line 1, type `---`, Enter, `a: b`, Enter, `---`. The third dash of the closing fence creates the block while `tr.startState` has no block, so that edit applies, but the caret is now at `E` (hidden). The next Enter or character is an insertion at `E = B - 1`, dropped. Before the guard Enter worked: it inserted a break after the fence and the caret moved onto a visible line.
- Also: typing only the opening `---` at the top of a note that has a later `---` rule makes a huge hidden block at once (shape 3b), with the caret at 3 inside it.
- Prevention options: (a) extend the R1 clamp to a transaction that creates the block (compare `tr.startState` having no frontmatter with the new doc's line 1 matching the fence and a later fence; cheap check, only when line 1 is a fence); (b) treat an insertion of exactly `\n` at `E` as equal to an insertion at `B` (same resulting text), which also covers Enter at the end of a bare fence. If the owner accepts the rare-case rule, document the limitation instead.

### R5. Programmatic caret in the hidden range turns typing into silence  (low to medium)
- Scenario: right-click in the top padding then type or Paste (MarkdownEditor.svelte:308, :360-364), a search or wikilink jump to line 1 (MarkdownEditor.svelte:~605), a caret that maps to 0 after an external rewrite of a note whose caret was at 0 (new empty note, add a property in the panel, return to the editor: the caret stays at 0).
- What breaks: before, typing there corrupted the fence; after, `input.type`/Paste at 0 returns `false` and at 1..E is suppressed, with no feedback. Net better for data, but a "dead editor until you click" state.
- Prevention: also clamp selection-only transactions that carry no userEvent (they are programmatic caret moves and there is no change to preserve), accepting that a first-line block widget then shows its source as it does on open; or leave it and state it. Whatever is chosen, the Issue should name it.

### R6. Cursor-at-B reveals a first-line block widget on Cmd+Up and ArrowUp  (medium likelihood for notes that open with a queryjs block or table; low severity)
- Scenario: first body line is a code fence, table or math block (shape 8). Cmd+Up or ArrowUp from below now lands at B and reveals the source; before, the caret went to hidden position 0 and the widget stayed rendered.
- It is also the only keyboard way to put a line above that widget (Cmd+Up, Enter), which becomes safe. The mouse path keeps the selection on purpose (frontmatter-field.ts:82-85); the keyboard path will not. Not verified in a browser.
- Prevention: none needed beyond saying it in the commit; test that Cmd+Up then Enter on a table-first note leaves the table intact below a blank line.

### R7. Hidden "frontmatter" that is really an HR-delimited section  (low)
- Scenario: a note that starts with a `---` decoration line and has another `---` later (shape 3b). The editor already hides everything between them. With the guard, Cmd+A and copy exclude it and edits there are blocked, where before they were invisible edits.
- Prevention: none in this Issue; it is a parser bug (`findFrontmatterBlock` accepts a first-line HR). Mention it in Notes so a future reviewer does not blame the guard.

### R8. Re-deriving the hidden range from text instead of the decoration set  (preventable)
- A guard that recomputes bodyStart with a regex or `properties.logic.ts` helpers disagrees with the hidden range for `----` and `---x` closers, the empty block, and trailing-space fences (shapes 2, 5). Always use `frontmatterEnd(tr.startState)` / the module's `bodyStart`, in `tr.startState` coordinates, since `tr.changes` ranges are startState offsets.

### R9. Existing invariants harness may move  (medium, Inference)
- `invariants-harness.test.ts` mounts help-file corpora that start with frontmatter (:79) and walks boundary lines. The `select` step (:313-322) dispatches a range ending at a line start with `userEvent: 'select'`; for a line inside the frontmatter the clamp rewrites it, and the step then compares decorations against `view.state.update({selection: earlier})` built from the unclamped selection (:319-321), which can differ. The "type a character" step inserts `x` at line starts including line 1 (:331-340): that now becomes a no-op, then deletes the first `-` with `delete`, also a no-op. Whether `boundaryLines` includes frontmatter lines was not checked. The Issue forbids editing the suite, so decide before the build agent hits it: either the harness never lands there (confirm) or the Issue authorizes a narrow edit.

### R10. IME and dead keys  (low for shapes; see other scouts for the general case)
- Composition input is `input.type.compose[.start]` and matches `isUserEvent('input')` (view dist :4467-4475). A composition at B has `fromA >= B` and passes. A composition that starts with the caret hidden (R1/R4/R5) is dropped; Inference: CodeMirror redraws from the dirty tile after a mutation with no doc change (view dist :7516-7532), not run. Preventing R1/R5 removes the way to get there.
- jsdom cannot run a real composition; cover only "a change at B with `input.type.compose` applies".

### R11. Perf of the guard  (low)
- Per user transaction: two `frontmatterEnd` calls (one per filter) over about 2N decorations. Check `userEvent` and the cheap preconditions first. Do not call `getAllLines`/`findFrontmatterBlock` in a filter. The existing `computeFrontmatter` already does an O(doc lines) pass per doc change (frontmatter-field.ts:14, core/get-all-lines.ts:4-10), so no new asymptotic cost.

### R12. Goal column and scroll on the clamped selection  (low)
- Returning `EditorSelection.create(...)` from the filter drops `goalColumn` from `moveVertically` ranges, so an ArrowDown right after a clamped ArrowUp forgets the column. Keep `scrollIntoView` and effects in the returned spec (the Issue says so). Cosmetic.

## 4. Test cases the Issue must add (beyond its list)

Use `mount` and constants from frontmatter-field-click.test.ts:17-37, real `livePreviewExtensions`, full-doc equality.

Shape matrix (each: the edit applies or is blocked exactly as the table says)
1. No frontmatter: `Hello\n\nWorld`: cursorDocStart, Enter, Backspace behave as before (doc changes, selection moves normally). Guard no-op.
2. Empty block `---\n---\nText`, caret at B=8: Enter works (`---\n---\n\nText`); deleteCharBackward leaves the doc unchanged.
3. `---\n---` (no newline): Backspace at the end still edits the fence as today (guard off, pins the out-of-scope decision, like frontmatter-field-click.test.ts:150-155).
4. Unterminated `---\nk: v\n\nBody`: typing at line 1 start and Backspace at line 2 work.
5. Only one fence line `---`: typing works.
6. Fence with trailing spaces `---  ` as the closing line: B is after the spaces; Backspace at B leaves the doc unchanged.
7. Opening fence plus YAML comment lines (`---\n# note\nk: v\n---\nBody`): guard on, same results as the plain case.
8. CRLF input `'---\r\nk: v\r\n---\r\nBody'` built with `createMarkdownState`: `doc.toString()` has no `\r` and Backspace at B is blocked (documents that CRLF reduces to the LF case; do not expect `\r` assertions).
9. No blank line after the fence (DOC) and blank line after the fence (`FRONTMATTER + '\nText'`): Enter at B in both gives the expected full doc.
10. First body line is a table / code fence / `$$` block / heading: cursorDocStart then Enter gives `FRONTMATTER + '\n' + block...`; cursorDocStart then deleteCharBackward leaves the doc equal to the original; `input.table.add-row` and `input.table.add-column` dispatches (as widgets.ts:517, :531-533 build them) still apply to a first-body-line table.
11. First body line is `---` (HR): `---\nk: v\n---\n---\nText`; B is the second `---`; deleteCharBackward at B leaves the doc unchanged; the HR line can be deleted with Delete forward from B.
12. Later `---` rules: `FRONTMATTER + 'a\n\n---\n\nb'`: Backspace on the later HR line start works (guard does not treat it as a fence).
13. Very long frontmatter (300 properties): moveLineUp on the first body line leaves the doc unchanged; a typed character at the end of the doc applies. (Not a timing assertion.)
14. Frontmatter-only with trailing newline `FRONTMATTER`: B = doc.length: typing 'x' at B applies; Backspace at B leaves the doc unchanged; selectAll leaves a cursor at doc end and then deleteCharBackward leaves FRONTMATTER.
15. Typing into existence: start from `\nHello\n\n---\n\nWorld` (blank line 1, a later HR), type `---` char by char with `input.type` at 0..2, then assert the doc and that `frontmatterEnd` becomes non-null, then assert what the Issue decides for the caret and for a following Enter (R4). Also: `'\nBody'`, type `---\na: b\n---` and then Enter: the decision must be explicit (applies, or documented as dropped).

Caret and the R1-R3 gaps
16. After deleteCharBackward at B: `selection.main.head === B` (not `B - 1`), and a following `insertText('x')` produces `FRONTMATTER + 'xFirst body line...'`. Same for `deleteToLineStart`/Cmd+Backspace and `deleteGroupBackward` at B.
17. Empty first body line (`FRONTMATTER + '\nText'`), caret at B, deleteCharBackward: the outcome matches the decision for R2 (recommended: doc becomes `FRONTMATTER + 'Text'`).
18. moveLineUp on the first body line leaves the doc exactly DOC AND the selection head is still at or after B (R3, R1). moveLineDown on the first body line works (insertion at B passes): result `FRONTMATTER + '\nFirst body line.'`-style full doc, fence intact.
19. transposeChars at B (macOS `Ctrl-t`): doc unchanged (R3, straddling replacement). A replace-all that includes a match crossing the fence boundary (`todo\n---\nFirst`) leaves the doc without that match replaced and without losing the body text; a replace-all whose matches are wholly in the frontmatter and wholly in the body changes only the body (the Issue's case, keep).
20. deleteLine on the only body line leaves `FRONTMATTER` intact with the fence untouched (narrowed deletion keeps the break).

Programmatic paths and IME
21. A no-userEvent change at 0 (`dispatchMetaBindUpdate` shape: `changes: {from: 0, to: B, insert: newFrontmatter}`) applies and the caret at B maps to the end of the new frontmatter; Properties-shaped `{from: E, insert: '\nk2: v'}` inside the block applies; `undo` restores.
22. `userEvent: 'input.type.compose.start'` change at B applies; the same change at 0 or inside the block does not (R10).
23. Programmatic caret in the hidden range (`selection: cursor(0)` with no userEvent) then `input.type` 'x' at the caret: assert whatever R5 decides (recommended: caret ends at B, or the Issue states "dropped").
24. Kill switch: with `{ frontmatter: true }` (decorator off) every edit above behaves as today (the Issue has one case; add the empty-first-body-line Backspace and moveLineUp here).
25. Stale-state check across a block change: a user transaction that deletes the closing fence while `bodyStart` was computed from `tr.startState` (only reachable via undo/external paths): assert the guard computes from `startState`, not from `tr.state`, by dispatching an `undo` that rewrites the fence and confirming it applies.

e2e (Chromium)
26. In addition to the Issue's list: ArrowUp then Backspace then type 'x' on the first body line leaves the frontmatter hidden and inserts 'x' on the first body line (R1; jsdom cannot cover ArrowUp). Open a note whose first body line is a table, press `ControlOrMeta+Home`, assert what is shown (R6).

## 5. Not verified

- No code was run. R1, R2, R3 and the truncation case come from reading `@codemirror/state` `filterTransaction`/`ChangeSet.filter`/`SelectionRange.map` and `@codemirror/commands` `deleteBy`/`moveLine`/`transposeChars`; a jsdom run of tests 16-19 settles them in minutes and should happen before the guard is written (test first, per the project rules).
- The owner's real templates were not read, so how often a blank line follows the frontmatter (R2) is inference.
- Whether `boundaryLines` in the invariants harness includes frontmatter lines (R9) was not checked.
- BOM handling by the file loader (shape 16) was not checked.
- The Chromium behavior of ArrowUp over `display:none` lines and of dropped composition changes (R10) is inference from library source.
