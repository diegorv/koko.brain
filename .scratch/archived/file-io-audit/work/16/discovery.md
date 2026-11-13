# Issue 16 discovery: lossless kanban round trip

## Files that change
- src/lib/plugins/kanban/kanban.types.ts:1-59: optional layout fields (all optional, so every existing `{ lanes, archive, settings }` literal still type-checks):
  item `extraLines` (raw lines after the card), lane `headLines` (raw lines between `## ` and the first card) and `gapLines` (trailing blank run),
  board `preamble` (frontmatter + lines before the first lane), `archiveLayout` (separator line, blank spacer, `## Archive` line, head, gap), `settingsBlock` (raw lines + parse-time JSON snapshot + trailing lines), `lineEnding`.
- src/lib/plugins/kanban/kanban.logic.ts:4-7 regexes, :54-112 parser rewritten line-based, :118-145 serializer emits the layout; undefined layout falls back to the current canonical shape (`[""]` head, `[""]` gap, `---`/``/`## Archive`/``), so app-created boards serialize byte-identically to today.
- kanban.logic.ts:163-201 `addItem` / `updateItem` replace `/\r?\n/g` with a space; `removeItem` hands the removed card's `extraLines` to the previous card (or the lane head) so prose after a deleted card stays in place.
- src/lib/plugins/kanban/KanbanCard.svelte:69-76 Shift+Enter preventDefault (does nothing); :91-99 commitEdit replaces newlines with a space.

## Plan (parser)
1. Detect CRLF (`includes('\r\n')`), normalize, split on `\n`.
2. Settings block: first line `%% kanban:settings` up to the next line starting `%%`. Lines before it plus non-blank lines after it are the body; the trailing blank run after it is kept as the block's trail. Unchanged settings (JSON snapshot equal) re-emit the raw lines, so malformed JSON survives byte for byte; changed settings write the canonical block.
3. Frontmatter: line 0 is `---`, a closing `---`/`...` exists, and line 0 is not the archive form: those lines go to `preamble` verbatim.
4. Archive form: `---`, blank lines, `## Archive`. Any other `---` is a raw line. After the archive heading every non-card line is raw.
5. Each raw line goes to the current sink: preamble, lane head, or the previous card's `extraLines`. On closing a section the trailing blank run moves to `gapLines` (an itemless lane keeps its first blank line in the head so a later add stays canonical).

## Tests (prior art)
- Move the three repro files into src/tests/lib/plugins/kanban/ (KanbanView harness at src/tests/fixtures/KanbanViewHarness.svelte, same as KanbanView.test.ts).
- The F144 repro asserts the old Shift+Enter behavior; it is rewritten to the chosen model (Shift+Enter prevented, paste joined with a space).
- Round-trip property test: seeded hand-rolled generator in kanban.logic.test.ts (no fast-check in package.json; no new dependency).

## Defaults taken
- Raw lines travel with their card on move / archive / restore; on delete they stay in place (handed to the previous entry). Deleting a lane deletes its raw lines.
- A settings change on a board whose block is malformed replaces the block with the canonical one (the malformed JSON had no effect). A card action keeps it.
- Mixed line endings: any `\r\n` means the whole file is written CRLF.
- Heading/card whitespace is canonicalized (`##  A ` -> `## A`); not data loss, not covered by the property test (app-written input).
- An archive section is written when it has cards or non-blank raw lines; an empty one is dropped as today.

## Risks
- A settings block in the middle of the file is moved to the end (content kept).
- An unterminated-looking frontmatter whose closer is really the archive `---` would swallow the board; requires an unclosed `---` on line 0, ignored.
- A file with `---` on line 0, then a lane heading, a prose line and a lone `---`, with no card between them, is read as frontmatter (`frontmatterEnd`). That lane does not show on the board, but its bytes survive a round trip. Accepted (review-2 nit 1).
