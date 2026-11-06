import { describe, it, expect } from 'vitest';
import { isRightSidebarShown } from '#lib/core/layout/layout.logic.js';
import { EVENT_CALENDAR_VIRTUAL_PATH, GRAPH_VIRTUAL_PATH, TAGS_VIRTUAL_PATH, TASKS_VIRTUAL_PATH } from '#lib/core/editor/editor.logic.js';

describe('isRightSidebarShown', () => {
	it('follows the setting on a note tab', () => {
		expect(isRightSidebarShown(true, '/vault/note.md')).toBe(true);
		expect(isRightSidebarShown(false, '/vault/note.md')).toBe(false);
	});

	it('hides the sidebar while the Calendar tab is active, whatever the setting', () => {
		expect(isRightSidebarShown(true, EVENT_CALENDAR_VIRTUAL_PATH)).toBe(false);
		expect(isRightSidebarShown(false, EVENT_CALENDAR_VIRTUAL_PATH)).toBe(false);
	});

	it('hides the sidebar while the Tasks tab is active, whatever the setting', () => {
		expect(isRightSidebarShown(true, TASKS_VIRTUAL_PATH)).toBe(false);
		expect(isRightSidebarShown(false, TASKS_VIRTUAL_PATH)).toBe(false);
	});

	it('hides the sidebar while the Tags tab is active, whatever the setting', () => {
		expect(isRightSidebarShown(true, TAGS_VIRTUAL_PATH)).toBe(false);
		expect(isRightSidebarShown(false, TAGS_VIRTUAL_PATH)).toBe(false);
	});

	it('hides the sidebar while the Graph tab is active, whatever the setting', () => {
		expect(isRightSidebarShown(true, GRAPH_VIRTUAL_PATH)).toBe(false);
		expect(isRightSidebarShown(false, GRAPH_VIRTUAL_PATH)).toBe(false);
	});

	it.each(['/vault/a.canvas', '/vault/a.view', '/vault/a.kanban', '/vault/A.CANVAS'])(
		'hides the sidebar while %s is active, whatever the setting',
		(path) => {
			expect(isRightSidebarShown(true, path)).toBe(false);
			expect(isRightSidebarShown(false, path)).toBe(false);
		},
	);

	it.each(['/vault/a.txt', '/vault/a.collection'])('follows the setting while the text file %s is active', (path) => {
		expect(isRightSidebarShown(true, path)).toBe(true);
		expect(isRightSidebarShown(false, path)).toBe(false);
	});

	it('goes by the file, not by a folder named like a special file', () => {
		expect(isRightSidebarShown(true, '/vault/board.kanban/note.md')).toBe(true);
	});

	it('follows the setting when no tab is open', () => {
		expect(isRightSidebarShown(true, null)).toBe(true);
		expect(isRightSidebarShown(false, null)).toBe(false);
	});
});
