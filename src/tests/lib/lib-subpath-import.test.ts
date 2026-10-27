import { describe, expect, test } from 'vitest';

import { fuzzyMatch } from '#lib/utils/fuzzy-match.js';
import { backlinksStore } from '#lib/features/backlinks/backlinks.store.svelte.js';
import { Separator } from '#lib/components/ui/separator/index.js';
import SeparatorComponent from '#lib/components/ui/separator/separator.svelte';
import { fuzzyMatch as fuzzyMatchViaDollarLib } from '$lib/utils/fuzzy-match';
import { backlinksStore as backlinksStoreViaDollarLib } from '$lib/features/backlinks/backlinks.store.svelte';

/**
 * Pins the `#lib/*` subpath import (package.json `imports`) for every
 * specifier kind the $lib -> #lib migration rewrites, using the `.js`
 * spelling `sv migrate` emits. `pnpm check` type-checks this file too.
 */
describe('#lib subpath import', () => {
	test('resolves a plain .ts module via .js', () => {
		expect(fuzzyMatch('ab', 'ab').match).toBe(true);
	});

	test('resolves a .svelte.ts store via .svelte.js', () => {
		expect(backlinksStore.unlinkedDirty).toBe(false);
		expect(backlinksStore.linkedMentions).toEqual([]);
	});

	test('resolves a directory barrel via /index.js and a .svelte component', () => {
		expect(Separator).toBe(SeparatorComponent);
	});

	test('#lib and $lib resolve to the same module instance', () => {
		expect(fuzzyMatch).toBe(fuzzyMatchViaDollarLib);
	});

	test('a .svelte.ts store shares state across #lib, $lib and dynamic import()', async () => {
		expect(backlinksStore).toBe(backlinksStoreViaDollarLib);
		const dynamic = await import('#lib/features/backlinks/backlinks.store.svelte.js');
		expect(dynamic.backlinksStore).toBe(backlinksStore);
		backlinksStore.markUnlinkedDirty();
		expect(backlinksStoreViaDollarLib.unlinkedDirty).toBe(true);
		backlinksStore.reset();
		expect(backlinksStoreViaDollarLib.unlinkedDirty).toBe(false);
	});
});
