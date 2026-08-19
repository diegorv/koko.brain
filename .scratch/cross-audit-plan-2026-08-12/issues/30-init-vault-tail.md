# Issue 30: Move the +layout init tail into initializeVault

Status: ready-for-agent
Phase: P3 Track D step 1 (cluster C10)
Source: ARCH 3.0 (narrowed) — plan-2026-08-12.md §P3 — ARCH Strong refactors (Track D — Settings)
Blocked by: 13-editor-save-deletions, 14-settings-surface-deletions

## What

Move **only** the two post-open side effects out of `+layout.svelte` and into `initializeVault`, so a
rapid vault switch fires update auto-checks and daily-note opening once, for the vault that actually
opened. Narrowed scope: nothing else moves.

## How

- Move **only** `autoOpenDailyNote` + `maybeAutoCheckForUpdates` into `initializeVault`, **after Step
  8**, **behind the `initVersion` guard**, keeping the **same `setTimeout(..., 0)`**.
- Delete `+layout.svelte:65-84`, **including the third stale throttle comment at `:76-80`** that
  neither audit listed.
- **Preserve the `loadSettings` rejection path and its toast** — it is not part of the move.
- **Rewrite arch 3.0's rationale post-#55** (issue 13 step 4): the `closeVault` collision story is
  gone; keep only the "already implemented and tested" leg. Do not carry the stale rationale into the
  commit message.
- Test collateral in the same commit: assert the two effects fire once per opened vault under the
  `initVersion` guard, and that the `loadSettings` rejection path still surfaces its toast.

## Gate

Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build` before the commit. Stage only the
files for this step, verify with `git diff --cached --stat`, and commit using the repo's full commit
format (Context, Problem, Solution, Behavior, Files with line ranges).

## Comments

### 2026-08-19 — implemented

**Red-green evidence.** New/rewritten collateral in
`src/tests/lib/core/app-lifecycle/app-lifecycle.service.test.ts`. Against the unfixed code:

```
FAIL > initializeVault > prepares templates after settings are ready, then runs the post-open side effects
AssertionError: expected "vi.fn()" to be called 1 times, but got 0 times
  242|   expect(autoOpenDailyNote).toHaveBeenCalledTimes(1);
FAIL > initializeVault > runs the post-open side effects once, for the vault that actually opened
AssertionError: expected "vi.fn()" to be called 1 times, but got 0 times
  264|    expect(autoOpenDailyNote).toHaveBeenCalledTimes(1);
Tests  2 failed | 43 passed (45)
```

Red for the only possible reason: `initializeVault` never called either function (their sole
production call site was `+layout.svelte`). After the move: `45 passed (45)`.

**Anti-vacuity (mutation).** Deleting only `if (initVersion !== version) return;` from the new Step 9
kills both tests — `expected "vi.fn()" to be called 1 times, but got 2 times` (the superseded vault-A
timer fires too) and `expected "vi.fn()" to not be called at all, but actually been called 1 times`.
The guard, not the relocation alone, is what the tests pin.

**Gate.** `pnpm check` 0 errors / 0 warnings (191 files); `pnpm vitest run` 284 files, 6334 passed
(1 todo); `pnpm build` exit 0. No e2e collateral changed, so e2e was not run — `e2e/fixtures/test-vault.ts`
sets `daily.autoOpen: true` and `e2e/specs/tabs.spec.ts:5` documents the auto-opened daily note in the
baseline tab count; the call still lands on the same 0 ms macrotask, only from inside `initializeVault`.

**What discovery found.**

- `initializeVault` RESOLVES (never rejects) on every superseded/aborted path: all five staleness
  checks and the `open_vault_db` failure return bare. That is why the layout `.then` tail double-fired
  on a rapid A -> B switch.
- The `setTimeout(..., 0)` had to survive the move. The rationale is recorded at Step 5: calling
  `autoOpenDailyNote` inline in the init body cost ~2 s of perceived startup delay because its file-IO
  microtasks were starved behind the synchronous index builds and Svelte's initial mount.
- Placing Step 9 after Step 8 preserves today's relative order with the deep link: `executePendingAction()`
  is still dispatched first, the daily-note open lands on a later macrotask.
- `loadSettings` is the only awaited call in `initializeVault` without a try/catch, so it is the only
  thing that can reject — the layout's `.catch` + `toast.error(...)` is exactly that path and was kept
  verbatim. A dedicated test asserts the rejection still propagates and that the moved tail does not
  run on it.
- Test-collateral side effect: the pre-existing `autoOpenDailyNote: vi.fn()` mock returned `undefined`,
  which made the new `.catch(...)` chain throw an uncaught `TypeError` in five unrelated tests. Changed
  to `vi.fn(() => Promise.resolve())`. Also added `vi.mock('$lib/core/settings/update-check.service')`
  so the semantic-search tests' `advanceTimersByTimeAsync(3000)` cannot reach the real network check.
- The fake-timer test wraps its body in `try/finally { vi.useRealTimers() }`: a leaked fake clock hangs
  every later test in the file that awaits a real `setTimeout` (observed as five 5 s timeouts during the
  red run).

**Behavior delta worth recording.** The layout `.then` used to fire on EVERY resolution, including the
early return after an `open_vault_db` failure. After the move it does not: the daily note no longer
auto-opens in a vault whose database failed to open, on top of the existing error toast. Discarding the
tail for a superseded init is the point of the issue; the db-failure case is a new but defensible
consequence. `maybeAutoCheckForUpdates` also moves from the resolution microtask into the same 0 ms
timer, delaying it by one macrotask — irrelevant for a background, network-bound, settings-gated check,
and it buys one guard and one timer instead of two.

**Plan discrepancies.**

- The `## How` says "delete `+layout.svelte:65-84`, including the third stale throttle comment at
  `:76-80`". In this worktree the throttle comment was at `:77-81` (off by one), and deleting only the
  inner block would have left an empty `.then(() => {})` wrapper — the whole `.then` had to go, leaving
  `initializeVault(path).catch(...)`.
- The "stale" verdict on that comment is confirmed: it claimed the update check is "internally throttled
  to once per 24h", but `update-check.service.ts:33-35` gates on `autoCheck` alone — `shouldAutoCheckNow`
  was already deleted.
- "Blocked by: 13, 14" is satisfied; neither file remains in this folder.
- "Rewrite arch 3.0's rationale post-#55" was a commit-message instruction, not a file edit: `closeVault`
  is already gone, so the closeVault-collision leg of the old rationale is not carried anywhere.

**Minor findings, not acted on (no follow-up issue opened).**

- `autoOpenDailyNote` reads `vaultStore.path` rather than taking the vault path as a parameter. Safe at
  the new call site (the store write is what triggers the init effect), but it means the Step 9 guard
  protects against a stale `initVersion`, not against a `vaultStore.path` that changed between the
  timer being scheduled and firing. The two coincide in production.
- `periodic-notes.service.ts:81-100` still carries the `FE-STARTUP-PROBE` `appendLog` instrumentation
  from the ~2 s startup investigation. Out of scope here; worth deleting when someone next touches that
  file.
