# file card src/lib/plugins/queryjs/queryjs-ports.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/queryjs/queryjs-ports.ts ' codemap/files
file src/lib/plugins/queryjs/queryjs-ports.ts other L21 module src/lib/plugins/queryjs in1 t0
## imports
imp src/lib/plugins/queryjs/queryjs-ports.ts:1 -> src/lib/core/editor/editor.service.ts registerTabCloseListener
imp src/lib/plugins/queryjs/queryjs-ports.ts:2 -> src/lib/core/filesystem/note-change.service.ts registerContentInvalidationListener
imp src/lib/plugins/queryjs/queryjs-ports.ts:3 -> src/lib/plugins/queryjs/queryjs-block-widget.ts invalidateQueryjsCache
imp src/lib/plugins/queryjs/queryjs-ports.ts:4 -> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts queryjsSessionStore
## imported-by
imp src/lib/app/boot.ts:18 -> src/lib/plugins/queryjs/queryjs-ports.ts registerQueryjsBlockPorts
## reach
in2 src/lib/plugins/queryjs/queryjs-ports.ts 1 files in 1 modules: src/routes(1)
out2 src/lib/plugins/queryjs/queryjs-ports.ts 21 files in 9 modules: src/lib/utils(5) src/lib/core/editor(4) src/lib/core/markdown-editor(3) src/lib/plugins/queryjs(3) src/lib/core/vault(2) +4 modules
## symbols
sym src/lib/plugins/queryjs/queryjs-ports.ts:13 fn registerQueryjsBlockPorts(): () => void L9 | Wires the queryjs blocks' app-lifetime ports: a content change clears the cached results (`invalidateQueryjsCache`), and a closed tab drops its file's autoRun …
by src/lib/plugins/queryjs/queryjs-ports.ts:registerQueryjsBlockPorts <- src/lib/app/boot.ts:40 in registerAppPorts call
## calls
call src/lib/plugins/queryjs/queryjs-ports.ts:15 in registerQueryjsBlockPorts -> src/lib/core/filesystem/note-change.service.ts:registerContentInvalidationListener call
call src/lib/plugins/queryjs/queryjs-ports.ts:15 in registerQueryjsBlockPorts -> src/lib/plugins/queryjs/queryjs-block-widget.ts:invalidateQueryjsCache ref
call src/lib/plugins/queryjs/queryjs-ports.ts:16 in registerQueryjsBlockPorts -> src/lib/core/editor/editor.service.ts:registerTabCloseListener call
call src/lib/plugins/queryjs/queryjs-ports.ts:16 in registerQueryjsBlockPorts -> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:queryjsSessionStore.invalidatePath mcall
## effects
reg src/lib/plugins/queryjs/queryjs-ports.ts:15 src/lib/core/filesystem/note-change.service.ts:registerContentInvalidationListener in registerQueryjsBlockPorts args='queryjs-cache', invalidateQueryjsCache
reg src/lib/plugins/queryjs/queryjs-ports.ts:16 src/lib/core/editor/editor.service.ts:registerTabCloseListener in registerQueryjsBlockPorts args='queryjs-autorun', (path) => queryjsSessionStore.invalidatePath(path)
