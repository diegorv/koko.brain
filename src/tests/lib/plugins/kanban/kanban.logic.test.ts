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
	stripCardDate,
	getDateProximity,
	extractCardColor,
	setCardColor,
	removeCardColor,
	stripCardColor,
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
} from '$lib/plugins/kanban/kanban.logic';
import type { KanbanBoard, KanbanSettings } from '$lib/plugins/kanban/kanban.types';

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

	it('returns original board for nonexistent item', () => {
		const board = makeBoard();
		const result = moveItem(board, 'lane-1', 'nonexistent', 'lane-2', 0);
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

// ── stripCardDate ──────────────────────────────────────────────────

describe('stripCardDate', () => {
	it('strips date from display text', () => {
		expect(stripCardDate('Task {2025-03-15}')).toBe('Task');
	});

	it('returns same text when no date', () => {
		expect(stripCardDate('Task without date')).toBe('Task without date');
	});

	it('strips date and collapses spaces', () => {
		expect(stripCardDate('Fix {2025-01-01} ASAP')).toBe('Fix ASAP');
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

describe('stripCardColor', () => {
	it('strips color from display text', () => {
		expect(stripCardColor('Task {color:blue}')).toBe('Task');
	});

	it('returns same text when no color', () => {
		expect(stripCardColor('Task without color')).toBe('Task without color');
	});

	it('strips color and collapses spaces', () => {
		expect(stripCardColor('Fix {color:red} ASAP')).toBe('Fix ASAP');
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
