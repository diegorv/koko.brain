## Verdict
CHANGES PLAN (small: 3 wording and doc fixes to EP-01, EP-06 and EP-08; no change to order, size, tier or gates).

Method: both recovered reports were read, then each point below was checked in code (read only). Nothing was run. Sonnet's `sonnet-data-api.md` conclusions hold where I re-read them (`process` tab-aware policy, `updateNoteFrontmatter` tab branch, `write` race).

## Verified changes

1. EP-01 (plan line 52, API list, and its `28-mods.md` docs row): `deleteItem` is a folder footgun as a raw member.
   - Read: `core/filesystem/fs.service.ts:246` signature `deleteItem(itemPath, isDirectory = false)` passes the flag to `moveToTrash(vaultPath, itemPath, isDirectory)` (`:255-257`); `core/trash/trash.service.ts:49-52` builds the trash item from it; `core/filesystem/path-change.service.ts:149-151` with an explicit `false` skips the child walk (`childPaths = []`), so a folder deleted with the default leaves its notes' index/FTS re-key to the watcher and is recorded in Trash as a file. Only `deleteItem` carries the flag (`path-change.service.ts:20-28`).
   - Neither the plan nor Sonnet's report covers raw use. Sonnet scoped the risk to the future contract member.
   - Change: in the EP-01 docs row for `deleteItem` say "pass `true` for a folder; the default `false` is for files and skips the child walk". Also list `renameItem` returns the new path and `moveItem` returns `null` when the item is already there (`fs.service.ts:307-310`, `:68-72` region), and both throw `already exists`.
   - Not an Issue-size change. Haiku's other delete claim ("`fs.service.ts:256-263` permanent `remove` when no vault is open") is real code but unreachable from a mod: `assertLive` requires `vaultStore.path === vaultPath` (`mods-host.service.ts:97-99`).

2. EP-06 risk bullet (plan line 159) and the EP-01 `watch` docs (line 56): add the cost of `ctx.kb()` inside a `watch(vaultIndexVersion)` handler. This is in `per-note-metadata.md` and absent from the plan.
   - Read: `plugins/queryjs/kb-api.ts:433-471`. `ensureCache` reuses a shared page set only when `entries` is the same array, `propertyIndexVersion` and `systemFolder` match; otherwise it rebuilds all pages (reverse index, resolution cache, `buildKBPage` per file) and logs `QJS-PROFILE ensureCache N=...`. `core/vault/vault-entries.service.ts:73-83` (`patchVaultEntries`) produces a new array through `patchEntriesSnapshot`, so every index bump invalidates the shared set. `features/collection/collection.store.svelte.ts:40-46` also bumps `version` on every `updateRecord`.
   - So "`watch` on `vaultIndexVersion` refreshes it" is O(notes) per bump when the refresh calls `ctx.kb()` (bumps are throttled to 2 s / 10 s, Indexing rule 12). QueryJS blocks pay the same cost, so it is a bound to state, not a blocker.
   - Change: one sentence in both places: "A handler that calls `ctx.kb()` rebuilds every page per index bump; coalesce, or read `ctx.app.vaultStore`/entries only when the list is on screen." This also qualifies section 7 item 6 (polling `vaultIndexVersion`).

3. EP-08 regression note (plan line 168): the undo description is wrong.
   - Plan says the external path "replaces state when there is no diff". Read `core/markdown-editor/MarkdownEditor.svelte:171-186` and `core/markdown-editor/doc-diff.logic.ts:25-29,41`: equal docs return `[]` (no state replace). The `setViewState(fresh)` branch runs only when `docDiff` returns `null`, i.e. more than `DOC_DIFF_MAX_EDITS = 400` line edits (`doc-diff.logic.ts:16`); that drops the note's WHOLE undo history, not just the mod's edit.
   - Change: replace "and replaces state when there is no diff" with "and drops the note's whole undo history when the edit is over 400 line edits (`doc-diff.logic.ts:16`)". The undo cost of a normal append is only that the mod's own edit is not undoable; the user's earlier undo events map through it (`MarkdownEditor.svelte:153-157` comment).
   - Same sentence: "`editNote`'s only refusal is a dirty background tab" is slightly off. `shared/editor.ts:26-35` falls to `ctx.vault.write` whenever the view is missing, disconnected or `text !== tab.content`, and `mod-vault.service.ts:100-101` then refuses a dirty ACTIVE tab too (for example a Kanban or canvas tab). Rare, wording only.

## Scout claims refuted
- vault-api-gaps: "Indexing rule 13 / rule 15" require `applyPathChange`. The file has 12 numbered rules; the path-change rule is rule 6 (`docs/agents/indexing-watcher-rules.md:13`). The plan's "rule 6" is right.
- vault-api-gaps: "process refuses a dirty tab, as `write` does". Not required: `updateNoteFrontmatter` shows a no-refusal tab branch (`frontmatter-write.service.ts:116-140`); the plan's EP-08 mirrors it. Refusing would keep the retry loops the plan wants gone.
- vault-api-gaps: "reading an open tab's unsaved buffer is not possible". It is, raw: `ctx.app.editorStore.tabs[].content` (`mod-app.service.ts:25`); `tasks.service.ts:39` and `one-on-one.service.ts:16,43` already do.
- vault-api-gaps: "`ctx.addFolderCreator/addTodaySection/addNavigator` wrappers needed": EP-01's raw `railRegistryStore` plus section 7 items 10-11 already cover them as spikes.
- per-note-metadata: "`ctx.vault.note(path)` stable sync accessor, cost M". Rejected: the lookup needs the whole-vault reverse index and resolution cache (`kb-api.ts:445-483`), so it is O(N) per version, not a cheap seam; `ctx.kb().page(path)` already serves it, and the plan correctly adds no member.
- per-note-metadata: "`MOD_APP` may expose `collectionStore`/`getVaultEntries`": it does not (`mod-app.service.ts:23-53`, 12 members, neither present).
- per-note-metadata: inlinks merge same-basename notes: true (`queryjs.logic.ts:47-63,71-80` key by lower-case basename), but that mirrors wikilink resolution and touches no EP.

## Still unverified
- Recursive `ctx.vault.list` and binary read/write (vault-api-gaps): real gaps (`mod-vault.service.ts:63-70` lists one level; no binary member), but no scheduled EP or current mod needs them; a recursive walk is a few lines in `mods:shared/`. I did not read `mods:` tests or search for demand.
- Whether `tab.content` can lag `view.state.doc` on a keystroke (Sonnet's open point); needs a live view test.
- Whether `syncExternalContentToEditor` is safe on canvas/kanban/collection tabs (`editor.types.ts:11`); relevant to EP-08 only.
- Rename-after-unload: `applyPathChange` has no live check after `diskOp` (read `path-change.service.ts:145-236` only as far as `:165`).
- `moveItem` into a missing folder; cost of `updateLinksAfterRename` on many backlinks; Rust costs. Nothing was built or run.
