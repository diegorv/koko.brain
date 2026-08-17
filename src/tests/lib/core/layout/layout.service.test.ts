import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('$lib/core/settings/settings.service', () => ({
	saveSettings: vi.fn(() => Promise.resolve()),
}));

import { saveSettings } from '$lib/core/settings/settings.service';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { cycleSidebarMode, toggleLeftSidebar, toggleRightSidebar } from '$lib/core/layout/layout.service';

describe('cycleSidebarMode', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(saveSettings).mockResolvedValue(undefined);
		clearLocalStorage();
		vaultStore._reset();
		settingsStore.reset();
	});

	it('advances to the next mode and persists', () => {
		vaultStore.open('/vault');
		settingsStore.updateLayout({ sidebarMode: 'files', leftSidebarVisible: true });

		cycleSidebarMode();

		expect(settingsStore.layout.sidebarMode).toBe('types');
		expect(settingsStore.layout.leftSidebarVisible).toBe(true);
		expect(saveSettings).toHaveBeenCalledWith('/vault');
	});

	it('wraps calendar back to files and reveals the sidebar when hidden', () => {
		vaultStore.open('/vault');
		settingsStore.updateLayout({ sidebarMode: 'calendar', leftSidebarVisible: false });

		cycleSidebarMode();

		expect(settingsStore.layout.sidebarMode).toBe('files');
		expect(settingsStore.layout.leftSidebarVisible).toBe(true);
	});

	it('still updates the layout but does not persist when no vault is open', () => {
		settingsStore.updateLayout({ sidebarMode: 'files', leftSidebarVisible: true });

		cycleSidebarMode();

		expect(settingsStore.layout.sidebarMode).toBe('types');
		expect(saveSettings).not.toHaveBeenCalled();
	});
});

describe('toggleLeftSidebar', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(saveSettings).mockResolvedValue(undefined);
		clearLocalStorage();
		vaultStore._reset();
		settingsStore.reset();
	});

	it('hides a visible left sidebar and persists', () => {
		vaultStore.open('/vault');
		settingsStore.updateLayout({ leftSidebarVisible: true });

		toggleLeftSidebar();

		expect(settingsStore.layout.leftSidebarVisible).toBe(false);
		expect(saveSettings).toHaveBeenCalledWith('/vault');
	});

	it('shows a hidden left sidebar and persists', () => {
		vaultStore.open('/vault');
		settingsStore.updateLayout({ leftSidebarVisible: false });

		toggleLeftSidebar();

		expect(settingsStore.layout.leftSidebarVisible).toBe(true);
		expect(saveSettings).toHaveBeenCalledWith('/vault');
	});

	it('still toggles but does not persist when no vault is open', () => {
		settingsStore.updateLayout({ leftSidebarVisible: true });

		toggleLeftSidebar();

		expect(settingsStore.layout.leftSidebarVisible).toBe(false);
		expect(saveSettings).not.toHaveBeenCalled();
	});
});

describe('toggleRightSidebar', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(saveSettings).mockResolvedValue(undefined);
		clearLocalStorage();
		vaultStore._reset();
		settingsStore.reset();
	});

	it('hides a visible right sidebar and persists', () => {
		vaultStore.open('/vault');
		settingsStore.updateLayout({ rightSidebarVisible: true });

		toggleRightSidebar();

		expect(settingsStore.layout.rightSidebarVisible).toBe(false);
		expect(saveSettings).toHaveBeenCalledWith('/vault');
	});

	it('shows a hidden right sidebar and persists', () => {
		vaultStore.open('/vault');
		settingsStore.updateLayout({ rightSidebarVisible: false });

		toggleRightSidebar();

		expect(settingsStore.layout.rightSidebarVisible).toBe(true);
		expect(saveSettings).toHaveBeenCalledWith('/vault');
	});

	it('still toggles but does not persist when no vault is open', () => {
		settingsStore.updateLayout({ rightSidebarVisible: true });

		toggleRightSidebar();

		expect(settingsStore.layout.rightSidebarVisible).toBe(false);
		expect(saveSettings).not.toHaveBeenCalled();
	});
});
