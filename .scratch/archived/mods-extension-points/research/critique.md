# Critique of the three mod entry point plans

Attack on `draft-freedom.md` (F), `draft-core-risk.md` (C), `draft-velocity.md` (V). Every cite below was read in this pass. Nothing was built or run, so runtime claims are "read, not run". `host` = `src/lib/plugins/mods/mods-host.service.ts`. `mods:` = `/Users/diegorv/kokobrain-vaults/kokobrain-mods-src`. Other paths are under `src/lib` unless they start with a repo folder.

## Findings that change the plan, worst first

**1. A palette or chord run through the existing path opens a modal and moves focus to Stop. C and V miss it.**
- Evidence: `runAction` calls `showRun` before mod code (`host:223`, then `host:235`). The run view focuses Stop (`plugins/mods/ModActionPicker.svelte:39-42`), and Enter reaches that button (`:64-66`). A quiet run closes only after it ends (`mods.logic.ts` `closesWhenDone`, `ModActionPicker.svelte:50-52`). Bits-ui then restores focus (`node_modules/bits-ui/dist/bits/utilities/focus-scope/focus-scope.svelte.js:91-100`). The hotkeys mod skips all of this today (`mods:mods/hotkeys/src/hotkeys.service.ts:50-51`).
- Failure: Cmd+Shift+Y runs `openRandom`, which awaits `ctx.kb()`. The modal shows while the user is typing, and keys land on Stop. Enter stops the run. A rail click has no such conflict because nobody is typing.
- Hits: C Issues 1, 3, 5 ("Every run goes through the existing run path", C:24; C:84 lists "chords with no run view" as a hack to remove). V 02, 04 and M2 (V:56, V:82 likewise).
- Changes: F's lazy reveal (F:36) moves into the palette Issue, for every non-rail origin. Size stays S: `log` and `progress` call `showRun` (`host:227-232`), failures already toast (`host:242`), and a second invoke shows the run (`host:257`). Downside kept from F: a long quiet run shows no Stop. Do not keep F's other additions in that Issue (finding 10).

**2. The raw rail registry is already a free spike for "change the rail's list" and for "New X here". No plan uses it.**
- Evidence: F:29 and V:46 add `railRegistryStore` to `MOD_APP`, but V:49 uses it only to find a button. The object has `registerNavigator`, `registerLensProvider`, `registerFolderCreator` (`features/rail-shell/rail-registry.store.svelte.ts:47,55,71`). A provider's `resolve` gets `ctx.entries` (`rail-shell.types.ts:149-153`, `:20-31`), so a mod can build its own list in plain JS. `component` and `icon` are called as functions with an anchor (`node_modules/svelte/src/internal/client/dom/blocks/svelte-component.js:20-24`), so a no-op function renders nothing, at the price of an empty navigator pane (`app/AppShell.svelte:205-214`). `handleNewFile` runs `creator.create(dir)` and opens the returned path (`FilesNavigator.svelte:122-127`).
- Failure avoided: 30 to 45 relay minutes on a list before knowing it is wanted. `resolve` throwing inside `$derived.by` is the spike's risk (`lens.logic.ts:434`, `RailNoteList.svelte:177-190`), so the mod wraps it in try/catch. No `<svelte:boundary>` was found in `app/`, `routes/` or `rail-shell/`.
- Hits: F 06 (top 6 with no gate, F:129). C 8 and V 08 gate only on the `.view` recipe. C:67 calls `folderCreators` "not reusable", true for a contract and false for a spike. "New PRD here" is listed as a menu unlock in F:55, C:66, V:96.
- Changes: three steps for the list. `.view` recipe, raw spike, then `addList`. F 06 leaves the top 6. "New PRD here" no longer justifies the menu Issue. Keep `resolve` host-only in the eventual contract, as all three say.

**3. The raw pack misses the two members with the widest reach: a store watcher and `settingsStore`.**
- Evidence: mods are `new Function` code (`.scratch/vault-mods/PRD.md:47`) with no runes. `sonnet-events-background.md:8,163` confirms polling is the only raw way to react. `watchModTheme` is the pattern (`plugins/mods/mod-theme.svelte.ts:50-63`). No draft proposes a general form (grep "watch"). `MOD_APP` lacks `settingsStore` (`plugins/mods/mod-app.service.ts:23-53`) though that file imports it (`:5`). A plugin cannot import `selectRailItem` from `app/` (`scripts/import-graph.mjs:161`), so setting `layout.railItem` (`AppShell.svelte:104-111`) is how a mod could select a rail item.
- Proposal: `ctx.app.watch(read, onChange) => dispose`, about 10 lines. `$effect.root`, `read` tracked, `onChange` in `untrack` and try/catch. One raw member covers the active note, `vaultIndexVersion`, tabs, entries and settings.
- Risk, stated in the docs: `read` runs in an effect. Reading `activeTab.content` re-runs per keystroke (`core/editor/editor.store.svelte.ts:84-86`). Reading `activeTabPath` does not, since the keystroke mutates `content` in place (`:39`, `:86`).
- Hits: F 03's `onActiveNoteChange` becomes a later promotion. F:13 needs one named exception. C:137's polling and V's M3 observer become unnecessary.
- Changes: raw pack grows by 2. This is the highest return per line in the whole plan.

**4. An unstable tier already exists, so new surfaces need not enter the frozen contract, and V's decision B is unneeded.**
- Evidence: `ModContext extends ModContextV1` (`host:30-46`). `HOST_UNSTABLE = ['app', 'kb']` is explicitly "unstable, not frozen" (`src/tests/lib/plugins/mods/mod-api-contract.test.ts:62-63`). `MOD_APP` is one shared object (`mod-app.service.ts:23`), so it cannot do per-mod auto-dispose. A per-mod object built in `createModContext` next to `disposable` (`host:105`) can.
- Hits: F:11 ("frozen for good"), C:31, V:9. V decision B (V:168) asks for a header line and an ADR-0036 amendment.
- Changes: new surfaces land on one per-mod unstable member (name open, for example `ctx.labs`), with cleanup, keys and validation like the rest. Each Issue skips the contract file and its freeze list. Promote to `ModContextV1` when two mods use a member. Downside: mods hand-type it, as `RawApp` does (`mods:shared/types.ts:1-4`). Owner decision, replacing B.

**5. C's ban on a raw save observer rests on reasons that do not hold.**
- Evidence: each observer has its own try/catch (`core/editor/editor.hooks.ts:85-91`) and runs after the synchronous `applyNoteChange` and invalidation (`:81,83`), so Indexing rule 6's ordering is safe. Built-ins register first (`app/lifecycle/app-lifecycle.service.ts:276,435`, mods start at `:535`), so a mod starting at vault open runs after them. `updateNoteFrontmatter` writes nothing when unchanged (`core/frontmatter/frontmatter-write.service.ts:129`), so an idempotent handler ends the loop. C's replacement, polling `vaultIndexVersion`, gives no path and lags 2 to 10 s (`docs/agents/indexing-watcher-rules.md` rule 12).
- Limits: `ctx.vault.write` has no equality guard (`plugins/mods/mod-vault.service.ts:103-111`), so a handler using it can loop until the Labs switch. A thrown observer goes through `error()` (`editor.hooks.ts:89`), which reports to Sentry, contrary to P9 (`PRD.md:53`), acceptable for a raw spike by a sole recipient.
- Hits: C:137, C:158. V's `shared/on-save.ts` (V:51) is the right shape.
- Changes: the observer goes in the raw pack with V's deferring helper. `ctx.on` stays gated, as F and V have it.

**6. C Issue 2 (`process`) is a rare-case fix ranked second. It should move to a gate.**
- Evidence: frontmatter verbs on non-active notes already work raw, dirty or not (`frontmatter-write.service.ts:116-140`, used by bulk-tag, inbox-triage, portent). C Issue 3's unlocks are mostly such verbs. `editNote`'s only refusal is a dirty background tab, which the mods README calls "accepted, and visible" (`mods:README.md:85`). `write` keeps its race because C:43 leaves it unchanged (`mod-vault.service.ts:100-105`), so "retires a real race" (C:51) is true only for mods that migrate.
- Regression: `editNote` dispatches with undo (`mods:shared/editor.ts:32`). The external path uses `addToHistory.of(false)` (`core/markdown-editor/MarkdownEditor.svelte:184-188`), and with no diff it replaces state (`:175-182`). A daily-log append becomes non-undoable.
- Hits: C ranks 2 and C:119 says "menu verbs want 2 first". V:129 says "the raw path already works", true for frontmatter only: `process` on a dirty background tab also needs `saveFileByPath` and `syncExternalContentToEditor`, in F:29 and absent from V:46. V's "new service beside `mod-vault.service.ts`" must also respect `src/tests/lib/raw-write-ratchet.test.ts`.
- Changes: add those two raw members, incubate in `mods:shared/`, promote when a menu verb actually loses an edit. Owner's "no new behavior for rare failures" points the same way.

**7. C's gate on Issue 12 for the sidebar section cannot be met as written.**
- Evidence: `.scratch/open-itens/issues/032-mod-errors-out-of-sentry.md:35`: JSC ignores `sourceURL`, and "Errors from a mod's own `setTimeout`, DOM listener or floating promise stay untagged". So Issue 12 does not cover the case C names. C's "first surface where mod DOM listeners run routinely" (C:98) is also false: hotkeys, habits, focus-timer and bulk-tag use `addEventListener` today.
- Changes: drop that half of the gate. Keep "the owner names the first panel". Issue 12 stays separate, with its re-triage.

**8. F 07, the editor seam, is the largest risk for something the owner never listed, and its "no fallback" claim is wrong.**
- Evidence: the owner's list has no editor item. F:129 says slash menus have no fallback. A mod holds the live view (`mod-app.service.ts:24`, `mods:shared/types.ts:29-37`), so a slash menu can spike with a DOM listener, `coordsAtPos` and `dispatch`. `EditorView.scrollIntoView` returns a `StateEffect` (`node_modules/@codemirror/view/dist/index.js:1387,8745-8747`) whose constructor has `appendConfig` (`node_modules/@codemirror/state/dist/index.js:2192`), so `view.constructor` can reach extensions on the active view. That is the open question at `sonnet-editor.md:176`. Spike only: not removable without a compartment, and saved per-tab states miss it.
- Seam facts that hold: `editorModeEffects` runs on revisit and mode change (`MarkdownEditor.svelte:239,657`, `setup/editor-extensions.ts:115-124`). `override` is one static array (`:142-145`). Each reconfigure rebuilds every block decorator (`extensions/live-preview/core/check-update-action.ts:21`), already paid on revisit, but a mod reload (`host:559-568`) adds two on the open note.
- Open: a `StateField` throw on the typing path. `replaceDoc`'s try/catch (`MarkdownEditor.svelte:189-199`) does not cover it. Owner uses meta-bind and tables daily, so that failure lands on them.
- Changes: F 07 moves to a gate on a kept spike. F decision 2's "recommend raw" becomes "defer". C's and V's rejection stands, with the raw spike as the honest answer to "what if I want it".

**9. F 05, the mod tab, is not "the only surface for ideas that do not fit a sidebar" (F:153).**
- Evidence: a note holding a ```` ```queryjs ```` block with `kb.view` gives full-width mod UI in a real tab with an error boundary (`plugins/queryjs/kb-api.ts:402-421`). It lacks `ctx` (`:414`), so a mod would publish a helper for it. `<dialog>` works too (`mods:mods/habits/src/habits.view.ts:151-165`).
- Cost: core edits to `editor.types.ts:12` and `layout.logic.ts:15-28`, an `app/EditorView.svelte:71-92` branch (a miss falls to `MarkdownEditor`), and `EditorTabs.svelte:69-77` for the icon, which F does not list. F's hot-reload story survives on paper. Grep found no tab persistence, which matches F's check and proves little.
- Changes: gated on a mod outgrowing those two. Out of F's top 6.

**10. F contradicts itself on layers and overloads Issue 02.**
- Evidence: F:19 says a registry goes in `core/` or `features/` only when a non-app file reads it, and F:161 repeats it. F:38 then puts the palette store in `features/command-palette`, read only by `app/commands.ts`. F:54 builds a `core/context-menu` store "because 14 needs core consumers", for its lowest-ranked Issue. Issue 02 also bundles `run.target`, `ctx.actions.run` and a kernel extraction.
- Changes: palette store in `plugins/mods`, as C and V (`scripts/import-graph.mjs:162`). Menu registry beside the features that read it. `run.target` moves to the menu Issue. `ctx.actions.run` is cut: raw `run()` covers macro mods.

**11. The hotkey dispatcher's semantics can be tested today, in one line, and C's dependency is partly false.**
- Evidence: the hotkeys mod chooses capture itself (`mods:mods/hotkeys/src/index.ts:17-18`). Flipping to bubble plus `if (e.defaultPrevented) return` tries C's rule with no brain change. `document` listeners run in registration order (`utils/keybindings.ts:72-76`). Native menus do not take these chords: only `CmdOrCtrl+,` and `CmdOrCtrl+Q` (`src-tauri/src/lib.rs:175,184`) and global `Ctrl+Alt+Cmd` (`src-tauri/src/quick_capture/shortcuts.rs:32,36`). `PRD.md:92` lists shadowing Cmd+S as the known worry, which bubble removes and V's M2 keeps.
- Hits: C Issue 5, F 08 (premature as brain Issues). V M2 is right on order, wrong to keep capture and `stopPropagation`. C's "3 blocked by 1" (C:56,119) is false: Issue 3 touches no Issue 1 store, only the same serial files. V:21 has it right.
- Changes: flip the mod first. M2 ships after the lazy reveal (finding 1). The dispatcher is gated on a second mod wanting a chord.

**12. "Note and folder" is the right first menu scope, but F 14 understates the rest and all three miss Kanban.**
- Evidence: 8 `ContextMenu.Root` sites: `EditorTabs`, `MarkdownEditor` (core), `KanbanCard`, `KanbanLane` (plugin), `CollectionView`, `NoteRowMenu`, `FilesNavigator`, `TypesNavigator`. `NoteRowMenu` has one consumer (`RailNoteList.svelte:821`). `CollectionView.svelte:517` is the view tab strip, not rows. F 14 sizes four surfaces "S to M" as "one more word", while `NoteActionBar.svelte:188-220` is a `DropdownMenu`, a second primitive, and it spans core and features. `KanbanCard.svelte:146-157` handles a wikilink card, and C:130's "a note-row item covers the verbs" does not hold there. Owner uses Kanban daily.
- Also: C:138 and V:148 reject the action bar for its per-keystroke derived (`NoteActionBar.svelte:56`), but a host `{#each}` over a `$state.raw` list is outside that derived. The conclusion still holds because the palette reaches the active note, though PRD P5 names the bar (`PRD.md:49`).
- Changes: split F 14 per surface. If a third menu surface is ever wanted, the Kanban card with a wikilink comes before tabs or the editor body.

**13. `addMenuItem` with its own `run` (C 3, V 04) contradicts PRD P5; F's field on the action is the right shape, with C's filter instead of `when`.**
- Evidence: `PRD.md:49`: later entry points "reuse the same actions". A separate item has no palette row and no chord, so a mod registers the verb twice. `when` is mod code on a right click for cosmetics, a run fails soft already (`mods:mods/portent/src/portent.service.ts:18-20`), and the one corrupting case is non-markdown rows (`NoteRowMenu.svelte:245-246`).
- Changes: `menu?: { on: ('note' | 'folder')[]; files?: 'markdown' | 'all' }` on `ModActionV1`, plus `run.target`. No `when` in v1. Additive later. Hits F:53, V:92.

**14. Remounting the sidebar section on each path change (C 7, V 06) runs mod code inside every tab switch.**
- Evidence: C:101, V:125. The effect flush is the tab switch's own, so a slow `mount` delays it, and each switch discards DOM state. `{#if rightSidebarShown}` also recreates the pane on Kanban and canvas trips (`AppShell.svelte:264`, `core/layout/layout.logic.ts:15-28`). `SidebarSection`'s `open` is owned by its parent (`core/layout/SidebarSection.svelte:29`), so C's "collapsed by default" re-collapses after those trips unless the host store keeps it.
- Changes: F's stable mount plus a subscription (F:44), using finding 3. Open state lives in the mods store. The watcher on `activeTabPath` is safe (finding 3), as all three claim.

**15. The status item is a one-mod cosmetic scheduled in all three.**
- Evidence: only `mods:mods/focus-timer/src/status-chip.ts:12-26` uses it, and it works. Hits: F 11, C 6, V 05.
- Changes: move the chip to `mods:shared/` for a second user. Brain Issue only when markup breaks it or a second mod wants it. It is S, so this is low stakes.

**16. Several "not verified" items are answered, which lowers perceived risk.**
- Palette to dialog: shipped in `app/commands.ts:317,324,330` after the close at `CommandPalette.svelte:29`. One E2E, no design risk.
- Menu to dialog: `NoteRowMenu.svelte:162-164` opens `IconPicker` with no tick or timer. Check `ctx.ui.prompt` focus with one E2E (its focus code differs, `ModDialogHost.svelte:40-44`).
- Prompt over a run view: bulk-tag does it today (`mods:mods/bulk-tag/src/bulk-tag.service.ts:45`).
- `.view` pickup: 3 to 12 s (`docs/agents/view-files.md:22`). Stale lists are expressible: `file.mtime`, `now()` (`help/documentation/12-collection.md:283,321`).
- String icon on a navigator: only `Rail.svelte:337` reads it, so Settings > Layout is unaffected (C:163).

## What survives

- **Hot paths are safe as designed.** Palette rows are built only when the list is read (`CommandPalette.svelte:16`, `AppOverlays.svelte:18`). One menu wraps the virtualized list and rows only set a target (`RailNoteList.svelte:821`, `NoteRow.svelte:67`). Push lists keep mod code out of `$derived`. The hotkey path exits before mod code unless a chord matches.
- **C's verdict holds:** `app/` is exempt (`import-graph.mjs:162`), so palette, status and sidebar need no core edit. The baseline stays 3 entries. `core/` is touched only by F 05, F 07, F 14.
- **Rules:** raw `renameItem`, `moveItem`, `deleteItem` go through `applyPathChange` (rule 6), and path consumers are isolated by try/catch (`core/filesystem/path-change.service.ts:176-182`). C's `process` policy mirrors `frontmatter-write.service.ts:131-140`. No Live Preview rule is touched outside F 07.
- **V's measure and lanes:** relay times match the ledger Log (`.scratch/vault-mods/ledger.md`). Raw or `shared/` first, contract later. M1's friction is real: `bundles.test.ts:9-11` uses `toEqual`, the README forbids edits (`mods:README.md:74`), and `capture-registrations.mjs:10-16` pins an old vault commit, so the baseline cannot be regenerated. New mods are not in the `it.each`, so only additions to existing mods go red. Decision A stays the owner's, since it loosens a check. `fakeCtx` is a literal typed `FakeCtx extends ModCtx` (`shared/test/fake-ctx.ts:26,142`).
- **F's thesis:** one action with many origins (subject to finding 13), lazy reveal, and the raw pack first.
- **C's limits 2, 4 and 6:** plain data in registries, identity unregister, zero registrations render today's UI. Also `files` as a filter, and opt-in `refreshIndexNow` (C:156).
- **Agreed rejections:** pull `resolve`, per-row callbacks, row decoration, mod sort, deep links (`PRD.md:90`), rebinding UI, before-save hook, crash guard, batch writes. No plan smuggles in core write-path behavior.
- **Sidebar over a property-row menu:** right answer to the owner's "properties panel" idea, with decision D (absent on Kanban and canvas) stated.
- **`ctx.ui.pick`:** survives. It removes real bugs in three mods, and no attack lowered it.

## Order this critique supports

1. **Day 0, mods repo:** M1 (decision A), hotkeys flip to bubble, `.view` recipe, chip into `shared/`.
2. **Raw pack (XS):** `addAfterSaveObserver`, `renameItem`, `moveItem`, `deleteItem`, `railRegistryStore`, `settingsStore`, `saveFileByPath`, `syncExternalContentToEditor`, `watch`.
3. **Palette rows plus lazy reveal (S).** Decide the unstable tier here (finding 4), since every later Issue depends on it.
4. **Menu on the action:** note rows and folders, `files`, `run.target` (M).
5. **`ctx.ui.pick` (S to M).** Then M2 configurable hotkeys in the mod.
6. **Sidebar section, stable mount (M),** gated on the owner naming a panel after V's M3.

**Spikes that replace Issues for now:** rail list, New X here, editor extension, note as a tab, bubble-phase chords.
**Gated, each on a kept spike or a second user:** `addList`, `process`, `ctx.on`, hotkey dispatcher, status item, mod tab, editor seam, more menu surfaces. Ledger 08 `ctx.http` stays independent.

## Not verified

- Plain-function components in the Rail and pane, and whether their DOM is removed on teardown.
- The `appendConfig` route through a `StateEffect` constructor at runtime, and what a `StateField` throw does to typing.
- How much the modal flash in finding 1 shows in practice for a run under one frame, and whether `focus-scope` always returns to the editor.
- Tab persistence beyond a grep. Native chords beyond the two files cited.
- Line cites into `draft-*.md` are to the versions on disk at this pass.
