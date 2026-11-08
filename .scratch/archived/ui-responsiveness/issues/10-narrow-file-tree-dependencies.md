# 10: Entries-bound panels stop re-running on every file-tree replacement

**Status:** resolved

Priority: P3 (cascade after each tree replacement; size not measured)

**What to build:** Three always-mounted consumers read `fsStore.fileTree` into a context literal, so they re-run on every tree replacement although their work is bound to the ~10k vault entries, not to the tree:

- AppShell `typeRows` (`src/lib/app/AppShell.svelte:107-121`) calls `typeNavigatorRows` = `excludeSystemFolder` + `buildTypeSections` over all entries (`lens.logic.ts:360-373`); the `$effect` at `:139-146` reads it before its gate.
- CalendarNavigator `noteDateCounts`, over all entries (`day-lens.logic.ts:45-52`).
- RailNoteList `resolved` for non-folder lenses (`RailNoteList.svelte:128-131`).

Narrow each one to the tree data it actually uses (or to none). Also drop the `attachFileCounts` walk (`fs.logic.ts:178-190`): `fileCount` has no reader. `$state.raw` (Issue 03) does not shrink any of this.

**Blocked by:** 03

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend)

**Source:** src/lib/app/AppShell.svelte:107-146, src/lib/features/rail-shell/lens.logic.ts:360-373, src/lib/plugins/calendar/day-lens.logic.ts:45-52, src/lib/features/rail-shell/RailNoteList.svelte:128-131, src/lib/core/filesystem/fs.logic.ts:178-190

- [x] Failing first: for each consumer, a tree replacement that does not change the data it uses does not recompute it. Assert through the consumer, not by spying on `.logic.ts` (CLAUDE.md rule 1): a recompute counter in `$effect.root` over the derived, or the derived value keeping identity across such a `setFileTree`
- [x] Each consumer still updates when a relevant change happens (new file in a type folder, new dated note)
- [x] `fileCount` removal: grep shows no reader; the tree tests stay green

## Notes

- Measure first with Issue 05's timers if the gain is in doubt; the verifier rates this fix as undervalued but the cascade size is INFERRED.
- Research: `.scratch/ui-responsiveness/research/B-verify.md` (correction 11, fixes 7 and 8).

## Comments

- 2026-11-02, branch `issue/10-narrow-file-tree-dependencies`: the rail note list and calendar dots stop tracking the file tree, the Types navigator rows track only the tree's `.view` files, and the unread `fileCount` walk is dropped. Review round 1: APPROVED (2 nits; fixed the `viewRows` JSDoc). Review round 2: APPROVED, no findings. Tests: pnpm check 0 errors; AppShell.test.ts 4/4; full suite (vitest + build) exit=0, 441 files, 10140 passed, 1 skipped, 1 todo (log: brain.worktrees/test-logs/ui-responsiveness/10-deliver.log).
