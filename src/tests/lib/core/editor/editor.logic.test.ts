import { describe, it, expect } from 'vitest';
import { getFileName, findTabIndex, isTabDirty, isTabPinned, getPinnedBoundary, reorderTabsAfterPinChange, isVirtualTab, TASKS_VIRTUAL_PATH, GRAPH_VIRTUAL_PATH, getPositionAfterFrontmatter } from '$lib/core/editor/editor.logic';
import type { EditorTab } from '$lib/core/editor/editor.types';

describe('getFileName', () => {
	it('extracts the filename from a full path', () => {
		expect(getFileName('/Users/john/notes/hello.md')).toBe('hello.md');
	});

	it('handles paths with multiple segments', () => {
		expect(getFileName('/a/b/c/d/file.txt')).toBe('file.txt');
	});

	it('returns the string itself if no separator', () => {
		expect(getFileName('file.md')).toBe('file.md');
	});

	it('handles trailing slash by returning empty string', () => {
		expect(getFileName('/path/to/dir/')).toBe('');
	});

	it('handles single slash', () => {
		expect(getFileName('/')).toBe('');
	});
});

describe('findTabIndex', () => {
	const tabs = [
		{ path: '/notes/a.md' },
		{ path: '/notes/b.md' },
		{ path: '/notes/c.md' },
	];

	it('finds the index of an existing tab', () => {
		expect(findTabIndex(tabs, '/notes/b.md')).toBe(1);
	});

	it('returns -1 for a non-existing tab', () => {
		expect(findTabIndex(tabs, '/notes/d.md')).toBe(-1);
	});

	it('handles an empty tabs array', () => {
		expect(findTabIndex([], '/notes/a.md')).toBe(-1);
	});

	it('matches exact paths', () => {
		expect(findTabIndex(tabs, '/notes/a.md ')).toBe(-1);
	});
});

describe('isTabDirty', () => {
	it('returns false when content matches savedContent', () => {
		expect(isTabDirty({ content: 'hello', savedContent: 'hello' })).toBe(false);
	});

	it('returns true when content differs from savedContent', () => {
		expect(isTabDirty({ content: 'hello world', savedContent: 'hello' })).toBe(true);
	});

	it('returns false for empty content that matches', () => {
		expect(isTabDirty({ content: '', savedContent: '' })).toBe(false);
	});

	it('returns true for empty content vs non-empty savedContent', () => {
		expect(isTabDirty({ content: '', savedContent: 'text' })).toBe(true);
	});
});

describe('isTabPinned', () => {
	it('returns false when pinned is undefined', () => {
		expect(isTabPinned({})).toBe(false);
	});

	it('returns false when pinned is false', () => {
		expect(isTabPinned({ pinned: false })).toBe(false);
	});

	it('returns true when pinned is true', () => {
		expect(isTabPinned({ pinned: true })).toBe(true);
	});
});

describe('getPinnedBoundary', () => {
	it('returns 0 for no pinned tabs', () => {
		expect(getPinnedBoundary([{}, {}, {}])).toBe(0);
	});

	it('returns count of pinned tabs at the start', () => {
		expect(getPinnedBoundary([{ pinned: true }, { pinned: true }, {}])).toBe(2);
	});

	it('returns 0 for empty array', () => {
		expect(getPinnedBoundary([])).toBe(0);
	});

	it('returns length when all tabs are pinned', () => {
		expect(getPinnedBoundary([{ pinned: true }, { pinned: true }])).toBe(2);
	});
});

describe('TASKS_VIRTUAL_PATH', () => {
	it('is a string starting with __virtual__/', () => {
		expect(TASKS_VIRTUAL_PATH).toBe('__virtual__/tasks');
	});
});

describe('GRAPH_VIRTUAL_PATH', () => {
	it('is a string starting with __virtual__/', () => {
		expect(GRAPH_VIRTUAL_PATH).toBe('__virtual__/graph');
	});
});

describe('isVirtualTab', () => {
	it('returns true for virtual paths', () => {
		expect(isVirtualTab({ path: '__virtual__/tasks' })).toBe(true);
		expect(isVirtualTab({ path: '__virtual__/graph' })).toBe(true);
		expect(isVirtualTab({ path: '__virtual__/settings' })).toBe(true);
	});

	it('returns false for real file paths', () => {
		expect(isVirtualTab({ path: '/Users/john/notes/note.md' })).toBe(false);
		expect(isVirtualTab({ path: '/vault/file.md' })).toBe(false);
	});

	it('returns false for paths that contain but do not start with __virtual__/', () => {
		expect(isVirtualTab({ path: '/some/__virtual__/path' })).toBe(false);
	});
});

describe('reorderTabsAfterPinChange', () => {
	function makeTab(name: string, pinned?: boolean): EditorTab {
		return { path: `/vault/${name}.md`, name: `${name}.md`, content: '', savedContent: '', pinned };
	}

	it('pins an unpinned tab and moves it to the pinned group', () => {
		const tabs = [makeTab('a', true), makeTab('b'), makeTab('c')];
		const result = reorderTabsAfterPinChange(tabs, 2, 2, true);

		expect(result.tabs[0].name).toBe('a.md');
		expect(result.tabs[1].name).toBe('c.md');
		expect(result.tabs[1].pinned).toBe(true);
		expect(result.tabs[2].name).toBe('b.md');
		expect(result.activeIndex).toBe(1); // follows the pinned tab
	});

	it('unpins a pinned tab and moves it to the unpinned group', () => {
		const tabs = [makeTab('a', true), makeTab('b', true), makeTab('c')];
		const result = reorderTabsAfterPinChange(tabs, 0, 0, false);

		expect(result.tabs[0].name).toBe('b.md');
		expect(result.tabs[0].pinned).toBe(true);
		expect(result.tabs[1].name).toBe('a.md');
		expect(result.tabs[1].pinned).toBe(false);
		expect(result.tabs[2].name).toBe('c.md');
		expect(result.activeIndex).toBe(1); // follows the unpinned tab
	});

	it('preserves active index when pinning a different tab', () => {
		const tabs = [makeTab('a'), makeTab('b'), makeTab('c')];
		const result = reorderTabsAfterPinChange(tabs, 1, 2, true);

		expect(result.tabs[0].name).toBe('b.md');
		expect(result.tabs[0].pinned).toBe(true);
		// c was at index 2, now at index 2 still (b moved from 1 to 0, a from 0 to 1, c stays at 2)
		expect(result.activeIndex).toBe(2);
	});

	it('handles pinning when no tabs are pinned yet', () => {
		const tabs = [makeTab('a'), makeTab('b')];
		const result = reorderTabsAfterPinChange(tabs, 1, 0, true);

		expect(result.tabs[0].name).toBe('b.md');
		expect(result.tabs[0].pinned).toBe(true);
		expect(result.tabs[1].name).toBe('a.md');
		expect(result.activeIndex).toBe(1); // a moved from 0 to 1
	});

	it('returns unchanged data for invalid index', () => {
		const tabs = [makeTab('a')];
		const result = reorderTabsAfterPinChange(tabs, 5, 0, true);

		expect(result.tabs).toBe(tabs);
		expect(result.activeIndex).toBe(0);
	});
});

describe('getPositionAfterFrontmatter', () => {
	it('returns position after closing --- for valid frontmatter', () => {
		const content = '---\ntitle: Hello\n---\n# Heading';
		// Position should be right after the closing "---\n"
		expect(getPositionAfterFrontmatter(content)).toBe(21);
	});

	it('returns 0 when content does not start with ---', () => {
		expect(getPositionAfterFrontmatter('# No frontmatter')).toBe(0);
	});

	it('returns 0 for empty string', () => {
		expect(getPositionAfterFrontmatter('')).toBe(0);
	});

	it('returns 0 when first line is --- but no closing ---', () => {
		expect(getPositionAfterFrontmatter('---\ntitle: Hello\nno closing')).toBe(0);
	});

	it('returns 0 for content with only one line', () => {
		expect(getPositionAfterFrontmatter('---')).toBe(0);
	});

	it('handles frontmatter with trailing whitespace on delimiters', () => {
		const content = '---  \nkey: val\n---  \nbody';
		// "---  \n" = 6, "key: val\n" = 9, "---  \n" = 6 → pos 21
		expect(getPositionAfterFrontmatter(content)).toBe(21);
	});

	it('handles empty frontmatter (--- immediately followed by ---)', () => {
		const content = '---\n---\nbody';
		// "---\n" = 4, "---\n" = 4 → pos 8
		expect(getPositionAfterFrontmatter(content)).toBe(8);
	});

	it('clamps to content length when frontmatter ends at EOF', () => {
		const content = '---\n---';
		// "---\n" = 4, "---" = 3, pos would be 4+4=8 but content.length is 7
		expect(getPositionAfterFrontmatter(content)).toBe(7);
	});

	it('handles multi-line frontmatter with various keys', () => {
		const content = '---\ntitle: Note\ntags:\n  - a\n  - b\ndate: 2024-01-01\n---\nContent here';
		const closingIdx = content.indexOf('---\nContent');
		const expected = closingIdx + 4; // position after "---\n"
		expect(getPositionAfterFrontmatter(content)).toBe(expected);
	});
});
