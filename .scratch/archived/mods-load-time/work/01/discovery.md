# Issue 01 discovery: Labs shows mod load time

No `spec.md` for this feature; the Issue is the spec.

## Files that change

- `src/lib/plugins/mods/mods.store.svelte.ts:2-15`: `ModStatusEntry` gains `loadMs?: number` (JSDoc: set only on `loaded`).
- `src/lib/plugins/mods/mods-host.service.ts:685-718` (`loadMod` only): take `const evalStartedAt = performance.now()` just before `evaluateModSource` (line 687), and in the success branch (line 717) add `loadMs: Math.round(performance.now() - evalStartedAt)`. The end time is read right after `await module.onload(...)` settles. `startedAt` and the `load-result` record (654-658) stay as they are.
- `src/lib/plugins/mods/ModsStatusList.svelte:54-56`: after the state label, when `entry.loadMs !== undefined`, render ` · <span data-mod-load-ms={n}>n ms</span>`, or `< 1 ms` when `n` is 0.
- `help/documentation/28-mods.md:44`: a paragraph on the time in the Labs bullet list.
- Tests: `src/tests/lib/plugins/mods/mods-host.service.test.ts`, `ModsStatusList.test.ts`, `mods.store.test.ts` untouched (store API unchanged).

## Why nothing else changes

- Error entries come only from `recordLoadError` (632-646), disabled entries from `listDisabledMod` (739) and `disableMod` (907); none sets `loadMs`, and `upsertEntry` replaces the whole entry, so a previous time never survives an error or disable.
- A reload (save or switch on) goes through `loadMod`, whose upsert replaces the entry with the new time. A superseded load returns at 711-714 before the upsert, so it never writes.

## Tests (test-first)

- Host: spy `performance.now` onto a test clock (`vi.spyOn(performance, 'now')`, prior art `ModDialogDiagnostics.test.ts:340`). The `readTextFile` mock advances the clock by 1000 per read; the mod's top-level code and `onload` advance it via `globalThis.__clock`. Assert `loadMs` equals top-level + onload time (reads excluded), rounding (41.6 -> 42, 0.3 -> 0), error and disabled entries have no `loadMs`, a save replaces the time, off-then-on replaces it, and a superseded reload (gated `onload` released after a newer save) leaves the newer time.
- Existing `toEqual` on loaded entries (`mods-host.service.test.ts:157`, `:830`) gains `loadMs: expect.any(Number)`.
- `ModsStatusList.test.ts`: rows with `loadMs` 42 and 0 show `Loaded · 42 ms` / `Loaded · < 1 ms` and `data-mod-load-ms`; error and disabled rows have neither.

## Defaults taken

- Rounding is `Math.round`, matching `elapsedMs`; "under 1 ms" means the rounded value is 0, and `data-mod-load-ms` is then `0`.
- The time is the mod's top-level code plus `onload` (both are its own code); the manifest and `main.js` reads are excluded.
- The UI shows the time whenever `loadMs` is set; the host sets it only on `loaded`.

## Risks

- Tests that spy `performance.now` must restore it (`mockRestore` in `onTestFinished`), or later tests see a frozen clock.
