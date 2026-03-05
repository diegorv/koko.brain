<script lang="ts">
	import { Plus, MoreHorizontal, Pencil, Trash2, Archive, GripVertical, ChevronDown, ChevronRight, CircleCheck, Hash } from 'lucide-svelte';
	import type { KanbanLane, KanbanItem } from './kanban.types';
	import KanbanCard from './KanbanCard.svelte';
	import KanbanWikilinkSuggestions from './KanbanWikilinkSuggestions.svelte';
	import * as ContextMenu from '$lib/components/ui/context-menu';

	interface Props {
		lane: KanbanLane;
		editingItemId: string | null;
		editingLaneId: string | null;
		focusedItemId?: string | null;
		collapsed?: boolean;
		laneWidth?: number;
		maxItems?: number;
		atLimit?: boolean;
		autoComplete?: boolean;
		tagColors?: Record<string, string>;
		disableDrag?: boolean;
		dragItemId?: string | null;
		isDragOver?: boolean;
		dropIndicatorIndex?: number;
		onWikilinkClick?: (target: string, heading?: string) => void;
		onAddItem: (laneId: string, text: string) => void;
		onToggleItem: (laneId: string, itemId: string) => void;
		onUpdateItem: (laneId: string, itemId: string, text: string) => void;
		onDeleteItem: (laneId: string, itemId: string) => void;
		onArchiveItem: (laneId: string, itemId: string) => void;
		onArchiveCompleted: (laneId: string) => void;
		onRenameLane: (laneId: string, title: string) => void;
		onDeleteLane: (laneId: string) => void;
		onToggleCollapse: (laneId: string) => void;
		onToggleAutoComplete: (laneId: string) => void;
		onSetMaxItems: (laneId: string, maxItems: number) => void;
		onSetTagColor?: (tag: string, color: string) => void;
		onRemoveTagColor?: (tag: string) => void;
		onLaneWidthChange?: (width: number) => void;
		onStartEditItem: (itemId: string) => void;
		onStopEditItem: () => void;
		onStartEditLane: (laneId: string) => void;
		onStopEditLane: () => void;
		onItemDragStart: (e: DragEvent, laneId: string, itemId: string) => void;
		onItemDragEnd: (e: DragEvent) => void;
		onItemDragOver: (e: DragEvent, laneId: string) => void;
		onItemDrop: (e: DragEvent, laneId: string) => void;
		onLaneDragStart: (e: DragEvent, laneId: string) => void;
		onLaneDragEnd: (e: DragEvent) => void;
	}

	let {
		lane,
		editingItemId,
		editingLaneId,
		focusedItemId = null,
		collapsed = false,
		laneWidth = 272,
		maxItems = 0,
		atLimit = false,
		autoComplete = false,
		tagColors = {},
		disableDrag = false,
		dragItemId = null,
		isDragOver = false,
		dropIndicatorIndex = -1,
		onWikilinkClick,
		onAddItem,
		onToggleItem,
		onUpdateItem,
		onDeleteItem,
		onArchiveItem,
		onArchiveCompleted,
		onRenameLane,
		onDeleteLane,
		onToggleCollapse,
		onToggleAutoComplete,
		onSetMaxItems,
		onSetTagColor,
		onRemoveTagColor,
		onLaneWidthChange,
		onStartEditItem,
		onStopEditItem,
		onStartEditLane,
		onStopEditLane,
		onItemDragStart,
		onItemDragEnd,
		onItemDragOver,
		onItemDrop,
		onLaneDragStart,
		onLaneDragEnd,
	}: Props = $props();

	let newItemText = $state('');
	let newItemCursorPos = $state(0);
	let newItemInput: HTMLInputElement | undefined = $state();
	let addSuggestionsRef: KanbanWikilinkSuggestions | undefined = $state();
	let laneTitle = $state('');
	let laneTitleInput: HTMLInputElement | undefined = $state();

	let isEditingTitle = $derived(editingLaneId === lane.id);

	function handleAddItem() {
		const trimmed = newItemText.trim();
		if (!trimmed) return;
		onAddItem(lane.id, trimmed);
		newItemText = '';
		newItemCursorPos = 0;
	}

	function handleAddItemKeydown(e: KeyboardEvent) {
		if (addSuggestionsRef?.handleKeydown(e)) return;
		if (e.key === 'Enter') {
			e.preventDefault();
			handleAddItem();
		}
	}

	function handleAddWikilinkSelect(filename: string, from: number, to: number) {
		newItemText = newItemText.substring(0, from) + `[[${filename}]]` + newItemText.substring(to);
		const newCursorPos = from + filename.length + 4;
		newItemCursorPos = newCursorPos;
		requestAnimationFrame(() => {
			newItemInput?.setSelectionRange(newCursorPos, newCursorPos);
		});
	}

	function updateAddCursorPos() {
		newItemCursorPos = newItemInput?.selectionStart ?? 0;
	}

	function handleTitleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			commitTitleEdit();
		} else if (e.key === 'Escape') {
			onStopEditLane();
		}
	}

	function commitTitleEdit() {
		const trimmed = laneTitle.trim();
		if (trimmed && trimmed !== lane.title) {
			onRenameLane(lane.id, trimmed);
		}
		onStopEditLane();
	}

	$effect(() => {
		if (isEditingTitle && laneTitleInput) {
			laneTitle = lane.title;
			laneTitleInput.focus();
			laneTitleInput.select();
		}
	});

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		onItemDragOver(e, lane.id);
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		onItemDrop(e, lane.id);
	}

	let hasCompleted = $derived(lane.items.some((i) => i.checked));

	// ── Lane width resize ───────────────────────────────────────

	const MIN_LANE_WIDTH = 200;
	const MAX_LANE_WIDTH = 500;

	let currentWidth = $state(0);
	let isResizing = $state(false);
	let resizeStartX = $state(0);
	let resizeStartWidth = $state(0);

	/** Sync currentWidth with the prop when not actively dragging */
	$effect(() => {
		if (!isResizing) currentWidth = laneWidth;
	});

	function handleResizeStart(e: PointerEvent) {
		e.stopPropagation();
		isResizing = true;
		resizeStartX = e.clientX;
		resizeStartWidth = currentWidth;
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
	}

	function handleResizeMove(e: PointerEvent) {
		if (!isResizing) return;
		const delta = e.clientX - resizeStartX;
		currentWidth = Math.max(MIN_LANE_WIDTH, Math.min(MAX_LANE_WIDTH, resizeStartWidth + delta));
	}

	function handleResizeEnd(_e: PointerEvent) {
		if (!isResizing) return;
		isResizing = false;
		onLaneWidthChange?.(currentWidth);
	}
</script>

<div
	class="group/lane relative flex h-full shrink-0 flex-col rounded-lg border bg-muted/30 transition-colors {isDragOver ? 'border-primary/50 bg-primary/5' : atLimit ? 'border-destructive/50' : 'border-border'}"
	style="width: {currentWidth}px"
	data-lane-id={lane.id}
	role="group"
	aria-label={lane.title}
>
	<!-- Lane header -->
	<div class="flex items-center gap-1 px-2 py-2">
		<button
			class="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
			onclick={() => onToggleCollapse(lane.id)}
			aria-label={collapsed ? 'Expand lane' : 'Collapse lane'}
		>
			{#if collapsed}
				<ChevronRight class="size-3.5" />
			{:else}
				<ChevronDown class="size-3.5" />
			{/if}
		</button>
		{#if !disableDrag}
			<div
				class="cursor-grab opacity-0 group-hover:opacity-60 active:cursor-grabbing"
				draggable="true"
				ondragstart={(e) => onLaneDragStart(e, lane.id)}
				ondragend={onLaneDragEnd}
				role="button"
				tabindex="-1"
				aria-label="Drag to reorder lane"
			>
				<GripVertical class="size-4 text-muted-foreground" />
			</div>
		{/if}

		{#if isEditingTitle}
			<input
				bind:this={laneTitleInput}
				bind:value={laneTitle}
				onkeydown={handleTitleKeydown}
				onblur={commitTitleEdit}
				class="flex-1 rounded border border-primary bg-background px-1 py-0.5 text-sm font-semibold outline-none"
			/>
		{:else}
			<ContextMenu.Root>
				<ContextMenu.Trigger>
					{#snippet children()}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<h3
							class="flex-1 cursor-default truncate px-1 text-sm font-semibold"
							ondblclick={() => onStartEditLane(lane.id)}
						>
							{lane.title}
						</h3>
					{/snippet}
				</ContextMenu.Trigger>
				<ContextMenu.Content class="w-48">
					<ContextMenu.Item onclick={() => onStartEditLane(lane.id)}>
						<Pencil class="mr-2 size-4" />
						Rename
					</ContextMenu.Item>
					<ContextMenu.Item onclick={() => onToggleAutoComplete(lane.id)}>
						<CircleCheck class="mr-2 size-4" />
						{autoComplete ? 'Disable' : 'Enable'} Auto-Complete
					</ContextMenu.Item>
					<ContextMenu.Sub>
						<ContextMenu.SubTrigger>
							<Hash class="mr-2 size-4" />
							Set Card Limit
						</ContextMenu.SubTrigger>
						<ContextMenu.SubContent>
							{#each [3, 5, 10, 15] as limit}
								<ContextMenu.Item onclick={() => onSetMaxItems(lane.id, limit)}>
									{limit} cards{maxItems === limit ? ' (current)' : ''}
								</ContextMenu.Item>
							{/each}
							<ContextMenu.Separator />
							<ContextMenu.Item onclick={() => onSetMaxItems(lane.id, 0)}>
								No limit{maxItems === 0 ? ' (current)' : ''}
							</ContextMenu.Item>
						</ContextMenu.SubContent>
					</ContextMenu.Sub>
					{#if hasCompleted}
						<ContextMenu.Item onclick={() => onArchiveCompleted(lane.id)}>
							<Archive class="mr-2 size-4" />
							Archive Completed
						</ContextMenu.Item>
					{/if}
					<ContextMenu.Separator />
					<ContextMenu.Item onclick={() => onDeleteLane(lane.id)} class="text-destructive">
						<Trash2 class="mr-2 size-4" />
						Delete Lane
					</ContextMenu.Item>
				</ContextMenu.Content>
			</ContextMenu.Root>
		{/if}

		{#if autoComplete}
			<CircleCheck class="size-3.5 text-green-500" />
		{/if}
		<span class="text-xs {atLimit ? 'font-semibold text-destructive' : 'text-muted-foreground'}">
			{lane.items.length}{#if maxItems > 0}/{maxItems}{/if}
		</span>
	</div>

	{#if !collapsed}
		<!-- Card list (scrollable drop zone) -->
		<div
			class="flex flex-1 flex-col gap-1.5 overflow-y-auto px-2 pb-2"
			ondragover={handleDragOver}
			ondrop={handleDrop}
			role="list"
		>
			{#each lane.items as item, i (item.id)}
				{#if isDragOver && dropIndicatorIndex === i}
					<div class="h-0.5 rounded-full bg-primary" aria-hidden="true"></div>
				{/if}
				<KanbanCard
					{item}
					laneId={lane.id}
					isEditing={editingItemId === item.id}
					isFocused={focusedItemId === item.id}
					isDragging={dragItemId === item.id}
					{tagColors}
					{onWikilinkClick}
					{onSetTagColor}
					{onRemoveTagColor}
					{disableDrag}
					onToggle={() => onToggleItem(lane.id, item.id)}
					onUpdate={(text) => onUpdateItem(lane.id, item.id, text)}
					onDelete={() => onDeleteItem(lane.id, item.id)}
					onArchive={() => onArchiveItem(lane.id, item.id)}
					onStartEdit={() => onStartEditItem(item.id)}
					onStopEdit={onStopEditItem}
					onDragStart={(e) => onItemDragStart(e, lane.id, item.id)}
					onDragEnd={onItemDragEnd}
				/>
			{/each}
			{#if isDragOver && dropIndicatorIndex >= lane.items.length}
				<div class="h-0.5 rounded-full bg-primary" aria-hidden="true"></div>
			{/if}

			<!-- Add card input -->
			<form
				onsubmit={(e) => { e.preventDefault(); handleAddItem(); }}
				class="flex items-center gap-1 pt-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover/lane:opacity-100"
			>
				<div class="relative flex-1">
					<input
						bind:this={newItemInput}
						bind:value={newItemText}
						onkeydown={handleAddItemKeydown}
						oninput={updateAddCursorPos}
						onclick={updateAddCursorPos}
						placeholder="Add a card..."
						class="w-full rounded border border-border bg-background px-2 py-1 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-primary"
					/>
					<KanbanWikilinkSuggestions
						bind:this={addSuggestionsRef}
						text={newItemText}
						cursorPos={newItemCursorPos}
						onSelect={handleAddWikilinkSelect}
					/>
				</div>
				<button
					type="submit"
					class="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
					aria-label="Add card"
					disabled={!newItemText.trim()}
				>
					<Plus class="size-4" />
				</button>
			</form>
		</div>
	{/if}

	<!-- Lane resize handle -->
	{#if onLaneWidthChange}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="absolute right-0 top-0 h-full w-1.5 cursor-col-resize rounded-r-lg opacity-0 transition-opacity hover:bg-primary/30 group-hover/lane:opacity-60 {isResizing ? 'opacity-100 bg-primary/30' : ''}"
			onpointerdown={handleResizeStart}
			onpointermove={handleResizeMove}
			onpointerup={handleResizeEnd}
			role="separator"
			aria-label="Resize lane"
		></div>
	{/if}
</div>
