// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import { setupLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// Only the Tauri boundary is mocked: tags.service, tags.store and tags.logic run for real.
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import TagsView from '#lib/features/tags/TagsView.svelte';
import { tagsStore } from '#lib/features/tags/tags.store.svelte.js';
import {
	buildTagIndex,
	flushScheduledTagIndexRebuild,
	resetTags,
} from '#lib/features/tags/tags.service.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import type { TagAggregateV2 } from '#lib/types/vault-v2.types.js';

/** Builds `n` distinct file paths so a tag clears the rare-tag threshold (10). */
function files(prefix: string, n: number): string[] {
	return Array.from({ length: n }, (_, i) => `/vault/${prefix}-${i}.md`);
}

const workOnly: TagAggregateV2[] = [{ name: 'work', count: 12, filePaths: files('w', 12) }];

const nested: TagAggregateV2[] = [
	{ name: 'project', count: 12, filePaths: files('p', 12) },
	{ name: 'project/alpha', count: 11, filePaths: files('a', 11) },
];

const LOADING = 'Indexing tags...';

describe('TagsView refresh', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	/** Makes the next `get_all_tags_v2` call hang until the returned resolver/rejecter runs. */
	function gateNextInvoke() {
		let resolve!: (value: TagAggregateV2[]) => void;
		let reject!: (err: unknown) => void;
		vi.mocked(invoke).mockImplementationOnce(
			() =>
				new Promise<TagAggregateV2[]>((res, rej) => {
					resolve = res;
					reject = rej;
				}),
		);
		return { resolve: (v: TagAggregateV2[]) => resolve(v), reject: (e: unknown) => reject(e) };
	}

	/** Mounts the view and lets its mount-time debounced rebuild start its IPC. */
	function mountAndStartRefresh() {
		component = mount(TagsView, { target });
		flushSync();
		vi.advanceTimersByTime(300);
		flushSync();
	}

	/** Waits for the in-flight rebuild to settle and renders the result. */
	async function settle() {
		vi.useRealTimers();
		await flushScheduledTagIndexRebuild();
		flushSync();
	}

	/** Runs a real successful build so the store holds a loaded tree. */
	async function loadTree(aggregates: TagAggregateV2[]) {
		vi.mocked(invoke).mockResolvedValueOnce(aggregates);
		await buildTagIndex();
	}

	function headerText(): string {
		return target.querySelector('.pane-toolbar')?.textContent ?? '';
	}

	beforeEach(() => {
		vi.clearAllMocks();
		resetTags();
		settingsStore.reset();
		vi.spyOn(console, 'error').mockImplementation(() => {});
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('keeps the loaded rows and hides the loading line while a refresh is in flight', async () => {
		await loadTree(workOnly);
		vi.useFakeTimers();
		gateNextInvoke();

		mountAndStartRefresh();

		expect(invoke).toHaveBeenCalledTimes(2);
		expect(tagsStore.isLoading).toBe(true);
		expect(target.textContent).toContain('work');
		expect(target.textContent).not.toContain(LOADING);
	});

	it('keeps the header count visible during a refresh after the first load', async () => {
		await loadTree(workOnly);
		vi.useFakeTimers();
		gateNextInvoke();

		mountAndStartRefresh();

		expect(tagsStore.isLoading).toBe(true);
		expect(headerText()).toContain('1 tag');
	});

	it('keeps an expanded parent tag expanded after the refresh resolves with the same tree', async () => {
		await loadTree(nested);
		vi.useFakeTimers();
		const gate = gateNextInvoke();
		mountAndStartRefresh();

		const trigger = target.querySelector<HTMLElement>('[data-slot="collapsible-trigger"]');
		expect(trigger).not.toBeNull();
		expect(trigger!.getAttribute('aria-expanded')).toBe('false');
		trigger!.click();
		flushSync();
		expect(trigger!.getAttribute('aria-expanded')).toBe('true');

		gate.resolve(nested);
		await settle();

		expect(tagsStore.isLoading).toBe(false);
		// Same DOM node: the row stayed mounted instead of being rebuilt collapsed.
		const after = target.querySelector<HTMLElement>('[data-slot="collapsible-trigger"]');
		expect(after).toBe(trigger);
		expect(after!.getAttribute('aria-expanded')).toBe('true');
		expect(target.textContent).toContain('alpha');
		expect(target.textContent).not.toContain(LOADING);
	});

	it('shows "No tags found" during a refresh of a vault with zero tags', async () => {
		await loadTree([]);
		expect(tagsStore.hasLoaded).toBe(true);
		vi.useFakeTimers();
		gateNextInvoke();

		mountAndStartRefresh();

		expect(tagsStore.isLoading).toBe(true);
		expect(target.textContent).toContain('No tags found');
		expect(target.textContent).not.toContain(LOADING);
	});

	it('shows the loading line on the first load until the IPC resolves', async () => {
		vi.useFakeTimers();
		const gate = gateNextInvoke();

		mountAndStartRefresh();

		expect(target.textContent).toContain(LOADING);
		expect(target.textContent).not.toContain('work');

		gate.resolve(workOnly);
		await settle();

		expect(tagsStore.hasLoaded).toBe(true);
		expect(target.textContent).toContain('work');
		expect(target.textContent).not.toContain(LOADING);
	});

	it('leaves hasLoaded false and shows "No tags found" when the first build fails', async () => {
		vi.useFakeTimers();
		const gate = gateNextInvoke();
		mountAndStartRefresh();
		expect(target.textContent).toContain(LOADING);

		gate.reject(new Error('boom'));
		await settle();

		expect(tagsStore.hasLoaded).toBe(false);
		expect(target.textContent).toContain('No tags found');
		expect(target.textContent).not.toContain(LOADING);
	});

	it('keeps the previous tree on screen when a refresh fails', async () => {
		await loadTree(workOnly);
		vi.useFakeTimers();
		const gate = gateNextInvoke();
		mountAndStartRefresh();

		gate.reject(new Error('boom'));
		await settle();

		expect(tagsStore.isLoading).toBe(false);
		expect(tagsStore.hasLoaded).toBe(true);
		expect(tagsStore.tagTree.map((n) => n.fullPath)).toEqual(['work']);
		expect(target.textContent).toContain('work');
		expect(headerText()).toContain('1 tag');
	});
});
