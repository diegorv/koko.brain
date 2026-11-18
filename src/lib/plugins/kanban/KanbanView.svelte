<script lang="ts">
	import { untrack } from 'svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import Archive from '@lucide/svelte/icons/archive';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
	import Search from '@lucide/svelte/icons/search';
	import LayoutGrid from '@lucide/svelte/icons/layout-grid';
	import List from '@lucide/svelte/icons/list';
	import Table from '@lucide/svelte/icons/table';
	import X from '@lucide/svelte/icons/x';
	import { toast } from 'svelte-sonner';
	import * as Select from '#lib/components/ui/select/index.js';
	import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
	import {
		parseKanbanBoard,
		serializeKanbanBoard,
		addItem,
		removeItem,
		updateItem,
		toggleItem,
		moveItem,
		addLane,
		removeLane,
		renameLane,
		moveLane,
		archiveItem,
		archiveCompletedItems,
		restoreItem,
		isLaneCollapsed,
		toggleLaneCollapsed,
		DEFAULT_LANE_WIDTH,
		getLaneMaxItems,
		isLaneAtLimit,
		isLaneAutoComplete,
		setLaneAutoComplete,
		setLaneMaxItems,
		setTagColor,
		removeTagColor,
		updateBoardSettings,
		sortItems,
		setSortMode,
		filterItems,
		setViewMode,
		canReorderItems,
		uniqueLaneTitle,
		stripCardMetadata,
	} from './kanban.logic';
	import type { KanbanBoard, KanbanSortMode, KanbanViewMode } from './kanban.types';
	import { kanbanStore } from './kanban.store.svelte';
	import KanbanLane from './KanbanLane.svelte';
	import KanbanListView from './KanbanListView.svelte';
	import KanbanTableView from './KanbanTableView.svelte';

	interface Props {
		/** Raw markdown content of the kanban file */
		markdownContent: string;
		/** Callback to persist changes back to the editor tab */
		onContentChange: (markdown: string) => void;
		/** Opens a card's wikilink target the way an editor click does */
		onOpenWikilink: (target: string) => void;
	}

	let { markdownContent, onContentChange, onOpenWikilink }: Props = $props();

	/** The current board state, parsed from markdown */
	let board = $state<KanbanBoard>({ lanes: [], archive: [], settings: {} });

	/** Skip re-parse when the content change was triggered by our own applyChange */
	let selfUpdate = false;

	// Parse when content changes (initial load + file watcher reload)
	$effect(() => {
		const _md = markdownContent;
		if (selfUpdate) {
			selfUpdate = false;
			return;
		}
		board = parseKanbanBoard(_md);
	});

	/** Apply a board mutation: update local state + serialize + persist */
	function applyChange(newBoard: KanbanBoard) {
		if (newBoard === board) return; // no-op guard
		const newMarkdown = serializeKanbanBoard(newBoard);
		board = newBoard;
		// A mutation that serializes back to the current content must not arm
		// the latch. The parent prop would never change, so the parse effect
		// above never runs and selfUpdate would stay true, swallowing the NEXT
		// external reload.
		if (newMarkdown === markdownContent) return;
		selfUpdate = true;
		onContentChange(newMarkdown);
	}

	// ── Card operations ─────────────────────────────────────────

	function handleAddItem(laneId: string, text: string) {
		applyChange(addItem(board, laneId, text));
	}

	function handleToggleItem(laneId: string, itemId: string) {
		applyChange(toggleItem(board, laneId, itemId));
	}

	function handleUpdateItem(laneId: string, itemId: string, text: string) {
		applyChange(updateItem(board, laneId, itemId, text));
	}

	function handleDeleteItem(laneId: string, itemId: string) {
		applyChange(removeItem(board, laneId, itemId));
	}

	function handleArchiveItem(laneId: string, itemId: string) {
		applyChange(archiveItem(board, laneId, itemId));
	}

	/**
	 * The card menu's "Move to": appends the card to the target lane. The index
	 * is the target's length in the stored board, not in `displayBoard`, so with
	 * a filter on the card lands after the cards it hides. Unlike a drop it needs
	 * no index among the shown cards, so it works in every sort and filter state.
	 */
	function handleMoveItem(fromLaneId: string, itemId: string, toLaneId: string) {
		const target = board.lanes.find((l) => l.id === toLaneId);
		if (!target) return;
		applyChange(moveItem(board, fromLaneId, itemId, toLaneId, target.items.length, isLaneAutoComplete(board, target.title)));
	}

	function handleArchiveCompleted(laneId: string) {
		applyChange(archiveCompletedItems(board, laneId));
	}

	// ── Lane operations ─────────────────────────────────────────

	function handleRenameLane(laneId: string, title: string) {
		applyChange(renameLane(board, laneId, title));
	}

	function handleDeleteLane(laneId: string) {
		applyChange(removeLane(board, laneId));
	}

	function handleAddLane() {
		applyChange(addLane(board, uniqueLaneTitle(board, 'New Lane')));
		// Focus the new lane's title for immediate editing
		const newLane = board.lanes[board.lanes.length - 1];
		if (newLane) kanbanStore.setEditingLaneId(newLane.id);
	}

	function handleToggleCollapse(laneId: string) {
		const lane = board.lanes.find((l) => l.id === laneId);
		if (!lane) return;
		applyChange(toggleLaneCollapsed(board, lane.title));
	}

	function handleToggleAutoComplete(laneId: string) {
		const lane = board.lanes.find((l) => l.id === laneId);
		if (!lane) return;
		const current = isLaneAutoComplete(board, lane.title);
		applyChange(setLaneAutoComplete(board, lane.title, !current));
	}

	function handleSetMaxItems(laneId: string, maxItems: number) {
		const lane = board.lanes.find((l) => l.id === laneId);
		if (!lane) return;
		applyChange(setLaneMaxItems(board, lane.title, maxItems));
	}

	function handleSetTagColor(tag: string, color: string) {
		applyChange(setTagColor(board, tag, color));
	}

	function handleRemoveTagColor(tag: string) {
		applyChange(removeTagColor(board, tag));
	}

	function handleLaneWidthChange(width: number) {
		applyChange(updateBoardSettings(board, { laneWidth: width }));
	}

	// ── Sorting ────────────────────────────────────────────────

	let currentSortMode = $derived(board.settings.sortMode ?? 'manual');
	let isManualSort = $derived(currentSortMode === 'manual');
	// Manual card drag-reorder is only valid when the rendered order matches the
	// stored order: manual sort AND no active filter. Otherwise a drop index among
	// the filtered/sorted cards would misplace cards in the full lane list.
	let canReorder = $derived(canReorderItems(currentSortMode, kanbanStore.filterQuery));

	function handleSetSortMode(mode: KanbanSortMode) {
		applyChange(setSortMode(board, mode));
	}

	/** Returns a lane with items filtered and sorted for display */
	function displayLane(lane: import('./kanban.types').KanbanLane) {
		let items = filterItems(lane.items, kanbanStore.filterQuery);
		if (!isManualSort) items = sortItems(items, currentSortMode);
		if (items === lane.items) return lane;
		return { ...lane, items };
	}

	const SORT_LABELS: Record<KanbanSortMode, string> = {
		manual: 'Manual',
		'date-asc': 'Date (oldest)',
		'date-desc': 'Date (newest)',
		'text-asc': 'Text (A→Z)',
		'text-desc': 'Text (Z→A)',
		checked: 'Unchecked first',
	};

	/**
	 * Trigger text. A stored mode outside SORT_LABELS (a hand-edited file) is
	 * not called "Manual": it keeps the stored order, but card drag is off.
	 */
	let sortLabel = $derived(Object.hasOwn(SORT_LABELS, currentSortMode) ? SORT_LABELS[currentSortMode] : 'Custom sort');

	// ── View mode ──────────────────────────────────────────────

	let currentViewMode = $derived(board.settings.viewMode ?? 'board');

	function handleSetViewMode(mode: KanbanViewMode) {
		applyChange(setViewMode(board, mode));
	}

	/** Board with filtered/sorted lanes for read-only views */
	let displayBoard = $derived({
		...board,
		lanes: board.lanes.map((lane) => displayLane(lane)),
	});

	// ── Editing state ───────────────────────────────────────────

	function handleStartEditItem(itemId: string) {
		kanbanStore.setEditingItemId(itemId);
	}

	function handleStopEditItem() {
		kanbanStore.setEditingItemId(null);
	}

	function handleStartEditLane(laneId: string) {
		kanbanStore.setEditingLaneId(laneId);
	}

	function handleStopEditLane() {
		kanbanStore.setEditingLaneId(null);
	}

	// ── Wikilink navigation ────────────────────────────────────

	function handleWikilinkClick(target: string, _heading?: string) {
		onOpenWikilink(target);
	}

	// ── Keyboard navigation ────────────────────────────────────

	/**
	 * Targets whose keys are their own. A card's ContextMenu trigger `div` is
	 * not one of them, so the arrows keep working after a click on a card.
	 */
	const OWN_KEYS_SELECTOR =
		'input, textarea, select, button, a, [role="button"], [role="gridcell"], [role="menuitem"], [contenteditable]';

	// The ring indexes the visible cards, so a new filter, sort or view would
	// point it at a different card.
	$effect(() => {
		void kanbanStore.filterQuery;
		void currentSortMode;
		void currentViewMode;
		untrack(() => kanbanStore.clearFocus());
	});

	// ── Filter ─────────────────────────────────────────────────

	let filterInputEl = $state<HTMLInputElement | null>(null);

	// The filter and the ring are module state and EditorView mounts this view
	// unkeyed, so both would follow the user to the next board. The teardown runs
	// on every path change and on destroy. The derived keeps a pin, reorder or
	// close of another tab, which keeps the path, from re-running it. Editing ids
	// stay: clearing them unmounts an open textarea.
	let activePath = $derived(editorStore.activeTab?.path ?? null);
	$effect(() => {
		void activePath;
		return () => {
			kanbanStore.setFilterQuery('');
			kanbanStore.clearFocus();
		};
	});

	function handleClearFilter() {
		kanbanStore.setFilterQuery('');
		filterInputEl?.focus();
	}

	function handleFilterKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') kanbanStore.setFilterQuery('');
	}

	function handleTagClick(tag: string) {
		kanbanStore.setFilterQuery(`#${tag}`);
	}

	function handleBoardKeydown(e: KeyboardEvent) {
		// The root wraps every view mode; only the board shows the ring.
		if (currentViewMode !== 'board') return;
		// Don't handle when editing or when focus is inside a control
		if (kanbanStore.editingItemId || kanbanStore.editingLaneId) return;
		if ((e.target as HTMLElement).closest(OWN_KEYS_SELECTOR)) return;

		// A collapsed lane renders no cards, so it offers none to the ring.
		const lanes = displayBoard.lanes.map((lane) => (isLaneCollapsed(board, lane.title) ? { ...lane, items: [] } : lane));
		if (lanes.length === 0) return;

		const li = kanbanStore.focusedLaneIndex;
		const ii = kanbanStore.focusedItemIndex;

		switch (e.key) {
			case 'ArrowRight': {
				e.preventDefault();
				const newLi = li < 0 ? 0 : Math.min(li + 1, lanes.length - 1);
				const maxItem = lanes[newLi].items.length - 1;
				kanbanStore.setFocus(newLi, Math.min(Math.max(ii, 0), maxItem));
				break;
			}
			case 'ArrowLeft': {
				e.preventDefault();
				const newLi = li < 0 ? 0 : Math.max(li - 1, 0);
				const maxItem = lanes[newLi].items.length - 1;
				kanbanStore.setFocus(newLi, Math.min(Math.max(ii, 0), maxItem));
				break;
			}
			case 'ArrowDown': {
				e.preventDefault();
				if (li < 0) {
					kanbanStore.setFocus(0, 0);
				} else {
					const maxItem = lanes[li].items.length - 1;
					kanbanStore.setFocus(li, Math.min(ii + 1, maxItem));
				}
				break;
			}
			case 'ArrowUp': {
				e.preventDefault();
				if (li < 0) {
					kanbanStore.setFocus(0, 0);
				} else {
					kanbanStore.setFocus(li, Math.max(ii - 1, 0));
				}
				break;
			}
			case 'Enter': {
				if (li >= 0 && ii >= 0 && lanes[li]?.items[ii]) {
					e.preventDefault();
					kanbanStore.setEditingItemId(lanes[li].items[ii].id);
				}
				break;
			}
			case 'Escape': {
				e.preventDefault();
				kanbanStore.clearFocus();
				break;
			}
			case ' ': {
				if (li >= 0 && ii >= 0 && lanes[li]?.items[ii]) {
					e.preventDefault();
					handleToggleItem(lanes[li].id, lanes[li].items[ii].id);
				}
				break;
			}
			case 'Delete':
			case 'Backspace': {
				if (li >= 0 && ii >= 0 && lanes[li]?.items[ii]) {
					e.preventDefault();
					const lane = lanes[li];
					handleDeleteItem(lane.id, lane.items[ii].id);
					// Adjust focus after deletion
					const newMax = lane.items.length - 2;
					if (newMax < 0) kanbanStore.clearFocus();
					else kanbanStore.setFocus(li, Math.min(ii, newMax));
				}
				break;
			}
			case 'n':
			case 'N': {
				// Focus the add card input of the focused lane
				if (li >= 0) {
					e.preventDefault();
					const laneEl = document.querySelector(`[data-lane-id="${lanes[li].id}"]`);
					const input = laneEl?.querySelector('form input') as HTMLInputElement;
					input?.focus();
				}
				break;
			}
		}
	}

	// ── Archive ─────────────────────────────────────────────────

	let showArchive = $state(false);

	function handleRestoreItem(itemId: string) {
		const firstLane = board.lanes[0];
		if (!firstLane) return;
		applyChange(restoreItem(board, itemId, firstLane.id));
		toast.success(`Restored to ${firstLane.title}`);
	}

	function handleDeleteArchivedItem(itemId: string) {
		applyChange({ ...board, archive: board.archive.filter((i) => i.id !== itemId) });
	}

	// ── Card drag and drop ──────────────────────────────────────

	let dragItemId = $state<string | null>(null);
	let dragFromLaneId = $state<string | null>(null);
	let dragOverLaneId = $state<string | null>(null);
	let dropIndicatorIndex = $state(-1);

	function handleItemDragStart(e: DragEvent, laneId: string, itemId: string) {
		dragItemId = itemId;
		dragFromLaneId = laneId;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', `item:${itemId}:${laneId}`);
		}
	}

	function handleItemDragEnd(_e: DragEvent) {
		dragItemId = null;
		dragFromLaneId = null;
		dragOverLaneId = null;
		dropIndicatorIndex = -1;
	}

	function handleItemDragOver(e: DragEvent, laneId: string) {
		if (!dragItemId) return;
		dragOverLaneId = laneId;

		// Calculate drop indicator position from mouse Y
		const laneEl = e.currentTarget as HTMLElement;
		const cards = laneEl.querySelectorAll('[data-item-id]');
		let idx = cards.length;
		for (let i = 0; i < cards.length; i++) {
			const rect = cards[i].getBoundingClientRect();
			const midY = rect.top + rect.height / 2;
			if (e.clientY < midY) {
				idx = i;
				break;
			}
		}
		dropIndicatorIndex = idx;
	}

	function handleItemDrop(e: DragEvent, toLaneId: string) {
		if (!dragItemId || !dragFromLaneId) return;

		// Calculate drop index from mouse position
		const laneEl = (e.currentTarget as HTMLElement);
		const cards = laneEl.querySelectorAll('[data-item-id]');
		let toIndex = cards.length;

		for (let i = 0; i < cards.length; i++) {
			const rect = cards[i].getBoundingClientRect();
			const midY = rect.top + rect.height / 2;
			if (e.clientY < midY) {
				toIndex = i;
				break;
			}
		}

		// Check if target lane has auto-complete enabled
		const targetLane = board.lanes.find((l) => l.id === toLaneId);
		const autoCheck = targetLane ? isLaneAutoComplete(board, targetLane.title) : false;

		applyChange(moveItem(board, dragFromLaneId, dragItemId, toLaneId, toIndex, autoCheck));
		dragItemId = null;
		dragFromLaneId = null;
		dragOverLaneId = null;
		dropIndicatorIndex = -1;
	}

	// ── Lane drag and drop ──────────────────────────────────────

	let dragLaneId = $state<string | null>(null);

	function handleLaneDragStart(e: DragEvent, laneId: string) {
		dragLaneId = laneId;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', `lane:${laneId}`);
		}
	}

	function handleLaneDragEnd(_e: DragEvent) {
		dragLaneId = null;
	}

	function handleLaneDragOver(e: DragEvent) {
		if (!dragLaneId) return;
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
	}

	function handleLaneDrop(e: DragEvent) {
		if (!dragLaneId) return;
		e.preventDefault();

		const container = e.currentTarget as HTMLElement;
		const laneEls = container.querySelectorAll('[data-lane-id]');
		const fromIndex = board.lanes.findIndex((l) => l.id === dragLaneId);
		let toIndex = laneEls.length - 1;

		for (let i = 0; i < laneEls.length; i++) {
			const rect = laneEls[i].getBoundingClientRect();
			const midX = rect.left + rect.width / 2;
			if (e.clientX < midX) {
				toIndex = i;
				break;
			}
		}

		if (fromIndex >= 0 && fromIndex !== toIndex) {
			applyChange(moveLane(board, fromIndex, toIndex));
		}
		dragLaneId = null;
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- data-kanban-board: KanbanCard focuses this root after an inline edit; outline-none, since that focus from code matches :focus-visible. -->
<div class="flex h-full flex-col outline-none" onkeydown={handleBoardKeydown} tabindex="-1" data-kanban-board>
	<!-- Toolbar -->
	<div class="pane-toolbar">
		<div class="flex items-center gap-0.5 rounded-xs border border-border">
			<button
				class="rounded-l-xs p-1 transition-colors {currentViewMode === 'board' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}"
				onclick={() => handleSetViewMode('board')}
				title="Board view"
				aria-label="Board view"
				aria-pressed={currentViewMode === 'board'}
			>
				<LayoutGrid class="size-3.5" />
			</button>
			<button
				class="p-1 transition-colors {currentViewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}"
				onclick={() => handleSetViewMode('list')}
				title="List view"
				aria-label="List view"
				aria-pressed={currentViewMode === 'list'}
			>
				<List class="size-3.5" />
			</button>
			<button
				class="rounded-r-xs p-1 transition-colors {currentViewMode === 'table' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}"
				onclick={() => handleSetViewMode('table')}
				title="Table view"
				aria-label="Table view"
				aria-pressed={currentViewMode === 'table'}
			>
				<Table class="size-3.5" />
			</button>
		</div>
		<div class="flex items-center gap-1.5">
			<ArrowUpDown class="size-3.5 text-muted-foreground" />
			<Select.Root
				type="single"
				value={currentSortMode}
				onValueChange={(v) => handleSetSortMode(v as KanbanSortMode)}
			>
				<Select.Trigger size="sm" class="h-7 text-xs" aria-label="Sort cards">
					<span data-slot="select-value">{sortLabel}</span>
				</Select.Trigger>
				<Select.Content>
					{#each Object.entries(SORT_LABELS) as [mode, label] (mode)}
						<Select.Item value={mode} {label} />
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
		{#if !canReorder && currentViewMode === 'board'}
			<span
				class="rounded-xs border border-border px-1.5 py-0.5 text-xs text-muted-foreground"
				title="Drag is off while the board is sorted or filtered. To move a card to another lane, use Move to in the card menu."
				data-manual-order-paused
			>
				Manual order paused
			</span>
		{/if}
		<div class="flex items-center gap-1.5">
			<Search class="size-3.5 text-muted-foreground" />
			<div class="relative">
				<input
					bind:this={filterInputEl}
					class="rounded-xs border border-border bg-background py-0.5 pr-6 pl-2 text-xs outline-none placeholder:text-muted-foreground/50 focus:border-primary"
					placeholder="Filter cards..."
					value={kanbanStore.filterQuery}
					oninput={(e) => kanbanStore.setFilterQuery(e.currentTarget.value)}
					onkeydown={handleFilterKeydown}
				/>
				{#if kanbanStore.filterQuery !== ''}
					<button
						type="button"
						class="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground hover:text-foreground"
						aria-label="Clear filter"
						title="Clear filter"
						onmousedown={(e) => e.preventDefault()}
						onclick={handleClearFilter}
					>
						<X class="size-3.5" />
					</button>
				{/if}
			</div>
		</div>
	</div>

	{#if currentViewMode === 'list'}
		<KanbanListView board={displayBoard} onToggleItem={handleToggleItem} onWikilinkClick={handleWikilinkClick} />
	{:else if currentViewMode === 'table'}
		<KanbanTableView board={displayBoard} onToggleItem={handleToggleItem} onWikilinkClick={handleWikilinkClick} />
	{:else}
	<!-- Board view -->
	<div
		class="flex flex-1 gap-3 overflow-x-auto p-4"
		ondragover={handleLaneDragOver}
		ondrop={handleLaneDrop}
		role="region"
		aria-label="Kanban board"
	>
	{#each displayBoard.lanes as lane, laneIndex (lane.id)}
		<KanbanLane
			{lane}
			editingItemId={kanbanStore.editingItemId}
			editingLaneId={kanbanStore.editingLaneId}
			focusedItemId={kanbanStore.focusedLaneIndex === laneIndex && kanbanStore.focusedItemIndex >= 0 ? lane.items[kanbanStore.focusedItemIndex]?.id ?? null : null}
			collapsed={isLaneCollapsed(board, lane.title)}
			laneWidth={board.settings.laneWidth ?? DEFAULT_LANE_WIDTH}
			maxItems={getLaneMaxItems(board, lane.title)}
			atLimit={isLaneAtLimit(board, lane.title)}
			totalCount={kanbanStore.filterQuery.trim() ? board.lanes[laneIndex].items.length : undefined}
			autoComplete={isLaneAutoComplete(board, lane.title)}
			tagColors={board.settings.tagColors ?? {}}
			disableDrag={!canReorder}
			{dragItemId}
			isDragOver={dragOverLaneId === lane.id}
			{dropIndicatorIndex}
			onWikilinkClick={handleWikilinkClick}
			onTagClick={handleTagClick}
			onAddItem={handleAddItem}
			onToggleItem={handleToggleItem}
			onUpdateItem={handleUpdateItem}
			onDeleteItem={handleDeleteItem}
			onArchiveItem={handleArchiveItem}
			moveTargets={board.lanes.filter((l) => l.id !== lane.id)}
			onMoveItem={handleMoveItem}
			onArchiveCompleted={handleArchiveCompleted}
			onRenameLane={handleRenameLane}
			onDeleteLane={handleDeleteLane}
			onToggleCollapse={handleToggleCollapse}
			onToggleAutoComplete={handleToggleAutoComplete}
			onSetMaxItems={handleSetMaxItems}
			onSetTagColor={handleSetTagColor}
			onRemoveTagColor={handleRemoveTagColor}
			onLaneWidthChange={handleLaneWidthChange}
			onStartEditItem={handleStartEditItem}
			onStopEditItem={handleStopEditItem}
			onStartEditLane={handleStartEditLane}
			onStopEditLane={handleStopEditLane}
			onItemDragStart={handleItemDragStart}
			onItemDragEnd={handleItemDragEnd}
			onItemDragOver={handleItemDragOver}
			onItemDrop={handleItemDrop}
			onLaneDragStart={handleLaneDragStart}
			onLaneDragEnd={handleLaneDragEnd}
		/>
	{/each}

	<!-- Add lane button -->
	<button
		class="flex h-fit shrink-0 items-center justify-center gap-2 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/30 hover:text-foreground"
		style="width: {board.settings.laneWidth ?? DEFAULT_LANE_WIDTH}px"
		onclick={handleAddLane}
	>
		<Plus class="size-4" />
		Add Lane
	</button>

	<!-- Archive section -->
	{#if board.archive.length > 0}
		<div
			class="flex h-full shrink-0 flex-col rounded-lg border border-border bg-muted/20"
			style="width: {board.settings.laneWidth ?? DEFAULT_LANE_WIDTH}px"
		>
			<button
				class="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
				onclick={() => showArchive = !showArchive}
			>
				{#if showArchive}
					<ChevronDown class="size-4" />
				{:else}
					<ChevronRight class="size-4" />
				{/if}
				<Archive class="size-4" />
				Archive ({board.archive.length})
			</button>
			{#if showArchive}
				<div class="flex flex-1 flex-col gap-1 overflow-y-auto px-2 pb-2">
					{#each board.archive as item (item.id)}
						<div class="flex items-center gap-1.5 rounded-xs border border-border bg-background/50 p-2 text-sm text-muted-foreground">
							<span class="flex-1 truncate line-through">{stripCardMetadata(item.text)}</span>
							<button
								class="rounded-xs p-0.5 hover:bg-muted hover:text-foreground transition-colors"
								onclick={() => handleRestoreItem(item.id)}
								aria-label="Restore item"
								title="Restore to first lane"
							>
								<RotateCcw class="size-3.5" />
							</button>
							<button
								class="rounded-xs p-0.5 hover:bg-destructive/20 hover:text-destructive transition-colors"
								onclick={() => handleDeleteArchivedItem(item.id)}
								aria-label="Delete archived item"
								title="Delete permanently"
							>
								<Trash2 class="size-3.5" />
							</button>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
	</div>
	{/if}
</div>
