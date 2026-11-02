/** Options for `debounce`. */
export interface DebounceOptions {
	/**
	 * Longest time (ms) a call may wait from the first call of a burst. When
	 * calls keep arriving closer together than `delay`, the function still
	 * runs once this much time has passed. Unset: no limit.
	 */
	maxWait?: number;
}

/** Creates a debounced version of a function that delays execution until after the given delay in ms. */
export function debounce<T extends (...args: any[]) => void>(
	fn: T,
	delay: number,
	options: DebounceOptions = {},
): ((...args: Parameters<T>) => void) & { cancel: () => void; flush: () => void } {
	let timer: ReturnType<typeof setTimeout> | undefined;
	let maxTimer: ReturnType<typeof setTimeout> | undefined;
	let lastArgs: Parameters<T> | undefined;

	const clearTimers = () => {
		if (timer !== undefined) clearTimeout(timer);
		if (maxTimer !== undefined) clearTimeout(maxTimer);
		timer = undefined;
		maxTimer = undefined;
	};

	const fire = () => {
		clearTimers();
		const args = lastArgs;
		lastArgs = undefined;
		if (args) fn(...args);
	};

	const debounced = (...args: Parameters<T>) => {
		lastArgs = args;
		if (timer !== undefined) clearTimeout(timer);
		timer = setTimeout(fire, delay);
		if (options.maxWait !== undefined && maxTimer === undefined) {
			maxTimer = setTimeout(fire, options.maxWait);
		}
	};

	debounced.cancel = () => {
		clearTimers();
		lastArgs = undefined;
	};

	/** Immediately executes the pending call (if any) and clears the timer */
	debounced.flush = () => {
		if (timer !== undefined) fire();
	};

	return debounced;
}
