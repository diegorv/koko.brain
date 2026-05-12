/**
 * Pure helpers backing `PushFolderDialog.svelte`. Framework-free so they can
 * be unit-tested without spinning up a Svelte renderer.
 */

/** Binary-prefix unit labels for `formatBytes`. */
const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

/**
 * Formats a byte count using binary prefixes (KB = 1024). Returns a short
 * human-readable string like "0 B", "1023 B", "1.0 KB", "1.5 MB", "1.0 GB".
 *
 * @param bytes - Non-negative byte count. Negative or non-finite inputs are
 *   coerced to `0`.
 */
export function formatBytes(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
	if (bytes < 1024) return `${Math.floor(bytes)} B`;

	let value = bytes;
	let unitIdx = 0;
	while (value >= 1024 && unitIdx < UNITS.length - 1) {
		value /= 1024;
		unitIdx += 1;
	}
	// One decimal place; trim trailing ".0" for whole values.
	const rendered = value.toFixed(1);
	return `${rendered} ${UNITS[unitIdx]}`;
}

/**
 * Returns true iff the Push button should be enabled. The button is enabled
 * only when:
 *  - a peer is selected (non-empty fingerprint hex)
 *  - the target relative path is non-empty after trimming
 *  - no push is currently in progress
 *
 * @param peerFingerprintHex - Selected peer's fingerprint hex (may be empty).
 * @param targetRelPath - User-entered target subpath (may have whitespace).
 * @param isPushInProgress - True when `lanSyncStore.isPushInProgress` is true.
 */
export function canSubmitPush(
	peerFingerprintHex: string,
	targetRelPath: string,
	isPushInProgress: boolean,
): boolean {
	if (isPushInProgress) return false;
	if (peerFingerprintHex.length === 0) return false;
	if (targetRelPath.trim().length === 0) return false;
	return true;
}
