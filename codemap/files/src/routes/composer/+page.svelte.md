# file card src/routes/composer/+page.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/routes/composer/+page.svelte ' codemap/files
file src/routes/composer/+page.svelte component L276 module src/routes in0 t1
## imports
imp src/routes/composer/+page.svelte:2 -> pkg:@tauri-apps/api/event type:UnlistenFn
imp src/routes/composer/+page.svelte:4 -> src/lib/contracts/events.ts EVENT_NAMES
imp src/routes/composer/+page.svelte:5 -> src/lib/contracts/ipc.ts call,on
imp src/routes/composer/+page.svelte:6 -> src/lib/core/settings/theme.service.ts applyStoredTheme,THEME_VARS_STORAGE_KEY
## reach
in2 src/routes/composer/+page.svelte 0 files in 0 modules: -
out2 src/routes/composer/+page.svelte 7 files in 3 modules: src/lib/core/settings(4) src/lib/contracts(2) src/lib/utils(1)
## tests
test src/tests/routes/composer-page.test.ts imports src/routes/composer/+page.svelte
## symbols
sym src/routes/composer/+page.svelte:1 component +page L276
## locals
local src/routes/composer/+page.svelte:38 fn readDraft(): string L7
local src/routes/composer/+page.svelte:46 fn writeDraft(value: string) L8
local src/routes/composer/+page.svelte:59 fn waitForResult(requestId: string): Promise<boolean | null> L11
local src/routes/composer/+page.svelte:71 fn dismiss() L11
local src/routes/composer/+page.svelte:83 fn handleSave() L53
local src/routes/composer/+page.svelte:138 fn withoutWritten(current: string, written: string): string L3
local src/routes/composer/+page.svelte:142 fn onStorage(event: StorageEvent) L3
local src/routes/composer/+page.svelte:146 fn resetForShow() L14
local src/routes/composer/+page.svelte:161 fn onKeyDown(event: KeyboardEvent) L11
## calls
call src/routes/composer/+page.svelte:14 in text -> src/routes/composer/+page.svelte:readDraft call
call src/routes/composer/+page.svelte:34 in $effect@34 -> src/routes/composer/+page.svelte:writeDraft call
call src/routes/composer/+page.svelte:77 in dismiss -> src/lib/contracts/ipc.ts:call call
call src/routes/composer/+page.svelte:89 in handleSave -> src/routes/composer/+page.svelte:dismiss call +1
call src/routes/composer/+page.svelte:96 in handleSave -> src/routes/composer/+page.svelte:waitForResult call
call src/routes/composer/+page.svelte:102 in handleSave -> src/lib/contracts/ipc.ts:call call
call src/routes/composer/+page.svelte:113 in handleSave -> src/routes/composer/+page.svelte:withoutWritten call +1
call src/routes/composer/+page.svelte:143 in onStorage -> src/lib/core/settings/theme.service.ts:applyStoredTheme call
call src/routes/composer/+page.svelte:149 in resetForShow -> src/lib/core/settings/theme.service.ts:applyStoredTheme call
call src/routes/composer/+page.svelte:152 in resetForShow -> src/routes/composer/+page.svelte:readDraft call
call src/routes/composer/+page.svelte:164 in onKeyDown -> src/routes/composer/+page.svelte:dismiss call
call src/routes/composer/+page.svelte:169 in onKeyDown -> src/routes/composer/+page.svelte:handleSave call
call src/routes/composer/+page.svelte:174 in (script) -> src/lib/core/settings/theme.service.ts:applyStoredTheme call
call src/routes/composer/+page.svelte:178 in (script) -> src/lib/contracts/ipc.ts:on call +1
call src/routes/composer/+page.svelte:179 in (script) -> src/routes/composer/+page.svelte:resetForShow call
call src/routes/composer/+page.svelte:202 in (markup) -> src/routes/composer/+page.svelte:onKeyDown markup
call src/routes/composer/+page.svelte:202 in (markup) -> src/routes/composer/+page.svelte:onStorage markup
## effects
fx src/routes/composer/+page.svelte:34 svelte.$effect in (script)
fx src/routes/composer/+page.svelte:40 storage.getItem in readDraft
fx src/routes/composer/+page.svelte:48 storage.setItem in writeDraft
fx src/routes/composer/+page.svelte:49 storage.removeItem in writeDraft
fx src/routes/composer/+page.svelte:61 timer.setTimeout delay=RESULT_TIMEOUT_MS in waitForResult
ipc-call src/routes/composer/+page.svelte:77 in dismiss -> ipc:dismiss_composer -> src-tauri/src/quick_capture/commands.rs:422
ipc-call src/routes/composer/+page.svelte:102 in handleSave -> ipc:submit_composer_capture -> src-tauri/src/quick_capture/commands.rs:469
fx src/routes/composer/+page.svelte:126 timer.setTimeout delay=SAVE_FLASH_MS in handleSave
fx src/routes/composer/+page.svelte:158 timer.queueMicrotask in resetForShow
ev src-tauri/src/quick_capture/commands.rs:406 in show_composer -> event:qc:open-composer -> src/routes/composer/+page.svelte:178 in (script)
ev src-tauri/src/quick_capture/commands.rs:511 in report_composer_capture_result -> event:qc:composer-capture-result -> src/routes/composer/+page.svelte:188 in (script)
fx src/routes/composer/+page.svelte:202 dom.keydown svelte:window in (markup)
fx src/routes/composer/+page.svelte:202 dom.storage svelte:window in (markup)
