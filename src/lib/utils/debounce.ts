/** Creates a debounced version of a function that delays execution until after the given delay in ms. */
export function debounce<T extends (...args: any[]) => void>(
	fn: T,
	delay: number
): ((...args: Parameters<T>) => void) & { cancel: () => void; flush: () => void } {
	let timer: ReturnType<typeof setTimeout> | undefined;
	let lastArgs: Parameters<T> | undefined;

	const debounced = (...args: Parameters<T>) => {
		lastArgs = args;
		if (timer !== undefined) clearTimeout(timer);
		timer = setTimeout(() => {
			timer = undefined;
			lastArgs = undefined;
			fn(...args);
		}, delay);
	};

	debounced.cancel = () => {
		if (timer !== undefined) {
			clearTimeout(timer);
			timer = undefined;
		}
		lastArgs = undefined;
	};

	/** Immediately executes the pending call (if any) and clears the timer */
	debounced.flush = () => {
		if (timer !== undefined) {
			clearTimeout(timer);
			timer = undefined;
			const args = lastArgs;
			lastArgs = undefined;
			if (args) fn(...args);
		}
	};

	return debounced;
}
