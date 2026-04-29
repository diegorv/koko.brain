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

/**
 * Wraps a CodeMirror `WidgetType.toDOM()` body so its entry / exit / duration
 * are visible in the log when `livePreviewProfiling` is on. Audit follow-up
 * for the 2026-04-29 freeze investigation: plugin-level `update()` traces
 * already exist via `profileStart` / `profileEnd`, but widget `toDOM()`
 * fires OUTSIDE the plugin's update window (called by CodeMirror when a
 * widget enters the viewport). A widget that hangs in `toDOM()` would
 * therefore leave no trace in `LP-TRACE` — `LP-WIDGET-TRACE` plugs that
 * gap. The label is the widget's own name (e.g. `frontmatter`,
 * `meta-bind-select`, `wikilink-note-embed`).
 *
 * Behaviour matches `profileStart` / `profileEnd`: a single zero-overhead
 * fast-path when profiling is off (no `performance.now()` call); when on,
 * always emits `enter:` and `exit:` lines, plus a `LP-WIDGET-PROFILE` line
 * when elapsed exceeds `threshold` ms (default 0.5 ms — same as plugins).
 *
 * Usage inside a `WidgetType` subclass:
 *
 * ```ts
 * toDOM(view: EditorView): HTMLElement {
 *   return profileWidget('frontmatter', () => {
 *     // ... existing toDOM logic
 *     return node;
 *   });
 * }
 * ```
 *
 * The helper guarantees the `exit:` line via try/finally so a thrown error
 * inside `fn` still flushes the trace before propagating.
 */
export function profileWidget<T>(label: string, fn: () => T): T {
	if (!settingsStore.livePreviewProfiling) return fn();
	appendLog('LP-WIDGET-TRACE', `enter: ${label}`);
	const start = performance.now();
	try {
		return fn();
	} finally {
		const elapsed = performance.now() - start;
		if (elapsed > 0.5) {
			appendLog('LP-WIDGET-PROFILE', `${label}: ${elapsed.toFixed(1)}ms`);
		}
		appendLog('LP-WIDGET-TRACE', `exit: ${label}`);
	}
}
