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

	it('follows the setting when no tab is open', () => {
		expect(isRightSidebarShown(true, null)).toBe(true);
		expect(isRightSidebarShown(false, null)).toBe(false);
	});
});
