# S03: kb.ui rendering helpers, modal/form capability, and HTML sanitization

## Answer

- **Modal or form: no helper exists.** `kb.ui` (`KBUIV1`) has 10 members: `cards`, `progressBar`, `heatmap`, `tagCloud`, `tags`, `statusCards`, `timeline`, `table`, `chart`, `heatmapCalendar`, `yearlyCalendar` (kb-api.v1.ts:607-650). None creates an overlay, dialog, input, or button for the user. Each method appends to the block's container (`this.container.appendChild`), and none accepts event handlers.
- **Input and button elements are reachable only through the generic DOM.** `kb.el(tag, text, {attr, cls})` (kb-api.ts:254) can create any tag, including `input`, `button` and `dialog`. Its options type exposes only `attr` and `cls` (kb-api.v1.ts:124-129). The returned element is a real `HTMLElement`, so user code can call `addEventListener` on it directly. That is a typed-contract limit, not a runtime one.
- **A true modal needs the DOM outside the block.** The script receives `kb.container` (the block container). Nothing in the contract lets a script attach to `document.body`. Runtime code runs via `new Function` with no sandbox (kb-api.ts:413, 552), so a script can reach `document` directly. This is INFERRED from the absence of any isolation, not from a test.
- **HTML sanitization applies to none of the kb.ui or kb.el output.** Every text path uses `textContent`, `String(...)`, or `cssText` interpolation. No `innerHTML`, `@html`, or DOMPurify call exists under `src/lib/plugins/queryjs/`. User HTML is therefore never parsed by QueryJS; there is nothing to sanitize there.
- **The sanitizer that exists is `sanitizeHtml`** in `src/lib/utils/sanitize.ts:7-31`, a DOMPurify allowlist used by the collection feature, not by QueryJS. It is not reachable from user scripts.
- **Script code is not sandboxed.** Scripts run as the same-origin page's JavaScript with full DOM access (see Evidence). The CSP allows `'unsafe-eval'` (tauri.conf.json:29), which `new Function` needs.

## Evidence

### kb.ui inventory (kb-ui.ts, kb-ui.types.ts, queryjs-charts.ts)

- `kb-ui.ts:84` class `KBUI implements KBUIV1`; `kb-ui.ts:86-88` holds `container` and a `renderValue` callback.
- `kb-ui.ts:107` `cards()`: builds divs with `style.cssText`. Card color goes through `resolveCardColor` (`kb-ui.ts:908-911`), which returns a preset from `COLOR_PRESET_BG` or the raw string. Text uses `textContent` (kb-ui.ts:123, 129, 134).
- `kb-ui.ts:148` `progressBar()`: returns a string, renders nothing.
- `kb-ui.ts:170` `heatmap()`: `cell.title = options.tooltip(item)` (kb-ui.ts:205); label and value via `textContent` (kb-ui.ts:210, 216).
- `kb-ui.ts:247` `tagCloud()`: `chip.textContent` (kb-ui.ts:282).
- `kb-ui.ts:295` `tags()`: `chip.textContent` (kb-ui.ts:307).
- `kb-ui.ts:319` `statusCards()`: `textContent` for title, subtitle, and status (kb-ui.ts:333, 339, 345). `c.border` is interpolated into `cssText` (kb-ui.ts:346).
- `kb-ui.ts:359` `timeline()`: `textContent` throughout (kb-ui.ts:369, 384, 390).
- `kb-ui.ts:411` `table()`: cells go through `this.renderValue` (kb-ui.ts:443). Pagination adds two real `<button>` elements with `onclick` handlers (kb-ui.ts:505-512, 526-539). This is the only interactive control in `kb.ui`, and it is internal.
- `kb-ui.ts:561` `chart()`: async. Creates a `<canvas>` and lazy-loads Chart.js via dynamic import (kb-ui.ts:917-920). On load failure it renders an inline error (kb-ui.ts:586-592). Registers the chart with `trackChart` (kb-ui.ts:672).
- `kb-ui.ts:682` `heatmapCalendar()` and `kb-ui.ts:813` `yearlyCalendar()`: `dataset.date` and `textContent = entry.content` (kb-ui.ts:754, 791, 796, 891). Colors come from palette arrays.
- `kb-ui.types.ts:1-23`: pure re-exports of the v1 option types from `contract/kb-api.v1`. No logic.
- `queryjs-charts.ts:16` a module-level `WeakMap<HTMLCanvasElement, DestroyableChart>`. `trackChart` (line 19) records a chart; `destroyChartsIn` (line 24) destroys charts for canvases under a root. Its purpose is disposal, not rendering or sanitization.
- Searched `kb-ui.ts` for `html`, `modal`, `form`, `input`, `dialog`: no matches.

### Generic DOM helpers in kb-api.ts

- `kb-api.ts:254` `el()`: `document.createElement(tag)`; text via `textContent` (line 259); `attr` via `setAttribute` (about 261-265); `cls` via `className` (about 267-269).
- `kb-api.v1.ts:124-129` `KBElOptionsV1` has only `attr` and `cls`.
- `kb-api.ts:282` `header()`, `kb-api.ts:294` `span()`, `kb-api.ts:299` `list()`, `kb-api.ts:360` `taskList()` (`textContent`, line 360).
- `kb-api.ts:488-521` `renderValue`: `textContent` for every value type. Link rendering uses `a.textContent` (kb-api.ts:503) and a `mousedown` listener (kb-api.ts:506).
- `kb-api.v1.ts:685-687`: `el` is typed to return `HTMLElementTagNameMap[K]`, so `input` and `dialog` are typed correctly.

### kb.view and script loading

- `kb-api.v1.ts` (`KBApiV1.view`, near line 720): "Loads `<vault>/<scriptPath>.js` and runs it with `kb`, `dv` and `input`. Errors render inline."
- `kb-api.ts:403-404` `runView` loads the script via the injected `loadScript` and wraps it.
- `kb-api.ts:413` `new Function('kb', 'dv', 'input', wrappedCode)`; `kb-api.ts:552` `runQueryjsBlock` uses the same constructor.
- `kb-api.ts:418` on error, writes `textContent` into `.cm-lp-qjs-error`.
- `kb-api.ts:526-534` `resolveScriptPath` appends `.js`, joins under `vaultPath`, and rejects `..` in the normalized path. This is a path guard, not a sandbox: the script body itself is unrestricted.

### Sanitization

- `src/lib/utils/sanitize.ts:1` imports `DOMPurify`.
- `sanitize.ts:7-31` `sanitizeHtml`: allowlist of tags (lines 9-19) and attributes (20-26), `ALLOW_DATA_ATTR: false` (27), `FORBID_TAGS` including script, iframe, form, input (28), `FORBID_ATTR` for common on* handlers (29). Note: `style` is an allowed attribute (line 21).
- `sanitize.ts:38-51` `sanitizeSvgContent`; `sanitize.ts:77-86` `sanitizeMermaidSvg`.
- Callers found: `src/lib/features/collection/CollectionTableView.svelte:74` (`{@html sanitizeHtml(value.html)}`); `src/lib/features/collection/collection-block-widget.ts:457` (`td.innerHTML = sanitizeHtml(value.html)`).
- Other DOMPurify calls with inline config: `src/lib/core/markdown-editor/extensions/live-preview/widgets/math-widget.ts:59` (default config); `.../widgets/code-block-widget.ts:115`.
- `src/lib/plugins/queryjs/` contains no `sanitize`, `innerHTML`, `outerHTML`, or `insertAdjacentHTML` (grep).

### Sandbox and CSP

- `src-tauri/tauri.conf.json:29`: `script-src 'self' 'unsafe-eval'`; `style-src 'self' 'unsafe-inline'`; `connect-src` allows `ipc:`, Todoist, HuggingFace, GitHub, Sentry hosts.
- No iframe, Worker, or sandbox is used for QueryJS (grep of `src/lib/plugins/queryjs` for `iframe`, `Worker(`, `sandbox`: only comments in `queryjs-block-widget.ts:85-121` and `queryjs-session.store.svelte.ts:14, 85`, which refer to preserving an iframe element, not isolating one).

### Existing UI primitives (not reachable from kb.ui)

- `src/lib/components/ui/` includes `dialog`, `input`, `button`, `select`, `popover`, `dropdown-menu` (directory listing).
- `src/lib/features/type-definitions/ViewDialog.svelte:167` uses `Dialog.Root`. These are Svelte components, imported by app code only. A QueryJS script cannot import them. INFERRED: no bridge exists.

## Implications for vault mods

- A mod that is a plain `.js` file in the vault could follow the `kb.view` precedent: load by path, run through `new Function`, and receive a `kb`-like object. Nothing in the current design isolates it, so a mod has the same power as the app's own code (INFERRED from kb-api.ts:413, no sandbox).
- To build a modal, a mod needs one of: (a) a new `kb.ui.modal` / `kb.ui.form` helper that builds the overlay with `textContent` and the existing shadcn look; (b) raw DOM via `kb.el` plus `document.body` (possible today, but outside the contract and not styled); or (c) a new host-provided API the mod calls, which would be the right boundary for a capability model. Option (c) is the one that makes permissions enforceable.
- HTML sanitization is not needed for `kb.ui` as shipped, because all of its output is text. It becomes necessary as soon as a mod returns HTML strings (for example, an LLM response). The reusable answer is `sanitizeHtml` in `src/lib/utils/sanitize.ts`, which is a DOMPurify allowlist and could be called from a host API. Note that `ALLOWED_ATTR` includes `style` and `href`/`src`, which can carry script-like or tracking payloads depending on the threat model (INFERRED; not tested).
- Mods that call MCP servers, HTTP APIs, or LLMs would run in the same origin as the app. The CSP `connect-src` list (tauri.conf.json:29) limits network origins for the webview. Whether `window.__TAURI_INTERNALS__` is reachable from a `new Function` body is INFERRED (same realm) and not verified here.
- The chart registry (`queryjs-charts.ts`) matters for mods: any chart a mod creates must be destroyed on unmount, or Chart.js keeps the canvas alive (queryjs-charts.ts:4-7).

## Open questions

1. Is there a Tauri capability or ACL that limits which `invoke` commands a webview script can call? Not checked here (src-tauri capabilities were out of scope).
2. Is `window.__TAURI_INTERNALS__` callable from a QueryJS script body? INFERRED yes; would need a runtime test.
3. Does the vault-mod design need a sandbox (iframe with `sandbox` attribute, or a Worker) for untrusted third-party mods, or is trusted-by-owner enough? This decides whether the sanitizer question is central or secondary.
4. Are there existing tests that pin `kb.el` attribute behavior or the absence of `innerHTML` in QueryJS? Not searched (out of scope for this read).
