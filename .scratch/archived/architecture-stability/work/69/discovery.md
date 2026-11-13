# Issue 69 discovery

## Files that change
- `e2e/specs/event-calendar.spec.ts:84, :237, :285, :353`, `event-calendar-day-drag.spec.ts:24`, `event-calendar-path-identity.spec.ts:20`, `event-calendar-tasks.spec.ts:20`, `event-calendar-focus.spec.ts:27`: hand-made `{ changed, affected, version }` emits.
- `e2e/mocks/vault-index.ts`: `rebuildAll()` (:259) is what `fs.populate` runs (`onPopulate`, :514). Add `rescanResult()`, the `UpdateResultV2` of a whole-index rebuild (`fullRescan: true`, empty path lists), the payload Rust's `scan_vault_v2*` emits and `tauri-core.ts:110` builds.
- `e2e/types/global.d.ts:24-26`: `E2eEvents.emit(event: string, payload?: unknown)` is untyped; replace with `E2eEventBus` (`e2e/mocks/tauri-event.ts:30`, typed against `EventMap`).
- `tsconfig.json:23`: include is `e2e/mocks` only, so no spec is type-checked at all: a typed payload alone cannot fail `pnpm check`. Widen to `e2e` (prior art: Issue 12, 4c76cedc, added `e2e/mocks`).
- `e2e/specs/live-preview/arrow-reveal.spec.ts:1`: the only error the wider include surfaces (imports `Page`/`Locator` from the fixture, which does not re-export them); import them from `@playwright/test`.

## Plan
1. Type-check e2e in `pnpm check`: tsconfig include, typed `E2eEvents`, arrow-reveal import. `pnpm check` green (the old emits still go through `(window as any)`).
2. Mock `rescanResult()`; the five specs use `window.__e2e` (typed) and emit `e2e.vaultIndex.rescanResult()`. No `as any` left in those emit blocks.
3. Scratch check (not committed): an old-shape emit through `window.__e2e.events.emit` fails `pnpm check`.
4. `bash scripts/e2e.sh` full run.

## Defaults
- Payload is a full rescan, not `upserted: paths`: `populate` rebuilds the whole mock index, and before Issue 65 the listener refreshed everything on any emit, so the specs keep the refresh they were written against. `tasks-view.spec.ts:93` writes one file, so `update(p, c)` fits there; populate is a rebuild.
- `(window as any)` stays in the other specs; only the emit blocks this Issue names are retyped.

## Risks
- `pnpm check` now covers every spec and `playwright.config.ts`: a later spec type error fails the gate (intended).
- E2E uses port 1421: one `scripts/e2e.sh` run at a time.
