import type { UpdateResult } from '#lib/contracts/generated/UpdateResult.js';
import { reloadExternallyChangedTabs } from '#lib/core/editor/editor.service.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { refreshTree } from '#lib/core/filesystem/fs.service.js';
import { notifyContentInvalidated } from '#lib/core/filesystem/note-change.service.js';
import { invalidateVaultEntries } from '#lib/core/vault/vault-entries.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { emitBridgeEvent } from './tauri-bridge-stand-in';

/**
 * The browser's full refresh after it reconnected to the Mac: events sent
 * while it was away are gone (the host keeps no history), so everything they
 * would have updated is read again. Drops the vault entries cache, reloads
 * the tree and every open note whose tab is clean (`reloadExternallyChangedTabs`
 * never replaces a dirty buffer), drops the content caches, and raises a
 * full-rescan `vault-index-updated` stamped `indexVersion` (the welcome's), at
 * once, so the note list, lenses and panels read the index again.
 */
export async function refreshAfterReconnect(indexVersion: number): Promise<void> {
	invalidateVaultEntries();
	await refreshTree();
	await reloadExternallyChangedTabs(editorStore.tabs.map((tab) => tab.path));
	notifyContentInvalidated();
	const rescan: UpdateResult = {
		changed: true,
		affected: [],
		version: indexVersion,
		upserted: [],
		removed: [],
		fullRescan: true,
	};
	vaultStore.requestPromptIndexRefresh();
	emitBridgeEvent('vault-index-updated', rescan);
}
