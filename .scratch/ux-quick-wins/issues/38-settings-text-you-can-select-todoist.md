# 38: Settings: text you can select, the Todoist root row fits, the update button says it downloads

**Origin:** design review 2026-11-17, proposals P83 (part), P80, P126, prototypes `.scratch/design-review/prototypes/feedback-components.html` (P83) and `settings-auto-organize.html` (P80, P126), research `.scratch/ux-quick-wins/research/verdict-feedback-a.md` (Q1, P83 slice), `verdict-settings-b.md` (Q6) and `breakdown.md` (old ticket 34).

**What to build:**

1. **Selectable text (P83).** `select-text` on the SettingItem label and description spans (`src/lib/core/settings/sections/SettingItem.svelte:26,28`), BuildInfo's container (`src/lib/core/settings/BuildInfo.svelte:49-52`), the dialog description (`src/lib/components/ui/dialog/dialog-description.svelte`, 8 consumer files), the Update error span (`UpdateSection.svelte:291`) and the "Changes in this build" text (`:353`). `body` stays `user-select: none` (`app.css:507`; the editor opts in at `editor-theme.ts:40`). Toasts stay non-selectable: sonner sets pointer capture on pointerdown and swipes on the first 1 px of drag (`Toast.svelte:349-360,418-427`), so drag-select fights the swipe.
2. **Todoist Root project fits (P80).** The Root project row (`src/lib/features/todoist-sync/TodoistSection.svelte:120-148`) uses `layout="stacked"` (`SettingItem.svelte:21-23,31-35`, already used at `TodoistSection.svelte:77`). Today a Button plus a `w-44` Select trigger overflow the 50% control box (`SettingItem.svelte:37`) and cover the description. The wrapper `[data-setting="sync-root"]` stays.
3. **Update button (P126).** The idle button (`UpdateSection.svelte:276-278`) reads "Check and download"; install still waits for "Restart to update". The downloading state renders a `role="progressbar"` named "Download of update v<version>", with `aria-valuenow` when the size is known and the text without "(?)" when it is not (`formatBytes` returns `?` at `:123`; progress text `:282`). Check and Retry handlers (`:276`, `:292-294`) become `() => checkForUpdates()`: a refactor with no test of its own, because the current call already yields the same invoke (the MouseEvent as `opts` leaves `allowDowngrades` and `forceChannel` undefined, `:170-171`).

Not in this ticket: toast text selection (waits for the toast Copy details feature), `SettingItem` auto-naming and row click-through (P28 rest), UpdateSection state kept across remounts (open-itens 157, runs after this ticket), and the help hunk for the renamed button. `help/documentation/19-settings.md:330,336` (the "Check" label) is dropped from this ticket because the mvp-claude branch changes that file (`19-settings.md` at lines 6 and 261-279 on `origin/mvp-claude`); record it as a follow-up, a docs-only commit after mvp-claude merges.

**Size:** S.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** pnpm check + pnpm vitest run (no E2E selector changes; no spec looks the update button up by text).

- [ ] Failing test first: the SettingItem label and description (`src/tests/lib/core/settings/SettingItem.test.ts`), BuildInfo (`BuildInfo.test.ts`), a dialog description and the Update error carry `select-text`.
- [ ] `src/tests/lib/features/todoist-sync/TodoistSection.test.ts`: the `sync-root` row's root has `flex-col` and no control box with `max-w-[50%]`; Load projects, choose and load-error tests unchanged.
- [ ] The idle button reads "Check and download"; existing flow tests change only the label lookup (`UpdateSection.restart.test.ts:98,115,134,143`, `UpdateSection.layout.test.ts:50`).
- [ ] A download-progress case: `Started{contentLength: 1000}` then `Progress{chunkLength: 500}` gives a progressbar named "Download of update v<version>" with `aria-valuenow="50"`; `contentLength: null` gives no "?" and no `aria-valuenow`.
- [ ] Manual in `pnpm tauri dev`: a Settings description and the version can be selected and copied; rail and tabs cannot; the Root project row has no overlap at 1440 px.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P83 (part).** Text selection is disabled app-wide with no opt-in, so errors, paths, versions and Info values cannot be copied. A `select-text` opt-in for Settings content, dialogs, errors and Info rows ships; toasts do not.
- **P80.** The Todoist "Root project" control overflows onto its description. Use the stacked SettingItem layout for that row.
- **P126.** The update "Check" button also downloads and installs. Rename it "Check and download", add a progress bar, hide an unknown size and wrap the handler.

## Problem

Settings text, the version string and update errors cannot be copied. The Todoist Root project row spills over its own description. "Check" also downloads the update, and the download progress is plain text that can read "(?)".

## Evidence

Checked at 085b23c5d.

- `app.css:507` `user-select: none` on `body`; targets at `SettingItem.svelte:26,28`, `BuildInfo.svelte:49-52` (not `:62-63`), `UpdateSection.svelte:291,353`, `dialog-description.svelte`.
- `TodoistSection.svelte:120-148` inline `SettingItem` with Button plus `Select.Trigger class="w-44"`; screenshot `.scratch/design-review/screens/settings-todoist-light.png`. No E2E selects `sync-root`; help `19-settings.md:254` describes behaviour, not layout.
- `UpdateSection.svelte:167-215` flow (check then `plugin:updater|download_and_install` at `:203-206`).
- Verdict mvp-claude check: `19-settings.md` hunks at lines 6 and 261-279 are on `origin/mvp-claude`; no component file in this ticket is.

## Sequence with

Ticket 19 (toasts follow the theme) edits `AppOverlays.svelte` only; the SettingItem `select-text` moved here. Ticket 22 and 21 edit other Settings sections. Open-itens 157 (UpdateSection state on remount, M) runs after this ticket; its progressbar markup survives that. Open-itens 202 and 203 (`SettingItem` hint prop, cards) no longer conflict because no other ticket edits `SettingItem.svelte`.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping. Follow-up recorded (not a ticket yet): after mvp-claude merges, update `help/documentation/19-settings.md:330,336` to say "Check and download".
