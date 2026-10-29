import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

// Must set up localStorage BEFORE any store imports (stores read localStorage at top-level)
setupLocalStorage();

// Mock side-effect services (Tauri API calls, etc.) — OK per CLAUDE.md
vi.mock('#lib/core/editor/editor.service.js', () => ({
	saveCurrentFile: vi.fn(),
	closeActiveTab: vi.fn(),
	switchToNextTab: vi.fn(),
	switchToPreviousTab: vi.fn(),
	togglePinActiveTab: vi.fn(),
}));

vi.mock('#lib/core/filesystem/fs.service.js', () => ({
	createFile: vi.fn(),
	createFolder: vi.fn(),
}));

vi.mock('#lib/plugins/graph-view/graph-view.service.js', () => ({
	toggleGraphTab: vi.fn(),
}));

vi.mock('#lib/features/tasks/tasks.service.js', () => ({
	toggleTasksTab: vi.fn(),
}));

vi.mock('#lib/plugins/periodic-notes/periodic-notes.service.js', () => ({
	openOrCreateDailyNote: vi.fn(),
}));

vi.mock('#lib/plugins/templates/templates.service.js', () => ({
	openTemplatePicker: vi.fn(),
}));

vi.mock('#lib/features/copy-block-link/copy-block-link.service.js', () => ({
	copyBlockLinkToClipboard: vi.fn(),
	copyBlockEmbedToClipboard: vi.fn(),
}));

vi.mock('#lib/plugins/quick-capture/note-composer.service.js', () => ({
	createNoteComposer: vi.fn(),
}));

vi.mock('#lib/plugins/one-on-one/one-on-one.service.js', () => ({
	openOneOnOnePicker: vi.fn(),
}));

vi.mock('#lib/features/canvas/canvas.service.js', () => ({
	createCanvasFile: vi.fn(),
}));

vi.mock('#lib/features/file-history/file-history.service.js', () => ({
	openFileHistory: vi.fn(),
}));

// The event-calendar service is real; only its IPC is mocked.
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('svelte-sonner', () => ({
	toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));

// No mocks for stores or logic files — use real implementations per CLAUDE.md

import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { searchStore } from '#lib/features/search/search.store.svelte.js';
import { settingsPanelStore } from '#lib/core/settings/settings-panel.store.svelte.js';
import { toast } from 'svelte-sonner';
import { getBuiltInCommands } from '#lib/features/command-palette/command-palette.service.js';
import { formatShortcut } from '#lib/features/command-palette/command-palette.logic.js';
import { EVENT_CALENDAR_VIRTUAL_PATH } from '#lib/core/editor/editor.logic.js';
import { eventCalendarViewStore } from '#lib/features/event-calendar/event-calendar-view.store.svelte.js';
import { toKey } from '#lib/features/event-calendar/event-calendar-dates.logic.js';

describe('getBuiltInCommands', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		editorStore.reset();
		settingsStore.reset();
		fsStore.reset();
		searchStore.reset();
		settingsPanelStore._reset();
	});

	it('returns 31 built-in commands', () => {
		const commands = getBuiltInCommands();

		expect(commands).toHaveLength(31);
	});

	it('includes a new-event command that opens the Calendar tab and the create dialog', () => {
		eventCalendarViewStore.reset();
		const command = getBuiltInCommands().find((c) => c.id === 'event-calendar:new-event');

		expect(command).toBeDefined();
		expect(command!.label).toBe('New Calendar Event');

		command!.action();

		expect(editorStore.activeTab?.path).toBe(EVENT_CALENDAR_VIRTUAL_PATH);
		expect(eventCalendarViewStore.dialog?.payload).toMatchObject({ mode: 'create', date: eventCalendarViewStore.focusedDate });
	});

	it('includes a go-to-today command that opens the Calendar tab on today', () => {
		eventCalendarViewStore.reset();
		eventCalendarViewStore.setDate('2000-01-03');
		const command = getBuiltInCommands().find((c) => c.id === 'event-calendar:today');

		expect(command).toBeDefined();
		expect(command!.label).toBe('Calendar: Go to Today');

		command!.action();

		expect(editorStore.activeTab?.path).toBe(EVENT_CALENDAR_VIRTUAL_PATH);
		expect(eventCalendarViewStore.focusedDate).toBe(toKey(new Date()));
	});

	it('includes "Calendar: Undo" and "Calendar: Redo" without shortcuts', async () => {
		const commands = getBuiltInCommands();
		const undo = commands.find((c) => c.id === 'event-calendar:undo');
		const redo = commands.find((c) => c.id === 'event-calendar:redo');

		expect(undo?.label).toBe('Calendar: Undo');
		expect(redo?.label).toBe('Calendar: Redo');
		expect(undo?.shortcut).toBeUndefined();
		expect(redo?.shortcut).toBeUndefined();

		undo!.action();
		redo!.action();
		await vi.waitFor(() => expect(vi.mocked(toast).mock.calls).toEqual([['Nothing to undo'], ['Nothing to redo']]));
		// The palette commands do not open the Calendar tab.
		expect(editorStore.tabs.some((t) => t.path === EVENT_CALENDAR_VIRTUAL_PATH)).toBe(false);
	});

	it('includes a toggle-calendar command that opens and closes the Calendar tab', () => {
		const toggle = getBuiltInCommands().find((c) => c.id === 'event-calendar:toggle');

		expect(toggle).toBeDefined();
		expect(toggle!.label).toBe('Toggle Calendar View');
		expect(toggle!.category).toBe('Navigation');
		expect(toggle!.shortcut).toEqual({ meta: true, shift: true, key: 'c' });
		expect(formatShortcut(toggle!.shortcut!)).toBe('⌘⇧C');

		toggle!.action();

		expect(editorStore.activeTab?.path).toBe(EVENT_CALENDAR_VIRTUAL_PATH);
		expect(editorStore.activeTab?.fileType).toBe('event-calendar');

		toggle!.action();

		expect(editorStore.tabs.some((t) => t.path === EVENT_CALENDAR_VIRTUAL_PATH)).toBe(false);
	});

	it('includes a cycle-sidebar-view command that advances the mode and reveals the sidebar', () => {
		settingsStore.updateLayout({ sidebarMode: 'types', leftSidebarVisible: false });
		const commands = getBuiltInCommands();
		const cycle = commands.find((c) => c.id === 'layout:cycle-sidebar-view');

		expect(cycle).toBeDefined();
		expect(cycle!.label).toBe('Cycle Sidebar View');
		expect(cycle!.shortcut).toEqual({ meta: true, shift: true, key: 'e' });

		cycle!.action();

		expect(settingsStore.layout.sidebarMode).toBe('calendar');
		expect(settingsStore.layout.leftSidebarVisible).toBe(true);
	});

	it('every command has required fields', () => {
		const commands = getBuiltInCommands();

		for (const cmd of commands) {
			expect(cmd.id).toBeTruthy();
			expect(cmd.label).toBeTruthy();
			expect(cmd.category).toBeTruthy();
			expect(typeof cmd.action).toBe('function');
		}
	});

	it('all command IDs are unique', () => {
		const commands = getBuiltInCommands();
		const ids = commands.map((c) => c.id);
		const uniqueIds = new Set(ids);

		expect(uniqueIds.size).toBe(ids.length);
	});

	it('includes save file command with Cmd+S shortcut', () => {
		const commands = getBuiltInCommands();
		const save = commands.find((c) => c.id === 'editor:save-file');

		expect(save).toBeDefined();
		expect(save!.label).toBe('Save File');
		expect(save!.shortcut).toEqual({ meta: true, key: 's' });
	});

	it('includes close tab command with Cmd+W shortcut', () => {
		const commands = getBuiltInCommands();
		const close = commands.find((c) => c.id === 'editor:close-tab');

		expect(close).toBeDefined();
		expect(close!.shortcut).toEqual({ meta: true, key: 'w' });
	});

	it('includes next/previous tab commands with bracket shortcuts', () => {
		const commands = getBuiltInCommands();
		const next = commands.find((c) => c.id === 'editor:next-tab');
		const prev = commands.find((c) => c.id === 'editor:previous-tab');

		expect(next).toBeDefined();
		expect(next!.shortcut).toEqual({ meta: true, shift: true, code: 'BracketRight' });
		expect(prev).toBeDefined();
		expect(prev!.shortcut).toEqual({ meta: true, shift: true, code: 'BracketLeft' });
	});

	it('includes quick switcher command with Cmd+O shortcut', () => {
		const commands = getBuiltInCommands();
		const qs = commands.find((c) => c.id === 'quick-switcher:open');

		expect(qs).toBeDefined();
		expect(qs!.shortcut).toEqual({ meta: true, key: 'o' });
	});

	it('includes search command with Cmd+Shift+F shortcut', () => {
		const commands = getBuiltInCommands();
		const search = commands.find((c) => c.id === 'search:toggle');

		expect(search).toBeDefined();
		expect(search!.shortcut).toEqual({ meta: true, shift: true, key: 'f' });
	});

	it('includes graph view command with Cmd+G shortcut', () => {
		const commands = getBuiltInCommands();
		const graph = commands.find((c) => c.id === 'graph-view:toggle');

		expect(graph).toBeDefined();
		expect(graph!.shortcut).toEqual({ meta: true, key: 'g' });
	});

	it('includes new file and new folder commands without shortcuts', () => {
		const commands = getBuiltInCommands();
		const newFile = commands.find((c) => c.id === 'file-explorer:new-file');
		const newFolder = commands.find((c) => c.id === 'file-explorer:new-folder');

		expect(newFile).toBeDefined();
		expect(newFile!.shortcut).toBeUndefined();
		expect(newFolder).toBeDefined();
		expect(newFolder!.shortcut).toBeUndefined();
	});

	it('includes daily notes command', () => {
		const commands = getBuiltInCommands();
		const daily = commands.find((c) => c.id === 'daily-notes:open');

		expect(daily).toBeDefined();
		expect(daily!.label).toBe('Open Daily Note');
		expect(daily!.category).toBe('Daily Notes');
	});

	it('includes quick capture note command with Cmd+N shortcut', () => {
		const commands = getBuiltInCommands();
		const cmd = commands.find((c) => c.id === 'quick-capture:create-note');

		expect(cmd).toBeDefined();
		expect(cmd!.label).toBe('Create Quick Capture Note');
		expect(cmd!.category).toBe('Quick Capture');
		expect(cmd!.shortcut).toEqual({ meta: true, key: 'n' });
	});

	it('includes copy block link command with Cmd+Shift+L shortcut', () => {
		const commands = getBuiltInCommands();
		const cmd = commands.find((c) => c.id === 'editor:copy-block-link');

		expect(cmd).toBeDefined();
		expect(cmd!.label).toBe('Copy Link to Block');
		expect(cmd!.category).toBe('Editor');
		expect(cmd!.shortcut).toEqual({ meta: true, shift: true, key: 'l' });
	});

	it('includes copy block embed command', () => {
		const commands = getBuiltInCommands();
		const cmd = commands.find((c) => c.id === 'editor:copy-block-embed');

		expect(cmd).toBeDefined();
		expect(cmd!.label).toBe('Copy Block Embed');
		expect(cmd!.category).toBe('Editor');
	});

	it('includes 1:1 note command with Cmd+Shift+N shortcut', () => {
		const commands = getBuiltInCommands();
		const cmd = commands.find((c) => c.id === 'one-on-one:create');

		expect(cmd).toBeDefined();
		expect(cmd!.label).toBe('Create 1:1 Note');
		expect(cmd!.category).toBe('1:1 Notes');
		expect(cmd!.shortcut).toEqual({ meta: true, shift: true, key: 'n' });
	});

	it('toggle right sidebar action updates settingsStore layout', async () => {
		vaultStore.open('/vault');
		const commands = getBuiltInCommands();
		const toggle = commands.find((c) => c.id === 'layout:toggle-right-sidebar');

		expect(toggle).toBeDefined();
		// Default layout has rightSidebarVisible: false
		expect(settingsStore.layout.rightSidebarVisible).toBe(false);

		toggle!.action();

		// After toggling, rightSidebarVisible should be true
		expect(settingsStore.layout.rightSidebarVisible).toBe(true);
	});

	it('toggle table of contents action flips settingsStore layout flag', async () => {
		vaultStore.open('/vault');
		const commands = getBuiltInCommands();
		const toggle = commands.find((c) => c.id === 'layout:toggle-table-of-contents');

		expect(toggle).toBeDefined();
		expect(toggle!.label).toBe('Toggle Table of Contents');
		expect(toggle!.category).toBe('Layout');
		// Default layout has tableOfContentsVisible: true
		const before = settingsStore.layout.tableOfContentsVisible;
		toggle!.action();
		expect(settingsStore.layout.tableOfContentsVisible).toBe(!before);
		toggle!.action();
		expect(settingsStore.layout.tableOfContentsVisible).toBe(before);
	});

	it('search toggle action toggles searchStore.isOpen', () => {
		const commands = getBuiltInCommands();
		const search = commands.find((c) => c.id === 'search:toggle');

		expect(searchStore.isOpen).toBe(false);
		search!.action();
		expect(searchStore.isOpen).toBe(true);
	});

	it('settings open action toggles settings panel', () => {
		const commands = getBuiltInCommands();
		const settings = commands.find((c) => c.id === 'settings:open');

		expect(settingsPanelStore.isOpen).toBe(false);
		settings!.action();
		expect(settingsPanelStore.isOpen).toBe(true);
	});

});
