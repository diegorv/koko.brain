import { untrack } from 'svelte';

import { debug } from '#lib/utils/debug.js';

import { errorText } from './mods.logic';

/**
 * Watches a tracked read, comparing with its untracked subscription baseline.
 * The handler and logging are untracked. A failed read retains the last good
 * value; without one, the first successful read establishes the baseline.
 */
export function watchModValue<T>(tag: string, read: () => T, onChange: (value: T) => void): () => void {
	let value: T;
	let hasValue = false;
	try {
		value = untrack(read);
		hasValue = true;
	} catch (err) {
		untrack(() => debug(tag, 'watch read failed:', errorText(err)));
	}
	return $effect.root(() => {
		$effect(() => {
			let next: T;
			try {
				next = read();
			} catch (err) {
				untrack(() => debug(tag, 'watch read failed:', errorText(err)));
				return;
			}
			const changed = hasValue && !Object.is(next, value);
			value = next;
			hasValue = true;
			if (!changed) return;
			try {
				untrack(() => onChange(next));
			} catch (err) {
				untrack(() => debug(tag, 'watch callback failed:', errorText(err)));
			}
		});
	});
}
