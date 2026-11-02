# 16: Kanban board actions delete unmodeled lines; CRLF boards and boards with frontmatter lose lanes

Status: needs-triage

**Blocked by:** none
Priority: P1
Severity: data-loss
Source: file I/O audit, deep-dive group(s) o09-undo-canvas-kanban (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Details

- Verdict: CONFIRMED_BY_TEST (deep dive priority P1, severity data-loss)
- Claims covered: feature-writers-5, fidelity-5

**How a user hits it.** App-created .kanban files are LF and have no frontmatter (kanban.service.ts:18). Path (a): the user types prose, ### headings, indented notes or '- [/]' items in the app's Kanban source mode, toggles back to board view and does any action (move, toggle, add, switch view mode); those lines are gone 2 s later. Path (b): an external tool writes CRLF or adds frontmatter, and the next action wipes or scrambles the board. A CRLF board first shows as empty, a visible warning, but any action then destroys it.

**Recoverable from.** Path (a): usually File History, since the source-mode text was autosaved in-app first. Path (b): externally written bytes are never snapshotted, so only git or an external backup.

**Root cause.** src/lib/plugins/kanban/kanban.logic.ts:4-6 (regexes with no \r tolerance; '---' treated as the archive separator even when it opens frontmatter), :61-109 (keeps only ## headings, [ ]/[x] tasks and the separator), :118-145 (serializer emits only the model); written back by KanbanView.svelte:79-90

**Evidence.** HEADING_RE /^##\s+(.+)$/ and TASK_RE /^-\s+\[([xX ])\]\s+(.*)$/ have no m flag, and '.' does not match '\r', so CRLF lines never match and the board has no lanes. ARCHIVE_SEPARATOR_RE matches the frontmatter opener (:69-72), headings in archive mode are skipped (:78-82) and items go to the archive (:103-104). Every other line is ignored. applyChange (KanbanView.svelte:79-90) -> onContentChange (app/EditorView.svelte:79) -> autosave. Repro uses the real KanbanView through the repo's KanbanViewHarness and clicks 'List view'.

**Repro test.** `.scratch/file-io-audit/repro/o09-undo-canvas-kanban/kanban-unmodeled-content.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
FAIL keeps prose...: AssertionError: expected '## To Do\n\n- [ ] Card one\n\n## Done…' to contain 'Prose the user typed in source mode.'. FAIL CRLF: AssertionError: expected '\n%% kanban:settings\n{\n  "viewMode"…' to contain 'Card one'. FAIL frontmatter: AssertionError: expected '---\n\n## Archive\n\n- [ ] Card one\n…' to contain 'tags: [work]'
```

**Fix sketch.** Normalize \r\n before parsing (or use \r?$), detect and preserve a leading frontmatter block, keep unrecognized lines attached to their lane or card, or refuse to serialize when lines would be dropped and send the user to source mode.
