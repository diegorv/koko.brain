# file card src/lib/plugins/queryjs/queryjs.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/queryjs/queryjs.service.ts ' codemap/files
file src/lib/plugins/queryjs/queryjs.service.ts service L6 module src/lib/plugins/queryjs in2 t1
## imports
imp src/lib/plugins/queryjs/queryjs.service.ts:1 -> pkg:@tauri-apps/plugin-fs readTextFile
## imported-by
imp src/lib/plugins/mods/mod-app.service.ts:15 -> src/lib/plugins/queryjs/queryjs.service.ts loadExternalScript
imp src/lib/plugins/queryjs/queryjs-block-widget.ts:12 -> src/lib/plugins/queryjs/queryjs.service.ts loadExternalScript
## reach
in2 src/lib/plugins/queryjs/queryjs.service.ts 3 files in 3 modules: src/lib/app(1) src/lib/plugins/mods(1) src/lib/plugins/queryjs(1)
out2 src/lib/plugins/queryjs/queryjs.service.ts 0 files in 0 modules: -
## tests
test src/tests/lib/plugins/queryjs/queryjs.service.test.ts imports src/lib/plugins/queryjs/queryjs.service.ts mirror
## symbols
sym src/lib/plugins/queryjs/queryjs.service.ts:4 fn loadExternalScript(absolutePath: string): Promise<string> L3 | Loads a .js script file from the vault
by src/lib/plugins/queryjs/queryjs.service.ts:loadExternalScript <- src/lib/plugins/mods/mod-app.service.ts:92 in createModKb ref
by src/lib/plugins/queryjs/queryjs.service.ts:loadExternalScript <- src/lib/plugins/queryjs/queryjs-block-widget.ts:253 in QueryjsBlockWidget.execute ref
## effects
fx src/lib/plugins/queryjs/queryjs.service.ts:5 tauri-fs.readTextFile in loadExternalScript
