import type { Component } from 'svelte';
import {
	createLanSyncService,
	type LanSyncService,
	type LanSyncTransport,
} from './lan-sync.service';
import LanSyncSettings from './LanSyncSettings.svelte';
import {
	pushFolderRequest,
	type LanSyncPushFolderRequest,
	type LanSyncPushFolderRequestSignal,
} from './lan-sync.plugin.state.svelte';

export type { LanSyncPushFolderRequest, LanSyncPushFolderRequestSignal };

/** Props the LAN sync settings panel expects when the host renders it. */
export interface LanSyncSettingsProps {
	vaultPath: string;
	service: LanSyncService;
}

/**
 * Context-menu entry the LAN sync plugin contributes to the file explorer.
 * Returned by `LanSyncPlugin.getContextMenuEntry`; host appends it when non-null.
 */
export interface LanSyncMenuEntry {
	/** Label rendered in the context menu. */
	label: string;
	/** Optional icon name; host decides how to resolve it. */
	icon?: string;
	/** Click handler. May be async. */
	onSelect: () => void | Promise<void>;
}

/**
 * Settings tab descriptor the LAN sync plugin contributes to the Settings dialog.
 * Returned by `LanSyncPlugin.getSettingsTab`; host renders it when non-null.
 */
export interface LanSyncSettingsTab {
	id: 'lan-sync';
	label: string;
	component: Component<LanSyncSettingsProps>;
}

/**
 * Single integration seam between the LAN sync plugin and the rest of the app.
 *
 * Host code (SettingsDialog, file-explorer context menu, app init) imports
 * `createLanSyncPlugin()` and queries it for what to register. Plugin internals
 * stay private to `src/lib/plugins/lan-sync/`.
 */
export interface LanSyncPlugin {
	readonly id: 'lan-sync';
	/**
	 * Wire event listeners + fetch identity for the freshly-opened vault.
	 * Idempotent: re-invoking tears down old listeners + rewires fresh ones.
	 */
	init(vaultPath: string): Promise<void>;
	/** Tear down all listeners and reset the store. Safe to call before `init`. */
	shutdown(): Promise<void>;
	/** Settings tab descriptor (component receives `{ vaultPath, service }` props). */
	getSettingsTab(): LanSyncSettingsTab | null;
	/**
	 * Context-menu entry for a file-explorer path, or null when not applicable
	 * (entry is only returned for folders today; files always return null).
	 * `path` is treated verbatim as the `sourceRelPath` of the push request, so
	 * the host MUST pass a vault-relative path.
	 */
	getContextMenuEntry(path: string, isFolder: boolean): LanSyncMenuEntry | null;
	/** Service instance owned by this plugin; passed into the UI components. */
	readonly service: LanSyncService;
	/** Reactive signal driven by the context-menu `onSelect` handler. */
	readonly pushFolderRequest: LanSyncPushFolderRequestSignal;
}

/**
 * Factory for the LAN sync plugin singleton. Called once at app init time by
 * the host. The optional `transport` is forwarded to `createLanSyncService`
 * so tests can inject a fake without spinning up a Tauri runtime.
 */
export function createLanSyncPlugin(opts?: { transport?: LanSyncTransport }): LanSyncPlugin {
	const service = createLanSyncService(opts?.transport);
	/**
	 * Last vault path the plugin was init-ed against. Captured so
	 * `shutdown()` can also turn off the announcer + TCP accept loop,
	 * which otherwise leak across a vault close (audit #5).
	 */
	let lastVaultPath: string | null = null;

	return {
		id: 'lan-sync',
		async init(vaultPath: string) {
			lastVaultPath = vaultPath;
			await service.init(vaultPath);
			// Always-on browse: observing peers does not require us to be
			// discoverable ourselves. Failures are non-fatal — the
			// service's try/catch already logged the underlying error.
			try {
				await service.startBrowse(vaultPath);
			} catch {
				// Already logged via appendLog inside the service wrapper.
			}
		},
		async shutdown() {
			// Turn off the announcer + TCP accept loop bound to the
			// previous vault. Without this, closing or switching vaults
			// leaves the previous identity broadcasting on mDNS and the
			// previous TCP accept loop listening for connections.
			if (lastVaultPath !== null) {
				try {
					await service.setDiscoverable(lastVaultPath, false);
				} catch {
					// Already logged via appendLog inside the service wrapper.
				}
			}
			try {
				await service.stopBrowse();
			} catch {
				// Already logged via appendLog inside the service wrapper.
			}
			await service.shutdown();
			lastVaultPath = null;
		},
		getSettingsTab() {
			return { id: 'lan-sync', label: 'LAN sync', component: LanSyncSettings };
		},
		getContextMenuEntry(path: string, isFolder: boolean) {
			if (!isFolder) return null;
			return {
				label: 'Send to peer...',
				icon: 'send',
				onSelect() {
					pushFolderRequest.set({ sourceRelPath: path });
				},
			};
		},
		service,
		pushFolderRequest,
	};
}

/**
 * Module-level singleton consumed by every host integration point (settings
 * dialog, file-explorer context menu, app shell). The factory is still
 * exported so tests can build isolated instances with a fake transport.
 */
export const lanSyncPlugin: LanSyncPlugin = createLanSyncPlugin();
