# 16: The view's rules survive a restart

**What to build:** Nothing in the Tasks view is persisted (`tasks.store.svelte.ts:4-33`), so every source card, exclude, quick filter, grouping and sort is lost on restart. Store them per vault (PRD assumption A6, "Storage").

- A `tasksView` key in the per-vault `.kokobrain/settings.json`, through the settings store and service like the other sections (`src/lib/core/settings/settings.types.ts`, `settings.store.svelte.ts`, and the per-section merge in `settings.service.ts`, as `todoist` does at `:160-162`). `core/settings` must not import `TaskQuery` or `TaskExcludes` from `features/tasks` (core to features fails `layer-rules.test.ts`), so core types `tasksView` as an opaque JSON value and `features/tasks` parses and validates it. In this Issue it holds `{ version: 1, globalExcludes, query }`: the four default toggles and the excluded lists as `globalExcludes`, and the current sources, quick filters, group and sort as `query`.
- Reading tolerates unknown keys, fills missing keys with defaults (the `#to-list` default card, the four excludes on), and an invalid value falls back to the defaults with an `error()` log and a toast. It is not overwritten until the user changes the view.
- Writes follow the settings service's existing save path. No new `writeTextFile` site.

**Blocked by:** 13

**Status:** needs-triage

**Waits on:** `audit-2026-11-04/03` resolved (a settings file that was never loaded must not be saved over). Without it, a failed load followed by a Tasks edit would replace the vault's whole settings file. Otherwise fully specified.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, with the real settings store and real `tasksStore`, mocking only `@tauri-apps/plugin-fs`: add a folder card and set Group by due; the saved JSON holds both under `tasksView`; a fresh load from that JSON restores them in `tasksStore`. Fails today.
- [ ] A settings file without `tasksView` loads the defaults. One with `tasksView: 42` loads the defaults, logs, and is not written until the next change.
- [ ] Unknown keys inside `tasksView` survive a save.
- [ ] `layer-rules.test.ts` stays green with no new baseline entry.

## Notes

- **Size:** M.
