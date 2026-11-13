# 032: Keep uncaught mod errors out of Sentry

**Origin:** `vault-mods` Issue 12, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/vault-mods/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** PRD P9 says mod errors do not go to Sentry. Issues 02 to 05 cover the errors the host catches. This Issue covers the ones it cannot catch: a mod's timer, DOM listener or floating promise that throws. Sentry, when on, keeps `GlobalHandlers` and `BrowserApiErrors` (`src/lib/core/settings/sentry.service.ts:63-70`), so those reach Sentry with their message, which can carry note text or API responses.

- **Hook.** `removeSensitiveEventData` (`sentry.service.ts:28-36`, wired as `beforeSend` near `:84`) always returns an event today. Make it return `null` (drop) for a mod error.
- **What counts as a mod error:**
  - any stack frame whose filename contains `kokobrain-mods/` (the `//# sourceURL` the loader adds, Issue 02);
  - an error a host API rejected with (for example an unawaited `ctx` call that fails): its frames are app frames only, so the host tags every rejection from a `ctx` method (for example a `modId` property or a marker class). Do it in one place in the host, so members added later (`ctx.vault`, `ctx.agents`) are tagged too.
- **Layers.** `sentry.service.ts` is in `core/` and must not import `plugins/mods` (ADR-0003). Hard-code the `kokobrain-mods/` prefix and the tag name in core, with a comment naming the loader as the other side.

**Blocked by:** none

**Blocked by (origin):** closed blockers dropped: vault-mods 02.

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing tests first (`sentry.service` test): an event with a `kokobrain-mods/` frame is dropped; an event whose exception carries the host's mod tag is dropped; an ordinary app error still passes and is still scrubbed as today.
- [ ] Host test: a rejection from a `ctx` method (for example `ctx.notify` after unload) carries the tag.

## Notes

- **Not verified:** that WKWebView (JavaScriptCore) applies `//# sourceURL` to `new Function` code in `Error.stack`. Unit tests run in V8 and E2E in Chromium, so neither proves it. The owner checks it in the real app after delivery (PRD "Owner checks after delivery"). If JSC ignores it, the tag is the only reliable signal: then the loader also wraps `onload` and every registered callback so their errors get tagged.
- Not in the MVP (PRD: the MVP is Issues 01 to 05).
- **Size:** S.

## Comments

- **2026-11-06, owner check in the real app (`pnpm tauri dev`, WKWebView), after Issue 02:** JSC ignores `//# sourceURL` for `new Function` code. A `boom` mod whose `onload` throws shows this stack in Labs:

  ```
  onload@
  loadMod@http://localhost:1420/src/lib/plugins/mods/mods-host.service.ts:145:22
  ```

  The mod frame has a function name and no location; no frame contains `kokobrain-mods/`. So the sourceURL rule above never matches in the app, and the host tag is the only reliable signal: the loader must also wrap `onload` and every registered callback so their errors get tagged (the fallback in Notes). Errors from a mod's own `setTimeout`, DOM listener or floating promise stay untagged. One possible extra signal: a frame with no location (`name@`) comes from `new Function` code, but QueryJS evaluates with `new Function` too, so that rule would also drop QueryJS errors. Size goes from S to M; re-triage before it runs.
