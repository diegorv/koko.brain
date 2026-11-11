// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, tick, unmount } from 'svelte';

vi.mock('#lib/features/file-icons/file-icons.icon-data.js', () => ({
	getIconSync: vi.fn(),
	getAllIconPacks: vi.fn(() => []),
	getIconsForPack: vi.fn(() => []),
	preloadPacks: vi.fn(),
	setOnPacksLoaded: vi.fn(),
}));

import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import RelationshipSearch from '#lib/features/properties/RelationshipSearch.svelte';
import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';

const file = (path: string): FileTreeNode => ({ name: path.split('/').pop()!, path, isDirectory: false });

describe('RelationshipSearch', () => {
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		fsStore.reset();
		fileIconsStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	/** Opens the popover and types `query`; returns the offered note names. */
	async function offered(query: string): Promise<string[]> {
		const target = document.body.appendChild(document.createElement('div'));
		component = mount(RelationshipSearch, { target, props: { onSelect: () => {} } });
		flushSync();
		target.querySelector<HTMLButtonElement>('button[title="Add link"]')!.click();
		await tick();
		flushSync();
		const input = document.querySelector<HTMLInputElement>('input[placeholder="Search notes..."]')!;
		input.value = query;
		input.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
		return [...document.querySelectorAll<HTMLElement>('.max-h-48 button span.truncate:first-child')].map((el) => el.textContent ?? '');
	}

	it('offers notes but never a view, which no link can target', async () => {
		fsStore.setFileTree([file('/vault/Projects.md'), file('/vault/Views/Projects.view'), file('/vault/Views/Board.VIEW')]);

		expect(await offered('Pro')).toEqual(['Projects']);
	});

	it("draws an offered note's default icon in its own color when it has no icon", async () => {
		fsStore.setFileTree([file('/vault/Projects.md')]);
		fileIconsStore.updateFrontmatterIcon('/vault/Projects.md', { color: '#ef4444' });

		expect(await offered('Pro')).toEqual(['Projects']);
		expect(document.querySelector('.max-h-48 button svg')!.getAttribute('style')).toContain('rgb(239, 68, 68)');
	});

	it('offers nothing when the tree is empty', async () => {
		expect(await offered('Pro')).toEqual([]);
	});
});
