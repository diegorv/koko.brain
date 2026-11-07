## Verdict

NO CHANGE. The recovered haiku report adds no fact that moves EP-07, the deep-link rejection, or section 7. Two optional notes are listed below, for the owner to take or leave.

## Verified changes

None required. Optional, none blocks anything:

1. Plan section 6 ("Deep links or meta-bind buttons to mod actions") and section 5 row 29. The rejection is correct and the citation is right: `.scratch/vault-mods/PRD.md:90` says "Not deep links or meta-bind buttons: those let outside content run vault code". The plan gives no timing fact for the day the owner reverses it. Proposed change: append one sentence to the section 6 bullet, "If reversed: opt-in `deepLink: true` per action, wire the handler from `app/` (like `daily` and `capture`), and await a host-ready promise, because a cold-start link runs before mods load."
   - Read: `app-lifecycle.service.ts:512-514` (`executePendingAction`, step 8) comes before `:535` (`startModsHost` in `setTimeout(0)`).
   - Read: `deep-link.service.ts:166-170` stores a pending action on a vault switch. `:353-365` runs it. `:213` is the generic toast "Failed to execute deep link action".
   - Read: `deep-link.service.ts:39` types `RegisteredDeepLinkActionType` as `'daily' | 'capture'`. `:70-75` throws "No handler registered" when none exists.
   - Haiku suggests `mods-host` registers the handler. That would be wrong for cold start: the handler would not exist yet, so the link fails with the same toast. `app/deep-link-actions.ts:232-240`, called from `boot.ts:54`, registers at boot, so the handler exists and can wait on the host. The sonnet draft already said "wire from `app/`" and "queue until `startModsHost` resolves".
2. EP-07 scope (plan line 167) names `note.renamed` and `note.deleted` but lists only "one observer". Sonnet E2 (which the plan summarized) needs a `registerPathChangeConsumer` in the dispatcher.
   - Read: `core/filesystem/path-change.service.ts:48` (`pathChanged(from, to | null)`), `:73` (registry), `:178` (sync call).
   - Proposed change: add "plus one `PathChangeConsumer` that only enqueues; a folder rename arrives once, as the folder". Cosmetic. EP-07 is gated, and the plan says it is written "in the same shape" when the gate is met.

## Scout claims refuted

- "Mods registry for deep links could register from `mods-host` without a layer problem" is true for the layer rule, but it is the wrong place. It leaves no handler at cold start (`deep-link.service.ts:70-75`).
- "`MOD_APP` does not expose `addAfterSaveObserver`" is true (`mod-app.service.ts:23-53`, 10 members). It is not a gap: EP-01 adds it.
- "Timers and background runs have no host API; deep-link and background-run costs are M" is true. The plan schedules neither (row 24 "Not scheduled", row 29 "Rejected"), so the costs are moot.
- "A job that does not register an event stays quiet": no. A mod that raw-subscribes through EP-01 also gets `notifyAfterSave` calls from frontmatter writes, deep links and `ctx.vault.write` (sonnet; not re-read here).
- Haiku's "Command palette, menus and Today sections have no mod seam" is outside this cluster and was not checked here.

## Haiku facts confirmed and already covered, or not needed

- `modsRunsStore.log` copies up to 500 lines per call (`mods-runs.store.svelte.ts:40-46` `updateLive`, `:88-90` `log`). It is real, and it is a hot-path risk only for a future background-run API. The plan proposes none (`ctx.every` is "Not scheduled", row 24). If a background run is ever added, throttle `log` first. Optional one-liner under row 24.
- `onload` runs after init step 8 inside `setTimeout(0)` (`app-lifecycle.service.ts:524-538`). The plan relies on this: "Built-ins register first (`:276,435`; mods start at `:535`)". I confirmed `:276` (file history) and `:435` (search hook). Auto-move registers right after, at about `:437`. The ordering claim holds.
- The plan's EP-01 loop claim (`updateNoteFrontmatter` writes nothing when unchanged) holds: `frontmatter-write.service.ts:129` returns `base` when `next === base`.
- The plan's error path is right: `editor.hooks.ts:85-91` catches sync throws and calls `error()`, which reports to Sentry. PRD P9 is the reason `on-save.ts` catches first.

## Still unverified

- Whether an uncaught error from a mod's own timer reaches Sentry or a toast. The grep for `unhandledrejection`, `window.onerror` and `addEventListener('error'` over `src/lib`, `src/routes` and `src/app.html` found nothing. The Sentry SDK may install its own global handlers. This belongs to VM-12, not to this plan.
- Whether `src-tauri/` has a scheduler. Needed only for persisted scheduled jobs, which nobody asks for.
- How `handleDeepLinkUrl` orders a vault switch against mod loading (`deep-link.service.ts:85-115` was not traced, since the plan rejects deep links).
- No code was run. No timing exists for log copies or burst delivery.
