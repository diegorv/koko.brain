# 16: A sync stopped by the line brake has a way past it

**What to build:** Issue 13's line brake (design rule 9) aborts every cycle, manual "Sync now" included, when fewer than half of the active links still have a line in the vault. Links are never retired on their own, so links of tasks completed long ago stay active. Deleting a batch of old `[x]` lines, or a whole project note, can leave the vault under the brake for good: the 3-miss detach that would clear those links never runs, because the brake stops the cycle first. Today the only ways out are restoring the lines or losing the sync database. Found in Issue 13's review (finding 1, `.scratch/todoist-bisync/work/13/review.md`).

**Blocked by:** 13

**Status:** resolved

- [x] Owner decision recorded in Notes: which recovery. Options from the review: (a) a manual "Sync now" over the brake pauses and asks, naming the missing count, the way the caps do; a yes runs the cycle and counts the misses; automatic cycles still abort. (b) A minimum active link count before the brake applies. (c) Something else.
- [x] Failing tests first (fake `/sync`, real stores).
- [x] The chosen recovery lets a vault under the brake detach the missing links in 3 cycles, without weakening the brake for automatic cycles on a vault that lost most lines by accident.
- [x] Gate: frontend.

## Notes

- Size: S.
- Owner decision (2026-11-10): option (a). A manual "Sync now" that hits the line brake shows a confirm dialog naming how many linked lines are missing (the same "pause and ask" as the caps, design rule 9); "yes" runs the cycle and counts the misses, so the missing links detach over 3 manual cycles; "no" stops with nothing written. Automatic cycles keep aborting at the brake without asking.

## Comments

- 2026-11-10, branch issue/16-line-brake-recovery: a manual "Sync now" that hits the line brake now shows a confirm dialog naming the missing linked-line count; yes runs the cycle and counts misses (detach over 3 cycles), no stops with nothing written; automatic cycles still abort. The toast names the way past it; the dialog wording holds for any count (round 1 finding). Tests: pnpm check 0 errors; sync-now.service.test.ts 168/168; full suite at 5eb6df345 608 files, 14958 passed, 54 skipped, exit=0. Reviews: round 1 APPROVED, round 2 APPROVED (no findings).
