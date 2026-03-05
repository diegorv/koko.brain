import { describe, it, expect, beforeEach } from 'vitest';
import { editorStore } from '$lib/core/editor/editor.store.svelte';

function makeTab(overrides: Partial<{ path: string; name: string; content: string; savedContent: string; pinned: boolean }> = {}) {
	return {
		path: overrides.path ?? '/vault/note.md',
		name: overrides.name ?? 'note.md',
		content: overrides.content ?? '',
		savedContent: overrides.savedContent ?? '',
		pinned: overrides.pinned ?? false,
	};
}

describe('editorStore', () => {
	beforeEach(() => {
		editorStore.reset();
	});

	it('starts with empty state', () => {
		expect(editorStore.tabs).toEqual([]);
		expect(editorStore.activeIndex).toBe(-1);
		expect(editorStore.activeTab).toBeNull();
		expect(editorStore.activeTabPath).toBeNull();
		expect(editorStore.activeTabContent).toBeNull();
		expect(editorStore.isLivePreview).toBe(true);
	});

	describe('addTab', () => {
		it('adds unpinned tab to end and makes it active', () => {
			const tab = makeTab({ path: '/a.md', name: 'a.md' });
			editorStore.addTab(tab);

			expect(editorStore.tabs).toHaveLength(1);
			expect(editorStore.activeIndex).toBe(0);
		});

		it('adds pinned tab at pinned boundary', () => {
			editorStore.addTab(makeTab({ path: '/a.md' }));
			editorStore.addTab(makeTab({ path: '/b.md' }));

			const pinnedTab = makeTab({ path: '/c.md', pinned: true });
			editorStore.addTab(pinnedTab);

			// Pinned tab inserted at index 0 (before unpinned tabs)
			expect(editorStore.tabs[0].path).toBe('/c.md');
			expect(editorStore.tabs[0].pinned).toBe(true);
			expect(editorStore.activeIndex).toBe(0);
		});

		it('adds pinned tab after existing pinned tabs', () => {
			editorStore.addTab(makeTab({ path: '/a.md', pinned: true }));
			editorStore.addTab(makeTab({ path: '/b.md' }));

			const pinnedTab = makeTab({ path: '/c.md', pinned: true });
			editorStore.addTab(pinnedTab);

			// New pinned tab goes after existing pinned tab (index 1)
			expect(editorStore.tabs[0].path).toBe('/a.md');
			expect(editorStore.tabs[1].path).toBe('/c.md');
			expect(editorStore.tabs[1].pinned).toBe(true);
			expect(editorStore.activeIndex).toBe(1);
		});

		it('adds multiple tabs and activates the last', () => {
			editorStore.addTab(makeTab({ path: '/a.md' }));
			editorStore.addTab(makeTab({ path: '/b.md' }));

			expect(editorStore.tabs).toHaveLength(2);
			expect(editorStore.activeIndex).toBe(1);
		});
	});

	describe('setActiveIndex', () => {
		it('sets active index within bounds', () => {
			editorStore.addTab(makeTab({ path: '/a.md' }));
			editorStore.addTab(makeTab({ path: '/b.md' }));
			editorStore.setActiveIndex(0);

			expect(editorStore.activeIndex).toBe(0);
		});

		it('ignores out-of-bounds index', () => {
			editorStore.addTab(makeTab({ path: '/a.md' }));
			editorStore.setActiveIndex(5);

			expect(editorStore.activeIndex).toBe(0);
		});

		it('ignores negative index', () => {
			editorStore.addTab(makeTab({ path: '/a.md' }));
			editorStore.setActiveIndex(-1);

			expect(editorStore.activeIndex).toBe(0);
		});
	});

	describe('removeTab', () => {
		it('removes tab and adjusts index when removing before active', () => {
			editorStore.addTab(makeTab({ path: '/a.md' }));
			editorStore.addTab(makeTab({ path: '/b.md' }));
			editorStore.addTab(makeTab({ path: '/c.md' }));
			// active is now 2 (last added)
			editorStore.removeTab(0);

			expect(editorStore.tabs).toHaveLength(2);
			expect(editorStore.activeIndex).toBe(1);
		});

		it('adjusts index when removing the active tab', () => {
			editorStore.addTab(makeTab({ path: '/a.md' }));
			editorStore.addTab(makeTab({ path: '/b.md' }));
			editorStore.setActiveIndex(1);
			editorStore.removeTab(1);

			expect(editorStore.activeIndex).toBe(0);
		});

		it('sets index to -1 when removing the last tab', () => {
			editorStore.addTab(makeTab({ path: '/a.md' }));
			editorStore.removeTab(0);

			expect(editorStore.tabs).toHaveLength(0);
			expect(editorStore.activeIndex).toBe(-1);
		});

		it('does nothing for out-of-bounds index', () => {
			editorStore.addTab(makeTab({ path: '/a.md' }));
			editorStore.removeTab(5);

			expect(editorStore.tabs).toHaveLength(1);
		});

		it('keeps active index when removing after active', () => {
			editorStore.addTab(makeTab({ path: '/a.md' }));
			editorStore.addTab(makeTab({ path: '/b.md' }));
			editorStore.setActiveIndex(0);
			editorStore.removeTab(1);

			expect(editorStore.activeIndex).toBe(0);
		});
	});

	describe('activeTab / activeTabPath / activeTabContent (derived)', () => {
		it('returns correct tab data when tabs exist', () => {
			editorStore.addTab(makeTab({ path: '/a.md', name: 'a.md', content: 'hello' }));
			editorStore.addTab(makeTab({ path: '/b.md', name: 'b.md', content: 'world' }));

			expect(editorStore.activeTab).toEqual(expect.objectContaining({ path: '/b.md' }));
			expect(editorStore.activeTabPath).toBe('/b.md');
			expect(editorStore.activeTabContent).toBe('world');
		});

		it('updates when active index changes', () => {
			editorStore.addTab(makeTab({ path: '/a.md', name: 'a.md', content: 'first' }));
			editorStore.addTab(makeTab({ path: '/b.md', name: 'b.md', content: 'second' }));
			editorStore.setActiveIndex(0);

			expect(editorStore.activeTab).toEqual(expect.objectContaining({ path: '/a.md' }));
			expect(editorStore.activeTabPath).toBe('/a.md');
			expect(editorStore.activeTabContent).toBe('first');
		});

		it('returns null after all tabs are removed', () => {
			editorStore.addTab(makeTab({ path: '/a.md' }));
			editorStore.removeTab(0);

			expect(editorStore.activeTab).toBeNull();
			expect(editorStore.activeTabPath).toBeNull();
			expect(editorStore.activeTabContent).toBeNull();
		});
	});

	describe('updateContent', () => {
		it('updates active tab content', () => {
			editorStore.addTab(makeTab({ path: '/a.md', content: 'old' }));
			editorStore.updateContent('new');

			expect(editorStore.tabs[0].content).toBe('new');
		});

		it('does nothing when no active tab', () => {
			expect(() => editorStore.updateContent('text')).not.toThrow();
		});
	});

	describe('markSavedByPath', () => {
		it('updates savedContent for matching tab', () => {
			editorStore.addTab(makeTab({ path: '/a.md', savedContent: 'old' }));
			editorStore.markSavedByPath('/a.md', 'saved');

			expect(editorStore.tabs[0].savedContent).toBe('saved');
		});

		it('does nothing for non-matching path', () => {
			editorStore.addTab(makeTab({ path: '/a.md', savedContent: 'old' }));
			editorStore.markSavedByPath('/b.md', 'saved');

			expect(editorStore.tabs[0].savedContent).toBe('old');
		});
	});

	describe('setEncrypted', () => {
		it('sets encrypted flag on matching tab', () => {
			editorStore.addTab(makeTab({ path: '/a.md' }));

			editorStore.setEncrypted('/a.md', true);

			expect(editorStore.tabs[0].encrypted).toBe(true);
		});

		it('clears encrypted flag', () => {
			editorStore.addTab(makeTab({ path: '/a.md' }));
			editorStore.setEncrypted('/a.md', true);

			editorStore.setEncrypted('/a.md', false);

			expect(editorStore.tabs[0].encrypted).toBe(false);
		});

		it('does nothing for non-matching path', () => {
			editorStore.addTab(makeTab({ path: '/a.md' }));

			editorStore.setEncrypted('/b.md', true);

			expect(editorStore.tabs[0].encrypted).toBeUndefined();
		});
	});

	describe('setPendingScrollPosition', () => {
		it('sets and gets a pending scroll position', () => {
			editorStore.setPendingScrollPosition(42);

			expect(editorStore.pendingScrollPosition).toBe(42);
		});

		it('clears pending scroll position with null', () => {
			editorStore.setPendingScrollPosition(42);
			editorStore.setPendingScrollPosition(null);

			expect(editorStore.pendingScrollPosition).toBeNull();
		});
	});

	describe('setEditorView', () => {
		it('sets and gets editor view reference', () => {
			const mockView = { state: {} } as any;
			editorStore.setEditorView(mockView);

			expect(editorStore.editorView).toBe(mockView);
		});

		it('clears editor view with null', () => {
			editorStore.setEditorView({ state: {} } as any);
			editorStore.setEditorView(null);

			expect(editorStore.editorView).toBeNull();
		});
	});

	describe('updateTabPath', () => {
		it('updates path and name of matching tab', () => {
			editorStore.addTab(makeTab({ path: '/old.md', name: 'old.md' }));
			editorStore.updateTabPath('/old.md', '/new.md', 'new.md');

			expect(editorStore.tabs[0].path).toBe('/new.md');
			expect(editorStore.tabs[0].name).toBe('new.md');
		});

		it('does nothing for non-matching path', () => {
			editorStore.addTab(makeTab({ path: '/a.md', name: 'a.md' }));

			editorStore.updateTabPath('/missing.md', '/new.md', 'new.md');

			expect(editorStore.tabs[0].path).toBe('/a.md');
			expect(editorStore.tabs[0].name).toBe('a.md');
		});
	});

	describe('updateTabContentByPath', () => {
		it('updates content and savedContent for matching tab', () => {
			editorStore.addTab(makeTab({ path: '/a.md', content: 'old', savedContent: 'old' }));
			editorStore.updateTabContentByPath('/a.md', 'new');

			expect(editorStore.tabs[0].content).toBe('new');
			expect(editorStore.tabs[0].savedContent).toBe('new');
		});

		it('does nothing for non-matching path', () => {
			editorStore.addTab(makeTab({ path: '/a.md', content: 'old', savedContent: 'old' }));

			editorStore.updateTabContentByPath('/missing.md', 'new');

			expect(editorStore.tabs[0].content).toBe('old');
			expect(editorStore.tabs[0].savedContent).toBe('old');
		});
	});

	describe('updateTabContentOnly', () => {
		it('updates content but preserves savedContent (keeps dirty state)', () => {
			editorStore.addTab(makeTab({ path: '/a.md', content: 'edited', savedContent: 'original' }));
			editorStore.updateTabContentOnly('/a.md', 'link-updated');

			expect(editorStore.tabs[0].content).toBe('link-updated');
			expect(editorStore.tabs[0].savedContent).toBe('original');
		});

		it('does nothing for non-matching path', () => {
			editorStore.addTab(makeTab({ path: '/a.md', content: 'old', savedContent: 'old' }));

			editorStore.updateTabContentOnly('/missing.md', 'new');

			expect(editorStore.tabs[0].content).toBe('old');
		});
	});

	describe('togglePin', () => {
		it('pins an unpinned tab and moves it to the pinned group', () => {
			editorStore.addTab(makeTab({ path: '/a.md' }));
			editorStore.addTab(makeTab({ path: '/b.md' }));
			editorStore.setActiveIndex(1);

			editorStore.togglePin(1);

			expect(editorStore.tabs[0].path).toBe('/b.md');
			expect(editorStore.tabs[0].pinned).toBe(true);
			expect(editorStore.tabs[1].path).toBe('/a.md');
			expect(editorStore.activeIndex).toBe(0);
		});

		it('unpins a pinned tab and moves it to the unpinned group', () => {
			editorStore.addTab(makeTab({ path: '/a.md', pinned: true }));
			editorStore.addTab(makeTab({ path: '/b.md' }));
			editorStore.setActiveIndex(0);

			editorStore.togglePin(0);

			expect(editorStore.tabs[0].path).toBe('/a.md');
			expect(editorStore.tabs[0].pinned).toBe(false);
			expect(editorStore.activeIndex).toBe(0);
		});

		it('does nothing for out-of-bounds index', () => {
			editorStore.addTab(makeTab({ path: '/a.md' }));

			editorStore.togglePin(5);

			expect(editorStore.tabs[0].pinned).toBe(false);
		});
	});

	describe('setPinned', () => {
		it('pins a tab and reorders', () => {
			editorStore.addTab(makeTab({ path: '/a.md' }));
			editorStore.addTab(makeTab({ path: '/b.md' }));
			editorStore.setActiveIndex(1);

			editorStore.setPinned(1, true);

			expect(editorStore.tabs[0].path).toBe('/b.md');
			expect(editorStore.tabs[0].pinned).toBe(true);
			expect(editorStore.activeIndex).toBe(0);
		});

		it('does nothing if already in the requested state', () => {
			editorStore.addTab(makeTab({ path: '/a.md', pinned: true }));
			editorStore.addTab(makeTab({ path: '/b.md' }));
			const tabsBefore = editorStore.tabs.map((t) => t.path);

			editorStore.setPinned(0, true);

			expect(editorStore.tabs.map((t) => t.path)).toEqual(tabsBefore);
		});

		it('does nothing for out-of-bounds index', () => {
			editorStore.addTab(makeTab({ path: '/a.md' }));

			editorStore.setPinned(5, true);

			expect(editorStore.tabs[0].pinned).toBe(false);
		});
	});

	describe('setLivePreview', () => {
		it('sets live preview state', () => {
			editorStore.setLivePreview(false);
			expect(editorStore.isLivePreview).toBe(false);

			editorStore.setLivePreview(true);
			expect(editorStore.isLivePreview).toBe(true);
		});
	});

	describe('reset', () => {
		it('restores all state to defaults', () => {
			editorStore.addTab(makeTab());
			editorStore.setLivePreview(false);

			editorStore.reset();

			expect(editorStore.tabs).toEqual([]);
			expect(editorStore.activeIndex).toBe(-1);
			expect(editorStore.isLivePreview).toBe(true);
			expect(editorStore.pendingScrollPosition).toBeNull();
			expect(editorStore.editorView).toBeNull();
		});
	});
});
