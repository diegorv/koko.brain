import { describe, it, expect } from 'vitest';
import { isRightSidebarShown, nextSidebarMode } from '#lib/core/layout/layout.logic.js';
import { EVENT_CALENDAR_VIRTUAL_PATH, TASKS_VIRTUAL_PATH } from '#lib/core/editor/editor.logic.js';

describe('nextSidebarMode', () => {
	it('cycles files -> types -> calendar -> files', () => {
		expect(nextSidebarMode('files')).toBe('types');
		expect(nextSidebarMode('types')).toBe('calendar');
		expect(nextSidebarMode('calendar')).toBe('files');
	});

	it('falls back to files for an unknown mode', () => {
		expect(nextSidebarMode('bogus' as never)).toBe('files');
	});
});

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

	it('follows the setting when no tab is open', () => {
		expect(isRightSidebarShown(true, null)).toBe(true);
		expect(isRightSidebarShown(false, null)).toBe(false);
	});
});
