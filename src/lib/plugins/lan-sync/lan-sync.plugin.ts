import type { Component } from 'svelte';

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
	component: Component;
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
	/** Initialize event listeners + fetch identity. Idempotent. No-op at Stage 0. */
	init(): Promise<void>;
	/** Settings tab descriptor, or null until the panel ships (Stage 3F-3). */
	getSettingsTab(): LanSyncSettingsTab | null;
	/**
	 * Context-menu entry for a file-explorer path, or null when not applicable
	 * (no trusted peers yet, path is a file rather than folder, etc.). Null
	 * until the push dialog ships (Stage 3F-3).
	 */
	getContextMenuEntry(path: string, isFolder: boolean): LanSyncMenuEntry | null;
}

/**
 * Factory for the LAN sync plugin singleton. Called once at app init time by
 * the host. Stage 0 returns a no-op plugin; subsequent stages flesh out each
 * method behind this stable shape.
 */
export function createLanSyncPlugin(): LanSyncPlugin {
	return {
		id: 'lan-sync',
		async init() {
			// Stage 0: no listeners yet.
		},
		getSettingsTab() {
			return null;
		},
		getContextMenuEntry() {
			return null;
		},
	};
}
