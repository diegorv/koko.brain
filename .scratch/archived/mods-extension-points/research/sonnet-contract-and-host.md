# Contract and host: the architecture beneath every mod entry point

Read-only pass. Nothing in the brain repo, the mods repo or the vault was edited, built or run. `brain:` = /Users/diegorv/Dev/pet-projects/koko/brain/src/lib, `mods:` = /Users/diegorv/kokobrain-vaults/kokobrain-mods-src. Every line cited was read.

## Verdict first

1. **Per-surface registries, one shared host kernel. Not one generic `ctx.contribute(surface, spec)`.** The repo already works this way: each surface owns a `$state.raw` list with `register*(entry) => unregister` (`brain:features/rail-shell/rail-registry.store.svelte.ts:24-94`); the host wraps it in validation plus `disposable()` (`brain:plugins/mods/mods-host.service.ts:105-116`, used at `:319`, `:352`). The surface shapes differ (a palette row, a menu item with a path, a mount slot), so a generic spec would be a union of unrelated types with weaker typing, and the contract freeze test works per member (`mod-api-contract.test.ts:55-70`, `satisfies Record<keyof ModContextV1, true>`).
2. **The real missing piece is "invoke an action from any origin".** `openPicker(buttonKey, title, ids)` (`mods-host.service.ts:256-275`) already runs one action, or opens its text field, and shows the run view. The run key is a free string (`modPickerStore.showRun(modId, runKey)`, `mod-picker.store.svelte.ts:84-86`; `modsRunsStore` finds runs by `buttonKey`, `mods-runs.store.svelte.ts:50-52`). So palette, hotkey and menu origins can reuse it with a synthetic key such as `mod:<id>:palette:<actionId>`. No new run machinery.
3. **Rule for error isolation: mod code runs at event time only, never inside a `$derived`, template expression or effect.** `RailAction.busy` is host code, not mod code (`mods-host.service.ts:349`). The counter-example is `RailLensProvider.resolve`, called inside `$derived.by` with no try/catch (`brain:features/rail-shell/RailNoteList.svelte:177-190`, `lens.logic.ts:426-436`). There is no `<svelte:boundary>` in `src/` or `e2e/` (grep, empty). Svelte docs: a boundary catches errors "during rendering or while running effects", not in event handlers or async callbacks, and exists since 5.3.0 (https://svelte.dev/docs/svelte/svelte-boundary; repo has `svelte ^5.57.3`, `package.json:101`).
4. **Ship order inside this cluster:** kernel + palette (proves it) -> stable promotion of the 5 used `ctx.app` members -> scaffold + recording-ctx fix in the mods repo -> mod-DOM slot with a boundary (only when a daily-use mod needs it). Drift check last and small.

## E1. Host kernel: `contribute` + `invoke` (internal, no public API)

```ts
// mods-host.service.ts, inside createModContext (next to disposable, :105)
const contribute = <E>(register: (entry: E) => () => void, entry: E) => {
	assertLive();                      // :98-100
	return disposable(register(entry)); // once-wrapped, also run at unload
};
/** Runs `action` from a surface other than a rail button; same run view, abort, toast */
const invoke = (action: ModActionV1, origin: string) =>
	openPicker(`mod:${manifest.id}:${origin}:${action.id}`, action.title, [action.id]);
```

- **Cost S.** `mods-host.service.ts` (extract about 10 lines near `:105` and `:256`), new tests in `src/tests/lib/plugins/mods/mods-host.service.test.ts` (describe at `:824`).
- **Core/layer:** none. Plugins may import features (`scripts/import-graph.mjs:44`, `COMPOSITION_ROOTS = app/**`; baseline has 3 `utils` entries only, `layer-baseline.json`).
- **Risks.** (a) Identity unregister: new registries must be `$state.raw` and unregister with `!== entry`, or a deep proxy never matches (stated at `rail-registry.store.svelte.ts:8-11`). (b) Reload: `registerAction` replaces by key (`:79-80`); a stale disposer after a reload must not remove the new entry, which identity unregister gives. Every entry id gets the `mod:<id>:` prefix. (c) A click that races an unload: the host wrapper must check `runtime.unloaded` before calling mod code, because `runAction` itself does not (`:204-247`; the picker closes at unload, `:389`, a palette row or open menu would not). (d) Unload-time order is reverse of registration (`:399`), fine.
- **Removes.** Duplicated validation and disposer code per surface; the hotkeys mod's DOM click on another mod's button (`mods:mods/hotkeys/src/hotkeys.service.ts:27-32`) once an action can be invoked by id.
- **Unlocks.** Every later surface is one registry plus one `contribute` line.
- **Tier A.** **Prototype as a mod first:** no, it is host code.

## E2. Palette: opt-in flag on `ModActionV1` (or `ctx.addCommand`)

```ts
// contract, additive optional field; host copies it at mods-host.service.ts:311-317
interface ModActionV1 { /* ... */ palette?: boolean | { category?: string } }
// brain:features/command-palette: new registry, $state.raw, same shape as the rail one
commandRegistryStore.register(cmd: AppCommand): () => void   // AppCommand: command-palette.types.ts:1-7
```

- **Cost S to M.** Files: `contract/mod-api.v1.ts:66-81`, `mods-host.service.ts:311-317` and `:295-322`, new `features/command-palette/command-registry.store.svelte.ts`, `app/AppOverlays.svelte:18` (`commands={[...getBuiltInCommands(), ...registry.commands]}`; today the prop is a non-reactive call), `src/tests/lib/plugins/mods/mod-api-contract.test.ts` (`ACTION_PUBLIC`, keys equality at `:205`), `help/documentation/28-mods.md`.
- **Core/layer:** registry lives in `features/command-palette`, filled by `plugins/mods` (plugins -> features is allowed). The palette needs no change except the merge.
- **Risks.** Hot path none (list read only when the palette is open). Disposal: reactive list shrinks on unload. Ids must be namespaced because recents key on `id` (`command-palette.store.svelte.ts` recent ids, claimed by scouts, not read by me). Errors: the palette catches and toasts with `console.error` (`CommandPalette.svelte:27-37`), so the mod wrapper must route through `invoke` to get the run view and `debug(MOD:<id>)`. Opt-in avoids flooding the palette (a mod with 10 actions). Sentry: mod failures stay out of Sentry (PRD P9, `:202-203`); `console.error` there does not report to Sentry, but `error()` would.
- **Removes.** Rail-only reach for all 12 mods (`mods:mods/portent/src/index.ts:13-23` rows exist only in two pickers).
- **Unlocks.** "Palette-first Portent", fuzzy search over every mod action, keyboard use without a chord.
- **Tier A.** **Prototype as a mod:** no. `getBuiltInCommands()` is a static function (`brain:app/commands.ts:93`), the palette takes an array prop; raw `ctx.app` has no handle. A mod can only build its own `<dialog>` (habits does, `mods:mods/habits/src/habits.view.ts:152-164`, scout claim).

## E3. Stable promotion of the `ctx.app` members that earn it

```ts
interface ModWorkspaceV1 {                       // contract :135-138, additive members
	openNote: (path: string) => Promise<void>;   // exists
	activeNote: () => { path: string; content: string; dirty: boolean } | null; // vault-relative snapshot
}
interface ModNotesV1 {
	updateFrontmatter: (path: string, mutate: (p: ModPropertyV1[]) => ModPropertyV1[]) => Promise<void>; // markdown only, rejects otherwise
	dailyPath: (date?: Date) => string;
	openDaily: () => Promise<void>;
}
interface ModTypesV1 { list: () => { name: string }[] ; has: (name: string) => boolean }
```

- **Cost M** (frozen once shipped). Files: `contract/mod-api.v1.ts`, `mods-host.service.ts` (return object `:277-370`, new `createModNotes` file next to `mod-vault.service.ts`), `mod-app.service.ts:23-53` stays, `mod-api-contract.test.ts` (new `*_PUBLIC` lists), `28-mods.md:378-400`.
- **Core/layer:** none beyond what `mod-app.service.ts` already imports (`:1-17`). No new write behaviour: it wraps `updateNoteFrontmatter` (`:50`), `dailyNotePath`, `openOrCreateDailyNote`.
- **Risks.** (a) Live-object leak: `editorStore.tabs` and `activeTab` return the `$state` proxies (`brain:core/editor/editor.store.svelte.ts:8`, `:34`); a snapshot removes the path that writes `tab.content` directly. The editor resync happens only through `bumpExternalContentSignal`, called from one place (`core/editor/editor.service.ts:89`), so a direct write would not reach CodeMirror (inferred, not run). (b) Two write semantics must be named, not merged: `ctx.vault.write` refuses an open dirty tab (contract `:127-131`), `updateNoteFrontmatter` keeps unsaved body edits and saves the tab (`mod-app.service.ts:45-49`). (c) Path form: raw API takes absolute paths, contract takes vault-relative (`:109-112`); the wrapper converts. (d) Index timing: portent calls `requestPromptIndexRefresh()` before each write (`mods:mods/portent/src/portent.service.ts:22`, per scout); put it inside the wrapper only after the owner confirms it is wanted (it touches the throttle described in indexing rule 12).
- **Removes.** Raw `ctx.app` in 9 of 12 mods (grep by scouts; I confirmed `openNoteAt` has no caller: grep over `mods/`, `shared/`, `test/` is empty). Hand copies of `RawApp` (`mods:shared/types.ts:46-76`) and the fakes in `shared/test/fake-ctx.ts`.
- **Experiments unlocked.** Contract-level tests for the 3 mods that write frontmatter (bulk-tag, inbox-triage, portent); per-note palette and menu actions that need `activeNote`.
- **Tier A for `activeNote`/`updateFrontmatter`/`types`; B for `daily`** (periodic-notes is a plugin imported by allowlist, `mod-app.service.ts:16-17`).
- **Prototype as a mod:** yes, and it should be. `mods:shared/editor.ts` (`editNote`, `appendToDailyNote`) is already the incubator: add `shared/notes-api.ts` over `ctx.app`, use it in 2 mods, then freeze the proven signature in the contract. Promote only what 2+ mods use.

## E4. What stays raw (policy)

Keep in `MOD_APP`: `editorStore.editorView` (CodeMirror; live-preview rules 1-4, 11 apply to anything a mod dispatches), `vaultStore` internals, `openOneOnOnePicker`, `createOneOnOneNote`, `createTypedNote`, `typeDefinitionsStore` as a store, `openNoteAt` (unused), `ctx.kb()`. Reason: each is either a live object, tied to one plugin, or has no second caller. Adding a raw member stays one line (`mod-app.service.ts:20-22`) plus one `RawApp` line, the cheapest experiment path, and the docs say so (`28-mods.md:378-380`). Cost S, tier C (do nothing), prototype: n/a.

## E5. Mod-owned DOM slot (sidebar section, status item) with isolation

```ts
// contract, additive; needs a core registry (features/properties or core/layout) the host fills
addSidebarSection: (s: { id: string; title: string; mount: (el: HTMLElement) => void | (() => void) }) => () => void
```

- **Cost L.** `app/AppShell.svelte:274-291` (five hard-coded sections gated by `settingsStore.layout.*`), new registry + `MountSlot.svelte` using `<svelte:boundary>` and an `$effect` that calls `mount` inside try/catch and returns its cleanup, host entry, contract, tests, E2E.
- **Core/layer:** registry in `core/layout` or `features/properties`; `SidebarSection.svelte` chrome is reusable (scouts, not read by me). `AppShell` is a composition root, so it may import the registry.
- **Risks.** (a) The sidebar is hidden for some tabs (`core/layout/layout.logic.ts:23-37`, `isRightSidebarShown`), so `mount` must be called on show and its cleanup on hide, not once. (b) Boundary does not catch handlers or async work inside the mod's DOM (Svelte docs above); `mount` errors are caught by try/catch, later ones by the mod. (c) Mod DOM keeps listeners after reload unless `ctx.register` cleans them: the slot must remove the element at unload, not trust the mod. (d) Do not pass the live tab or re-run per keystroke; give a debounced active-note signal. I did not verify that `activeTab.content` changes per keystroke (scout claim).
- **Removes.** Habits' own `<dialog>` and inert-confirm workaround (`mods:mods/habits/src/habits.view.ts:105`, `:152-164`, scout-read), focus-timer's DOM injection into `.status-bar-group` (`mods:mods/focus-timer/src/status-chip.ts:12-18`; the group exists at `brain:core/status-bar/StatusBar.svelte:11-20`).
- **Tier B.** **Prototype as a mod:** yes for a spike. `[data-right-sidebar]` exists (`AppShell.svelte`, inside the pane at about `:272`); append a node, undo it in `ctx.register`. It can be wiped by the `{#if}` re-render and proves demand, which is the point.

## E6. Render-time mod hooks (lens `resolve`, per-row `when`)

- **Cost M to L; Tier C.** Files `rail-registry.store.svelte.ts:55-60`, `RailNoteList.svelte:177-190`, `lens.logic.ts:426-436`. A mod `resolve` would run in `$derived.by` on every entries-version bump with no catch and no boundary; a sync loop freezes the app (`28-mods.md:517`). Registration also replaces by `kind` silently (`:55-56`). If ever built: host wraps `resolve` in try/catch returning null, data-only result, kind prefixed `mod:<id>:`. Defer: the owner rejects rare cases and the list is virtualized (`RailNoteList.svelte:4, 823, 888`, `VList`). **Prototype as a mod:** no.

## E7. Drift between `mods:shared/types.ts` and the app

State today. Contract types are already compile-checked: the mods `tsconfig` maps `@kokobrain/mod-api` straight to `brain:plugins/mods/contract/mod-api.v1.ts` (`mods:tsconfig.json`, `paths`). `RawApp`/`RawKb` are hand-written on purpose, "because importing the app's types pulls its whole graph" (`mods:shared/types.ts:1-4`). `scripts/mod-loader.ts:10` copies `evaluateModSource` by hand ("keep in step"). Fakes in `shared/test/fake-ctx.ts:1-15` implement `RawApp`.

- **Full compile-time check (mods tsc importing `ModApp`): not worth it.** `mod-app.service.ts` imports `.svelte.ts` stores and Tauri code, so mods `tsc` would need Svelte ambient types and the app's alias map. High cost, breaks on every unrelated app change.
- **Cheap option (S, tier B-):** a brain vitest that snapshots `Object.keys(MOD_APP)` in a committed list, failing with "update `RawApp` in kokobrain-mods-src/shared/types.ts". It catches rename and removal of members, not shape drift, and adds one JSON edit per raw member. The cost cuts against the one-line raw promise, so only do it if a rename actually bites. The better fix for drift is E3: fewer raw members.
- **Loader copy:** same pattern, a brain test that evaluates the loader regex against a fixture the mods repo also reads is not possible across repos; accept the copy, keep the comment.

## E8. Scaffolding and DX in the mods repo

- **State.** No generator: `scripts/` holds `build.mjs`, `capture-registrations.mjs`, `check-bundle.mjs`, `mod-loader.ts`. A new mod is a hand-copied folder (`mods:README.md`, "Mod anatomy"); the build finds `mods/*/manifest.json` (`scripts/build.mjs:81`).
- **Gap found.** `recordRegistrations` (`scripts/mod-loader.ts:36-90`) records only `addAction` and `addRailButton`; any other ctx member falls through to a Proxy stub that silently returns more stubs (`:28-34`, `:59`). So a palette flag, a hotkey or a menu item would never be pinned by `test/registrations.baseline.json`, and a typo'd or missing new member would pass the smoke test. Extend the recorder when each entry point ships, in the same change.
- **Add:** `pnpm new <id>` (S): writes `manifest.json`, `src/index.ts` (`satisfies Mod`), one `test/*.test.ts` using `fakeCtx()`, and a baseline entry. Tier A for the owner's goal (faster experiments), zero brain impact.
- **Tests for mods** already have `fakeCtx` (`shared/test/fake-ctx.ts`); it must grow a recording `commands`/`menus` array per surface so a mod's registrations are testable without the host.
- **Prototype as a mod:** n/a (tooling).

## E9. Testability recipe for every new entry point

One of each, nothing more:
1. **Registry store test** (like the rail registry's): register, replace by id, unregister by identity, `reset()`.
2. **Host test** in `mods-host.service.test.ts` `describe('actions and rail buttons')` pattern (`:824`, assertions at `:851`, `:1051`, `:1081`, `:1098`): empty after stop, switch-off, reload and failed `onload`; invalid arguments throw `Mod "<id>": ...`; a call after unload is a no-op or throws `is unloaded`.
3. **Contract freeze edit** (`mod-api-contract.test.ts:55-70`): the new member in `*_PUBLIC` (compile-time forced by `satisfies Record<keyof ...>`) and a keys-equality test.
4. **One E2E** in `e2e/specs/vault-mods.spec.ts` (283 lines, mods written as strings into the virtual FS, `HELLO_MOD` at `:8-60`): add the flag to a hello action, drive the surface, assert rendered text or a toast, not only a container.
5. **Gotcha:** add the new store's `reset()` to both `beforeEach` blocks (`mods-host.service.test.ts:122`, `mod-api-contract.test.ts` `beforeEach`), or state leaks between tests. `createModContext(manifest, vaultPath, runtime)` is called directly by the contract test (`makeContext`), so inject registries by import, not by new parameters.
6. Per CLAUDE.md, no mocking stores; `svelte-sonner` and Tauri fs stay mocked as today.

## Ranking for this cluster

| # | Item | Cost | Tier | Prototype as mod first |
|---|------|------|------|------------------------|
| E1 | Host kernel (`contribute`, `invoke`) | S | A | no |
| E2 | Palette via action flag | S-M | A | no |
| E3 | Stable promotion (5 members) | M | A (daily: B) | yes, via `shared/` |
| E8 | `pnpm new` + recording ctx | S | A | n/a |
| E5 | Mod-DOM slot with boundary | L | B | yes, raw DOM spike |
| E7 | Raw key snapshot test | S | B- | n/a |
| E6 | Mod lens / render-time hooks | M-L | C | no |
| E4 | Keep editorView, vaultStore, 1:1, typed notes raw | 0 | C | n/a |

## Refuted scout claims

- "The rail note list is not virtualized (grep found no virtualization in rail-shell or note-list)" (portent scout): false. `RailNoteList.svelte:4` imports `VList` from `virtua/svelte`, used at `:823` and `:888`; `NoteRowMenu.svelte:196` names virtualizers in a comment.
- "`railRegistryStore.folderCreators` is a precedent that passes the right-clicked folder, near-zero core change" (tasks, focus-timer scouts): only partly true. `RailFolderCreator` is `{ id, label, icon: Component, fileName, create(dir) }` (`rail-shell.types.ts:218-228`), spread into the "New ..." list at `FilesNavigator.svelte:88`. It creates files; the icon is a Svelte component, not a mod icon string, and there is no generic action callback. A folder menu item needs a new type.
- AppShell StatusBar at "311-318" (inbox-triage scout): the element starts at `AppShell.svelte:301`; the cited range is off.
- Palette trade-off "no hot path" is right, but "a store merge is enough" (habits scout) is incomplete: `AppOverlays.svelte:18` passes a non-reactive call as the prop, so the merge needs a reactive read in the expression.
- "`openNoteAt` ... candidate for stable" (surface scout): unused by every mod (grep empty), so keep it raw or remove, never promote.
- Confirmed, not refuted: `MOD_APP` has 11 members (`mod-app.service.ts:23-53`); `get app` returns the same live object (`mods-host.service.ts:362-365`); `shortcutFor` throws on an unknown command (`global-keybindings.ts:211-213`); hotkeys mod clicks a rail button by DOM selector (`hotkeys.service.ts:27-32`); `RawApp` omits `openNoteAt` (`shared/types.ts:46-76`).

## Could not verify

- No runtime evidence for any hot-path or freeze claim (lens `resolve` throw behaviour, per-keystroke `activeTab.content` writes, sidebar re-render cost): inferred from code only.
- That `NoteRowMenu` items mount only when the menu opens (bits-ui `ContextMenu.Content` laziness, `NoteRowMenu.svelte:211-215`): not checked in the bits-ui source.
- Whether `typeof MOD_APP` is structurally assignable to `RawApp` (needs `tsc`); recent-command id handling in `command-palette.store.svelte.ts`; `SidebarSection.svelte` and `MarkdownEditor` context menu; `PLUGIN_ALLOWLIST` entries beyond the first (`scripts/import-graph.mjs:47-48`).
- Portent's claim that `_organized: false` is written only when Explicit organization is on: outside this cluster, not read.
- I read `docs/agents/indexing-watcher-rules.md` rules 6 and 12 and the live-preview rule titles only to cite them; no editor or save-path change is proposed here, and I did not judge one.
