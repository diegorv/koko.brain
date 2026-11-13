# module card src/routes
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/routes ' codemap/modules
module src/routes routes files 5 in-modules 0 out-modules 13 pub 0/5 ipc 2/0 card ~0.6k
## neighbors
dep src/routes -> src/lib/app 7
dep src/routes -> src/lib/components 1
dep src/routes -> src/lib/contracts 2
dep src/routes -> src/lib/core/editor 2
dep src/routes -> src/lib/core/frontmatter 1
dep src/routes -> src/lib/core/settings 3
dep src/routes -> src/lib/core/vault 3
dep src/routes -> src/lib/features/backlinks 2
dep src/routes -> src/lib/features/deep-link 1
dep src/routes -> src/lib/features/outgoing-links 1
dep src/routes -> src/lib/features/search 2
dep src/routes -> src/lib/plugins/quick-capture 3
dep src/routes -> src/lib/utils 2
in2 src/routes 0 modules: -
out2 src/routes 32 modules: src/lib/core/filesystem(17) src/lib/features/rail-shell(13) src/lib/features/type-definitions(9) src/lib/core/markdown-editor(8) src/lib/features/properties(7) +27 modules
## files
file src/routes/(app)/+layout.svelte component L187 module src/routes in0 t0
file src/routes/(app)/+page.svelte component L72 module src/routes in0 t0
file src/routes/+layout.svelte component L7 module src/routes in0 t0
file src/routes/+layout.ts other L5 module src/routes in0 t0
file src/routes/composer/+page.svelte component L318 module src/routes in0 t1
## effects
fx-count dom.keydown 1
fx-count dom.storage 1
fx-count storage.getItem 1
fx-count storage.removeItem 1
fx-count storage.setItem 1
fx-count svelte.$effect 13
fx-count timer.queueMicrotask 1
fx-count timer.setTimeout 5
ipc-count ipc:dismiss_composer 1
ipc-count ipc:submit_composer_capture 1
## debt
-
