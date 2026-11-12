# 030 discovery: never write an unread settings.json, never purge history on its defaults

No `spec.md` in `.scratch/open-itens/`; the Issue file is the whole spec. Owner decision D3 (a) is recorded in the Issue Notes.

## Files that change

- `src/lib/core/settings/settings.types.ts`: new `SettingsLoadOutcome = 'loaded' | 'defaults' | 'file-protected'`.
- `src/lib/core/settings/settings.service.ts:26-76` `loadSettings` returns the outcome: read error (`:42-47`) and failed backup (`resetBrokenSettingsFile :210-226`, now returns whether the copy succeeded) give `'file-protected'`; missing/blank file and parse error with a good backup give `'defaults'`; a parsed file gives `'loaded'`. Docstring `:26-35` rewritten. Toasts `:45`, `:217` add that settings changes in this session will not be saved.
- `src/lib/core/settings/settings-persistence.svelte.ts:46-87`: `startSettingsPersistence(vaultPath, outcome = 'loaded')`; the session records whether it may write; `flushSettingsPersistence` returns before writing when it may not. One guard covers the debounced write, the quit flush and the flush in `stopSettingsPersistence` (vault switch), since all three go through `flushSettingsPersistence`.
- `src/lib/app/lifecycle/app-lifecycle.service.ts:207-222` keeps the outcome, passes it to `startSettingsPersistence`, comment `:219-221` updated; `:287-291` skips `cleanup_history` when the outcome is `'file-protected'`.

## Plan

1. Failing tests in `settings-persistence.test.ts` (add `copyFile` to the fs mock, mock `svelte-sonner`, real `loadSettings` + store): read error, bad JSON + copyFile rejects, `updateUpdates({ lastCheckedAt: 1 })`, each with `writeTextFile` never called for `/vault/.kokobrain/settings.json`, also after `flushSettingsPersistence` and `stopSettingsPersistence`. Then the persistence + service change. Commit.
2. `settings.service.test.ts`: outcome per branch, toast text says changes will not be saved; `:600` `.resolves.toBeUndefined()` becomes `.resolves.toBe('loaded')`. Commit with step 1 if the service change lands there.
3. `app-lifecycle.service.test.ts`: `loadSettings` mock resolves `'loaded'`; `startSettingsPersistence` assertions take the outcome; new tests: `cleanup_history` runs on `'loaded'`/`'defaults'`, is skipped on `'file-protected'`. Commit.

## Prior art

- `settings-persistence.test.ts` `settle()` + fake timers; `settings.service.test.ts:446-461` (backup fails) and `:463-500` (unreadable) for the mock setup.
- Lifecycle: `expect(invoke).toHaveBeenCalledWith('open_vault_db', ...)` at `app-lifecycle.service.test.ts:474`.

## Defaults taken

- The AC test sketch calls `startSettingsPersistence('/vault')` with one argument, while What to build says initializeVault passes the outcome on. The test passes the outcome returned by the real `loadSettings`: `startSettingsPersistence('/vault', await loadSettings('/vault'))`. The parameter is optional (default `'loaded'`) so the existing persistence tests stay unchanged, as the happy-path criterion asks. The only production caller is `initializeVault`.
- Outcome names: `'defaults'` instead of the Issue's example `'defaults-written'`, since the defaults write can itself fail and the outcome still allows later writes.
- A parse error whose backup succeeded is `'defaults'`: the old bytes are safe in the backup, so writes and the history purge go ahead (the AC limits the skip to read error and failed backup).
- The after-save history hook still registers on the defaults (`history.enabled` default); the Issue only asks to skip the purge.

## Risks

- The protected session keeps the store's defaults for the whole session, so a user who changes a setting sees it apply but not survive a restart; the toast says so.
