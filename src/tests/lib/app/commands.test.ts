import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../fixtures/localStorage.fixture';

// Must set up localStorage BEFORE any store imports (stores read localStorage at top-level)
setupLocalStorage();

// Mock side-effect services (Tauri API calls, etc.) — OK per CLAUDE.md
vi.mock('#lib/core/editor/editor.service.js', () => ({
	saveCurrentFile: vi.fn(),
	closeActiveTab: vi.fn(),
	switchToNextTab: vi.fn(),
	switchToPreviousTab: vi.fn(),
	togglePinActiveTab: vi.fn(),
	openFileInEditor: vi.fn(),
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

// Writes frontmatter to disk; covered by lifecycle.service.test.ts.
vi.mock('#lib/features/properties/lifecycle.service.js', () => ({
	toggleActiveNoteFavorite: vi.fn(() => Promise.resolve()),
	toggleActiveNoteOrganized: vi.fn(() => Promise.resolve()),
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
import { createFile } from '#lib/core/filesystem/fs.service.js';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { addNoteCreatedObserver } from '#lib/core/editor/editor.hooks.js';
import { getBuiltInCommands } from '#lib/app/commands.js';
import { formatShortcut } from '#lib/utils/keybindings.js';
import { EVENT_CALENDAR_VIRTUAL_PATH } from '#lib/core/editor/editor.logic.js';
import { eventCalendarViewStore } from '#lib/features/event-calendar/event-calendar-view.store.svelte.js';
import { toKey } from '#lib/features/event-calendar/event-calendar-dates.logic.js';
import { toggleActiveNoteFavorite, toggleActiveNoteOrganized } from '#lib/features/properties/lifecycle.service.js';
import CalendarDays from '@lucide/svelte/icons/calendar-days';
import { railRegistryStore } from '#lib/features/rail-shell/rail-registry.store.svelte.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { buildTypeMetadataMap } from '#lib/features/type-definitions/type-definitions.logic.js';
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import { modCommandsStore } from '#lib/plugins/mods/mod-commands.store.svelte.js';
import { entryV2 } from '../../fixtures/vault-entries.fixture';

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
		modCommandsStore.reset();
		typeDefinitionsStore.reset();
		railRegistryStore.reset();
	});

	it('appends only marked mod actions and removes them when their placement is disposed', () => {
		const id = 'mod:hello:action:greet';
		const events: string[] = [];
		const remove = modCommandsStore.register({ id, label: 'Hello: Greet', run: () => { events.push('ran'); } });
		expect(getBuiltInCommands().filter((c) => c.category === 'Mod')).toEqual([]);
		expect(modCommandsStore.list).toHaveLength(1);
		const unplace = modCommandsStore.place(id);
		const commands = getBuiltInCommands().filter((c) => c.category === 'Mod');
		expect(commands).toMatchObject([{ id, label: 'Hello: Greet', category: 'Mod' }]);
		commands[0].action();
		expect(events).toEqual(['ran']);
		unplace();
		expect(getBuiltInCommands().filter((c) => c.category === 'Mod')).toEqual([]);
		expect(modCommandsStore.list).toHaveLength(1);
		remove();
		expect(modCommandsStore.list).toEqual([]);
	});

	it('returns 45 built-in commands with no navigator, no pin and no view', () => {
		const commands = getBuiltInCommands();

		expect(commands).toHaveLength(45);
	});

	it('includes Toggle Favorite (Cmd+D) and Toggle Organized (Cmd+E) acting on the active note', () => {
		const commands = getBuiltInCommands();
		const favorite = commands.find((c) => c.id === 'note:toggle-favorite');
		const organized = commands.find((c) => c.id === 'note:toggle-organized');

		expect(favorite).toMatchObject({ label: 'Toggle Favorite', category: 'Note', shortcut: { meta: true, key: 'd' } });
		expect(organized).toMatchObject({ label: 'Toggle Organized', category: 'Note', shortcut: { meta: true, key: 'e' } });
		expect(formatShortcut(favorite!.shortcut!)).toBe('⌘D');
		expect(formatShortcut(organized!.shortcut!)).toBe('⌘E');

		favorite!.action();
		expect(toggleActiveNoteFavorite).toHaveBeenCalledTimes(1);
		organized!.action();
		expect(toggleActiveNoteOrganized).toHaveBeenCalledTimes(1);
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

	it('Hide Rail Panels (Cmd+1) and Show Rail Panels (Cmd+2) hide and show the panels', () => {
		const commands = getBuiltInCommands();
		const hide = commands.find((c) => c.id === 'layout:hide-rail-panels')!;
		const show = commands.find((c) => c.id === 'layout:show-rail-panels')!;

		expect(hide).toMatchObject({ label: 'Hide Rail Panels', category: 'Layout', shortcut: { key: '1', meta: true } });
		expect(show).toMatchObject({ label: 'Show Rail Panels', category: 'Layout', shortcut: { key: '2', meta: true } });
		expect(formatShortcut(hide.shortcut!)).toBe('⌘1');
		expect(formatShortcut(show.shortcut!)).toBe('⌘2');

		hide.action();
		expect(settingsStore.layout.railPanelsVisible).toBe(false);
		show.action();
		expect(settingsStore.layout.railPanelsVisible).toBe(true);
	});

	it('toggle-left-sidebar is labelled Toggle Rail Panels and keeps its Cmd+Shift+B shortcut', () => {
		const toggle = getBuiltInCommands().find((c) => c.id === 'layout:toggle-left-sidebar')!;

		expect(toggle).toMatchObject({ label: 'Toggle Rail Panels', category: 'Layout', shortcut: { key: 'b', meta: true, shift: true } });
		expect(formatShortcut(toggle.shortcut!)).toBe('⌘⇧B');
	});

	it('toggle-left-sidebar hides and shows the panels between the rail and the editor', () => {
		const toggle = getBuiltInCommands().find((c) => c.id === 'layout:toggle-left-sidebar')!;

		toggle.action();
		expect(settingsStore.layout.railPanelsVisible).toBe(false);

		toggle.action();
		expect(settingsStore.layout.railPanelsVisible).toBe(true);
	});

	it('has no Cycle Sidebar View command', () => {
		const commands = getBuiltInCommands();
		expect(commands.find((c) => c.id === 'layout:cycle-sidebar-view')).toBeUndefined();
		expect(commands.map((c) => c.label)).not.toContain('Cycle Sidebar View');
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

	it('new file rejects with the create error so the palette can report it', async () => {
		vaultStore.open('/vault');
		vi.mocked(createFile).mockRejectedValueOnce(new Error('disk full'));
		const newFile = getBuiltInCommands().find((c) => c.id === 'file-explorer:new-file')!;

		await expect(newFile.action()).rejects.toThrow('disk full');
		expect(openFileInEditor).not.toHaveBeenCalled();
		expect(editorStore.tabs).toHaveLength(0);
	});

	it('new file reports the created note after opening it', async () => {
		vaultStore.open('/vault');
		vi.mocked(createFile).mockResolvedValueOnce('/vault/Untitled.md');
		let opened = false;
		vi.mocked(openFileInEditor).mockImplementationOnce(async () => {
			await Promise.resolve();
			opened = true;
		});
		const created: { path: string; opened: boolean }[] = [];
		const unsubscribe = addNoteCreatedObserver((path) => created.push({ path, opened }));
		const newFile = getBuiltInCommands().find((c) => c.id === 'file-explorer:new-file')!;

		try {
			await newFile.action();
		} finally {
			unsubscribe();
		}

		expect(created).toEqual([{ path: '/vault/Untitled.md', opened: true }]);
	});

	it('new file reports nothing when the create fails', async () => {
		vaultStore.open('/vault');
		vi.mocked(createFile).mockRejectedValueOnce(new Error('disk full'));
		const observer = vi.fn();
		const unsubscribe = addNoteCreatedObserver(observer);
		const newFile = getBuiltInCommands().find((c) => c.id === 'file-explorer:new-file')!;

		try {
			await expect(newFile.action()).rejects.toThrow('disk full');
		} finally {
			unsubscribe();
		}

		expect(observer).not.toHaveBeenCalled();
	});

	it('new file writes _organized: false while Explicit organization is on', async () => {
		vaultStore.open('/vault');
		settingsStore.setSettings({ ...settingsStore.settings, explicitOrganization: true });
		vi.mocked(createFile).mockResolvedValueOnce('/vault/Untitled.md');
		const newFile = getBuiltInCommands().find((c) => c.id === 'file-explorer:new-file')!;

		await newFile.action();

		expect(createFile).toHaveBeenCalledWith('/vault', 'Untitled.md', '---\n_organized: false\n---\n');
		expect(openFileInEditor).toHaveBeenCalledWith('/vault/Untitled.md');
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
		expect(cmd!.label).toBe('Copy Block Link');
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

	it('toggle right sidebar action does nothing while the Calendar tab is active', () => {
		vaultStore.open('/vault');
		editorStore.addTab({ path: EVENT_CALENDAR_VIRTUAL_PATH, name: 'Calendar', content: '', savedContent: '', fileType: 'event-calendar' });
		const toggle = getBuiltInCommands().find((c) => c.id === 'layout:toggle-right-sidebar');

		toggle!.action();

		expect(settingsStore.layout.rightSidebarVisible).toBe(false);
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

	it('search action opens rail Search, and a second run keeps it there', () => {
		settingsStore.updateLayout({ railItem: 'inbox', railPanelsVisible: false });
		const search = getBuiltInCommands().find((c) => c.id === 'search:toggle');

		search!.action();
		expect(settingsStore.layout.railItem).toBe('search');
		expect(settingsStore.layout.railPanelsVisible).toBe(true);
		search!.action();
		expect(settingsStore.layout.railItem).toBe('search');
		expect(searchStore.focusRequest).toBe(2);
	});

	it('settings open action toggles settings panel', () => {
		const commands = getBuiltInCommands();
		const settings = commands.find((c) => c.id === 'settings:open');

		expect(settingsPanelStore.isOpen).toBe(false);
		settings!.action();
		expect(settingsPanelStore.isOpen).toBe(true);
	});

});

describe('getBuiltInCommands rail commands', () => {
	const READING = '/vault/Reading.view';
	const BOARD = '/vault/Work/Board.view';
	const HIDDEN = '/vault/Hidden.view';
	const CALENDAR = {
		id: 'calendar',
		label: 'Calendar',
		icon: CalendarDays,
		component: CalendarDays,
		lens: () => ({ kind: 'day' }),
	};

	const file = (path: string): FileTreeNode => ({ name: path.split('/').pop()!, path, isDirectory: false });
	const folder = (path: string, children: FileTreeNode[]): FileTreeNode => ({ name: path.split('/').pop()!, path, isDirectory: true, children });

	function setEntries(entries: NoteEntryV2[]) {
		typeDefinitionsStore.setEntries(entries);
		typeDefinitionsStore.setTypeMetadataMap(buildTypeMetadataMap(entries));
	}

	const goTo = () => getBuiltInCommands().filter((c) => c.id.startsWith('rail:go-to:'));
	const openView = () => getBuiltInCommands().filter((c) => c.id.startsWith('rail:open-view:'));
	const run = (id: string) => getBuiltInCommands().find((c) => c.id === id)!.action();

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		settingsStore.reset();
		fsStore.reset();
		searchStore.reset();
		typeDefinitionsStore.reset();
		railRegistryStore.reset();
		settingsStore.updateLayout({ railItem: 'inbox', railPanelsVisible: false });
	});

	it('has a Go to command per built-in rail item, in rail order, and none for Neighbourhood', () => {
		expect(goTo().map((c) => [c.id, c.label])).toEqual([
			['rail:go-to:search', 'Go to Search'],
			['rail:go-to:inbox', 'Go to Inbox'],
			['rail:go-to:today', 'Go to Today'],
			['rail:go-to:favorites', 'Go to Favorites'],
			['rail:go-to:types', 'Go to Types'],
			['rail:go-to:files', 'Go to Files'],
			['rail:go-to:archive', 'Go to Archive'],
		]);
		expect(goTo().every((c) => c.category === 'Navigation')).toBe(true);
	});

	it('adds a navigator registered and a pin added after the first build the next time the list is built', () => {
		expect(goTo().map((c) => c.id)).not.toContain('rail:go-to:calendar');

		const unregister = railRegistryStore.registerNavigator(CALENDAR);
		setEntries([entryV2(READING, { frontmatter: { _sidebar_label: 'To read', _rail: true } })]);

		const ids = goTo().map((c) => c.id);
		expect(ids).toContain('rail:go-to:calendar');
		expect(goTo().find((c) => c.id === `rail:go-to:view:${READING}`)?.label).toBe('Go to To read');
		expect(ids.indexOf('rail:go-to:calendar')).toBeGreaterThan(ids.indexOf('rail:go-to:types'));
		expect(ids.indexOf(`rail:go-to:view:${READING}`)).toBeLessThan(ids.indexOf('rail:go-to:archive'));

		unregister();
		setEntries([]);
		expect(goTo().map((c) => c.id)).toEqual(expect.not.arrayContaining(['rail:go-to:calendar', `rail:go-to:view:${READING}`]));
	});

	it('has no command for a rail action button (a mod button)', () => {
		const before = getBuiltInCommands().map((c) => c.id);
		railRegistryStore.registerAction({ key: 'mod:hello:main', label: 'Hello mod', icon: 'lucide:sparkles', run: vi.fn() });

		const commands = getBuiltInCommands();
		expect(commands.map((c) => c.id)).toEqual(before);
		expect(commands.filter((c) => c.id.includes('mod:hello') || c.label.includes('Hello mod'))).toEqual([]);
	});

	it('has no Go to command for a hidden item and follows the saved order, like the rail', () => {
		railRegistryStore.registerNavigator(CALENDAR);
		settingsStore.updateLayout({ railHidden: ['archive', 'calendar', 'search', 'today'], railOrder: ['files', 'types'] });

		expect(goTo().map((c) => c.id)).toEqual([
			'rail:go-to:search',
			'rail:go-to:inbox',
			'rail:go-to:today',
			'rail:go-to:favorites',
			'rail:go-to:files',
			'rail:go-to:types',
		]);

		settingsStore.updateLayout({ railHidden: [] });
		expect(goTo().map((c) => c.id)).toContain('rail:go-to:calendar');
	});

	it('Go to picks the item and shows the panels Cmd+1 hid', () => {
		railRegistryStore.registerNavigator(CALENDAR);

		run('rail:go-to:favorites');
		expect(settingsStore.layout).toMatchObject({ railItem: 'favorites', railPanelsVisible: true });

		settingsStore.updateLayout({ railPanelsVisible: false });
		run('rail:go-to:calendar');
		expect(settingsStore.layout).toMatchObject({ railItem: 'calendar', railPanelsVisible: true });
	});

	it('Go to Search opens rail Search and asks for focus', () => {
		run('rail:go-to:search');
		expect(settingsStore.layout).toMatchObject({ railItem: 'search', railPanelsVisible: true });
		expect(searchStore.focusRequest).toBe(1);
	});

	it('Go to a pin picks it, and a pinned _open_in_editor view opens in the editor with the layout left as it is', () => {
		setEntries([
			entryV2(READING, { frontmatter: { _rail: true } }),
			entryV2(BOARD, { frontmatter: { _rail: true, _open_in_editor: true } }),
		]);

		run(`rail:go-to:view:${READING}`);
		expect(settingsStore.layout).toMatchObject({ railItem: `view:${READING}`, railPanelsVisible: true });
		expect(openFileInEditor).not.toHaveBeenCalled();

		settingsStore.updateLayout({ railItem: 'inbox', railPanelsVisible: false });
		const before = { ...settingsStore.layout };
		run(`rail:go-to:view:${BOARD}`);
		expect(openFileInEditor).toHaveBeenCalledWith(BOARD);
		expect(settingsStore.layout).toEqual(before);
	});

	it('has an Open view command per visible .view in the tree, not one hidden from Views', () => {
		fsStore.setFileTree([
			file('/vault/note.md'),
			file(READING),
			file(HIDDEN),
			folder('/vault/Work', [file(BOARD)]),
		]);
		setEntries([
			entryV2(READING, { frontmatter: { _sidebar_label: 'To read' } }),
			entryV2(HIDDEN, { frontmatter: { _visible: false } }),
		]);

		expect(openView().map((c) => [c.id, c.label])).toEqual([
			[`rail:open-view:${BOARD}`, 'Open view: Board'],
			[`rail:open-view:${READING}`, 'Open view: To read'],
		]);
		expect(openView().every((c) => c.category === 'Navigation')).toBe(true);
	});

	it('adds and removes Open view commands as .view files enter and leave the tree', () => {
		expect(openView()).toEqual([]);

		fsStore.setFileTree([file(READING)]);
		expect(openView().map((c) => c.id)).toEqual([`rail:open-view:${READING}`]);

		fsStore.setFileTree([folder('/vault/Work', [file(BOARD)])]);
		expect(openView().map((c) => c.id)).toEqual([`rail:open-view:${BOARD}`]);
	});

	it('Open view picks the view in the Types navigator and shows the panels', () => {
		fsStore.setFileTree([file(READING)]);
		setEntries([entryV2(READING)]);

		run(`rail:open-view:${READING}`);
		expect(settingsStore.layout).toMatchObject({
			railItem: 'types',
			railTypesLens: { kind: 'view', target: READING },
			railPanelsVisible: true,
		});
		expect(openFileInEditor).not.toHaveBeenCalled();
	});

	it('Open view on an _open_in_editor view opens it in the editor and leaves the layout as it is', () => {
		fsStore.setFileTree([folder('/vault/Work', [file(BOARD)])]);
		setEntries([entryV2(BOARD, { frontmatter: { _open_in_editor: true } })]);
		const before = { ...settingsStore.layout };

		run(`rail:open-view:${BOARD}`);
		expect(openFileInEditor).toHaveBeenCalledWith(BOARD);
		expect(settingsStore.layout).toEqual(before);
	});
});
