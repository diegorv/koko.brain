/**
 * Pure helpers backing `LanSyncSettings.svelte`. Kept framework-free so they
 * can be exercised by vitest without spinning up a Svelte renderer.
 */

/**
 * Formats a "trusted at" epoch-ms timestamp as a short relative phrase like
 * "Trusted just now" / "Trusted 5 min ago" / "Trusted 3 days ago" / a locale
 * date string for older entries.
 *
 * @param trustedAtMs - Unix epoch milliseconds when the peer was paired.
 * @param nowMs - Current time (epoch ms). Injected so tests stay deterministic.
 */
export function formatTrustedAt(trustedAtMs: number, nowMs: number): string {
	const diffMs = Math.max(0, nowMs - trustedAtMs);
	const diffMin = Math.floor(diffMs / 60_000);
	const diffHours = Math.floor(diffMs / 3_600_000);
	const diffDays = Math.floor(diffMs / 86_400_000);

	if (diffMin < 1) return 'Trusted just now';
	if (diffMin < 60) return `Trusted ${diffMin} min ago`;
	if (diffHours < 24) return `Trusted ${diffHours}h ago`;
	if (diffDays === 1) return 'Trusted 1 day ago';
	if (diffDays < 30) return `Trusted ${diffDays} days ago`;

	const date = new Date(trustedAtMs);
	return `Trusted ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
}
