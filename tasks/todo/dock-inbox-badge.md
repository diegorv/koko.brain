# Dock badge: inbox count

Show the lifecycle inbox count as a red dock-badge on the macOS app icon, toggleable from
the Quick Capture settings section. Reuses the existing inbox notion
(`getInboxCount`: `!organized && !archived && isA !== 'Type'`) and the already-app-global
`typeDefinitionsStore.entries` — no new IPC, no new Rust command.

## Decisions (from grill)

- **Count source:** reuse lifecycle inbox (`getInboxCount`), NOT a configurable `status:` matcher.
  The badge mirrors the exact data the type-sidebar nav already counts. If `explicitOrganization`
  is OFF, the count is effectively ~0 (notes default to organized) — accepted consequence.
- **Control:** single boolean toggle, default ON. New top-level `AppSettings.dockBadgeInboxCount`.
- **UI location:** Quick Capture section (user's choice), even though inbox is a type-definitions concept.
- **Data path:** app-level `$effect` reads `settingsStore.dockBadgeInboxCount` + `typeDefinitionsStore.entriesVersion`,
  recomputes, applies. Reuses `typeDefinitionsStore.entries` (kept fresh by `tauri-listeners.service.ts`
  on every `vault-index-updated`; initial `scan_vault_v2` emits it too).
- **Mechanism:** JS API `getCurrentWindow().setBadgeCount(n)` (@tauri-apps/api 2.11.0) +
  capability `core:window:allow-set-badge-count` in `default.json`.
- **Zero handling:** count 0 / toggle OFF -> clear badge (`setBadgeCount()` no-arg).

## Tasks

- [x] Task 1: Add `dockBadgeInboxCount: boolean` (default `true`) to `AppSettings` type, `DEFAULT_SETTINGS`,
      `loadSettings` merge, and store getter (no dedicated setter; section uses `setSettings` like `explicitOrganization`).
      Tests: store getter default + reflects setSettings, settings.service load merges default when absent / respects false.
- [x] Task 2: Add `"core:window:allow-set-badge-count"` to `src-tauri/capabilities/default.json` permissions.
- [x] Task 3: Pure logic `features/dock-badge/dock-badge.logic.ts` -> `dockBadgeCount(enabled, entries): number | null`
      (null when disabled, else `getInboxCount`). Test happy/empty/disabled. Placed in features/ (not core/) to avoid a
      core->features import: it reuses `getInboxCount` + the type-definitions store, both features-layer.
- [ ] Task 4: Service `core/dock-badge/dock-badge.service.ts` -> `applyDockBadge(value: number | null)`
      calls `getCurrentWindow().setBadgeCount`, maps `null`/`0` -> clear, try/catch + log. Test with mocked `@tauri-apps/api/window`.
- [ ] Task 5: Wire app-level `$effect` in `AppShell.svelte` (read toggle + `entriesVersion`, compute via logic,
      `applyDockBadge` inside `untrack()`).
- [ ] Task 6: Add the toggle to `QuickCaptureSection.svelte` (SettingItem + checkbox bound to the setting, calls `onchange`).
- [ ] Task 7: Manual verify in app — badge appears with inbox count, updates on organize/archive, clears on toggle OFF.

## Notes

- Frontend-only change (TS + Svelte + 1 capability JSON). Per CLAUDE.md rule 6, run `pnpm check` + `pnpm vitest run`
  before each commit. No `cargo test` (no Rust code touched; capability JSON is verified by the manual app run in Task 7).
- Worktree needs `pnpm install` before tests run.
- `getInboxCount` already has coverage in `inbox-workflow.logic.test.ts`.
