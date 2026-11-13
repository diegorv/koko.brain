---
summary: "Renders queryjs fenced blocks in live preview and provides the kb scripting API that runs their scripts."
---

## Responsibility

Owns the queryjs fenced-block widget for the live-preview editor: it decides whether a block auto-runs or waits for a Run click, runs the block body against a KBAPI instance, caches rendered DOM per note and script text, and renders script errors. It also owns the kb and dv scripting surface (pages, DataArray, KBDateTime, kb.ui render helpers, kb.view for vault script files), the hand-written v1 contract that those classes implement, and the QueryJS settings section. It does not own the vault index (Rust and core/vault supply entries), the property index (features/collection), settings storage or the editor itself.

## Key files

- `src/lib/plugins/queryjs/queryjs-block-widget.ts`: CodeMirror widget for queryjs blocks: cache re-attach, auto-run policy, Run prompt, execution, structured error rendering and the queryjsBlockRenderer.
- `src/lib/plugins/queryjs/kb-api.ts`: KBAPI (the kb and dv object), the shared page set, kb.view and runQueryjsBlock.
- `src/lib/plugins/queryjs/queryjs-session.store.svelte.ts`: Result cache keyed by note path plus script text, and per-file first-open auto-run markers.
- `src/lib/plugins/queryjs/queryjs.logic.ts`: Maps PropertyIndexRecord and NoteEntryV2 to KBPage (buildKBPage), the reverse-link index and parseSource.
- `src/lib/plugins/queryjs/contract/kb-api.v1.ts`: The public scripting contract (kb.version 1). It imports nothing.
- `src/lib/plugins/queryjs/kb-ui.ts`: kb.ui render helpers: tables, lists, task lists, cards and Chart.js charts.
- `src/lib/plugins/queryjs/queryjs-ports.ts`: App-lifetime wiring: content-change invalidation and tab-close auto-run reset.
- `src/lib/plugins/queryjs/queryjs.service.ts`: loadExternalScript reads a vault .js file through the Tauri fs plugin.

## State

- queryjsSessionStore.resultCache: in-memory Map keyed by note path, a NUL character and the script text. Values are live HTMLElement references. Session only.
- queryjsSessionStore.autoRunOnFirstOpen: in-memory Set of note paths that have auto-run this session.
- sharedPageSet in kb-api.ts: single-slot module cache of the built page set.
- chartByCanvas WeakMap in queryjs-charts.ts: Chart.js instances per canvas.
- runningContainers WeakSet and pendingAutoRunMarks Set in queryjs-block-widget.ts.
- No persistent storage. Vault scripts are read from disk on each kb.view call.

## Collaborators

- `src/lib/core/vault`: getVaultEntries memoizes the get_all_vault_entries_v2 snapshot per index version. vaultStore supplies the vault path.
- `IPC:get_all_vault_entries_v2`: The entries snapshot read through getVaultEntries. The plugin does not call it directly.
- `src/lib/features/collection`: collectionStore supplies the property index, its version and readiness. buildKBPage maps PropertyIndexRecord into pages.
- `src/lib/features/type-definitions`: isListableNote and excludeSystemFolder decide which pages pages() lists.
- `src/lib/core/settings`: settingsStore.queryjs.autoRunQueries selects the run policy and templates.systemFolder filters the page list. QueryjsSection.svelte writes the policy and uses SettingItem from core/settings/sections.
- `src/lib/core/filesystem`: Wikilink resolution for outgoing links, isViewFile, and registerContentInvalidationListener in note-change.service.ts for cache clearing.
- `src/lib/core/editor`: activeTabPath for the widget, registerTabCloseListener for auto-run reset, and openFileInEditor for links clicked in script output.
- `src/lib/core/markdown-editor`: The FencedBlockRenderer type and profiling helpers. The widget is installed as a fenced block renderer.
- `src/lib/types`: NoteEntryV2, read only by kb-api.ts and queryjs.logic.ts.
- `src/lib/components/ui`: Button and select in QueryjsSection.svelte.
- `src/lib/utils`: clamp, color presets, font stacks, platform helpers, date setup and appendLog profiling lines.
- `src/lib/plugins/mods`: Consumer: mod-app.service.ts builds KBAPI for ctx.kb and uses loadExternalScript, and mods-host.service.ts uses the KBAPI type.
- `src/lib/app`: editor-host.ts adds queryjsBlockRenderer, boot.ts calls registerQueryjsBlockPorts, app-lifecycle.service.ts resets the session store and SettingsPanel.svelte mounts QueryjsSection.

## Subfolders

- `src/lib/plugins/queryjs/contract`: Hand-written v1 scripting contract (kb-api.v1.ts) that user scripts see and the KBAPI, KBUI, DataArray and KBDateTime classes implement. It imports nothing, so DTO changes cannot reach scripts.

## Gotchas

- Scripts run through new Function (runQueryjsBlock and kb.view) with the app's privileges. Block bodies and vault .js files are trusted user code.
- The result cache key is note path plus script text, because a shared script can read kb.current().
- Cached results hold live element references. A cached element is re-attached only when detached. A still-connected element belongs to another block, so the widget runs a fresh execution.
- Charts are destroyed when their result leaves the cache and is no longer connected. Dropping a result without that step keeps Chart.js instances alive.
- The first-open policy marks a file after the render pass ends, so all blocks in one pass auto-run. Manual mode never marks a file.
- clearResults keeps the auto-run markers. reset (settings Clear cache and vault teardown) clears them too.
- The shared page set is a single slot keyed on the entries array identity, collectionStore.version and the system folder. Page objects are shared across blocks, so a mutation in one block is visible to others.
- Failed runs are never cached and the error widget offers a retry.
- resolveScriptPath rejects any path containing '..' and prefixes the vault path to leading-slash paths.
- Contract rules (kb-api.v1.ts header): a new KBApiV1 or KBUIV1 member is additive, while removing or changing a member, or adding a DataArrayV1 member or a page-root key, is a major change that bumps version. No DTO may appear in the contract or a public KBAPI signature; src/tests/lib/plugins/queryjs/kbapi-firewall.test.ts enforces the DTO rule.
