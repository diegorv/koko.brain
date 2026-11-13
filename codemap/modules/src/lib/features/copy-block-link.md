# module card src/lib/features/copy-block-link
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/features/copy-block-link ' codemap/modules
module src/lib/features/copy-block-link features files 1 in-modules 1 out-modules 3 pub 2/3 ipc 0/0 card ~0.5k
## neighbors
dep src/lib/app -> src/lib/features/copy-block-link 2
dep src/lib/features/copy-block-link -> src/lib/core/editor 1
dep src/lib/features/copy-block-link -> src/lib/core/markdown-editor 1
dep src/lib/features/copy-block-link -> src/lib/utils 1
in2 src/lib/features/copy-block-link 0 modules: -
out2 src/lib/features/copy-block-link 3 modules: src/lib/contracts(2) src/lib/core/settings(2) src/lib/core/filesystem(1)
## entry files
entry src/lib/features/copy-block-link/copy-block-link.service.ts ext-in2 src/lib/app/commands.ts src/lib/app/editor-host.ts
## files
file src/lib/features/copy-block-link/copy-block-link.service.ts service L73 module src/lib/features/copy-block-link in2 t3
## public
sym src/lib/features/copy-block-link/copy-block-link.service.ts:66 fn copyBlockLinkToClipboard(view: EditorView): Promise<void> L3 | Copies a wikilink to the block at the current cursor position
sym src/lib/features/copy-block-link/copy-block-link.service.ts:71 fn copyBlockEmbedToClipboard(view: EditorView): Promise<void> L3 | Copies an embed wikilink to the block at the current cursor position
## debt
-
