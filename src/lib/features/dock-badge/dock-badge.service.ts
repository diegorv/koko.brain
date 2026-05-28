import { getCurrentWindow } from '@tauri-apps/api/window';
import { error } from '$lib/utils/debug';

/**
 * Applies a value to the macOS dock badge (the red count bubble on the
 * app icon).
 *
 * A positive count shows the badge; `null`, `0`, or a negative value
 * clears it. The dock badge is purely cosmetic, so a failure is logged
 * and swallowed rather than propagated to the reactive caller.
 *
 * @param value The badge number to show, or null/0 to clear.
 */
export async function applyDockBadge(value: number | null): Promise<void> {
	try {
		const count = value && value > 0 ? value : undefined;
		await getCurrentWindow().setBadgeCount(count);
	} catch (err) {
		error('DOCK-BADGE', 'Failed to set dock badge count:', err);
	}
}
