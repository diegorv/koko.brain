import type { UpdateResult } from '#lib/contracts/generated/UpdateResult.js';
import { setRemoteBrowser } from '#lib/core/platform/capabilities.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { error } from '#lib/utils/debug.js';
import { remoteConnectionStore } from './remote-connection.store.svelte';
import { createRemoteTransport, type RemoteInvoke, type SocketLike } from './remote-transport';
import { emitBridgeEvent } from './tauri-bridge-stand-in';

/** Options of `startRemoteSession`; the defaults are the browser's. */
export interface RemoteSessionOptions {
	/** Opens the socket; defaults to `ws://<this host>/ws`. */
	open?: () => SocketLike;
	/** Reloads the page; defaults to `location.reload()`. */
	reload?: () => void;
}

/**
 * Starts the browser's session with the Mac and returns the `invoke` the
 * bridge stand-in forwards to. Marks the runtime as the browser, opens the
 * desktop's vault from the welcome (no picker), and reloads the page when
 * the desktop closes or switches vaults, so nothing of the old vault stays.
 *
 * On the desktop `scan_vault_v2_cached` makes Rust emit a full-rescan
 * `vault-index-updated`, which fills the note list, the lenses and the type
 * definitions. The browser's scan is Virtual (the Mac's index is already
 * built), so the session raises that event itself, stamped with the index
 * version from the welcome.
 */
export function startRemoteSession(options: RemoteSessionOptions = {}): RemoteInvoke {
	setRemoteBrowser(true);
	const open = options.open ?? (() => new WebSocket(`ws://${location.host}/ws`) as unknown as SocketLike);
	const reload = options.reload ?? (() => location.reload());
	let indexVersion = 0;
	const transport = createRemoteTransport({
		open,
		onStatus: (status) => {
			remoteConnectionStore.setStatus(status);
			if (status === 'disconnected') error('REMOTE', 'Connection to the Mac was lost');
		},
		onWelcome: (welcome) => {
			indexVersion = welcome.indexVersion;
			remoteConnectionStore.setVaultRoot(welcome.vaultRoot);
			if (welcome.vaultRoot) vaultStore.open(welcome.vaultRoot);
		},
		onVaultChanged: () => reload(),
	});
	return async (cmd, args, headers) => {
		const result = await transport.invoke(cmd, args, headers);
		if (cmd === 'scan_vault_v2_cached') {
			const rescan: UpdateResult = {
				changed: true,
				affected: [],
				version: indexVersion,
				upserted: [],
				removed: [],
				fullRescan: true,
			};
			emitBridgeEvent('vault-index-updated', rescan);
		}
		return result;
	};
}
