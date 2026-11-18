# file card src/routes/(app)/+layout.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/routes/(app)/+layout.svelte ' codemap/files
file src/routes/(app)/+layout.svelte component L192 module src/routes in0 t0
## imports
imp src/routes/(app)/+layout.svelte:4 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/routes/(app)/+layout.svelte:5 -> src/lib/core/settings/theme.service.ts applyStoredTheme
imp src/routes/(app)/+layout.svelte:6 -> src/lib/core/zoom/zoom.service.ts restoreZoom
imp src/routes/(app)/+layout.svelte:7 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/routes/(app)/+layout.svelte:8 -> src/lib/features/search/search.store.svelte.ts searchStore
imp src/routes/(app)/+layout.svelte:9 -> src/lib/features/search/search.service.ts performSearch
imp src/routes/(app)/+layout.svelte:10 -> src/lib/app/global-keybindings.ts registerGlobalKeybindings
imp src/routes/(app)/+layout.svelte:11 -> src/lib/app/lifecycle/app-lifecycle.service.ts initializeVault,teardownVault
imp src/routes/(app)/+layout.svelte:12 -> src/lib/app/tauri-listeners.service.ts registerMenuSettingsListener,registerCloseHandler,registerExitRequestListener,registerFocusListener,registerVaultIndexUpdatedListener
imp src/routes/(app)/+layout.svelte:13 -> src/lib/features/deep-link/deep-link.service.ts registerDeepLinkListener
imp src/routes/(app)/+layout.svelte:14 -> src/lib/core/frontmatter/properties.logic.ts configurePropertiesDiagnostics
imp src/routes/(app)/+layout.svelte:15 -> src/lib/app/boot.ts registerAppPorts
imp src/routes/(app)/+layout.svelte:16 -> src/lib/plugins/quick-capture/quick-capture.service.ts registerQuickCaptureListener
imp src/routes/(app)/+layout.svelte:17 -> src/lib/features/backlinks/backlinks.service.ts fetchBacklinksV2
imp src/routes/(app)/+layout.svelte:18 -> src/lib/features/backlinks/backlinks.store.svelte.ts backlinksStore
imp src/routes/(app)/+layout.svelte:19 -> src/lib/features/outgoing-links/outgoing-links.store.svelte.ts outgoingLinksStore
imp src/routes/(app)/+layout.svelte:20 -> src/lib/app/lifecycle/index-updater.service.ts updateIndexesForFile
imp src/routes/(app)/+layout.svelte:21 -> src/lib/core/editor/editor.logic.ts isVirtualTab
imp src/routes/(app)/+layout.svelte:22 -> src/lib/utils/debug.ts debug,error,perfStart,perfEnd,perfBaseline
imp src/routes/(app)/+layout.svelte:23 -> src/lib/utils/log.service.ts appendLog
imp src/routes/(app)/+layout.svelte:24 -> src/lib/app/AppOverlays.svelte default
imp src/routes/(app)/+layout.svelte:25 -> src/lib/app/AppShell.svelte default
## reach
in2 src/routes/(app)/+layout.svelte 0 files in 0 modules: -
out2 src/routes/(app)/+layout.svelte 138 files in 45 modules: src/lib/features/rail-shell(11) src/lib/core/settings(9) src/lib/core/filesystem(7) src/lib/features/properties(7) src/lib/features/search(7) +40 modules
## symbols
sym src/routes/(app)/+layout.svelte:1 component +layout props:children L192
## mounts
mount src/routes/(app)/+layout.svelte:188 AppOverlays -> src/lib/app/AppOverlays.svelte
mount src/routes/(app)/+layout.svelte:190 AppShell -> src/lib/app/AppShell.svelte
## calls
call src/routes/(app)/+layout.svelte:29 in (script) -> src/lib/app/boot.ts:registerAppPorts call
call src/routes/(app)/+layout.svelte:32 in (script) -> src/lib/core/frontmatter/properties.logic.ts:configurePropertiesDiagnostics call
call src/routes/(app)/+layout.svelte:32 in (script) -> src/lib/utils/log.service.ts:appendLog ref
call src/routes/(app)/+layout.svelte:37 in (script) -> src/lib/core/settings/theme.service.ts:applyStoredTheme call
call src/routes/(app)/+layout.svelte:41 in (script) -> src/lib/core/zoom/zoom.service.ts:restoreZoom call
call src/routes/(app)/+layout.svelte:41 in (script) -> src/lib/utils/debug.ts:error call
call src/routes/(app)/+layout.svelte:47 in $effect@46 -> src/lib/app/global-keybindings.ts:registerGlobalKeybindings call
call src/routes/(app)/+layout.svelte:52 in $effect@51 -> src/lib/app/tauri-listeners.service.ts:registerMenuSettingsListener call
call src/routes/(app)/+layout.svelte:56 in $effect@55 -> src/lib/app/tauri-listeners.service.ts:registerCloseHandler call
call src/routes/(app)/+layout.svelte:60 in $effect@59 -> src/lib/app/tauri-listeners.service.ts:registerExitRequestListener call
call src/routes/(app)/+layout.svelte:64 in $effect@63 -> src/lib/features/deep-link/deep-link.service.ts:registerDeepLinkListener call
call src/routes/(app)/+layout.svelte:68 in $effect@67 -> src/lib/plugins/quick-capture/quick-capture.service.ts:registerQuickCaptureListener call
call src/routes/(app)/+layout.svelte:72 in $effect@71 -> src/lib/app/tauri-listeners.service.ts:registerFocusListener call
call src/routes/(app)/+layout.svelte:76 in $effect@75 -> src/lib/app/tauri-listeners.service.ts:registerVaultIndexUpdatedListener call
call src/routes/(app)/+layout.svelte:86 in $effect@80 -> src/lib/app/lifecycle/app-lifecycle.service.ts:initializeVault call
call src/routes/(app)/+layout.svelte:91 in $effect@80 -> src/lib/app/lifecycle/app-lifecycle.service.ts:teardownVault call
call src/routes/(app)/+layout.svelte:112 in $effect@110 -> src/lib/utils/debug.ts:perfStart call +1
call src/routes/(app)/+layout.svelte:113 in $effect@110 -> src/lib/utils/debug.ts:debug call
call src/routes/(app)/+layout.svelte:118 in $effect@110 -> src/lib/core/editor/editor.logic.ts:isVirtualTab call
call src/routes/(app)/+layout.svelte:119 in $effect@110 -> src/lib/utils/debug.ts:perfEnd call +4
call src/routes/(app)/+layout.svelte:127 in $effect@110 -> src/lib/features/backlinks/backlinks.store.svelte.ts:backlinksStore.setLinkedMentions mcall
call src/routes/(app)/+layout.svelte:128 in $effect@110 -> src/lib/features/backlinks/backlinks.store.svelte.ts:backlinksStore.setUnlinkedMentions mcall
call src/routes/(app)/+layout.svelte:129 in $effect@110 -> src/lib/features/outgoing-links/outgoing-links.store.svelte.ts:outgoingLinksStore.reset mcall
call src/routes/(app)/+layout.svelte:134 in $effect@110 -> src/lib/features/backlinks/backlinks.service.ts:fetchBacklinksV2 call
call src/routes/(app)/+layout.svelte:137 in $effect@110 -> src/lib/features/backlinks/backlinks.store.svelte.ts:backlinksStore.markUnlinkedDirty mcall
call src/routes/(app)/+layout.svelte:139 in $effect@110 -> src/lib/utils/debug.ts:perfBaseline call
call src/routes/(app)/+layout.svelte:159 in $effect@152 -> src/lib/core/editor/editor.logic.ts:isVirtualTab call
call src/routes/(app)/+layout.svelte:163 in $effect@152 -> src/lib/utils/debug.ts:perfStart call
call src/routes/(app)/+layout.svelte:166 in $effect@152 -> src/lib/utils/debug.ts:perfEnd call
call src/routes/(app)/+layout.svelte:167 in $effect@152 -> src/lib/app/lifecycle/index-updater.service.ts:updateIndexesForFile call
call src/routes/(app)/+layout.svelte:181 in $effect@175 -> src/lib/features/search/search.service.ts:performSearch call
## effects
fx src/routes/(app)/+layout.svelte:46 svelte.$effect in (script)
fx src/routes/(app)/+layout.svelte:51 svelte.$effect in (script)
fx src/routes/(app)/+layout.svelte:55 svelte.$effect in (script)
fx src/routes/(app)/+layout.svelte:59 svelte.$effect in (script)
fx src/routes/(app)/+layout.svelte:63 svelte.$effect in (script)
fx src/routes/(app)/+layout.svelte:67 svelte.$effect in (script)
fx src/routes/(app)/+layout.svelte:71 svelte.$effect in (script)
fx src/routes/(app)/+layout.svelte:75 svelte.$effect in (script)
fx src/routes/(app)/+layout.svelte:80 svelte.$effect in (script)
fx src/routes/(app)/+layout.svelte:110 svelte.$effect in (script)
fx src/routes/(app)/+layout.svelte:115 timer.setTimeout delay=150 in $effect@110
fx src/routes/(app)/+layout.svelte:152 svelte.$effect in (script)
fx src/routes/(app)/+layout.svelte:164 timer.setTimeout delay=1000 in $effect@152
fx src/routes/(app)/+layout.svelte:175 svelte.$effect in (script)
fx src/routes/(app)/+layout.svelte:180 timer.setTimeout delay=200 in $effect@175
