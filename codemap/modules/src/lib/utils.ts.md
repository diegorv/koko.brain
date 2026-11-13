# module card src/lib/utils.ts
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/utils.ts ' codemap/modules
module src/lib/utils.ts lib-root files 1 in-modules 1 out-modules 1 pub 4/4 ipc 0/0 card ~0.4k
## neighbors
dep src/lib/components -> src/lib/utils.ts 54
dep src/lib/utils.ts -> src/lib/utils 1
in2 src/lib/utils.ts 0 modules: -
out2 src/lib/utils.ts 0 modules: -
## entry files
entry src/lib/utils.ts ext-in54 src/lib/components/ui/button/button.svelte src/lib/components/ui/command/command-dialog.svelte src/lib/components/ui/command/command-empty.svelte src/lib/components/ui/command/command-group.svelte src/lib/components/ui/command/command-input.svelte more importers 49 not shown: src/lib/components(49): q importers src/lib/utils.ts
## files
file src/lib/utils.ts other L20 module src/lib/utils.ts in54 t1
## public
sym src/lib/utils.ts:10 fn cn(...inputs: ClassValue[]) L3
sym src/lib/utils.ts:14 type WithElementRef L3
sym src/lib/utils.ts:18 type WithoutChildrenOrChild L1
sym src/lib/utils.ts:20 type WithoutChild L1
## debt
-
