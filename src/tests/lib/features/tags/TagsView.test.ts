// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import { setupLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// Side-effect service: the rebuild reads the Rust index over IPC.
vi.mock('#lib/features/tags/tags.service.js', () => ({
	scheduleTagIndexRebuild: vi.fn(),
	updateTagSort: vi.fn(),
}));

import TagsView from '#lib/features/tags/TagsView.svelte';
import { tagsStore } from '#lib/features/tags/tags.store.svelte.js';
import { searchStore } from '#lib/features/search/search.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import type { TagTreeNode } from '#lib/features/tags/tags.types.js';

// Above the rare-tag threshold (10), which the view hides by default.
const workTag: TagTreeNode = { segment: 'work', fullPath: 'work', count: 12, totalCount: 12, filePaths: [], children: [] };

describe('TagsView tag click', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	function mountView() {
		component = mount(TagsView, { target });
		flushSync();
	}

	function clickTag(name: string) {
		const button = [...target.querySelectorAll('button')].find((b) => b.textContent?.includes(name));
		expect(button).toBeDefined();
		button!.click();
		flushSync();
	}

	beforeEach(() => {
		tagsStore.reset();
		searchStore.reset();
		settingsStore.reset();
		tagsStore.setTagTree([workTag]);
		tagsStore.setTotalTagCount(1);
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	it('opens SearchPanel with the tag query in the classic shell', () => {
		settingsStore.updateLayout({ shell: 'classic' });
		mountView();
		clickTag('work');
		expect(searchStore.query).toBe('tag:work');
		expect(searchStore.isOpen).toBe(true);
	});

	it('opens rail Search with the tag query in the rail shell', () => {
		settingsStore.updateLayout({ shell: 'rail', railItem: 'inbox' });
		mountView();
		clickTag('work');
		expect(searchStore.query).toBe('tag:work');
		expect(settingsStore.layout.railItem).toBe('search');
		expect(searchStore.isOpen).toBe(false);
	});

	it('shows the empty notice and nothing to click without tags', () => {
		tagsStore.setTagTree([]);
		mountView();
		expect(target.textContent).toContain('No tags found');
		expect(searchStore.query).toBe('');
	});
});
