# 13: A task deleted on either side is detached, never deleted on the other

**What to build:** When a synced task is deleted in Todoist, its line stays in the note and stops syncing; when a synced line disappears from the vault, the Todoist task stays and stops syncing. Both go to the sync log. Nothing is deleted automatically. Design: `.scratch/todoist-bisync/research/design.md` rule 9, Deletion (decided: detach).

**Blocked by:** 07

**Status:** resolved

- [x] Failing tests first (fake `/sync`, real stores).
- [x] Remote `is_deleted: true` detaches the link; the line keeps its text and anchor; logged. A detached anchor is never re-created in Todoist.
- [x] A linked anchor missing from the vault scan increments `miss_count`; detach after 3 consecutive cycles that ran on a ready index; reappearing resets the count.
- [x] A cycle whose anchored lines fall under 50% of active links (or zero) aborts before any detach or push, with a toast.
- [x] Over 10 detaches in one cycle: "pause and ask" (design rule 9).
- [x] Absence from an incremental sync never counts as a deletion.
- [x] Tree change (design rule 8c): a linked task moved in Todoist to a project outside the vault's tree (or to the Inbox when the vault does not include it) is detached the same way, line kept, logged.
- [x] Gate: frontend.

## Notes

- Size: S.

## Comments

- 2026-11-09, branch `issue/13-deleted-tasks-detach`: detach planner and cycle wiring for remote deletes, 3-miss vault deletes, moves out of the tree, the 50% line brake and the 10-detach cap. Review fixes: moved-out detach only for a known, live project outside the tree; `pad2` spacing restored; follow-up Issue 16 (brake recovery) and an Issue 10 criterion (detached anchors never created). Tests: `pnpm check` exit 0; full suite exit 0 at c8be5d24c (604 files, 14670 passed, 54 skipped, 1 todo). Reviews: round 1 APPROVED, round 2 APPROVED (no findings).
