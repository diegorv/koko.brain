# 17: Block ids, orphan anchors and dropped pending adds are handled in every sync path

**What to build:** Three small gaps left by Issue 10's review (`.scratch/todoist-bisync/work/10/review.md` findings 3 and 4, `review-2.md` nit 1), each verified on main at `13f3f2758`:

1. **Trailing block ids in field sync.** Issue 10 writes the anchor before a trailing ` ^block-id` and strips it from `item_add`, but Issue 09's field paths do not: a brain edit of `- [ ] Call Bob 🆔 td-x ^abc` pushes `Call Bob ^abc` as content, and a Todoist content change is pulled without keeping the block id last (`src/lib/features/todoist-sync/fields.logic.ts:339-351`). Strip a trailing block id from the pushed and compared description, and keep it last on a pulled line.
2. **Orphan brain-born anchors.** When a cycle stops after the note write but before the state commit (a crash, or a vault switch during the last write), the line keeps a brain-born anchor (`td-` + 8 base36) with no link row. Normal mode never creates it and logs nothing (`sync-now.service.ts:328-354`; the `unmatched` log is rebuild-only, `pull.logic.ts:512`). Log such anchors once per manual cycle, telling the user to remove the `🆔` or run a rebuild.
3. **Pending adds whose line was deleted.** A pending add (`todoist_id` NULL) whose line is deleted before Todoist received it is never resent, paired, detached or logged, and stays in the line brake's denominator (`detach.logic.ts:79`). Let `planDetach` count misses for pending adds too, so it detaches after 3 missing scans like any other link.

**Blocked by:** 10

**Status:** ready-for-agent

- [ ] Failing tests first for each of the three (fake `/sync`, real stores).
- [ ] Block id: a brain edit of a line ending in ` ^abc` pushes the content without it; a Todoist content edit leaves ` ^abc` last on the line; the next cycle is quiet in both cases.
- [ ] Orphan anchor: a brain-born anchor with no link and no matching item is logged on a manual cycle and not on automatic ones (the sync log must not fill up, design rule 9 and Issue 10's review finding 2).
- [ ] Pending add: its link detaches after 3 missing scans and leaves the brake's denominator; it is never sent afterwards.
- [ ] Gate: frontend.

## Notes

- Size: S. Merged from three review nits because each is a few lines.
