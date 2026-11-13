# module card src/lib/plugins/queryjs
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/plugins/queryjs ' codemap/modules
module src/lib/plugins/queryjs plugins files 14 in-modules 2 out-modules 10 pub 6/78 ipc 0/0 card ~1.6k
## neighbors
dep src/lib/app -> src/lib/plugins/queryjs 4
dep src/lib/plugins/mods -> src/lib/plugins/queryjs 3
dep src/lib/plugins/queryjs -> src/lib/components 2
dep src/lib/plugins/queryjs -> src/lib/core/editor 3
dep src/lib/plugins/queryjs -> src/lib/core/filesystem 4
dep src/lib/plugins/queryjs -> src/lib/core/markdown-editor 2
dep src/lib/plugins/queryjs -> src/lib/core/settings 4
dep src/lib/plugins/queryjs -> src/lib/core/vault 2
dep src/lib/plugins/queryjs -> src/lib/features/collection 3
dep src/lib/plugins/queryjs -> src/lib/features/type-definitions 1
dep src/lib/plugins/queryjs -> src/lib/types 2
dep src/lib/plugins/queryjs -> src/lib/utils 8
in2 src/lib/plugins/queryjs 1 modules: src/routes(2)
out2 src/lib/plugins/queryjs 2 modules: src/lib/contracts(5) src/lib/features/file-icons(1)
## entry files
entry src/lib/plugins/queryjs/kb-api.ts ext-in2 src/lib/plugins/mods/mod-app.service.ts src/lib/plugins/mods/mods-host.service.ts
entry src/lib/plugins/queryjs/QueryjsSection.svelte ext-in1 src/lib/app/SettingsPanel.svelte
entry src/lib/plugins/queryjs/queryjs-block-widget.ts ext-in1 src/lib/app/editor-host.ts
entry src/lib/plugins/queryjs/queryjs-ports.ts ext-in1 src/lib/app/boot.ts
entry src/lib/plugins/queryjs/queryjs-session.store.svelte.ts ext-in1 src/lib/app/lifecycle/app-lifecycle.service.ts
entry src/lib/plugins/queryjs/queryjs.service.ts ext-in1 src/lib/plugins/mods/mod-app.service.ts
## files
file src/lib/plugins/queryjs/QueryjsSection.svelte component L80 module src/lib/plugins/queryjs in1 t1
file src/lib/plugins/queryjs/contract/kb-api.v1.ts other L739 module src/lib/plugins/queryjs in6 t0 | QueryJS scripting API, contract version 1: the public surface user scripts see as `kb` / `dv` (ADR-0010 amendment 2026-11-01).
file src/lib/plugins/queryjs/data-array.ts other L358 module src/lib/plugins/queryjs in2 t5
file src/lib/plugins/queryjs/kb-api.ts other L556 module src/lib/plugins/queryjs in3 t6
file src/lib/plugins/queryjs/kb-datetime.ts other L231 module src/lib/plugins/queryjs in3 t5
file src/lib/plugins/queryjs/kb-ui.ts other L1069 module src/lib/plugins/queryjs in1 t2
file src/lib/plugins/queryjs/kb-ui.types.ts types L23 module src/lib/plugins/queryjs in1 t0
file src/lib/plugins/queryjs/queryjs-block-widget.ts other L337 module src/lib/plugins/queryjs in2 t5
file src/lib/plugins/queryjs/queryjs-charts.ts other L31 module src/lib/plugins/queryjs in3 t3 | Chart.js instances created by `kb.ui.chart()`, by canvas.
file src/lib/plugins/queryjs/queryjs-ports.ts other L21 module src/lib/plugins/queryjs in1 t0
file src/lib/plugins/queryjs/queryjs-session.store.svelte.ts store L157 module src/lib/plugins/queryjs in4 t4 | Session-scoped state for the QueryJS execution model (Phase 12 of the Híbrido D refactor).
file src/lib/plugins/queryjs/queryjs.logic.ts logic L218 module src/lib/plugins/queryjs in1 t3
file src/lib/plugins/queryjs/queryjs.service.ts service L6 module src/lib/plugins/queryjs in2 t1
file src/lib/plugins/queryjs/queryjs.types.ts types L9 module src/lib/plugins/queryjs in3 t0
## public
sym src/lib/plugins/queryjs/QueryjsSection.svelte:1 component QueryjsSection L80
sym src/lib/plugins/queryjs/kb-api.ts:55 class KBAPI L486 | QueryJS API object.
sym src/lib/plugins/queryjs/queryjs-block-widget.ts:332 const queryjsBlockRenderer: FencedBlockRenderer L6 | Renders `` ```queryjs `` blocks; the app installs it in the editor's `fencedBlockRenderers`.
sym src/lib/plugins/queryjs/queryjs-ports.ts:13 fn registerQueryjsBlockPorts(): () => void L9 | Wires the queryjs blocks' app-lifetime ports: a content change clears the cached results (`invalidateQueryjsCache`), and a closed tab drops its file's autoRun …
sym src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:63 store queryjsSessionStore L95
sym src/lib/plugins/queryjs/queryjs.service.ts:4 fn loadExternalScript(absolutePath: string): Promise<string> L3 | Loads a .js script file from the vault
## stores
store src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:63 queryjsSessionStore esc:0
## effects
fx-count dom.mousedown 3
fx-count tauri-fs.readTextFile 1
fx-count timer.requestAnimationFrame 1
fx-count timer.setTimeout 1
## debt
-
