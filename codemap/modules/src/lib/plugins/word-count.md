# module card src/lib/plugins/word-count
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/plugins/word-count ' codemap/modules
module src/lib/plugins/word-count plugins files 2 in-modules 1 out-modules 1 pub 1/4 ipc 0/0 card ~0.4k
## neighbors
dep src/lib/app -> src/lib/plugins/word-count 1
dep src/lib/plugins/word-count -> src/lib/core/editor 2
in2 src/lib/plugins/word-count 1 modules: src/routes(1)
out2 src/lib/plugins/word-count 1 modules: src/lib/utils(1)
## entry files
entry src/lib/plugins/word-count/WordCount.svelte ext-in1 src/lib/app/AppShell.svelte
## files
file src/lib/plugins/word-count/WordCount.svelte component L46 module src/lib/plugins/word-count in1 t0
file src/lib/plugins/word-count/word-count.logic.ts logic L20 module src/lib/plugins/word-count in1 t1
## public
sym src/lib/plugins/word-count/WordCount.svelte:1 component WordCount L46
## effects
fx-count svelte.$effect 1
fx-count timer.setTimeout 1
## debt
-
