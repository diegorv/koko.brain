// @vitest-environment jsdom
// jsdom: persistence is asserted through the settings persistence owner, whose
// `$effect.root` needs the browser runtime (see settings-persistence.test.ts).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(() => Promise.resolve()),
	mkdir: vi.fn(() => Promise.resolve()),
	exists: vi.fn(() => Promise.resolve(true)),
}));

import { writeTextFile, exists, mkdir } from '@tauri-apps/plugin-fs';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { EVENT_CALENDAR_VIRTUAL_PATH, GRAPH_VIRTUAL_PATH, TAGS_VIRTUAL_PATH, TASKS_VIRTUAL_PATH } from '#lib/core/editor/editor.logic.js';
import {
	startSettingsPersistence,
	stopSettingsPersistence,
} from '#lib/core/settings/settings-persistence.svelte.js';
import {
	hideRailPanels,
	showRailPanels,
	toggleLeftSidebar,
	toggleRightSidebar,
} from '#lib/core/layout/layout.service.js';

/** Lets the Svelte effect flush (microtask), then runs out the debounce window */
async function settle(): Promise<void> {
	await vi.advanceTimersByTimeAsync(0);
	await vi.advanceTimersByTimeAsync(500);
}

/** Parses the settings JSON of the most recent write and checks its target */
function persisted(): { layout: Record<string, unknown> } {
	const calls = vi.mocked(writeTextFile).mock.calls;
	expect(calls.length).toBeGreaterThan(0);
	const [path, content] = calls[calls.length - 1];
	expect(path).toBe('/vault/.kokobrain/settings.json');
	return JSON.parse(content as string);
}

/** Shared reset: real stores, no persistence session leaking between tests */
function resetAll(): void {
	vi.useFakeTimers();
	vi.clearAllMocks();
	vi.mocked(exists).mockResolvedValue(true);
	vi.mocked(mkdir).mockResolvedValue(undefined);
	vi.mocked(writeTextFile).mockResolvedValue(undefined);
	clearLocalStorage();
	vaultStore._reset();
	settingsStore.reset();
	editorStore.reset();
}

/** A session left running keeps writing into later tests in this file */
async function teardownAll(): Promise<void> {
	await stopSettingsPersistence();
	vi.useRealTimers();
}

describe('toggleLeftSidebar', () => {
	beforeEach(resetAll);
	afterEach(teardownAll);

	it('hides visible rail panels, shows them again, and persists', async () => {
		vaultStore.open('/vault');
		startSettingsPersistence('/vault');

		toggleLeftSidebar();
		await settle();

		expect(settingsStore.layout.railPanelsVisible).toBe(false);
		expect(persisted().layout.railPanelsVisible).toBe(false);

		toggleLeftSidebar();

		expect(settingsStore.layout.railPanelsVisible).toBe(true);
	});

	it('still toggles but does not persist when no vault is open', async () => {
		toggleLeftSidebar();
		await settle();

		expect(settingsStore.layout.railPanelsVisible).toBe(false);
		expect(writeTextFile).not.toHaveBeenCalled();
	});
});

describe('hideRailPanels / showRailPanels', () => {
	beforeEach(resetAll);
	afterEach(teardownAll);

	it('shows the rail panels by default', () => {
		expect(settingsStore.layout.railPanelsVisible).toBe(true);
	});

	it('hides the rail panels and persists', async () => {
		vaultStore.open('/vault');
		startSettingsPersistence('/vault');

		hideRailPanels();
		await settle();

		expect(settingsStore.layout.railPanelsVisible).toBe(false);
		expect(persisted().layout.railPanelsVisible).toBe(false);
	});

	it('shows hidden rail panels and persists', async () => {
		vaultStore.open('/vault');
		settingsStore.updateLayout({ railPanelsVisible: false });
		startSettingsPersistence('/vault');

		showRailPanels();
		await settle();

		expect(settingsStore.layout.railPanelsVisible).toBe(true);
		expect(persisted().layout.railPanelsVisible).toBe(true);
	});

	it('repeats are no-ops: hide twice stays hidden, show twice stays shown', () => {
		hideRailPanels();
		hideRailPanels();
		expect(settingsStore.layout.railPanelsVisible).toBe(false);

		showRailPanels();
		showRailPanels();
		expect(settingsStore.layout.railPanelsVisible).toBe(true);
	});
});

describe('toggleRightSidebar', () => {
	beforeEach(resetAll);
	afterEach(teardownAll);

	it('hides a visible right sidebar and persists', async () => {
		vaultStore.open('/vault');
		settingsStore.updateLayout({ rightSidebarVisible: true });
		startSettingsPersistence('/vault');

		toggleRightSidebar();
		await settle();

		expect(settingsStore.layout.rightSidebarVisible).toBe(false);
		expect(persisted().layout.rightSidebarVisible).toBe(false);
	});

	it('shows a hidden right sidebar and persists', async () => {
		vaultStore.open('/vault');
		settingsStore.updateLayout({ rightSidebarVisible: false });
		startSettingsPersistence('/vault');

		toggleRightSidebar();
		await settle();

		expect(settingsStore.layout.rightSidebarVisible).toBe(true);
		expect(persisted().layout.rightSidebarVisible).toBe(true);
	});

	it('does nothing while the Calendar tab is active, where the sidebar is always hidden', async () => {
		vaultStore.open('/vault');
		settingsStore.updateLayout({ rightSidebarVisible: true });
		editorStore.addTab({ path: EVENT_CALENDAR_VIRTUAL_PATH, name: 'Calendar', content: '', savedContent: '', fileType: 'event-calendar' });
		startSettingsPersistence('/vault');

		toggleRightSidebar();
		await settle();

		expect(settingsStore.layout.rightSidebarVisible).toBe(true);
		expect(writeTextFile).not.toHaveBeenCalled();
	});

	it('does nothing while a canvas file is active, where the sidebar is always hidden', async () => {
		vaultStore.open('/vault');
		settingsStore.updateLayout({ rightSidebarVisible: true });
		editorStore.addTab({ path: '/vault/a.canvas', name: 'a.canvas', content: '{}', savedContent: '{}', fileType: 'canvas' });
		startSettingsPersistence('/vault');

		toggleRightSidebar();
		await settle();

		expect(settingsStore.layout.rightSidebarVisible).toBe(true);
		expect(writeTextFile).not.toHaveBeenCalled();
	});

	it('does nothing while the Tasks tab is active, where the sidebar is always hidden', async () => {
		vaultStore.open('/vault');
		settingsStore.updateLayout({ rightSidebarVisible: true });
		editorStore.addTab({ path: TASKS_VIRTUAL_PATH, name: 'Tasks', content: '', savedContent: '', fileType: 'tasks' });
		startSettingsPersistence('/vault');

		toggleRightSidebar();
		await settle();

		expect(settingsStore.layout.rightSidebarVisible).toBe(true);
		expect(writeTextFile).not.toHaveBeenCalled();
	});

	it('does nothing while the Tags tab is active, where the sidebar is always hidden', async () => {
		vaultStore.open('/vault');
		settingsStore.updateLayout({ rightSidebarVisible: true });
		editorStore.addTab({ path: TAGS_VIRTUAL_PATH, name: 'Tags', content: '', savedContent: '', fileType: 'tags' });
		startSettingsPersistence('/vault');

		toggleRightSidebar();
		await settle();

		expect(settingsStore.layout.rightSidebarVisible).toBe(true);
		expect(writeTextFile).not.toHaveBeenCalled();
	});

	it('does nothing while the Graph tab is active, where the sidebar is always hidden', async () => {
		vaultStore.open('/vault');
		settingsStore.updateLayout({ rightSidebarVisible: true });
		editorStore.addTab({ path: GRAPH_VIRTUAL_PATH, name: 'Graph', content: '', savedContent: '', fileType: 'graph' });
		startSettingsPersistence('/vault');

		toggleRightSidebar();
		await settle();

		expect(settingsStore.layout.rightSidebarVisible).toBe(true);
		expect(writeTextFile).not.toHaveBeenCalled();
	});

	it('still toggles but does not persist when no vault is open', async () => {
		settingsStore.updateLayout({ rightSidebarVisible: true });

		toggleRightSidebar();
		await settle();

		expect(settingsStore.layout.rightSidebarVisible).toBe(false);
		expect(writeTextFile).not.toHaveBeenCalled();
	});
});
