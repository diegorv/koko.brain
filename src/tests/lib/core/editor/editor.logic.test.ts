import { describe, it, expect } from 'vitest';
import { getFileName, findTabIndex, isTabDirty, isTabPinned, getPinnedBoundary, reorderTabsAfterPinChange, clampTabInsertion, moveTab, tabTooltipText, isVirtualTab, isMarkdownNoteTab, TASKS_VIRTUAL_PATH, GRAPH_VIRTUAL_PATH, EVENT_CALENDAR_VIRTUAL_PATH, getPositionAfterFrontmatter, lineStartToOffset } from '#lib/core/editor/editor.logic.js';
import type { EditorTab } from '#lib/core/editor/editor.types.js';

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

	it('treats the Calendar tab path as virtual, so it is never saved', () => {
		expect(EVENT_CALENDAR_VIRTUAL_PATH).toBe('__virtual__/event-calendar');
		expect(isVirtualTab({ path: EVENT_CALENDAR_VIRTUAL_PATH })).toBe(true);
	});

	it('returns false for real file paths', () => {
		expect(isVirtualTab({ path: '/Users/john/notes/note.md' })).toBe(false);
		expect(isVirtualTab({ path: '/vault/file.md' })).toBe(false);
	});

	it('returns false for paths that contain but do not start with __virtual__/', () => {
		expect(isVirtualTab({ path: '/some/__virtual__/path' })).toBe(false);
	});
});

describe('isMarkdownNoteTab', () => {
	it('is true for a .md file tab with no fileType or fileType markdown', () => {
		expect(isMarkdownNoteTab({ path: '/vault/note.md' })).toBe(true);
		expect(isMarkdownNoteTab({ path: '/vault/Note.MD', fileType: 'markdown' })).toBe(true);
	});

	it('is false for virtual tabs', () => {
		expect(isMarkdownNoteTab({ path: TASKS_VIRTUAL_PATH, fileType: 'tasks' })).toBe(false);
		expect(isMarkdownNoteTab({ path: GRAPH_VIRTUAL_PATH, fileType: 'graph' })).toBe(false);
		expect(isMarkdownNoteTab({ path: EVENT_CALENDAR_VIRTUAL_PATH, fileType: 'event-calendar' })).toBe(false);
	});

	it('is false for canvas, kanban and view tabs', () => {
		expect(isMarkdownNoteTab({ path: '/vault/board.canvas', fileType: 'canvas' })).toBe(false);
		expect(isMarkdownNoteTab({ path: '/vault/board.kanban', fileType: 'kanban' })).toBe(false);
		expect(isMarkdownNoteTab({ path: '/vault/list.view', fileType: 'collection' })).toBe(false);
	});

	it('is false for a non-.md text file and an empty path', () => {
		expect(isMarkdownNoteTab({ path: '/vault/Projects.view' })).toBe(false);
		expect(isMarkdownNoteTab({ path: '' })).toBe(false);
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

describe('clampTabInsertion', () => {
	function makeTab(name: string, pinned?: boolean): EditorTab {
		return { path: `/vault/${name}.md`, name: `${name}.md`, content: '', savedContent: '', pinned };
	}
	const tabs = [makeTab('p1', true), makeTab('p2', true), makeTab('a'), makeTab('b')];

	it('keeps an unclamped slot as is', () => {
		expect(clampTabInsertion(tabs, 0, 1)).toBe(1);
		expect(clampTabInsertion(tabs, 2, 4)).toBe(4);
	});

	it('keeps a pinned tab at or before the pinned boundary', () => {
		expect(clampTabInsertion(tabs, 0, 4)).toBe(2);
	});

	it('keeps an unpinned tab at or after the pinned boundary', () => {
		expect(clampTabInsertion(tabs, 3, 0)).toBe(2);
	});

	it('returns the slot unchanged for an unknown source tab', () => {
		expect(clampTabInsertion(tabs, 9, 0)).toBe(0);
	});
});

describe('moveTab', () => {
	function makeTab(name: string, pinned?: boolean): EditorTab {
		return { path: `/vault/${name}.md`, name: `${name}.md`, content: '', savedContent: '', pinned };
	}
	const names = (tabs: EditorTab[]) => tabs.map((t) => t.name.replace('.md', ''));

	it('moves a tab forward, `to` being an insertion index before the removal', () => {
		const tabs = [makeTab('a'), makeTab('b'), makeTab('c'), makeTab('d')];
		const result = moveTab(tabs, 0, 0, 3);

		expect(names(result.tabs)).toEqual(['b', 'c', 'a', 'd']);
	});

	it('moves a tab to the end', () => {
		const tabs = [makeTab('a'), makeTab('b'), makeTab('c')];
		expect(names(moveTab(tabs, 0, 0, 3).tabs)).toEqual(['b', 'c', 'a']);
	});

	it('moves a tab backward', () => {
		const tabs = [makeTab('a'), makeTab('b'), makeTab('c'), makeTab('d')];
		const result = moveTab(tabs, 0, 3, 1);

		expect(names(result.tabs)).toEqual(['a', 'd', 'b', 'c']);
	});

	it('returns the same tab objects', () => {
		const tabs = [makeTab('a'), makeTab('b'), makeTab('c')];
		const result = moveTab(tabs, 0, 2, 0);

		expect(result.tabs[0]).toBe(tabs[2]);
		expect(result.tabs[1]).toBe(tabs[0]);
		expect(result.tabs[2]).toBe(tabs[1]);
		expect(names(tabs)).toEqual(['a', 'b', 'c']);
	});

	it.each([
		['the same slot', 1, 1],
		['the slot right after itself', 1, 2],
		['a negative source', -1, 0],
		['a source past the end', 3, 0],
		['a negative slot', 0, -1],
		['a slot past the end', 0, 4],
		['a fractional slot', 0, 1.5],
	])('is a no-op for %s', (_label, from, to) => {
		const tabs = [makeTab('a'), makeTab('b'), makeTab('c')];
		const result = moveTab(tabs, 1, from, to);

		expect(result.tabs).toBe(tabs);
		expect(result.activeIndex).toBe(1);
	});

	it('clamps a pinned tab dragged past the unpinned group to the end of the pinned group', () => {
		const tabs = [makeTab('p1', true), makeTab('p2', true), makeTab('a'), makeTab('b')];
		const result = moveTab(tabs, 0, 0, 4);

		expect(names(result.tabs)).toEqual(['p2', 'p1', 'a', 'b']);
		expect(result.tabs.slice(0, 2).every((t) => t.pinned)).toBe(true);
	});

	it('clamps an unpinned tab dragged into the pinned group to the first unpinned slot', () => {
		const tabs = [makeTab('p1', true), makeTab('a'), makeTab('b')];
		const result = moveTab(tabs, 0, 2, 0);

		expect(names(result.tabs)).toEqual(['p1', 'b', 'a']);
	});

	it('is a no-op when the clamp lands the tab back in its slot', () => {
		const tabs = [makeTab('p1', true), makeTab('a'), makeTab('b')];
		const result = moveTab(tabs, 2, 1, 0);

		expect(result.tabs).toBe(tabs);
		expect(result.activeIndex).toBe(2);
	});

	it('keeps the active tab active when it is the one moved', () => {
		const tabs = [makeTab('a'), makeTab('b'), makeTab('c'), makeTab('d')];
		const result = moveTab(tabs, 3, 3, 0);

		expect(result.tabs[result.activeIndex].path).toBe('/vault/d.md');
		expect(result.activeIndex).toBe(0);
	});

	it('shifts the active index when another tab moves across it', () => {
		const tabs = [makeTab('a'), makeTab('b'), makeTab('c'), makeTab('d')];

		const forward = moveTab(tabs, 1, 0, 3);
		expect(forward.activeIndex).toBe(0);
		expect(forward.tabs[forward.activeIndex].path).toBe('/vault/b.md');

		const backward = moveTab(tabs, 1, 3, 0);
		expect(backward.activeIndex).toBe(2);
		expect(backward.tabs[backward.activeIndex].path).toBe('/vault/b.md');
	});

	it('leaves the active index alone when a tab moves elsewhere', () => {
		const tabs = [makeTab('a'), makeTab('b'), makeTab('c'), makeTab('d')];
		const result = moveTab(tabs, 0, 3, 2);

		expect(names(result.tabs)).toEqual(['a', 'b', 'd', 'c']);
		expect(result.activeIndex).toBe(0);
	});
});

describe('tabTooltipText', () => {
	const tab = (overrides: Partial<EditorTab> = {}): EditorTab => ({
		path: '/vault/Projects/Roadmap.md',
		name: 'Roadmap.md',
		content: '',
		savedContent: '',
		...overrides,
	});

	it('shows the name and the vault-relative path of a file tab', () => {
		expect(tabTooltipText(tab(), '/vault')).toBe('Roadmap.md\nProjects/Roadmap.md');
	});

	it('shows only the name of a virtual tab, even when pinned or with content', () => {
		const tasks = tab({ path: TASKS_VIRTUAL_PATH, name: 'Tasks', content: 'x', fileType: 'tasks', pinned: true });
		expect(tabTooltipText(tasks, '/vault')).toBe('Tasks');
	});

	it('adds Unsaved changes for a dirty file tab', () => {
		expect(tabTooltipText(tab({ content: 'edited' }), '/vault')).toBe('Roadmap.md\nProjects/Roadmap.md\nUnsaved changes');
	});

	it('adds Pinned for a pinned file tab, after Unsaved changes', () => {
		expect(tabTooltipText(tab({ pinned: true }), '/vault')).toBe('Roadmap.md\nProjects/Roadmap.md\nPinned');
		expect(tabTooltipText(tab({ pinned: true, content: 'edited' }), '/vault')).toBe(
			'Roadmap.md\nProjects/Roadmap.md\nUnsaved changes\nPinned',
		);
	});

	it('shows the full path when no vault is open or the file is outside it', () => {
		expect(tabTooltipText(tab(), null)).toBe('Roadmap.md\n/vault/Projects/Roadmap.md');
		expect(tabTooltipText(tab(), '/other')).toBe('Roadmap.md\n/vault/Projects/Roadmap.md');
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

describe('lineStartToOffset', () => {
	// "aa\nbbb\ncccc" line starts: line 1 → 0, line 2 → 3, line 3 → 7
	const content = 'aa\nbbb\ncccc';

	it('returns the character offset where the 1-indexed line starts', () => {
		expect(lineStartToOffset(content, 1)).toBe(0);
		expect(lineStartToOffset(content, 2)).toBe(3);
		expect(lineStartToOffset(content, 3)).toBe(7);
	});

	it('clamps a line number past the last line to the last line start', () => {
		expect(lineStartToOffset(content, 99)).toBe(7);
	});

	it('clamps line numbers below 1 to offset 0', () => {
		expect(lineStartToOffset(content, 0)).toBe(0);
		expect(lineStartToOffset(content, -5)).toBe(0);
	});

	it('returns 0 for empty content', () => {
		expect(lineStartToOffset('', 3)).toBe(0);
	});

	it('lands after a trailing newline when targeting the final empty line', () => {
		expect(lineStartToOffset('aa\n', 2)).toBe(3);
	});
});
