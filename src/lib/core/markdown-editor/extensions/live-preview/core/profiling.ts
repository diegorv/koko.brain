import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { appendLog } from '$lib/utils/log.service';

/**
 * Starts a profiling measurement for a live preview decoration plugin.
 * Returns 0 when profiling is disabled (zero overhead — no performance.now() call).
 */
export function profileStart(): number {
	if (!settingsStore.livePreviewProfiling) return 0;
	return performance.now();
}

/**
 * Ends a profiling measurement and logs the result if it exceeds the threshold.
 * Skips entirely when profiling is disabled (start === 0).
 * @param label Plugin name for the log entry
 * @param start Value returned by profileStart()
 * @param threshold Minimum ms to log (default: 0.5)
 */
export function profileEnd(label: string, start: number, threshold: number = 0.5): void {
	if (start === 0) return;
	const elapsed = performance.now() - start;
	if (elapsed > threshold) {
		appendLog('LP-PROFILE', `${label}: ${elapsed.toFixed(1)}ms`);
	}
}
