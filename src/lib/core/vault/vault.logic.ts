/** Entry in the "recent vaults" list persisted to localStorage */
export interface RecentVault {
	/** Absolute directory path */
	path: string;
	/** Display name (last segment of path) */
	name: string;
	/** Timestamp (ms) of the last time this vault was opened */
	openedAt: number;
}

const MAX_RECENT_VAULTS = 10;

/** Extracts the vault name from its path (e.g. "/Users/me/notes" → "notes") */
export function extractVaultName(path: string): string {
	return path.split('/').pop() ?? path;
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
