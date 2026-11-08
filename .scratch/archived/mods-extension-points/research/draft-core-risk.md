# Mods entry points: plan from minimum core risk

Priority: smallest set of core seams that keeps the app stable, preferring what deletes existing hacks. Paths are under `src/lib` unless noted; `mods:` is `/Users/diegorv/kokobrain-vaults/kokobrain-mods-src`. Nothing was run; cites were read at HEAD `bc9298432`.

## Verdict

**The plan needs no new core seam and changes no core logic.** The only edit under `core/` is one word: `export` on `WRITE_ERROR_MESSAGES` (`core/frontmatter/frontmatter-write.service.ts:48`).

This holds because `app/` is the composition root and may import plugins: `if (f.layer === 'app') return null` (`scripts/import-graph.mjs:162`), and `app/commands.ts:22-27`, `app/global-keybindings.ts:12-18` and `app/AppShell.svelte:47,49` already do it. So a plugin-owned store plus an `app/` read is enough for the palette, hotkeys, status bar and sidebar. A surface rendered by a **feature** needs a registry in `features/`, and `railRegistryStore` exists for that. Only surfaces rendered by core (`EditorTabs.svelte`, `MarkdownEditor.svelte`) would need a core registry, so this plan leaves them out.

| Surface | Mod state lives in | Rendered by | Core edit |
|---|---|---|---|
| Palette, hotkeys | `plugins/mods` store | `app/commands.ts`, `app/global-keybindings.ts` | none |
| Status chip | `plugins/mods` store | `plugins/mods` component in the `AppShell` snippet | none |
| Sidebar section | `plugins/mods` store | `plugins/mods` component in `AppShell` | none |
| `suggest`, `process`, `updateFrontmatter` | `plugins/mods` | `ModDialogHost`, existing core writers | one `export` |
| Note and folder menus | `railRegistryStore` (one more list) | `NoteRowMenu`, `FilesNavigator` | none |
| Pushed note list | `railRegistryStore` (existing lists) | `Rail`, `RailNoteList` | none |

## Limits every Issue keeps

1. **Mod code runs on an event only**: a click, a chord, a submit. Never in a `$derived`, a template expression or a list build. `resolveLens` has no try/catch (`features/rail-shell/lens.logic.ts:434`) and runs in `$derived.by` (`RailNoteList.svelte:177-190`). The one exception is `mount` in Issue 7: in `untrack`, in try/catch, keyed on path only.
2. **Registries hold plain data and host closures.** No `when`, `appliesTo` or per-row callback. Filters are declarative and additive later.
3. **Every run goes through the existing run path** (`mods-host.service.ts:204-247`), so Stop, toast, `debug(MOD:<id>)` and the Sentry rule stay in one place.
4. **Reload safety:** lists are `$state.raw` with identity unregister (`rail-registry.store.svelte.ts:6-10`), wrapped in `disposable()` (`mods-host.service.ts:105-116`). Keys are namespaced `mod:<id>:...`.
5. **No Issue adds behavior to a core write path.** Writes reuse `saveFileByPath`, `syncExternalContentToEditor`, `notifyAfterSave`.
6. **Zero registrations render exactly today's UI**, so tests that pin menu labels stay untouched.

## Issues, in order

Run serially. Every Issue edits `contract/mod-api.v1.ts`, `mods-host.service.ts` and the freeze test `mod-api-contract.test.ts:45-61`, as do ledger Issues 08 and 13. Migrating the mods themselves happens in the mods repo after each delivery, not inside the relay Issue.

### 1. Run any mod action from the command palette (S)
- **Scope:** every `addAction` becomes a palette row, `<Mod name>: <title>`. Selecting it runs the action, opens its text field if it has `input`, or shows the live run if busy. This also creates the shared entry point later Issues use.
- **API:** none. No contract change, no `palette` flag. Internal: `modActionsStore.rows: { key, label, run, combo? }[]`.
- **Files:** new `plugins/mods/mod-actions.store.svelte.ts`; `mods-host.service.ts:318-321` (register next to `actions.set`, in the same `disposable`), `:256-275` (`run: () => openPicker('mod:<id>:action:<aid>', title, [aid])`, after `assertLive`); `app/commands.ts:93` (append rows). `features/command-palette` untouched.
- **Removes:** the rail button as the only way to reach 25 `addAction` call sites, and the need for a button to try a new action.
- **Unlocks:** palette-first Portent; any new action testable with Cmd+P; a base for Issues 3 and 5.
- **Risk:** low. Rows are strings, so no mod code enters the list build. Stale recents are dropped (`command-palette.logic.ts:11-14`). Open: focus handoff when the closing palette hands off to the picker in one tick (`CommandPalette.svelte:29-32`). If the E2E fails, `await tick()` in the row action. Palette and rail runs of one action have separate keys, so both can run at once; rare, left alone.
- **Test:** real store: reload leaves one row, unload none, busy shows the run. Mounted `AppOverlays` proves the row appears after a late registration (the claim at `commands.ts:50-55` has no mounted test; `AppOverlays.test.ts` does not cover it). One E2E in `e2e/specs/vault-mods.spec.ts`: an `input` action takes typed text.

### 2. Tab-aware note writes: `ctx.vault.process` and `ctx.vault.updateFrontmatter` (M)
- **Scope:** two read-modify-write calls that cannot lose unsaved edits, so mods stop dispatching into the live CodeMirror view. Markdown only. `write` keeps its refusal.
- **API:**
```ts
process: (path: string, fn: (text: string) => string) => Promise<string>; // fn pure, sync; may run twice
updateFrontmatter: (path: string, mutate: (p: ModPropertyV1[]) => ModPropertyV1[], options?: { refreshIndexNow?: boolean }) => Promise<void>;
```
- **Policy:** tab open, clean or dirty, active or not: `fn(tab.content)`, `syncExternalContentToEditor(abs, next, false, 'none')`, `await saveFileByPath(abs)`, no await before the sync. This is the tab branch of `updateNoteFrontmatter` (`frontmatter-write.service.ts:116-140`). No tab: read, `fn`, restart once if a tab opened, then the `write` steps (`mod-vault.service.ts:103-111`). A failed save rejects and leaves the tab dirty; no rollback.
- **Files:** `plugins/mods/mod-vault.service.ts` (extract the raw write of `write` into one helper, so `raw-write-ratchet.test.ts` keeps one listed site); the `export` above; `help/documentation/28-mods.md:203-209`.
- **Removes:** `mods:shared/editor.ts:24-40` (`editNote`, raw `editorView.dispatch`) in daily-log, focus-timer, one-on-one and tasks; the retry loop `mods:mods/one-on-one/src/one-on-one.service.ts:23-35`; the pre-check `mods:mods/tasks/src/tasks.service.ts:39-40`; the copied table `mods:mods/portent/src/portent.logic.ts:3-14`; raw `updateNoteFrontmatter` in bulk-tag, inbox-triage, portent; the `Property` copy `mods:shared/types.ts:8-13`. Also retires a real race: `write` checks dirty at `mod-vault.service.ts:100-101`, awaits, then overwrites `tab.content` at `:105`, so keystrokes typed during the await are dropped (read, not reproduced).
- **Unlocks:** every right-click, chord or panel action can safely edit a note that is not the active tab.
- **Risk:** medium, data. It is a new caller of existing writers, no new core path. **Owner decision:** a mod edit stops being undoable with Cmd+Z (`MarkdownEditor.svelte:170-199`, `addToHistory.of(false)`), and a change too large to diff drops the note's undo history (same lines). Today `editNote` dispatches into history. Recommended: accept, since Properties edits behave the same; a mod that wants undo keeps raw `editorView`. Two calls on one closed note race, as `frontmatter-write.service.ts:95-97` documents; state it once in the docs.
- **Test:** real `editorStore`, mocked Tauri fs, in `mod-vault.service.test.ts`: dirty active tab keeps typed text, dirty background tab, closed note, tab opened during the read reruns `fn`, missing note, `fn` throws, non-markdown refused, `refreshIndexNow` only when asked.

### 3. `ctx.addMenuItem`: note row and Files folder menus (M, blocked by 1)
- **Scope:** a mod adds items to the note row menu and the folder menu. Target is the path only, from the right click.
- **API:**
```ts
interface ModMenuItemV1 { id: string; title: string; on: 'note' | 'folder'; files?: 'markdown' | 'all'; // default 'markdown', notes only
  run: (target: { path: string }, run: ModRunV1) => unknown } // vault-relative; '' is the vault root
addMenuItem: (item: ModMenuItemV1) => () => void;
```
- **Files:** `features/rail-shell/rail-registry.store.svelte.ts` (one list, `registerMenuItem`); `features/note-list/NoteRowMenu.svelte` (new prop `extraItems`, default empty, rendered before the separator at `:260`, filtered with `isMarkdownFile` as at `:246`); `RailNoteList.svelte:821` (pass the list; it already reads the registry at `:184`); `FilesNavigator.svelte:343-360` (render after New folder); host: extract the busy guard of `openPicker` (`:257-260`) so item runs share it, key `mod:<id>:menu:<itemId>`; convert absolute to vault-relative at the boundary.
- **Removes:** the active-tab dependency and "Open a note first" (`mods:mods/portent/src/portent.service.ts:18-20`), bulk-tag's typed folder prompt (`mods:mods/bulk-tag/src/bulk-tag.service.ts:45`). Core: nothing.
- **Unlocks:** Organize, Archive, Check this note, Tag all notes here, New PRD here. Tests whether per-note verbs beat the picker.
- **Risk:** low. One menu wraps the virtualized list (`RailNoteList.svelte:821-897`) and rows only set a target (`NoteRow.svelte:67`), so the cost is per right click. No mod code at render. One live run per item: a second right click during a run shows that run. A closing menu fights focus (`context-menu-content.svelte:17-23`), so an item that opens `ctx.ui.prompt` needs an app check. `railRegistryStore.folderCreators` is not reusable: it is a "New file" creator with a Svelte icon (`rail-shell.types.ts:218-229`).
- **Test:** real registry in `NoteRowMenu.test.ts` and `FilesNavigator.menu.test.ts`: no items renders no extra separator; a `.canvas` row hides a default item; root gives `''`; a stale item after unload does nothing. Host test: reload leaves one, unload none.

### 4. `ctx.ui.suggest`: pick from a list (S)
- **Scope:** a searchable dialog over a static list, in the existing queue. Host-only filtering, no mod code per keystroke.
- **API:** `suggest: <T extends { id: string; title: string; description?: string }>(o: { title: string; placeholder?: string; items: T[] }) => Promise<T | null>`.
- **Files:** `plugins/mods/mod-dialogs.store.svelte.ts:30` (`suggest: null` in `CANCELLED`), `ModDialogHost.svelte` (new branch on `components/ui/command`, as `ModActionPicker.svelte:165-184`), `mods-host.service.ts:132-176`, `28-mods.md`.
- **Removes:** type names pasted into a prompt and the unknown-type alert (`mods:mods/inbox-triage/src/triage.service.ts:35-49`), dangling `_belongs_to` from a typed parent name (`mods:mods/portent/src/index.ts:32-38`).
- **Unlocks:** note, type and folder pickers in any mod.
- **Risk:** minimal, nothing outside `plugins/mods`. Render at most 100 filtered rows, the quick switcher's cap (`core/filesystem/file-entries.logic.ts:28-29`). Reject duplicate ids.
- **Test:** store: unload settles null. Host: invalid items throw. Component: filtering beyond the cap still finds item 101.

### 5. `hotkey` on `addAction`: one dispatcher in `app/` (M, blocked by 1)
- **Scope:** an action declares a chord. One listener runs it through the Issue 1 row. The palette row shows the chord.
- **API:** `hotkey?: string` on `ModActionV1` (`'Mod-Shift-j'`, a letter, must have Mod or Ctrl, no Alt; `invalid(...)` otherwise).
- **Files:** `utils/keybindings.ts` (add `parseHotkey`, the inverse of `toCodeMirrorKey`); `app/global-keybindings.ts:223-226` (one listener last in `cleanups`); `mods-host.service.ts:295-322`.
- **Guards:** return at once without Meta or Ctrl; skip when `e.defaultPrevented` (`registerKeybinding` prevents before its handler, `utils/keybindings.ts:72`, and listeners run in order, so built-ins win with no table), when `e.repeat`, and inside `[role="dialog"]` (`global-keybindings.ts:44`). First registered wins; the loser goes to `debug`.
- **Removes:** the window capture listener with `stopPropagation` that shadows editor and app chords (`mods:mods/hotkeys/src/index.ts:16-19`, `hotkeys.service.ts:45-46`), its own repeat guard, the DOM click on another mod's button (`hotkeys.service.ts:28-31`), chords with no run view or Stop.
- **Unlocks:** chords on any action, one place to see conflicts, a chord that opens an `input` field.
- **Risk:** low: one listener, no mod code unless a chord matches. **Owner decision:** bubble phase means editor and app win, so Cmd+Shift+U stops working in the editor (`Mod-Shift-u` is `redoSelection` on macOS, `@codemirror/commands/dist/index.js:574`, installed at `editor-extensions.ts:163`). Pick another chord; capture is what breaks editor keys silently today.
- **Test:** real DOM events: built-in chord wins, chord handled by the editor is skipped, repeat ignored, dialog ignored, reload leaves one entry, bad string throws. Bubble order is pinned by registering after the built-ins.

### 6. `ctx.addStatusItem`: text chip (S)
- **API:** `addStatusItem: (i: { id: string; text?: string; title?: string; onClick?: () => unknown }) => { setText: (t: string | null) => void; dispose: () => void }`. `null` removes the element. Text only, no `render(el)`.
- **Files:** new `plugins/mods/ModStatusItems.svelte` and store; `app/AppShell.svelte:306-309` (first in the `right` snippet). `core/status-bar/StatusBar.svelte` untouched.
- **Removes:** `mods:mods/focus-timer/src/status-chip.ts:12-26` (`.status-bar-group` query, `isConnected`, remove-not-hide, "not an API" comment).
- **Unlocks:** focus countdown, inbox count, health findings, habit streak.
- **Risk:** minimal. `StatusBar.svelte:24-33` draws dividers on `:not(:first-child)`, so one element per item and removal from the `{#each}`. Skip equal text. A click throw goes to `debug` and a toast.
- **Test:** component test on direct children and dividers; host test on dispose and reload.

### 7. `ctx.addSidebarSection`: host-owned `mount(el)` (M, gated)
- **Gate:** the owner names the first panel a daily mod needs, and Issue 12 is done: this is the first surface where mod DOM listeners run routinely, and those errors are not caught. Otherwise leave it.
- **API:** `addSidebarSection: (s: { id: string; title: string; mount: (el: HTMLElement, view: { notePath: string | null; signal: AbortSignal }) => void | (() => void) }) => () => void`.
- **Files:** new `plugins/mods/ModSidebarSections.svelte` on `core/layout/SidebarSection.svelte:15-29`; `app/AppShell.svelte`, after `NoteInfo`. Collapsed by default.
- **Behavior:** remount when opened and when `editorStore.activeTabPath` changes, never on content (`editor.service.ts:254-257` writes content per keystroke). Before each remount: abort, run cleanup, empty `el`. `mount` in `untrack` and try/catch, a throw shows inline.
- **Removes:** habits' modal `<dialog>` and inline confirm (`mods:mods/habits/src/habits.view.ts:105,161`). This is the answer to "a menu in the properties panel": a section gives more than a menu in `PropertyField` and touches no property write path.
- **Unlocks:** Portent panel, triage panel, tasks of the open note.
- **Risk:** medium, plugin side only. Most DOM exposure here. Hidden on canvas, view, kanban and virtual tabs (`core/layout/layout.logic.ts:15-37`), and `{#if rightSidebarShown}` recreates it, so mods keep state outside the DOM.
- **Test:** real store; effect does not rerun on a content change; throw shows inline and other sections survive; unload empties `el` and aborts.

### 8. `ctx.addList`: a pushed note list in the rail (M, gated)
- **Gate:** first document the free recipe in `28-mods.md`: a mod writes a `.view` with `_rail: true` (`help/documentation/25-types-and-relationships.md:151-155`, `lens.logic.ts:218-226`), which covers any list that is a filter. Build this only when a real list cannot be a filter.
- **API:** `addList: (l: { id: string; title: string; icon: string }) => { set: (list: { paths: string[] } | { groups: { id: string; label: string; paths: string[] }[] }) => void; dispose: () => void }`.
- **Files:** `rail-shell.types.ts` (`RailNavigator.component` optional, `icon: Component | string`), `Rail.svelte:337`, `app/AppShell.svelte` (`showsNavigator` needs a component), `lens.logic.ts:280` (export `toLensNote`), `mods-host.service.ts`.
- **Behavior:** push only. The host keeps paths in `$state.raw`; its provider maps them to notes through the entries snapshot and drops unknown ones. No mod code in the derived. Paths are bounded by the vault, which built-in lenses already list virtualized, so no cap.
- **Removes:** vault-health's report note (`mods:mods/vault-health/src/health.service.ts:9,20-23`), portent's inbox walk as a list.
- **Unlocks:** the owner's "changes the rail list": Stale, Needs parent, findings, with sort, search and row menu reused.
- **Risk:** medium: the only Issue that changes a feature type. A list is as fresh as the mod's last `set`. A saved pick falls back to Today until the mod registers, with no rewrite (`lens.logic.ts:201-206`). The provider must not throw (`:434`). Lens kind is namespaced because `registerLensProvider` replaces by kind (`rail-registry.store.svelte.ts:55-56`).
- **Test:** real stores: unknown path dropped, deleted note leaves after an entries change, dispose removes rail item and provider, saved key restores after late registration.

## Dependencies

1 -> 3, 1 -> 5. 2 and 3 are independent, but menu verbs on non-active notes want 2 first, hence the order. 4 and 6 are free. 7 and 8 are gated on demand. Ledger Issues 08, 09, 10, 12, 13 stay separate; only 7 depends on 12, whose re-triage to M is noted in its file.

## If only 3 or 6 are done

- **3 Issues:** 1, 2, 3. Reach (palette, 25 actions), safety (the riskiest existing hack gone), the first new surface with a real target. Lost: chords stay a capture hack, the chip stays a DOM hack, typed names stay.
- **6 Issues:** add 4, 5, 6. Each deletes a named hack and adds no hot-path mod code. Lost: mods cannot own a panel or a rail list; the `.view` recipe and the run view fill part of that.

## What not to do

| Item | Why |
|---|---|
| Tab and editor-body menu items | Only reason for a core registry and edits to `EditorTabs.svelte`, `MarkdownEditor.svelte`; a note-row item covers the verbs |
| `when` / `appliesTo` callbacks | Mod code in menu or palette paths for cosmetic gain; `run` already fails soft (`portent.service.ts:20`). Declarative `files` covers the corrupting case |
| Mod lens `resolve`, per-row decoration, mod sort or filter | Mod code in `$derived`, per row, per comparison or per keystroke. A sync loop cannot be stopped (`28-mods.md:517`) |
| Mod section in the Today lens | `RailTodaySection.component` would mount mod DOM inside the virtualized `VList` (`RailNoteList.svelte:681-684`) |
| CodeMirror extensions, decorations, keymaps, fenced-block renderer | Every keystroke plus Live Preview rules 2, 3, 4 and 11. Blocks are already prototypable: ```` ```queryjs ```` with `kb.view("x.js")` has an error boundary (`kb-api.ts:410-422`) |
| Completion source | Asked on each typed character, edits core `editor-extensions.ts:143`. No mod hack removed |
| Template variables | A throw would break daily and typed note creation; no real mod uses `<%` |
| `note.saved`, before-save, watcher events | Observers run in a sync loop inside the save (`core/editor/editor.hooks.ts:85-91`), a mod write fires them again (`mod-vault.service.ts:111`). Needs a dispatcher and loop breaker for no current mod. Learn demand by polling `vaultIndexVersion`. Do not put `addAfterSaveObserver` on `MOD_APP`, even as a spike |
| Note action bar items, property row menus, value widgets | The bar re-derives per keystroke; property rows add writers next to the lossy guard; Issue 7 and Issue 3 cover the need |
| Hotkey rebinding UI, OS-global hotkeys | The owner writes the mods, and a save reloads them, so the string is the configuration. A rebinding UI was built and removed before (ADR 0033 amendment) |
| Declared settings in Labs | Removes constants, not bugs, and needs a storage decision. `ctx.saveData` plus a prompt works. First candidate after this list if a value must change without a rebuild |
| Mod-owned editor tab, `openPanel`, declarative views | Edits the core `fileType` union; two modal dialogs unverified; a widget DSL freezes host code |
| `ctx.every`, load reason, `note.created`, deep links to actions | Possible today by hand, or a new external trigger for code with no current need |
| Moving built-in menu items into the registry | Rewrites tested menus for no mod gain |
| Startup crash guard for a sync loop | Rare and recoverable, recovery is documented (`28-mods.md:517`). State the limit and move on |

**No Issue, on first real need:** `renameItem`, `moveItem`, `deleteItem` as one-line `MOD_APP` members (`mod-app.service.ts:20-21`); they go through the path-change owner, so Indexing rule 6 holds. Freeze in the contract only after a second caller.

**Mods repo, in step:** `recordRegistrations` records only `addAction` and `addRailButton` (`mods:scripts/mod-loader.ts:25-28,58-64`) and any other member falls through to a stub (`:31-39`), so new members pass the smoke test unseen. Extend it with each Issue. A `pnpm new <id>` generator is cheap but independent of this plan.

## Disagreements with the research

- **Task text and `sonnet-context-menus`, `sonnet-right-sidebar`, `sonnet-value`:** a core registry per surface. Not needed, see Verdict. `sonnet-views` was right about `app/`.
- **`sonnet-palette-hotkeys`, `sonnet-contract-and-host`:** registry in `features/command-palette`, a `palette` flag. A plugin store read from `app/` touches no feature and needs no contract member. Flag is additive later if noise hurts.
- **`sonnet-contract-and-host`:** "the palette prop is non-reactive". `commands.ts:50-55` relies on the prop expression re-running. Still unproven by a mounted test, so Issue 1 proves it.
- **`sonnet-context-menus`:** `when` with a snapshot, a richer target, a new `core/context-menu` unit. Path-only target and no `when` remove the snapshot, the Promise-is-truthy trap and the store file.
- **`sonnet-data-api`, `sonnet-value`:** the host should always call `requestPromptIndexRefresh`. That flag makes the next refresh skip the throttle (`app/tauri-listeners.service.ts:298`), and bulk-tag paces itself against that same window (`mods:mods/bulk-tag/src/bulk-tag.service.ts:16-21`). So it is opt-in per call. `sonnet-contract-and-host` flagged the question.
- **`sonnet-data-api`:** a plain record for frontmatter. It needs type detection, new code that can change YAML types. `Property[]` passes through unchanged. Its open question is answered: `updateListener` calls `onContentChange` in the dispatch (`editor-extensions.ts:173-192`, `editor.service.ts:254-257`), so `tab.content` matches the doc outside tab switches.
- **`sonnet-editor`:** completion as "best value for danger". No mod needs it and it sits on the keystroke path. **`sonnet-events-background`:** the `MOD_APP` observer spike puts mod code inside the save loop; polling answers the same question.
- **`sonnet-views`:** settings as Tier A. No bug removed, so not scheduled. **`sonnet-rail-note-list`:** agreed on push over pull; I gate it behind the recipe.

## Not verified

Nothing ran. Unmeasured or unknown: reactivity of the palette prop in a mounted component; focus after a palette, menu or chord opens a dialog; which `Mod-Shift` chords CodeMirror's other keymaps take (only `Mod-Shift-u` was read); `Mod` on non-macOS; whether `.view` filters cover the lists in Issue 8; how Settings > Layout renders a navigator with a string icon. Line cites from `28-mods.md` drift with its edits.
