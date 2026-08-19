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
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import {
	startSettingsPersistence,
	stopSettingsPersistence,
} from '$lib/core/settings/settings-persistence.svelte';
import { cycleSidebarMode, toggleLeftSidebar, toggleRightSidebar } from '$lib/core/layout/layout.service';

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
		vaultStore.open('/vault');
		settingsStore.updateLayout({ leftSidebarVisible: true });
		startSettingsPersistence('/vault');

		toggleLeftSidebar();
		await settle();

		expect(settingsStore.layout.leftSidebarVisible).toBe(false);
		expect(persisted().layout.leftSidebarVisible).toBe(false);
	});

	it('shows a hidden left sidebar and persists', async () => {
		vaultStore.open('/vault');
		settingsStore.updateLayout({ leftSidebarVisible: false });
		startSettingsPersistence('/vault');

		toggleLeftSidebar();
		await settle();

		expect(settingsStore.layout.leftSidebarVisible).toBe(true);
		expect(persisted().layout.leftSidebarVisible).toBe(true);
	});

	it('still toggles but does not persist when no vault is open', async () => {
		settingsStore.updateLayout({ leftSidebarVisible: true });

		toggleLeftSidebar();
		await settle();

		expect(settingsStore.layout.leftSidebarVisible).toBe(false);
		expect(writeTextFile).not.toHaveBeenCalled();
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

	it('still toggles but does not persist when no vault is open', async () => {
		settingsStore.updateLayout({ rightSidebarVisible: true });

		toggleRightSidebar();
		await settle();

		expect(settingsStore.layout.rightSidebarVisible).toBe(false);
		expect(writeTextFile).not.toHaveBeenCalled();
	});
});
