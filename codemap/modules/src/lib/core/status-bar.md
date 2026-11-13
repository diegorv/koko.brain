# module card src/lib/core/status-bar
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/core/status-bar ' codemap/modules
module src/lib/core/status-bar core files 2 in-modules 1 out-modules 1 pub 2/2 ipc 0/0 card ~0.4k
## neighbors
dep src/lib/app -> src/lib/core/status-bar 2
dep src/lib/core/status-bar -> src/lib/core/editor 2
in2 src/lib/core/status-bar 1 modules: src/routes(1)
out2 src/lib/core/status-bar 1 modules: src/lib/utils(1)
## entry files
entry src/lib/core/status-bar/SaveStatus.svelte ext-in1 src/lib/app/AppShell.svelte
entry src/lib/core/status-bar/StatusBar.svelte ext-in1 src/lib/app/AppShell.svelte
## files
file src/lib/core/status-bar/SaveStatus.svelte component L24 module src/lib/core/status-bar in1 t0
file src/lib/core/status-bar/StatusBar.svelte component L34 module src/lib/core/status-bar in1 t0
## public
sym src/lib/core/status-bar/SaveStatus.svelte:1 component SaveStatus L24
sym src/lib/core/status-bar/StatusBar.svelte:1 component StatusBar props:left,right L34
## debt
-
