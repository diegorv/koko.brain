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
	showClaudePanel,
	setRightPanelVisible,
	showRailPanels,
	toggleClaudePanel,
	toggleLeftSidebar,
	toggleRightPanel,
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

describe('toggleClaudePanel / showClaudePanel', () => {
	beforeEach(() => {
		resetAll();
		settingsStore.updateClaudeCode({ enabled: true });
	});
	afterEach(teardownAll);

	it('is hidden by default', () => {
		expect(settingsStore.layout.claudeVisible).toBe(false);
	});

	it('shows the panel and opens the right sidebar, then hides only the panel, and persists', async () => {
		vaultStore.open('/vault');
		startSettingsPersistence('/vault');

		toggleClaudePanel();
		await settle();
		expect(settingsStore.layout.claudeVisible).toBe(true);
		expect(settingsStore.layout.rightSidebarVisible).toBe(true);
		expect(persisted().layout.claudeVisible).toBe(true);

		toggleClaudePanel();
		expect(settingsStore.layout.claudeVisible).toBe(false);
		expect(settingsStore.layout.rightSidebarVisible).toBe(true);
	});

	it('shows the panel again when its flag is set but the right sidebar was closed', () => {
		settingsStore.updateLayout({ claudeVisible: true, rightSidebarVisible: false });
		toggleClaudePanel();
		expect(settingsStore.layout.claudeVisible).toBe(true);
		expect(settingsStore.layout.rightSidebarVisible).toBe(true);
	});

	it('does nothing while Claude Code is off', () => {
		settingsStore.updateClaudeCode({ enabled: false });
		toggleClaudePanel();
		showClaudePanel();
		expect(settingsStore.layout.claudeVisible).toBe(false);
		expect(settingsStore.layout.rightSidebarVisible).toBe(false);
	});

	it('does nothing on a tab that always hides the right sidebar', () => {
		editorStore.addTab({ path: TASKS_VIRTUAL_PATH, name: 'Tasks', content: '', savedContent: '' });
		toggleClaudePanel();
		expect(settingsStore.layout.claudeVisible).toBe(false);
	});

	it('showClaudePanel keeps a shown panel shown', () => {
		showClaudePanel();
		showClaudePanel();
		expect(settingsStore.layout.claudeVisible).toBe(true);
		expect(settingsStore.layout.rightSidebarVisible).toBe(true);
	});
});

describe('toggleRightPanel / setRightPanelVisible', () => {
	beforeEach(resetAll);
	afterEach(teardownAll);

	/** The four panel flags plus the sidebar flag, to assert that nothing else moved */
	function panelFlags() {
		const { propertiesVisible, backlinksVisible, outgoingLinksVisible, tableOfContentsVisible, rightSidebarVisible } = settingsStore.layout;
		return { propertiesVisible, backlinksVisible, outgoingLinksVisible, tableOfContentsVisible, rightSidebarVisible };
	}

	/** Opens a markdown note tab, so the right sidebar can show */
	function openNoteTab(): void {
		editorStore.addTab({ path: '/vault/a.md', name: 'a.md', content: '', savedContent: '' });
	}

	it('toggleRightPanel flips only that panel flag, and twice returns it', () => {
		settingsStore.updateLayout({ rightSidebarVisible: true });
		openNoteTab();
		const before = panelFlags();

		toggleRightPanel('backlinks');
		expect(panelFlags()).toEqual({ ...before, backlinksVisible: !before.backlinksVisible });

		toggleRightPanel('backlinks');
		expect(panelFlags()).toEqual(before);
	});

	it('turning a panel on shows a hidden right sidebar on a note tab, and persists both', async () => {
		vaultStore.open('/vault');
		settingsStore.updateLayout({ rightSidebarVisible: false, backlinksVisible: false });
		openNoteTab();
		startSettingsPersistence('/vault');

		toggleRightPanel('backlinks');
		await settle();

		expect(settingsStore.layout.backlinksVisible).toBe(true);
		expect(settingsStore.layout.rightSidebarVisible).toBe(true);
		expect(persisted().layout).toMatchObject({ backlinksVisible: true, rightSidebarVisible: true });
	});

	it('turning a panel on with no tab open shows a hidden right sidebar', () => {
		settingsStore.updateLayout({ rightSidebarVisible: false, outgoingLinksVisible: false });

		setRightPanelVisible('outgoingLinks', true);

		expect(settingsStore.layout.outgoingLinksVisible).toBe(true);
		expect(settingsStore.layout.rightSidebarVisible).toBe(true);
	});

	it('turning a panel on while a kanban tab is active sets the flag but leaves the sidebar hidden', () => {
		settingsStore.updateLayout({ rightSidebarVisible: false, backlinksVisible: false });
		editorStore.addTab({ path: '/vault/b.kanban', name: 'b.kanban', content: '', savedContent: '', fileType: 'kanban' });

		toggleRightPanel('backlinks');

		expect(settingsStore.layout.backlinksVisible).toBe(true);
		expect(settingsStore.layout.rightSidebarVisible).toBe(false);
	});

	it('turning a panel on while a virtual tab is active leaves the sidebar hidden', () => {
		settingsStore.updateLayout({ rightSidebarVisible: false, propertiesVisible: false });
		editorStore.addTab({ path: TASKS_VIRTUAL_PATH, name: 'Tasks', content: '', savedContent: '', fileType: 'tasks' });

		setRightPanelVisible('properties', true);

		expect(settingsStore.layout.propertiesVisible).toBe(true);
		expect(settingsStore.layout.rightSidebarVisible).toBe(false);
	});

	it('turning a panel off leaves the sidebar as it was, shown or hidden', () => {
		openNoteTab();
		settingsStore.updateLayout({ rightSidebarVisible: true, tableOfContentsVisible: true });
		setRightPanelVisible('tableOfContents', false);
		expect(settingsStore.layout.tableOfContentsVisible).toBe(false);
		expect(settingsStore.layout.rightSidebarVisible).toBe(true);

		settingsStore.updateLayout({ rightSidebarVisible: false, propertiesVisible: true });
		toggleRightPanel('properties');
		expect(settingsStore.layout.propertiesVisible).toBe(false);
		expect(settingsStore.layout.rightSidebarVisible).toBe(false);
	});

	it('setting a panel to the state it already has changes nothing', () => {
		openNoteTab();
		settingsStore.updateLayout({ rightSidebarVisible: false, backlinksVisible: false });
		const before = panelFlags();

		setRightPanelVisible('backlinks', false);

		expect(panelFlags()).toEqual(before);
	});
});
