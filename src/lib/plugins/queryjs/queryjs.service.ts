import { readText } from '$lib/core/filesystem/fs-rust.service';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';

/**
 * Loads a `.js` script file from the vault. The path must be absolute and
 * inside the currently open vault (the Rust wrapper canonicalizes and
 * rejects anything that escapes the vault root per ADR 0020).
 *
 * Throws when no vault is open or when the read fails for any reason
 * (missing file, permission error, invalid UTF-8). The `KBAPI` caller
 * wraps the rejection in a user-facing error.
 */
export async function loadExternalScript(absolutePath: string): Promise<string> {
	const vaultPath = vaultStore.path;
	if (!vaultPath) {
		throw new Error('Cannot load external script: no vault is open');
	}
	return await readText(vaultPath, absolutePath);
}
