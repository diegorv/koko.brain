import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../fixtures/localStorage.fixture';

setupLocalStorage();

// Opens a tab and reads the file from disk; covered by editor.service.test.ts.
vi.mock('#lib/core/editor/editor.service.js', () => ({ openFileInEditor: vi.fn() }));

import { openFileInEditor } from '#lib/core/editor/editor.service.js';
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
