VERDICT: APPROVED

# Issue 16 review: a way past the line brake

Reviewed `git diff main...HEAD` (commits 4b13259ba, af5b9d26b, 48a4dabc0) against the Issue's criteria, the owner decision in its Notes (option (a)) and design rule 9 (`.scratch/todoist-bisync/research/design.md:21`). No `spec.md` exists for this feature, so design rule 9 was the reference.

## Acceptance criteria

- [met] Owner decision recorded in Notes: which recovery. Options from the review: (a) a manual "Sync now" over the brake pauses and asks, naming the missing count, the way the caps do; a yes runs the cycle and counts the misses; automatic cycles still abort. (b) A minimum active link count before the brake applies. (c) Something else. — The Issue's Notes record option (a), 2026-11-10. The diff follows it: `sync-now.service.ts:292` asks only when `mode !== 'auto'`, and `confirmLineBrake` (`:1125-1131`) names `missingLineCount` of the active count, with the caps' `ask` options (title, warning kind, Sync/Cancel).
- [met] Failing tests first (fake `/sync`, real stores). — I put main's `sync-now.service.ts` and `sync-scheduler.logic.ts` back in place, kept the branch's tests, and ran `sync-now.service.test.ts`, `sync-scheduler.service.test.ts` and `sync-scheduler.logic.test.ts`. 7 tests failed: 4 in `syncNow: the line brake`, 2 in the scheduler's `the line brake` and 1 for `autoSyncFailureMessage`. The automatic "never asks" test passes on main, as a regression guard should. I then restored the files from HEAD (`git status` clean). The tests use `createFakeTodoist` and `createFakeVault` with the real `todoistSyncStore`, `settingsStore` and `vaultStore`, and mock only `ask`, Tauri and the toast.
- [met] The chosen recovery lets a vault under the brake detach the missing links in 3 cycles, without weakening the brake for automatic cycles on a vault that lost most lines by accident. — `sync-now.service.test.ts:1450-1466`: 3 confirmed manual cycles give `missCount` 3, `detach` log entries for td-w1 and td-w2, and the Todoist task stays open. After that, an automatic and a manual cycle both run without asking. In `:1428-1437`, an automatic cycle under the brake aborts with `lines-missing`, asks nothing, commits nothing and counts no miss, even with `ask` set to true. The scheduler test `sync-scheduler.service.test.ts:435-452` covers the same for the timer path. I also probed the Issue's "whole project note" case, with the note file deleted instead of emptied, in a temporary test that I then reverted. Confirmed manual cycles counted 1/2/3 and then detached. The fourth cycle and a later automatic cycle did not ask. The only-link case (1 of 1 missing) also detached after 3 confirms.
- [met] Gate: frontend. — `pnpm check`: 0 errors, 0 warnings (229 files). `pnpm vitest run` on `sync-now.service.test.ts`, `sync-scheduler.service.test.ts`, `sync-scheduler.logic.test.ts` and `detach.logic.test.ts`: 4 files, 244 tests passed. The full suite is deliver's to run.

## Findings

1. **nit** `src/lib/features/todoist-sync/sync-now.service.ts:1128` — With one active link, the dialog reads "1 of the 1 synced task lines are missing from the vault" (seen in my probe). Fix: optional. Phrase the text so it holds for any count, e.g. "Synced task lines missing from the vault: N of M.", or pluralize on `active`, and update the `stringContaining` assertions at `sync-now.service.test.ts:1408` and `:1424`.

## Other checks

- Order: the confirm comes after both `/sync` pulls and before any plan, vault write or DB commit, as the caps do. The Cancel test (`sync-now.service.test.ts:1396-1416`) shows files, commits, log, commands and miss counts unchanged.
- Cancel keeps the `lines-missing` failure and the brake's message, not the caps' `cancelled`. It is a reasonable default, and it is recorded in discovery.md. The scheduler shows it as the manual error toast (`sync-scheduler.service.test.ts:448`).
- `missingLineCount` uses the same notion of active as `belowLineBrake` (not detached, no occurrence in the vault scan). Its unit tests cover the happy path, empty input and detached links (`detach.logic.test.ts:229-244`).
- The automatic toast text changed. No other test, e2e spec or help doc contains it (`grep` over `src/tests`, `e2e`, `help`, `docs`).
- Scope: only the brake branch, its helper and dialog, the toast text, and tests changed. No layer baseline or composition-root change.
- At commit af5b9d26b alone, the scheduler brake test may rely on an `ask` mock leaked from an earlier test (build report). The branch tip sets it explicitly, and deliver squashes the commits, so no action is needed.
- Test verdict rests on: `src/tests/lib/features/todoist-sync/sync-now.service.test.ts`, `src/tests/lib/features/todoist-sync/sync-scheduler.service.test.ts`, `src/tests/lib/features/todoist-sync/sync-scheduler.logic.test.ts`, `src/tests/lib/features/todoist-sync/detach.logic.test.ts`.

## Resolution

1. nit (dialog wording with one active link): fixed. `confirmLineBrake` now reads "Synced task lines missing from the vault: N of M.", which holds for any count. The `stringContaining` assertions in `sync-now.service.test.ts` moved to the new text (seen failing before the source change).
