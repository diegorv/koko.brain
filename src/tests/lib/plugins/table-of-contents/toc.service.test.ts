import { describe, it, expect, beforeEach } from 'vitest';
import { tocStore } from '$lib/plugins/table-of-contents/toc.store.svelte';
import { rebuildToc } from '$lib/plugins/table-of-contents/toc.service';

describe('rebuildToc', () => {
	beforeEach(() => {
		tocStore.reset();
	});

	it('clears the store on null input', () => {
		tocStore.setHeadings([{ level: 1, text: 'x', line: 0, pos: 0 }]);
		rebuildToc(null);
		expect(tocStore.headings).toEqual([]);
	});

	it('clears the store on empty string', () => {
		tocStore.setHeadings([{ level: 1, text: 'x', line: 0, pos: 0 }]);
		rebuildToc('');
		expect(tocStore.headings).toEqual([]);
	});

	it('populates the store with parsed headings', () => {
		rebuildToc('# A\n## B');
		expect(tocStore.headings.map((h) => ({ level: h.level, text: h.text }))).toEqual([
			{ level: 1, text: 'A' },
			{ level: 2, text: 'B' },
		]);
	});
});
