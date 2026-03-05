import { invoke } from '@tauri-apps/api/core';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { notifyAfterSave, setFileReadTransform, setFileWriteTransform } from '$lib/core/editor/editor.hooks';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { isVirtualTab, isTabDirty } from '$lib/core/editor/editor.logic';
import { saveAllDirtyTabs } from '$lib/core/editor/editor.service';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { debug, error } from '$lib/utils/debug';
import { isEncryptedContent, parseEncryptedPayload, serializeEncryptedPayload } from './encrypted-notes.logic';
import type { EncryptedPayload } from './encrypted-notes.types';

/**
 * Registers read/write hooks for transparent encryption.
 * Call once during app initialization (before any vault is opened).
 * The hooks detect encrypted content on read and re-encrypt on write.
 */
export function registerEncryptionHooks(): void {
	debug('ENCRYPTION', 'Registering read/write encryption hooks');
	setFileReadTransform(async (filePath, rawContent) => {
		if (!isEncryptedContent(rawContent)) return null;

		debug('ENCRYPTION', 'Encrypted content detected, decrypting:', filePath);
		const payload = parseEncryptedPayload(rawContent);
		const vaultPath = vaultStore.path;
		if (!vaultPath) return null;

		try {
			const plaintext = await invoke<string>('decrypt_content', {
				iv: payload.iv,
				data: payload.data,
				vaultPath,
			});
			debug('ENCRYPTION', 'Decryption successful:', filePath, `(${plaintext.length} chars)`);
			return { content: plaintext, tabProps: { encrypted: true } };
		} catch (err) {
			const msg = String(err);
			if (msg.includes('canceled') || msg.includes('cancelled')) {
				debug('ENCRYPTION', 'Decryption canceled by user (Touch ID):', filePath);
				throw new Error('canceled');
			}
			if (msg.includes('No encryption key found')) {
				debug('ENCRYPTION', 'No encryption key found for vault:', filePath);
				throw new Error('no-encryption-key');
			}
			debug('ENCRYPTION', 'Decryption failed:', filePath, err);
			throw err;
		}
	});

	setFileWriteTransform(async (filePath, content, tab) => {
		if (!tab.encrypted) return false;
		const vaultPath = vaultStore.path;
		if (!vaultPath) throw new Error('Cannot save encrypted file: no vault path');

		try {
			debug('ENCRYPTION', 'Encrypting content on save:', filePath, `(${content.length} chars)`);
			const payload = await invoke<EncryptedPayload>('encrypt_content', {
				content,
				vaultPath,
			});
			await writeTextFile(filePath, serializeEncryptedPayload(payload));
			debug('ENCRYPTION', 'Encryption successful, written to disk:', filePath);
			return true;
		} catch (err) {
			error('ENCRYPTION', 'Failed to encrypt and save file:', filePath, err);
			throw err;
		}
	});
}

/**
 * Unregisters encryption hooks. Called during teardown.
 */
export function unregisterEncryptionHooks(): void {
	debug('ENCRYPTION', 'Unregistering encryption hooks');
	setFileReadTransform(null);
	setFileWriteTransform(null);
}

/** Result of encrypting a file — includes recovery key if this was the first encryption */
export interface EncryptResult {
	/** Whether the file was encrypted successfully */
	encrypted: boolean;
	/** Base64-encoded recovery key (only present when a NEW key was generated) */
	recoveryKey?: string;
}

/**
 * Encrypts the currently open file (toggle lock ON).
 * If no encryption key exists for this vault, generates one (triggers Touch ID).
 * Writes encrypted content to disk and updates the tab's encrypted flag.
 * Returns the recovery key if a new encryption key was created.
 */
export async function encryptCurrentFile(): Promise<EncryptResult> {
	const tab = editorStore.activeTab;
	if (!tab || isVirtualTab(tab) || tab.encrypted) return { encrypted: false };

	const vaultPath = vaultStore.path;
	if (!vaultPath) return { encrypted: false };

	debug('ENCRYPTION', 'Encrypting current file:', tab.path);
	try {
		// Atomic: checks cache → keychain → creates key if needed (all with biometric auth)
		// Returns the recovery key (base64) if a new key was created, null otherwise
		const recoveryKey = await invoke<string | null>('ensure_encryption_key', { vaultPath });

		const payload = await invoke<EncryptedPayload>('encrypt_content', {
			content: tab.content,
			vaultPath,
		});
		await writeTextFile(tab.path, serializeEncryptedPayload(payload));

		editorStore.setEncrypted(tab.path, true);
		editorStore.markSavedByPath(tab.path, tab.content);
		notifyAfterSave(tab.path, tab.content);
		debug('ENCRYPTION', 'File encrypted successfully:', tab.path);
		return { encrypted: true, recoveryKey: recoveryKey ?? undefined };
	} catch (err) {
		error('ENCRYPTION', 'Failed to encrypt file:', err);
		return { encrypted: false };
	}
}

/**
 * Removes encryption from the currently open file (toggle lock OFF).
 * Writes the plaintext content directly to disk.
 */
export async function decryptCurrentFile(): Promise<boolean> {
	const tab = editorStore.activeTab;
	if (!tab || isVirtualTab(tab) || !tab.encrypted) return false;

	debug('ENCRYPTION', 'Removing encryption from:', tab.path);
	try {
		await writeTextFile(tab.path, tab.content);
		editorStore.setEncrypted(tab.path, false);
		editorStore.markSavedByPath(tab.path, tab.content);
		notifyAfterSave(tab.path, tab.content);
		debug('ENCRYPTION', 'File decrypted successfully:', tab.path);
		return true;
	} catch (err) {
		error('ENCRYPTION', 'Failed to remove encryption:', err);
		return false;
	}
}

/**
 * Clears the cached encryption key from Rust memory.
 * Closes all open encrypted tabs.
 * Next encrypt/decrypt operation will trigger Touch ID again.
 */
export async function lockEncryption(): Promise<void> {
	debug('ENCRYPTION', 'Locking encryption — saving dirty tabs, clearing key cache, closing encrypted tabs');

	// Save all dirty encrypted tabs BEFORE clearing the key —
	// after lock_encryption the key is gone and encryption would fail
	await saveAllDirtyTabs();

	// Safety check: if any encrypted tabs are still dirty after save attempt,
	// the save failed silently (saveFileByPath swallows errors). Abort to
	// prevent data loss — the key would be cleared and content would be gone.
	const stillDirty = editorStore.tabs.filter((t) => t.encrypted && isTabDirty(t));
	if (stillDirty.length > 0) {
		error('ENCRYPTION', `Aborting lock — ${stillDirty.length} encrypted tab(s) failed to save:`,
			stillDirty.map((t) => t.path));
		throw new Error(`Cannot lock: ${stillDirty.length} encrypted tab(s) have unsaved changes`);
	}

	try {
		await invoke('lock_encryption');
	} catch (err) {
		error('ENCRYPTION', 'Failed to clear encryption key cache:', err);
	}

	let closedCount = 0;
	for (let i = editorStore.tabs.length - 1; i >= 0; i--) {
		if (editorStore.tabs[i].encrypted) {
			editorStore.removeTab(i);
			closedCount++;
		}
	}
	debug('ENCRYPTION', `Lock complete — closed ${closedCount} encrypted tab(s)`);
}

/**
 * Restores an encryption key from a base64-encoded recovery key.
 * Used when migrating to a new machine or recovering from key loss.
 */
export async function restoreFromRecoveryKey(recoveryKey: string): Promise<void> {
	const vaultPath = vaultStore.path;
	if (!vaultPath) throw new Error('No vault open');
	debug('ENCRYPTION', 'Restoring encryption key from recovery key');
	await invoke('restore_from_recovery_key', { vaultPath, recoveryKey });
	debug('ENCRYPTION', 'Encryption key restored successfully');
}

/**
 * Resets encryption state on vault close.
 * Clears the in-memory key cache. Hook unregistration is handled separately
 * by unregisterEncryptionHooks() during teardown.
 */
export async function resetEncryptedNotes(): Promise<void> {
	debug('ENCRYPTION', 'Resetting encrypted notes — clearing key cache');
	try {
		await invoke('lock_encryption');
	} catch {
		// Ignore — app may be shutting down
	}
}
