VERDICT: APPROVED

Reviewed `git diff main...HEAD` (commits 2d2926177, b9a3bc6a3, ca241fd67, 518239f51) in the worktree. No `.scratch/ux-quick-wins/spec.md` exists; the Issue is the spec.

## Acceptance criteria

- [met] Failing test first: the SettingItem label and description (`src/tests/lib/core/settings/SettingItem.test.ts`), BuildInfo (`BuildInfo.test.ts`), a dialog description and the Update error carry `select-text`. — New tests in `SettingItem.test.ts:69-75`, `BuildInfo.test.ts:74-78`, `src/tests/lib/components/ui/dialog/dialog-description.test.ts` (via a `Dialog.Description` added to `DialogHarness.svelte`) and `UpdateSection.download.test.ts` ("shows a failed check as selectable text"). Probe: with the five source files checked out from `main` and the branch tests kept, all 9 new tests fail (log read from vitest's own exit status 1); with the branch source they pass. Source: `SettingItem.svelte:26,28`, `BuildInfo.svelte:44-45`, `dialog-description.svelte:15`, `UpdateSection.svelte:310,372`.
- [met] `src/tests/lib/features/todoist-sync/TodoistSection.test.ts`: the `sync-root` row's root has `flex-col` and no control box with `max-w-[50%]`; Load projects, choose and load-error tests unchanged. — New test at `TodoistSection.test.ts:174-180` asserts `flex-col`, no `.max-w-[50%]`, and both controls present; the diff to that file is that one added block only, so the existing load, choose and load-error tests are untouched. Source: `layout="stacked"` at `TodoistSection.svelte:127`, `[data-setting="sync-root"]` wrapper kept.
- [met] The idle button reads "Check and download"; existing flow tests change only the label lookup (`UpdateSection.restart.test.ts:98,115,134,143`, `UpdateSection.layout.test.ts:50`). — `UpdateSection.svelte:276-278`. The diffs to `UpdateSection.restart.test.ts` (4 lines) and `UpdateSection.layout.test.ts` (the `checkButton` lookup and its error text) change only the label string. "Restart to update" still gates install.
- [met] A download-progress case: `Started{contentLength: 1000}` then `Progress{chunkLength: 500}` gives a progressbar named "Download of update v<version>" with `aria-valuenow="50"`; `contentLength: null` gives no "?" and no `aria-valuenow`. — `UpdateSection.download.test.ts` "shows a named progress bar..." (aria-label `Download of update v9.9.10`, `aria-valuenow="50"`, min 0 / max 100, text `(1 KB)... 50%`) and "shows no "?" and no value..." (no `aria-valuenow`, no `?` in the section text). Markup at `UpdateSection.svelte:282-301`; `aria-valuenow` is `undefined` when `totalBytes` is 0, so Svelte omits it.
- [not met] Manual in `pnpm tauri dev`: a Settings description and the version can be selected and copied; rail and tabs cannot; the Root project row has no overlap at 1440 px. — Not run by build or review; jsdom has no layout or selection. Needs the owner. The classes it depends on are in place and tested (see above); `body { user-select: none }` at `app.css:507` is unchanged, so rail and tabs stay non-selectable.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check` exit 0 (237 files, 0 errors, 0 warnings). Targeted vitest: 18 files, 256 tests, exit 0 (list below). The full suite is deliver's to run.

## Findings

1. **nit** `src/lib/core/settings/sections/UpdateSection.svelte:123` — the `if (bytes <= 0) return '?';` branch of `formatBytes` is now unreachable: its only caller (`:286`) sits inside `{#if totalBytes > 0}`. This change made it dead, so per the repo's "remove what your change orphaned" rule it could go (and the JSDoc stays accurate). Recorded as a deliberate default in discovery.md; leaving it is harmless. Fix: drop the branch, or keep it as a guard; no behaviour change either way.
2. **nit** `src/tests/lib/core/settings/UpdateSection.download.test.ts` — the "no "?"" assertion checks the whole section's `textContent`, so any future `?` elsewhere in UpdateSection (a help string, a question) would fail it for an unrelated reason. Fix (optional): scope it to the downloading row, e.g. the progressbar's parent.

No blocker or major findings. Checked and found fine:
- No scope creep: the five source files are exactly the ones the Issue names; the help hunk for the renamed button is left out as the Issue says; toasts untouched.
- `Check` and `Retry` use `() => checkForUpdates()` (`UpdateSection.svelte:276,311`); the downgrade path is unchanged.
- Unknown size: text drops both the "(?)" and the frozen "0%", and the empty bar pulses; `aria-valuemin`/`aria-valuemax` without `aria-valuenow` is valid for an indeterminate progressbar.
- Dialog description consumers (ModDialogHost, TypeNameDialog, TasksView, EventShortcutsDialog, TodoistSyncLogDialog, FileHistoryDialog sr-only, command-dialog): none passes `select-none`, so `cn` merges cleanly. `components/ui/` edit stays Tailwind-only, per the layer rule.
- No E2E spec or other test looks up a "Check" button by text (only kanban's unrelated `aria-label="Check"`).
- No layer-baseline or composition-root change. Tabs, `git diff --check` clean.

## Test verdict rests on

`pnpm vitest run` on: `src/tests/lib/components/ui/dialog/dialog-description.test.ts`, `src/tests/lib/components/ui/dialog/dialog-content.test.ts`, `src/tests/lib/components/ui/command/command-dialog.test.ts` (both use the changed `DialogHarness`), `src/tests/lib/core/settings/BuildInfo.test.ts`, `src/tests/lib/core/settings/SettingItem.test.ts`, `src/tests/lib/core/settings/settings-controls.test.ts`, `src/tests/lib/core/settings/settings-text.test.ts`, `src/tests/lib/core/settings/UpdateSection.changelog.test.ts`, `src/tests/lib/core/settings/UpdateSection.channel.test.ts`, `src/tests/lib/core/settings/UpdateSection.download.test.ts`, `src/tests/lib/core/settings/UpdateSection.layout.test.ts`, `src/tests/lib/core/settings/UpdateSection.restart.test.ts`, `src/tests/lib/features/todoist-sync/TodoistSection.test.ts`, `src/tests/lib/features/todoist-sync/sections.logic.test.ts`, `src/tests/lib/architecture/raw-invoke.test.ts`, `src/tests/lib/chrome-type-scale.test.ts`, `src/tests/lib/utils/build-info.test.ts`, `src/tests/lib/core/markdown-editor/extensions/live-preview/styles.test.ts`. Result: 18 files, 256 tests passed, exit 0. Plus `pnpm check`, exit 0.

## Resolution

1. Fixed: dropped the unreachable `bytes <= 0 -> '?'` branch of `formatBytes` in `UpdateSection.svelte`; its only caller runs inside `{#if totalBytes > 0}`.
2. Fixed: the unknown-size test in `UpdateSection.download.test.ts` now checks the text of the downloading row (the progressbar's parent) instead of the whole section.
