import type { KanbanBoard, KanbanItem, KanbanLane, KanbanSettings } from './kanban.types';

let board = $state<KanbanBoard | null>(null);
/** ID of the item currently being edited inline */
let editingItemId = $state<string | null>(null);
/** ID of the lane whose title is being edited */
let editingLaneId = $state<string | null>(null);
/** Current filter query for cards */
let filterQuery = $state('');
/** Focused lane index for keyboard navigation (-1 = none) */
let focusedLaneIndex = $state(-1);
/** Focused item index within the focused lane (-1 = none) */
let focusedItemIndex = $state(-1);

export const kanbanStore = {
	get board() { return board; },
	get editingItemId() { return editingItemId; },
	get editingLaneId() { return editingLaneId; },
	get filterQuery() { return filterQuery; },
	get focusedLaneIndex() { return focusedLaneIndex; },
	get focusedItemIndex() { return focusedItemIndex; },
	get lanes(): KanbanLane[] { return board?.lanes ?? []; },
	get archive(): KanbanItem[] { return board?.archive ?? []; },
	get settings(): KanbanSettings { return board?.settings ?? {}; },

	setBoard(b: KanbanBoard | null) { board = b; },
	setEditingItemId(id: string | null) { editingItemId = id; },
	setEditingLaneId(id: string | null) { editingLaneId = id; },
	setFilterQuery(q: string) { filterQuery = q; },
	setFocus(laneIdx: number, itemIdx: number) {
		focusedLaneIndex = laneIdx;
		focusedItemIndex = itemIdx;
	},
	clearFocus() {
		focusedLaneIndex = -1;
		focusedItemIndex = -1;
	},

	reset() {
		board = null;
		editingItemId = null;
		editingLaneId = null;
		filterQuery = '';
		focusedLaneIndex = -1;
		focusedItemIndex = -1;
	},
};
