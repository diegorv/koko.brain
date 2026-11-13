VERDICT: APPROVED

Re-review, round 2, of the fixes after c0e38057 (3744e84a, 03d3fb4a, e161a953, a5219548).

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | major | resolved | `next.delete(to)` is gone from `remapPath` (`event-calendar.store.svelte.ts:196-213`). The only write to `to` is now `next.set(to, create)` inside `if (current && (!held \|\| overwritable))`, so with no event at `from` the delete at `to` stays, as on main, and with an event the moved `create` still replaces an unsettled delete when `outside` is set (the Issue's case). The JSDoc (`:183-187`) and inline comment match. The two store tests (`event-calendar.store.test.ts:537`, `:548`) assert the delete stays at `t` and `eventByPath(t.path)` is undefined. Probe: with the c0e38057 store swapped in, both fail (2 failed, 52 passed); with the branch store they pass. |
| 2 | minor | resolved | `followPathChange` Known limitations JSDoc (`event-calendar.service.ts:612-615`) now names the failed-`deleteItem` rollback after an outside rename. Comment only. |
| 3 | nit | resolved | Comment above the seed-40 test (`event-calendar.model.test.ts:976-978`) names the sequence test as the lasting guard. |

## Acceptance criteria

- [met] A failing named sequence reproduces it first (calendar delete with its tail held, an outside rename onto that path, release, one bump) — the named sequence in `event-calendar.model.test.ts` is unchanged by the fixes; with main's store swapped in, `-t "Issue 58"` fails (2 failed), and passes on the branch.
- [met] After the fix the renamed-in note shows after one bump — the fix keeps the `current` branch that replaces the unsettled delete with the moved `create`; the named sequence (one `refresh`, then `check`) passes on the branch.
- [met] Seed 40 passes with one end bump — the seed-40 test passes on the branch and fails with main's store (part of the 2 failures above).

## Findings

None open or new. The fixes stay inside `src/lib/features/event-calendar/` and `src/tests/lib/features/event-calendar/` plus the workflow's `work/58/`; no test weakened (the replaced store test asserted the regression; its replacements assert what the calendar shows). Nothing touches the layer baseline, `BASELINE_SIZE` or composition roots.

## Checks run by this review

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/event-calendar/ src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts`: exit 0, 30 files, 1179 passed.
- Revert probes (store file swapped to c0e38057 and to main, then restored with `git checkout`): results quoted above. Worktree clean afterwards.
- Full suite and `pnpm build` not run; deliver runs them.
