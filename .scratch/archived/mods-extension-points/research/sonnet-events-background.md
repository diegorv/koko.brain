# Events and background work for vault mods (cluster: events-background)

Read-only analysis. Every file:line below was read in this session unless it sits under "not verified". Paths are relative to `/Users/diegorv/Dev/pet-projects/koko/brain` unless stated. No em-dashes, no code was run.

## Ground truth (verified)

- `ctx` has one subscription member today: `theme.onChange` (`contract/mod-api.v1.ts:265-273`, host `mods-host.service.ts:183-195`, which wraps the callback in try/catch and registers a disposer).
- Mods are plain JS run through `new Function` (`mods.logic.ts:243`). Svelte runes do not exist there, so a mod cannot subscribe to a store reactively; polling is the only raw option.
- `MOD_APP` (`mod-app.service.ts:23-53`) has no observer, hook or watcher member. Its own comment says "Adding a member is one line here" (`:20-21`).
- After-save: `notifyAfterSave` (`core/editor/editor.hooks.ts:67-92`) calls `applyNoteChange` (`:81`), `notifyContentInvalidated` (`:83`), then each observer synchronously in its own try/catch (`:85-91`). Only sync throws are caught.
- Callers of `notifyAfterSave`, not just the editor: `editor.service.ts:196`, `frontmatter-write.service.ts:161`, `deep-link.service.ts:277,296,313,337`, `app/deep-link-actions.ts:78,216`, `mod-vault.service.ts:111`. So a mod calling `ctx.app.updateNoteFrontmatter` also fires every observer.
- Existing observers: auto-move (`auto-move.service.ts:96`), search (`search.service.ts:303`), file-history (`file-history.service.ts:192`), `SemanticIndexStatus.svelte:23`.
- Save cadence: body 2000 ms with `maxWait` 10 s, frontmatter 500 ms (`editor.service.ts:227,230`). So during continuous typing the active note saves at least every 10 s. Programmatic writers (mods, deep links, frontmatter writes) are not debounced.
- `ctx.vault.create` calls `applyNoteChange('create')` and no `notifyAfterSave` (`mod-vault.service.ts:71-93`); `ctx.vault.write` calls it (`:111`) unless the path is mod code (`:108`); `saveData` never does (`:122-124`). `write` refuses a dirty open tab (`:100-101`).
- `NoteChangeConsumer.upsert(path, content)` carries no source (`note-change.service.ts:24-31`), and the `edit` source fires consumers on a 1 s typing debounce (`:88`). It cannot tell create from edit, so it is the wrong feed for mod events.
- `PathChangeConsumer.pathChanged(from, to|null)` (`path-change.service.ts:48`, `registerPathChangeConsumer :73`, called at `:178`): once per change, folder reported once, sync.
- `onFileChange(listener)` (`fs.watcher.ts:67`), `notifyListeners` per-listener try/catch (`:75-84`). The host already listens (`mods-host.service.ts:629`) and self-saves count (`:619`).
- Startup: `startModsHost` runs in a `setTimeout(0)` at the end of `initializeVault` (`app-lifecycle.service.ts:535`), after `markIndexReady()` (`:337`, only when the index built). `stopModsHost` is called at `:166` and `:584`. `onload` runs again on every reload, enable and main.js save (`mods-host.service.ts:475`, callers `:568`, `:624-648`, `:660`).
- `register` and `disposable` give disposal for free (`mods-host.service.ts:105-116, 281-284`); unload aborts `ctx.signal` and runs disposers in reverse (`:385-405`).
- Real mods: timers appear in 2 of 12 (`focus-timer/src/focus.service.ts:63` setInterval, `bulk-tag/src/bulk-tag.service.ts:27` abortable setTimeout). `hotkeys/src/index.ts:18` adds a window keydown listener. No mod subscribes to an app event, because none exists.
- Deep links: closed action set `VALID_ACTIONS` (`deep-link.logic.ts:25`); handlers outside the feature use `registerDeepLinkAction`, typed `'daily' | 'capture'` only (`deep-link.service.ts:39-60`), wired from `app/` (`boot.ts:54`, `deep-link-actions.ts:232-235`). That is the layer-legal pattern.

## Shared piece: one dispatcher, built first (not an entry point)

Every event below needs the same guard rails, so build them once in a new `plugins/mods/mod-events.service.ts`.

```ts
// plugins/mods/mod-events.service.ts (host side)
type Deliver = (event: ModEventV1) => unknown;
export function subscribe(modId: string, name: ModEventV1['name'], fn: Deliver): () => void;
export function startModEvents(): void; // registers ONE addAfterSaveObserver + one pathChange consumer
export function stopModEvents(): void;  // called from stopModsHost (mods-host.service.ts:692)
```

Rules, each tied to a verified failure:
1. Register one core observer per host start, not one per mod, and remove it in `stopModsHost`. Disposers of single subscriptions also go through `disposable` (`mods-host.service.ts:105`).
2. Never run mod code inside the observer call. Enqueue and deliver in a macrotask. The observer list is a sync loop (`editor.hooks.ts:85-91`), so a slow handler would delay the observers after it and the save's own caller.
3. Deliver per mod serially; coalesce by path inside one tick (latest content wins). A 150-note bulk run (`bulk-tag.service.ts:16-21` paces at 150 per 10 s) otherwise becomes 150 handler calls.
4. Catch sync throws and attach `.catch` to returned promises (hooks only catch sync, `:88`). Log with `debug('MOD:<id>')`, never Sentry (host docs, `28-mods.md` error table).
5. Loop breaker: if one mod receives more than N deliveries for one path inside a window (proposal: 20 in 10 s, tunable, not measured), drop its subscription and toast once. Origin tagging in `mod-vault.service.ts:111` (wrap the call so the event carries `self: true` for the writing mod) covers `ctx.vault.write` only; writes through `ctx.app.updateNoteFrontmatter` have no origin, so the breaker is the real guard.
6. Handlers get data only (path, content string already in memory), no live store objects.

Cost S to M (about 150 lines plus tests). Layer: plugins import core (`mod-vault.service.ts:4` already imports `editor.hooks`); `layer-baseline.json` has 3 entries, none about mods, no change.

## E1. `ctx.on('note.saved')`

```ts
// contract/mod-api.v1.ts, additive member
export interface ModNoteSavedEventV1 { name: 'note.saved'; path: string /* vault-relative */; content: string; self: boolean }
on: <K extends ModEventV1['name']>(name: K, handler: (e: Extract<ModEventV1, { name: K }>) => unknown) => () => void;
```
- Cost M. Files: `mod-api.v1.ts:289-329` (+1 member), `mods-host.service.ts:277-370` (+`on`, argument checks like `:297`), new `mod-events.service.ts`, `mod-vault.service.ts:111` (origin tag), `mod-api-contract.test.ts:205` (frozen key list), `28-mods.md`.
- Core change: none. Layer rules hold.
- Risks. Hot path: not per keystroke (2 s / 10 s save timers), but bursts from bulk writers; mitigated by rule 3. Disposal: via `disposable`, plus stop at `stopModsHost`. Data: handler writes can loop (see rule 5); `vault.write` onto a dirty open tab throws (`:100-101`), a partial natural brake only while the user types. Reactivity: none, plain callback. Ordering: mod observers land after built-in ones, so a mod cannot delay indexing; `notifyAfterSave` has already awaited nothing, the index refresh is sync before observers (`editor.hooks.ts:81-83`).
- Semantics gap to state in docs: `ctx.vault.create` emits no `note.saved` (`mod-vault.service.ts:71-93`). Do not "fix" by adding `notifyAfterSave` there: it would add FTS, file-history and auto-move work to creates, a core write-path behavior change the owner rejects.
- Removes: nothing today uses it, but it removes the need for polling `editorStore.tabs` and for mods to depend on `ctx.app` for reaction logic.
- Unlocks: auto-tag or auto-property on save of a typed note; per-day written-words counter in `saveData`; "last touched" list; Portent-style `_organized` follow-ups.
- Tier B (guard must ship in the same Issue, else it is the riskiest item here).
- Prototype first as a mod: yes, with one line in `MOD_APP` (`addAfterSaveObserver` from `editor.hooks`, `mod-app.service.ts:23`). The mod does `ctx.register(ctx.app.addAfterSaveObserver(fn))`. That is a 1-line unstable-surface change, not a contract change, and lets the owner learn the real loop and burst behavior before freezing `on`. Without that line it cannot be prototyped.

## E2. `note.deleted` and `note.renamed` (path changes)

```ts
{ name: 'note.renamed'; from: string; to: string }   // vault-relative; folder renames reported once, for the folder
{ name: 'note.deleted'; path: string }
```
- Cost S after the dispatcher. Files: `mod-events.service.ts` (a `registerPathChangeConsumer`, `path-change.service.ts:73`), `mod-api.v1.ts`, contract test.
- Core change: none; the consumer registry is the layer-legal seam (consumers register, not imported, indexing rule 6).
- Risks: consumers are sync and run before the link rewrite (`path-change.service.ts:178`), so the dispatcher must only enqueue. A folder event means a mod holding per-note paths must prefix-match `from + '/'`; say so in the type docs. Rename into the mods folder is not special-cased here.
- Removes: mods that keep path lists in `saveData` (bulk-tag undo idea) going stale silently. Core hacks removed: none.
- Unlocks: rename-safe mod-owned indexes; cleanup of mod data when a note is deleted.
- Tier B (valuable only once a mod keeps note paths; no one does today).
- Prototype as a mod: partly. `MOD_APP` could expose `registerPathChangeConsumer`, but the app-level consumer lifetime rules (indexing rule 6) say forgetting unregister is silent; a mod would use `ctx.register`. Fine for a spike.

## E3. `note.created`

- Not a clean event today. `vault.create` does not reach `notifyAfterSave`; the `NoteChangeConsumer` feed has no source (`note-change.service.ts:24-31`) and mixes in `edit` upserts (`:88`). A correct feed needs `source` added to the consumer interface, which edits a write-path file the owner does not want touched for this.
- Cheapest honest version: the host emits `note.created` itself from `ctx.vault.create` only (mod-origin creates), documented as such. Low value (the mod already knows it created).
- Tier C. Defer.

## E4. `active-note.changed`

```ts
{ name: 'active-note.changed'; path: string | null } // vault-relative, no content
```
- Cost S. Files: `mod-events.service.ts` with a `$effect.root` over `editorStore.activeTabPath` only, using the same pattern as `watchModTheme` (`mod-theme.svelte.ts:51-60`, `untrack(onChange)`); rename the file `.svelte.ts`.
- Core change: none (`editorStore.activeTabPath` getter exists, `editor.store.svelte.ts:36`). Layer holds.
- Risks. Hot path: the effect must read `activeTabPath`, never `activeTab.content` (`editor.store.svelte.ts:15-21` warns the content signal changes per keystroke). Disposal: one effect root for the host, disposed in `stopModsHost`. Reactivity: coalesce a tab close plus open into one delivery per tick.
- Removes: polling loops (`setInterval` over `editorStore.activeTab`) in future mods.
- Unlocks: context panels and counters that follow the open note; status-style experiments once a UI surface exists (other clusters).
- Tier B.
- Prototype as a mod: only with polling (`setInterval` 300 ms comparing `ctx.app.editorStore.activeTabPath`), because mods cannot use runes. Fine for a spike, wasteful to ship.

## E5. Load reason for startup and reload jobs

```ts
// additive: ctx.start, read-only
start: 'startup' | 'enabled' | 'reload'
```
- Cost S. Files: `mods-host.service.ts:96` (`createModContext` gets a param), loadMod callers `:568`, `:624-648`, `:660`; `mod-api.v1.ts:289`; contract test `:205`.
- Why: `onload` is the startup hook, but it also runs on every main.js save (`:600-606`, `:629`), so a "run once per vault open" job reruns while the owner iterates. focus-timer shows the cost: its cleanup cancels the timer on each reload (`focus-timer/src/index.ts:12`), dropping a running block.
- Risks: none on hot paths. Data: mods still must persist their own state in `saveData`.
- Removes: ad-hoc "did I run today" guards written by hand.
- Unlocks: daily jobs on `startup` only (carry-over tasks, weekly report), safe live-editing of such mods.
- Tier C: a mod can already compare a `saveData` timestamp. Do it only if a startup-job mod appears.
- Prototype as a mod: yes, store `lastRun` in `ctx.saveData`; no core change.

## E6. `ctx.every` and timers

```ts
every: (ms: number, fn: (signal: AbortSignal) => unknown) => () => void // min 1000 ms, no overlap, errors to debug
```
- Cost S. Files: `mods-host.service.ts:277-370`, `mod-api.v1.ts`, test.
- Gains over raw `setInterval`: automatic disposal, no overlapping runs, caught throws, min period. It does not stop a sync loop (`28-mods.md` Limits: Stop cannot end it) and does not prevent a heavy callback blocking the main thread.
- Evidence of need: 1 of 12 mods uses `setInterval`. The owner rejects rare-case lists.
- Tier C. Prototype: already possible with `ctx.register(() => clearInterval(id))` (the pattern in `focus-timer/src/index.ts:12`).

## E7. Deep link to a mod action

```
kokobrain://mod?vault=X&mod=<id>&action=<id>&input=...
```
```ts
// features/deep-link/deep-link.service.ts:39 -> 'daily' | 'capture' | 'mod'
// app/deep-link-actions.ts: registerDeepLinkAction('mod', (a) => runModAction(a.mod, a.action, a.input))
export function runModAction(modId: string, actionId: string, input: string): Promise<void>; // new export of mods-host
```
- Cost M. Files: `deep-link.types.ts` (action union), `deep-link.logic.ts:25` (+parser case), `deep-link.service.ts:39`, `app/deep-link-actions.ts:232-235`, `mods-host.service.ts` (actions live in a per-mod closure map `:118`, so a host-wide `modId:actionId` registry is required; the same registry serves a command palette, owned by another cluster).
- Layer: holds, `app/` wires it (same as `daily` and `capture`, `deep-link-actions.ts:36`). `features/deep-link` must not import `plugins/mods`.
- Risks. Security: an external URL starts code the user installed. `new` already lets a URL write or overwrite notes (`deep-link.types.ts` NewAction flags), but running arbitrary mod code from a link is stronger. Require an opt-in `deepLink: true` on `addAction`, and show the action title in a confirm for external triggers. Timing: on a cold start the mods load in `setTimeout(0)` after init (`app-lifecycle.service.ts:535`), so an early link can see no action; queue until `startModsHost` resolves. Run through `runAction` (`:204`) so Stop and the run view still work. Not read: how `handleDeepLinkUrl` switches vaults.
- Removes: nothing the 12 mods hack today; it adds a path for Raycast, Shortcuts or scripts.
- Unlocks: automations and hotkey launchers (outside the app) calling a mod action; ties into Quick Capture style use.
- Tier B (valuable, needs the confirm policy and the shared registry).
- Prototype as a mod: no. A mod cannot register a URL scheme handler.

## E8. `vault.ready` and index-ready

- Mostly redundant. `onload` already runs after the index step (`app-lifecycle.service.ts:337` then `:535`), except when the index failed (then `indexReady` stays false). A mod needing it can read `ctx.app.vaultStore.indexReady`.
- Tier C. Do not add.

## E9. `vault.changed` (raw watcher batches)

- Wrapping `onFileChange` (`fs.watcher.ts:67`) would deliver self-saves, mod-code batches and a burst of up to 200 paths (`tauri-listeners.service.ts:116`) to mods. The owner has no external sync, so the only value is external edits. Duplicates E1.
- Tier C. Skip.

## E10. Before-save hook that can change content

- Touches the save path, which indexing rules 6 and 17 keep synchronous and single-owner, and the owner rejects new core write-path behavior for rare cases. Tier C. Do not schedule.

## Order and trade-off

1. Spike: add `addAfterSaveObserver` to `MOD_APP` (1 line) and write one throwaway mod to see real burst and loop behavior. Cost S, zero contract freeze.
2. Dispatcher plus E1 `note.saved` as one Issue (the guard is the point). M.
3. E2 renamed/deleted. S.
4. E4 active-note. S, only if a context-panel entry point (other cluster) lands.
5. E7 deep link, after the by-id action registry exists (shared with palette). M.
6. E5, E6, E3, E8, E9, E10: only on demand.

What a misbehaving mod can do here (concrete): freeze the app with a sync loop (cannot be stopped); loop through async disk writes by writing the note it was just told about, or a pair of mods doing it to each other; flood the index refresh with writes (200-path refresh limit, `tauri-listeners.service.ts:116`); leave a raw `ctx.app` listener running after unload; throw inside an observer, which the hooks catch only if sync (`editor.hooks.ts:86-90`).

## Refuted or corrected scout claims

- "A mod would build a `$effect` over `ctx.app.editorStore`" (events scout): refuted. Mods are `new Function` code, no runes (`mods.logic.ts:243`); only polling works.
- "note.saved fires once per save, not on the keystroke path": true but incomplete. Frontmatter writes, deep links and mod writes also call `notifyAfterSave` and are not debounced; and `maxWait` makes typing saves land every 10 s at most.
- "Not verified where startModsHost runs relative to index build": verified (`app-lifecycle.service.ts:337` then `:535`), so `vault.ready` is redundant.
- "Guard in the host: skip events for writes the same mod issued": only feasible for `ctx.vault.write` (`mod-vault.service.ts:111`); writes via `ctx.app.updateNoteFrontmatter` (`frontmatter-write.service.ts:161`) carry no mod identity.
- Confirmed, not refuted: sync try/catch only (`editor.hooks.ts:88`); `vault.create` has no after-save (`mod-vault.service.ts:84-91`); `saveData` skips it; edit-source consumer upserts (`note-change.service.ts:88`).
- Not in my cluster, not checked: all palette, hotkey, menu, sidebar and lens claims from the other scouts, and mod:* hack counts (for example "42 lines of ctx.app").

## Could not verify

- Obsidian event names and semantics (`obsidian.d.ts` not opened).
- Real cost of a handler under a 150-note bulk run; my thresholds (20 per 10 s, 1000 ms) are proposals, unmeasured.
- Whether built-in observers always register before mods (auto-move wired where? only search `:435` and file-history `:276` seen); the ordering claim in E1 is from `setTimeout(0)` placement, not from reading every wiring site.
- How `handleDeepLinkUrl` orders a vault switch against mod loading.
- Whether `ctx.vault.write` onto a non-dirty open tab visibly flickers when a handler rewrites the active note (`syncExternalContentToEditor`, `mod-vault.service.ts:105`); not run.
