import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { appendLog } from '$lib/utils/log.service';

/**
 * Starts a profiling measurement for a live preview decoration plugin.
 * Returns 0 when profiling is disabled (zero overhead — no performance.now() call).
 *
 * When `label` is supplied AND profiling is on, also emits a `[LP-TRACE] enter: <label>`
 * line before timing starts. Pair with `profileEnd(label, ...)` to bracket the work
 * and locate which plugin was mid-flight if the JS thread freezes — `LP-PROFILE`
 * lines only emit AFTER work completes, so a stalled plugin leaves no trace
 * without `LP-TRACE`.
 */
export function profileStart(label?: string): number {
	if (!settingsStore.livePreviewProfiling) return 0;
	if (label) appendLog('LP-TRACE', `enter: ${label}`);
	return performance.now();
}

/**
 * Ends a profiling measurement and logs the result if it exceeds the threshold.
 * Skips entirely when profiling is disabled (start === 0). Also emits a
 * `[LP-TRACE] exit: <label>` line when profiling is on so the bracket pair
 * is symmetrical and a missing exit line localises a freeze to a plugin.
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
	appendLog('LP-TRACE', `exit: ${label}`);
}
