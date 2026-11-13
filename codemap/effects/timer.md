# effects timer: one fx line per site, by sink, file, line
cols: fx <loc> <sink> [<arg>] in <enclosing> · grep: grep -F -- ' <sink> ' codemap/effects/timer.md
fx src-tauri/src/commands/semantic.rs:325 rust-timer.sleep in schedule_reranker_unload
fx src-tauri/src/commands/semantic.rs:337 rust-timer.sleep in schedule_embedder_unload
fx src-tauri/src/quick_capture/commands.rs:380 rust-timer.sleep in schedule_refocus_after_space_move
fx src-tauri/src/utils/main_heartbeat.rs:47 rust-timer.sleep in run_heartbeat
fx src-tauri/src/utils/resource_usage.rs:172 rust-timer.sleep in ensure_periodic_sampler
fx src/lib/app/lifecycle/app-lifecycle.service.ts:514 timer-wrap.debounce args=() => { runWatcherBatch().catch((err) => { error('LIFECYCLE… in initializeVault
fx src/lib/core/editor/editor.service.ts:276 timer-wrap.debounce args=saveDirtyTabs, 2000, { maxWait: 10_000 } as debouncedSave in debouncedSave
fx src/lib/core/editor/editor.service.ts:279 timer-wrap.debounce args=saveDirtyTabs, 500 as debouncedSaveFrontmatter in debouncedSaveFrontmatter
fx src/lib/features/rail-shell/TypesNavigator.svelte:88 timer-wrap.debounce args=async (paths: string[], ctx: LensContext, propertyIndex: Ma… as recountViews in recountViews
fx src/lib/features/tags/tags.service.ts:90 timer-wrap.debounce args=() => { void runScheduledRebuild(); }, 300 as debouncedTrigger in debouncedTrigger
fx src/lib/features/canvas/CanvasInner.svelte:110 timer.queueMicrotask in $effect@97
fx src/lib/features/canvas/CanvasInner.svelte:300 timer.queueMicrotask in handleKeydown
fx src/lib/features/canvas/CanvasInner.svelte:314 timer.queueMicrotask in handleKeydown
fx src/lib/features/collection/CollectionView.svelte:439 timer.queueMicrotask in handleAddView
fx src/lib/features/properties/RelationshipSearch.svelte:41 timer.queueMicrotask in (markup)
fx src/routes/composer/+page.svelte:185 timer.queueMicrotask in resetForShow
fx src/lib/app/AppShell.svelte:85 timer.requestAnimationFrame in (script)
fx src/lib/app/AppShell.svelte:86 timer.requestAnimationFrame in (script)
fx src/lib/core/markdown-editor/MarkdownEditor.svelte:418 timer.requestAnimationFrame in (script)
fx src/lib/core/markdown-editor/MarkdownEditor.svelte:566 timer.requestAnimationFrame in $effect@455
fx src/lib/core/markdown-editor/MarkdownEditor.svelte:572 timer.requestAnimationFrame in $effect@455
fx src/lib/core/markdown-editor/MarkdownEditor.svelte:579 timer.requestAnimationFrame in $effect@455
fx src/lib/core/markdown-editor/MarkdownEditor.svelte:600 timer.requestAnimationFrame in $effect@591
fx src/lib/core/markdown-editor/MarkdownEditor.svelte:601 timer.requestAnimationFrame in $effect@591
fx src/lib/features/canvas/CanvasFilePicker.svelte:43 timer.requestAnimationFrame in $effect@41
fx src/lib/features/canvas/CanvasLinkInput.svelte:43 timer.requestAnimationFrame in $effect@41
fx src/lib/features/canvas/LinkNode.svelte:48 timer.requestAnimationFrame in startEditing
fx src/lib/features/canvas/TextNode.svelte:24 timer.requestAnimationFrame in $effect@20
fx src/lib/features/canvas/TextNode.svelte:31 timer.requestAnimationFrame in startEditing
fx src/lib/features/collection/CollectionView.svelte:465 timer.requestAnimationFrame in startTabRename
fx src/lib/features/collection/toolbar/PropertiesPanel.svelte:68 timer.requestAnimationFrame in handleAddFormula
fx src/lib/features/note-list/NoteRowMenu.svelte:120 timer.requestAnimationFrame in $effect@109
fx src/lib/features/rail-shell/FilesNavigator.svelte:154 timer.requestAnimationFrame in focusRenameInput
fx src/lib/plugins/kanban/KanbanCard.svelte:83 timer.requestAnimationFrame in handleWikilinkSelect
fx src/lib/plugins/kanban/KanbanLane.svelte:131 timer.requestAnimationFrame in handleAddWikilinkSelect
fx src/lib/plugins/queryjs/queryjs-block-widget.ts:57 timer.requestAnimationFrame in markAutoRunAfterRenderPass
fx src/lib/utils/log.service.ts:198 timer.requestAnimationFrame in logClickToPaint
fx src/lib/features/event-calendar/event-calendar.service.ts:313 timer.setInterval delay=CLOCK_INTERVAL_MS in acquireCalendarClock
fx src/lib/utils/log.service.ts:135 timer.setInterval delay=HEARTBEAT_MS in startHeartbeat
fx src/lib/app/lifecycle/app-lifecycle.service.ts:429 timer.setTimeout delay=0 in initializeVault
fx src/lib/app/lifecycle/app-lifecycle.service.ts:469 timer.setTimeout delay=SEMANTIC_INIT_DEFER_MS in initializeVault
fx src/lib/app/lifecycle/app-lifecycle.service.ts:540 timer.setTimeout delay=0 in initializeVault
fx src/lib/app/tauri-listeners.service.ts:284 timer.setTimeout delay=wait in registerVaultIndexUpdatedListener
fx src/lib/core/editor/editor.hooks.ts:40 timer.setTimeout delay=RECENT_SAVE_TIMEOUT_MS in markRecentSave
fx src/lib/core/editor/editor.service.ts:267 timer.setTimeout delay=SAVE_RETRY_DELAY_MS in saveDirtyTabs
fx src/lib/core/filesystem/note-change.service.ts:165 timer.setTimeout delay=0 in yieldToEventLoop
fx src/lib/core/markdown-editor/extensions/live-preview/core/scroll-debounce-plugin.ts:34 timer.setTimeout delay=150 in scrollDebouncePlugin
fx src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts:97 timer.setTimeout delay=1500 in CodeBlockWidget.toDOM
fx src/lib/core/settings/settings-persistence.svelte.ts:72 timer.setTimeout delay=PERSIST_DEBOUNCE_MS in $effect@66
fx src/lib/core/settings/theme-catalog.service.ts:26 timer.setTimeout delay=THEME_CATALOG_TIMEOUT_MS in fetchThemeCatalog
fx src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:94 timer.setTimeout delay=COUNT_DELAY_MS in $effect@92
fx src/lib/features/auto-organize/AutoOrganizeSection.svelte:44 timer.setTimeout delay=500 in saveConfigDebounced
fx src/lib/features/auto-organize/auto-organize.service.ts:225 timer.setTimeout delay=settingsStore.autoOrganize.de… in registerAutoOrganizeHook
fx src/lib/features/canvas/CanvasInner.svelte:236 timer.setTimeout delay=300 in $effect@227
fx src/lib/features/event-calendar/EventCalendarView.svelte:195 timer.setTimeout delay=PULSE_MS in pulse
fx src/lib/features/properties/PropertiesView.svelte:110 timer.setTimeout delay=300 in $effect@105
fx src/lib/features/rail-shell/RailListSearch.svelte:67 timer.setTimeout delay=DEBOUNCE_MS in handleInput
fx src/lib/features/search/search.service.ts:101 timer.setTimeout delay=PROGRESS_THROTTLE_MS in startSemanticProgressListener
fx src/lib/features/tags/tags.service.ts:120 timer.setTimeout delay=0 in flushScheduledTagIndexRebuild
fx src/lib/features/todoist-sync/sync-scheduler.service.ts:95 timer.setTimeout delay=SAVE_DELAY_MS in startAutoSync
fx src/lib/features/todoist-sync/sync-scheduler.service.ts:166 timer.setTimeout delay=settingsStore.todoist.syncInt… in scheduleInterval
fx src/lib/features/todoist-sync/sync-scheduler.service.ts:186 timer.setTimeout delay=wait in requestAutoCycle
fx src/lib/plugins/mods/mods-host.service.ts:636 timer.setTimeout delay=0 in createModContext
fx src/lib/plugins/mods/mods-host.service.ts:663 timer.setTimeout delay=0 in createModContext
fx src/lib/plugins/mods/mods-host.service.ts:685 timer.setTimeout delay=0 in createModContext
fx src/lib/plugins/queryjs/queryjs-block-widget.ts:53 timer.setTimeout delay=0 in markAutoRunAfterRenderPass
fx src/lib/plugins/word-count/WordCount.svelte:20 timer.setTimeout delay=500 in $effect@17
fx src/lib/utils/debounce.ts:38 timer.setTimeout delay=delay in debounce
fx src/lib/utils/debounce.ts:40 timer.setTimeout delay=options.maxWait in debounce
fx src/lib/utils/log.service.ts:87 timer.setTimeout delay=LOG_FLUSH_MS in appendLog
fx src/lib/utils/log.service.ts:195 timer.setTimeout delay=0 in logClickToPaint
fx src/routes/(app)/+layout.svelte:110 timer.setTimeout delay=150 in $effect@105
fx src/routes/(app)/+layout.svelte:159 timer.setTimeout delay=1000 in $effect@147
fx src/routes/(app)/+layout.svelte:175 timer.setTimeout delay=200 in $effect@170
fx src/routes/composer/+page.svelte:79 timer.setTimeout delay=RESULT_TIMEOUT_MS in waitForResult
fx src/routes/composer/+page.svelte:144 timer.setTimeout delay=SAVE_FLASH_MS in handleSave
