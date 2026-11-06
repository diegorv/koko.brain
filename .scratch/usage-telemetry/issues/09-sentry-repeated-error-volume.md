# 09: A repeating error does not burn the Sentry quota

**What to build:** Every `error()` call goes to Sentry (`src/lib/utils/debug.ts` line 31), and the SDK's `Dedupe` integration only drops an event identical to the one just before it. A broken auto-move rule logs once per save (`src/lib/features/auto-move/auto-move.service.ts` about lines 159-161 pass an `onError` that calls `error('AUTO-MOVE', ...)`), so a day of writing can send hundreds of events. The Sentry Developer plan includes 5k errors per month.

Limit what `captureSentryException` sends: at most one event per `(tag, message)` pair per N minutes (for example 10) per app session, counting the suppressed repeats and attaching the count as a tag on the next event that is sent for that pair. Keep it in `src/lib/core/settings/sentry.service.ts`, with the pure key/window logic in `sentry.logic.ts`.

**Blocked by:** 02 (same files; avoids a conflict)

**Status:** needs-triage

**Gate:** Frontend: `pnpm check` + `pnpm vitest run`.

- [ ] Failing first, `sentry.logic.test.ts`: same tag+message inside the window is suppressed; after the window it is sent with the suppressed count; different messages are independent
- [ ] `sentry.service.test.ts`: `captureException` is called once for ten identical `captureSentryException` calls inside the window
- [ ] The Settings copy mentions that repeats are throttled

## Notes

- Source: `raw/j22.md` (s10-F4), `raw/j21.md` (Dedupe behaviour).
- Needs triage: the owner may prefer to fix noisy call sites instead of throttling globally.
- Size: S.

## Comments
