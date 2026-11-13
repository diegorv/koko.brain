# module card src/lib/plugins/table-of-contents
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/plugins/table-of-contents ' codemap/modules
module src/lib/plugins/table-of-contents plugins files 5 in-modules 1 out-modules 5 pub 2/7 ipc 0/0 card ~0.8k
## neighbors
dep src/lib/app -> src/lib/plugins/table-of-contents 2
dep src/lib/plugins/table-of-contents -> src/lib/components 1
dep src/lib/plugins/table-of-contents -> src/lib/core/editor 2
dep src/lib/plugins/table-of-contents -> src/lib/core/layout 1
dep src/lib/plugins/table-of-contents -> src/lib/core/markdown-editor 1
dep src/lib/plugins/table-of-contents -> src/lib/core/settings 1
in2 src/lib/plugins/table-of-contents 1 modules: src/routes(1)
out2 src/lib/plugins/table-of-contents 1 modules: src/lib/utils(1)
## entry files
entry src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte ext-in1 src/lib/app/AppShell.svelte
entry src/lib/plugins/table-of-contents/toc.service.ts ext-in1 src/lib/app/EditorView.svelte
## files
file src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte component L82 module src/lib/plugins/table-of-contents in1 t1
file src/lib/plugins/table-of-contents/toc.logic.ts logic L93 module src/lib/plugins/table-of-contents in1 t1
file src/lib/plugins/table-of-contents/toc.service.ts service L25 module src/lib/plugins/table-of-contents in2 t3
file src/lib/plugins/table-of-contents/toc.store.svelte.ts store L27 module src/lib/plugins/table-of-contents in2 t5
file src/lib/plugins/table-of-contents/toc.types.ts types L11 module src/lib/plugins/table-of-contents in2 t0
## public
sym src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:1 component TableOfContentsPanel L82
sym src/lib/plugins/table-of-contents/toc.service.ts:22 fn showTableOfContents(path: string): void L4 | Shows the right sidebar with the Table of contents section turned on and expanded on `path` (the action bar's TOC button).
## stores
store src/lib/plugins/table-of-contents/toc.store.svelte.ts:14 tocStore esc:0
## effects
fx-count svelte.$effect 2
## debt
-
