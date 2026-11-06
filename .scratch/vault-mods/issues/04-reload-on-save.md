# 04: Reload a mod when its files change, without a restart

**What to build:** with mods on, saving `main.js` or `manifest.json` reloads that mod: its old buttons and actions go away and the new code's take their place. A mod folder added or deleted while the app runs appears or disappears. A mod whose new code fails shows the error and the other mods keep working (owner decision).

- **Listener.** The host registers its own `onFileChange` listener (`src/lib/core/filesystem/fs.watcher.ts:67`) at start and unsubscribes at stop: `stopWatching` does not clear listeners (`fs.watcher.ts:291-304`). The listener sees self-saves too, which is what lets an in-app edit of `main.js` reload. Rust has already debounced by 500 ms; do not reuse the lifecycle's 300 ms debounce, which feeds `rebuildAllIndexes`.
- **Mapping (pure, in `mods.logic.ts`).** For each path under `<vault>/_system/mods/`:
  - the mods folder itself, or one of its ancestors inside the vault (`_system` renamed or moved can arrive as the parent path alone): rediscover everything;
  - a mod folder (a deletion often arrives as just the folder, because the Rust watcher collapses to the deepest paths, `src-tauri/src/vault/watcher.rs:103-115`), or a `manifest.json` / `main.js` directly inside one: reload that mod id;
  - anything else (a README, an editor backup like `main.js~`): ignore.
- **Reload** = unload (Issue 02), then load from disk. If the folder or manifest is gone, unload only. Serialize reloads per mod id with the existing `serializeWithRerun` (used at `src/lib/app/lifecycle/app-lifecycle.service.ts:486`), and drop a load that finishes after a newer one started (a generation counter). This Issue has no long runs yet (an action is simply awaited); Issue 06 makes a reload wait for the mod's live runs (PRD P10).
- **No full index rebuild for mod code.** Today a batch with a dotted basename and no Markdown runs the full rebuild (`src/lib/app/lifecycle/watcher-handler.service.ts:36-73`: `filePaths` keeps it, `mdPaths` at `:52` is empty, so `rebuildIndex` and the bulk builders run). Before that decision, drop paths under `<vault>/_system/mods/` that are not `.md`, `.markdown` or `.view` **from `filePaths`**, not from `changedPaths`: an empty `changedPaths` bypasses the skip guard at `:44` (`changedPaths.length > 0`) and runs the full rebuild. A batch made only of mod code then takes the existing skip branch. **Read `docs/agents/indexing-watcher-rules.md` first** (rule 4 governs this code) and update rule 4's text to name the exception.

**Blocked by:** 03

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, then `bash scripts/e2e.sh e2e/specs/vault-mods.spec.ts`.

- [ ] Failing tests first:
  - `mods.logic.test.ts`: the mapping for a file, a mod folder, the mods folder, `_system` itself, a README, a backup file, a path outside the folder, and a mixed batch.
  - `mods-host.service.test.ts`: a batch with a changed `main.js` swaps `mod:hello:main` for the new button; a broken new `main.js` leaves the mod in `error` with no button while another mod keeps its button; a deleted folder unloads; a new folder loads; two quick batches for one mod load it once with the newest code.
  - `watcher-handler.service.test.ts`: a batch of only mod `.js`/`.json` paths skips the rebuild; a batch with a mod `.js` and a note still updates the note incrementally (keep `watcher-handler.mixed-batch.test.ts` green).
  - E2E: `window.__e2e.fs.writeFile` a new `main.js` with a different button title, then `window.__e2e.events.emit('vault-files-changed', { paths: [...] })` (as in `e2e/specs/collection-block.spec.ts:46`), and assert the new title.

## Notes

- A `main.js` open in a tab: `reloadExternallyChangedTabs` skips dirty tabs (`src/lib/core/editor/editor.service.ts:428`). Not this Issue's concern beyond a manual check.
- **Size:** M.

## Comments
