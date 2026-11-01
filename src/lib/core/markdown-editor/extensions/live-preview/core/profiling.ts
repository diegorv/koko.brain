/** What the editor needs from the app to profile and log: the toggle and the log writer. */
export interface ProfilingPort {
	/** Whether LP-PROFILE / LP-TRACE measurement is on. Read on every `profileStart`. */
	isEnabled: () => boolean;
	/** Writes one tagged line to the session log. */
	log: (tag: string, message: string) => void;
}

const DISABLED: ProfilingPort = { isEnabled: () => false, log: () => {} };

/** The configured port; profiling stays off and logs go nowhere until the app configures it. */
let port: ProfilingPort = DISABLED;

/**
 * Installs the app's profiling toggle and log writer. Module-level, not a
 * CodeMirror facet: a settings toggle must never reconfigure the editor,
 * because `checkUpdateAction` rebuilds every decoration on `reconfigured`.
 * Returns a function that restores the disabled default.
 */
export function configureProfiling(next: ProfilingPort): () => void {
	port = next;
	return () => {
		if (port === next) port = DISABLED;
	};
}

/** Writes one tagged line through the configured log port. */
export function editorLog(tag: string, message: string): void {
	port.log(tag, message);
}

/**
 * Reports an editor error the user cannot act on: the devtools console plus
 * the configured log port.
 */
export function reportError(tag: string, message: string, err: unknown): void {
	console.error(`[${tag}]`, message, err);
	port.log(tag, `${message} ${err instanceof Error ? err.message : String(err)}`);
}

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
	if (!port.isEnabled()) return 0;
	if (label) port.log('LP-TRACE', `enter: ${label}`);
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
		port.log('LP-PROFILE', `${label}: ${elapsed.toFixed(1)}ms`);
	}
	port.log('LP-TRACE', `exit: ${label}`);
}
