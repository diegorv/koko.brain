# Issue 04 discovery: reload a mod when its files change

Builds on `work/02` (host, `folderEpochs`, `listDisabledMod`) and `work/05`.

## Files that change

- `src/lib/plugins/mods/mods.logic.ts`: `mapModChanges(paths, vaultPath)` returns `{ rediscover, folders }`; `isModCodePath(path, vaultPath)` (under `<vault>/_system/mods/`, not `.md` / `.markdown` / `.view`).
- `src/lib/plugins/mods/mods.store.svelte.ts`: `removeEntry(folder)`, for a deleted mod.
- `src/lib/plugins/mods/mods-host.service.ts`: `startModsHost` (`:360-379`) subscribes `onFileChange` (`core/filesystem/fs.watcher.ts:67`) right after its gate, before any await; `stopModsHost` (`:420-426`) unsubscribes and drops the per-folder runners. New `requestReload`, `reloadFolder`, `rediscoverMods`. `listDisabledMod` (`:331-348`) also checks the folder epoch, since a reload re-lists.
- `src/lib/app/lifecycle/watcher-handler.service.ts:36-39`: drop `isModCodePath` paths from `filePaths` (not `changedPaths`), so a mod-code-only batch takes the skip branch at `:44`.
- `docs/agents/indexing-watcher-rules.md` rule 4: name the exception.
- Tests: `mods.logic.test.ts`, `mods.store.test.ts`, `mods-host.service.test.ts`, `watcher-handler.service.test.ts`; E2E `e2e/specs/vault-mods.spec.ts`.

## Plan

1. Logic + store + tests (node). 2. Host reload + jsdom tests (mock `fs.watcher.js`'s `onFileChange` only to capture the listener; paths go through the real host). 3. Watcher-handler filter + tests, rule 4 text. 4. E2E.

Reload of folder F (`reloadFolder`): bump `folderEpochs[F]` (supersedes any other load of F still in flight: a start's, `enableMod`'s), unload the live F, then if `<F>/manifest.json` does not exist remove F's row (unload only); else `listDisabledMod` when F is switched off, else `loadMod`. Each folder has a `serializeWithRerun` runner. `requestReload` bumps the epoch too, synchronously, so a load still reading when a newer batch arrives drops (the generation counter of the Issue: the shared epoch, so it can never bypass a switch). Rediscover: list the folders on disk (none when the mods folder is gone) and request a reload for each of them plus every folder already listed or live.

## Prior art

- Gated loads: `mods-host.service.test.ts` "off then on while the files are still being read" (`readTextFile` gate).
- Watcher skip tests: `watcher-handler.service.test.ts:104-120`; incremental: `:202-226`.
- E2E event: `e2e/specs/collection-block.spec.ts:46`.

## Defaults taken

- The vault root is not an ancestor "inside the vault": a root-only path does not rediscover (it arrives for any top-level change).
- A single segment under the mods folder is a mod folder only when it has no `.` (`README.md`, `notes.txt` directly in the mods folder are ignored). A folder with a dot never has a valid id, so it only ever showed an error.
- "Folder or manifest gone": both checked as `exists(<F>/manifest.json)`; the row goes away and nothing is toasted.
- Host listener errors (`exists`/`readDir` failing) go to `error()` with tag `MODS`: a host failure, like `startModsHost`'s callers do.

## Risks

- A watcher path canonicalized away from the vault prefix (symlinked vault) never maps to a mod; same limitation as the FTS keys (`watcher-handler.service.test.ts:274`).
- Rediscover unloads and reloads every mod; it fires only when `_system` or the mods folder itself changes.
