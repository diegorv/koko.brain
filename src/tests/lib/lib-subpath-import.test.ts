import { describe, expect, test } from 'vitest';

import { fuzzyMatch } from '#lib/utils/fuzzy-match.js';
import { backlinksStore } from '#lib/features/backlinks/backlinks.store.svelte.js';
import { Separator } from '#lib/components/ui/separator/index.js';
import SeparatorComponent from '#lib/components/ui/separator/separator.svelte';

/**
 * Pins the `#lib/*` subpath import (package.json `imports`) for every
 * specifier kind src uses, with the `.js` spelling `sv migrate` emits. `pnpm check` type-checks this file too.
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

	test('a .svelte.ts store shares state across static and dynamic #lib import()', async () => {
		const dynamic = await import('#lib/features/backlinks/backlinks.store.svelte.js');
		expect(dynamic.backlinksStore).toBe(backlinksStore);
		backlinksStore.markUnlinkedDirty();
		expect(dynamic.backlinksStore.unlinkedDirty).toBe(true);
		backlinksStore.reset();
		expect(dynamic.backlinksStore.unlinkedDirty).toBe(false);
	});
});
