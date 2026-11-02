import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../fixtures/localStorage.fixture';

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

/** Every content string a successful `writeTextFile` call put on disk. */
let written: string[] = [];

describe('repro o01: vault switch after a failed save', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		resetHooks();
		vaultStore._reset();
		editorStore.reset();
		written = [];
		// The note cannot be written (disk full, read-only, ACL): every write fails.
		vi.mocked(writeTextFile).mockImplementation(async () => {
			throw new Error('No space left on device (os error 28)');
		});
	});

	it('does not leave vault A when a dirty tab failed to save and the user did not agree to discard it', async () => {
		openVaultAWithDirtyTab();

		await switchVault(VAULT_B);

		// Correct behavior (what the window-close handler does): the switch
		// stops, or asks, instead of opening B over an unsaved buffer.
		expect(vaultStore.path).toBe(VAULT_A);
		expect(editorStore.tabs.map((t) => t.content)).toContain(EDIT);
	});

	it('the unsaved text survives the full switch chain (switchVault -> initializeVault safety net -> teardownVault)', async () => {
		openVaultAWithDirtyTab();

		// 1. vault.service.ts switchVault: save fails, result ignored, B opened.
		await switchVault(VAULT_B);
		// 2. app-lifecycle.service.ts initializeVault (run by the +layout effect
		//    on the path change): safety-net retry, result ignored again ...
		await saveAllDirtyTabs();
		// 3. ... then teardownVault(), which calls resetEditor().
		teardownVault();

		const survivesInEditor = editorStore.tabs.some((t) => t.content === EDIT);
		const survivesOnDisk = written.includes(EDIT);
		expect(survivesInEditor || survivesOnDisk, 'unsaved text must survive in a tab or on disk').toBe(true);
	});
});
