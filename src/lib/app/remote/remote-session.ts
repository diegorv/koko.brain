import { toast } from 'svelte-sonner';
import type { UpdateResult } from '#lib/contracts/generated/UpdateResult.js';
import { setRemoteBrowser } from '#lib/core/platform/capabilities.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { error } from '#lib/utils/debug.js';
import { remoteConnectionStore } from './remote-connection.store.svelte';
import { refreshAfterReconnect } from './remote-refresh';
import { createRemoteTransport, type RemoteInvoke, type RemoteTransport, type SocketLike } from './remote-transport';
import { emitBridgeEvent } from './tauri-bridge-stand-in';

/**
 * The session socket URL for the page's location: `wss://` when the page came
 * over https (Tailscale Serve), `ws://` on the loopback http page.
 */
export function sessionSocketUrl(loc: { protocol: string; host: string }): string {
	return `${loc.protocol === 'https:' ? 'wss' : 'ws'}://${loc.host}/ws`;
}

/** Longest wait between two reconnect attempts. */
const MAX_RECONNECT_DELAY_MS = 30_000;

/** Wait before reconnect attempt `attempt` (1-based): 1 s, doubling, capped at 30 s. */
export function reconnectDelayMs(attempt: number): number {
	return Math.min(MAX_RECONNECT_DELAY_MS, 1000 * 2 ** Math.max(0, attempt - 1));
}

/** Options of `startRemoteSession`; the defaults are the browser's. */
export interface RemoteSessionOptions {
	/** Opens a socket, once per connection attempt; defaults to `sessionSocketUrl(location)`. */
	open?: () => SocketLike;
	/** Reloads the page; defaults to `location.reload()`. */
	reload?: () => void;
	/** Runs after a reconnect to the same vault; defaults to `refreshAfterReconnect`. */
	onReconnect?: (indexVersion: number) => Promise<void>;
}

/**
 * Starts the browser's session with the Mac and returns the `invoke` the
 * bridge stand-in forwards to. Marks the runtime as the browser, opens the
 * desktop's vault from the welcome (no picker), and reloads the page when
 * the desktop closes or switches vaults, so nothing of the old vault stays.
 * Rust events the host forwards are raised to the page's `listen()`
 * handlers.
 *
 * A lost connection is retried (`reconnectDelayMs`) while the banner shows
 * it; no call is replayed. The welcome of a reconnect runs one full refresh
 * (`onReconnect`), since the events sent in between are gone, or reloads the
 * page when the desktop now has another vault open.
 *
 * On the desktop `scan_vault_v2_cached` makes Rust emit a full-rescan
 * `vault-index-updated`, which fills the note list, the lenses and the type
 * definitions. The browser's scan is Virtual (the Mac's index is already
 * built), so the session raises that event itself, stamped with the latest
 * index version it saw (the welcome's, or a forwarded event's).
 */
export function startRemoteSession(options: RemoteSessionOptions = {}): RemoteInvoke {
	setRemoteBrowser(true);
	const open = options.open ?? (() => new WebSocket(sessionSocketUrl(location)) as unknown as SocketLike);
	const reload = options.reload ?? (() => location.reload());
	const onReconnect = options.onReconnect ?? refreshAfterReconnect;
	let indexVersion = 0;
	/** The first welcome's vault root; `undefined` until a welcome arrived. */
	let sessionRoot: string | null | undefined;
	let failedAttempts = 0;
	let transport: RemoteTransport;

	const connect = () => {
		let welcomed = false;
		transport = createRemoteTransport({
			open,
			onStatus: (status) => {
				if (status === 'connecting') return;
				remoteConnectionStore.setStatus(status);
				if (status === 'connected') {
					failedAttempts = 0;
					return;
				}
				if (welcomed) error('REMOTE', 'Connection to the Mac was lost');
				failedAttempts++;
				setTimeout(connect, reconnectDelayMs(failedAttempts));
			},
			onWelcome: (welcome) => {
				welcomed = true;
				indexVersion = welcome.indexVersion;
				if (sessionRoot === undefined) {
					sessionRoot = welcome.vaultRoot;
					remoteConnectionStore.setVaultRoot(welcome.vaultRoot);
					if (welcome.vaultRoot) vaultStore.open(welcome.vaultRoot);
					return;
				}
				if (welcome.vaultRoot !== sessionRoot) {
					reload();
					return;
				}
				onReconnect(welcome.indexVersion).catch((err) => {
					error('REMOTE', 'Refresh after reconnect failed:', err);
					// The banner clears on connect, so without this a stale page looks live.
					toast.error('Could not refresh after reconnecting to the Mac. Reload the page to see the latest notes.');
				});
			},
			onVaultChanged: () => reload(),
			onEvent: (event, payload) => {
				if (event === 'vault-index-updated') indexVersion = (payload as UpdateResult).version;
				emitBridgeEvent(event, payload);
			},
		});
	};
	connect();

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
