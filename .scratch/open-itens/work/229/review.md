VERDICT: APPROVED

## Acceptance criteria

- [met] Failing test first, `src/tests/lib/core/settings/TodoistSection.test.ts` with the real settings store: the token field shows the storage sentence. Fails today. — The test is at `src/tests/lib/features/todoist-sync/TodoistSection.test.ts:102-106`. That path is the right one: the component is `src/lib/features/todoist-sync/TodoistSection.svelte` and the Issue's `core/settings/` path does not exist. The test imports the real `settingsStore` (`:25`) and mocks only the opener, the HTTP plugin and debug (`:8-15`). It reads `row('api-token').textContent` and checks both the Todoist path and "Stored in this vault's .kokobrain folder. Exclude .kokobrain from sync tools." It fails on main, because main has no `data-setting="api-token"` wrapper, so `row()` throws, and main's description lacks the sentence anyway. It passes on HEAD. I ran it myself: see Checks.
- [met] The help doc and ADR changes are prose only; `src/tests/help/` still passes. — `git diff main...HEAD` changes only prose in `docs/adr/0019-kokobrain-in-vault-data-dir.md` (a new amendment section at :9-15) and `help/documentation/10-tasks-and-todoist.md:124` (one sub-bullet). `pnpm vitest run src/tests/help/` passed, run together with the files listed under Checks.

## Findings

1. nit, `docs/adr/0019-kokobrain-in-vault-data-dir.md:15`: the sentence "The Todoist settings row and the Tasks and Todoist help page say so." points at other files, so it goes stale without notice when they change (global comment rule). It is harmless in an ADR amendment, which records a point in time. Fix (optional): leave it, or drop the sentence.
2. nit, `help/documentation/19-settings.md:251`: the Settings reference table still says only "Your personal Todoist API token" and does not say where the token is stored. The Issue lists only `10-tasks-and-todoist.md`, so this is outside the Issue's scope and no change is needed here. Fix (optional): a one-line follow-up adding the same storage fact to that table row.

No blockers or majors. Other things I checked:
- The Issue's requirements for each file are all met. The JSDoc at `src/lib/core/settings/settings.types.ts:250-253` has the exact sentence the Issue asked for. The Settings description at `TodoistSection.svelte:76` keeps the Todoist path and adds the requested text word for word. The ADR amendment is dated 2026-11-06, sits above Context like ADR-0003's amendments, cites PRD L1 (a), and says to exclude `.kokobrain/`. The original Consequences text (`:69`) is unchanged.
- The claim that the Keychain service is gone holds. ADR-0013 has `status: superseded`. `grep -rniE "keychain|keyring"` over `src-tauri/src`, `src-tauri/Cargo.toml` and `src/` (`*.ts`, `*.svelte`) finds nothing.
- The `<div data-setting="api-token">` wrapper matches the existing `sync-enabled` / `sync-root` rows in the same component, which use the same pattern inside the same `flex flex-col gap-2` parent, so the layout does not change. It uses tabs, and no new copy contains an em dash (`settings-copy.test.ts` passes).
- Scope: no storage, store or Rust change, and no layer-baseline or composition-root change.

## Checks

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/todoist-sync/TodoistSection.test.ts src/tests/help/ src/tests/lib/core/settings/settings-copy.test.ts`: exit 0, 12 files, 364 tests passed. My test verdict rests on these files. `settings.types.ts` changes only a JSDoc comment, and no test asserts the old description string (grep for "Personal API token" finds only the component and the new test).
- I did not run the full suite: that is deliver's job.

## Resolution

1. Rejected (no change). The ADR amendment records a decision at a point in time, so the cross-reference reads as history, not as a claim kept current. The reviewer marks it harmless and leaves it optional.
2. Rejected for this Issue (no change). `help/documentation/19-settings.md` is outside the Issue's listed files. Adding the storage fact to the Settings reference table can be a separate one-line follow-up.
