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

	it('opens rail Search with the tag query', () => {
		settingsStore.updateLayout({ railItem: 'inbox' });
		mountView();
		clickTag('work');
		expect(searchStore.query).toBe('tag:work');
		expect(settingsStore.layout.railItem).toBe('search');
	});

	it('shows the empty notice and nothing to click without tags', () => {
		tagsStore.setTagTree([]);
		mountView();
		expect(target.textContent).toContain('No tags found');
		expect(searchStore.query).toBe('');
	});
});

describe('TagsView rare-tag filter', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	function leaf(segment: string, count: number): TagTreeNode {
		return { segment, fullPath: segment, count, totalCount: count, filePaths: [], children: [] };
	}

	function mountView() {
		component = mount(TagsView, { target });
		flushSync();
	}

	/** The count text next to the "Tags" title, whitespace collapsed. */
	function headerText(): string {
		const span = target.querySelector('.pane-toolbar span');
		return (span?.textContent ?? '').replace(/\s+/g, ' ').trim();
	}

	function showAllButtons(): HTMLButtonElement[] {
		return [...target.querySelectorAll('button')].filter((b) => b.textContent?.includes('Show all'));
	}

	/** The tag names the list renders, one per row. */
	function listedTags(): string[] {
		return [...target.querySelectorAll('span.truncate')].map((s) => s.textContent?.trim() ?? '');
	}

	beforeEach(() => {
		tagsStore.reset();
		searchStore.reset();
		settingsStore.reset();
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	it('says "Showing X of Y tags" with a Show all button while the filter hides a tag', () => {
		tagsStore.setTagTree([leaf('work', 12), leaf('misc', 3)]);
		tagsStore.setTotalTagCount(2);
		mountView();

		expect(headerText()).toBe('Showing 1 of 2 tags Show all');
		const buttons = showAllButtons();
		expect(buttons).toHaveLength(1);

		buttons[0].click();
		flushSync();

		expect(tagsStore.hideRareTags).toBe(false);
		expect(listedTags()).toEqual(['work', 'misc']);
		expect(headerText()).toBe('2 tags');
		expect(showAllButtons()).toHaveLength(0);
	});

	it('says "N tags" with no button when the filter is off', () => {
		tagsStore.setTagTree([leaf('work', 12), leaf('misc', 3)]);
		tagsStore.setTotalTagCount(2);
		tagsStore.setHideRareTags(false);
		mountView();

		expect(headerText()).toBe('2 tags');
		expect(showAllButtons()).toHaveLength(0);
	});

	it('says "N tags" with no button when no tag is hidden', () => {
		tagsStore.setTagTree([leaf('work', 12), leaf('home', 15)]);
		tagsStore.setTotalTagCount(2);
		mountView();

		expect(headerText()).toBe('2 tags');
		expect(showAllButtons()).toHaveLength(0);
	});

	it('explains the filter when it hides every tag, with one Show all button', () => {
		tagsStore.setTagTree([leaf('alpha', 1), leaf('beta', 4), leaf('gamma', 9)]);
		tagsStore.setTotalTagCount(3);
		mountView();

		expect(target.textContent).toContain('All 3 tags are used fewer than 10 times.');
		expect(target.textContent).not.toContain('No tags found');
		expect(headerText()).toBe('3 tags');
		const buttons = showAllButtons();
		expect(buttons).toHaveLength(1);
		expect(buttons[0].textContent?.trim()).toBe('Show all tags');

		buttons[0].click();
		flushSync();

		expect(tagsStore.hideRareTags).toBe(false);
		expect(target.textContent).not.toContain('fewer than 10 times');
		expect(listedTags().sort()).toEqual(['alpha', 'beta', 'gamma']);
	});

	it('uses the singular when the filter hides the only tag', () => {
		tagsStore.setTagTree([leaf('alpha', 1)]);
		tagsStore.setTotalTagCount(1);
		mountView();

		expect(target.textContent).toContain('The only tag is used fewer than 10 times.');
		expect(target.textContent).not.toContain('All 1 tags');
	});

	it('names the filter icon apart from the Show all button', () => {
		tagsStore.setTagTree([leaf('alpha', 1)]);
		tagsStore.setTotalTagCount(1);
		mountView();

		const titles = [...target.querySelectorAll('button[title]')].map((b) => b.getAttribute('title'));
		expect(titles).toContain('Turn off rare-tag filter');
		expect(titles).not.toContain('Show all tags');

		tagsStore.setHideRareTags(false);
		flushSync();
		expect([...target.querySelectorAll('button[title]')].map((b) => b.getAttribute('title'))).toContain('Hide rare tags');
	});
});
