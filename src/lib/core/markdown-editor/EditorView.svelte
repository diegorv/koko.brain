<script lang="ts">
	import { Code, Eye, Table, FileText, LayoutDashboard, Kanban } from 'lucide-svelte';
	import { editorStore } from '$lib/core/editor/editor.store.svelte';
	import { onContentChange } from '$lib/core/editor/editor.service';
	import EditorTabs from './EditorTabs.svelte';
	import MarkdownEditor from './MarkdownEditor.svelte';
	import CollectionView from '$lib/features/collection/CollectionView.svelte';
	import TasksView from '$lib/features/tasks/TasksView.svelte';
	import GraphView from '$lib/plugins/graph-view/GraphView.svelte';
	import CanvasView from '$lib/features/canvas/CanvasView.svelte';
	import KanbanView from '$lib/plugins/kanban/KanbanView.svelte';
	import { isVirtualTab } from '$lib/core/editor/editor.logic';

	/** Whether the .collection file is shown in source (YAML) mode vs table view */
	let collectionSourceMode = $state(false);
	/** Whether the .canvas file is shown in source (JSON) mode vs canvas view */
	let canvasSourceMode = $state(false);
	/** Whether the .kanban file is shown in source (markdown) mode vs board view */
	let kanbanSourceMode = $state(false);

	let isCollectionTab = $derived(editorStore.activeTab?.fileType === 'collection');
	let isCanvasTab = $derived(editorStore.activeTab?.fileType === 'canvas');
	let isKanbanTab = $derived(editorStore.activeTab?.fileType === 'kanban');
	let isTasksTab = $derived(editorStore.activeTab?.fileType === 'tasks');
	let isGraphTab = $derived(editorStore.activeTab?.fileType === 'graph');
	let isVirtual = $derived(editorStore.activeTab ? isVirtualTab(editorStore.activeTab) : false);

	// Reset source mode when switching tabs
	$effect(() => {
		void editorStore.activeTabPath;
		collectionSourceMode = false;
		canvasSourceMode = false;
		kanbanSourceMode = false;
	});
</script>

<div class="flex h-full flex-col">
	{#if editorStore.activeTab}
		<EditorTabs />
		<div class="relative flex-1 min-h-0 bg-card">
			{#if isTasksTab}
				<TasksView />
			{:else if isGraphTab}
				<GraphView />
			{:else if isKanbanTab && !kanbanSourceMode}
				<KanbanView markdownContent={editorStore.activeTab.content} {onContentChange} />
			{:else if isCanvasTab && !canvasSourceMode}
				<CanvasView jsonContent={editorStore.activeTab.content} onJsonChange={onContentChange} />
			{:else if isCollectionTab && !collectionSourceMode}
				<CollectionView yamlContent={editorStore.activeTab.content} onYamlChange={onContentChange} />
			{:else}
				<MarkdownEditor />
			{/if}
			{#if !isVirtual}
				{#if isKanbanTab}
					<button
						class="absolute bottom-3 right-3 z-10 rounded-md border border-border bg-background/80 p-1.5 text-muted-foreground backdrop-blur-sm hover:bg-muted hover:text-foreground transition-colors"
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
					<button
						class="absolute bottom-3 right-3 z-10 rounded-md border border-border bg-background/80 p-1.5 text-muted-foreground backdrop-blur-sm hover:bg-muted hover:text-foreground transition-colors"
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
						class="absolute bottom-3 right-3 z-10 rounded-md border border-border bg-background/80 p-1.5 text-muted-foreground backdrop-blur-sm hover:bg-muted hover:text-foreground transition-colors"
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
				{:else}
					<button
						class="absolute bottom-3 right-3 z-10 rounded-md border border-border bg-background/80 p-1.5 text-muted-foreground backdrop-blur-sm hover:bg-muted hover:text-foreground transition-colors"
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
		<div class="h-10 shrink-0 bg-tab-bar" data-tauri-drag-region></div>
		<div class="flex flex-1 items-center justify-center bg-editor-empty-bg">
			<p class="text-sm text-muted-foreground">Select a file to view its contents</p>
		</div>
	{/if}
</div>
