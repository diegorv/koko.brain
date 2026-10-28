# 20: Event-calendar stores reset on vault init and teardown

**What to build:** opening, switching or closing a vault never carries event-calendar state across vaults. `initializeVault` calls `resetEventCalendar()` at entry, next to `invalidateVaultEntries()` (needed because the double-switch window skips teardown), and the teardown reset block calls it next to `resetCalendar()`. Only the two event-calendar stores reset; a mounted Calendar tab keeps its clock. Nothing loads at startup, because the view loads on mount. A regression pin of the current entry order lands before the change.

**Plan reference:** Task 19 in `.scratch/calendar-feature/plan-2026-10-28.md` (lines 436-448). The plan task is the full spec (files, line anchors, test cases); this ticket is the definition of done.

**Blocked by:** 19

**Status:** ready-for-agent

**Touches:**
- `src/lib/core/app-lifecycle/app-lifecycle.service.ts` (modify)
- `src/tests/lib/core/app-lifecycle/app-lifecycle.service.test.ts` (modify)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`, then `bash scripts/e2e.sh e2e/specs/editor.spec.ts`

- [ ] Before any source change, a new test in `app-lifecycle.service.test.ts` pins the observable entry order `stopSettingsPersistence`, then `disableSentry`, then `loadSettings` on both the normal path and the double-switch path (the leading `teardownVault()` pattern at `:272-287`), and it passes on the current tree
- [ ] `app-lifecycle.service.ts` imports `resetEventCalendar` and calls it at `initializeVault` entry, next to `invalidateVaultEntries()` (`:136-140`)
- [ ] `app-lifecycle.service.ts` also calls `resetEventCalendar` in the teardown reset block, next to `resetCalendar()` (`:600`)
- [ ] Pre-Change Checklist C6 (Notes) holds: `resetEventCalendar` writes only the two event-calendar stores (not the clock, not `editorStore`), no other store changes, and nothing loads events at startup (the view loads on mount)
- [ ] The test file adds `vi.mock('$lib/features/event-calendar/event-calendar.service', ...)` next to the calendar mock (`:145-149`), under the orchestrator exception (`docs/TESTING.md:117`); its specifier matches the one `app-lifecycle.service.ts` uses for the import (`$lib` vs `#lib`, Notes > Dependencies), because a mismatched mock silently loads the real module
- [ ] `invocationCallOrder` assertions show `resetEventCalendar` running before `loadSettings` on both the normal and the double-switch path, and they fail before the call is added (C6 Q5)
- [ ] A teardown assertion, next to `:791-797`, shows that teardown calls `resetEventCalendar`
- [ ] Gate green; one commit in the full CLAUDE.md format (Context, Problem, Solution, Behavior, Files with line ranges)
