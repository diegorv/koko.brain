import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
	writeTextFile: vi.fn(),
}));

vi.mock('$lib/core/editor/editor.hooks', () => ({
	setFileReadTransform: vi.fn(),
	setFileWriteTransform: vi.fn(),
	notifyAfterSave: vi.fn(),
}));

vi.mock('$lib/core/editor/editor.service', () => ({
	saveAllDirtyTabs: vi.fn().mockResolvedValue([]),
}));

import { invoke } from '@tauri-apps/api/core';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { notifyAfterSave, setFileReadTransform, setFileWriteTransform } from '$lib/core/editor/editor.hooks';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { saveAllDirtyTabs } from '$lib/core/editor/editor.service';
import {
	registerEncryptionHooks,
	unregisterEncryptionHooks,
	encryptCurrentFile,
	decryptCurrentFile,
	lockEncryption,
	resetEncryptedNotes,
} from '$lib/plugins/encrypted-notes/encrypted-notes.service';

describe('registerEncryptionHooks', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
	});

	it('registers both read and write transforms', () => {
		registerEncryptionHooks();

		expect(setFileReadTransform).toHaveBeenCalledTimes(1);
		expect(setFileReadTransform).toHaveBeenCalledWith(expect.any(Function));
		expect(setFileWriteTransform).toHaveBeenCalledTimes(1);
		expect(setFileWriteTransform).toHaveBeenCalledWith(expect.any(Function));
	});

	describe('read transform', () => {
		let readTransform: (filePath: string, rawContent: string) => Promise<any>;

		beforeEach(() => {
			vi.clearAllMocks();
			clearLocalStorage();
			vaultStore._reset();
			editorStore.reset();
			registerEncryptionHooks();
			readTransform = vi.mocked(setFileReadTransform).mock.calls[0][0]!;
			vaultStore.open('/test/vault');
		});

		it('returns null for regular markdown', async () => {
			const result = await readTransform('/vault/note.md', '# Hello World');
			expect(result).toBeNull();
		});

		it('returns null for non-encrypted JSON', async () => {
			const result = await readTransform('/vault/note.md', '{"foo": "bar"}');
			expect(result).toBeNull();
		});

		it('decrypts encrypted content and returns tabProps', async () => {
			const payload = JSON.stringify({ kokobrain_encrypted: '1.0', iv: 'test-iv', data: 'test-data' });
			vi.mocked(invoke).mockResolvedValue('decrypted plaintext');

			const result = await readTransform('/vault/note.md', payload);

			expect(invoke).toHaveBeenCalledWith('decrypt_content', {
				iv: 'test-iv',
				data: 'test-data',
				vaultPath: '/test/vault',
			});
			expect(result).toEqual({
				content: 'decrypted plaintext',
				tabProps: { encrypted: true },
			});
		});

		it('throws "canceled" when Touch ID is canceled', async () => {
			const payload = JSON.stringify({ kokobrain_encrypted: '1.0', iv: 'a', data: 'b' });
			vi.mocked(invoke).mockRejectedValue('Authentication was canceled');

			await expect(readTransform('/vault/note.md', payload)).rejects.toThrow('canceled');
		});

		it('throws "no-encryption-key" when key is not found', async () => {
			const payload = JSON.stringify({ kokobrain_encrypted: '1.0', iv: 'a', data: 'b' });
			vi.mocked(invoke).mockRejectedValue('No encryption key found for this vault');

			await expect(readTransform('/vault/note.md', payload)).rejects.toThrow('no-encryption-key');
		});

		it('rethrows non-cancellation errors', async () => {
			const payload = JSON.stringify({ kokobrain_encrypted: '1.0', iv: 'a', data: 'b' });
			vi.mocked(invoke).mockRejectedValue(new Error('Decryption failed'));

			await expect(readTransform('/vault/note.md', payload)).rejects.toThrow('Decryption failed');
		});

		it('returns null when no vault is open', async () => {
			vaultStore.close();
			const payload = JSON.stringify({ kokobrain_encrypted: '1.0', iv: 'a', data: 'b' });

			const result = await readTransform('/vault/note.md', payload);
			expect(result).toBeNull();
		});
	});

	describe('write transform', () => {
		let writeTransform: (filePath: string, content: string, tab: any) => Promise<boolean>;

		beforeEach(() => {
			vi.clearAllMocks();
			clearLocalStorage();
			vaultStore._reset();
			editorStore.reset();
			registerEncryptionHooks();
			writeTransform = vi.mocked(setFileWriteTransform).mock.calls[0][0]!;
			vaultStore.open('/test/vault');
		});

		it('returns false for non-encrypted tabs', async () => {
			const result = await writeTransform('/vault/note.md', 'content', { encrypted: false });
			expect(result).toBe(false);
		});

		it('encrypts and writes encrypted tabs', async () => {
			const encryptedPayload = { kokobrain_encrypted: '1.0', iv: 'new-iv', data: 'new-data' };
			vi.mocked(invoke).mockResolvedValue(encryptedPayload);

			const result = await writeTransform('/vault/note.md', '# Hello', { encrypted: true });

			expect(invoke).toHaveBeenCalledWith('encrypt_content', {
				content: '# Hello',
				vaultPath: '/test/vault',
			});
			expect(writeTextFile).toHaveBeenCalledWith(
				'/vault/note.md',
				expect.stringContaining('"kokobrain_encrypted"'),
			);
			expect(result).toBe(true);
		});

		it('throws when encrypted tab has no vault path', async () => {
			vaultStore.close();
			await expect(
				writeTransform('/vault/note.md', 'content', { encrypted: true }),
			).rejects.toThrow('Cannot save encrypted file: no vault path');
		});
	});
});

describe('unregisterEncryptionHooks', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
	});

	it('clears both transforms', () => {
		unregisterEncryptionHooks();

		expect(setFileReadTransform).toHaveBeenCalledWith(null);
		expect(setFileWriteTransform).toHaveBeenCalledWith(null);
	});
});

describe('encryptCurrentFile', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		editorStore.reset();
		vaultStore.open('/test/vault');
	});

	it('returns { encrypted: false } when no active tab', async () => {
		const result = await encryptCurrentFile();
		expect(result).toEqual({ encrypted: false });
	});

	it('returns { encrypted: false } when active tab is virtual', async () => {
		editorStore.addTab({ path: '__virtual__/tasks', name: 'Tasks', content: '', savedContent: '' });
		// isVirtualTab returns true for __virtual__/* paths — using real function

		const result = await encryptCurrentFile();
		expect(result).toEqual({ encrypted: false });
	});

	it('returns { encrypted: false } when already encrypted', async () => {
		editorStore.addTab({ path: '/vault/note.md', name: 'note.md', content: '# Hello', savedContent: '# Hello', encrypted: true });

		const result = await encryptCurrentFile();
		expect(result).toEqual({ encrypted: false });
	});

	it('ensures encryption key and encrypts file (existing key)', async () => {
		editorStore.addTab({ path: '/vault/note.md', name: 'note.md', content: '# Hello', savedContent: '# Hello' });
		// isVirtualTab returns false for regular file paths — using real function

		const encryptedPayload = { kokobrain_encrypted: '1.0', iv: 'iv', data: 'data' };
		vi.mocked(invoke)
			.mockResolvedValueOnce(null) // ensure_encryption_key — existing key, no recovery key
			.mockResolvedValueOnce(encryptedPayload); // encrypt_content

		const result = await encryptCurrentFile();

		expect(invoke).toHaveBeenCalledWith('ensure_encryption_key', { vaultPath: '/test/vault' });
		expect(invoke).toHaveBeenCalledWith('encrypt_content', { content: '# Hello', vaultPath: '/test/vault' });
		expect(writeTextFile).toHaveBeenCalled();
		expect(result).toEqual({ encrypted: true });

		// Verify tab is marked as encrypted
		expect(editorStore.activeTab?.encrypted).toBe(true);
		// Verify self-save notification for file watcher
		expect(notifyAfterSave).toHaveBeenCalledWith('/vault/note.md', '# Hello');
	});

	it('returns recovery key when new encryption key is created', async () => {
		editorStore.addTab({ path: '/vault/note.md', name: 'note.md', content: '# Hello', savedContent: '# Hello' });

		const encryptedPayload = { kokobrain_encrypted: '1.0', iv: 'iv', data: 'data' };
		vi.mocked(invoke)
			.mockResolvedValueOnce('dGVzdC1yZWNvdmVyeS1rZXktYmFzZTY0LXZhbHVl') // ensure_encryption_key — new key
			.mockResolvedValueOnce(encryptedPayload); // encrypt_content

		const result = await encryptCurrentFile();

		expect(result).toEqual({
			encrypted: true,
			recoveryKey: 'dGVzdC1yZWNvdmVyeS1rZXktYmFzZTY0LXZhbHVl',
		});
	});

	it('returns { encrypted: false } on error', async () => {
		editorStore.addTab({ path: '/vault/note.md', name: 'note.md', content: '# Hello', savedContent: '# Hello' });
		vi.mocked(invoke).mockRejectedValue(new Error('Key generation failed'));

		const result = await encryptCurrentFile();
		expect(result).toEqual({ encrypted: false });
	});
});

describe('decryptCurrentFile', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		editorStore.reset();
		vaultStore.open('/test/vault');
	});

	it('returns false when no active tab', async () => {
		const result = await decryptCurrentFile();
		expect(result).toBe(false);
	});

	it('returns false when tab is not encrypted', async () => {
		editorStore.addTab({ path: '/vault/note.md', name: 'note.md', content: '# Hello', savedContent: '# Hello' });

		const result = await decryptCurrentFile();
		expect(result).toBe(false);
	});

	it('writes plaintext to disk and clears encrypted flag', async () => {
		editorStore.addTab({ path: '/vault/note.md', name: 'note.md', content: '# Hello', savedContent: '# Hello', encrypted: true });

		const result = await decryptCurrentFile();

		expect(writeTextFile).toHaveBeenCalledWith('/vault/note.md', '# Hello');
		expect(result).toBe(true);
		expect(editorStore.activeTab?.encrypted).toBe(false);
		// Verify self-save notification for file watcher
		expect(notifyAfterSave).toHaveBeenCalledWith('/vault/note.md', '# Hello');
	});

	it('returns false on write error', async () => {
		editorStore.addTab({ path: '/vault/note.md', name: 'note.md', content: '# Hello', savedContent: '# Hello', encrypted: true });
		vi.mocked(writeTextFile).mockRejectedValue(new Error('Write failed'));

		const result = await decryptCurrentFile();
		expect(result).toBe(false);
	});
});

describe('lockEncryption', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		editorStore.reset();
	});

	it('invokes lock_encryption and removes encrypted tabs', async () => {
		editorStore.addTab({ path: '/vault/note1.md', name: 'note1.md', content: 'a', savedContent: 'a' });
		editorStore.addTab({ path: '/vault/note2.md', name: 'note2.md', content: 'b', savedContent: 'b', encrypted: true });
		editorStore.addTab({ path: '/vault/note3.md', name: 'note3.md', content: 'c', savedContent: 'c', encrypted: true });
		vi.mocked(invoke).mockResolvedValue(undefined);

		await lockEncryption();

		expect(invoke).toHaveBeenCalledWith('lock_encryption');
		expect(editorStore.tabs).toHaveLength(1);
		expect(editorStore.tabs[0].path).toBe('/vault/note1.md');
	});

	it('works when no encrypted tabs exist', async () => {
		editorStore.addTab({ path: '/vault/note.md', name: 'note.md', content: 'a', savedContent: 'a' });
		vi.mocked(invoke).mockResolvedValue(undefined);

		await lockEncryption();

		expect(editorStore.tabs).toHaveLength(1);
	});

	it('saves dirty tabs before clearing the encryption key', async () => {
		editorStore.addTab({ path: '/vault/note.md', name: 'note.md', content: 'edited', savedContent: 'original', encrypted: true });
		vi.mocked(invoke).mockResolvedValue(undefined);
		// Simulate successful save by syncing savedContent
		vi.mocked(saveAllDirtyTabs).mockImplementation(async () => {
			editorStore.markSavedByPath('/vault/note.md', 'edited');
			return [];
		});

		await lockEncryption();

		// saveAllDirtyTabs must be called before invoke('lock_encryption')
		expect(saveAllDirtyTabs).toHaveBeenCalledTimes(1);
		const saveOrder = vi.mocked(saveAllDirtyTabs).mock.invocationCallOrder[0];
		const lockOrder = vi.mocked(invoke).mock.invocationCallOrder[0];
		expect(saveOrder).toBeLessThan(lockOrder);
	});

	it('aborts when encrypted tabs are still dirty after save attempt', async () => {
		editorStore.addTab({ path: '/vault/note.md', name: 'note.md', content: 'edited', savedContent: 'original', encrypted: true });
		// saveAllDirtyTabs mock does NOT update savedContent — simulates a failed save
		vi.mocked(saveAllDirtyTabs).mockResolvedValue(['/vault/note.md']);

		await expect(lockEncryption()).rejects.toThrow('Cannot lock: 1 encrypted tab(s) have unsaved changes');

		// Key should NOT have been cleared — invoke('lock_encryption') was never called
		expect(invoke).not.toHaveBeenCalled();
		// Tab should still be open with its content intact
		expect(editorStore.tabs).toHaveLength(1);
		expect(editorStore.tabs[0].content).toBe('edited');
	});
});

describe('resetEncryptedNotes', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		editorStore.reset();
	});

	it('invokes lock_encryption', async () => {
		vi.mocked(invoke).mockResolvedValue(undefined);

		await resetEncryptedNotes();

		expect(invoke).toHaveBeenCalledWith('lock_encryption');
	});

	it('does not throw on lock_encryption failure', async () => {
		vi.mocked(invoke).mockRejectedValue(new Error('shutting down'));

		await expect(resetEncryptedNotes()).resolves.not.toThrow();
	});
});
