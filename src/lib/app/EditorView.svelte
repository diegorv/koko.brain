<script lang="ts">
	import Code from '@lucide/svelte/icons/code';
	import Eye from '@lucide/svelte/icons/eye';
	import Table from '@lucide/svelte/icons/table';
	import FileText from '@lucide/svelte/icons/file-text';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import Kanban from '@lucide/svelte/icons/kanban';
	import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { onContentChange, onContentChangeForPath } from '#lib/core/editor/editor.service.js';
	import EditorTabs from '#lib/core/markdown-editor/EditorTabs.svelte';
	import MarkdownEditor from '#lib/core/markdown-editor/MarkdownEditor.svelte';
	import { appBlockLinks, appEditorHost, appFencedBlockRenderers, openWikilinkTarget } from '#lib/app/editor-host.js';
	import CollectionView from '#lib/features/collection/CollectionView.svelte';
	import { rewriteViewFile } from '#lib/features/type-definitions/type-definitions.service.js';
	import TasksView from '#lib/features/tasks/TasksView.svelte';
	import TagsView from '#lib/features/tags/TagsView.svelte';
	import GraphView from '#lib/plugins/graph-view/GraphView.svelte';
	import CanvasView from '#lib/features/canvas/CanvasView.svelte';
	import KanbanView from '#lib/plugins/kanban/KanbanView.svelte';
	import EventCalendarView from '#lib/features/event-calendar/EventCalendarView.svelte';
	import NoteActionBar from '#lib/features/note-action-bar/NoteActionBar.svelte';
	import { showTableOfContents } from '#lib/plugins/table-of-contents/toc.service.js';
	import { resolveIconForPath } from '#lib/features/file-icons/icon-resolver.js';
	import { iconColorStyle } from '#lib/features/file-icons/file-icons.logic.js';
	import IconRenderer from '#lib/features/file-icons/IconRenderer.svelte';
	import { isMarkdownNoteTab, isVirtualTab } from '#lib/core/editor/editor.logic.js';
	import type { EditorTab } from '#lib/core/editor/editor.types.js';

	/** Whether the `.view` file is shown in source (YAML) mode vs table view */
	let collectionSourceMode = $state(false);
	/** Whether the .canvas file is shown in source (JSON) mode vs canvas view */
	let canvasSourceMode = $state(false);
	/** Whether the .kanban file is shown in source (markdown) mode vs board view */
	let kanbanSourceMode = $state(false);

	let isCollectionTab = $derived(editorStore.activeTab?.fileType === 'collection');
	let isCanvasTab = $derived(editorStore.activeTab?.fileType === 'canvas');
	let isKanbanTab = $derived(editorStore.activeTab?.fileType === 'kanban');
	let isTasksTab = $derived(editorStore.activeTab?.fileType === 'tasks');
	let isTagsTab = $derived(editorStore.activeTab?.fileType === 'tags');
	let isGraphTab = $derived(editorStore.activeTab?.fileType === 'graph');
	let isEventCalendarTab = $derived(editorStore.activeTab?.fileType === 'event-calendar');
	let isVirtual = $derived(editorStore.activeTab ? isVirtualTab(editorStore.activeTab) : false);
	let isMarkdownNote = $derived(editorStore.activeTab ? isMarkdownNoteTab(editorStore.activeTab) : false);

	// Reset source mode when switching tabs
	$effect(() => {
		void editorStore.activeTabPath;
		collectionSourceMode = false;
		canvasSourceMode = false;
		kanbanSourceMode = false;
	});
</script>

{#snippet fileTabIcon(tab: EditorTab)}
	{@const resolved = resolveIconForPath(tab.path)}
	{#if resolved?.icon}
		<IconRenderer icon={resolved.icon} class="size-3.5 shrink-0" color={resolved.color} />
	{:else}
		<FileText class="size-3.5 shrink-0 text-muted-foreground" style={iconColorStyle(resolved?.color)} />
	{/if}
{/snippet}

<div class="flex h-full flex-col">
	{#if editorStore.activeTab}
		<EditorTabs tabIcon={fileTabIcon} tabTitleColor={(path) => resolveIconForPath(path)?.titleColor} />
		{#if isMarkdownNote}
			<NoteActionBar path={editorStore.activeTab.path} onShowTableOfContents={showTableOfContents} />
		{/if}
		<div class="relative flex-1 min-h-0 bg-editor-bg">
			{#if isTasksTab}
				<TasksView onOpenWikilink={openWikilinkTarget} />
			{:else if isTagsTab}
				<TagsView />
			{:else if isGraphTab}
				<GraphView />
			{:else if isEventCalendarTab}
				<EventCalendarView />
			{:else if isKanbanTab && !kanbanSourceMode}
				<KanbanView markdownContent={editorStore.activeTab.content} {onContentChange} onOpenWikilink={openWikilinkTarget} />
			{:else if isCanvasTab && !canvasSourceMode}
				<!-- One instance per file, persisting by path: its debounce and destroy flush run after the active tab moved. -->
				{#key editorStore.activeTab.path}
					<CanvasView path={editorStore.activeTab.path} jsonContent={editorStore.activeTab.content} onJsonChange={onContentChangeForPath} />
				{/key}
			{:else if isCollectionTab && !collectionSourceMode}
				<!-- One instance per file: a shared one carried its view tab and toolbar state across files. -->
				{#key editorStore.activeTab.path}
					<CollectionView path={editorStore.activeTab.path} yamlContent={editorStore.activeTab.content} onYamlChange={onContentChange} rewriteView={rewriteViewFile} />
				{/key}
			{:else}
				<MarkdownEditor host={appEditorHost} renderers={appFencedBlockRenderers} blockLinks={appBlockLinks} />
			{/if}
			{#if !isVirtual}
				{#if isKanbanTab}
					<button
						class="absolute bottom-3 right-3 z-10 rounded-md border border-border bg-background/80 p-1.5 text-muted-foreground backdrop-blur-sm hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
						onclick={() => kanbanSourceMode = !kanbanSourceMode}
						aria-label={kanbanSourceMode ? 'Switch to board view' : 'Switch to source mode'}
						title={kanbanSourceMode ? 'Board view' : 'Source mode'}
					>
						{#if kanbanSourceMode}
							<Kanban class="size-4" />
						{:else}
							<FileText class="size-4" />
						{/if}
					</button>
				{:else if isCanvasTab}
					<!-- Top right: the canvas minimap takes the bottom-right corner. -->
					<button
						class="absolute top-3 right-3 z-10 rounded-md border border-border bg-background/80 p-1.5 text-muted-foreground backdrop-blur-sm hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
						onclick={() => canvasSourceMode = !canvasSourceMode}
						aria-label={canvasSourceMode ? 'Switch to canvas view' : 'Switch to source mode'}
						title={canvasSourceMode ? 'Canvas view' : 'Source mode'}
					>
						{#if canvasSourceMode}
							<LayoutDashboard class="size-4" />
						{:else}
							<FileText class="size-4" />
						{/if}
					</button>
				{:else if isCollectionTab}
					<button
						class="absolute bottom-3 right-3 z-10 rounded-md border border-border bg-background/80 p-1.5 text-muted-foreground backdrop-blur-sm hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
						onclick={() => collectionSourceMode = !collectionSourceMode}
						aria-label={collectionSourceMode ? 'Switch to table view' : 'Switch to source mode'}
						title={collectionSourceMode ? 'Table view' : 'Source mode'}
					>
						{#if collectionSourceMode}
							<Table class="size-4" />
						{:else}
							<FileText class="size-4" />
						{/if}
					</button>
				{:else if !isMarkdownNote}
					<!-- A Markdown note toggles from the action bar's Raw button instead. -->
					<button
						class="absolute bottom-3 right-3 z-10 rounded-md border border-border bg-background/80 p-1.5 text-muted-foreground backdrop-blur-sm hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
						onclick={() => editorStore.setLivePreview(!editorStore.isLivePreview)}
						aria-label={editorStore.isLivePreview ? 'Switch to source mode' : 'Switch to live preview'}
						title={editorStore.isLivePreview ? 'Source mode' : 'Live preview'}
					>
						{#if editorStore.isLivePreview}
							<Code class="size-4" />
						{:else}
							<Eye class="size-4" />
						{/if}
					</button>
				{/if}
			{/if}
		</div>
	{:else}
		<div class="h-10 shrink-0 bg-tab-bar" style="box-shadow: inset 0 -1px 0 var(--divider)" data-tauri-drag-region></div>
		<div class="flex flex-1 items-center justify-center bg-editor-empty-bg">
			<p class="text-sm text-muted-foreground">Select a file to view its contents</p>
		</div>
	{/if}
</div>
