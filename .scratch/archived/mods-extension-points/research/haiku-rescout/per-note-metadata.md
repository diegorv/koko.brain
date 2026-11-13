## Where in code
- Mod entry point: `src/lib/plugins/mods/mods-host.service.ts:45` (`readonly kb: () => Promise<KBAPI>`), factory at `:120`, getter at `:366-368`.
- Factory: `src/lib/plugins/mods/mod-app.service.ts:65-79` `createModKb()` awaits `getVaultEntries()`, then returns a new `KBAPI` built from `collectionStore.propertyIndex`, `collectionStore.version`, `editorStore.activeTabPath`, and `settingsStore.templates.systemFolder`.
- Snapshot memo: `src/lib/core/vault/vault-entries.service.ts:27-38`, a `versionGated` wrapper over `get_all_vault_entries_v2`, keyed on `vaultStore.vaultIndexVersion`.
- KBAPI: `src/lib/plugins/queryjs/kb-api.ts:55` (class), `page(path)` and `current()` return `this.ensureCache().byPath.get(...)`, `pages()` uses the same cache.
- Page build: `kb-api.ts:430-485` (`ensureCache`, shared slot check at `:437`, build at `:445-483`).
- Pure helpers: `src/lib/plugins/queryjs/queryjs.logic.ts:47-63` (`buildReverseIndex`), `:71-80` (`resolveInlinks`), `:113-160` (`buildKBPage`; tags from `entry.tags` at `:121`, file fields at `:151-160`).
- Property index store: `src/lib/features/collection/collection.store.svelte.ts:26-55`. `updateRecord` and `removeRecord` copy the whole Map (`:40-46`) and bump `version`.
- Docs: `help/documentation/28-mods.md:378-411` (raw access, `ctx.kb()` described as "a new QueryJS kb object over a fresh snapshot").
- Tests that touch this: `src/tests/lib/plugins/mods/mods-host.service.test.ts`, `mod-api-contract.test.ts` (file names only; I did not read their contents).

## Existing seam (a registry or store, or hard-coded? how do built-ins add to it?)
- Hard-coded. There is no registry for per-note accessors. `ctx.kb` is a raw class instance, not a contract surface.
- The frozen contract `src/lib/plugins/queryjs/contract/kb-api.v1.ts` has `pages()` and `current()` in its docs (`:100`, `:653`, `:731`) but no `page(path)` entry, so a per-note lookup is not part of v1. `28-mods.md:380` says `app` and `kb` are unstable with no compatibility promise.
- Per-note data that exists today: `kb.page(path).file.{tags, inlinks, outlinks, tasks, size, mtime}` plus frontmatter spread onto the page root (`queryjs.logic.ts:151-167`). These are all reached through `await ctx.kb()` first, so the lookup is async at the entry point and sync after it.
- Rust already has per-note IPC commands (`get_backlinks_v2`, `get_outgoing_links_v2`, `get_all_tags_v2`, listed in `docs/agents/indexing-watcher-rules.md` rule 1). Those are async, so they cannot serve a sync accessor.

## What mods could do
- Read one note's tags, inlinks, outlinks and tasks synchronously once they hold a KBAPI: `const kb = await ctx.kb(); const p = kb.page(path);`.
- Read frontmatter for that note from the same page object.
- Get `current()` for the active tab without a path.
- Caveat: `resolveInlinks` matches by basename (`queryjs.logic.ts:76`, `getBasename(...).toLowerCase()`), so two notes with the same basename in different folders share inlinks. I read the code; I did not reproduce it.

## API sketch
```ts
// stable (v1 contract candidate), synchronous after one await
ctx.vault.note(path): { path, tags: string[], inlinks: string[], outlinks: string[],
                        tasks: {text, completed, line}[], props: Record<string, unknown> } | undefined
ctx.vault.noteFor?(...)  // not needed: current() is already in KBAPI
```
Backed by a per-index-version cache (see Cost). The DTO firewall rule (`docs/agents/indexing-watcher-rules.md` rule 12) means a new field needs a contract edit, additive is minor.

## Cost (S, M, L or XL, and why)
M.
- `ctx.kb()` per call: one `getVaultEntries()` (memo, no IPC while the version is unchanged). After a version bump that is not patched, it is one full `get_all_vault_entries_v2` IPC (`vault-entries.service.ts:36`, rule 12 in `indexing-watcher-rules.md`).
- First `page`/`current`/`pages` call per index state: O(N) full build. That is `buildReverseIndex` over every entry's outgoing links, `buildResolutionCache` over all paths, `buildKBPage` for every indexed file, then `excludeSystemFolder` and a filter (`kb-api.ts:445-483`). Cost is logged as `QJS-PROFILE ensureCache N=...`.
- A single-note lookup is therefore O(N) per version, not O(1). The per-note build still needs the reverse index and the resolution cache, which are whole-vault.
- The shared slot is keyed on entries array identity, `propertyIndexVersion`, and `systemFolder` (`kb-api.ts:437`). Each `ctx.kb()` creates a new KBAPI, so the per-instance `_pageSet` does not survive across calls. The shared slot does.
- Property-index writes copy the Map on every `updateRecord`/`removeRecord` (`collection.store.svelte.ts:40-46`), which is O(N) per write, and each write bumps the version that invalidates the page set.
- Making it M: keep the reverse index and resolution cache per version in one place, and expose a lookup that reads them. L if it must also be patched incrementally like `patchVaultEntries`.

## Risks (hot path, reactivity, layer rule, disposal on unload, data)
- Hot path: a mod that calls `ctx.kb()` per note inside a loop, or on every change, triggers a full rebuild per version bump. There is no guard against this in the contract.
- Reactivity: the entries snapshot is throttled (about 2 s after an isolated event, at most once per 10 s in a burst, per `vault-entries.service.ts` header and rule 12). A mod reading right after a save sees the previous snapshot. The contract has no subscription for note changes that I confirmed. `ctx.kb()` must be called again to see later changes (`28-mods.md:403`).
- Layer rule: `plugins/mods` importing `features/collection` and `plugins/queryjs` (`mod-app.service.ts:8, 12`) is allowed by the layer table. A new seam placed in `core/` must not import `plugins/`, so the per-version index would have to live in `core/vault` or `core/vault`-adjacent code, with no import of queryjs.
- Disposal: `ctx.kb()` throws `Mod "<id>" is unloaded` after unload or vault change (`mod-app.service.ts:66-68`, `mods-host.service.ts:93`). KBAPI objects already taken stay usable (`28-mods.md:380`), so a cached page object can outlive the mod. The KBAPI `container` is detached (`mod-app.service.ts:70`).
- Data: page objects are shared across all QueryJS blocks at one index state (`kb-api.ts` sharedPageSet comment). `mutate` and `p.file.tags.push` on a page written by a mod are seen by other blocks (per the code comment; I did not run it). A mod-facing per-note accessor should return copies.
- Trust: mods run in the main webview with no sandbox (task text); `kb.view()` runs `new Function` on vault scripts (`kb-api.ts` `runView`). This is existing behavior, not new.

## Bugs or complexity removed (say none if none)
- None confirmed. Possible issue: basename-keyed inlinks (`queryjs.logic.ts:76`) could merge same-named notes in different folders. Not reproduced.

## Could not verify
- Whether `collectionStore.updateRecord` runs on every keystroke or only on save. I did not trace its callers, so I do not know how often `propertyIndexVersion` bumps in practice.
- Whether `MOD_APP` (in `mod-app.service.ts`) exposes `collectionStore` or `getVaultEntries` directly to mods. The file imports both (`:6`, `:8`), but I did not read the `MOD_APP` map, so I do not know if mods can already read the property index without `ctx.kb()`.
- Rust cost of `get_backlinks_v2` and `get_all_vault_entries_v2` per call. Not read.
- The contents of the mods tests listed above.
- Did not run any code or tests (read-only task).
- On the user's question "how is the plan going, so many haikus already failed": I have no visibility into other runs or the plan's status. This report covers only this mapping task, and I did not inspect the `.scratch` plan or any workflow state.