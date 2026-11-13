import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn(() => Promise.resolve(vi.fn())),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(() => Promise.resolve()),
	mkdir: vi.fn(),
	exists: vi.fn(() => Promise.resolve(true)),
	readDir: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
	open: vi.fn(),
	ask: vi.fn(() => Promise.resolve(false)),
}));

vi.mock('@tauri-apps/plugin-deep-link', () => ({
	onOpenUrl: vi.fn(() => Promise.resolve(vi.fn())),
	getCurrent: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({
	readText: vi.fn(() => Promise.resolve('')),
}));

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

import { writeTextFile } from '@tauri-apps/plugin-fs';
import { ask } from '@tauri-apps/plugin-dialog';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { resetHooks } from '#lib/core/editor/editor.hooks.js';
import { saveAllDirtyTabs } from '#lib/core/editor/editor.service.js';
import { switchVault } from '#lib/core/vault/vault.service.js';
import { teardownVault } from '#lib/app/lifecycle/app-lifecycle.service.js';
import { registerAppPorts } from '#lib/app/boot.js';

registerAppPorts();

const VAULT_A = '/vaults/A';
const VAULT_B = '/vaults/B';
const NOTE = `${VAULT_A}/note.md`;
const EDIT = 'text typed in A that could not be written';

/** Vault A open with one tab whose edit is not on disk. */
function openVaultAWithDirtyTab(): void {
	vaultStore.open(VAULT_A);
	editorStore.addTab({ path: NOTE, name: 'note.md', content: 'old', savedContent: 'old' });
	editorStore.updateContent(EDIT);
}

describe('vault switch after a failed save, cancelled at the discard prompt', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		resetHooks();
		vaultStore._reset();
		editorStore.reset();
		// The note cannot be written (disk full, read-only, ACL): every write fails.
		vi.mocked(writeTextFile).mockImplementation(async () => {
			throw new Error('No space left on device (os error 28)');
		});
	});

	it('does not leave vault A when a dirty tab failed to save and the user did not agree to discard it', async () => {
		openVaultAWithDirtyTab();

		const opened = await switchVault(VAULT_B);

		expect(ask).toHaveBeenCalledWith(
			'Failed to save: note.md. Switch anyway and lose unsaved changes?',
			{ title: 'Unsaved Changes', kind: 'warning', okLabel: 'Switch Anyway', cancelLabel: 'Cancel' },
		);
		expect(opened).toBe(false);
		expect(vaultStore.path).toBe(VAULT_A);
		expect(editorStore.tabs.map((t) => t.content)).toContain(EDIT);
	});

	it('the unsaved text survives the full switch chain (switchVault, then the initializeVault safety net and teardownVault only if the switch went through)', async () => {
		openVaultAWithDirtyTab();

		// 1. vault.service.ts switchVault: save fails, the user cancels.
		await switchVault(VAULT_B);
		// 2. The +layout effect runs initializeVault only when the path changed:
		//    its safety-net retry, then teardownVault() -> resetEditor().
		if (vaultStore.path !== VAULT_A) {
			await saveAllDirtyTabs();
			teardownVault();
		}

		expect(editorStore.tabs.some((t) => t.content === EDIT), 'unsaved text must survive in a tab').toBe(true);
	});
});
