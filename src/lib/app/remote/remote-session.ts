import { setRemoteBrowser } from '#lib/core/platform/capabilities.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { error } from '#lib/utils/debug.js';
import { remoteConnectionStore } from './remote-connection.store.svelte';
import { createRemoteTransport, type RemoteInvoke, type SocketLike } from './remote-transport';

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
 */
export function startRemoteSession(options: RemoteSessionOptions = {}): RemoteInvoke {
	setRemoteBrowser(true);
	const open = options.open ?? (() => new WebSocket(`ws://${location.host}/ws`) as unknown as SocketLike);
	const reload = options.reload ?? (() => location.reload());
	const transport = createRemoteTransport({
		open,
		onStatus: (status) => {
			remoteConnectionStore.setStatus(status);
			if (status === 'disconnected') error('REMOTE', 'Connection to the Mac was lost');
		},
		onWelcome: (welcome) => {
			remoteConnectionStore.setVaultRoot(welcome.vaultRoot);
			if (welcome.vaultRoot) vaultStore.open(welcome.vaultRoot);
		},
		onVaultChanged: () => reload(),
	});
	return transport.invoke;
}
