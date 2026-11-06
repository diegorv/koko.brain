# 123: Kanban lane actions never turn a raw --- into the archive separator, and restore to a missing lane keeps the card

**Migrated from:** `.scratch/file-io-audit/issues/56-kanban-lane-actions-archive-pattern.md` (audit 2026-11-05). Priority: corner case (bucket 4-corner). It needs a raw --- in board markdown. Part 2 cannot be reached from the UI.

**Audit check at `5f8003d67`:** still_present (corner, low). Part 1: src/lib/plugins/kanban/kanban.logic.ts:16-17 RULE_RE /^---\s*$/ and ARCHIVE_HEADING_RE; archiveHeadingIndex (:74-80) treats '---', blank lines and '## Archive' as the archive at any position (:196-210). addLane, removeLane, renameLane and moveLane (:476-511) do not check for a raw '---' at the end of the preceding lane, so it can still happen. It needs a hand-written '---' line inside a lane plus a lane named Archive, which a board built in the app does not produce. Part 2: restoreItem (:555-581) with an unknown toLaneId still drops the card, but the only caller, handleRestoreItem (src/lib/plugins/kanban/KanbanView.svelte:332-336), always passes board.lanes[0].id after checking that the lane exists, so no UI path reaches it.

**Stale in the text below:** Part 2 cannot be reached from the UI; it is a logic-level guard only. The lane action lines are now kanban.logic.ts:476-511 and restoreItem :555-581.

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Blocked by:** none
Priority: P3
Severity: data-loss-on-action
Source: Issue 16 review round 2 (.scratch/file-io-audit/work/16/review-2.md, finding 3), disclosed by the Issue 16 fix step

## Details

Issue 16 keeps raw lines in place through card actions, and no card action can put a raw `---` in front of a lane titled `Archive`. Lane actions in `src/lib/plugins/kanban/kanban.logic.ts` still can:

- A lane ending in a raw `---` line followed by a lane titled `Archive` reads, on reopen, as the archive separator plus the archive heading. `removeLane`, `moveLane`, `renameLane` (to `Archive`) and `addLane(board, 'Archive')` after such a lane all produce that shape, so the lanes and cards after the `---` move into the archive on the next parse.
- `restoreItem(board, itemId, toLaneId)` with a `toLaneId` that does not exist removes the card from the archive and adds it nowhere, so the card is lost.

## Acceptance criteria

- [ ] After removeLane, moveLane, renameLane to `Archive` or addLane('Archive') on a board with a raw `---` at the end of a lane, a parse of the written file has the same lanes and an unchanged archive
- [ ] restoreItem to a lane id that does not exist leaves the board unchanged (the card stays in the archive)

## Comments

- 2026-11-06: migrated from `.scratch/file-io-audit/issues/56-kanban-lane-actions-archive-pattern.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
