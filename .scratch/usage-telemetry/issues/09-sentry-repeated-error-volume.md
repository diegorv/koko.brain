# 09: A repeating error does not burn the Sentry quota

**What to build:** Every `error()` call goes to Sentry (`src/lib/utils/debug.ts` line 31). The Developer plan includes 5k errors per month.

The SDK's `Dedupe` integration (`@sentry/core/build/esm/integrations/dedupe.js`) drops an event only when its exception type, value and stack match the event sent just before it. So a single broken auto-move rule failing on every save is already dropped. That rule's `onError` calls `error('AUTO-MOVE', ...)`, in `src/lib/features/auto-move/auto-move.service.ts` about lines 159-161. Repeats get through only when other errors interleave, or when two or more rules fail. Errors whose message varies per file get past Dedupe every time.

Proposal: limit what `captureSentryException` sends to at most one event per key per N minutes (for example 10) per app session.
- Count the suppressed repeats, and attach the count as a tag on the next event sent for that key.
- The key is `tag` plus:
  - `${name}: ${message}` when the captured value is an Error;
  - the string itself when it is a string;
  - `'non-error'` otherwise.
  `error()` captures the Error argument, not the human message, so the key must come from the captured value.
- Put the pure key and window logic in `sentry.logic.ts` and the state in `src/lib/core/settings/sentry.service.ts`.

Expected benefit: only interleaved repeats. The owner should weigh this against fixing the noisy call sites when they show up.

**Blocked by:** 02 (same files; avoids a conflict)

**Status:** needs-triage

**Gate:** Frontend: `pnpm check` + `pnpm vitest run`.

**Logic** (failing first, `sentry.logic.test.ts`)
- [ ] The same key inside the window is suppressed.
- [ ] After the window, the event is sent with the suppressed count.
- [ ] Different keys are independent.
- [ ] Error, string and non-error values produce the documented keys.

**Service** (`sentry.service.test.ts`)
- [ ] Ten interleaved calls for two keys inside the window lead to exactly two `captureException` calls.

**Copy**
- [ ] The Settings copy mentions that repeats are throttled.

## Notes

- Source: `raw/j22.md` (s10-F4), `raw/j21.md` (Dedupe behaviour), review 2026-11-06 (Dedupe already drops consecutive repeats; the key must come from the Error).
- Needs triage: the owner may prefer to fix noisy call sites instead of throttling globally.
- Deferred 2026-11-06: revisit after two to four weeks of events carrying Issue 02's `environment`, using the real per-tag volume in Sentry. Do not launch before that.
- Size: S.

## Comments
