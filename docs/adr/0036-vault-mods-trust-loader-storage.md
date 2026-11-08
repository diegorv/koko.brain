---
type: ADR
id: "0036"
title: "Vault mods: trust, loader and storage"
status: active
date: 2026-11-06
---

## Amendment (2026-11-06): a mod's data lives in `.kokobrain/mods/<id>/`

The Storage decision below still holds for a mod's code. Its data no longer belongs next to it. Habits kept `data.json` in `_system/mods/habits/`, the code folder, and a mod that reached `.kokobrain/` through `ctx.vault.write` would run the after-save path on every write (vault-wide invalidation, a file history row, an Auto Move timer), because the skip there only covers `isModCodePath`.

- **Decision:** `ctx.loadData()` and `ctx.saveData(value)`, an additive change to contract v1 with no `apiVersion` bump, read and write `<vault>/.kokobrain/mods/<id>/data.json` (`createModData`, `src/lib/plugins/mods/mod-vault.service.ts`). The rejected alternative below, hidden `.kokobrain/mods/`, was rejected for code because the watcher drops dot-folder events (`docs/agents/indexing-watcher-rules.md` rule 5). For data that is the point: nothing should react to a save.
- **Atomic writes:** the Rust command `write_mod_data` (`src-tauri/src/commands/vault.rs`) reuses `vault_fs::write_atomic`. It takes the vault, the id and the content and builds the path itself, with a fixed file name, instead of taking a path: `std::fs` is not covered by the plugin-fs ACL, and a general atomic write would be a way to overwrite any file from the webview, which `create_note` does not give (it refuses an existing file).
- **Reads:** the Rust command `read_mod_data` returns raw bytes, and `null` only on `NotFound`, because plugin-fs does neither. Its `exists` reports any error as false, and its `readTextFile` replaces bytes that are not UTF-8, so a load could resolve to "no data", or to altered data, and the next save would replace the real file.
- **Corrupt data:** `loadData` moves data that is not valid UTF-8 JSON to `data.corrupt-<timestamp>.json` with a rename and rejects with a `ModDataCorruptErrorV1`. The next load resolves to `null`.
- **A failed load blocks saves:** after a load that could not read or move the file, `saveData` refuses until a later load resolves or reports the file as corrupt, since the file may be the only copy. The block belongs to the mod instance, so a reload clears it. A mod that never calls `loadData` is not blocked: it has not asked what the file holds, so the first save replaces it.
- **Order:** one FIFO queue per mod instance, for loads and saves. A new instance after a reload has its own queue; the one write the old instance can have in flight is a single IPC, and queued ones reject when they reach the head of the queue. A file system call that never returns would hold that queue, and queued calls would stay pending, past the unload. `read_mod_data` runs off the main thread; `write_mod_data` runs on it, like `create_note`, so a very large value or a stalled disk freezes the window during a save.

Consequences:

- **The data leaves git where `.kokobrain/` is ignored.** Kokobrain does not write a `.gitignore`; the owner's vault lists `.kokobrain/`, so this data has no history there. The owner accepted this for Habits.
- **A crash is safe, a power cut is not guaranteed.** `write_atomic` does not `fsync` before the rename, so a process crash leaves the old or the new file, while an OS crash or power loss can leave a damaged one, which `loadData` then reports as corrupt. A stray `data.json.tmp-*` can remain after a crash; nothing reads it. `write_atomic` also gives the file default permissions on each write and replaces a symlinked `data.json`.
- **Not a containment boundary.** As in the Trust decision, a mod can still call any Tauri command. The manifest id goes into the path because it is validated, not because a mod could not write elsewhere; `write_mod_data` refuses an id that is not one path segment only to keep the command narrow. A symlink planted inside `.kokobrain/mods/` is followed for its folder, which is accepted: planting it already needs write access there, and only a file named `data.json` can result.
- **Deleting a mod folder leaves its data**, and a renamed mod id starts empty.

## Context

The owner wanted to extend Kokobrain from the vault, without an app release: small JavaScript programs that add rail buttons whose actions read and write notes, and later call HTTP APIs or run LLM agents (`.scratch/vault-mods/PRD.md`). Only the owner writes mods, and editing one must not need a restart.

Three constraints shaped the design:

- The webview CSP is `script-src 'self' 'unsafe-eval'` (`src-tauri/tauri.conf.json:29`). `import()` of a `blob:` or `asset:` URL is blocked, and a non-literal `import()` fails `src/tests/lib/architecture/layer-rules.test.ts:61` (ADR-0003). `'unsafe-eval'` already ships for QueryJS, which runs vault code with `new Function` (`src/lib/plugins/queryjs/kb-api.ts:414`, ADR-0010).
- Vault settings live inside the vault (`.kokobrain/settings.json`, ADR-0019), so they travel with a copied or cloned vault.
- The Rust watcher drops events under dot-folders (`docs/agents/indexing-watcher-rules.md` rule 5), so code in `.kokobrain/` would not reload on save.

## Decision

**A mod is one plain JavaScript file plus a manifest in `_system/mods/<id>/`, evaluated with `new Function` in the main webview with the app's full trust, and turned on per vault by a flag stored on this machine, not in the vault.**

- **Trust (PRD P4):** a mod runs in the main webview with every power the app's own code has: Tauri commands, stores, the DOM. No sandbox, no per-mod permission list, no consent prompt. `ctx` (`@kokobrain/mod-core/contract`, reexported by `src/lib/plugins/mods/contract/mod-api.v1.ts`; canonical source in the mods workspace, Git dependency adoption in `docs/MOD-CORE.md`) is a convenience and a stable contract, not a boundary; `assertVaultPath` (`src/lib/plugins/mods/mods.logic.ts:55-65`) catches typos, not attacks. Errors the host catches go to a toast and `debug('MOD:<id>')`, never Sentry (P9).
- **Flag (P1):** mods are off by default. The flag is a list of vault absolute paths in `localStorage` (`kokobrain:mods-enabled-vaults`, `src/lib/plugins/mods/mods-enabled.store.svelte.ts:12-16`), like recent vaults, and the per-mod switches sit next to it (`kokobrain:mods-disabled`, `:18-19`). Settings > Labs edits both; the change applies live (`startModsHost` / `stopModsHost`, `src/lib/plugins/mods/mods-host.service.ts:535, 603`).
- **Storage (P2):** mods live in the visible, fixed `_system/mods/` (`MODS_DIR`, `src/lib/plugins/mods/mods.logic.ts:4`), not under the `templates.systemFolder` setting and not in `.kokobrain/`. One folder per mod, named after `manifest.id`; `manifest.json` is validated by `parseModManifest` (`mods.logic.ts:100-139`). Saving `main.js` or `manifest.json` reloads that mod (`mapModChanges`, `mods.logic.ts:17-43`); a reload waits for the mod's live runs (P10, `waitForRuns`, `mods-host.service.ts:429-446`).
- **Loader (P3):** `evaluateModSource` (`mods.logic.ts:147-185`) reads `main.js` as text, requires exactly one top-level `export default`, rewrites it to an assignment to a holder parameter, and runs the result in strict mode through `new Function` with a `kokobrain-mods/<id>/main.js` sourceURL. Any other `import` or `export` is a syntax error, reworded as the one-file rule. The default export must be an object with `onload`.

## Alternatives considered

- **A Web Worker runtime with a message broker** (`.scratch/vault-mods/research/opus/D1-security.md` R3): clean unload, a real Stop for synchronous code, no UI freeze, and a place to enforce permissions later. Rejected by the owner for the MVP in favour of the main webview: the worker needs a CSP spike and a broker for every `ctx` member, and raw access to the app's objects (`ctx.app`) cannot cross into a worker. Revisit before mods from anyone else are run.
- **The flag in `.kokobrain/settings.json`**: one less store, and the flag travels with the vault. Rejected: a vault copied or cloned from elsewhere with the flag on would run its mods on open.
- **Hidden `.kokobrain/mods/`**: keeps mods out of the file tree. Rejected: the watcher drops dot-folder events, so reload on save would need new Rust or polling, and mods could not be edited in Kokobrain.
- **Real ES modules served by a custom URI scheme from Rust**: relative imports and several files per mod. Rejected for the MVP: a CSP change, an ADR-0003 exception for the dynamic `import()`, a module cache to bust on reload, and no E2E coverage of the scheme.

## Consequences

- **The loader depends on `'unsafe-eval'` in `src-tauri/tauri.conf.json:29`, as QueryJS does.** Removing it breaks both, and E2E stays green: Playwright runs the app in Chromium against the Vite dev server (`e2e/playwright.config.ts:19`), without the Tauri CSP. Only the real app shows the failure.
- A mod can do anything the app can, including any Tauri command: app commands have no ACL (`src-tauri/build.rs:23` builds without an app manifest). That is acceptable only while the owner writes every mod; shared or cloned vaults need the Worker runtime or a consent step first.
- A synchronous infinite loop in a mod freezes the app, and Stop cannot end it; Stop only aborts `run.signal`. The guide says so (`help/documentation/28-mods.md` § Limits).
- `export default` becomes an assignment, so `export default function foo() {}` binds no `foo` for the rest of the file; function and class default exports are rejected anyway. No `import`, one file per mod; a mod copies any helper it needs.
- WKWebView reports no file or line for code evaluated this way, so mod stack frames carry function names only (`help/documentation/28-mods.md` § Errors and logs).
- Moving or renaming a vault turns its mods off, since the flag is keyed by the absolute path.
- Revisit when a mod is to be run that the owner did not write, when `'unsafe-eval'` is to be dropped from the CSP, or when mods need several files.
