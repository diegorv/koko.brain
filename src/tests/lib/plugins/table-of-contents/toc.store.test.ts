import { describe, it, expect, beforeEach } from 'vitest';
import { tocStore } from '$lib/plugins/table-of-contents/toc.store.svelte';
import type { TocHeading } from '$lib/plugins/table-of-contents/toc.types';

const sample: TocHeading[] = [
	{ level: 1, text: 'Intro', line: 0, pos: 0 },
	{ level: 2, text: 'Details', line: 5, pos: 42 },
];

describe('tocStore', () => {
	beforeEach(() => {
		tocStore.reset();
	});

	it('starts with empty headings', () => {
		expect(tocStore.headings).toEqual([]);
	});

	it('setHeadings stores the array by reference', () => {
		tocStore.setHeadings(sample);
		expect(tocStore.headings).toBe(sample);
	});

	it('reset clears headings back to empty', () => {
		tocStore.setHeadings(sample);
		expect(tocStore.headings.length).toBe(2);

		tocStore.reset();
		expect(tocStore.headings).toEqual([]);
	});
});
