# 01: Settings > Labs shows how long each mod took to load

**What to build:** Each loaded mod in the Labs mod list shows how long it took to load, for example `Loaded · 42 ms`, so the owner can see whether a mod slows down vault open. The host already measures the load for the debug log (`load-result` with `elapsedMs`, `mods-host.service.ts:654-657`), but that only reaches the log file when file logging is on, and nothing shows it in the UI.

**Blocked by:** none

**Status:** resolved

## Acceptance criteria

- [x] Write failing tests first, through the real `startModsHost` / `loadMod` path and the real `modsStore` (no mocked stores), with `performance.now` controlled by the test, and in `src/tests/lib/plugins/mods/ModsStatusList.test.ts` on the rendered row.
- [x] `ModStatusEntry` (`mods.store.svelte.ts:2`) gains `loadMs?: number`, set only on a `loaded` entry (`mods-host.service.ts:716`). It is the wall time from just before `evaluateModSource` to `onload` settling, rounded to whole milliseconds: the mod's own code, not the manifest and `main.js` reads.
- [x] `error` and `disabled` entries have no `loadMs`, and their rows show no time.
- [x] The row of a loaded mod shows `Loaded · <n> ms` (`ModsStatusList.svelte:54-56`), with the number also in a `data-mod-load-ms` attribute. Under 1 ms shows `< 1 ms`.
- [x] A reload (save of `main.js`, or switching the mod off and on) replaces the time with the new load's. A superseded load does not change it.
- [x] The debug `load-result` record keeps its current meaning and fields; this adds no log event.
- [x] `help/documentation/28-mods.md` describes the time in the Labs section: what it measures, that it is wall time, and that at vault open the mods load together, so a mod whose `onload` awaits can show time spent waiting on others. A reload on save measures it alone.

## Scope and constraints

`mods.store.svelte.ts`, `mods-host.service.ts` (`loadMod` only), `ModsStatusList.svelte`, their tests and the docs. No threshold, warning or sorting by time, no per-callback or CPU measurement, and no change to the debug trace.

## Verification

Frontend gate: `pnpm check` and `pnpm vitest run`.

## Comments

- 2026-11-08: Level 1 of the mod performance idea (the equivalent of Obsidian's startup-time list). Level 2, time spent in host-invoked callbacks, waits for a real case of a mod slowing the app during use.
- 2026-11-08 (deliver, branch issue/01-labs-shows-mod-load-time): loaded mods record `loadMs` and the Labs row shows `Loaded · <n> ms`; docs updated. Review round 1: APPROVED with no findings, nothing to fix. Full suite: 579 files passed, 14066 tests passed, 54 skipped, exit 0.
