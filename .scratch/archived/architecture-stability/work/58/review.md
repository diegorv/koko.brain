VERDICT: CHANGES_REQUESTED

Review of `git diff main...HEAD` (0612966e, 62768666, 3de78dad). No `spec.md` exists for architecture-stability; the Issue is the spec.

## Acceptance criteria

- [met] A failing named sequence reproduces it first (calendar delete with its tail held, an outside rename onto that path, release, one bump) — `event-calendar.model.test.ts:882` (holdScan, delete Standup, outsideRename Retro->Standup, release, settle, one refresh, check). With main's `event-calendar.store.svelte.ts` swapped in, it fails: `the store shows the vault after op #8: expected [] to deeply equal [ { path: '/vault/Standup.md', … } ]`; with the branch store it passes.
- [met] After the fix the renamed-in note shows after one bump — the same named sequence passes on the branch (its single `refresh` is followed by `check`), and the store test at `event-calendar.store.test.ts:520` shows the moved create replaces the unsettled delete, `settlePending` at `to` is a no-op, and one snapshot with the renamed-in note prunes the overlay.
- [met] Seed 40 passes with one end bump — `event-calendar.model.test.ts:976` runs seed 40 through `runModel(..., 1)`. It passes on the branch; with main's store it fails with `no pending write outlives the drain and 1 bump(s) (at version 3: [{"path":"/vault/Retro.md","kind":"delete","settled":true,"settledAtVersion":2}])`.

## Findings

1. **major** `src/lib/features/event-calendar/event-calendar.store.svelte.ts:199` — `if (outside && overwritable) next.delete(to);` drops the delete at `to` when `from` shows no event, and that exposes the deleted event still in the snapshot until the next bump. It also catches a *settled* tombstone: on main, when `current` was undefined, a settled delete at `to` was kept (`if (current && ...)` guarded the only write to `to`). Concrete case: the calendar deletes Standup (or an outside delete leaves its tombstone). Then a note at `from` that has calendar history ops but is no longer an event (its date was removed in the editor, so `followPathChange` picks it from the history paths with `current` undefined) is renamed onto Standup's path in the file explorer before the next index bump. The deleted Standup shows on the calendar again until that bump. Verified with a throwaway probe (deleted afterwards). Setup: snapshot `[t]`, then a `delete` at `t` (unsettled, then settled), then `remapPath(P('ghost'), t.path, 1, outside)`. Result: `eventByPath(t.path)` is `undefined` with main's store and the event `t` with the branch store, in both cases. On main the kept delete was correct here: it prunes on the first bump that drops `t` from the projection. Fix: remove line 199. In the `current` branch, `next.set(to, create)` already replaces the delete, so the issue's case keeps working. When `current` is undefined, main's behavior comes back. Update the JSDoc at `:183-186` ("or it is dropped when `from` shows no event") to match. Rewrite the store test at `src/tests/lib/features/event-calendar/event-calendar.store.test.ts:537` so it asserts the delete stays at `t` and `eventByPath(t.path)` stays undefined, then add the settled-tombstone variant. As written, the test locks in the regression: it checks `pendingWrite(t.path)` is undefined and never checks what the calendar shows at `t`.

2. **minor** `src/lib/features/event-calendar/event-calendar.service.ts:1018` — the gap discovery.md names is real and appears nowhere in the code. If `deleteItem` throws after the outside rename has landed on X, `dropPending(path)` drops the moved `create` at X. The stale deleted event from the snapshot then shows at X until the next bump, where the renamed-in note should show. Fix: either add a line about it to `followPathChange`'s "Known limitations" JSDoc (`event-calendar.service.ts:607-611`), or file a follow-up `.scratch` Issue. Do not leave it only in `work/58/discovery.md`, which deliver removes.

3. **nit** `src/tests/lib/features/event-calendar/event-calendar.model.test.ts:976` — the seed-40 test guards Issue 58 only as long as `randomStep` keeps its current shape: if the generator changes, the test runs some other sequence and stays green. The named sequence at `:882` is the guard that lasts. Fix: add a one-line comment saying that, so a later generator change does not drop the named sequence as a duplicate.

## Checks run by this review

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/event-calendar/`: exit 0, 29 files, 1100 tests passed. This covers the changed `event-calendar.store.test.ts` and `event-calendar.model.test.ts`, the store's own tests and the service tests.
- `pnpm vitest run src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts`: exit 0, 78 passed. This is the other test that uses the calendar store.
- Revert probe: main's store file was swapped in and the two Issue 58 model tests were run with `-t "Issue 58"`. Both failed as quoted above, and the file was then restored with `git checkout`.
- The finding 1 probe (a throwaway test file, deleted) was run against main's store and the branch store.
- My test verdict rests on these files: `src/tests/lib/features/event-calendar/event-calendar.store.test.ts`, `src/tests/lib/features/event-calendar/event-calendar.model.test.ts`, the rest of `src/tests/lib/features/event-calendar/`, and `src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts`. The full suite and `pnpm build` were not run; deliver runs them.
- Scope: the diff touches only `src/lib/features/event-calendar/` and `src/tests/lib/features/event-calendar/` (plus the workflow's own `work/58/`), which is what the Issue lists. Nothing in it touches the layer baseline, `BASELINE_SIZE` or the composition roots.
- The worktree is clean after the probes (`git status --short` empty before this file).

## Resolution

1. **major, fixed in 3744e84a.** Removed the `next.delete(to)` line from `remapPath`. The `current` branch's `next.set(to, create)` still replaces the delete in the Issue's case. With no event at `from`, the delete at `to` stays, as it did on main. Rewrote the JSDoc and the inline comment. The store test now asserts that the delete stays at `t` and `eventByPath(t.path)` is undefined, and a settled-tombstone variant was added. Both tests failed against the earlier branch store and pass now.
2. **minor, fixed in 03d3fb4a.** Added the failed-`deleteItem` rollback after an outside rename to `followPathChange`'s Known limitations JSDoc.
3. **nit, fixed in e161a953.** Added a comment above the seed-40 test naming the sequence test as the guard that lasts.

Checks: `pnpm check` exit 0 (0 errors, 0 warnings). `pnpm vitest run src/tests/lib/features/event-calendar/ src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts` exit 0, 30 files, 1179 tests passed.
