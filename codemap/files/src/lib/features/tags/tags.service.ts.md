# file card src/lib/features/tags/tags.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/tags/tags.service.ts ' codemap/files
file src/lib/features/tags/tags.service.ts service L168 module src/lib/features/tags in4 t4
## imports
imp src/lib/features/tags/tags.service.ts:1 -> src/lib/contracts/ipc.ts call
imp src/lib/features/tags/tags.service.ts:2 -> src/lib/utils/debug.ts debug,error,timeAsync,timeSync
imp src/lib/features/tags/tags.service.ts:3 -> src/lib/utils/debounce.ts debounce
imp src/lib/features/tags/tags.service.ts:4 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/tags/tags.service.ts:5 -> src/lib/core/editor/editor.logic.ts findTabIndex,TAGS_VIRTUAL_PATH
imp src/lib/features/tags/tags.service.ts:6 -> src/lib/features/tags/tags.store.svelte.ts tagsStore
imp src/lib/features/tags/tags.service.ts:7 -> src/lib/features/tags/tags.logic.ts buildTagTree,sortTagTree,tagTreeShape
## imported-by
imp src/lib/app/commands.ts:44 -> src/lib/features/tags/tags.service.ts toggleTagsTab
imp src/lib/app/lifecycle/app-lifecycle.service.ts:24 -> src/lib/features/tags/tags.service.ts buildTagIndex,resetTags
imp src/lib/app/rail-navigation.ts:11 -> src/lib/features/tags/tags.service.ts openTagsTab
imp src/lib/features/tags/TagsView.svelte:7 -> src/lib/features/tags/tags.service.ts scheduleTagIndexRebuild,updateTagSort
## reach
in2 src/lib/features/tags/tags.service.ts 5 files in 2 modules: src/lib/app(4) src/routes(1)
out2 src/lib/features/tags/tags.service.ts 8 files in 5 modules: src/lib/contracts(2) src/lib/core/settings(2) src/lib/utils(2) src/lib/core/editor(1) src/lib/features/tags(1)
## tests
test src/tests/lib/features/tags/tags.service.test.ts imports src/lib/features/tags/tags.service.ts mirror
test src/tests/lib/features/tags/TagsView.refresh.test.ts imports src/lib/features/tags/tags.service.ts
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts mocks src/lib/features/tags/tags.service.ts
test src/tests/lib/features/tags/TagsView.test.ts mocks src/lib/features/tags/tags.service.ts
## symbols
sym src/lib/features/tags/tags.service.ts:26 fn buildTagIndex(): Promise<void> L33 | Builds the tag tree from the Rust `VaultIndex`.
by src/lib/features/tags/tags.service.ts:buildTagIndex <- src/lib/app/lifecycle/app-lifecycle.service.ts:433 in initializeVault call
sym src/lib/features/tags/tags.service.ts:64 fn updateTagSort(mode: 'name' | 'count'): void L4 | Updates the sort mode and re-sorts the existing tree.
by src/lib/features/tags/tags.service.ts:updateTagSort <- src/lib/features/tags/TagsView.svelte:30 in toggleSort call
sym src/lib/features/tags/tags.service.ts:109 fn scheduleTagIndexRebuild(): void L3 | Schedules a tag-index rebuild with a 300 ms trailing debounce and single-flight semantics.
by src/lib/features/tags/tags.service.ts:scheduleTagIndexRebuild <- src/lib/features/tags/TagsView.svelte:73 in $effect@70 call
sym src/lib/features/tags/tags.service.ts:118 fn flushScheduledTagIndexRebuild(): Promise<void> L6 | Flushes any pending debounced trigger and waits for the current rebuild (and any pending re-run) to settle.
sym src/lib/features/tags/tags.service.ts:126 fn openTagsTab(): void L14 | Opens or focuses the Tags tab.
by src/lib/features/tags/tags.service.ts:openTagsTab <- src/lib/app/rail-navigation.ts:37 in selectRailItem call
sym src/lib/features/tags/tags.service.ts:142 fn closeTagsTab(): void L6 | Closes the Tags tab if it exists.
sym src/lib/features/tags/tags.service.ts:150 fn toggleTagsTab(): void L10 | Toggles the Tags tab: opens if closed, closes if active, focuses if open but not active.
by src/lib/features/tags/tags.service.ts:toggleTagsTab <- src/lib/app/commands.ts:301 in getBuiltInCommands call
sym src/lib/features/tags/tags.service.ts:162 fn resetTags(): void L7 | Resets all tag state and cancels any pending scheduled rebuild.
by src/lib/features/tags/tags.service.ts:resetTags <- src/lib/app/lifecycle/app-lifecycle.service.ts:664 in teardownVault call
## locals
local src/lib/features/tags/tags.service.ts:74 fn runScheduledRebuild(): Promise<void> L16
local src/lib/features/tags/tags.service.ts:91 fn debouncedTrigger = debounce(…) L3
## calls
call src/lib/features/tags/tags.service.ts:27 in buildTagIndex -> src/lib/features/tags/tags.store.svelte.ts:tagsStore.setLoading mcall +1
call src/lib/features/tags/tags.service.ts:29 in buildTagIndex -> src/lib/utils/debug.ts:timeAsync call
call src/lib/features/tags/tags.service.ts:30 in buildTagIndex -> src/lib/contracts/ipc.ts:call call
call src/lib/features/tags/tags.service.ts:32 in buildTagIndex -> src/lib/utils/debug.ts:timeSync call +3
call src/lib/features/tags/tags.service.ts:39 in buildTagIndex -> src/lib/features/tags/tags.logic.ts:buildTagTree call
call src/lib/features/tags/tags.service.ts:41 in buildTagIndex -> src/lib/features/tags/tags.logic.ts:sortTagTree call
call src/lib/features/tags/tags.service.ts:44 in buildTagIndex -> src/lib/features/tags/tags.store.svelte.ts:tagsStore.setTagTree mcall
call src/lib/features/tags/tags.service.ts:45 in buildTagIndex -> src/lib/features/tags/tags.store.svelte.ts:tagsStore.setTotalTagCount mcall
call src/lib/features/tags/tags.service.ts:46 in buildTagIndex -> src/lib/features/tags/tags.store.svelte.ts:tagsStore.setHasLoaded mcall
call src/lib/features/tags/tags.service.ts:48 in buildTagIndex -> src/lib/features/tags/tags.logic.ts:tagTreeShape call
call src/lib/features/tags/tags.service.ts:49 in buildTagIndex -> src/lib/utils/debug.ts:debug call
call src/lib/features/tags/tags.service.ts:54 in buildTagIndex -> src/lib/utils/debug.ts:error call
call src/lib/features/tags/tags.service.ts:65 in updateTagSort -> src/lib/features/tags/tags.store.svelte.ts:tagsStore.setSortMode mcall
call src/lib/features/tags/tags.service.ts:66 in updateTagSort -> src/lib/features/tags/tags.logic.ts:sortTagTree call
call src/lib/features/tags/tags.service.ts:66 in updateTagSort -> src/lib/features/tags/tags.store.svelte.ts:tagsStore.setTagTree mcall
call src/lib/features/tags/tags.service.ts:81 in runScheduledRebuild -> src/lib/features/tags/tags.service.ts:buildTagIndex call
call src/lib/features/tags/tags.service.ts:86 in runScheduledRebuild -> src/lib/features/tags/tags.service.ts:runScheduledRebuild call
call src/lib/features/tags/tags.service.ts:91 in debouncedTrigger -> src/lib/utils/debounce.ts:debounce call
call src/lib/features/tags/tags.service.ts:92 in debouncedTrigger -> src/lib/features/tags/tags.service.ts:runScheduledRebuild call
call src/lib/features/tags/tags.service.ts:110 in scheduleTagIndexRebuild -> src/lib/features/tags/tags.service.ts:debouncedTrigger call
call src/lib/features/tags/tags.service.ts:119 in flushScheduledTagIndexRebuild -> src/lib/features/tags/tags.service.ts:debouncedTrigger mcall
call src/lib/features/tags/tags.service.ts:127 in openTagsTab -> src/lib/core/editor/editor.logic.ts:findTabIndex call
call src/lib/features/tags/tags.service.ts:129 in openTagsTab -> src/lib/core/editor/editor.store.svelte.ts:editorStore.setActiveIndex mcall
call src/lib/features/tags/tags.service.ts:132 in openTagsTab -> src/lib/core/editor/editor.store.svelte.ts:editorStore.addTab mcall
call src/lib/features/tags/tags.service.ts:143 in closeTagsTab -> src/lib/core/editor/editor.logic.ts:findTabIndex call
call src/lib/features/tags/tags.service.ts:145 in closeTagsTab -> src/lib/core/editor/editor.store.svelte.ts:editorStore.removeTab mcall
call src/lib/features/tags/tags.service.ts:151 in toggleTagsTab -> src/lib/core/editor/editor.logic.ts:findTabIndex call
call src/lib/features/tags/tags.service.ts:153 in toggleTagsTab -> src/lib/features/tags/tags.service.ts:openTagsTab call
call src/lib/features/tags/tags.service.ts:155 in toggleTagsTab -> src/lib/core/editor/editor.store.svelte.ts:editorStore.removeTab mcall
call src/lib/features/tags/tags.service.ts:157 in toggleTagsTab -> src/lib/core/editor/editor.store.svelte.ts:editorStore.setActiveIndex mcall
call src/lib/features/tags/tags.service.ts:163 in resetTags -> src/lib/features/tags/tags.service.ts:debouncedTrigger mcall
call src/lib/features/tags/tags.service.ts:166 in resetTags -> src/lib/features/tags/tags.store.svelte.ts:tagsStore.reset mcall
call src/lib/features/tags/tags.service.ts:167 in resetTags -> src/lib/features/tags/tags.service.ts:closeTagsTab call
## effects
ipc-call src/lib/features/tags/tags.service.ts:30 in buildTagIndex -> ipc:get_all_tags_v2 -> src-tauri/src/commands/vault.rs:638
fx src/lib/features/tags/tags.service.ts:91 timer-wrap.debounce args=() => { void runScheduledRebuild(); }, 300 as debouncedTrigger in debouncedTrigger
fx src/lib/features/tags/tags.service.ts:121 timer.setTimeout delay=0 in flushScheduledTagIndexRebuild
