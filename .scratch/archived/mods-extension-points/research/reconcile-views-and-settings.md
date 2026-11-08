## Verdict
CHANGES PLAN (small): one clause on declared-settings storage in section 5 row 16, and three corrections to EP-11. No ranking, order or schedule changes. Row 16 stays "Not scheduled" and EP-11 stays gated.

All paths are under `src/lib` unless they start with a repo folder. Read, not run.

## Verified changes

1. **Plan section 5, row 16 (line 207), "Declared settings in Labs".** The plan says nothing about where values live. The recovered `mod-settings.md` proposes storing them in `data.json` through the mod's own queue. That route is wrong, and the plan should say so, because row 16 is "first to revisit".
   - Read: `plugins/mods/mod-vault.service.ts:137-145` (the queue `inOrder` is a closure inside one ctx instance, and `assertLive` rejects after unload). A Labs form has no instance for a disabled mod, so it cannot share that queue without a refactor.
   - Read: `saveData` writes the whole file (`:184-199`). Habits' `parseState` rebuilds `{ habits, log }` only (`mods-src/mods/habits/src/habits.logic.ts:39-45`) and calls `saveData(next)` (`habits.view.ts:81`). Any foreign `settings` key in `data.json` is erased on the next toggle. A shared queue does not help: the mod holds a stale copy and the write is whole-file.
   - Read: `parseModManifest` copies named fields into a new object (`plugins/mods/mods.logic.ts:197-211`), so a manifest `settings` field is silently dropped until the parser handles it. The report's "unknown keys already ignored" is true but means the parser needs an edit.
   - Read: Labs flags already live in localStorage keyed by vault path (`plugins/mods/mods-enabled.store.svelte.ts:12-19`); `write_mod_data` is a fixed-name Rust command (`src-tauri/src/commands/vault.rs:1045`).
   - Proposed change: append to row 16's Why: "If revisited: manifest `settings` (the parser drops unknown fields today, `mods.logic.ts:197-211`), values in localStorage keyed by vault path and mod id like `mods-enabled.store.svelte.ts:12-19`. Not in `data.json`: one whole-file writer per mod (`mod-vault.service.ts:184-199`), and Habits' `parseState` rebuilds the object."

2. **Plan EP-11 (line 171), core edit list.** `core/markdown-editor/EditorTabs.svelte:69-77` is not needed, and the range is wrong (the chain runs 69-83).
   - Read: any `fileType` outside the five listed falls to `{:else if tabIcon}` at `EditorTabs.svelte:79-80`. `tabIcon` is the `fileTabIcon` snippet defined in `app/EditorView.svelte:55` and passed at `:66`. `app/` may import `plugins/mods`, so the mod icon branch goes in that snippet.
   - Proposed change: replace `core/markdown-editor/EditorTabs.svelte:69-77` with "none: the mod icon branch goes in the `fileTabIcon` snippet, `app/EditorView.svelte:55`". The core edits become `core/editor/editor.types.ts:12` and `core/layout/layout.logic.ts:15-28` only.

3. **Plan EP-11, why `fileType` and the layout edit are both required.** The plan lists both without a reason, so a later implementer could drop one as redundant.
   - Read: Properties, Backlinks, Outgoing links and Table of contents treat an undefined `fileType` as markdown (`features/properties/NoteInfo.svelte:15`, `PropertiesView.svelte:158`, `features/backlinks/BacklinksPanel.svelte:57`, `features/outgoing-links/OutgoingLinksPanel.svelte:53`, `plugins/table-of-contents/TableOfContentsPanel.svelte:41-42`). `isVirtualTab` is not what they check. So a mod tab needs a non-markdown `fileType` value (the union edit) and the layout edit that hides the right sidebar (`layout.logic.ts:15-28`, used at `app/AppShell.svelte:60`).
   - Proposed change: add "mod tab needs a non-markdown `fileType`, since the right-sidebar panels read it (`NoteInfo.svelte:15`, `BacklinksPanel.svelte:57`); `hidesRightSidebar` must cover the mod path prefix".

4. **Plan EP-11, Risk and Test lines.** Unload and close handling is missing. Only "a tab switch destroys the DOM" is stated.
   - Read: `closeTab` removes the tab and calls `notifyTabClosed` (`core/editor/editor.service.ts:303-331`); `registerTabCloseListener` exists (`:28`); the store's `removeTab` is at `core/editor/editor.store.svelte.ts:71`; `resetEditor` clears all tabs on vault change (`editor.service.ts:460-465`). Canvas and collection use `{#key editorStore.activeTab.path}` (`app/EditorView.svelte:83,88`).
   - Proposed change: add to EP-11 Scope or Risk: "unload closes the mod's tabs through `closeTab` and runs each mount cleanup; `resetEditor` must also run cleanups (use `registerTabCloseListener`); the mod branch uses `{#key path}` like canvas". Add to Test: "unload removes the tab and aborts the signal; vault change runs cleanup".

## Scout claims refuted
- `custom-tab-views.md`: "EditorTabs icon chain must change". Refuted by the `tabIcon` fallback (change 2), which the plan inherited.
- `custom-tab-views.md`: "the `fileType` decision repeats in four files, a registry would remove that". Overstated: `editor.logic.ts` only holds path constants and `isMarkdownNoteTab` (`:28-30`), and `app/` can render without a core registry (plan lines 23, 171).
- `custom-tab-views.md`: cost "M" with a core registry store. Not needed. `app/EditorView.svelte` reads a store owned by `plugins/mods`.
- `mod-settings.md`: values in `data.json` via the shared queue (change 1).
- `mod-settings.md`: "Labs can render the form for a disabled mod using `createModData`'s queue". The queue is per ctx instance and dies at unload (`mod-vault.service.ts:137-145`).
- `mod-settings.md`: `ctx.settings.get` async and `ModSettingsRow` inside `ModsStatusList`. Row location is fine (`ModsStatusList.svelte:45-76`), but it is design detail for an unscheduled item.

## Still unverified
- That no tab persistence exists. My grep for `openTabs`, `restoreTabs`, `persistTabs`, `lastOpenTabs` and `open_tabs` in `src/lib` and `src-tauri/src` returned nothing; names outside those, or a Rust-side store, are not excluded. It only matters for EP-11.
- `updateTabPath` not recomputing `fileType` (`editor.store.svelte.ts:121-127`, called only from `core/filesystem/link-updater.service.ts:99,105`). Whether a rename can change an extension was not traced. It is outside EP-11.
- Whether `resolveIconForPath` on a `__virtual__/mod/...` path is safe: it calls frontmatter and type lookups (`features/file-icons/icon-resolver.ts:64-77`). I did not read `resolveTypeIconForPath`. Virtual tabs already pass through it, but not with this prefix.
- Runtime behavior of everything above: nothing was built or run.
