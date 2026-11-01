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
import { EVENT_CALENDAR_VIRTUAL_PATH, TASKS_VIRTUAL_PATH } from '#lib/core/editor/editor.logic.js';
import {
	startSettingsPersistence,
	stopSettingsPersistence,
} from '#lib/core/settings/settings-persistence.svelte.js';
import {
	cycleSidebarMode,
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

describe('cycleSidebarMode', () => {
	beforeEach(resetAll);
	afterEach(teardownAll);

	it('advances to the next mode and persists', async () => {
		vaultStore.open('/vault');
		settingsStore.updateLayout({ sidebarMode: 'files', leftSidebarVisible: true });
		startSettingsPersistence('/vault');

		cycleSidebarMode();
		await settle();

		expect(settingsStore.layout.sidebarMode).toBe('types');
		expect(settingsStore.layout.leftSidebarVisible).toBe(true);
		expect(persisted().layout.sidebarMode).toBe('types');
	});

	it('wraps calendar back to files and reveals the sidebar when hidden', () => {
		vaultStore.open('/vault');
		settingsStore.updateLayout({ sidebarMode: 'calendar', leftSidebarVisible: false });

		cycleSidebarMode();

		expect(settingsStore.layout.sidebarMode).toBe('files');
		expect(settingsStore.layout.leftSidebarVisible).toBe(true);
	});

	it('still updates the layout but does not persist when no vault is open', async () => {
		settingsStore.updateLayout({ sidebarMode: 'files', leftSidebarVisible: true });

		cycleSidebarMode();
		await settle();

		expect(settingsStore.layout.sidebarMode).toBe('types');
		expect(writeTextFile).not.toHaveBeenCalled();
	});
});

describe('toggleLeftSidebar', () => {
	beforeEach(resetAll);
	afterEach(teardownAll);

	it('hides a visible left sidebar and persists', async () => {
		settingsStore.updateLayout({ shell: 'classic' });
		vaultStore.open('/vault');
		settingsStore.updateLayout({ leftSidebarVisible: true });
		startSettingsPersistence('/vault');

		toggleLeftSidebar();
		await settle();

		expect(settingsStore.layout.leftSidebarVisible).toBe(false);
		expect(persisted().layout.leftSidebarVisible).toBe(false);
	});

	it('shows a hidden left sidebar and persists', async () => {
		settingsStore.updateLayout({ shell: 'classic' });
		vaultStore.open('/vault');
		settingsStore.updateLayout({ leftSidebarVisible: false });
		startSettingsPersistence('/vault');

		toggleLeftSidebar();
		await settle();

		expect(settingsStore.layout.leftSidebarVisible).toBe(true);
		expect(persisted().layout.leftSidebarVisible).toBe(true);
	});

	it('still toggles but does not persist when no vault is open', async () => {
		settingsStore.updateLayout({ shell: 'classic' });
		settingsStore.updateLayout({ leftSidebarVisible: true });

		toggleLeftSidebar();
		await settle();

		expect(settingsStore.layout.leftSidebarVisible).toBe(false);
		expect(writeTextFile).not.toHaveBeenCalled();
	});

	it('toggles the rail panels in the rail shell and leaves the classic sidebar as it was left', async () => {
		vaultStore.open('/vault');
		settingsStore.updateLayout({ shell: 'rail', leftSidebarVisible: true, railPanelsVisible: true });
		startSettingsPersistence('/vault');

		toggleLeftSidebar();
		await settle();

		expect(settingsStore.layout.railPanelsVisible).toBe(false);
		expect(settingsStore.layout.leftSidebarVisible).toBe(true);
		expect(persisted().layout.railPanelsVisible).toBe(false);

		toggleLeftSidebar();

		expect(settingsStore.layout.railPanelsVisible).toBe(true);
	});

	it('leaves the rail panels alone in the classic shell', () => {
		settingsStore.updateLayout({ shell: 'classic' });
		settingsStore.updateLayout({ railPanelsVisible: true });

		toggleLeftSidebar();

		expect(settingsStore.layout.railPanelsVisible).toBe(true);
	});
});

describe('hideRailPanels / showRailPanels', () => {
	beforeEach(resetAll);
	afterEach(teardownAll);

	it('shows the rail panels by default', () => {
		expect(settingsStore.layout.railPanelsVisible).toBe(true);
	});

	it('hides the rail panels in the rail shell and persists', async () => {
		vaultStore.open('/vault');
		settingsStore.updateLayout({ shell: 'rail' });
		startSettingsPersistence('/vault');

		hideRailPanels();
		await settle();

		expect(settingsStore.layout.railPanelsVisible).toBe(false);
		expect(persisted().layout.railPanelsVisible).toBe(false);
	});

	it('shows hidden rail panels in the rail shell and persists', async () => {
		vaultStore.open('/vault');
		settingsStore.updateLayout({ shell: 'rail', railPanelsVisible: false });
		startSettingsPersistence('/vault');

		showRailPanels();
		await settle();

		expect(settingsStore.layout.railPanelsVisible).toBe(true);
		expect(persisted().layout.railPanelsVisible).toBe(true);
	});

	it('repeats are no-ops: hide twice stays hidden, show twice stays shown', () => {
		settingsStore.updateLayout({ shell: 'rail' });

		hideRailPanels();
		hideRailPanels();
		expect(settingsStore.layout.railPanelsVisible).toBe(false);

		showRailPanels();
		showRailPanels();
		expect(settingsStore.layout.railPanelsVisible).toBe(true);
	});

	it('does nothing in the classic shell, to the rail panels or the left sidebar', async () => {
		settingsStore.updateLayout({ shell: 'classic' });
		vaultStore.open('/vault');
		settingsStore.updateLayout({ railPanelsVisible: true, leftSidebarVisible: true });
		startSettingsPersistence('/vault');

		hideRailPanels();
		await settle();

		expect(settingsStore.layout.railPanelsVisible).toBe(true);
		expect(settingsStore.layout.leftSidebarVisible).toBe(true);
		expect(writeTextFile).not.toHaveBeenCalled();

		settingsStore.updateLayout({ railPanelsVisible: false });
		showRailPanels();

		expect(settingsStore.layout.railPanelsVisible).toBe(false);
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

	it('still toggles but does not persist when no vault is open', async () => {
		settingsStore.updateLayout({ rightSidebarVisible: true });

		toggleRightSidebar();
		await settle();

		expect(settingsStore.layout.rightSidebarVisible).toBe(false);
		expect(writeTextFile).not.toHaveBeenCalled();
	});
});
