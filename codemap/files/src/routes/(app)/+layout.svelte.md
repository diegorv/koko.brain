# file card src/routes/(app)/+layout.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/routes/(app)/+layout.svelte ' codemap/files
file src/routes/(app)/+layout.svelte component L187 module src/routes in0 t0
## imports
imp src/routes/(app)/+layout.svelte:4 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/routes/(app)/+layout.svelte:5 -> src/lib/core/settings/theme.service.ts applyStoredTheme
imp src/routes/(app)/+layout.svelte:6 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/routes/(app)/+layout.svelte:7 -> src/lib/features/search/search.store.svelte.ts searchStore
imp src/routes/(app)/+layout.svelte:8 -> src/lib/features/search/search.service.ts performSearch
imp src/routes/(app)/+layout.svelte:9 -> src/lib/app/global-keybindings.ts registerGlobalKeybindings
imp src/routes/(app)/+layout.svelte:10 -> src/lib/app/lifecycle/app-lifecycle.service.ts initializeVault,teardownVault
imp src/routes/(app)/+layout.svelte:11 -> src/lib/app/tauri-listeners.service.ts registerMenuSettingsListener,registerCloseHandler,registerExitRequestListener,registerFocusListener,registerVaultIndexUpdatedListener
imp src/routes/(app)/+layout.svelte:12 -> src/lib/features/deep-link/deep-link.service.ts registerDeepLinkListener
imp src/routes/(app)/+layout.svelte:13 -> src/lib/core/frontmatter/properties.logic.ts configurePropertiesDiagnostics
imp src/routes/(app)/+layout.svelte:14 -> src/lib/app/boot.ts registerAppPorts
imp src/routes/(app)/+layout.svelte:15 -> src/lib/plugins/quick-capture/quick-capture.service.ts registerQuickCaptureListener
imp src/routes/(app)/+layout.svelte:16 -> src/lib/features/backlinks/backlinks.service.ts fetchBacklinksV2
imp src/routes/(app)/+layout.svelte:17 -> src/lib/features/backlinks/backlinks.store.svelte.ts backlinksStore
imp src/routes/(app)/+layout.svelte:18 -> src/lib/features/outgoing-links/outgoing-links.store.svelte.ts outgoingLinksStore
imp src/routes/(app)/+layout.svelte:19 -> src/lib/app/lifecycle/index-updater.service.ts updateIndexesForFile
imp src/routes/(app)/+layout.svelte:20 -> src/lib/core/editor/editor.logic.ts isVirtualTab
imp src/routes/(app)/+layout.svelte:21 -> src/lib/utils/debug.ts debug,perfStart,perfEnd,perfBaseline
imp src/routes/(app)/+layout.svelte:22 -> src/lib/utils/log.service.ts appendLog
imp src/routes/(app)/+layout.svelte:23 -> src/lib/app/AppOverlays.svelte default
imp src/routes/(app)/+layout.svelte:24 -> src/lib/app/AppShell.svelte default
## reach
in2 src/routes/(app)/+layout.svelte 0 files in 0 modules: -
out2 src/routes/(app)/+layout.svelte 137 files in 45 modules: src/lib/features/rail-shell(11) src/lib/core/settings(9) src/lib/core/filesystem(7) src/lib/features/properties(7) src/lib/features/search(7) +40 modules
## symbols
sym src/routes/(app)/+layout.svelte:1 component +layout props:children L187
## mounts
mount src/routes/(app)/+layout.svelte:183 AppOverlays -> src/lib/app/AppOverlays.svelte
mount src/routes/(app)/+layout.svelte:185 AppShell -> src/lib/app/AppShell.svelte
## calls
call src/routes/(app)/+layout.svelte:28 in (script) -> src/lib/app/boot.ts:registerAppPorts call
call src/routes/(app)/+layout.svelte:31 in (script) -> src/lib/core/frontmatter/properties.logic.ts:configurePropertiesDiagnostics call
call src/routes/(app)/+layout.svelte:31 in (script) -> src/lib/utils/log.service.ts:appendLog ref
call src/routes/(app)/+layout.svelte:36 in (script) -> src/lib/core/settings/theme.service.ts:applyStoredTheme call
call src/routes/(app)/+layout.svelte:42 in $effect@41 -> src/lib/app/global-keybindings.ts:registerGlobalKeybindings call
call src/routes/(app)/+layout.svelte:47 in $effect@46 -> src/lib/app/tauri-listeners.service.ts:registerMenuSettingsListener call
call src/routes/(app)/+layout.svelte:51 in $effect@50 -> src/lib/app/tauri-listeners.service.ts:registerCloseHandler call
call src/routes/(app)/+layout.svelte:55 in $effect@54 -> src/lib/app/tauri-listeners.service.ts:registerExitRequestListener call
call src/routes/(app)/+layout.svelte:59 in $effect@58 -> src/lib/features/deep-link/deep-link.service.ts:registerDeepLinkListener call
call src/routes/(app)/+layout.svelte:63 in $effect@62 -> src/lib/plugins/quick-capture/quick-capture.service.ts:registerQuickCaptureListener call
call src/routes/(app)/+layout.svelte:67 in $effect@66 -> src/lib/app/tauri-listeners.service.ts:registerFocusListener call
call src/routes/(app)/+layout.svelte:71 in $effect@70 -> src/lib/app/tauri-listeners.service.ts:registerVaultIndexUpdatedListener call
call src/routes/(app)/+layout.svelte:81 in $effect@75 -> src/lib/app/lifecycle/app-lifecycle.service.ts:initializeVault call
call src/routes/(app)/+layout.svelte:86 in $effect@75 -> src/lib/app/lifecycle/app-lifecycle.service.ts:teardownVault call
call src/routes/(app)/+layout.svelte:107 in $effect@105 -> src/lib/utils/debug.ts:perfStart call +1
call src/routes/(app)/+layout.svelte:108 in $effect@105 -> src/lib/utils/debug.ts:debug call
call src/routes/(app)/+layout.svelte:113 in $effect@105 -> src/lib/core/editor/editor.logic.ts:isVirtualTab call
call src/routes/(app)/+layout.svelte:114 in $effect@105 -> src/lib/utils/debug.ts:perfEnd call +4
call src/routes/(app)/+layout.svelte:122 in $effect@105 -> src/lib/features/backlinks/backlinks.store.svelte.ts:backlinksStore.setLinkedMentions mcall
call src/routes/(app)/+layout.svelte:123 in $effect@105 -> src/lib/features/backlinks/backlinks.store.svelte.ts:backlinksStore.setUnlinkedMentions mcall
call src/routes/(app)/+layout.svelte:124 in $effect@105 -> src/lib/features/outgoing-links/outgoing-links.store.svelte.ts:outgoingLinksStore.reset mcall
call src/routes/(app)/+layout.svelte:129 in $effect@105 -> src/lib/features/backlinks/backlinks.service.ts:fetchBacklinksV2 call
call src/routes/(app)/+layout.svelte:132 in $effect@105 -> src/lib/features/backlinks/backlinks.store.svelte.ts:backlinksStore.markUnlinkedDirty mcall
call src/routes/(app)/+layout.svelte:134 in $effect@105 -> src/lib/utils/debug.ts:perfBaseline call
call src/routes/(app)/+layout.svelte:154 in $effect@147 -> src/lib/core/editor/editor.logic.ts:isVirtualTab call
call src/routes/(app)/+layout.svelte:158 in $effect@147 -> src/lib/utils/debug.ts:perfStart call
call src/routes/(app)/+layout.svelte:161 in $effect@147 -> src/lib/utils/debug.ts:perfEnd call
call src/routes/(app)/+layout.svelte:162 in $effect@147 -> src/lib/app/lifecycle/index-updater.service.ts:updateIndexesForFile call
call src/routes/(app)/+layout.svelte:176 in $effect@170 -> src/lib/features/search/search.service.ts:performSearch call
## effects
fx src/routes/(app)/+layout.svelte:41 svelte.$effect in (script)
fx src/routes/(app)/+layout.svelte:46 svelte.$effect in (script)
fx src/routes/(app)/+layout.svelte:50 svelte.$effect in (script)
fx src/routes/(app)/+layout.svelte:54 svelte.$effect in (script)
fx src/routes/(app)/+layout.svelte:58 svelte.$effect in (script)
fx src/routes/(app)/+layout.svelte:62 svelte.$effect in (script)
fx src/routes/(app)/+layout.svelte:66 svelte.$effect in (script)
fx src/routes/(app)/+layout.svelte:70 svelte.$effect in (script)
fx src/routes/(app)/+layout.svelte:75 svelte.$effect in (script)
fx src/routes/(app)/+layout.svelte:105 svelte.$effect in (script)
fx src/routes/(app)/+layout.svelte:110 timer.setTimeout delay=150 in $effect@105
fx src/routes/(app)/+layout.svelte:147 svelte.$effect in (script)
fx src/routes/(app)/+layout.svelte:159 timer.setTimeout delay=1000 in $effect@147
fx src/routes/(app)/+layout.svelte:170 svelte.$effect in (script)
fx src/routes/(app)/+layout.svelte:175 timer.setTimeout delay=200 in $effect@170
