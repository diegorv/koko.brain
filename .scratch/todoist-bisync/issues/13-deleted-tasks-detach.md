# 13: A task deleted on either side is detached, never deleted on the other

**What to build:** When a synced task is deleted in Todoist, its line stays in the note and stops syncing; when a synced line disappears from the vault, the Todoist task stays and stops syncing. Both go to the sync log. Nothing is deleted automatically. Design: `.scratch/todoist-bisync/research/design.md` rule 9, Deletion (decided: detach).

**Blocked by:** 07

**Status:** ready-for-agent

- [ ] Failing tests first (fake `/sync`, real stores).
- [ ] Remote `is_deleted: true` detaches the link; the line keeps its text and anchor; logged. A detached anchor is never re-created in Todoist.
- [ ] A linked anchor missing from the vault scan increments `miss_count`; detach after 3 consecutive cycles that ran on a ready index; reappearing resets the count.
- [ ] A cycle whose anchored lines fall under 50% of active links (or zero) aborts before any detach or push, with a toast.
- [ ] Over 10 detaches in one cycle: "pause and ask" (design rule 9).
- [ ] Absence from an incremental sync never counts as a deletion.
- [ ] Context change (design rule 8c): a linked task that gains the other context's label (`personal` in a work vault, `Work` in a personal vault) is detached the same way, line kept, logged. A linked task with no context label stays linked.
- [ ] Gate: frontend.

## Notes

- Size: S.
