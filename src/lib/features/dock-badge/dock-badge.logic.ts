import type { NoteEntryV2 } from '$lib/types/vault-v2.types';
import { getInboxCount } from '$lib/features/type-definitions/inbox-workflow.logic';

/**
 * Computes the value to display on the macOS dock badge.
 *
 * Returns the lifecycle inbox count (same notion the type sidebar counts)
 * when the feature is enabled, or `null` when disabled. A `null` or `0`
 * result is the caller's signal to clear the badge.
 *
 * @param enabled Whether the dock-badge feature is turned on in settings.
 * @param entries The current vault entries snapshot.
 */
export function dockBadgeCount(enabled: boolean, entries: NoteEntryV2[]): number | null {
	if (!enabled) return null;
	return getInboxCount(entries);
}
