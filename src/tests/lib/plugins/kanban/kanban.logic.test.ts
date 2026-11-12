import { describe, it, expect } from 'vitest';
import {
	parseKanbanBoard,
	serializeKanbanBoard,
	createEmptyKanbanBoard,
	generateKanbanId,
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
	parseSettings,
	serializeSettings,
	updateBoardSettings,
	isLaneCollapsed,
	toggleLaneCollapsed,
	DEFAULT_LANE_WIDTH,
	getLaneMaxItems,
	setLaneMaxItems,
	isLaneAtLimit,
	isLaneAutoComplete,
	setLaneAutoComplete,
	extractCardDate,
	setCardDate,
	removeCardDate,
	getDateProximity,
	cardProximity,
	PROXIMITY_CLASSES,
	type DateProximity,
	extractCardColor,
	setCardColor,
	removeCardColor,
	stripCardMetadata,
	extractCardTags,
	setTagColor,
	removeTagColor,
	extractCardWikilinks,
	parseCardSegments,
	sortItems,
	setSortMode,
	filterItems,
	setViewMode,
	canReorderItems,
} from '#lib/plugins/kanban/kanban.logic.js';
import type { KanbanBoard, KanbanSettings } from '#lib/plugins/kanban/kanban.types.js';

// ── Helpers ─────────────────────────────────────────────────────────

/** Creates a board with predictable IDs for testing */
function makeBoard(overrides: Partial<KanbanBoard> = {}): KanbanBoard {
	return {
		lanes: [
			{
				id: 'lane-1',
				title: 'To Do',
				items: [
					{ id: 'item-1', text: 'Task A', checked: false },
					{ id: 'item-2', text: 'Task B', checked: true },
				],
			},
			{
				id: 'lane-2',
				title: 'Done',
				items: [
					{ id: 'item-3', text: 'Task C', checked: false },
				],
			},
		],
		archive: [],
		settings: {},
		...overrides,
	};
}

// ── generateKanbanId ────────────────────────────────────────────────

describe('generateKanbanId', () => {
	it('returns an 8-character string', () => {
		const id = generateKanbanId();
		expect(id).toHaveLength(8);
	});

	it('returns unique IDs', () => {
		const ids = new Set(Array.from({ length: 100 }, () => generateKanbanId()));
		expect(ids.size).toBe(100);
	});
});

// ── parseKanbanBoard ────────────────────────────────────────────────

describe('parseKanbanBoard', () => {
	it('parses empty content into empty board', () => {
		const board = parseKanbanBoard('');
		expect(board.lanes).toEqual([]);
		expect(board.archive).toEqual([]);
	});

	it('parses a single lane with items', () => {
		const md = `## To Do

- [ ] Task A
- [x] Task B
`;
		const board = parseKanbanBoard(md);
		expect(board.lanes).toHaveLength(1);
		expect(board.lanes[0].title).toBe('To Do');
		expect(board.lanes[0].items).toHaveLength(2);
		expect(board.lanes[0].items[0].text).toBe('Task A');
		expect(board.lanes[0].items[0].checked).toBe(false);
		expect(board.lanes[0].items[1].text).toBe('Task B');
		expect(board.lanes[0].items[1].checked).toBe(true);
	});

	it('parses multiple lanes', () => {
		const md = `## To Do

- [ ] A

## In Progress

- [ ] B

## Done

- [x] C
`;
		const board = parseKanbanBoard(md);
		expect(board.lanes).toHaveLength(3);
		expect(board.lanes[0].title).toBe('To Do');
		expect(board.lanes[1].title).toBe('In Progress');
		expect(board.lanes[2].title).toBe('Done');
	});

	it('parses archive section', () => {
		const md = `## Active

- [ ] Task A

---

## Archive

- [x] Old task
- [x] Another old task
`;
		const board = parseKanbanBoard(md);
		expect(board.lanes).toHaveLength(1);
		expect(board.lanes[0].title).toBe('Active');
		expect(board.archive).toHaveLength(2);
		expect(board.archive[0].text).toBe('Old task');
		expect(board.archive[1].text).toBe('Another old task');
	});

	it('parses lane with no items', () => {
		const md = `## Empty Lane

## Also Empty
`;
		const board = parseKanbanBoard(md);
		expect(board.lanes).toHaveLength(2);
		expect(board.lanes[0].items).toEqual([]);
		expect(board.lanes[1].items).toEqual([]);
	});

	it('ignores items before any lane heading', () => {
		const md = `- [ ] Orphan task

## Real Lane

- [ ] Real task
`;
		const board = parseKanbanBoard(md);
		expect(board.lanes).toHaveLength(1);
		expect(board.lanes[0].items).toHaveLength(1);
		expect(board.lanes[0].items[0].text).toBe('Real task');
	});

	it('handles uppercase X in checkboxes', () => {
		const md = `## Lane

- [X] Checked with uppercase
`;
		const board = parseKanbanBoard(md);
		expect(board.lanes[0].items[0].checked).toBe(true);
	});

	it('preserves tags and special characters in item text', () => {
		const md = `## Lane

- [ ] Task with #tag and [[link]]
`;
		const board = parseKanbanBoard(md);
		expect(board.lanes[0].items[0].text).toBe('Task with #tag and [[link]]');
	});

	it('assigns unique IDs to all lanes and items', () => {
		const md = `## A

- [ ] 1
- [ ] 2

## B

- [ ] 3
`;
		const board = parseKanbanBoard(md);
		const allIds = [
			...board.lanes.map((l) => l.id),
			...board.lanes.flatMap((l) => l.items.map((i) => i.id)),
		];
		expect(new Set(allIds).size).toBe(allIds.length);
	});
});

// ── serializeKanbanBoard ────────────────────────────────────────────

describe('serializeKanbanBoard', () => {
	it('serializes empty board', () => {
		const board: KanbanBoard = { lanes: [], archive: [], settings: {} };
		expect(serializeKanbanBoard(board)).toBe('');
	});

	it('serializes lanes with items', () => {
		const board: KanbanBoard = {
			lanes: [
				{
					id: 'l1',
					title: 'To Do',
					items: [
						{ id: 'i1', text: 'Task A', checked: false },
						{ id: 'i2', text: 'Task B', checked: true },
					],
				},
			],
			archive: [],
			settings: {},
		};
		const result = serializeKanbanBoard(board);
		expect(result).toBe('## To Do\n\n- [ ] Task A\n- [x] Task B\n');
	});

	it('serializes archive section', () => {
		const board: KanbanBoard = {
			lanes: [{ id: 'l1', title: 'Active', items: [] }],
			archive: [{ id: 'a1', text: 'Archived', checked: true }],
			settings: {},
		};
		const result = serializeKanbanBoard(board);
		expect(result).toContain('---\n\n## Archive\n\n- [x] Archived\n');
	});

	it('does not include archive section when archive is empty', () => {
		const board: KanbanBoard = {
			lanes: [{ id: 'l1', title: 'Lane', items: [] }],
			archive: [],
			settings: {},
		};
		const result = serializeKanbanBoard(board);
		expect(result).not.toContain('---');
		expect(result).not.toContain('Archive');
	});

	it('serializes multiple lanes', () => {
		const board: KanbanBoard = {
			lanes: [
				{ id: 'l1', title: 'A', items: [] },
				{ id: 'l2', title: 'B', items: [{ id: 'i1', text: 'task', checked: false }] },
			],
			archive: [],
			settings: {},
		};
		const result = serializeKanbanBoard(board);
		expect(result).toBe('## A\n\n\n## B\n\n- [ ] task\n');
	});
});

// ── Round-trip ──────────────────────────────────────────────────────

describe('round-trip (parse → serialize → parse)', () => {
	it('preserves board structure through round-trip', () => {
		const md = `## To Do

- [ ] Task A
- [x] Task B

## Done

- [x] Task C

---

## Archive

- [x] Old task
`;
		const board1 = parseKanbanBoard(md);
		const serialized = serializeKanbanBoard(board1);
		const board2 = parseKanbanBoard(serialized);

		expect(board2.lanes).toHaveLength(board1.lanes.length);
		expect(board2.archive).toHaveLength(board1.archive.length);

		for (let i = 0; i < board1.lanes.length; i++) {
			expect(board2.lanes[i].title).toBe(board1.lanes[i].title);
			expect(board2.lanes[i].items).toHaveLength(board1.lanes[i].items.length);
			for (let j = 0; j < board1.lanes[i].items.length; j++) {
				expect(board2.lanes[i].items[j].text).toBe(board1.lanes[i].items[j].text);
				expect(board2.lanes[i].items[j].checked).toBe(board1.lanes[i].items[j].checked);
			}
		}
	});
});

// ── createEmptyKanbanBoard ──────────────────────────────────────────

describe('createEmptyKanbanBoard', () => {
	it('creates a board with 3 default lanes', () => {
		const board = createEmptyKanbanBoard();
		expect(board.lanes).toHaveLength(3);
		expect(board.lanes[0].title).toBe('To Do');
		expect(board.lanes[1].title).toBe('In Progress');
		expect(board.lanes[2].title).toBe('Done');
	});

	it('creates empty lanes with unique IDs', () => {
		const board = createEmptyKanbanBoard();
		for (const lane of board.lanes) {
			expect(lane.items).toEqual([]);
		}
		const ids = new Set(board.lanes.map((l) => l.id));
		expect(ids.size).toBe(3);
	});
});

// ── addItem ─────────────────────────────────────────────────────────

describe('addItem', () => {
	it('adds an item to the target lane', () => {
		const board = makeBoard();
		const result = addItem(board, 'lane-1', 'New task');
		expect(result.lanes[0].items).toHaveLength(3);
		expect(result.lanes[0].items[2].text).toBe('New task');
		expect(result.lanes[0].items[2].checked).toBe(false);
	});

	it('does not mutate the original board', () => {
		const board = makeBoard();
		addItem(board, 'lane-1', 'New task');
		expect(board.lanes[0].items).toHaveLength(2);
	});

	it('does nothing for nonexistent lane', () => {
		const board = makeBoard();
		const result = addItem(board, 'nonexistent', 'Task');
		expect(result.lanes).toEqual(board.lanes);
	});
});

// ── removeItem ──────────────────────────────────────────────────────

describe('removeItem', () => {
	it('removes the target item', () => {
		const board = makeBoard();
		const result = removeItem(board, 'lane-1', 'item-1');
		expect(result.lanes[0].items).toHaveLength(1);
		expect(result.lanes[0].items[0].id).toBe('item-2');
	});

	it('does not mutate the original board', () => {
		const board = makeBoard();
		removeItem(board, 'lane-1', 'item-1');
		expect(board.lanes[0].items).toHaveLength(2);
	});

	it('does nothing for nonexistent item', () => {
		const board = makeBoard();
		const result = removeItem(board, 'lane-1', 'nonexistent');
		expect(result.lanes[0].items).toHaveLength(2);
	});
});

// ── updateItem ──────────────────────────────────────────────────────

describe('updateItem', () => {
	it('updates the item text', () => {
		const board = makeBoard();
		const result = updateItem(board, 'lane-1', 'item-1', 'Updated text');
		expect(result.lanes[0].items[0].text).toBe('Updated text');
	});

	it('does not affect other items', () => {
		const board = makeBoard();
		const result = updateItem(board, 'lane-1', 'item-1', 'Updated');
		expect(result.lanes[0].items[1].text).toBe('Task B');
	});
});

// ── toggleItem ──────────────────────────────────────────────────────

describe('toggleItem', () => {
	it('toggles unchecked to checked', () => {
		const board = makeBoard();
		const result = toggleItem(board, 'lane-1', 'item-1');
		expect(result.lanes[0].items[0].checked).toBe(true);
	});

	it('toggles checked to unchecked', () => {
		const board = makeBoard();
		const result = toggleItem(board, 'lane-1', 'item-2');
		expect(result.lanes[0].items[1].checked).toBe(false);
	});
});

// ── moveItem ────────────────────────────────────────────────────────

describe('moveItem', () => {
	it('moves an item between lanes', () => {
		const board = makeBoard();
		const result = moveItem(board, 'lane-1', 'item-1', 'lane-2', 0);
		expect(result.lanes[0].items).toHaveLength(1);
		expect(result.lanes[1].items).toHaveLength(2);
		expect(result.lanes[1].items[0].id).toBe('item-1');
	});

	it('moves an item within the same lane', () => {
		const board = makeBoard();
		const result = moveItem(board, 'lane-1', 'item-1', 'lane-1', 1);
		expect(result.lanes[0].items[0].id).toBe('item-2');
		expect(result.lanes[0].items[1].id).toBe('item-1');
	});

	it('clamps toIndex to valid range', () => {
		const board = makeBoard();
		const result = moveItem(board, 'lane-1', 'item-1', 'lane-2', 999);
		expect(result.lanes[1].items).toHaveLength(2);
		expect(result.lanes[1].items[1].id).toBe('item-1');
	});

	it('returns original board for nonexistent source lane', () => {
		const board = makeBoard();
		const result = moveItem(board, 'nonexistent', 'item-1', 'lane-2', 0);
		expect(result).toBe(board);
	});

	it('returns original board for nonexistent target lane instead of deleting the card', () => {
		const board = makeBoard();
		const result = moveItem(board, 'lane-1', 'item-1', 'nonexistent', 0);
		// The cross-lane branch removes from the source lane unconditionally;
		// without a target-lane guard the card vanished from the board.
		expect(result).toBe(board);
		expect(result.lanes[0].items.some((i) => i.id === 'item-1')).toBe(true);
	});

	it('clamps a negative toIndex to 0 within the same lane', () => {
		// 3 items: after removing item-c, 2 remain — splice(-1) would insert
		// before the LAST element (index 1) instead of at the head (index 0).
		const board = makeBoard({
			lanes: [{
				id: 'lane-1',
				title: 'To Do',
				items: [
					{ id: 'item-a', text: 'A', checked: false },
					{ id: 'item-b', text: 'B', checked: false },
					{ id: 'item-c', text: 'C', checked: false },
				],
			}],
		});
		const result = moveItem(board, 'lane-1', 'item-c', 'lane-1', -1);
		expect(result.lanes[0].items.map((i) => i.id)).toEqual(['item-c', 'item-a', 'item-b']);
	});

	it('clamps a negative toIndex to 0 across lanes', () => {
		// Target lane with 2 items: splice(-1) would land at index 1, not 0.
		const board = makeBoard({
			lanes: [
				{
					id: 'lane-1',
					title: 'To Do',
					items: [{ id: 'item-1', text: 'Task A', checked: false }],
				},
				{
					id: 'lane-2',
					title: 'Done',
					items: [
						{ id: 'item-x', text: 'X', checked: false },
						{ id: 'item-y', text: 'Y', checked: false },
					],
				},
			],
		});
		const result = moveItem(board, 'lane-1', 'item-1', 'lane-2', -1);
		expect(result.lanes[1].items.map((i) => i.id)).toEqual(['item-1', 'item-x', 'item-y']);
	});

	it('returns original board for nonexistent item', () => {
		const board = makeBoard();
		const result = moveItem(board, 'lane-1', 'nonexistent', 'lane-2', 0);
		expect(result).toBe(board);
	});

	it('returns original board when the source lane is empty', () => {
		const board = makeBoard({
			lanes: [
				{ id: 'empty-lane', title: 'Empty', items: [] },
				{ id: 'lane-2', title: 'Done', items: [{ id: 'item-3', text: 'Task C', checked: false }] },
			],
		});
		const result = moveItem(board, 'empty-lane', 'item-1', 'lane-2', 0);
		expect(result).toBe(board);
	});

});

// ── addLane ─────────────────────────────────────────────────────────

describe('addLane', () => {
	it('adds a lane to the end', () => {
		const board = makeBoard();
		const result = addLane(board, 'New Lane');
		expect(result.lanes).toHaveLength(3);
		expect(result.lanes[2].title).toBe('New Lane');
		expect(result.lanes[2].items).toEqual([]);
	});
});

// ── removeLane ──────────────────────────────────────────────────────

describe('removeLane', () => {
	it('removes the target lane', () => {
		const board = makeBoard();
		const result = removeLane(board, 'lane-1');
		expect(result.lanes).toHaveLength(1);
		expect(result.lanes[0].id).toBe('lane-2');
	});

	it('does nothing for nonexistent lane', () => {
		const board = makeBoard();
		const result = removeLane(board, 'nonexistent');
		expect(result.lanes).toHaveLength(2);
	});
});

// ── renameLane ──────────────────────────────────────────────────────

describe('renameLane', () => {
	it('renames the target lane', () => {
		const board = makeBoard();
		const result = renameLane(board, 'lane-1', 'Renamed');
		expect(result.lanes[0].title).toBe('Renamed');
	});

	it('does not affect other lanes', () => {
		const board = makeBoard();
		const result = renameLane(board, 'lane-1', 'Renamed');
		expect(result.lanes[1].title).toBe('Done');
	});
});

// ── moveLane ────────────────────────────────────────────────────────

describe('moveLane', () => {
	it('moves lane to new position', () => {
		const board = makeBoard();
		const result = moveLane(board, 0, 1);
		expect(result.lanes[0].id).toBe('lane-2');
		expect(result.lanes[1].id).toBe('lane-1');
	});

	it('returns original board for same position', () => {
		const board = makeBoard();
		const result = moveLane(board, 0, 0);
		expect(result).toBe(board);
	});

	it('returns original board for out-of-range indices', () => {
		const board = makeBoard();
		expect(moveLane(board, -1, 0)).toBe(board);
		expect(moveLane(board, 0, 5)).toBe(board);
	});
});

// ── archiveItem ─────────────────────────────────────────────────────

describe('archiveItem', () => {
	it('moves item to archive and marks it checked', () => {
		const board = makeBoard();
		const result = archiveItem(board, 'lane-1', 'item-1');
		expect(result.lanes[0].items).toHaveLength(1);
		expect(result.archive).toHaveLength(1);
		expect(result.archive[0].text).toBe('Task A');
		expect(result.archive[0].checked).toBe(true);
	});

	it('returns original board for nonexistent item', () => {
		const board = makeBoard();
		const result = archiveItem(board, 'lane-1', 'nonexistent');
		expect(result).toBe(board);
	});
});

// ── archiveCompletedItems ───────────────────────────────────────────

describe('archiveCompletedItems', () => {
	it('archives all checked items from a lane', () => {
		const board = makeBoard();
		const result = archiveCompletedItems(board, 'lane-1');
		expect(result.lanes[0].items).toHaveLength(1);
		expect(result.lanes[0].items[0].text).toBe('Task A');
		expect(result.archive).toHaveLength(1);
		expect(result.archive[0].text).toBe('Task B');
	});

	it('returns original board when no checked items', () => {
		const board = makeBoard({
			lanes: [{ id: 'l', title: 'L', items: [{ id: 'i', text: 'T', checked: false }] }],
		});
		const result = archiveCompletedItems(board, 'l');
		expect(result).toBe(board);
	});
});

// ── restoreItem ─────────────────────────────────────────────────────

describe('restoreItem', () => {
	it('moves item from archive to a lane and unchecks it', () => {
		const board = makeBoard({
			archive: [{ id: 'arch-1', text: 'Archived task', checked: true }],
		});
		const result = restoreItem(board, 'arch-1', 'lane-1');
		expect(result.archive).toHaveLength(0);
		expect(result.lanes[0].items).toHaveLength(3);
		expect(result.lanes[0].items[2].text).toBe('Archived task');
		expect(result.lanes[0].items[2].checked).toBe(false);
	});

	it('returns original board for nonexistent archive item', () => {
		const board = makeBoard();
		const result = restoreItem(board, 'nonexistent', 'lane-1');
		expect(result).toBe(board);
	});
});

// ── parseSettings ──────────────────────────────────────────────────

describe('parseSettings', () => {
	it('returns empty object when no settings block', () => {
		const content = '## Lane\n\n- [ ] Task\n';
		expect(parseSettings(content)).toEqual({});
	});

	it('parses valid settings block', () => {
		const content = `## Lane\n\n- [ ] Task\n\n%% kanban:settings\n{"laneWidth": 300, "tagColors": {"urgent": "red"}}\n%%\n`;
		const settings = parseSettings(content);
		expect(settings.laneWidth).toBe(300);
		expect(settings.tagColors).toEqual({ urgent: 'red' });
	});

	it('returns empty object for malformed JSON', () => {
		const content = `%% kanban:settings\n{invalid json}\n%%\n`;
		expect(parseSettings(content)).toEqual({});
	});

	it('parses settings with laneSettings', () => {
		const content = `%% kanban:settings\n{"laneSettings": {"Done": {"autoComplete": true, "maxItems": 10}}}\n%%\n`;
		const settings = parseSettings(content);
		expect(settings.laneSettings?.Done?.autoComplete).toBe(true);
		expect(settings.laneSettings?.Done?.maxItems).toBe(10);
	});

	it('parses settings with sortMode and viewMode', () => {
		const content = `%% kanban:settings\n{"sortMode": "date-asc", "viewMode": "list"}\n%%\n`;
		const settings = parseSettings(content);
		expect(settings.sortMode).toBe('date-asc');
		expect(settings.viewMode).toBe('list');
	});
});

// ── serializeSettings ──────────────────────────────────────────────

describe('serializeSettings', () => {
	it('returns empty string for empty settings', () => {
		expect(serializeSettings({})).toBe('');
	});

	it('serializes settings with laneWidth', () => {
		const result = serializeSettings({ laneWidth: 300 });
		expect(result).toContain('%% kanban:settings');
		expect(result).toContain('"laneWidth": 300');
		expect(result).toContain('%%');
	});

	it('serializes settings with tagColors', () => {
		const result = serializeSettings({ tagColors: { urgent: 'red' } });
		expect(result).toContain('"tagColors"');
		expect(result).toContain('"urgent": "red"');
	});

	it('filters out undefined values', () => {
		const result = serializeSettings({ laneWidth: undefined });
		expect(result).toBe('');
	});

	it('serializes complex settings', () => {
		const settings: KanbanSettings = {
			laneWidth: 350,
			tagColors: { bug: 'orange' },
			laneSettings: { Done: { autoComplete: true } },
			sortMode: 'manual',
			viewMode: 'board',
		};
		const result = serializeSettings(settings);
		expect(result).toContain('%% kanban:settings');
		expect(result).toContain('"laneWidth": 350');
		expect(result).toContain('"sortMode": "manual"');
	});
});

// ── parseKanbanBoard with settings ─────────────────────────────────

describe('parseKanbanBoard with settings', () => {
	it('parses board with settings block', () => {
		const md = `## To Do\n\n- [ ] Task A\n\n%% kanban:settings\n{"laneWidth": 300}\n%%\n`;
		const board = parseKanbanBoard(md);
		expect(board.lanes).toHaveLength(1);
		expect(board.settings.laneWidth).toBe(300);
	});

	it('parses board with settings after archive', () => {
		const md = `## Active\n\n- [ ] Task\n\n---\n\n## Archive\n\n- [x] Old\n\n%% kanban:settings\n{"laneWidth": 250}\n%%\n`;
		const board = parseKanbanBoard(md);
		expect(board.lanes).toHaveLength(1);
		expect(board.archive).toHaveLength(1);
		expect(board.settings.laneWidth).toBe(250);
	});

	it('returns empty settings when no settings block', () => {
		const md = `## Lane\n\n- [ ] Task\n`;
		const board = parseKanbanBoard(md);
		expect(board.settings).toEqual({});
	});

	it('gracefully handles malformed settings in board', () => {
		const md = `## Lane\n\n- [ ] Task\n\n%% kanban:settings\n{bad}\n%%\n`;
		const board = parseKanbanBoard(md);
		expect(board.lanes).toHaveLength(1);
		expect(board.settings).toEqual({});
	});
});

// ── serializeKanbanBoard with settings ─────────────────────────────

describe('serializeKanbanBoard with settings', () => {
	it('serializes board with settings block at end', () => {
		const board: KanbanBoard = {
			lanes: [{ id: 'l1', title: 'To Do', items: [{ id: 'i1', text: 'Task', checked: false }] }],
			archive: [],
			settings: { laneWidth: 300 },
		};
		const result = serializeKanbanBoard(board);
		expect(result).toContain('## To Do');
		expect(result).toContain('- [ ] Task');
		expect(result).toContain('%% kanban:settings');
		expect(result).toContain('"laneWidth": 300');
	});

	it('does not append settings block when settings are empty', () => {
		const board: KanbanBoard = {
			lanes: [{ id: 'l1', title: 'Lane', items: [] }],
			archive: [],
			settings: {},
		};
		const result = serializeKanbanBoard(board);
		expect(result).not.toContain('kanban:settings');
	});

	it('appends settings after archive section', () => {
		const board: KanbanBoard = {
			lanes: [{ id: 'l1', title: 'Active', items: [] }],
			archive: [{ id: 'a1', text: 'Archived', checked: true }],
			settings: { laneWidth: 280 },
		};
		const result = serializeKanbanBoard(board);
		const archivePos = result.indexOf('## Archive');
		const settingsPos = result.indexOf('%% kanban:settings');
		expect(archivePos).toBeGreaterThan(-1);
		expect(settingsPos).toBeGreaterThan(archivePos);
	});
});

// ── Settings round-trip ────────────────────────────────────────────

describe('settings round-trip', () => {
	it('preserves settings through parse → serialize → parse', () => {
		const settings: KanbanSettings = {
			laneWidth: 320,
			tagColors: { urgent: 'red', bug: 'orange' },
			laneSettings: {
				Done: { autoComplete: true, maxItems: 15, collapsed: false },
				'To Do': { collapsed: true },
			},
			sortMode: 'date-asc',
			viewMode: 'board',
		};
		const board: KanbanBoard = {
			lanes: [
				{ id: 'l1', title: 'To Do', items: [{ id: 'i1', text: 'Task', checked: false }] },
				{ id: 'l2', title: 'Done', items: [] },
			],
			archive: [{ id: 'a1', text: 'Old', checked: true }],
			settings,
		};

		const serialized = serializeKanbanBoard(board);
		const parsed = parseKanbanBoard(serialized);

		expect(parsed.settings.laneWidth).toBe(320);
		expect(parsed.settings.tagColors).toEqual({ urgent: 'red', bug: 'orange' });
		expect(parsed.settings.laneSettings?.Done?.autoComplete).toBe(true);
		expect(parsed.settings.laneSettings?.Done?.maxItems).toBe(15);
		expect(parsed.settings.laneSettings?.['To Do']?.collapsed).toBe(true);
		expect(parsed.settings.sortMode).toBe('date-asc');
		expect(parsed.settings.viewMode).toBe('board');
	});

	it('preserves board structure when settings are added', () => {
		const md = `## To Do\n\n- [ ] Task A\n- [x] Task B\n\n## Done\n\n- [x] Task C\n`;
		const board1 = parseKanbanBoard(md);
		expect(board1.settings).toEqual({});

		const boardWithSettings = updateBoardSettings(board1, { laneWidth: 300 });
		const serialized = serializeKanbanBoard(boardWithSettings);
		const board2 = parseKanbanBoard(serialized);

		expect(board2.lanes).toHaveLength(2);
		expect(board2.lanes[0].items).toHaveLength(2);
		expect(board2.settings.laneWidth).toBe(300);
	});
});

// ── updateBoardSettings ────────────────────────────────────────────

describe('updateBoardSettings', () => {
	it('merges new settings into existing', () => {
		const board = makeBoard({ settings: { laneWidth: 272 } });
		const result = updateBoardSettings(board, { sortMode: 'date-asc' });
		expect(result.settings.laneWidth).toBe(272);
		expect(result.settings.sortMode).toBe('date-asc');
	});

	it('overwrites existing settings', () => {
		const board = makeBoard({ settings: { laneWidth: 272 } });
		const result = updateBoardSettings(board, { laneWidth: 350 });
		expect(result.settings.laneWidth).toBe(350);
	});

	it('does not mutate original board', () => {
		const board = makeBoard({ settings: { laneWidth: 272 } });
		updateBoardSettings(board, { laneWidth: 350 });
		expect(board.settings.laneWidth).toBe(272);
	});
});

// ── isLaneCollapsed ────────────────────────────────────────────────

describe('isLaneCollapsed', () => {
	it('returns false by default', () => {
		const board = makeBoard();
		expect(isLaneCollapsed(board, 'To Do')).toBe(false);
	});

	it('returns false when lane has no collapse setting', () => {
		const board = makeBoard({ settings: { laneSettings: { Done: { maxItems: 5 } } } });
		expect(isLaneCollapsed(board, 'Done')).toBe(false);
	});

	it('returns true when lane is collapsed', () => {
		const board = makeBoard({ settings: { laneSettings: { 'To Do': { collapsed: true } } } });
		expect(isLaneCollapsed(board, 'To Do')).toBe(true);
	});

	it('returns false when lane is explicitly not collapsed', () => {
		const board = makeBoard({ settings: { laneSettings: { 'To Do': { collapsed: false } } } });
		expect(isLaneCollapsed(board, 'To Do')).toBe(false);
	});
});

// ── toggleLaneCollapsed ────────────────────────────────────────────

describe('toggleLaneCollapsed', () => {
	it('collapses a lane that is not collapsed', () => {
		const board = makeBoard();
		const result = toggleLaneCollapsed(board, 'To Do');
		expect(isLaneCollapsed(result, 'To Do')).toBe(true);
	});

	it('expands a collapsed lane', () => {
		const board = makeBoard({ settings: { laneSettings: { 'To Do': { collapsed: true } } } });
		const result = toggleLaneCollapsed(board, 'To Do');
		expect(isLaneCollapsed(result, 'To Do')).toBe(false);
	});

	it('does not mutate original board', () => {
		const board = makeBoard();
		toggleLaneCollapsed(board, 'To Do');
		expect(isLaneCollapsed(board, 'To Do')).toBe(false);
	});

	it('preserves other lane settings', () => {
		const board = makeBoard({ settings: { laneSettings: { Done: { maxItems: 10 } } } });
		const result = toggleLaneCollapsed(board, 'To Do');
		expect(result.settings.laneSettings?.Done?.maxItems).toBe(10);
		expect(isLaneCollapsed(result, 'To Do')).toBe(true);
	});

	it('collapsed state persists through round-trip', () => {
		const board = makeBoard();
		const collapsed = toggleLaneCollapsed(board, 'To Do');
		const serialized = serializeKanbanBoard(collapsed);
		const parsed = parseKanbanBoard(serialized);
		expect(isLaneCollapsed(parsed, 'To Do')).toBe(true);
	});
});

// ── DEFAULT_LANE_WIDTH ─────────────────────────────────────────────

describe('DEFAULT_LANE_WIDTH', () => {
	it('is 272', () => {
		expect(DEFAULT_LANE_WIDTH).toBe(272);
	});

	it('is used as fallback when no laneWidth setting', () => {
		const board = makeBoard();
		expect(board.settings.laneWidth ?? DEFAULT_LANE_WIDTH).toBe(272);
	});

	it('is overridden by laneWidth setting', () => {
		const board = makeBoard({ settings: { laneWidth: 350 } });
		expect(board.settings.laneWidth ?? DEFAULT_LANE_WIDTH).toBe(350);
	});
});

// ── getLaneMaxItems / setLaneMaxItems / isLaneAtLimit ───────────────

describe('getLaneMaxItems', () => {
	it('returns 0 by default (unlimited)', () => {
		const board = makeBoard();
		expect(getLaneMaxItems(board, 'To Do')).toBe(0);
	});

	it('returns the configured max items', () => {
		const board = makeBoard({ settings: { laneSettings: { 'To Do': { maxItems: 5 } } } });
		expect(getLaneMaxItems(board, 'To Do')).toBe(5);
	});
});

describe('setLaneMaxItems', () => {
	it('sets max items for a lane', () => {
		const board = makeBoard();
		const result = setLaneMaxItems(board, 'To Do', 10);
		expect(getLaneMaxItems(result, 'To Do')).toBe(10);
	});

	it('clears max items when set to 0', () => {
		const board = makeBoard({ settings: { laneSettings: { 'To Do': { maxItems: 5 } } } });
		const result = setLaneMaxItems(board, 'To Do', 0);
		expect(result.settings.laneSettings?.['To Do']?.maxItems).toBeUndefined();
	});

	it('does not mutate original board', () => {
		const board = makeBoard();
		setLaneMaxItems(board, 'To Do', 10);
		expect(getLaneMaxItems(board, 'To Do')).toBe(0);
	});

	it('preserves other lane settings', () => {
		const board = makeBoard({ settings: { laneSettings: { 'To Do': { collapsed: true } } } });
		const result = setLaneMaxItems(board, 'To Do', 5);
		expect(isLaneCollapsed(result, 'To Do')).toBe(true);
		expect(getLaneMaxItems(result, 'To Do')).toBe(5);
	});
});

describe('isLaneAtLimit', () => {
	it('returns false when no limit set', () => {
		const board = makeBoard();
		expect(isLaneAtLimit(board, 'To Do')).toBe(false);
	});

	it('returns false when below limit', () => {
		const board = makeBoard({ settings: { laneSettings: { 'To Do': { maxItems: 5 } } } });
		expect(isLaneAtLimit(board, 'To Do')).toBe(false); // has 2 items
	});

	it('returns true when at limit', () => {
		const board = makeBoard({ settings: { laneSettings: { 'To Do': { maxItems: 2 } } } });
		expect(isLaneAtLimit(board, 'To Do')).toBe(true); // has 2 items
	});

	it('returns true when above limit', () => {
		const board = makeBoard({ settings: { laneSettings: { 'To Do': { maxItems: 1 } } } });
		expect(isLaneAtLimit(board, 'To Do')).toBe(true); // has 2 items
	});

	it('returns false for nonexistent lane', () => {
		const board = makeBoard({ settings: { laneSettings: { 'Nope': { maxItems: 1 } } } });
		expect(isLaneAtLimit(board, 'Nope')).toBe(false);
	});
});

// ── isLaneAutoComplete / setLaneAutoComplete ───────────────────────

describe('isLaneAutoComplete', () => {
	it('returns false by default', () => {
		const board = makeBoard();
		expect(isLaneAutoComplete(board, 'Done')).toBe(false);
	});

	it('returns true when enabled', () => {
		const board = makeBoard({ settings: { laneSettings: { Done: { autoComplete: true } } } });
		expect(isLaneAutoComplete(board, 'Done')).toBe(true);
	});
});

describe('setLaneAutoComplete', () => {
	it('enables auto-complete', () => {
		const board = makeBoard();
		const result = setLaneAutoComplete(board, 'Done', true);
		expect(isLaneAutoComplete(result, 'Done')).toBe(true);
	});

	it('disables auto-complete', () => {
		const board = makeBoard({ settings: { laneSettings: { Done: { autoComplete: true } } } });
		const result = setLaneAutoComplete(board, 'Done', false);
		expect(isLaneAutoComplete(result, 'Done')).toBe(false);
	});

	it('preserves other lane settings', () => {
		const board = makeBoard({ settings: { laneSettings: { Done: { maxItems: 10 } } } });
		const result = setLaneAutoComplete(board, 'Done', true);
		expect(result.settings.laneSettings?.Done?.maxItems).toBe(10);
		expect(isLaneAutoComplete(result, 'Done')).toBe(true);
	});

	it('does not mutate original board', () => {
		const board = makeBoard();
		setLaneAutoComplete(board, 'Done', true);
		expect(isLaneAutoComplete(board, 'Done')).toBe(false);
	});
});

// ── moveItem with autoCheck ────────────────────────────────────────

describe('moveItem with autoCheck', () => {
	it('auto-checks item when moving to auto-complete lane', () => {
		const board = makeBoard();
		const result = moveItem(board, 'lane-1', 'item-1', 'lane-2', 0, true);
		expect(result.lanes[1].items[0].checked).toBe(true);
	});

	it('does not auto-check when moving within same lane', () => {
		const board = makeBoard();
		const result = moveItem(board, 'lane-1', 'item-1', 'lane-1', 1, true);
		expect(result.lanes[0].items[1].checked).toBe(false);
	});

	it('preserves checked state when autoCheck is false', () => {
		const board = makeBoard();
		const result = moveItem(board, 'lane-1', 'item-1', 'lane-2', 0, false);
		expect(result.lanes[1].items[0].checked).toBe(false);
	});

	it('preserves checked state when autoCheck is undefined', () => {
		const board = makeBoard();
		const result = moveItem(board, 'lane-1', 'item-1', 'lane-2', 0);
		expect(result.lanes[1].items[0].checked).toBe(false);
	});
});

// ── extractCardDate ────────────────────────────────────────────────

describe('extractCardDate', () => {
	it('extracts date from text with date', () => {
		expect(extractCardDate('Task {2025-03-15}')).toBe('2025-03-15');
	});

	it('returns null for text without date', () => {
		expect(extractCardDate('Task without date')).toBeNull();
	});

	it('extracts date from text with other content', () => {
		expect(extractCardDate('Fix bug #urgent {2025-01-01} ASAP')).toBe('2025-01-01');
	});

	it('returns null for malformed dates', () => {
		expect(extractCardDate('Task {2025-1-1}')).toBeNull();
		expect(extractCardDate('Task {25-03-15}')).toBeNull();
	});
});

// ── setCardDate ────────────────────────────────────────────────────

describe('setCardDate', () => {
	it('appends date to text without date', () => {
		expect(setCardDate('Task A', '2025-03-15')).toBe('Task A {2025-03-15}');
	});

	it('replaces existing date', () => {
		expect(setCardDate('Task {2025-01-01}', '2025-12-25')).toBe('Task {2025-12-25}');
	});

	it('replaces date in middle of text', () => {
		expect(setCardDate('Fix {2025-01-01} ASAP', '2025-06-15')).toBe('Fix {2025-06-15} ASAP');
	});
});

// ── removeCardDate ─────────────────────────────────────────────────

describe('removeCardDate', () => {
	it('removes date from text', () => {
		expect(removeCardDate('Task {2025-03-15}')).toBe('Task');
	});

	it('is no-op on text without date', () => {
		expect(removeCardDate('Task without date')).toBe('Task without date');
	});

	it('removes date and collapses extra spaces', () => {
		expect(removeCardDate('Fix {2025-01-01} ASAP')).toBe('Fix ASAP');
	});
});

// ── getDateProximity ───────────────────────────────────────────────

describe('getDateProximity', () => {
	const todayStr = '2025-06-15';

	it('returns none for null date', () => {
		expect(getDateProximity(null, todayStr)).toBe('none');
	});

	it('returns overdue for past date', () => {
		expect(getDateProximity('2025-06-14', todayStr)).toBe('overdue');
		expect(getDateProximity('2025-01-01', todayStr)).toBe('overdue');
	});

	it('returns today for same date', () => {
		expect(getDateProximity('2025-06-15', todayStr)).toBe('today');
	});

	it('returns tomorrow for next day', () => {
		expect(getDateProximity('2025-06-16', todayStr)).toBe('tomorrow');
	});

	it('returns upcoming for 2-3 days out', () => {
		expect(getDateProximity('2025-06-17', todayStr)).toBe('upcoming');
		expect(getDateProximity('2025-06-18', todayStr)).toBe('upcoming');
	});

	it('returns future for 4+ days out', () => {
		expect(getDateProximity('2025-06-19', todayStr)).toBe('future');
		expect(getDateProximity('2025-12-25', todayStr)).toBe('future');
	});
});

// ── cardProximity / PROXIMITY_CLASSES ──────────────────────────────

describe('cardProximity', () => {
	const todayStr = '2025-06-15';

	it('returns none for a checked overdue card', () => {
		expect(cardProximity('2025-06-14', todayStr, true)).toBe('none');
	});

	it('returns overdue for the same card unchecked', () => {
		expect(cardProximity('2025-06-14', todayStr, false)).toBe('overdue');
	});

	it('returns none for an unchecked card with no date', () => {
		expect(cardProximity(null, todayStr, false)).toBe('none');
	});
});

describe('PROXIMITY_CLASSES', () => {
	const ALL: DateProximity[] = ['overdue', 'today', 'tomorrow', 'upcoming', 'future', 'none'];

	it('has an entry for every DateProximity', () => {
		expect(Object.keys(PROXIMITY_CLASSES).sort()).toEqual([...ALL].sort());
	});

	it('uses no Tailwind palette class', () => {
		const palette = /-(red|orange|amber|yellow|green|blue|purple)-\d{2,3}\b/;
		for (const tone of ALL) {
			expect(PROXIMITY_CLASSES[tone].badge).not.toMatch(palette);
			expect(PROXIMITY_CLASSES[tone].border).not.toMatch(palette);
		}
	});

	it('maps each tone to its theme token', () => {
		expect(PROXIMITY_CLASSES.overdue).toEqual({ badge: 'bg-destructive/15 text-destructive', border: 'border-l-4 border-l-destructive' });
		expect(PROXIMITY_CLASSES.today).toEqual({ badge: 'bg-warning/15 text-warning', border: 'border-l-4 border-l-warning' });
		expect(PROXIMITY_CLASSES.tomorrow).toEqual({ badge: 'bg-type-orange/15 text-type-orange', border: 'border-l-4 border-l-type-orange' });
		expect(PROXIMITY_CLASSES.upcoming).toEqual({ badge: 'bg-type-blue/15 text-type-blue', border: 'border-l-4 border-l-type-blue' });
		expect(PROXIMITY_CLASSES.future).toEqual({ badge: 'bg-muted text-muted-foreground', border: '' });
		expect(PROXIMITY_CLASSES.none).toEqual({ badge: 'bg-muted text-muted-foreground', border: '' });
	});
});

// ── Card color extraction/manipulation ────────────────────────

describe('extractCardColor', () => {
	it('extracts color from text with color', () => {
		expect(extractCardColor('Task {color:blue}')).toBe('blue');
	});

	it('returns null for text without color', () => {
		expect(extractCardColor('Task without color')).toBeNull();
	});

	it('extracts color from text with surrounding content', () => {
		expect(extractCardColor('Fix bug {color:red} ASAP')).toBe('red');
	});

	it('returns null for invalid color names', () => {
		expect(extractCardColor('Task {color:pink}')).toBeNull();
		expect(extractCardColor('Task {color:}')).toBeNull();
	});

	it('extracts color when date is also present', () => {
		expect(extractCardColor('Task {2025-01-01} {color:green}')).toBe('green');
	});

	it('extracts each valid preset color', () => {
		expect(extractCardColor('{color:blue}')).toBe('blue');
		expect(extractCardColor('{color:green}')).toBe('green');
		expect(extractCardColor('{color:red}')).toBe('red');
		expect(extractCardColor('{color:orange}')).toBe('orange');
		expect(extractCardColor('{color:purple}')).toBe('purple');
		expect(extractCardColor('{color:yellow}')).toBe('yellow');
		expect(extractCardColor('{color:gray}')).toBe('gray');
	});
});

describe('setCardColor', () => {
	it('appends color to text without color', () => {
		expect(setCardColor('Task A', 'blue')).toBe('Task A {color:blue}');
	});

	it('replaces existing color', () => {
		expect(setCardColor('Task {color:blue}', 'red')).toBe('Task {color:red}');
	});

	it('replaces color in middle of text', () => {
		expect(setCardColor('Fix {color:blue} ASAP', 'green')).toBe('Fix {color:green} ASAP');
	});
});

describe('removeCardColor', () => {
	it('removes color from text', () => {
		expect(removeCardColor('Task {color:blue}')).toBe('Task');
	});

	it('is no-op on text without color', () => {
		expect(removeCardColor('Task without color')).toBe('Task without color');
	});

	it('removes color and collapses extra spaces', () => {
		expect(removeCardColor('Fix {color:red} ASAP')).toBe('Fix ASAP');
	});
});

describe('stripCardMetadata', () => {
	it('strips both date and color', () => {
		expect(stripCardMetadata('Task {2025-01-01} {color:blue}')).toBe('Task');
	});

	it('strips only date when no color', () => {
		expect(stripCardMetadata('Task {2025-01-01}')).toBe('Task');
	});

	it('strips only color when no date', () => {
		expect(stripCardMetadata('Task {color:red}')).toBe('Task');
	});

	it('returns plain text unchanged', () => {
		expect(stripCardMetadata('Plain task')).toBe('Plain task');
	});

	it('handles date and color in any order', () => {
		expect(stripCardMetadata('{color:blue} Task {2025-06-01}')).toBe('Task');
	});

	it('strips consecutive metadata tokens with no space between them', () => {
		expect(stripCardMetadata('Task {2025-01-01}{color:blue}')).toBe('Task');
	});
});

// ── Tag colors ────────────────────────────────────────────────

describe('extractCardTags', () => {
	it('extracts single tag', () => {
		expect(extractCardTags('Fix bug #urgent')).toEqual(['urgent']);
	});

	it('extracts multiple tags', () => {
		expect(extractCardTags('#frontend task #backend')).toEqual(['frontend', 'backend']);
	});

	it('deduplicates tags', () => {
		expect(extractCardTags('#bug fix #bug again')).toEqual(['bug']);
	});

	it('returns empty for no tags', () => {
		expect(extractCardTags('No tags here')).toEqual([]);
	});

	it('supports unicode tags', () => {
		expect(extractCardTags('#código #revisão')).toEqual(['código', 'revisão']);
	});

	it('supports tags with hyphens and slashes', () => {
		expect(extractCardTags('#feature/auth #bug-fix')).toEqual(['feature/auth', 'bug-fix']);
	});

	it('does not match mid-word hashes', () => {
		expect(extractCardTags('C#sharp')).toEqual([]);
	});

	it('ignores standalone hash', () => {
		expect(extractCardTags('# heading')).toEqual([]);
	});
});

describe('setTagColor', () => {
	it('sets a tag color in settings', () => {
		const board = makeBoard();
		const result = setTagColor(board, 'urgent', 'red');
		expect(result.settings.tagColors).toEqual({ urgent: 'red' });
	});

	it('preserves existing tag colors', () => {
		const board = makeBoard();
		const step1 = setTagColor(board, 'urgent', 'red');
		const step2 = setTagColor(step1, 'bug', 'orange');
		expect(step2.settings.tagColors).toEqual({ urgent: 'red', bug: 'orange' });
	});

	it('overwrites existing color for same tag', () => {
		const board = makeBoard();
		const step1 = setTagColor(board, 'urgent', 'red');
		const step2 = setTagColor(step1, 'urgent', 'blue');
		expect(step2.settings.tagColors).toEqual({ urgent: 'blue' });
	});
});

describe('removeTagColor', () => {
	it('removes a tag color from settings', () => {
		const board = makeBoard();
		const step1 = setTagColor(board, 'urgent', 'red');
		const result = removeTagColor(step1, 'urgent');
		expect(result.settings.tagColors).toEqual({});
	});

	it('does nothing if tag does not exist', () => {
		const board = makeBoard();
		const result = removeTagColor(board, 'nonexistent');
		expect(result.settings.tagColors).toEqual({});
	});

	it('preserves other tag colors', () => {
		const board = makeBoard();
		const step1 = setTagColor(board, 'urgent', 'red');
		const step2 = setTagColor(step1, 'bug', 'orange');
		const result = removeTagColor(step2, 'urgent');
		expect(result.settings.tagColors).toEqual({ bug: 'orange' });
	});
});

// ── Wikilinks ─────────────────────────────────────────────────

describe('extractCardWikilinks', () => {
	it('extracts simple wikilink', () => {
		expect(extractCardWikilinks('See [[My Note]]')).toEqual([
			{ target: 'My Note', display: 'My Note' },
		]);
	});

	it('extracts wikilink with heading', () => {
		expect(extractCardWikilinks('See [[Note#Section]]')).toEqual([
			{ target: 'Note', heading: 'Section', display: 'Note#Section' },
		]);
	});

	it('extracts wikilink with display text', () => {
		expect(extractCardWikilinks('See [[Note|custom text]]')).toEqual([
			{ target: 'Note', display: 'custom text' },
		]);
	});

	it('extracts multiple wikilinks', () => {
		const result = extractCardWikilinks('Link [[A]] and [[B|bee]]');
		expect(result).toHaveLength(2);
		expect(result[0]).toEqual({ target: 'A', display: 'A' });
		expect(result[1]).toEqual({ target: 'B', display: 'bee' });
	});

	it('returns empty for no wikilinks', () => {
		expect(extractCardWikilinks('No links here')).toEqual([]);
	});
});

describe('parseCardSegments', () => {
	it('returns single text segment for plain text', () => {
		expect(parseCardSegments('Hello world')).toEqual([
			{ type: 'text', value: 'Hello world' },
		]);
	});

	it('parses wikilink in text', () => {
		const segs = parseCardSegments('See [[Note]] here');
		expect(segs).toEqual([
			{ type: 'text', value: 'See ' },
			{ type: 'wikilink', target: 'Note', display: 'Note' },
			{ type: 'text', value: ' here' },
		]);
	});

	it('parses tag in text', () => {
		const segs = parseCardSegments('Fix #urgent bug');
		expect(segs).toEqual([
			{ type: 'text', value: 'Fix ' },
			{ type: 'tag', value: 'urgent' },
			{ type: 'text', value: ' bug' },
		]);
	});

	it('parses mixed wikilinks and tags', () => {
		const segs = parseCardSegments('See [[Note]] #todo');
		expect(segs).toHaveLength(4);
		expect(segs[0]).toEqual({ type: 'text', value: 'See ' });
		expect(segs[1]).toEqual({ type: 'wikilink', target: 'Note', display: 'Note' });
		expect(segs[2]).toEqual({ type: 'text', value: ' ' });
		expect(segs[3]).toEqual({ type: 'tag', value: 'todo' });
	});

	it('handles tag at start of text', () => {
		const segs = parseCardSegments('#urgent fix');
		expect(segs[0]).toEqual({ type: 'tag', value: 'urgent' });
		expect(segs[1]).toEqual({ type: 'text', value: ' fix' });
	});

	it('handles wikilink with display text', () => {
		const segs = parseCardSegments('Read [[Note|my doc]]');
		expect(segs).toEqual([
			{ type: 'text', value: 'Read ' },
			{ type: 'wikilink', target: 'Note', heading: undefined, display: 'my doc' },
		]);
	});

	it('returns empty array for empty string', () => {
		expect(parseCardSegments('')).toEqual([]);
	});

	it('parses consecutive wikilinks with no text between them', () => {
		const segs = parseCardSegments('[[A]][[B]]');
		expect(segs).toEqual([
			{ type: 'wikilink', target: 'A', heading: undefined, display: 'A' },
			{ type: 'wikilink', target: 'B', heading: undefined, display: 'B' },
		]);
	});

	it('parses consecutive tags separated by a single space', () => {
		const segs = parseCardSegments('#a #b');
		expect(segs).toEqual([
			{ type: 'tag', value: 'a' },
			{ type: 'text', value: ' ' },
			{ type: 'tag', value: 'b' },
		]);
	});

	it('does not treat a hash glued to a wikilink as a tag', () => {
		// Tag matching requires start-of-line or whitespace before '#'
		const segs = parseCardSegments('[[A]]#tag');
		expect(segs).toEqual([
			{ type: 'wikilink', target: 'A', heading: undefined, display: 'A' },
			{ type: 'text', value: '#tag' },
		]);
	});

	it('treats leftover metadata tokens as plain text (must be stripped beforehand)', () => {
		// Date/color tokens are not recognized by the segment parser; callers
		// strip them via stripCardMetadata before rendering.
		const segs = parseCardSegments('Task {2025-01-01} {color:blue}');
		expect(segs).toEqual([
			{ type: 'text', value: 'Task {2025-01-01} {color:blue}' },
		]);
	});
});

// ── Sorting ───────────────────────────────────────────────────

describe('sortItems', () => {
	const items = [
		{ id: 'a', text: 'Charlie {2025-06-20}', checked: false },
		{ id: 'b', text: 'Alpha', checked: true },
		{ id: 'c', text: 'Bravo {2025-06-10}', checked: false },
	];

	it('returns items unchanged for manual sort', () => {
		expect(sortItems(items, 'manual')).toBe(items);
	});

	it('sorts by text ascending', () => {
		const sorted = sortItems(items, 'text-asc');
		expect(sorted.map((i) => i.id)).toEqual(['b', 'c', 'a']);
	});

	it('sorts by text descending', () => {
		const sorted = sortItems(items, 'text-desc');
		expect(sorted.map((i) => i.id)).toEqual(['a', 'c', 'b']);
	});

	it('sorts by date ascending (no-date items last)', () => {
		const sorted = sortItems(items, 'date-asc');
		expect(sorted.map((i) => i.id)).toEqual(['c', 'a', 'b']);
	});

	it('sorts by date descending (no-date items last)', () => {
		const sorted = sortItems(items, 'date-desc');
		expect(sorted.map((i) => i.id)).toEqual(['a', 'c', 'b']);
	});

	it('sorts checked items last', () => {
		const sorted = sortItems(items, 'checked');
		expect(sorted.map((i) => i.id)).toEqual(['a', 'c', 'b']);
	});

	it('handles empty array', () => {
		expect(sortItems([], 'text-asc')).toEqual([]);
	});

	it('does not mutate original array', () => {
		const original = [...items];
		sortItems(items, 'text-asc');
		expect(items).toEqual(original);
	});
});

describe('setSortMode', () => {
	it('sets sort mode in board settings', () => {
		const board = makeBoard();
		const result = setSortMode(board, 'date-asc');
		expect(result.settings.sortMode).toBe('date-asc');
	});

	it('preserves other settings', () => {
		const board = makeBoard({ settings: { laneWidth: 300, sortMode: 'manual' } });
		const result = setSortMode(board, 'text-desc');
		expect(result.settings.laneWidth).toBe(300);
		expect(result.settings.sortMode).toBe('text-desc');
	});
});

// ── Filtering ─────────────────────────────────────────────────

describe('filterItems', () => {
	const items = [
		{ id: 'a', text: 'Fix #urgent bug', checked: false },
		{ id: 'b', text: 'Review [[docs]] {2025-06-20}', checked: true },
		{ id: 'c', text: 'Deploy to production', checked: false },
	];

	it('returns all items for empty query', () => {
		expect(filterItems(items, '')).toBe(items);
	});

	it('returns all items for whitespace query', () => {
		expect(filterItems(items, '   ')).toBe(items);
	});

	it('filters by text content', () => {
		const result = filterItems(items, 'deploy');
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe('c');
	});

	it('is case-insensitive', () => {
		expect(filterItems(items, 'FIX')).toHaveLength(1);
		expect(filterItems(items, 'fix')).toHaveLength(1);
	});

	it('filters by tag', () => {
		const result = filterItems(items, '#urgent');
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe('a');
	});

	it('filters by date in card text', () => {
		const result = filterItems(items, '2025-06');
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe('b');
	});

	it('returns empty when no match', () => {
		expect(filterItems(items, 'nonexistent')).toEqual([]);
	});
});

// ── View mode ─────────────────────────────────────────────────

describe('setViewMode', () => {
	it('sets view mode in board settings', () => {
		const board = makeBoard();
		const result = setViewMode(board, 'list');
		expect(result.settings.viewMode).toBe('list');
	});

	it('preserves other settings', () => {
		const board = makeBoard({ settings: { laneWidth: 300, viewMode: 'board' } });
		const result = setViewMode(board, 'table');
		expect(result.settings.laneWidth).toBe(300);
		expect(result.settings.viewMode).toBe('table');
	});

	it('round-trips through serialization', () => {
		const board = makeBoard({ settings: { viewMode: 'list' } });
		const md = serializeKanbanBoard(board);
		const parsed = parseKanbanBoard(md);
		expect(parsed.settings.viewMode).toBe('list');
	});
});

describe('canReorderItems', () => {
	it('allows manual reorder when sort is manual and no filter is active', () => {
		expect(canReorderItems('manual', '')).toBe(true);
		expect(canReorderItems('manual', '   ')).toBe(true);
	});

	it('blocks reorder when a filter is active (visible order != stored order)', () => {
		// Drop positions are computed among the filtered DOM cards; mapping them
		// into the lane's full item array misplaces and persists cards.
		expect(canReorderItems('manual', 'x')).toBe(false);
		expect(canReorderItems('manual', ' fix ')).toBe(false);
	});

	it('blocks reorder when the board is sorted (non-manual)', () => {
		expect(canReorderItems('date-asc', '')).toBe(false);
		expect(canReorderItems('text-desc', '')).toBe(false);
		expect(canReorderItems('checked', 'x')).toBe(false);
	});
});

// ── Lossless round trip ─────────────────────────────────────────────

/** Deterministic PRNG (mulberry32) so a failing seed reproduces. */
function seededRandom(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const LANE_TITLES = ['To Do', 'Doing', 'Done', 'Ideas #x', 'Q3 [[Plan]]'];
const CARD_TEXTS = ['write tests', 'call #urgent', '[[Note]] {2026-01-02}', 'x', '', 'trailing space '];
const UNMODELED_LINES = [
	'Prose the user typed.',
	'### Sub heading',
	'    indented detail',
	'\tindented with a tab',
	'- [/] half done',
	'- [-] cancelled',
	'* [ ] star bullet',
	'+ plain list',
	'---',
	'',
	'   ',
	'%% a comment %%',
];
const SETTINGS_CHOICES: KanbanSettings[] = [
	{},
	{ viewMode: 'list' },
	{ laneWidth: 300, laneSettings: { Done: { autoComplete: true, maxItems: 3 } } },
];

/** A board the app could have written: lanes, cards, archive and settings. */
function randomAppBoard(rand: () => number): KanbanBoard {
	const pick = <T>(xs: T[]): T => xs[Math.floor(rand() * xs.length)];
	const item = () => ({ id: generateKanbanId(), text: pick(CARD_TEXTS), checked: rand() < 0.4 });
	const lanes = Array.from({ length: Math.floor(rand() * 4) }, () => ({
		id: generateKanbanId(),
		title: pick(LANE_TITLES),
		items: Array.from({ length: Math.floor(rand() * 4) }, item),
	}));
	const archive = rand() < 0.4 ? Array.from({ length: 1 + Math.floor(rand() * 3) }, item) : [];
	return { lanes, archive, settings: pick(SETTINGS_CHOICES) };
}

/**
 * Inserts unrecognized lines between the lines of an app-written board, never
 * inside the archive separator form or the settings block (which the serializer
 * always writes at the end).
 */
function withUnmodeledLines(md: string, rand: () => number): string {
	const lines = md.split('\n');
	const settingsAt = lines.findIndex((l) => l.startsWith('%% kanban:settings'));
	const end = settingsAt >= 0 ? settingsAt : lines.length;
	const separatorAt = lines.findIndex((l, i) => l === '---' && lines[i + 2] === '## Archive');
	const out: string[] = [];
	for (let i = 0; i < lines.length; i++) {
		const insideArchiveForm = separatorAt >= 0 && i > separatorAt && i <= separatorAt + 2;
		if (i <= end && !insideArchiveForm && rand() < 0.35) {
			const count = 1 + Math.floor(rand() * 3);
			for (let k = 0; k < count; k++) out.push(UNMODELED_LINES[Math.floor(rand() * UNMODELED_LINES.length)]);
		}
		out.push(lines[i]);
	}
	return out.join('\n');
}

describe('lossless round trip', () => {
	it('property: parse then serialize returns any app-written board with unmodeled lines unchanged', () => {
		for (let seed = 1; seed <= 400; seed++) {
			const rand = seededRandom(seed);
			let md = withUnmodeledLines(serializeKanbanBoard(randomAppBoard(rand)), rand);
			if (rand() < 0.3) md = md.replace(/\n/g, '\r\n');
			expect(serializeKanbanBoard(parseKanbanBoard(md)), `seed ${seed}`).toBe(md);
		}
	});

	it('property: toggling one card changes only that card line', () => {
		for (let seed = 1; seed <= 400; seed++) {
			const rand = seededRandom(seed);
			const md = withUnmodeledLines(serializeKanbanBoard(randomAppBoard(rand)), rand);
			const board = parseKanbanBoard(md);
			const lane = board.lanes.find((l) => l.items.length > 0);
			if (!lane) continue;
			const item = lane.items[Math.floor(rand() * lane.items.length)];
			const before = md.split('\n');
			const after = serializeKanbanBoard(toggleItem(board, lane.id, item.id)).split('\n');
			expect(after, `seed ${seed}`).toHaveLength(before.length);
			const changed = before.flatMap((line, i) => (line === after[i] ? [] : [i]));
			expect(changed, `seed ${seed}`).toHaveLength(1);
			expect(after[changed[0]].replace('[x]', '[ ]'), `seed ${seed}`).toBe(before[changed[0]].replace('[x]', '[ ]'));
		}
	});

	it('the app-created board serializes as before (canonical layout)', () => {
		const md = serializeKanbanBoard(createEmptyKanbanBoard());
		expect(md).toBe('## To Do\n\n\n## In Progress\n\n\n## Done\n\n');
		const board = parseKanbanBoard(md);
		const withCard = addItem(board, board.lanes[2].id, 'first');
		expect(serializeKanbanBoard(withCard)).toBe('## To Do\n\n\n## In Progress\n\n\n## Done\n\n- [ ] first\n');
	});

	it('handles content with no trailing newline', () => {
		const md = '## A\n\n- [ ] a';
		expect(serializeKanbanBoard(parseKanbanBoard(md))).toBe(md);
	});

	it('keeps unmodeled lines in place through a toggle', () => {
		const md = '## To Do\n\nProse.\n### Sub\n- [ ] one\n    detail\n- [/] half\n- [ ] two\n\n## Done\n\n';
		const board = parseKanbanBoard(md);
		expect(board.lanes.map((l) => l.items.map((i) => i.text))).toEqual([['one', 'two'], []]);
		const out = serializeKanbanBoard(toggleItem(board, board.lanes[0].id, board.lanes[0].items[1].id));
		expect(out).toBe(md.replace('- [ ] two', '- [x] two'));
	});

	it('a "### Sub" line stays in place and the cards after it still follow it', () => {
		const md = '## Lane\n\n- [ ] a\n### Sub\n- [ ] b\n- [ ] c\n';
		const board = parseKanbanBoard(md);
		const lane = board.lanes[0];
		expect(board.lanes).toHaveLength(1);
		expect(lane.items.map((i) => i.text)).toEqual(['a', 'b', 'c']);
		const out = serializeKanbanBoard(toggleItem(board, lane.id, lane.items[2].id));
		expect(out).toBe('## Lane\n\n- [ ] a\n### Sub\n- [ ] b\n- [x] c\n');
	});

	it('removing a card keeps the raw lines that followed it in place', () => {
		const md = '## Lane\n\n- [ ] a\nnote after a\n- [ ] b\nnote after b\n- [ ] c\n';
		const board = parseKanbanBoard(md);
		const lane = board.lanes[0];
		const withoutB = serializeKanbanBoard(removeItem(board, lane.id, lane.items[1].id));
		expect(withoutB).toBe('## Lane\n\n- [ ] a\nnote after a\nnote after b\n- [ ] c\n');
		const withoutA = serializeKanbanBoard(removeItem(board, lane.id, lane.items[0].id));
		expect(withoutA).toBe('## Lane\n\nnote after a\n- [ ] b\nnote after b\n- [ ] c\n');
	});

	it('moving a card carries only its indented continuation lines; the rest stay in place', () => {
		const md = '## A\n\n- [ ] a1\n    detail of a1\nnote under a1\n\n## B\n\n- [ ] b1\n';
		const board = parseKanbanBoard(md);
		const [a, b] = board.lanes;
		const out = serializeKanbanBoard(moveItem(board, a.id, a.items[0].id, b.id, 1));
		expect(out).toBe('## A\n\nnote under a1\n\n## B\n\n- [ ] b1\n- [ ] a1\n    detail of a1\n');
	});
});

describe('card actions leave raw lines in place', () => {
	const SUB_BOARD = '## A\n\n- [ ] a\n### Sub\n- [ ] b\n\n## B\n\n- [ ] x\n';

	it('moving the card above "### Sub" to another lane keeps Sub above the cards that followed it', () => {
		const board = parseKanbanBoard(SUB_BOARD);
		const [a, b] = board.lanes;
		const out = serializeKanbanBoard(moveItem(board, a.id, a.items[0].id, b.id, 1));
		expect(out).toBe('## A\n\n### Sub\n- [ ] b\n\n## B\n\n- [ ] x\n- [ ] a\n');
	});

	it('reordering the card above "### Sub" below the next card keeps Sub in place', () => {
		const board = parseKanbanBoard(SUB_BOARD);
		const a = board.lanes[0];
		const out = serializeKanbanBoard(moveItem(board, a.id, a.items[0].id, a.id, 1));
		expect(out).toBe('## A\n\n### Sub\n- [ ] b\n- [ ] a\n\n## B\n\n- [ ] x\n');
	});

	it('reordering a later card keeps the raw line after the card before it', () => {
		const md = '## A\n\n- [ ] a\n### Sub\n- [ ] b\nnote under b\n- [ ] c\n';
		const board = parseKanbanBoard(md);
		const lane = board.lanes[0];
		const out = serializeKanbanBoard(moveItem(board, lane.id, lane.items[1].id, lane.id, 0));
		expect(out).toBe('## A\n\n- [ ] b\n- [ ] a\n### Sub\nnote under b\n- [ ] c\n');
	});

	it('archiving the card above "### Sub" keeps Sub in the lane', () => {
		const board = parseKanbanBoard(SUB_BOARD);
		const a = board.lanes[0];
		const out = serializeKanbanBoard(archiveItem(board, a.id, a.items[0].id));
		expect(out.startsWith('## A\n\n### Sub\n- [ ] b\n\n## B\n')).toBe(true);
		const reopened = parseKanbanBoard(out);
		expect(reopened.lanes[0].items.map((i) => i.text)).toEqual(['b']);
		expect(reopened.archive.map((i) => i.text)).toEqual(['a']);
		expect(reopened.archive[0].extraLines ?? []).toEqual([]);
	});

	it('archiving completed cards keeps their raw lines in the lane', () => {
		const md = '## A\n\n- [x] a\n### Sub\n- [ ] b\n- [x] c\n    detail of c\nnote under c\n- [ ] d\n';
		const board = parseKanbanBoard(md);
		const out = serializeKanbanBoard(archiveCompletedItems(board, board.lanes[0].id));
		expect(out.startsWith('## A\n\n### Sub\n- [ ] b\nnote under c\n- [ ] d\n')).toBe(true);
		const reopened = parseKanbanBoard(out);
		expect(reopened.archive.map((i) => [i.text, i.extraLines ?? []])).toEqual([
			['a', []],
			['c', ['    detail of c']],
		]);
	});

	it('restoring an archived card followed by a "## X" raw line creates no lane', () => {
		const md = '## A\n\n- [ ] a1\n\n---\n\n## Archive\n\n- [x] old\n## Later\n- [x] older\n';
		const board = parseKanbanBoard(md);
		const out = serializeKanbanBoard(restoreItem(board, board.archive[0].id, board.lanes[0].id));
		expect(out).toBe('## A\n\n- [ ] a1\n- [ ] old\n\n---\n\n## Archive\n\n## Later\n- [x] older\n');
		const reopened = parseKanbanBoard(out);
		expect(reopened.lanes.map((l) => l.title)).toEqual(['A']);
		expect(reopened.archive.map((i) => i.text)).toEqual(['older']);
	});

	it('moving a card with a raw "---" after it above a lane titled "Archive" sends no lane to the archive', () => {
		const md = '## A\n\n- [ ] a\n---\n\n## B\n\n- [ ] b\n\n## Archive\n\n- [ ] keep\n\n## C\n\n- [ ] c\n';
		const board = parseKanbanBoard(md);
		expect(board.lanes.map((l) => l.title)).toEqual(['A', 'B', 'Archive', 'C']);
		const [a, b] = board.lanes;
		const out = serializeKanbanBoard(moveItem(board, a.id, a.items[0].id, b.id, 1));
		const reopened = parseKanbanBoard(out);
		expect(reopened.lanes.map((l) => l.title)).toEqual(['A', 'B', 'Archive', 'C']);
		expect(reopened.archive).toEqual([]);
		expect(out).toContain('## A\n\n---\n');
	});

	it('emptying the archive by restore keeps the trailing newline', () => {
		const md = '## A\n\n---\n\n## Archive\n\n- [x] old\n  detail\n';
		const board = parseKanbanBoard(md);
		const out = serializeKanbanBoard(restoreItem(board, board.archive[0].id, board.lanes[0].id));
		expect(out).toBe('## A\n\n- [ ] old\n  detail\n');
	});
});

describe('line endings', () => {
	it('parses a CRLF board and writes CRLF back after a card action', () => {
		const md = '## To Do\r\n\r\n- [ ] one\r\n\r\n## Done\r\n\r\n- [x] two\r\n';
		const board = parseKanbanBoard(md);
		expect(board.lanes.map((l) => l.title)).toEqual(['To Do', 'Done']);
		expect(board.lanes[0].items[0].text).toBe('one');
		const out = serializeKanbanBoard(toggleItem(board, board.lanes[0].id, board.lanes[0].items[0].id));
		expect(out).toBe(md.replace('- [ ] one', '- [x] one'));
	});

	it('writes a new settings block in CRLF on a CRLF board', () => {
		const md = '## To Do\r\n\r\n- [ ] one\r\n';
		const out = serializeKanbanBoard(setViewMode(parseKanbanBoard(md), 'list'));
		expect(out.startsWith(md)).toBe(true);
		expect(out).toContain('%% kanban:settings\r\n');
		expect(out.replace(/\r\n/g, '')).not.toContain('\n');
	});
});

describe('frontmatter', () => {
	it('keeps a leading frontmatter block byte for byte and does not read it as the archive', () => {
		const fm = '---\ntitle: Board\ntags: [work]\n---\n';
		const md = `${fm}\n## To Do\n\n- [ ] one\n\n## Done\n\n- [x] two\n`;
		const board = parseKanbanBoard(md);
		expect(board.lanes.map((l) => l.title)).toEqual(['To Do', 'Done']);
		expect(board.archive).toEqual([]);
		const out = serializeKanbanBoard(toggleItem(board, board.lanes[0].id, board.lanes[0].items[0].id));
		expect(out.startsWith(fm)).toBe(true);
		expect(out).toBe(md.replace('- [ ] one', '- [x] one'));
	});

	it('keeps frontmatter and the real archive apart', () => {
		const md = '---\na: 1\n---\n\n## A\n\n- [ ] a1\n\n---\n\n## Archive\n\n- [x] old\n';
		const board = parseKanbanBoard(md);
		expect(board.lanes.map((l) => l.title)).toEqual(['A']);
		expect(board.archive.map((i) => i.text)).toEqual(['old']);
		expect(serializeKanbanBoard(board)).toBe(md);
	});

	it('a frontmatter with a "## " YAML comment is still frontmatter', () => {
		const fm = '---\n## comment\ntags: [x]\n---\n';
		const md = `${fm}\n## A\n\n- [ ] a1\n`;
		const board = parseKanbanBoard(md);
		expect(board.lanes.map((l) => l.title)).toEqual(['A']);
		const out = serializeKanbanBoard(addItem(board, board.lanes[0].id, 'new'));
		expect(out).toBe(`${fm}\n## A\n\n- [ ] a1\n- [ ] new\n`);
	});

	it('a "---" on line 0, an empty lane, then the archive is a rule, not a frontmatter', () => {
		const md = '---\n## A\n\n---\n\n## Archive\n\n- [x] old\n';
		const board = parseKanbanBoard(md);
		expect(board.lanes.map((l) => l.title)).toEqual(['A']);
		expect(board.archive.map((i) => i.text)).toEqual(['old']);
		expect(serializeKanbanBoard(board)).toBe(md);
	});

	it('a "---" on line 0 followed by a lane is a rule, not an unclosed frontmatter', () => {
		const md = '---\n## A\n\n- [ ] a1\n\n---\n\n## Archive\n\n- [x] old\n';
		const board = parseKanbanBoard(md);
		expect(board.lanes.map((l) => l.title)).toEqual(['A']);
		expect(board.archive.map((i) => i.text)).toEqual(['old']);
		expect(serializeKanbanBoard(board)).toBe(md);
	});
});

describe('archive separator', () => {
	it('a "---" between two lanes survives a card action and no lane moves to the archive', () => {
		const md = '## A\n\n- [ ] a1\n\n---\n\n## B\n\n- [ ] b1\n';
		const board = parseKanbanBoard(md);
		expect(board.lanes.map((l) => l.title)).toEqual(['A', 'B']);
		expect(board.archive).toEqual([]);
		const out = serializeKanbanBoard(toggleItem(board, board.lanes[1].id, board.lanes[1].items[0].id));
		expect(out).toBe(md.replace('- [ ] b1', '- [x] b1'));
	});

	it('only "---" then blank lines then "## Archive" opens the archive', () => {
		const md = '## A\n\n- [ ] a1\n\n---\n\n\n## Archive\n\n- [x] old\n';
		const board = parseKanbanBoard(md);
		expect(board.lanes.map((l) => l.title)).toEqual(['A']);
		expect(board.archive.map((i) => i.text)).toEqual(['old']);
		const archived = archiveItem(board, board.lanes[0].id, board.lanes[0].items[0].id);
		expect(serializeKanbanBoard(archived)).toBe('## A\n\n\n---\n\n\n## Archive\n\n- [x] old\n- [x] a1\n');
	});

	it('headings after the archive heading are kept as raw lines', () => {
		const md = '## A\n\n---\n\n## Archive\n\n- [x] old\n## Later\n- [x] older\n';
		const board = parseKanbanBoard(md);
		expect(board.lanes.map((l) => l.title)).toEqual(['A']);
		expect(board.archive.map((i) => i.text)).toEqual(['old', 'older']);
		expect(serializeKanbanBoard(board)).toBe(md);
	});
});

describe('settings block', () => {
	it('keeps a malformed settings block byte for byte after a card action', () => {
		const md = '## Lane\n\n- [ ] Task\n\n%% kanban:settings\n{bad json,\n  "x": }\n%%\n';
		const board = parseKanbanBoard(md);
		expect(board.settings).toEqual({});
		const out = serializeKanbanBoard(toggleItem(board, board.lanes[0].id, board.lanes[0].items[0].id));
		expect(out).toBe(md.replace('- [ ] Task', '- [x] Task'));
	});

	it('keeps a hand-formatted settings block unchanged until a setting changes', () => {
		const md = '## Lane\n\n- [ ] Task\n\n%% kanban:settings\n{"viewMode":"board"}\n%%\n';
		const board = parseKanbanBoard(md);
		const toggled = toggleItem(board, board.lanes[0].id, board.lanes[0].items[0].id);
		expect(serializeKanbanBoard(toggled)).toBe(md.replace('- [ ] Task', '- [x] Task'));
		const changed = serializeKanbanBoard(setViewMode(board, 'list'));
		expect(changed).toBe(`## Lane\n\n- [ ] Task\n${serializeSettings({ viewMode: 'list' })}`);
		expect(parseKanbanBoard(changed).settings).toEqual({ viewMode: 'list' });
	});

	it('an unclosed settings block stays a raw line and later setting changes stick', () => {
		const md = '## Lane\n\n- [ ] Task\n%% kanban:settings\n{"viewMode":"list"}\n';
		const board = parseKanbanBoard(md);
		expect(board.settings).toEqual({});
		const first = serializeKanbanBoard(setViewMode(board, 'board'));
		expect(first).toBe(`${md}${serializeSettings({ viewMode: 'board' })}`);
		const firstBoard = parseKanbanBoard(first);
		expect(firstBoard.settings).toEqual({ viewMode: 'board' });
		const second = serializeKanbanBoard(setViewMode(firstBoard, 'list'));
		expect(second).toBe(`${md}${serializeSettings({ viewMode: 'list' })}`);
		expect(parseKanbanBoard(second).settings).toEqual({ viewMode: 'list' });
	});

	it('an indented settings opener (inside a code fence) is a raw line, not the settings block', () => {
		const md = '## Lane\n\n- [x] a\n  ```\n  %% kanban:settings\n  {}\n%%\n  ```\n';
		const board = parseKanbanBoard(md);
		expect(board.settingsBlock).toBeUndefined();
		const out = serializeKanbanBoard(toggleItem(board, board.lanes[0].id, board.lanes[0].items[0].id));
		expect(out).toBe(md.replace('- [x] a', '- [ ] a'));
	});
});

describe('single-line card text', () => {
	it.each([
		['a\nb', 'a b'],
		['a\n## b', 'a ## b'],
		['a\r\nb\nc', 'a b c'],
	])('updateItem with %j keeps all the text on one card line and creates no lane', (input, expected) => {
		const board = parseKanbanBoard('## To Do\n\n- [ ] old\n\n## Done\n\n');
		const lane = board.lanes[0];
		const written = serializeKanbanBoard(updateItem(board, lane.id, lane.items[0].id, input));
		const reopened = parseKanbanBoard(written);
		expect(reopened.lanes.map((l) => l.title)).toEqual(['To Do', 'Done']);
		expect(reopened.lanes[0].items.map((i) => i.text)).toEqual([expected]);
		const again = serializeKanbanBoard(toggleItem(reopened, reopened.lanes[0].id, reopened.lanes[0].items[0].id));
		const final = parseKanbanBoard(again);
		expect(final.lanes.map((l) => l.title)).toEqual(['To Do', 'Done']);
		expect(final.lanes[0].items).toEqual([expect.objectContaining({ text: expected, checked: true })]);
	});

	it('addItem replaces newlines with a space', () => {
		const board = parseKanbanBoard('## To Do\n\n');
		const added = addItem(board, board.lanes[0].id, 'buy eggs\nand milk');
		expect(added.lanes[0].items[0].text).toBe('buy eggs and milk');
		expect(serializeKanbanBoard(added)).toBe('## To Do\n\n- [ ] buy eggs and milk\n');
	});
});
