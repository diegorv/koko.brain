# 56: Kanban lane actions can turn a raw `---` into the archive separator; restore to a missing lane drops the card

**Status:** wontfix

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

- 2026-11-06: migrated to `.scratch/audit-2026-11-05/issues/123-kanban-lane-actions-never-turn-raw-into.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
