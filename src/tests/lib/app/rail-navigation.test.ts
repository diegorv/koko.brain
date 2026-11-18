import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../fixtures/localStorage.fixture';

setupLocalStorage();

// Opens a tab and reads the file from disk; covered by editor.service.test.ts.
vi.mock('#lib/core/editor/editor.service.js', () => ({ openFileInEditor: vi.fn() }));

import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { GRAPH_VIRTUAL_PATH, TAGS_VIRTUAL_PATH, TASKS_VIRTUAL_PATH } from '#lib/core/editor/editor.logic.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { searchStore } from '#lib/features/search/search.store.svelte.js';
import { openRailView, selectRailItem } from '#lib/app/rail-navigation.js';
import type { RailPin } from '#lib/features/rail-shell/rail-shell.types.js';

const BOARD = '/vault/Board.view';
const BOARD_PIN: RailPin = { key: `view:${BOARD}`, label: 'Board', path: BOARD, kind: 'view', opensInEditor: true };
const READING_PIN: RailPin = { key: 'view:/vault/Reading.view', label: 'To read', path: '/vault/Reading.view', kind: 'view', opensInEditor: false };

beforeEach(() => {
	vi.clearAllMocks();
	clearLocalStorage();
	settingsStore.reset();
	searchStore.reset();
	editorStore.reset();
	settingsStore.updateLayout({ railItem: 'inbox', railPanelsVisible: false });
});

describe('selectRailItem', () => {
	it('picks a built-in item and shows the hidden panels', () => {
		selectRailItem({ key: 'favorites' });
		expect(settingsStore.layout.railItem).toBe('favorites');
		expect(settingsStore.layout.railPanelsVisible).toBe(true);
	});

	it('picks a navigator a plugin registered and a pin that does not open in the editor', () => {
		selectRailItem({ key: 'calendar' });
		expect(settingsStore.layout.railItem).toBe('calendar');
		settingsStore.updateLayout({ railPanelsVisible: false });

		selectRailItem({ key: READING_PIN.key, pin: READING_PIN });
		expect(settingsStore.layout.railItem).toBe(READING_PIN.key);
		expect(settingsStore.layout.railPanelsVisible).toBe(true);
		expect(openFileInEditor).not.toHaveBeenCalled();
	});

	it('opens Search through openSearch, which shows the panels and asks for focus', () => {
		selectRailItem({ key: 'search' });
		expect(settingsStore.layout.railItem).toBe('search');
		expect(settingsStore.layout.railPanelsVisible).toBe(true);
		expect(searchStore.focusRequest).toBeGreaterThan(0);
	});

	it('opens a pinned _open_in_editor view in the editor and leaves the layout as it is', () => {
		const before = { ...settingsStore.layout };
		selectRailItem({ key: BOARD_PIN.key, pin: BOARD_PIN });
		expect(openFileInEditor).toHaveBeenCalledWith(BOARD);
		expect(settingsStore.layout).toEqual(before);
	});
});

describe('selectRailItem on a Tabs item', () => {
	const NOTE = { path: '/vault/Welcome.md', name: 'Welcome', content: '', savedContent: '' };

	it.each([
		['tab:tasks', TASKS_VIRTUAL_PATH, 'tasks'],
		['tab:graph', GRAPH_VIRTUAL_PATH, 'graph'],
		['tab:tags', TAGS_VIRTUAL_PATH, 'tags'],
	])('%s opens its tab, keeps it open and active on a second select, and writes no layout', (key, path, fileType) => {
		editorStore.addTab(NOTE);
		const before = { ...settingsStore.layout };

		selectRailItem({ key });
		expect(editorStore.activeTabPath).toBe(path);
		expect(editorStore.activeTab?.fileType).toBe(fileType);
		expect(editorStore.tabs.map((t) => t.path)).toEqual([NOTE.path, path]);

		selectRailItem({ key });
		expect(editorStore.activeTabPath).toBe(path);
		expect(editorStore.tabs.map((t) => t.path)).toEqual([NOTE.path, path]);

		expect(settingsStore.layout).toEqual(before);
		expect(settingsStore.layout.railItem).toBe('inbox');
		expect(settingsStore.layout.railPanelsVisible).toBe(false);
	});

	it('focuses an open tab that is not active, without opening a second one', () => {
		selectRailItem({ key: 'tab:tags' });
		editorStore.addTab(NOTE);
		expect(editorStore.activeTabPath).toBe(NOTE.path);

		selectRailItem({ key: 'tab:tags' });
		expect(editorStore.activeTabPath).toBe(TAGS_VIRTUAL_PATH);
		expect(editorStore.tabs.filter((t) => t.path === TAGS_VIRTUAL_PATH)).toHaveLength(1);
	});
});

describe('openRailView', () => {
	it('picks the view in the Types navigator and shows the panels', () => {
		openRailView('/vault/Reading.view', false);
		expect(settingsStore.layout.railItem).toBe('types');
		expect(settingsStore.layout.railTypesLens).toEqual({ kind: 'view', target: '/vault/Reading.view' });
		expect(settingsStore.layout.railPanelsVisible).toBe(true);
		expect(openFileInEditor).not.toHaveBeenCalled();
	});

	it('opens an _open_in_editor view in the editor and leaves the layout as it is', () => {
		const before = { ...settingsStore.layout };
		openRailView(BOARD, true);
		expect(openFileInEditor).toHaveBeenCalledWith(BOARD);
		expect(settingsStore.layout).toEqual(before);
	});
});
