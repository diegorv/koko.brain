# 12: Keep uncaught mod errors out of Sentry

**What to build:** PRD P9 says mod errors do not go to Sentry. Issues 02 to 05 cover the errors the host catches. This Issue covers the ones it cannot catch: a mod's timer, DOM listener or floating promise that throws. Sentry, when on, keeps `GlobalHandlers` and `BrowserApiErrors` (`src/lib/core/settings/sentry.service.ts:63-70`), so those reach Sentry with their message, which can carry note text or API responses.

- **Hook.** `removeSensitiveEventData` (`sentry.service.ts:28-36`, wired as `beforeSend` near `:84`) always returns an event today. Make it return `null` (drop) for a mod error.
- **What counts as a mod error:**
  - any stack frame whose filename contains `kokobrain-mods/` (the `//# sourceURL` the loader adds, Issue 02);
  - an error a host API rejected with (for example an unawaited `ctx` call that fails): its frames are app frames only, so the host tags every rejection from a `ctx` method (for example a `modId` property or a marker class). Do it in one place in the host, so members added later (`ctx.vault`, `ctx.agents`) are tagged too.
- **Layers.** `sentry.service.ts` is in `core/` and must not import `plugins/mods` (ADR-0003). Hard-code the `kokobrain-mods/` prefix and the tag name in core, with a comment naming the loader as the other side.

**Blocked by:** 02

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing tests first (`sentry.service` test): an event with a `kokobrain-mods/` frame is dropped; an event whose exception carries the host's mod tag is dropped; an ordinary app error still passes and is still scrubbed as today.
- [ ] Host test: a rejection from a `ctx` method (for example `ctx.notify` after unload) carries the tag.

## Notes

- **Not verified:** that WKWebView (JavaScriptCore) applies `//# sourceURL` to `new Function` code in `Error.stack`. Unit tests run in V8 and E2E in Chromium, so neither proves it. The owner checks it in the real app after delivery (PRD "Owner checks after delivery"). If JSC ignores it, the tag is the only reliable signal: then the loader also wraps `onload` and every registered callback so their errors get tagged.
- Not in the MVP (PRD: the MVP is Issues 01 to 05).
- **Size:** S.

## Comments
