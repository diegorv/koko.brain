VERDICT: CHANGES_REQUESTED

# 49 review: Calendar undo history follows renames and moves made elsewhere

Reviewed `git diff main...HEAD` (f4076bdc, 6e83ee31, a1693747, 0a438c62) in the worktree.

## Checks run by the reviewer

- `pnpm check`: 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/event-calendar src/tests/lib/core/filesystem src/tests/lib/core/app-lifecycle`: 35 files, 1339 tests, all passed.
- The test verdict rests on these files:
  - `src/tests/lib/features/event-calendar/event-calendar.service.test.ts` ("path changes made outside the calendar")
  - `src/tests/lib/core/filesystem/fs.service.test.ts` ("path-change consumers")
  - `src/tests/lib/features/event-calendar/event-calendar-history.logic.test.ts` ("followRename")
  - `src/tests/lib/features/event-calendar/event-calendar.store.test.ts` (remapPath with `titles`)
  - `src/tests/lib/core/app-lifecycle/app-lifecycle.service.test.ts` (wiring)
- Probes: a temporary copy of the service test with extra cases, run inside the "path changes made outside the calendar" describe and then deleted. Results are cited in the findings below.

## Acceptance criteria

- [x] **Undo after an external rename or move applies to the note at its new path.** Met for the normal flow.
  - `followPathChange` (event-calendar.service.ts:559-577) is reached from `applyPathChange` (path-change.service.ts:129-138) through `registerEventCalendarPathChangeConsumer`, which is wired in `initializeVault` (app-lifecycle.service.ts:245).
  - Service tests drive the real `renameItem` and `moveItem`. They cover undo before and after the index refresh, redo, `event_title`, and the own-delete and own-rename skips.
  - Findings 1 and 2 are regressions the same remap introduces.
- [x] **Tests for rename, folder move (children remapped) and delete (ops dropped).** Met.
  - "remaps the notes under a moved folder" covers the folder move.
  - "drops the ops of a note deleted outside the calendar" covers the delete.
  - The rename cases are listed above.
  - The registry has 7 tests in fs.service.test.ts.

## Layer and rule checks

- ADR-0003 holds: core exposes `registerPathChangeConsumer`, the feature registers itself, and lifecycle owns the wiring and teardown, sharing the unregister list.
- A consumer that throws is isolated and logged. A failed diskOp notifies nobody.
- The scope matches the Issue. The title follow (`followRename`) and the own-change skip are necessary, not scope creep. Without them, undo is refused after the index reads the new name, and the calendar's own delete would lose its undo.

## Findings

1. **High. event-calendar.service.ts:573 with event-calendar.store.svelte.ts:187: an outside rename or move to a path the calendar never indexes leaves a permanent ghost event.**
   - `followPathChange` reuses `remapPath`, which puts a `create` overlay at `to` with no version clock. `prunePending` (event-calendar-event.logic.ts:466-468) drops that overlay only when the snapshot contains `to`.
   - That assumption holds for the calendar's own rename (same folder, `.md`). It fails for an outside change whose destination never enters the projection:
     - a move into the system or templates folder (`excludeSystemFolder`, event-calendar-event.logic.ts:221);
     - a move into a dot-folder, which Rust skips;
     - a rename to a non-`.md` name.
   - Probe:
     - `moveItem(P('Standup'), '/vault/.archive')` then `refresh(6)` leaves `events = [["/vault/.archive/Standup.md", true]]`.
     - `renameItem(P('Standup'), 'Standup.txt')` with an index that no longer lists it, then `refresh(6)`, leaves `[["/vault/Standup.txt", true]]`.
   - The event stays visible until the vault is reset. Edit, drag and undo on it write frontmatter into the hidden, template or `.txt` file, because `eventByPath` and `exists` both pass.
   - Before this diff, an outside move only made the event disappear.
   - Fix: give the overlay that an outside change creates a version clock (`settledAtVersion: vaultStore.vaultIndexVersion`) so it expires after the usual two bumps. Alternatively, do not overlay a target the projection cannot contain. Keep the own-rename path unchanged.
   - Add service tests for a move into the system folder (or a dot-folder) and a rename to a non-`.md` name, each asserting the event is gone after the refreshes.

2. **Medium. event-calendar.service.ts:568-571: the delete branch drops history ops but leaves the pending overlay at the path.**
   - Scenario: rename a note outside the calendar, then delete it before the throttled index bump (about 2 s, up to 10 s in a burst).
   - The `create` overlay from step 1 has no clock, so the deleted event stays forever.
   - Probe: `moveEvent` (Standup), `renameItem(Standup -> Retro)`, `deleteItem(Retro)`, `refresh(6)`. Result: `events = [["/vault/Retro.md", true]]` with an empty disk.
   - The same ghost already follows the calendar's own rename plus an outside delete, but the consumer's delete branch is the natural place to fix both.
   - Fix: on `to === null`, also replace the path's overlay with a settled `delete` tombstone (or `dropPending` a `create`) for every path at or under `from`. This also hides the event at once instead of after the index catches up.
   - Add a test for rename then delete before `refresh`.

3. **Low. event-calendar.service.ts:559-577: an outside rename while a calendar write on `from` is in flight leaves an unsettled `create` at `to` that never prunes, and the op is recorded on the old path.**
   - `remapPath` copies `settled: false` from the in-flight write. `writeEvent` then settles and records at `path` (the old path): settling hits the tombstone, and `record` pushes the op after the remap.
   - Probe: `holdNextWrite()`, start `moveEvent(Standup)`, `renameItem(Standup -> Retro)`, release the write.
     - `pendingWrite(Retro)` is `{kind:'create', settled:false}` even after `refresh(6)`.
     - The undo stack is `["/vault/Standup.md"]`.
     - The write recreated `Standup.md` on disk. That last part is a pre-existing race.
   - The window is one frontmatter write, so a person can hardly hit it.
   - Fix: either settle the remapped overlay at `to` and remap the op once the write finishes (for example, follow `writeTails.get(from)`), or record it as a known limitation in discovery.md and in the `followPathChange` JSDoc. Do not leave it implicit.

4. **Low (docs). CLAUDE.md:273 (Indexing and Watcher §6) lists the consumer registrations wired in `initializeVault` and warns that forgetting one is a silent no-op, but it does not mention the new path-change registry.**
   - Fix: add one clause naming `registerPathChangeConsumer` (path-change.service.ts) and `registerEventCalendarPathChangeConsumer`. Say that consumers are called synchronously after `diskOp` and before the link rewrite, once per change, with folder changes reported once for the folder.

## Resolution

All four findings accepted.

1. Fixed. An outside rename or move now gives the `create` at `to` a version clock (`remapPath(from, to, { fromBase, toBase, version })`, settled, `settledAtVersion` = current `vaultIndexVersion`), so it expires two bumps later when the index never shows `to`. The calendar's own rename keeps the clockless overlay. Tests: dot-folder move, rename to `.txt` (service), clock expiry (store).
2. Fixed. The delete branch also puts a settled `delete` tombstone (no clock, prunes once the index drops the path) on every visible event at or under `from`. Test: rename then delete before the index refresh.
3. Partly fixed, rest documented. Because the outside overlay is now always settled with a clock, no unsettled `create` survives at `to`. The op recorded at the old path stays: the same in-flight write recreates the old file on disk (pre-existing race), so the op at `from` matches what is on disk. Recorded as a known limitation in the `followPathChange` JSDoc and in discovery.md. Test: rename during a held write leaves no overlay at `to` after the refreshes.
4. Fixed. CLAUDE.md Indexing §6 names the path-change registry and when its consumers run.
