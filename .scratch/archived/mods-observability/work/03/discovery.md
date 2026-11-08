# Dialog outcome discovery

## Scope and evidence
- `src/lib/plugins/mods/mod-dialogs.store.svelte.ts:35-92`: queue/resolver ownership, monotonic IDs, settlement, unload and reset. `current` (52) and `dialogs` (56) derive directly from queue; only ModDialogHost consumes it in production.
- `src/lib/plugins/mods/ModDialogHost.svelte:26-80,86-198`: renders current, handles focus/open, answers, Cancel and dismissal. Record opened at the component callback, not queue promotion.
- `src/lib/plugins/mods/mods-host.service.ts:182-252,378-383,529`: validation, loading task and notification boundaries; unload already closes this mod's dialogs. No run linkage exists in the shared facade.
- `src/lib/utils/debug.ts:16-24` and `src/lib/utils/log.service.ts:76-122`: debug gates file writes; appendLog JSON-serializes objects and buffers local writes. Reuse unchanged.
- Store writes remain queue/resolver changes; host facade opens/settles that store. The UI reads current and derives picker rows. Existing real-state tests cover both queue getters.

## Implementation plan
1. Extend real facade/component tests with the real debug/session writer and mocked filesystem boundary; first prove missing serialized events.
2. Instrument queue, actual opening and exactly-once terminal transitions with explicit host reason codes and elapsed timing. Preserve results, queued cancellation, unload isolation and reset.
3. Instrument validation rejection, notification request and independent loading task settlement. Keep original errors, immediate task start and cancellation semantics.
4. Add privacy and lifecycle regressions, document events and limits, run targeted tests plus pnpm check, and commit.

## Prior art and verification
- Copy DOM/result assertions from `src/tests/lib/plugins/mods/ModDialogHost.test.ts:25-53,107-435`.
- Reuse queue/reset semantics in `src/tests/lib/plugins/mods/mod-dialogs.store.test.ts` and unload fixtures in `mods-host.service.test.ts`.
- Observe serialized writeTextFile output, not logger spies; keep stores, debug and log.service real.
- Target component, dialog-store, host-service, API-contract and architecture tests; search for changed names/messages before the final gate.
- Full suite and existing mods E2E verification belong to deliver; do not mark the Issue resolved here.

## Defaults and risks
- No feature spec.md exists. Issue 03 and ADR-0036/ADR-0015 supply the contract and local logging vocabulary.
- No prior Issue implementation is required; Issue 01 is independent and not present on this base.
- Use fixed event/tag/reason vocabulary and JSON object fields for mod identity, never interpolate mod text into tags. Exclude display names, titles, messages, values, picker metadata and exception contents.
- Capture cancellation source where known: button, Escape, ordinary dismissal, mod unload and reset. Never infer it from the returned value.
- Loading closure/cancellation request is separate from task success/failure; late task settlement must not close another dialog or emit another terminal event.
- Shared ctx.ui has no action/run identity; do not infer one. Notification requests make no delivery or acknowledgement claim.

## Build evidence
- `ModDialogDiagnostics.test.ts` exercises real facade/store/rendering and the real writer through mocked filesystem I/O, including actual enableMod/disableMod unload.
- Red/green slices reproduced missing lifecycle, originating cancellation reasons, loading task outcomes, and validation/notification records before implementation.
- Targeted gate: 28 files, 743 tests passed (31 diagnostic regressions); pnpm check: 226 files, zero errors/warnings; git diff --check passed.
- A changing notification-kind getter reproduced validation/use drift; snapshot its value once so automatic records cannot include an unvalidated kind.
- Fresh worktree required `pnpm exec svelte-kit sync` after dependency installation before vitest could resolve the generated tsconfig.
- Full suite, mods E2E and native-app verification remain for deliver; Issue status and ledger are untouched.
