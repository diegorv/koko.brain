# 16: Kanban board actions delete unmodeled lines; CRLF boards and boards with frontmatter lose lanes

**Status:** resolved

**Blocked by:** none

**What to build:** Make the kanban round trip lossless. `parseKanbanBoard` (src/lib/plugins/kanban/kanban.logic.ts:54-111) keeps only `## ` lanes, `- [ ]` / `- [x]` items, the archive separator and the settings block, and `serializeKanbanBoard` (:118-145) writes only that model, so every board action (KanbanView.svelte:79-90 -> onContentChange -> autosave) deletes everything else. Fix, in kanban.logic.ts so every writer gets it:
1. Unrecognized lines (prose, `### Sub`, indented notes, `- [/]`, `- [-]`, `* [ ]`, blank-line runs) are kept as raw entries in place: attached to the lane or card they follow, or to a board preamble before the first lane, and re-emitted at the same position. The cards under a `### Sub` line stay under it.
2. Line endings: detect CRLF on parse, parse the normalized text, and write CRLF back when the source used it.
3. A leading frontmatter block (`---` ... `---` at the top) is kept byte for byte and is never read as the archive separator.
4. `---` is the archive separator only in the form the serializer writes (a `---` line followed, after blank lines, by `## Archive`); any other `---` is an unrecognized line (fix item 1 below).
5. A `%% kanban:settings` block whose JSON does not parse is kept raw and written back unchanged (fix item 2 below).
6. Card text is single-line: Shift+Enter in the card textarea does nothing (preventDefault), and `commitEdit`, `updateItem` and `addItem` replace `/\r?\n/` with a space, which also covers a multi-line paste (fix item 4 below).

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** src/lib/plugins/kanban/kanban.logic.ts, src/lib/plugins/kanban/KanbanView.svelte:79-90, src/lib/plugins/kanban/KanbanCard.svelte:66-99,187-196, src/tests/lib/plugins/kanban/
Priority: P1
Severity: data-loss
Source: file I/O audit, deep-dive group(s) o09-undo-canvas-kanban (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Details

- Verdict: CONFIRMED_BY_TEST (deep dive priority P1, severity data-loss)
- Claims covered: feature-writers-5, fidelity-5

**How a user hits it.** App-created .kanban files are LF and have no frontmatter (kanban.service.ts:18). Path (a): the user types prose, ### headings, indented notes or '- [/]' items in the app's Kanban source mode, toggles back to board view and does any action (move, toggle, add, switch view mode); those lines are gone 2 s later. Path (b): an external tool writes CRLF or adds frontmatter, and the next action wipes or scrambles the board. A CRLF board first shows as empty, a visible warning, but any action then destroys it. Path (c): the app writes unmodeled lines itself. In board view the user edits a card, presses Shift+Enter (or pastes several lines) and commits; the extra lines are written as bare lines that the next reopen drops (see the fix sketch).

**Recoverable from.** Path (a): usually File History, since the source-mode text was autosaved in-app first. Path (b): externally written bytes are never snapshotted, so only git or an external backup.

**Root cause.** src/lib/plugins/kanban/kanban.logic.ts:4-6 (regexes with no \r tolerance; '---' treated as the archive separator even when it opens frontmatter), :61-109 (keeps only ## headings, [ ]/[x] tasks and the separator), :118-145 (serializer emits only the model); written back by KanbanView.svelte:79-90

**Evidence.** HEADING_RE /^##\s+(.+)$/ and TASK_RE /^-\s+\[([xX ])\]\s+(.*)$/ have no m flag, and '.' does not match '\r', so CRLF lines never match and the board has no lanes. ARCHIVE_SEPARATOR_RE matches the frontmatter opener (:69-72), headings in archive mode are skipped (:78-82) and items go to the archive (:103-104). Every other line is ignored. applyChange (KanbanView.svelte:79-90) -> onContentChange (app/EditorView.svelte:79) -> autosave. Repro uses the real KanbanView through the repo's KanbanViewHarness and clicks 'List view'.

**Repro test.** `.scratch/file-io-audit/repro/o09-undo-canvas-kanban/kanban-unmodeled-content.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
FAIL keeps prose...: AssertionError: expected '## To Do\n\n- [ ] Card one\n\n## Done…' to contain 'Prose the user typed in source mode.'. FAIL CRLF: AssertionError: expected '\n%% kanban:settings\n{\n  "viewMode"…' to contain 'Card one'. FAIL frontmatter: AssertionError: expected '---\n\n## Archive\n\n- [ ] Card one\n…' to contain 'tags: [work]'
```

**Fix sketch.** Normalize \r\n before parsing (or use \r?$), detect and preserve a leading frontmatter block, keep unrecognized lines attached to their lane or card, or refuse to serialize when lines would be dropped and send the user to source mode.

Keeping unrecognized lines does not cover four more cases. Fix each:

1. A `---` line among the lanes, for example a horizontal rule typed in source mode, matches ARCHIVE_SEPARATOR_RE (kanban.logic.ts:6, checked at :69-73). From there every `## Lane` heading is skipped (:78-82) and its cards go to the archive (:103-104), so the next action rewrites those lanes as archived cards under `## Archive`. The line is recognized, so the unrecognized-line fix does not help. Treat `---` as the archive separator only in the form the serializer writes (followed, after blank lines, by `## Archive`, kanban.logic.ts:132-134), and keep any other `---` in place as an unmodeled line.
2. A `%% kanban:settings` block whose JSON does not parse is still stripped by SETTINGS_BLOCK_RE (:59). parseSettings returns `{}` for it (:26-30) and serializeSettings returns `''` for `{}` (:41), so the next action deletes the block. Keep the raw block when its JSON does not parse and write it back unchanged, or refuse to write.
3. A `### Sub` line does not match HEADING_RE (:4 needs whitespace right after `##`), so the line is dropped and the cards under it join the previous lane (:105-106). Keep the line in place so the cards under it stay under it.
4. Path (c), the in-app writer. KanbanCard.svelte:69-71 prevents only plain Enter, so Shift+Enter or a multi-line paste into the card textarea (:187-196) puts `\n` into the card text. commitEdit trims only the ends (:91-94), and updateItem (kanban.logic.ts:187-200) and serializeKanbanBoard (:126) write `item.text` raw. The file gets `- [ ] buy eggs` plus a bare `and milk` line, which the parser drops on reopen (TASK_RE, :5); a continuation line starting with `## ` becomes a new lane (HEADING_RE, :4). Pick one model and enforce it in kanban.logic.ts, not only in the component: reject newlines (preventDefault on Shift+Enter, and replace `/\r?\n/` with a space in commitEdit, which also covers a paste, and in updateItem / addItem), or serialize continuation lines indented under the item and fold indented lines back into the previous item on parse.

- [x] Failing tests come first. Move `.scratch/file-io-audit/repro/o09-undo-canvas-kanban/kanban-unmodeled-content.test.ts` and `.scratch/editor-data-safety/repro/gap-findings-and-kanban/kanban-unmodeled-lines.test.ts` / `kanban-multiline-card.test.ts` under `src/tests/` and see them fail on their bug assertions
- [x] Prose, `### Sub` headings, indented lines and other task states (`- [/]`, `- [-]`, `* [ ]`) typed in source mode survive a board action in place (repro case 'keeps prose, sub-headings, indented lines and other task states')
- [x] A CRLF board shows its lanes and cards, and a board action keeps every card and writes CRLF line endings back (repro case 'a CRLF board keeps its lanes and cards')
- [x] A board with a leading frontmatter block keeps the block byte for byte and its lanes stay lanes after a board action (repro case 'a board with frontmatter keeps the frontmatter and its lanes')
- [x] A round-trip property test: parse then serialize of any board the app wrote, plus arbitrary unrecognized lines between lanes and cards, returns the input unchanged
- [x] A `---` line between two lanes survives a card action, and the lanes and cards after it stay lanes and cards (none move to the archive)
- [x] A board whose `%% kanban:settings` block holds malformed JSON keeps that block byte for byte after a card action (or the action refuses to write)
- [x] A `### Sub` line inside a lane survives a card action, and the cards that followed it still follow it
- [x] Card text with a newline never reaches the file as a bare line: `updateItem` with `a\nb` and with `a\n## b`, then serialize, parse, toggle and serialize again, keeps all of the text (joined by a space, or as an indented continuation, with newlines replaced by a space) and creates no lane
- [x] Shift+Enter and a multi-line paste in the card textarea (KanbanCard.svelte) follow the same model: the committed card is saved as one card that survives a reopen and the next card action

## Audit evidence (editor-data-safety, 2026-11-02)

- Finding F143 (P0, occasional). Its paragraph, `- [-]` and `* [ ]` lines are path (a) above. Its `---` among lanes, malformed settings block and `### Sub` card reassignment are fix items 1 to 3.
- Finding F144 (P0, rare): fix item 4 and path (c).
- Repro tests (to run one, copy the group folder to `src/tests/audit-repro/gap-findings-and-kanban/`, see `.scratch/editor-data-safety/repro/README.md`):
  - `.scratch/editor-data-safety/repro/gap-findings-and-kanban/kanban-unmodeled-lines.test.ts`, case 'a "---" line between lanes does not swallow the lanes after it (logic round-trip)' (item 1). The case 'toggling one card through the real board UI keeps the paragraph and other list lines' repeats path (a) through the real board.
  - `.scratch/editor-data-safety/repro/gap-findings-and-kanban/kanban-multiline-card.test.ts`, case 'the text typed after Shift+Enter survives reopen + the next card action' (item 4).
  - Items 2 and 3 have no repro test; verified by reading the code below.
- Code path, verified against the current code: src/lib/plugins/kanban/kanban.logic.ts:4-7 (HEADING_RE, TASK_RE, ARCHIVE_SEPARATOR_RE, SETTINGS_BLOCK_RE); :23-31 (parseSettings returns `{}` on malformed JSON); :37-43 (serializeSettings returns `''` for `{}`); :59 (the settings block is stripped whether or not it parses); :69-73 (`---` sets inArchive); :78-82 (headings skipped in archive mode); :103-107 (archive and previous-lane assignment); :118-145 (serializer writes `item.text` raw at :126); :187-200 (updateItem stores the text as given). src/lib/plugins/kanban/KanbanCard.svelte:66-76 (handleKeydown prevents only plain Enter); :91-99 (commitEdit trims only the ends); :187-196 (the card textarea). src/lib/plugins/kanban/KanbanView.svelte:79-90 (applyChange -> serializeKanbanBoard -> onContentChange). The other text inputs on the board (KanbanLane.svelte:249, :361, KanbanView.svelte:500) are single-line `<input>` elements and cannot hold a newline.

## Comments

- 2026-11-02, branch issue/16-kanban-lossy-reserialize: kanban parse/serialize now keeps unmodeled lines (prose, sub-headings, indented lines, other task states, `---`), CRLF line endings, leading frontmatter and malformed settings blocks byte for byte; card moves/archive/restore leave raw lines in place (`takeItem`); multi-line card text is joined to one line in updateItem and KanbanCard. Tests: pnpm check 0 errors; kanban tests 7 files, 264 passed; full suite at e8b75e4f exit=0 (433 files, 9978 passed, 1 skipped, 1 todo), build ok. Reviews: round 1 CHANGES_REQUESTED (5 findings, fixed in 8d1152c1), round 2 APPROVED, round 3 APPROVED.
