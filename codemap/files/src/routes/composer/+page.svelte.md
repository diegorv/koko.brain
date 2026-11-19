# file card src/routes/composer/+page.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/routes/composer/+page.svelte ' codemap/files
file src/routes/composer/+page.svelte component L379 module src/routes in0 t1
## imports
imp src/routes/composer/+page.svelte:4 -> pkg:@tauri-apps/api/event type:UnlistenFn
imp src/routes/composer/+page.svelte:7 -> src/lib/contracts/events.ts EVENT_NAMES
imp src/routes/composer/+page.svelte:8 -> src/lib/contracts/ipc.ts call,on
imp src/routes/composer/+page.svelte:9 -> src/lib/core/settings/theme.service.ts applyStoredTheme,THEME_VARS_STORAGE_KEY
imp src/routes/composer/+page.svelte:10 -> src/lib/plugins/quick-capture/composer-editor-host.service.ts createComposerEditorHost
imp src/routes/composer/+page.svelte:11 -> src/lib/plugins/quick-capture/composer-editor.ts createComposerEditor,setComposerDark,setComposerText
## reach
in2 src/routes/composer/+page.svelte 0 files in 0 modules: -
out2 src/routes/composer/+page.svelte 13 files in 5 modules: src/lib/core/markdown-editor(4) src/lib/core/settings(4) src/lib/contracts(2) src/lib/core/filesystem(2) src/lib/utils(1)
## tests
test src/tests/routes/composer-page.test.ts imports src/routes/composer/+page.svelte
## symbols
sym src/routes/composer/+page.svelte:1 component +page L379
## locals
local src/routes/composer/+page.svelte:50 fn setText(next: string) L4
local src/routes/composer/+page.svelte:56 fn isDark(): boolean L3
local src/routes/composer/+page.svelte:62 fn readDraft(): string L7
local src/routes/composer/+page.svelte:70 fn writeDraft(value: string) L8
local src/routes/composer/+page.svelte:83 fn waitForResult(requestId: string): Promise<boolean | null> L11
local src/routes/composer/+page.svelte:95 fn dismiss() L11
local src/routes/composer/+page.svelte:107 fn handleSave() L58
local src/routes/composer/+page.svelte:167 fn withoutWritten(current: string, written: string): string L3
local src/routes/composer/+page.svelte:171 fn onStorage(event: StorageEvent) L5
local src/routes/composer/+page.svelte:177 fn resetForShow() L24
local src/routes/composer/+page.svelte:203 fn discard() L5
local src/routes/composer/+page.svelte:209 fn onKeyDown(event: KeyboardEvent) L11
## calls
call src/routes/composer/+page.svelte:20 in initialDraft -> src/routes/composer/+page.svelte:readDraft call
call src/routes/composer/+page.svelte:42 in host -> src/lib/plugins/quick-capture/composer-editor-host.service.ts:createComposerEditorHost call
call src/routes/composer/+page.svelte:47 in $effect@47 -> src/routes/composer/+page.svelte:writeDraft call
call src/routes/composer/+page.svelte:52 in setText -> src/lib/plugins/quick-capture/composer-editor.ts:setComposerText call
call src/routes/composer/+page.svelte:101 in dismiss -> src/lib/contracts/ipc.ts:call call
call src/routes/composer/+page.svelte:113 in handleSave -> src/routes/composer/+page.svelte:dismiss call +1
call src/routes/composer/+page.svelte:121 in handleSave -> src/routes/composer/+page.svelte:waitForResult call
call src/routes/composer/+page.svelte:127 in handleSave -> src/lib/contracts/ipc.ts:call call
call src/routes/composer/+page.svelte:138 in handleSave -> src/routes/composer/+page.svelte:setText call +1
call src/routes/composer/+page.svelte:138 in handleSave -> src/routes/composer/+page.svelte:withoutWritten call +2
call src/routes/composer/+page.svelte:151 in handleSave -> src/routes/composer/+page.svelte:writeDraft call
call src/routes/composer/+page.svelte:173 in onStorage -> src/lib/core/settings/theme.service.ts:applyStoredTheme call
call src/routes/composer/+page.svelte:174 in onStorage -> src/lib/plugins/quick-capture/composer-editor.ts:setComposerDark call
call src/routes/composer/+page.svelte:174 in onStorage -> src/routes/composer/+page.svelte:isDark call
call src/routes/composer/+page.svelte:180 in resetForShow -> src/lib/core/settings/theme.service.ts:applyStoredTheme call
call src/routes/composer/+page.svelte:184 in resetForShow -> src/routes/composer/+page.svelte:readDraft call
call src/routes/composer/+page.svelte:185 in resetForShow -> src/routes/composer/+page.svelte:setText call
call src/routes/composer/+page.svelte:192 in resetForShow -> src/lib/plugins/quick-capture/composer-editor.ts:setComposerDark call
call src/routes/composer/+page.svelte:192 in resetForShow -> src/routes/composer/+page.svelte:isDark call
call src/routes/composer/+page.svelte:204 in discard -> src/routes/composer/+page.svelte:setText call
call src/routes/composer/+page.svelte:212 in onKeyDown -> src/routes/composer/+page.svelte:dismiss call
call src/routes/composer/+page.svelte:217 in onKeyDown -> src/routes/composer/+page.svelte:handleSave call
call src/routes/composer/+page.svelte:222 in (script) -> src/lib/core/settings/theme.service.ts:applyStoredTheme call
call src/routes/composer/+page.svelte:223 in (script) -> src/lib/plugins/quick-capture/composer-editor.ts:createComposerEditor call
call src/routes/composer/+page.svelte:227 in (script) -> src/routes/composer/+page.svelte:isDark call
call src/routes/composer/+page.svelte:234 in (script) -> src/routes/composer/+page.svelte:dismiss call
call src/routes/composer/+page.svelte:239 in (script) -> src/lib/contracts/ipc.ts:on call +1
call src/routes/composer/+page.svelte:240 in (script) -> src/routes/composer/+page.svelte:resetForShow call
call src/routes/composer/+page.svelte:264 in (markup) -> src/routes/composer/+page.svelte:onKeyDown markup
call src/routes/composer/+page.svelte:264 in (markup) -> src/routes/composer/+page.svelte:onStorage markup
call src/routes/composer/+page.svelte:279 in (markup) -> src/routes/composer/+page.svelte:discard markup
## effects
fx src/routes/composer/+page.svelte:47 svelte.$effect in (script)
fx src/routes/composer/+page.svelte:64 storage.getItem in readDraft
fx src/routes/composer/+page.svelte:72 storage.setItem in writeDraft
fx src/routes/composer/+page.svelte:73 storage.removeItem in writeDraft
fx src/routes/composer/+page.svelte:85 timer.setTimeout delay=RESULT_TIMEOUT_MS in waitForResult
ipc-call src/routes/composer/+page.svelte:101 in dismiss -> ipc:dismiss_composer -> src-tauri/src/quick_capture/commands.rs:422
ipc-call src/routes/composer/+page.svelte:127 in handleSave -> ipc:submit_composer_capture -> src-tauri/src/quick_capture/commands.rs:469
fx src/routes/composer/+page.svelte:155 timer.setTimeout delay=SAVE_FLASH_MS in handleSave
fx src/routes/composer/+page.svelte:199 timer.queueMicrotask in resetForShow
ev src-tauri/src/quick_capture/commands.rs:406 in show_composer -> event:qc:open-composer -> src/routes/composer/+page.svelte:239 in (script)
ev src-tauri/src/quick_capture/commands.rs:511 in report_composer_capture_result -> event:qc:composer-capture-result -> src/routes/composer/+page.svelte:249 in (script)
fx src/routes/composer/+page.svelte:264 dom.keydown svelte:window in (markup)
fx src/routes/composer/+page.svelte:264 dom.storage svelte:window in (markup)
