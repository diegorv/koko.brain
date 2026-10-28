/**
 * Time-zone switching for vitest (node env).
 *
 * Node re-reads `process.env.TZ` on every assignment, so a test can run a
 * block under another zone (for example a DST-transition day in
 * `America/New_York`) and switch back afterwards. Guard such blocks with
 * `describe.runIf(runtimeTimeZoneSwitchWorks())` so they skip cleanly on a
 * runtime that ignores the switch.
 */

/**
 * Runs `fn` with `process.env.TZ` set to `tz`, then restores the previous
 * value (or removes the variable when it was unset), even when `fn` throws.
 * @param tz - IANA zone name, e.g. `'America/New_York'`
 * @param fn - code to run under that zone
 * @returns whatever `fn` returns
 */
export function withTimeZone<T>(tz: string, fn: () => T): T {
	const previous = process.env.TZ;
	process.env.TZ = tz;
	try {
		return fn();
	} finally {
		if (previous === undefined) {
			delete process.env.TZ;
		} else {
			process.env.TZ = previous;
		}
	}
}

/**
 * Probes whether assigning `process.env.TZ` at runtime changes `Date`'s
 * local offset (pre-flight check Task 1 (f) of the event-calendar plan).
 * `Asia/Tokyo` (UTC+9, no DST) and `America/New_York` give different
 * offsets for the same instant on any runtime that honors the switch.
 * @returns true when the switch takes effect
 */
export function runtimeTimeZoneSwitchWorks(): boolean {
	const probe = new Date(2026, 0, 15, 12);
	const tokyo = withTimeZone('Asia/Tokyo', () => new Date(probe.getTime()).getTimezoneOffset());
	const newYork = withTimeZone('America/New_York', () => new Date(probe.getTime()).getTimezoneOffset());
	return tokyo === -540 && newYork === 300;
}
