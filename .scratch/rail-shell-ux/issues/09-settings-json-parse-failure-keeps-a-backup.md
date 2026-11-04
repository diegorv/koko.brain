# 09: A broken settings.json is backed up and reported, not silently replaced by defaults

**What to build:** When `.kokobrain/settings.json` exists but is not valid JSON, the app copies its bytes to `.kokobrain/settings.broken-<YYYYMMDD-HHmmss>.json` before anything writes `settings.json`, runs on the defaults, and shows a toast that names the backup file and says the settings were reset. When the file exists but cannot be read, the app runs on the defaults in memory, does not write `settings.json` during load, and shows a toast. Help 19 says how to edit settings.json safely: quit the app first, because the app rewrites the file from memory on the next settings change and drops unknown keys.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing test first: `loadSettings` on a file containing `{"periodicNotes": ` writes a backup with the exact original bytes before it writes `settings.json` (service test, plugin-fs mocked at the boundary, real settings store)
- [ ] After that load the store holds the defaults and a user-visible toast was raised naming the backup (service test)
- [ ] A read error leaves `settings.json` unwritten during load, keeps defaults in memory and raises a toast (service test)
- [ ] A failed backup write does not lead to `settings.json` being overwritten during load (service test)
- [ ] Missing file and empty file keep today's behaviour (existing tests stay green)
- [ ] Help 19 (the settings.json section, around line 294) gets the "quit before editing" note and names the backup file

## Notes

- **Cause (traced):** `core/settings/settings.service.ts:30-64` parses inside a `try`; the `catch` (`:166-178`) stores `DEFAULT_SETTINGS` and calls `saveSettings`, so themes, periodic formats, Todoist, Sentry, Auto Move and the rail layout are lost. `error()` only logs and reports to Sentry, so the user sees nothing.
- **Main-session decisions:** a timestamped backup per failure (no rotation; failures are rare and the files are small); the toast is the existing toast helper used by other services; no file watcher for external edits (documented instead).
- **Source:** `.scratch/rail-shell-ux/review-2026-11-03.md` F70, F31.
- **Size:** S.

## Comments
