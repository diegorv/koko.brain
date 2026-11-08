# S02: The kb.* API surface (QueryJS)

## Answer

The `kb` / `dv` object is `KBAPI` (`src/lib/plugins/queryjs/kb-api.ts:55`), typed by the hand-written contract `contract/kb-api.v1.ts` (`KBApiV1`, lines 646-704). It has 22 methods and 2 readonly members. Almost all of them are pure reads of an in-memory snapshot or DOM writes into the block's own container. Only one member touches the vault filesystem: `kb.view(scriptPath, input)`, which reads a `.js` file with Tauri `readTextFile` and runs it with `new Function` (no sandbox). No QueryJS code calls a write API, `invoke`, `fetch`, or browser storage directly. The one real capability gap is that `kb.view` executes arbitrary JavaScript with full access to the webview globals, so "what it can reach" is bounded only by the webview's global state and the Tauri capability/CSP configuration, not by the kb API itself.

Counts: `KBApiV1` = 22 methods + `version` + `container`; `KBUIV1` = 11 methods (contract 608-641); `DataArrayV1` = 39 members (contract 212-293); `KBDateTimeV1` = 18 members (contract 165-202).

## Inventory

Legend: R = reads in-memory index/snapshot, P = pure computation, D = writes DOM into `container`, F = filesystem read, X = executes code.

| Member | Kind | Reach | Evidence |
|---|---|---|---|
| `version` (1), `container` | prop | none | kb-api.ts:57, :60 |
| `pages(source?)` | R | page snapshot (`ensureCache`) | kb-api.ts:118-131 |
| `pagePaths(source?)` | R | same as `pages` | kb-api.ts:134-136 |
| `current()` | R | page snapshot, keyed by block file path | kb-api.ts:139-141 |
| `page(path)` | R | page snapshot by path | kb-api.ts:144-146 |
| `ui` (getter) | D | builds `KBUI` on container | kb-api.ts:149-154 |
| `date(input?)` | P | KBDateTime from input | kb-api.ts:159-161 |
| `tryDate(value)` | P | | kb-api.ts:169-171 |
| `getDaysInRange(start,end)` | P | | kb-api.ts:178-194 |
| `array(raw)` | P | | kb-api.ts:197-201 |
| `isArray(raw)` | P | | kb-api.ts:204-206 |
| `fileLink(path, embed?, display?)` | P | builds link object | kb-api.ts:209-213 |
| `compare`, `equal`, `number` | P | | kb-api.ts:216-233 |
| `progressBar(value,max)` | P | string only | kb-api.ts:240-243 |
| `el(tag,text?,opts?)` | D | appends element to container | kb-api.ts:251-274 |
| `paragraph`, `header`, `span` | D | | kb-api.ts:277-296 |
| `list`, `table`, `taskList` | D | | kb-api.ts:299-367 |
| `view(scriptPath, input?)` | F + X | reads `<vault>/<path>.js`, runs it | kb-api.ts:381-385, :401-421 |
| `ui.cards/progressBar/heatmap/tagCloud/tags/statusCards/timeline/table` | D or P | DOM only | kb-ui.ts:107-520 (methods listed by grep) |
| `ui.chart(type, opts)` | D + dynamic import | lazy-loads bundled `chart.js/auto` | kb-ui.ts:561, :917-920 |
| `ui.heatmapCalendar`, `ui.yearlyCalendar` | D | | kb-ui.ts:~680-1000 |

Internal, not on the contract: `awaitAllPending()` (kb-api.ts:394, public on the class but not in `KBApiV1`), `ensureCache()` (kb-api.ts:431), `renderValue()` (kb-api.ts:488). Link clicks inside rendered output call `openFileInEditor(link.path)` (kb-api.ts:506-511), which is a UI action that opens a file in the editor.

DataArray (`data-array.ts`): all chain and aggregate methods are pure over `_values`. `mutate(fn)` (data-array.ts:187-193) runs `fn` on the items in memory. Since page objects are shared across blocks at one index state (kb-api.ts:34-36), a `mutate` or `p.file.tags.push` changes shared in-memory page objects, not the vault file. The Proxy (data-array.ts:16-35) maps any unknown property name across items, so `pages.status` reads frontmatter. No DataArray method performs I/O.

KBDateTime (`kb-datetime.ts`): pure wrapper over dayjs (line 1) and native Date. `plus`/`minus`/`startOf`/`endOf`/`toFormat` do not touch the vault.

Contract file (`contract/kb-api.v1.ts`): types only, imports nothing (lines 1-27, self-declared rule).

## Evidence

- `kb-api.ts:55-106`: class fields include `vaultPath`, `systemFolder`, `loadScript` (injected), and the entries/property-index snapshots. The constructor is internal (contract comment at `contract/kb-api.v1.ts:16-21`).
- `kb-api.ts:413-414`: `new Function('kb', 'dv', 'input', wrappedCode)` then `fn(this, this, input)`. Code without `await` runs unwrapped; code with `await` is wrapped in an async IIFE (kb-api.ts:409-412).
- `kb-api.ts:526-538`: `resolveScriptPath` appends `.js`, prefixes `vaultPath`, collapses `//`, and throws on any `..` substring. It does not check symlinks (INFERRED from the code; not tested).
- `kb-api.ts:415-420`: errors from view/run are caught and rendered inline; they do not propagate.
- `queryjs.service.ts:1-6`: `loadExternalScript` = Tauri `readTextFile(absolutePath)` from `@tauri-apps/plugin-fs`. This is the only filesystem call in the queryjs folder.
- `queryjs-block-widget.ts:243-256`: builds `KBAPI` with `entries` from `getVaultEntries()`, `propertyIndex` and `version` from `collectionStore`, `vaultPath` from `vaultStore.path`, `systemFolder` from settings, and `loadScript: loadExternalScript`.
- `queryjs-block-widget.ts:136-142`: autorun policy from `settingsStore.queryjs.autoRunQueries`. Under an auto policy, scripts run without a click when a note is shown.
- `queryjs-ports.ts:13-21`: app-lifetime listeners (content invalidation, tab close) registered by the queryjs module. These are not reachable from scripts.
- `kb-ui.ts:917-920`: chart.js is loaded with a dynamic `import('chart.js/auto')` from the bundle, not from the network.
- `src-tauri/tauri.conf.json:29`: CSP `script-src 'self' 'unsafe-eval'` (needed for `new Function`); `connect-src` allows only ipc, api.todoist.com, huggingface.co, github.com, objects.githubusercontent.com and Sentry hosts. Scripts' direct `fetch` is limited to those hosts.
- `src-tauri/capabilities/default.json:66-81`: `fs:allow-read-text-file` scope is `$DOCUMENT/kokobrain-vaults/**` and `$HOME/kokobrain-vaults/**` (plus `.kokobrain`). A vault outside those folders would fail in `view()` with a read error (behaviour INFERRED from scope; not tested).
- `default.json:83-101`: `fs:allow-write-text-file` exists in the capability file but is not used by any queryjs code (grep, below).
- `default.json:224-233`: `http:allow-fetch` scope limited to todoist and a GitHub raw URL. Not used by queryjs.
- `help/documentation/13-queryjs.md:1119`: "QueryJS runs without a sandbox — you have full access to the DOM."
- Grep of `src/lib/plugins/queryjs/*.ts` and `*.svelte` for `invoke`, `fetch(`, `XMLHttpRequest`, `localStorage`, `sessionStorage`, `indexedDB`, `writeFile`, `innerHTML`: no matches (not found). `readTextFile` appears only in `queryjs.service.ts`.
- Grep for `openFileInEditor`, `settingsStore`, `vaultStore`, `editorStore`: used only in `kb-api.ts:511` (click handler) and in `queryjs-block-widget.ts` (wiring), not inside the API methods.

## Implications for vault mods

1. The only existing "run a vault script" path is `kb.view`. It already has the trust model a mod system would need to decide on: no sandbox, arbitrary JS, vault-relative path with `..` rejection, read-only file access through `readTextFile`. A mod loader would be the second such path, so the decision (sandbox or trusted-by-design) should be made once and shared.
2. Reusing `KBAPI` for mods would hand a mod the page/DataArray read surface and the DOM helpers, which are safe by themselves. The risk comes from the surrounding webview: `new Function` code can reach any global, including whatever Tauri exposes to the page (see Open questions). A mod-specific object (a narrow facade) is a better base than `kb` itself.
3. Writes do not exist in the current API. Vault mods that write files, or call MCP/HTTP/LLM services, need new capabilities. The existing fs write permission (`default.json:83`) and http scope (`default.json:224`) show what the app grants today, and the CSP `connect-src` (tauri.conf.json:29) blocks direct network calls from page JS to hosts outside its list.
4. Versioning: the contract comments (contract/kb-api.v1.ts:1-27, 23-26) say new members are additive and changes are major. A mod API would need the same policy if mods target it.
5. Page objects are shared in memory (kb-api.ts:34-36); a mod that mutates pages could corrupt another block's view. Mods should get copies or read-only views.
6. Auto-run policy (queryjs-block-widget.ts:136-142) runs scripts without a click. A mod that is opened by button only would not share that path.

## Open questions

- Does Tauri 2 expose `window.__TAURI_INTERNALS__.invoke` to page scripts in this build? `tauri.conf.json` has no `withGlobalTauri` key (grep returned nothing). If yes, `kb.view` code can call any plugin command allowed by the capability files, including `fs:allow-write-text-file`. Needs a check against Tauri 2 docs and a running build. Not verified here.
- Can `kb.view` load a script from a vault outside `kokobrain-vaults`? The read scope (default.json:66-81) suggests no. Not tested.
- Is there a test (`src/tests/lib/plugins/queryjs/kbapi-firewall.test.ts`, referenced at contract/kb-api.v1.ts:22) that enforces "no DTO in the API"? Only the reference was seen; the test file was not opened.
- The full kb-ui.ts method bodies were not read line by line; the DOM-only claim is based on the grep for side-effect calls plus method signatures.
- Whether scripts can reach `collectionStore` or settings stores through module imports: the bundle is not inspected, and `new Function` code cannot `import` bare specifiers, so this is INFERRED as not reachable directly.
