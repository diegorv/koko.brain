import { describe, it, expect, beforeEach } from 'vitest';
import { tocStore } from '#lib/plugins/table-of-contents/toc.store.svelte.js';
import { rebuildToc, showTableOfContents } from '#lib/plugins/table-of-contents/toc.service.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';

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

describe('showTableOfContents', () => {
	beforeEach(() => {
		settingsStore.reset();
		tocStore.setExpandedPath(null);
	});

	it('shows the right sidebar with the Table of contents section open on the note', () => {
		settingsStore.updateLayout({ rightSidebarVisible: false });

		showTableOfContents('/vault/a.md');

		expect(settingsStore.layout.rightSidebarVisible).toBe(true);
		expect(settingsStore.layout.tableOfContentsVisible).toBe(true);
		expect(tocStore.expandedPath).toBe('/vault/a.md');
	});

	it('turns the section back on when it was hidden in Settings', () => {
		settingsStore.updateLayout({ tableOfContentsVisible: false });

		showTableOfContents('/vault/a.md');

		expect(settingsStore.layout.tableOfContentsVisible).toBe(true);
	});

	it('leaves other right-sidebar sections as they are', () => {
		settingsStore.updateLayout({ backlinksVisible: false, propertiesVisible: true });

		showTableOfContents('/vault/a.md');

		expect(settingsStore.layout.backlinksVisible).toBe(false);
		expect(settingsStore.layout.propertiesVisible).toBe(true);
	});
});
