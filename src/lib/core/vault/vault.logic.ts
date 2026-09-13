import { basename } from '$lib/utils/path';

/** Entry in the "recent vaults" list persisted to localStorage */
export interface RecentVault {
	/** Absolute directory path */
	path: string;
	/** Display name (last segment of path) */
	name: string;
	/** Timestamp (ms) of the last time this vault was opened */
	openedAt: number;
}

const MAX_RECENT_VAULTS = 3;

/** Extracts the vault name from its path (e.g. "/Users/me/notes" → "notes") */
export function extractVaultName(path: string): string {
	return basename(path);
}

/**
 * Adds or bumps a vault to the top of the recent list, capping at MAX_RECENT_VAULTS.
 * If the vault already exists in the list, it is moved to the front with an updated timestamp.
 */
export function updateRecentVaults(
	current: RecentVault[],
	path: string,
	name: string,
	now: number = Date.now()
): RecentVault[] {
	const filtered = current.filter((v) => v.path !== path);
	return [{ path, name, openedAt: now }, ...filtered].slice(0, MAX_RECENT_VAULTS);
}

/** Folder under the documents directory that holds every vault the app creates. */
export const VAULTS_FOLDER = 'kokobrain-vaults';

/** Name of the single on-device vault the mobile build opens automatically. */
export const MOBILE_VAULT_NAME = 'Notes';

/**
 * Absolute path of the on-device vault for the mobile build:
 * `<documents>/kokobrain-vaults/Notes`. On iOS the documents directory is the
 * app container's `Documents/`, which the Files app exposes when the bundle
 * declares `UIFileSharingEnabled`. The `kokobrain-vaults` segment keeps the
 * path inside the `$DOCUMENT/kokobrain-vaults/**` filesystem scope shared
 * with desktop. A trailing separator on `documentDir` is tolerated.
 */
export function mobileVaultPath(documentDir: string): string {
	const base = documentDir.replace(/[\\/]+$/, '');
	return `${base}/${VAULTS_FOLDER}/${MOBILE_VAULT_NAME}`;
}
