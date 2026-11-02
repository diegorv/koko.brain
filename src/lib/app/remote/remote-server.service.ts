import { call } from '#lib/contracts/ipc.js';
import type { RemoteServerSettings } from '#lib/core/settings/settings.types.js';
import { remoteServerStore } from './remote-server.store.svelte';

/**
 * Starts or stops the browser access server to match `settings`. A start on
 * a new port restarts it there. A failed start is recorded in
 * `remoteServerStore.error` (shown in Settings) and rethrown.
 */
export async function applyRemoteServerSettings(settings: RemoteServerSettings): Promise<void> {
	if (!settings.enabled) {
		await call('stop_remote_server');
		remoteServerStore.setStopped();
		return;
	}
	try {
		await call('start_remote_server', { port: settings.port });
	} catch (err) {
		remoteServerStore.setError(err instanceof Error ? err.message : String(err));
		throw err;
	}
	remoteServerStore.setRunning(settings.port);
}
