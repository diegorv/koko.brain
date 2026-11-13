# file card src/routes/composer/+page.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/routes/composer/+page.svelte ' codemap/files
file src/routes/composer/+page.svelte component L318 module src/routes in0 t1
## imports
imp src/routes/composer/+page.svelte:4 -> pkg:@tauri-apps/api/event type:UnlistenFn
imp src/routes/composer/+page.svelte:6 -> src/lib/contracts/events.ts EVENT_NAMES
imp src/routes/composer/+page.svelte:7 -> src/lib/contracts/ipc.ts call,on
imp src/routes/composer/+page.svelte:8 -> src/lib/core/settings/theme.service.ts applyStoredTheme,THEME_VARS_STORAGE_KEY
imp src/routes/composer/+page.svelte:9 -> src/lib/plugins/quick-capture/composer-editor-host.service.ts createComposerEditorHost
imp src/routes/composer/+page.svelte:10 -> src/lib/plugins/quick-capture/composer-editor.ts createComposerEditor,setComposerDark,setComposerText
## reach
in2 src/routes/composer/+page.svelte 0 files in 0 modules: -
out2 src/routes/composer/+page.svelte 13 files in 5 modules: src/lib/core/markdown-editor(4) src/lib/core/settings(4) src/lib/contracts(2) src/lib/core/filesystem(2) src/lib/utils(1)
## tests
test src/tests/routes/composer-page.test.ts imports src/routes/composer/+page.svelte
## symbols
sym src/routes/composer/+page.svelte:1 component +page L318
## locals
local src/routes/composer/+page.svelte:44 fn setText(next: string) L4
local src/routes/composer/+page.svelte:50 fn isDark(): boolean L3
local src/routes/composer/+page.svelte:56 fn readDraft(): string L7
local src/routes/composer/+page.svelte:64 fn writeDraft(value: string) L8
local src/routes/composer/+page.svelte:77 fn waitForResult(requestId: string): Promise<boolean | null> L11
local src/routes/composer/+page.svelte:89 fn dismiss() L11
local src/routes/composer/+page.svelte:101 fn handleSave() L53
local src/routes/composer/+page.svelte:156 fn withoutWritten(current: string, written: string): string L3
local src/routes/composer/+page.svelte:160 fn onStorage(event: StorageEvent) L5
local src/routes/composer/+page.svelte:166 fn resetForShow() L21
local src/routes/composer/+page.svelte:188 fn onKeyDown(event: KeyboardEvent) L11
## calls
call src/routes/composer/+page.svelte:18 in text -> src/routes/composer/+page.svelte:readDraft call
call src/routes/composer/+page.svelte:36 in host -> src/lib/plugins/quick-capture/composer-editor-host.service.ts:createComposerEditorHost call
call src/routes/composer/+page.svelte:41 in $effect@41 -> src/routes/composer/+page.svelte:writeDraft call
call src/routes/composer/+page.svelte:46 in setText -> src/lib/plugins/quick-capture/composer-editor.ts:setComposerText call
call src/routes/composer/+page.svelte:95 in dismiss -> src/lib/contracts/ipc.ts:call call
call src/routes/composer/+page.svelte:107 in handleSave -> src/routes/composer/+page.svelte:dismiss call +1
call src/routes/composer/+page.svelte:114 in handleSave -> src/routes/composer/+page.svelte:waitForResult call
call src/routes/composer/+page.svelte:120 in handleSave -> src/lib/contracts/ipc.ts:call call
call src/routes/composer/+page.svelte:131 in handleSave -> src/routes/composer/+page.svelte:setText call +1
call src/routes/composer/+page.svelte:131 in handleSave -> src/routes/composer/+page.svelte:withoutWritten call +1
call src/routes/composer/+page.svelte:162 in onStorage -> src/lib/core/settings/theme.service.ts:applyStoredTheme call
call src/routes/composer/+page.svelte:163 in onStorage -> src/lib/plugins/quick-capture/composer-editor.ts:setComposerDark call
call src/routes/composer/+page.svelte:163 in onStorage -> src/routes/composer/+page.svelte:isDark call
call src/routes/composer/+page.svelte:169 in resetForShow -> src/lib/core/settings/theme.service.ts:applyStoredTheme call
call src/routes/composer/+page.svelte:173 in resetForShow -> src/routes/composer/+page.svelte:readDraft call
call src/routes/composer/+page.svelte:173 in resetForShow -> src/routes/composer/+page.svelte:setText call
call src/routes/composer/+page.svelte:178 in resetForShow -> src/lib/plugins/quick-capture/composer-editor.ts:setComposerDark call
call src/routes/composer/+page.svelte:178 in resetForShow -> src/routes/composer/+page.svelte:isDark call
call src/routes/composer/+page.svelte:191 in onKeyDown -> src/routes/composer/+page.svelte:dismiss call
call src/routes/composer/+page.svelte:196 in onKeyDown -> src/routes/composer/+page.svelte:handleSave call
call src/routes/composer/+page.svelte:201 in (script) -> src/lib/core/settings/theme.service.ts:applyStoredTheme call
call src/routes/composer/+page.svelte:202 in (script) -> src/lib/plugins/quick-capture/composer-editor.ts:createComposerEditor call
call src/routes/composer/+page.svelte:206 in (script) -> src/routes/composer/+page.svelte:isDark call
call src/routes/composer/+page.svelte:209 in (script) -> src/routes/composer/+page.svelte:dismiss call
call src/routes/composer/+page.svelte:214 in (script) -> src/lib/contracts/ipc.ts:on call +1
call src/routes/composer/+page.svelte:215 in (script) -> src/routes/composer/+page.svelte:resetForShow call
call src/routes/composer/+page.svelte:239 in (markup) -> src/routes/composer/+page.svelte:onKeyDown markup
call src/routes/composer/+page.svelte:239 in (markup) -> src/routes/composer/+page.svelte:onStorage markup
## effects
fx src/routes/composer/+page.svelte:41 svelte.$effect in (script)
fx src/routes/composer/+page.svelte:58 storage.getItem in readDraft
fx src/routes/composer/+page.svelte:66 storage.setItem in writeDraft
fx src/routes/composer/+page.svelte:67 storage.removeItem in writeDraft
fx src/routes/composer/+page.svelte:79 timer.setTimeout delay=RESULT_TIMEOUT_MS in waitForResult
ipc-call src/routes/composer/+page.svelte:95 in dismiss -> ipc:dismiss_composer -> src-tauri/src/quick_capture/commands.rs:422
ipc-call src/routes/composer/+page.svelte:120 in handleSave -> ipc:submit_composer_capture -> src-tauri/src/quick_capture/commands.rs:469
fx src/routes/composer/+page.svelte:144 timer.setTimeout delay=SAVE_FLASH_MS in handleSave
fx src/routes/composer/+page.svelte:185 timer.queueMicrotask in resetForShow
ev src-tauri/src/quick_capture/commands.rs:406 in show_composer -> event:qc:open-composer -> src/routes/composer/+page.svelte:214 in (script)
ev src-tauri/src/quick_capture/commands.rs:511 in report_composer_capture_result -> event:qc:composer-capture-result -> src/routes/composer/+page.svelte:224 in (script)
fx src/routes/composer/+page.svelte:239 dom.keydown svelte:window in (markup)
fx src/routes/composer/+page.svelte:239 dom.storage svelte:window in (markup)
