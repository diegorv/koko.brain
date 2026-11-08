# Cluster data-api: ctx.vault.process, rename, delete, per-note metadata

Read-only analysis. Every file:line below was read in this session. Paths are under `src/lib` unless absolute. Indexing rules read: `docs/agents/indexing-watcher-rules.md` (rules 6, 8, 9, 12 apply).

## What the code does today (verified)

- `ctx.vault` has `read/exists/list/create/write` only (`plugins/mods/contract/mod-api.v1.ts:113-132`). Impl: `plugins/mods/mod-vault.service.ts:54-113`.
- `write` refuses any dirty tab (`mod-vault.service.ts:100-101`), writes with `create: false` (`:103`), calls `syncExternalContentToEditor(abs, content, true, 'none')` (`:105`), then `notifyAfterSave` (`:111`), except for mod code (`:108`).
- `syncExternalContentToEditor` (`core/editor/editor.service.ts:71-92`) patches the tab by path, works for ANY tab (active or background), bumps the CodeMirror signal only for the active tab. Background tabs never touch CodeMirror.
- The active-tab doc replace is a minimal diff with `Transaction.addToHistory.of(false)` and keeps the caret (`core/markdown-editor/MarkdownEditor.svelte:170-199`, `core/markdown-editor/doc-diff.logic.ts:25-30`). So it is NOT a whole-doc replace, and the user's undo history maps through it (`MarkdownEditor.svelte:153-157`).
- The core already has a tab-aware text writer: `updateNoteFrontmatter` (`core/frontmatter/frontmatter-write.service.ts:99-163`). Open tab (clean or dirty, active or not): base = `tab.content` (`:116-119`), patch via `syncExternalContentToEditor(..., false, 'none')` and `saveFileByPath` at once (`:131-140`). Closed note: read, check `exists`, restart once if a tab opened during the read (`:148`), `writeTextFile(create:false)` (`:153`), sync + `notifyAfterSave` (`:160-161`).
- Precedent for dirty tabs elsewhere: `link-updater.service.ts` uses `openTab.content` when dirty and writes it with the change (`:56-61` region read, sync at `:66`).
- Pending saves queue per path (`editor.service.ts:171-179`); `writeTab` returns `true` without writing for a virtual or clean tab (`:186-190`).
- Auto-save: 2 s debounce, `maxWait` 10 s (`editor.service.ts:227`); `saveDirtyTabs` saves every dirty tab, background included (`:206-219`). A dirty background tab is therefore transient (seconds), unless a save keeps failing (retry every 5 s, `:203-204`).
- Path changes: `renameItem(oldPath, newName)` (`core/filesystem/fs.service.ts:280`), `moveItem(source, targetDir)` (`:307`), `deleteItem(path, isDirectory=false)` (`:246`; moves to Trash), all through `applyPathChange` (`core/filesystem/path-change.service.ts:145`). It saves dirty tabs before a delete (`:156`), closes tabs before `diskOp` (`:159`), re-paths tabs after a rename (`:173`), re-keys Rust index and FTS/semantic rows (`:209`, `:222`). Rule 6 says path changes MUST go through it.
- `ctx.app` already exposes `updateNoteFrontmatter` (`mod-app.service.ts:50`), `editorStore`, `vaultStore`. Core lifecycle code calls `vaultStore.requestPromptIndexRefresh()` before `updateNoteFrontmatter` (`features/properties/lifecycle.service.ts:34`); that method only sets a flag so the next refresh skips the throttle (`core/vault/vault.store.svelte.ts:114`).

## Candidate 1: `ctx.vault.process(path, fn)`

**API sketch** (additive to `ModVaultV1`; sync `fn` like Obsidian's `vault.process`, `obsidian.d.ts:10382`):
```ts
/** Reads the note's current text (an open tab's text, unsaved edits included), applies `fn`, saves.
 *  `fn` must be pure and synchronous; it may run a second time when a tab opens during the read.
 *  Resolves to the saved text. Rejects: missing note, `fn` throws, save failed. Never rejects for dirty tabs. */
process: (path: string, fn: (text: string) => string) => Promise<string>;
```

**Policy (the exact answer to the question), no new core behavior:**

| State of the note | What process does | Why |
|---|---|---|
| No tab | `readTextFile`, `fn`, `exists`, restart once if a tab appeared (as `frontmatter-write.service.ts:143-148`), `writeTextFile(create:false)`, `syncExternalContentToEditor(...,true,'none')`, `notifyAfterSave` | Same as `write` (`mod-vault.service.ts:103-111`) and the frontmatter closed branch. Mod code path skips `notifyAfterSave` like `write` (`:108`). |
| Clean tab, active or background | `fn(tab.content)` with no await before the sync; `syncExternalContentToEditor(abs, next, false, 'none')`; `await saveFileByPath(abs)` | Identical to the tab branch of `updateNoteFrontmatter` (`:131-140`). Active tab: minimal diff, caret kept, undo mapped. Background: store only. |
| Dirty active tab | Same call as clean. `fn` sees the user's unsaved text; result is saved with it | Matches `updateNoteFrontmatter` and link-updater. The user's edits would be autosaved within 2-10 s anyway. No CodeMirror access from the mod host. |
| Dirty background tab | Same call. Transient (seconds), see above | Rejecting here is what forced the retry loop in `mods/one-on-one/src/one-on-one.service.ts:23-35` and the pre-check in `mods/tasks/src/tasks.service.ts:40`. |

So the three cases collapse to two: "a tab exists" (patch tab, save by path) and "no tab" (disk). Dirty state stops mattering. `write` keeps its refusal (frozen by `mod-vault.service.test.ts:241-253`); process is the new, safer path for read-modify-write.

**Failure of the save** (`saveFileByPath` returns false, toast already shown, `editor.service.ts:197-202`): reject with a plain `Error("save failed")` and leave the tab with the new text and dirty flag. No rollback (the frontmatter writer has one, `:137`; copying it is code for a rare failure). Closing the tab still prompts on dirty. State this limit once in the docs.

**Cost: M.** Files: `plugins/mods/mod-vault.service.ts` (new function next to `write`, ~35 lines), `contract/mod-api.v1.ts:113-132` (one member + docs), `src/tests/lib/plugins/mods/mod-vault.service.test.ts` (real `editorStore`, as the existing dirty test does), `mod-api-contract.test.ts` (freeze), `help/documentation/28-mods.md:200-210` table, ADR-0036 not needed. Imports `saveFileByPath`, `syncExternalContentToEditor`, `notifyAfterSave`: all already imported or in `core/editor` (plugins may import core).

**Layers:** hold. Only `plugins/mods` -> `core`. No registry needed. No change to `core/`. Alternative with a downside: generalize `updateNoteFrontmatter`'s `attempt()` into a text-level core function and build both on it. It removes the duplicated closed/open branching but edits a core write path the owner wants left alone; not recommended.

**Risks.**
- Hot path: none; runs only inside an action.
- Reentrancy: `fn` runs sync, so nothing interleaves between reading `tab.content` and the sync. After `await saveFileByPath`, the user may type; the save wrote an older snapshot and the tab stays dirty; autosave catches up. Fine.
- Unload: check `assertLive()` at entry and after each await before touching stores, as `write` does (`mod-vault.service.ts:98,104`). Process cannot be cancelled mid-save; same limit as `write`.
- Data: two mods calling process on one closed note race (last write wins). `frontmatter-write.service.ts:96-97` documents the same limit; the doc must say "serialize per path".
- Reactivity: after-save observers and applyNoteChange run through `notifyAfterSave` / `writeTab` (`editor.service.ts:195-196`), i.e. the unchanged save path (rule 6: save stays synchronous).
- Undo: the mod edit is NOT undoable with Cmd+Z (`addToHistory:false`). `shared/editor.ts:32` dispatches into history. Accept and document; it is the same as Properties panel edits.

**Removes:** `mods-src/shared/editor.ts:24-40` (`editNote`, the editorView/`text === tab.content` guard at `:25-30`, the `toVaultPath` round trip) and its raw `ctx.app.editorStore` use in four mods (verified by grep): `daily-log` (`daily-log.service.ts:2,15`), `focus-timer` (`focus.service.ts:2,21`), `one-on-one` (`one-on-one.service.ts:2,29,57,64,73`), `tasks` (`tasks.service.ts:2,13`). Also the retry loop `one-on-one.service.ts:23-35` and the duplicate dirty pre-check `tasks.service.ts:40-41`.

**Unlocks:** any text transform on an open note without CodeMirror knowledge; "append to daily note" as one call (`process(path, t => appendLines(t, [line]))`); idempotent report notes (`upsert.ts` pattern) that work while the note is open.

**Tier: A.** **Prototype as a mod first: partly.** `editNote` is that prototype and exists; it already proved the semantics. What it cannot prove: the saved-by-path branch (needs `syncExternalContentToEditor`/`saveFileByPath`, not on `MOD_APP`, `mod-app.service.ts:23-53`).

## Candidate 2: `ctx.vault.rename(from, to)` (rename and move)

**API sketch:**
```ts
/** Renames or moves a file or folder. Change the name OR the folder, not both in one call.
 *  Links to it are rewritten, open tabs follow. Rejects when `to` exists or `from` is missing. Resolves to `to`. */
rename: (from: string, to: string) => Promise<string>;
```
Implementation composes existing core calls, no new core code: same parent -> `renameItem(abs, basename(to))` (`fs.service.ts:280`); same basename -> `moveItem(abs, dirname(toAbs))` (`:307`); both differ -> reject `"rename or move, not both"`. Both already check `exists(target)` and throw `already exists` (`:283`, `:313`). The compound rename+move would be two path changes (not atomic), so the contract refuses it instead of faking it.

**Cost: M.** Files: `mod-vault.service.ts` (+~25 lines), `mod-api.v1.ts`, mods test (needs `renameItem` real over mocked tauri-fs, as the file's mocks at `mod-vault.service.test.ts:9-46`), docs. Layers hold (`core/filesystem` is core).

**Risks.** Path change is the one owner (rule 6): do not call `rename()` from `@tauri-apps/plugin-fs` directly, that skips link rewrite, index re-key and tab re-path. Dirty tab: handled (`updateTabAfterRenameOrMove`, `path-change.service.ts:173`; link rewrite uses tab content for dirty notes). A rename can touch many backlink files (`updateLinksAfterRename`, a link-updater pass over `get_backlinks_v2`): a mod loop renaming 500 notes triggers 500 rewrite passes; it is the same cost as the user doing it, but there is no pacing. Folder moves: `moveItem` needs an existing target folder; the contract has no `mkdir` (`create` makes folders only as a side effect, `mod-vault.service.ts:77-79`). Unload: `assertLive` before and after the await. Moving mod code or mod data (`_system/mods/`, `.kokobrain/`): mods run with full trust; do not add a guard (ADR-0036 trust model), but the watcher reloads mod code on change (rule 4), so a mod renaming its own files reloads itself.

**Removes:** nothing in the 12 mods today (grep: no mod renames files). The only users would be new mods (archive, "move to project", bulk re-file). Value is future freedom, not bug removal.

**Unlocks:** archive-by-move, "Send to type folder" from a note-row menu (needs the entry-point cluster), rename-by-rule experiments.

**Tier: B** (valuable, small, but no current mod needs it). **Prototype as a mod through raw ctx.app:** yes. Add `renameItem`/`moveItem` to `MOD_APP` (one line each, `mod-app.service.ts:23-53`; the file says "Adding a member is one line here") and try it, no contract change. That tests demand before freezing the contract.

## Candidate 3: `ctx.vault.delete(path)` (files only, to Trash)

**API sketch:**
```ts
/** Moves a NOTE or file to the vault Trash (recoverable). Folders are not supported. Open tabs close; a dirty tab is saved first. */
delete: (path: string) => Promise<void>;
```
Impl: `deleteItem(abs, false)` (`fs.service.ts:246`). Folders are left out on purpose: `deleteItem` needs `isDirectory` (`:246`, passes it to `moveToTrash`), the contract has no stat, and the plugin-fs mocks in tests only cover `exists/readDir`. A wrong flag on a folder would corrupt the Trash item. Rare for this owner; skip.

**Cost: S** (+~12 lines, contract, test, docs). Layers hold.

**Risks.** Pre-delete save of dirty tabs happens inside `applyPathChange` (`:156`), so the user's unsaved text lands in the Trash copy (correct). `PreDeleteSaveError` surfaces when the save fails (`fs.logic`): map it to a rejection. The active tab closes under the user: surprising when a mod deletes the note being read. Data: Trash is recoverable, so no `confirm` is needed in the contract; the mod decides. Unload: same guards.

**Removes:** nothing today. **Unlocks:** "clean up empty notes", report rotation. **Tier: B (lean C).** Ship only when a mod asks. **Prototype via raw `ctx.app`:** yes, same one-line `MOD_APP` addition.

## Candidate 4: per-note metadata, frontmatter update and read

Two members. Update is a promotion of what three mods already reach through `ctx.app`.

**API sketch** (note the contract must not import `Property`, `mod-api.v1.ts:9-10`, so use a plain record):
```ts
type ModFrontmatterV1 = Record<string, string | number | boolean | string[]>;
interface ModVaultV1 {
	/** Frontmatter as of now: an open tab's text if open (unsaved edits included), else the file. Not the index. */
	frontmatter: (path: string) => Promise<ModFrontmatterV1>;
	/** Rewrites frontmatter keeping the body and unsaved edits. `fn` must be pure. Rejects on frontmatter it cannot round-trip. */
	updateFrontmatter: (path: string, fn: (fm: ModFrontmatterV1) => ModFrontmatterV1) => Promise<void>;
}
```
`updateFrontmatter` wraps `updateNoteFrontmatter` (`frontmatter-write.service.ts:99`) and converts record <-> `Property[]` (`properties.types.ts`: `{key,value,type}`; type detection stays host-side). It also calls `vaultStore.requestPromptIndexRefresh()` first, as `lifecycle.service.ts:34` does, removing the mod-side timing hack. `frontmatter()` parses with `parseFrontmatterProperties` (already used at `frontmatter-write.service.ts:128`). Reading text instead of the index avoids the rule-12 lag (~2 s after a save, `indexing-watcher-rules.md:31`) that `ctx.kb()` has.

**Cost: M.** Files: `mod-vault.service.ts` (+~40), `mod-api.v1.ts`, tests, docs. `FrontmatterWriteError.reason` (`frontmatter-write.service.ts:30`) must map to readable messages: expose the host's message table (`:48-52`, `LOSSY_FRONTMATTER_MESSAGES`) so mods stop copying it (`mods/portent/src/portent.logic.ts:3-23` per the portent scout; not re-read by me). Layers hold (core to plugins/mods).

**Risks.** Data: the writer refuses comments, nested maps, anchors, duplicate keys (`mod-app.service.ts:46-49`); the contract must say so, since a mod loop over 500 notes will hit them. Purity: `fn` runs twice when a tab opens during a closed read (`frontmatter-write.service.ts:95-96`); document. Serialization per path (`:96-97`). Hot path: none. Bulk: see candidate 5. Reactivity: index updates through `notifyAfterSave`, unchanged.

**Removes:** raw `ctx.app.updateNoteFrontmatter` in `bulk-tag` (`bulk-tag.service.ts:87`), `inbox-triage` (`triage.service.ts:65`), `portent` (`portent.service.ts:24`); the `requestPromptIndexRefresh` call in portent (`portent.service.ts:22`, from scout; line not re-read); the hand-copied error table; the internal `Property[]` shape in `mods-src/shared/types.ts:8-13,68`.

**Unlocks:** property-driven experiments (status flip, "mark organized", tag edits) without learning the `Property[]` type; fresh reads for right-click or hotkey actions.

**Tier: A for `updateFrontmatter`** (three mods, existing writer, no new core behavior). **B for `frontmatter()`** (nice, but `ctx.kb()` plus the fresh `read` + a parser in the mod covers it). **Prototype via raw ctx.app:** already is (that is how the three mods run).

## Candidate 5: batch or paced writes (`ctx.vault.updateMany`)

**Sketch:** `batch: <T>(items: T[], fn: (item: T) => Promise<void>) => Promise<void>` with the host pacing to the index window. Cost L. Touches `app/tauri-listeners.service.ts:109,116,273` (refresh limits) or a new queue in the write path. `bulk-tag` copies those constants (`bulk-tag.service.ts:16-21`, per the bulk-tag scout, constants in tauri-listeners confirmed by that scout only; I did not read them).

Risk: a core write-path/pacing behavior. The owner rejected new core write-path behavior for rare failures, but 150+ note runs are routine only for one mod. **Tier: C.** Keep the mod-side pacing; revisit if a second bulk mod appears. Prototype: it already is a mod hack.

## Order and trade-offs for this cluster

1. **Candidate 4 `updateFrontmatter`** (A, M): no semantics to invent, three mods migrate the same day.
2. **Candidate 1 `process`** (A, M): biggest bug removal (four mods, one shared file, one retry loop). Decision needed from the owner: does a mod edit on an active tab have to be undoable? If yes, process must dispatch to CodeMirror like `editNote` (needs `editorView`, a heavier and more fragile path). Recommended: no.
3. **Candidate 2 `rename`** and **3 `delete`** (B): first as one-line `MOD_APP` additions to learn demand, freeze later.
4. **Candidate 5** (C): defer.

Process and `updateFrontmatter` can go in one Issue because they share the tab-aware pattern and tests; rename/delete in a second so a revert stays small.

## Refuted scout claims

- "Window to review: `mod-vault.service.ts:100-105` checks dirty state, awaits the write, then syncs" is real but small: the tab can become dirty during the `writeTextFile` await; `syncExternalContentToEditor(..., true)` (`:105`) then overwrites `tab.content` with the mod text and drops those keystrokes. Plausible from reading, NOT reproduced. It argues for process (tab-first, no await between read and patch) rather than a patch to `write`.
- "A whole-doc replace would rebuild every widget" (mods' `changedRange` comment, `shared/editor.ts:7-9`): not true of the core sync path, which diffs (`MarkdownEditor.svelte:170-199`). It is a reason the mod dispatches itself, not a limit of core.
- mod:habits claims 10 of 12 mods use `ctx.app`; another says 9 of 12. I did not recount; not used.
- ext scout: "`ctx.vault.create` does not reach after-save" is correct (`mod-vault.service.ts:84-90` runs `applyNoteChange` with source `create`, not `notifyAfterSave`); consistent with docs `28-mods.md:211`.
- mod:vault-health "health.service.ts:11 reads pages live": rule 12 (`:31`) supports a ~2 s stale snapshot; not tested here.
- mod:bulk-tag says `ctx.vault.list` non-recursive: confirmed (`mod-vault.service.ts:63-70`).
- mod:portent "tasks.service.ts duplicate dirty check": my sed overlap printed line 40 twice; the file has one check at `:40-41`. Refuted as a bug.

## Could not verify

- Whether `editorStore.updateContent` runs synchronously on every keystroke, i.e. whether `tab.content` always equals `view.state.doc` (the mod guard `shared/editor.ts:30` suggests it can differ). Process reads `tab.content` and relies on the replace diff, so a lag would make `fn` see text a few ms old, and the replace could drop a keystroke. Needs a test with a live view.
- Behavior of `syncExternalContentToEditor` on tabs with `fileType` canvas, kanban, collection (`editor.types.ts:11`): their components may hold their own state. Restrict process to `.md` until tested.
- That `moveItem` fails cleanly when the target folder is missing (error text and tree state not read).
- Rename cost with many backlinks (no measurement).
- `deleteItem` on a folder with `isDirectory=false` (I read the signature, not `moveToTrash` internals past `:60`).
- Nothing was run or built; all semantics come from reading code, not from tests.
