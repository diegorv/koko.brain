/**
 * Wraps `initial` in a `$state` proxy, so a test can pass it to `mount` as
 * props and change a prop after mount by assigning to it (then `flushSync()`).
 */
export function reactiveProps<T extends object>(initial: T): T {
	const props = $state(initial);
	return props;
}
