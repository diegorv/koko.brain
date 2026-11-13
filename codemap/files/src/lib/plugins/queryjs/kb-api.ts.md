# file card src/lib/plugins/queryjs/kb-api.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/queryjs/kb-api.ts ' codemap/files
file src/lib/plugins/queryjs/kb-api.ts other L556 module src/lib/plugins/queryjs in3 t6
## imports
imp src/lib/plugins/queryjs/kb-api.ts:1 -> src/lib/features/collection/collection.types.ts type:PropertyIndexRecord
imp src/lib/plugins/queryjs/kb-api.ts:2 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
imp src/lib/plugins/queryjs/kb-api.ts:3 -> src/lib/plugins/queryjs/queryjs.types.ts type:KBPage,type:KBLink,type:KBElOptions
imp src/lib/plugins/queryjs/kb-api.ts:4 -> src/lib/plugins/queryjs/contract/kb-api.v1.ts type:DataArrayV1,type:KBApiV1,type:KBDateTimeV1
imp src/lib/plugins/queryjs/kb-api.ts:5 -> src/lib/plugins/queryjs/data-array.ts DataArray
imp src/lib/plugins/queryjs/kb-api.ts:6 -> src/lib/plugins/queryjs/kb-datetime.ts KBDateTime
imp src/lib/plugins/queryjs/kb-api.ts:7 -> src/lib/plugins/queryjs/kb-ui.ts KBUI
imp src/lib/plugins/queryjs/kb-api.ts:8 -> src/lib/plugins/queryjs/queryjs.logic.ts buildKBLink,buildKBPage,buildReverseIndex,parseSource
imp src/lib/plugins/queryjs/kb-api.ts:9 -> src/lib/core/filesystem/wikilink-resolution.logic.ts buildResolutionCache
imp src/lib/plugins/queryjs/kb-api.ts:10 -> src/lib/core/filesystem/fs.logic.ts isViewFile
imp src/lib/plugins/queryjs/kb-api.ts:11 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/plugins/queryjs/kb-api.ts:12 -> src/lib/utils/clamp.ts clamp
imp src/lib/plugins/queryjs/kb-api.ts:13 -> src/lib/utils/platform.ts IS_MAC,isMacContextClick
imp src/lib/plugins/queryjs/kb-api.ts:14 -> src/lib/utils/log.service.ts appendLog
imp src/lib/plugins/queryjs/kb-api.ts:15 -> src/lib/features/type-definitions/type-sidebar.logic.ts excludeSystemFolder,isListableNote
## imported-by
imp src/lib/plugins/mods/mod-app.service.ts:14 -> src/lib/plugins/queryjs/kb-api.ts KBAPI
imp src/lib/plugins/mods/mods-host.service.ts:15 -> src/lib/plugins/queryjs/kb-api.ts type:KBAPI
imp src/lib/plugins/queryjs/queryjs-block-widget.ts:10 -> src/lib/plugins/queryjs/kb-api.ts KBAPI,runQueryjsBlock
## reach
in2 src/lib/plugins/queryjs/kb-api.ts 5 files in 3 modules: src/lib/app(3) src/lib/plugins/mods(1) src/lib/plugins/queryjs(1)
out2 src/lib/plugins/queryjs/kb-api.ts 19 files in 9 modules: src/lib/utils(6) src/lib/core/editor(4) src/lib/contracts(2) src/lib/plugins/queryjs(2) src/lib/core/filesystem(1) +4 modules
## tests
test src/tests/lib/plugins/queryjs/kb-api-contract.test.ts imports src/lib/plugins/queryjs/kb-api.ts mirror
test src/tests/lib/plugins/queryjs/kb-api.test.ts imports src/lib/plugins/queryjs/kb-api.ts mirror
test src/tests/lib/plugins/queryjs/kb-api.view-page.test.ts imports src/lib/plugins/queryjs/kb-api.ts mirror
test src/tests/help/queryjs-contract.test.ts imports src/lib/plugins/queryjs/kb-api.ts
test src/tests/help/queryjs-features-scoping.test.ts imports src/lib/plugins/queryjs/kb-api.ts
test src/tests/lib/features/collection/collection.service.test.ts imports src/lib/plugins/queryjs/kb-api.ts
## symbols
sym src/lib/plugins/queryjs/kb-api.ts:55 class KBAPI L486 | QueryJS API object.
by src/lib/plugins/queryjs/kb-api.ts:KBAPI <- src/lib/plugins/mods/mod-app.service.ts:84 in createModKb new
by src/lib/plugins/queryjs/kb-api.ts:KBAPI <- src/lib/plugins/mods/mods-host.service.ts:15 in (module) import
by src/lib/plugins/queryjs/kb-api.ts:KBAPI <- src/lib/plugins/queryjs/queryjs-block-widget.ts:245 in QueryjsBlockWidget.execute new
sym src/lib/plugins/queryjs/kb-api.ts:552 fn runQueryjsBlock(api: KBAPI, jsContent: string): Promise<void> L5 | Runs the body of a `` ```queryjs `` block against `api`, the step the block widget and the help-example contract tests share.
by src/lib/plugins/queryjs/kb-api.ts:runQueryjsBlock <- src/lib/plugins/queryjs/queryjs-block-widget.ts:256 in QueryjsBlockWidget.execute call
## calls
call src/lib/plugins/queryjs/kb-api.ts:120 in KBAPI.pages -> src/lib/plugins/queryjs/kb-api.ts:KBAPI.ensureCache call
call src/lib/plugins/queryjs/kb-api.ts:123 in KBAPI.pages -> src/lib/plugins/queryjs/queryjs.logic.ts:parseSource call
call src/lib/plugins/queryjs/kb-api.ts:125 in KBAPI.pages -> src/lib/plugins/queryjs/data-array.ts:DataArray new +1
call src/lib/plugins/queryjs/kb-api.ts:136 in KBAPI.pagePaths -> src/lib/plugins/queryjs/kb-api.ts:KBAPI.pages call
call src/lib/plugins/queryjs/kb-api.ts:141 in KBAPI.current -> src/lib/plugins/queryjs/kb-api.ts:KBAPI.ensureCache call
call src/lib/plugins/queryjs/kb-api.ts:146 in KBAPI.page -> src/lib/plugins/queryjs/kb-api.ts:KBAPI.ensureCache call
call src/lib/plugins/queryjs/kb-api.ts:152 in KBAPI.ui -> src/lib/plugins/queryjs/kb-ui.ts:KBUI new
call src/lib/plugins/queryjs/kb-api.ts:161 in KBAPI.date -> src/lib/plugins/queryjs/kb-datetime.ts:KBDateTime new
call src/lib/plugins/queryjs/kb-api.ts:171 in KBAPI.tryDate -> src/lib/plugins/queryjs/kb-datetime.ts:KBDateTime.tryParse mcall
call src/lib/plugins/queryjs/kb-api.ts:180 in KBAPI.getDaysInRange -> src/lib/plugins/queryjs/kb-datetime.ts:KBDateTime.tryParse mcall +1
call src/lib/plugins/queryjs/kb-api.ts:182 in KBAPI.getDaysInRange -> src/lib/plugins/queryjs/data-array.ts:DataArray new +2
call src/lib/plugins/queryjs/kb-api.ts:200 in KBAPI.array -> src/lib/plugins/queryjs/data-array.ts:DataArray new +1
call src/lib/plugins/queryjs/kb-api.ts:211 in KBAPI.fileLink -> src/lib/plugins/queryjs/queryjs.logic.ts:buildKBLink call
call src/lib/plugins/queryjs/kb-api.ts:228 in KBAPI.equal -> src/lib/plugins/queryjs/kb-api.ts:KBAPI.compare call
call src/lib/plugins/queryjs/kb-api.ts:242 in KBAPI.progressBar -> src/lib/utils/clamp.ts:clamp call
call src/lib/plugins/queryjs/kb-api.ts:279 in KBAPI.paragraph -> src/lib/plugins/queryjs/kb-api.ts:KBAPI.el call
call src/lib/plugins/queryjs/kb-api.ts:284 in KBAPI.header -> src/lib/utils/clamp.ts:clamp call
call src/lib/plugins/queryjs/kb-api.ts:286 in KBAPI.header -> src/lib/plugins/queryjs/kb-api.ts:KBAPI.el call
call src/lib/plugins/queryjs/kb-api.ts:289 in KBAPI.header -> src/lib/plugins/queryjs/kb-api.ts:KBAPI.renderValue call
call src/lib/plugins/queryjs/kb-api.ts:296 in KBAPI.span -> src/lib/plugins/queryjs/kb-api.ts:KBAPI.el call
call src/lib/plugins/queryjs/kb-api.ts:307 in KBAPI.list -> src/lib/plugins/queryjs/kb-api.ts:KBAPI.renderValue call
call src/lib/plugins/queryjs/kb-api.ts:337 in KBAPI.table -> src/lib/plugins/queryjs/kb-api.ts:KBAPI.renderValue call
call src/lib/plugins/queryjs/kb-api.ts:383 in KBAPI.view -> src/lib/plugins/queryjs/kb-api.ts:KBAPI.runView call
call src/lib/plugins/queryjs/kb-api.ts:404 in KBAPI.runView -> src/lib/plugins/queryjs/kb-api.ts:KBAPI.resolveScriptPath call
call src/lib/plugins/queryjs/kb-api.ts:446 in KBAPI.ensureCache -> src/lib/plugins/queryjs/queryjs.logic.ts:buildReverseIndex call
call src/lib/plugins/queryjs/kb-api.ts:452 in KBAPI.ensureCache -> src/lib/core/filesystem/wikilink-resolution.logic.ts:buildResolutionCache call
call src/lib/plugins/queryjs/kb-api.ts:456 in KBAPI.ensureCache -> src/lib/plugins/queryjs/queryjs.logic.ts:buildKBPage call
call src/lib/plugins/queryjs/kb-api.ts:473 in KBAPI.ensureCache -> src/lib/features/type-definitions/type-sidebar.logic.ts:excludeSystemFolder call
call src/lib/plugins/queryjs/kb-api.ts:476 in KBAPI.ensureCache -> src/lib/core/filesystem/fs.logic.ts:isViewFile call
call src/lib/plugins/queryjs/kb-api.ts:476 in KBAPI.ensureCache -> src/lib/features/type-definitions/type-sidebar.logic.ts:isListableNote call
call src/lib/plugins/queryjs/kb-api.ts:484 in KBAPI.ensureCache -> src/lib/utils/log.service.ts:appendLog call
call src/lib/plugins/queryjs/kb-api.ts:509 in KBAPI.renderValue -> src/lib/utils/platform.ts:isMacContextClick call
call src/lib/plugins/queryjs/kb-api.ts:512 in KBAPI.renderValue -> src/lib/core/editor/editor.service.ts:openFileInEditor call
## effects
fx src/lib/plugins/queryjs/kb-api.ts:507 dom.mousedown a in KBAPI.renderValue
