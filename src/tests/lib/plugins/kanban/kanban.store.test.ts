import { describe, it, expect, beforeEach } from 'vitest';
import { kanbanStore } from '$lib/plugins/kanban/kanban.store.svelte';
import type { KanbanBoard } from '$lib/plugins/kanban/kanban.types';

function makeBoard(): KanbanBoard {
	return {
		lanes: [
			{ id: 'l1', title: 'To Do', items: [{ id: 'i1', text: 'Task', checked: false }] },
		],
		archive: [{ id: 'a1', text: 'Archived', checked: true }],
		settings: {},
	};
}

describe('kanbanStore', () => {
	beforeEach(() => {
		kanbanStore.reset();
	});

	it('starts with null board', () => {
		expect(kanbanStore.board).toBeNull();
		expect(kanbanStore.editingItemId).toBeNull();
		expect(kanbanStore.editingLaneId).toBeNull();
		expect(kanbanStore.filterQuery).toBe('');
		expect(kanbanStore.focusedLaneIndex).toBe(-1);
		expect(kanbanStore.focusedItemIndex).toBe(-1);
	});

	it('lanes getter returns empty array when board is null', () => {
		expect(kanbanStore.lanes).toEqual([]);
	});

	it('archive getter returns empty array when board is null', () => {
		expect(kanbanStore.archive).toEqual([]);
	});

	it('settings getter returns empty object when board is null', () => {
		expect(kanbanStore.settings).toEqual({});
	});

	it('setBoard updates board and derived getters', () => {
		const board = makeBoard();
		kanbanStore.setBoard(board);
		expect(kanbanStore.board).toBe(board);
		expect(kanbanStore.lanes).toHaveLength(1);
		expect(kanbanStore.lanes[0].title).toBe('To Do');
		expect(kanbanStore.archive).toHaveLength(1);
		expect(kanbanStore.archive[0].text).toBe('Archived');
	});

	it('setEditingItemId updates editing state', () => {
		kanbanStore.setEditingItemId('i1');
		expect(kanbanStore.editingItemId).toBe('i1');
	});

	it('setEditingLaneId updates editing state', () => {
		kanbanStore.setEditingLaneId('l1');
		expect(kanbanStore.editingLaneId).toBe('l1');
	});

	it('setFilterQuery updates filter state', () => {
		kanbanStore.setFilterQuery('urgent');
		expect(kanbanStore.filterQuery).toBe('urgent');
	});

	it('setFocus updates focus indices', () => {
		kanbanStore.setFocus(1, 2);
		expect(kanbanStore.focusedLaneIndex).toBe(1);
		expect(kanbanStore.focusedItemIndex).toBe(2);
	});

	it('clearFocus resets focus indices', () => {
		kanbanStore.setFocus(1, 2);
		kanbanStore.clearFocus();
		expect(kanbanStore.focusedLaneIndex).toBe(-1);
		expect(kanbanStore.focusedItemIndex).toBe(-1);
	});

	it('reset clears all state', () => {
		kanbanStore.setBoard(makeBoard());
		kanbanStore.setEditingItemId('i1');
		kanbanStore.setEditingLaneId('l1');
		kanbanStore.setFilterQuery('test');
		kanbanStore.setFocus(0, 1);

		kanbanStore.reset();

		expect(kanbanStore.board).toBeNull();
		expect(kanbanStore.editingItemId).toBeNull();
		expect(kanbanStore.editingLaneId).toBeNull();
		expect(kanbanStore.filterQuery).toBe('');
		expect(kanbanStore.focusedLaneIndex).toBe(-1);
		expect(kanbanStore.focusedItemIndex).toBe(-1);
		expect(kanbanStore.lanes).toEqual([]);
		expect(kanbanStore.archive).toEqual([]);
		expect(kanbanStore.settings).toEqual({});
	});
});
