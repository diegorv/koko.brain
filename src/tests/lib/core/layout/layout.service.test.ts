import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('$lib/core/settings/settings.service', () => ({
	saveSettings: vi.fn(() => Promise.resolve()),
}));

import { saveSettings } from '$lib/core/settings/settings.service';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { cycleSidebarMode } from '$lib/core/layout/layout.service';

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
