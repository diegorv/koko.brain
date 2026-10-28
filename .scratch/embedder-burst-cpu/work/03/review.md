VERDICT: CHANGES_REQUESTED

# Review: 03 vault-index-updated refresh coalesced during bursts

Reviewed `git diff main...HEAD` (a0ac823a, 32ee0c80, 2d721e05) in the worktree.

## What I ran

- `pnpm check`: 192 files, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/core/layout/tauri-listeners.service.test.ts src/tests/lib/core/vault src/tests/lib/core/app-lifecycle/app-lifecycle.service.test.ts src/tests/lib/features/tasks`: 14 files, 295/295 passed.
- Probe (temporary test appended to `tauri-listeners.service.test.ts`, then reverted with `git checkout`): one refresh at version 1, `vi.setSystemTime(Date.now() - 3_600_000)`, event at version 2, advance 60 s. Result: `expected 1 to be 2`. The refresh did not run (finding 2).

The test verdict rests on `src/tests/lib/core/layout/tauri-listeners.service.test.ts` (the throttle cases), plus `src/tests/lib/core/vault/*`, `src/tests/lib/core/app-lifecycle/app-lifecycle.service.test.ts` and `src/tests/lib/features/tasks/*` as regression coverage.

## Acceptance criteria

- [x] `debounce.ts` unchanged. Met: `git diff main...HEAD -- src/lib/utils/debounce.ts` is empty, and the import is removed from the listener only.
- [x] Listener test with fake timers: N events 5 s apart produce fewer than N `get_all_property_records` calls, and the final version is the last event's. Met: `coalesces events 5 s apart into fewer refreshes, the last carrying the final version` (6 events, `refreshTimes.length < 6`, `vaultIndexVersion === 6`). By hand: refreshes at 2, 12, 22, 32 s, which is 4.
- [x] A single isolated event refreshes ~2 s after it arrives. Met: `bumps vaultIndexVersion 2 s after an isolated event` (0 at 1999 ms, 3 at 2000 ms), and `refreshes 2 s after an event that follows a quiet period of 10 s or more`.
- [x] During continuous events, refreshes are at least 10 s apart and a trailing refresh follows the last event. Met in the burst test (gaps >= 10 000 ms, last refresh after `lastEventAt`). The code reads `latestVersion` when the timer fires, so the trailing refresh carries the last version.
- [x] Teardown cancels a pending refresh. Met: `cleanup cancels a pending throttled refresh` and `cleanup cancels a pending trailing refresh after an earlier one ran` (no `invoke` after cleanup, version unchanged). `clearTimeout(timer)` at `tauri-listeners.service.ts:173-178`.
- [ ] Gate green; one commit in the full CLAUDE.md format. Not yet: the deliver step runs the gate. The 32ee0c80 message follows docs/COMMITS.md (Context, Problem, Solution, Behavior, Files with lines, Co-Authored-By).

Constraint checks: `applyNoteChange` and `note-change.service.ts` are untouched. `fetchSeq` is kept. No new util, which the Issue allows. Layer rules hold (`core/layout` still imports `features/collection` as before, nothing new). Throttle tests come with the change.

## Findings

1. **Medium. Clicking a task in the Tasks view now shows the change 2-10 s later.** `src/lib/features/tasks/tasks.service.ts:96-114` (`toggleTask`) and `src/lib/features/tasks/TasksView.svelte:70-76`.
   The Tasks view's checkbox state comes only from `tasksStore`. The only thing that refetches it is the `$effect` on `vaultStore.vaultIndexVersion`, and `toggleTask` does not refresh the store itself. Before this change a click showed up after 300 ms. Now it takes 2 s. A second toggle within ~10 s of the previous refresh can take up to ~10 s, because toggling several tasks in a row counts as a burst. During that time the checkbox looks unclicked, so a user who clicks again toggles the task back. The Issue accepts lag "after external changes during a burst", and this is a local click in the view that owns the state.
   Fix: in `toggleTask`, after a `changed` result, call `await buildTaskIndex()` (one `get_all_tasks_v2` IPC for the acting view). Leave the throttled bump as it is for the other panels. Add a `tasks.service.test.ts` case: `toggleTask` with `changed: true` updates `tasksStore` without any `vault-index-updated` bump, and `changed: false` does not refetch.

2. **Low-Medium. A backward wall-clock jump stalls every `vaultIndexVersion` consumer for the size of the jump.** `src/lib/core/layout/tauri-listeners.service.ts:156` (`wait = Math.max(REFRESH_DELAY_MS, lastRefreshAt + REFRESH_MIN_INTERVAL_MS - Date.now())`) and `:159` (`lastRefreshAt = Date.now()`).
   `Date.now()` is wall-clock time and can move backward (manual change, NTP step). If the clock goes back 1 h after a refresh, the next event arms a timer for about 1 h + 10 s. During that hour Backlinks, Tags, Tasks, Graph, collection blocks and the entries memo stop refreshing. The probe confirmed it: no bump after 60 s. The old debounce had no such dependency.
   Fix: cap the wait with `Math.min(REFRESH_MIN_INTERVAL_MS, Math.max(REFRESH_DELAY_MS, ...))`, or use `performance.now()` for both reads. Add a test with `vi.setSystemTime` moving backward that expects the bump within 10 s.

3. **Low. Docs still say "300 ms".** `docs/adr/0025-rust-vault-index.md:184` ("the 300 ms-debounced version bump") and `:202` ("reopens the ~300 ms window"), and `CLAUDE.md:289` (Indexing 12, "300 ms-debounced version bump").
   Fix: update both ADR lines to the throttle (2 s isolated, at most one per 10 s in a burst). A workflow step should not edit `CLAUDE.md:289`. List it in the Issue comment for the human, as the build step did.

4. **Low (no change required, for the human).** The window in which a freshly created note is missing from the entries snapshot is now longer. `src/lib/core/note-creator/note-creator.service.ts:80-92` and `src/lib/core/markdown-editor/extensions/live-preview/widgets/queryjs-block-widget.ts:186`.
   `create_note` emits `vault-index-updated`, but `getVaultEntries()` serves the snapshot memoized at the previous version until the bump. A queryjs block that runs on the new note in that window (for example, a template using `kb.current()`) sees `null`, and the result is cached for the session. The race existed with 300 ms. It now lasts 2 s, or up to 10 s during a burst. This follows from the Issue's design (CLAUDE.md Indexing 12 accepts a stale snapshot). Noted so the human can decide whether create paths should call `invalidateVaultEntries()`. Out of scope here.

5. **Nit (pre-existing, optional).** `tauri-listeners.service.ts:154-163`: `scheduleRefresh` does not check `cancelled`. An event delivered after cleanup, before `listen` resolves, would arm a new timer. The old `debounce` behaved the same way, so this is not a regression. An `if (cancelled) return;` at the top of `scheduleRefresh` would close it.

## Scope

No scope creep. The comment-only edits in `vault-entries.service.ts`, `vault.store.svelte.ts`, `app-lifecycle.service.test.ts` and `vault.store.test.ts` keep existing comments accurate. Findings 1 and 2 must be fixed before delivery. 3 is a docs follow-up, and 4 and 5 are optional.
