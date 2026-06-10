import type { SidebarMode } from '$lib/core/settings/settings.types';

/** Cycle order for the left-sidebar views. */
const SIDEBAR_MODE_CYCLE: SidebarMode[] = ['files', 'types', 'calendar'];

/**
 * Returns the next sidebar mode in the files -> types -> calendar cycle.
 * Unknown modes fall back to 'files' (indexOf -1 + 1 = 0).
 */
export function nextSidebarMode(mode: SidebarMode): SidebarMode {
	const index = SIDEBAR_MODE_CYCLE.indexOf(mode);
	return SIDEBAR_MODE_CYCLE[(index + 1) % SIDEBAR_MODE_CYCLE.length];
}
