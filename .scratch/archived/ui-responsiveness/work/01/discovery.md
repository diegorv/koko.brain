# Issue 01 discovery

No `spec.md` exists for ui-responsiveness; the Issue and `research/A-*`, `research/C-*` are the source.

## Files that change

- `src/lib/app/lifecycle/app-lifecycle.service.ts:409` drop `buildTaskIndex()` from the step 5b timer; `:57` keep `resetTasks`, drop the `buildTaskIndex` import; update the step 5b comment (`:389-402`, label `:415`) so it no longer lists tasks / `get_all_tasks_v2`.
- `src/lib/features/tags/tags.logic.ts:3-38` `buildTagTree`: replace `currentLevel.find(...)` with a `Map<string, TagTreeNode>` keyed `i === 0 ? lower : parentKey + '/' + lower`. `pathSoFar` line (`:12`) untouched.
- `src/lib/features/tags/tags.service.ts:22-42` split timers: `timeAsync` only around the IPC, `timeSync` around map, build, sort, set; one debug line with R (roots), P (parent-child pairs = non-root nodes) and the uppercase-segment share. Doc `:16-20` rewritten (it is no longer only "the initial vault-open build" rationale; startup still calls it directly).
- `src/lib/features/tasks/tasks.service.ts:75-80` doc: the section scan reads every note on the main thread and is now also fired by the default `#to-list` tag on mount / version bumps, not only behind the typing debounce.

## Tests

- `src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts:615` flip to `not.toHaveBeenCalled()` (red first).
- `:688` delete (watcher test passing by accident). `:687`, `:710`, `:535`, `:1172` untouched.
- `src/tests/lib/features/tags/tags.logic.test.ts`: characterization (`Work/a` + `work/B` merge under `Work`, insertion order, `/b` vs `b` separate, `a//c`), green before; perf case 6,040 flat mixed-case tags < 200 ms (red first).

## Plan

1. discovery commit
2. lifecycle test flip + delete (red), drop the call (green), commit
3. tag-tree characterization tests (green) commit; perf test (red) + Map (green) commit
4. timers + docs, commit; targeted checks: `pnpm check`, tags/tasks/lifecycle/TagsView test files.

## Risks / defaults

- Perf threshold 200 ms may flake on a slow CI box; the Map version measures single-digit ms, so the margin is large.
- Uppercase share computed over all segments of all entries (one extra pass, O(total segments)) for the debug line. It runs on every tag rebuild, debug logging on or off (about 1 ms on 6k tags).
- Tasks tab still pays the scan on first activation (Issue 02).
