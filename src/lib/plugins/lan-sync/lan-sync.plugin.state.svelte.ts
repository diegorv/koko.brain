/**
 * Module-scope reactive state for the LAN sync plugin's host integration.
 *
 * Held in a `.svelte.ts` companion module so `$state` is callable; the
 * `lan-sync.plugin.ts` factory consumes the `pushFolderRequest` signal from
 * here and re-exports it via `LanSyncPlugin.pushFolderRequest`.
 */

/**
 * Pending push request emitted by the file-explorer context menu. The host
 * watches `pushFolderRequest` and opens `<PushFolderDialog>` when it flips to
 * a non-null value.
 */
export interface LanSyncPushFolderRequest {
	/** Vault-relative folder path the user selected for push. */
	sourceRelPath: string;
}

/**
 * Writable signal wrapper exposed to the host so the always-mounted dialog
 * can read the pending request reactively and clear it on close.
 */
export interface LanSyncPushFolderRequestSignal {
	/** Current pending request, or null when no push has been requested. */
	get(): LanSyncPushFolderRequest | null;
	/** Replace the pending request. Pass `null` to clear after the dialog closes. */
	set(value: LanSyncPushFolderRequest | null): void;
}

/** Backing rune for the writable wrapper. */
let pushFolderRequested = $state<LanSyncPushFolderRequest | null>(null);

/**
 * Writable wrapper around the rune. Consumers (plugin factory, components,
 * tests) go through this stable API instead of touching the rune directly.
 */
export const pushFolderRequest: LanSyncPushFolderRequestSignal = {
	get() {
		return pushFolderRequested;
	},
	set(value) {
		pushFolderRequested = value;
	},
};
