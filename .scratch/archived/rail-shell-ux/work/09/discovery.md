# Issue 09 discovery

No `spec.md` in `.scratch/rail-shell-ux/`; the Issue alone drives this.

## Files that change

- `src/lib/core/settings/settings.service.ts:1` import `copyFile`; add `toast` from `svelte-sonner` (as `update-check.service.ts:1`).
- `src/lib/core/settings/settings.service.ts:30-180` `loadSettings`: split the single `try` into three stages.
- `src/tests/lib/core/settings/settings.service.test.ts:6-11` add `copyFile` to the plugin-fs mock, mock `svelte-sonner` (`update-check.service.test.ts:10`); new tests in `describe('loadSettings')`; rewrite `:292-305`.
- `help/documentation/19-settings.md:288-294` "Settings File Location": quit-before-editing note, names `settings.broken-<timestamp>.json`.

## Plan

1. Read stage: `exists` + `readTextFile` in a `try`. On throw: `error()`, defaults in the store, `toast.error`, theme + typography applied, return. No `writeTextFile`, no `copyFile`.
2. Missing / whitespace-only file: unchanged (defaults, `saveSettings`, no toast). Its write failure is caught and logged (today the outer catch did that).
3. Parse stage: `JSON.parse`, plain-object check (`null`, arrays, primitives rejected), merge + `normalizeSettings`. On throw: defaults in the store, `copyFile(settings.json, settings.broken-<YYYYMMDD-HHmmss>.json)` (local time from `new Date()`).
   - copy fails: `error()`, toast "could not back up ... left unchanged", no write, return.
   - copy ok: toast naming the backup file and "reset to defaults", then `saveSettings` (failure logged as "Also failed to save default settings").
4. Good parse: store the merged settings, then `saveSettings` in its own `try`; failure logged with `error()`, parsed settings kept, no backup.
5. `applyActiveTheme` + `applyHeadingTypography` run on every branch.

## Prior-art tests

- `settings.service.test.ts:232-305` (parse/read error cases), `update-check.service.test.ts:10` (sonner mock).
- Clock: `vi.useFakeTimers({ toFake: ['Date'] })` + `vi.setSystemTime(new Date(2026, 10, 4, 9, 5, 7))` -> stamp `20261104-090507`; `vi.useRealTimers()` in cleanup.

## Risks

- `raw-write-ratchet.test.ts:30` allows one `writeTextFile(` in the service: the backup uses `copyFile`, so the count stays one.
- Other tests mocking plugin-fs without `copyFile` only hit it on the parse-failure path; `app-lifecycle.service.test.ts:101` mocks the whole settings service.

## Defaults taken

- The merge sits inside the parse stage: a parsed object whose shape makes the merge throw is treated as a parse failure (backup + defaults), which keeps today's safety net instead of letting `loadSettings` reject.
- Stamp formatting stays a private helper in the service (one caller, covered through the service test).
- Toast copy names the backup by file name only (`settings.broken-20261104-090507.json`), inside `.kokobrain`.
