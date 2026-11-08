# Mod entry points: plan by owner experiment velocity

Priority: what gives a useful result this week, then next week. Order is time to first useful mod, mod DX included. Nothing was built or run. `mods:` = `/Users/diegorv/kokobrain-vaults/kokobrain-mods-src`. Paths without a prefix are under `src/lib`.

## The measure

- A brain Issue costs 25 to 44 minutes of relay time (ledger Log, `.scratch/vault-mods/ledger.md:57-72`: 42, 36, 32, 44, 29, 41, 25, 28 min), plus reloading the app. A mod change costs seconds: `pnpm watch <id>`, atomic install, reload on save (`mods:README.md` Commands, `help/documentation/28-mods.md:115`).
- So a brain Issue is judged by how many later experiments stop needing a brain Issue.
- Every contract Issue edits `mods-host.service.ts`, `contract/mod-api.v1.ts`, the contract test and `28-mods.md`, so these run serially with explicit numbers. Parallel relay gains nothing here.
- Two lanes, cheapest first: a raw member (`MOD_APP`, "one line", `plugins/mods/mod-app.service.ts:20-21`) or a helper in `mods:shared/` to learn, then the contract once a mod keeps using it. Accepted cost: more raw `ctx.app` for a few weeks, and hacks stay longer than a bug-first plan would allow (issue 07 pays it).

## Order

| When | # | Title | Size | Repo | Depends on |
|---|---|---|---|---|---|
| Day 0 | M1 | One command to a new mod, and checks that allow additions | S | mods | owner decision A |
| Day 1 | 01 | Raw spike pack on `ctx.app` | XS | brain | none |
| Day 1 | 02 | Every mod action is a palette row | S | brain | none |
| Week 1 | 03 | `ctx.ui.pick` | S-M | brain | none |
| Week 1 | M2 | Configurable hotkeys as a mod | S | mods | 02, 03 |
| Week 1 | 04 | Right-click items on notes and folders (`ctx.addMenuItem`) | M | brain | none |
| Week 2 | 05 | Status bar item (`ctx.addStatusItem`) | S | brain | none |
| Week 2 | M3 | Sidebar spike with a DOM hack | 1 h | mods | none |
| Week 2-3 | 06 | Right sidebar section (`ctx.addSidebarSection`) | M | brain | M3 kept in use |
| Gate | 07 | `ctx.notes`: promote what `shared/` proved | M | brain | helper in 2+ mods |
| Gate | 08 | Mod-supplied rail list, push model (`ctx.addList`) | M | brain | `.view` recipe hit its limit |
| Gate | 09 | `ctx.on('note.saved')` with a dispatcher | M | brain | 01's spike kept running |

M items are direct commits in the mods repo, minutes each, and are not relay Issues. Separately, Issue 08 in `vault-mods` (`ctx.http`, size S, already ready) becomes urgent the day an experiment needs a new host: `fetch` only reaches `connect-src` (`src-tauri/tauri.conf.json:29`, `28-mods.md` Limits). Run it serially then. Agents (09, 10, 13) and Sentry (12) stay out of this plan: Sentry blocks no experiment.

## M1. One command to a new mod, and checks that allow additions

Scope: `pnpm new-mod <id>` writes `manifest.json`, `src/index.ts` (`satisfies Mod`), one test. A new mod is a hand-copied folder today (`mods:README.md` "Mod anatomy"). Fix three frictions nobody reported:
- `bundles.test.ts:11` uses `toEqual` over the baseline, and `README.md:74` forbids editing it. Adding one action to an existing mod turns `pnpm check` red. `build.mjs` runs no tests and CI is gitleaks only, so it does not block the live loop, only honest checks. Change it to a subset: every baseline registration still exists, additions pass. That keeps its stated purpose ("must never get lost in a rewrite", `scripts/mod-loader.ts`). Loosens a check: owner decision A.
- `fakeCtx` is an object literal typed `FakeCtx` (`shared/test/fake-ctx.ts:53,142`), and `tsconfig.json` maps the contract straight to the brain checkout. So each brain contract member turns mods `tsc` red until the fake grows. Build it on a Proxy that throws on any unmodelled member: same promise as its comment ("anything not modelled throws").
- No `CLAUDE.md` in the repo (`ls -a`). Add a short one pointing at `README.md` and `28-mods.md`.

Plus a docs recipe, cost 0: a mod writes a `.view` with `_rail: true` and it becomes a pickable rail list (`features/rail-shell/lens.logic.ts:218-237`, `help/documentation/25-types-and-relationships.md:151-155`).
- **Removes:** hand-copying, red checks on additive work. **Unlocks:** "stale notes", "notes with no parent" lists on day 0, the first answer to "change the rail list".
- **Risk:** the `.view` stays after the mod is gone. **Test:** `pnpm check`; add an action to `playground` and see it pass; remove one and see it fail.

## 01. Raw spike pack on `ctx.app`

Scope: five lines in `MOD_APP`, one line each in `mods:shared/types.ts` `RawApp`, one helper `mods:shared/on-save.ts`. No contract change. Direct merge (small ticket).
```ts
addAfterSaveObserver, renameItem, moveItem, deleteItem, railRegistryStore   // live objects, no promise
```
- **Files:** `plugins/mods/mod-app.service.ts:23-53`, new `src/tests/lib/plugins/mods/mod-app.service.test.ts` (no test references `MOD_APP` today, grep), `28-mods.md:385`.
- **Removes:** the DOM click `mods:mods/hotkeys/src/hotkeys.service.ts:28-32`, replaced by `railRegistryStore.actions.find(a => a.key === 'mod:tasks:main')?.run()` (`mods/tasks/src/index.ts:24`, getter at `features/rail-shell/rail-registry.store.svelte.ts:42`).
- **Unlocks, with no further brain Issue:** auto-tag on save, archive by move, report rotation, rename by rule. These answer whether 09 and a `ctx.vault.rename` are worth a contract.
- **Risk:** observers run sync inside `notifyAfterSave` (`core/editor/editor.hooks.ts:85-91`), so a slow one stalls the save. `on-save.ts` defers with `setTimeout(0)` and uses `ctx.register`. A handler that writes the note it was told about loops via `mod-vault.service.ts:111`; it is async, so the Labs switch stops it. Rename, move and delete go through `applyPathChange` (indexing rule 6), no new write path, no core edit. Failures inside `ctx.app` reach Sentry (`28-mods.md` Errors).
- **Test:** each member is the real function or store; a mods-repo test of `on-save.ts` (deferred, removed at unload).

## 02. Every mod action is a palette row

Scope: `addAction` also registers a row `<Mod name>: <title>`, category `Mod`, with no contract change and no mod rebuild: all 25 action call sites appear at once. Picking calls the existing `openPicker(key, title, [id])` with key `mod:<mod>:action:<id>`, which already handles busy, input and the run view (`mods-host.service.ts:256-275`). A mod with only `addAction` is now reachable, so an experiment no longer needs a rail button. The store lives in `plugins/mods` and `app/commands.ts` reads it, next to `railGoToCommands` (`:371`).
```ts
// internal, no contract: mod-commands.store.svelte.ts ($state.raw, unregister by identity)
modCommandsStore.list: readonly { id: string; label: string; run: () => void }[]
// raw for mods: ctx.app.modCommandsStore
```
- **Files:** new store, `mods-host.service.ts:318-321`, `app/commands.ts:371`, `mod-app.service.ts`, `28-mods.md:141`, `e2e/specs/vault-mods.spec.ts`, tests.
- **Layers:** `app/` imports plugins already (`app/commands.ts:22-43`) and is exempt (`scripts/import-graph.mjs:162`). No `features/` or core file.
- **Removes:** the rail as the only way to reach an action. **Unlocks:** fuzzy search over every action, recents, keyboard-only use, one mod running another's action through raw `run()`, M2.
- **Risk:** closing the palette and opening the picker in one tick (`features/command-palette/CommandPalette.svelte:27-37`) may lose focus; not run, E2E checks it. 25 rows of noise: add `palette: false` only if it bothers (decision C). The prop re-run rests on a comment (`commands.ts:50-55`), so test it mounted. A row picked during a reload opens an empty picker: rare, visible, recoverable, no guard.
- **Test:** store unit test; host test: row appears, gone after disposer, unload and failed `onload`, one row after reload, picking starts a run in `modsRunsStore`; E2E: open palette, type the mod title, Enter, assert the rendered result, and that an input action focuses its field; a row appears after a switch-on without reopening the app.

## 03. `ctx.ui.pick`

Scope: a fuzzy list dialog, in the single dialog queue. `pickNote` is a helper in `mods:shared/`, not host API.
```ts
pick: <T extends { id: string; title: string; description?: string }>(o: { title: string; placeholder?: string; items: T[] }) => Promise<T | null>;
```
- **Files:** `contract/mod-api.v1.ts:192-205`; `mod-dialogs.store.svelte.ts:5-17,30`; `mods-host.service.ts:132-176`; `ModDialogHost.svelte` branch built on `components/ui/command`; `28-mods.md:266`; contract, host, store and dialog tests.
- **Removes:** `mods:mods/inbox-triage/src/triage.service.ts:35-52` (types pasted into a message, unknown-type alert), `mods/bulk-tag/src/bulk-tag.service.ts:45` (typed folder), portent's typed parent. **Unlocks:** jump to note, choose type, every palette flow that needs a choice, M2's "bind" step.
- **Risk:** every row is DOM. Filter with `utils/fuzzy-match.ts:8` over all items, render 100 at most (same reason as `core/filesystem/file-entries.logic.ts:28-29`). Duplicate ids break a keyed each: reject. `CANCELLED` needs `pick: null` or unload resolves `undefined` (`mod-dialogs.store.svelte.ts:30`).
- **Test:** 1000 items render at most 100 and the filter reaches item 900; Esc and unload give null; the mod's own object comes back; contract list updated.

## M2. Configurable hotkeys as a mod

Scope: the `hotkeys` mod keeps its window capture listener (`mods:mods/hotkeys/src/index.ts:16-19`) and reads `{ chord, commandId }` bindings from `loadData`. A "Bind hotkey" action: `ctx.ui.pick` over `ctx.app.modCommandsStore.list`, then records the next chord. "Unbind" likewise. The owner's "configurable" ships with no core dispatcher.
- **Removes:** typed-twice labels, the chord path that skips the run view (`hotkeys.service.ts:41-59`). **Unlocks:** a chord for any mod action, changed without a rebuild.
- **Risk:** capture plus `stopPropagation` silently shadows app and editor chords. Keep the existing Cmd+Shift-only rule. Built-in commands stay unbindable (`getBuiltInCommands` is in `app/`, which plugins cannot import). No chord shown in the palette row.
- **Test:** `handleKeyDown` with `fakeCtx`: bound chord runs the command, repeat ignored, unbound passes through.

## 04. Right-click items on notes and folders

Scope: one registry, one contract member, two surfaces, one Issue. Built-in items stay hard-coded. A contributed group renders before Rename and Move to Trash. `when` runs once at the `contextmenu` event, never in a template. The host's run path gets its second caller here, so extract the helper now, not before.
```ts
interface ModMenuTargetV1 { surface: 'note' | 'folder'; path: string /* vault-relative; '' is the root */; isMarkdown: boolean }
addMenuItem: (item: { id: string; title: string; surfaces: ('note' | 'folder')[];
  when?: (t: ModMenuTargetV1) => boolean; run: (t: ModMenuTargetV1, run: ModRunV1) => unknown }) => () => void;
```
- **Files:** new `features/note-list/menu-items.store.svelte.ts` and a small render component; `features/note-list/NoteRowMenu.svelte:56,260`; `features/rail-shell/FilesNavigator.svelte:319,443`; `mods-host.service.ts:356`; contract `:303-305`; `28-mods.md:141`; `NoteRowMenu.test.ts`, `FilesNavigator.menu.test.ts`, host and contract tests, E2E.
- **Layers:** this is the one surface that needs a `features/` registry: both menus are features, and `features->plugins` is forbidden (`scripts/import-graph.mjs:165`). `rail-shell -> note-list` is legal (`src/tests/lib/architecture/layer-rules.test.ts:135-150`).
- **Removes:** portent's "Open a note first" (`mods/portent/src/portent.service.ts:19-20`), bulk-tag's folder prompt (`bulk-tag.service.ts:45`). **Unlocks:** right-click Archive, Set parent, Triage, Tag all here, New PRD here, Copy as wikilink.
- **Risk:** not per row: one menu wraps the virtualized list (`features/rail-shell/RailNoteList.svelte:821-897`, `NoteRowMenu.svelte:56`). Row paths are absolute (`features/note-list/note-row.types.ts:5-6`), so the host converts. `when` throwing or returning a non-`true` value hides the item. A prompt opened as the menu closes may fight for focus (`components/ui/context-menu/context-menu-content.svelte:12-17`, not run). `runAction` has no busy guard, so check `isBusy(key)` first (`mods-host.service.ts:257` is the model). No icon in v1. Stale items while a reload happens under an open menu: rare, no guard.
- **Test:** zero items renders exactly today's labels (`NoteRowMenu.test.ts:285-294` stays green); real registry: item shows, `when` false hides, throw hides, `run` gets the vault-relative path, root is `''`; host: gone after unload, one after reload; E2E: right-click a row, click the item, assert the written note.

## 05. Status bar item

Scope: text and click only, no mod DOM.
```ts
addStatusItem: (item: { id: string; title?: string; onClick?: () => unknown }) => { setText: (text: string | null) => void; remove: () => void };
```
- **Files:** new `plugins/mods/mod-status.store.svelte.ts`, `ModStatusItems.svelte`; `app/AppShell.svelte:301-310` (right snippet); host; contract; tests; docs. No core file: `core/status-bar/StatusBar.svelte:4` takes snippets, and `AppShell` is in `app/`.
- **Removes:** `mods:mods/focus-timer/src/status-chip.ts:12-26`. **Unlocks:** an output surface for experiments with no dialog: countdown, inbox count, open tasks today.
- **Risk:** each item must be one direct child, and `null` leaves the list, or the divider CSS draws a stray line (`StatusBar.svelte:24-33`, `status-chip.ts:22-24`). Cap text length. Per-second `setText` must not rebuild the list.
- **Test:** renders inside `[data-status-bar]`, `null` removes the element, click runs, unload removes it; E2E asserts the text.

## M3. Sidebar spike

Scope: an hour in `playground`: append a node to `[data-right-sidebar]` (`app/AppShell.svelte:274`) with a MutationObserver, undone in `ctx.register`. Same hour: Habits `dialog.show()` instead of `showModal()` (`mods/habits/src/habits.view.ts:161`), expected to let `ctx.ui.confirm` work (not run). It answers "do I keep a panel open?", not whether the hack is good. **Gate for 06:** still in use after a few days.

## 06. Right sidebar section

Scope: the owner's "menu in the properties panel", done as a section rather than a menu: a mod gets a body next to Properties and puts its own buttons there. The type dropdown in `PropertiesView` stays. Most freedom of any item here: anything a mod can draw, beside the note.
```ts
addSidebarSection: (s: { id: string; title: string;
  mount: (el: HTMLElement, view: { path: string | null; signal: AbortSignal }) => void | (() => void) }) => () => void;
```
- **Files:** new `plugins/mods/mod-sidebar.store.svelte.ts`, `ModSidebarSections.svelte` on `core/layout/SidebarSection.svelte`; `app/AppShell.svelte:290`; host, contract, tests, docs. No core file edited.
- **Removes:** Habits' dialog plumbing (`habits.view.ts:151-165`, per scouts), M3's hack. **Unlocks:** Portent panel, triage without modal loops, the note's tasks, 1:1 topics.
- **Risk:** the effect keys on `editorStore.activeTabPath` with `untrack` (`docs/PATTERNS.md`), never `content`, which changes per keystroke (`core/editor/editor.store.svelte.ts:84`). Mount in try/catch, error shown in the body. `{#if rightSidebarShown}` destroys the pane and hides it on canvas, view and kanban tabs (`AppShell.svelte:264`, `core/layout/layout.logic.ts:23-37`): the owner uses Kanban and canvas daily, so sections are absent there (decision D). Mount lazily on open, as `BacklinksPanel` does. The host empties `el` at unload.
- **Test:** real store: mount once per path; `updateContent` does not re-mount; a throw shows the error and other sections still render; cleanup runs on path change and unload; E2E asserts rendered text.

## Gated: build only when the gate is met

**07. `ctx.notes`.** `updateFrontmatter`, `activeNote`, maybe `process`. Incubate in `mods:shared/` first; the raw path already works, so this blocks no experiment. **Gate:** one helper signature used by 2+ mods, including a menu item. **Files:** contract, new service beside `mod-vault.service.ts`, tests, `28-mods.md:378`. **Removes:** raw frontmatter calls in bulk-tag, inbox-triage, portent, `RawApp` copies, portent's index-refresh call. **Risk:** two write semantics (`write` refuses dirty, the frontmatter writer saves the whole tab, `mod-app.service.ts:46-49`); `process` undo is an open owner question (`sonnet-data-api.md`). **Test:** real `editorStore`, open dirty tab, closed note, refusal message. Size M.

**08. `ctx.addList` (push).** The owner's "change the rail's list". `ctx.addList({ id, title, icon })` returns `{ set(paths | groups), dispose }`. Reuses sort, search, pills, groups, the row menu (`sonnet-rail-note-list.md` E2a). **Gate:** a list the `.view` filter cannot express, wanted twice. **Files:** `features/rail-shell/rail-shell.types.ts:175-186` (`component` optional, `icon` string), `app/AppShell.svelte:117`, `Rail.svelte:337`, host, contract. **Removes:** report notes for lists (vault-health). **Risk:** a saved pick falls back to Today until the mod registers; cap paths. Mod code never runs in the `$derived`. **Test:** `resolveLens` with a registered list, unknown paths dropped, reload. Size M.

**09. `ctx.on('note.saved')`.** Dispatcher plus event, guards as in `sonnet-events-background.md`. **Gate:** 01's `on-save.ts` is still running in a real mod after two weeks; its burst and loop behavior then sets the guard numbers instead of guesses. **Removes:** the raw observer. **Risk:** bursts, loops; adds no writer. **Test:** deferred delivery, coalesced burst, unload. Size M.

## If only N Issues are done

- **Only 3 brain Issues:** 01, 02, 04. Raw pack, palette, right-click: two of the owner's ideas and all spikes. Lost: `pick` (prompts keep working), status item (focus-timer's hack keeps working), sidebar (M3's hack). M1 is always done; M2 degrades to a chord table in code.
- **Only 6:** 01 to 06. Cut 07 (`shared/` carries it), 08 (`.view` recipe), 09 (raw observer plus helper). This covers every idea the owner named.

## What not to do, and why

- **Declared `hotkey` plus a core dispatcher, remap UI.** M2 delivers it with no core. A bubble-phase dispatcher would lose Cmd+Shift+U in the editor (`sonnet-palette-hotkeys.md` E2). A rebinding UI was built and removed (`cb0a0b50e`, ADR 0033 amendment). Revisit when a second mod wants its own chord.
- **Declarative settings, `ctx.ui.form`, `openPanel`.** The only author has the source open and a rebuild takes seconds, so a Labs form buys little. Chained prompts work.
- **`when` on palette rows.** Mod code in the list build; a run failing with "Open a note first" is already soft.
- **Pull `resolve` lens, row decoration, mod sort and filter.** `resolve` runs unguarded inside `$derived.by` (`features/rail-shell/lens.logic.ts:434`, `RailNoteList.svelte:177-190`). `property:<key>` sort and frontmatter pills already exist.
- **CodeMirror extensions, keymaps, mod fences, completion sources, template variables.** Per-keystroke code and Live Preview rules 2, 3, 11. No real mod renders in the editor. A ```` ```queryjs ```` block with `kb.view` already prototypes fences (`plugins/queryjs/kb-api.ts:402-422`). Completion is the first to reconsider if a slash menu is wanted.
- **Editor tab, tab menu, editor body menu, Types navigator menu, multi-select.** Each is reached via a note row or needs a selection model that does not exist. Editor and tab menus also force a core registry.
- **Note action bar items, property row actions, property widgets.** Palette, right-click and the section cover them. Widgets add a fourth frontmatter writer.
- **Deep link to an action.** PRD says no: outside content must not run vault code (`.scratch/vault-mods/PRD.md:90`).
- **Batch writes, before-save hook, `vault.changed`, `ctx.every`, load reason, safe mode.** Core write paths or rare cases; the Limits section already documents recovery from a freezing mod.

## Disagreements with the research

1. **"Registry in core or features" (task premise, right-sidebar, palette and value reports).** Only 04 needs one. Palette, status and sidebar can live in `plugins/mods`, because their render site is in `app/`, exempt from outbound rules (`import-graph.mjs:162`). `sonnet-views-and-settings` saw this for UI mounts; it holds for the palette too. Less code, no core edits.
2. **Host kernel first (contract report E1).** No separate Issue. 02 only calls `openPicker`; extract when 04 is the second caller.
3. **Opt-in palette flag (contract report E2).** Default on with no field: zero mod changes, so the value arrives the day it merges.
4. **Declared hotkeys (palette, value reports).** See M2.
5. **Settings Tier A (views report).** Low for a sole author with a watch build.
6. **Facade first (value and data reports).** Best for bugs, weak for velocity: the raw path works today and `shared/` already wraps it. It moves to a gate.
7. **Extend the recorder per surface (contract report E8).** Not needed: `satisfies Mod` and `tsc` catch a typo'd member, and pinning experiments is the opposite of the goal. The real frictions are the baseline `toEqual` and the `fakeCtx` literal, which no report names.
8. **"Each member freezes an API" (several).** Overstated at one author. `apiVersion` is a literal with no reader (`mods-host.service.ts:278`; in the mods repo only `fake-ctx.ts`), and all 12 mods typecheck against the live contract. See decision B.
9. **Deep link Tier B (events report).** The PRD excludes it.
10. **Unload race guards (contract, menu reports).** Skipped as rare, visible, recoverable.

## Owner decisions

- **A.** Baseline test becomes "nothing lost, additions allowed". Downside: a renamed action title passes only if the old one is removed from the baseline by hand, which is the point. Alternative: keep `toEqual` and accept red checks on every additive experiment.
- **B.** A `Provisional` tag on new contract members: changeable with no `apiVersion` bump until two mods use them, which needs a line in the header (`contract/mod-api.v1.ts:15-16`) and an ADR-0036 amendment. Downside: the contract promises less. Alternative: treat each member as frozen and spend more design time per Issue.
- **C.** Palette default on: 25 more rows. Alternative: opt-in, which needs a contract field and a rebuild of every mod.
- **D.** Sidebar sections absent on Kanban and canvas tabs. Alternative: change `layout.logic.ts`, a core behavior change, not proposed.

## Not verified

Nothing was run: focus hand-off from palette or menu to a dialog, `AppOverlays` prop reactivity when mounted, `.view` pickup right after `ctx.vault.create`, the `dialog.show()` confirm fix, and whether `pnpm tauri dev` needs a restart per brain Issue. Habits lines are from scouts. Relay times are from one day of the ledger, on smaller surfaces than 04 or 06.
