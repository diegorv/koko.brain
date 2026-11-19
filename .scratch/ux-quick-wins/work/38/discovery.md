# Issue 38 discovery

No `spec.md` in `.scratch/ux-quick-wins/`; the Issue is the spec.

## Files that change

- `src/lib/core/settings/sections/SettingItem.svelte:26,28`: add `select-text` to the label and description spans.
- `src/lib/core/settings/BuildInfo.svelte:49`: `select-text` in both `containerClass` variants (`:44-45`), so the welcome footer copy works too.
- `src/lib/components/ui/dialog/dialog-description.svelte:15`: `select-text` in the base `cn(...)`; caller classes still merge after it. Consumers (8): ModDialogHost, TypeNameDialog, TasksView, EventShortcutsDialog, TodoistSyncLogDialog, FileHistoryDialog (sr-only), command-dialog. None passes `select-none`.
- `src/lib/core/settings/sections/UpdateSection.svelte`: idle label "Check and download" (`:276-278`); Check and Retry handlers `() => checkForUpdates()` (`:276,292`); error span `select-text` (`:291`); changelog "Since ..." span `select-text` (`:353`); downloading state (`:282`) becomes text plus a `role="progressbar"` (aria-label "Download of update v<version>", min 0, max 100, `aria-valuenow` only when `totalBytes > 0`). Unknown size: text "Downloading v<version>..." without size or percent.
- `src/lib/features/todoist-sync/TodoistSection.svelte:124-127`: `layout="stacked"` on the Root project SettingItem; the `[data-setting="sync-root"]` wrapper stays.

## Tests

- `src/tests/lib/core/settings/SettingItem.test.ts`: label and description carry `select-text`.
- `src/tests/lib/core/settings/BuildInfo.test.ts`: the container carries `select-text`.
- New `src/tests/lib/components/ui/dialog/dialog-description.test.ts` via `src/tests/fixtures/DialogHarness.svelte` (add a `Dialog.Description`; the dialog-content tests only check `toContain`).
- New `src/tests/lib/core/settings/UpdateSection.download.test.ts`: the Channel mock records the `onEvent` the download invoke gets and keeps the promise pending; Started 1000 + Progress 500 gives the named progressbar with `aria-valuenow="50"`; `contentLength: null` gives no "?" and no `aria-valuenow`; a rejected check renders the error span with `select-text`. Prior art: `UpdateSection.restart.test.ts` mocks, `ModActionPicker.test.ts:231` progressbar asserts.
- `UpdateSection.restart.test.ts:98,115,134,143` and `UpdateSection.layout.test.ts:50`: label lookup only.
- `src/tests/lib/features/todoist-sync/TodoistSection.test.ts`: `sync-root` row root has `flex-col`, no `max-w-[50%]` control box.

## Defaults taken

- Unknown size: the "0%" is dropped with the "(?)", since the percent never moves until Finished; the bar has no fill and pulses (indeterminate).
- `formatBytes` keeps its `?` branch (now unreachable from the template); untouched to keep the diff surgical.
- The help hunk (`19-settings.md:330,336`) stays out, per the Issue.

## Risks

- `select-text` on BuildInfo also applies on the welcome footer (wanted: version copyable there too).
- Manual check in `pnpm tauri dev` (selection, 1440 px row) is not run by this agent.
