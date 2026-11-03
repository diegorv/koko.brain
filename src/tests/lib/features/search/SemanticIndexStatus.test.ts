// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/** Pending `get_semantic_file_status` calls, resolved by hand in each test. */
const pending: { filePath: string; resolve: (v: unknown) => void; reject: (e: unknown) => void }[] = [];

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn((cmd: string, args: { filePath: string }) => {
		if (cmd !== 'get_semantic_file_status') return Promise.resolve(undefined);
		return new Promise((resolve, reject) => {
			pending.push({ filePath: args.filePath, resolve, reject });
		});
	}),
}));

import { mount, unmount, flushSync, tick } from 'svelte';
import SemanticIndexStatus from '#lib/features/search/SemanticIndexStatus.svelte';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { searchStore } from '#lib/features/search/search.store.svelte.js';

function status(chunkCount: number) {
	return { chunkCount, lastEmbeddedAt: null, modelLoaded: true };
}

function take(filePath: string) {
	const i = pending.findIndex((p) => p.filePath === filePath);
	if (i < 0) throw new Error(`no pending request for ${filePath}`);
	return pending.splice(i, 1)[0];
}

describe('SemanticIndexStatus - response ordering', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		pending.length = 0;
		editorStore.reset();
		searchStore.reset();
		settingsStore.reset();
		settingsStore.updateSearch({ semanticSearchEnabled: true });
		vaultStore._reset();
		vaultStore.open('/vault');
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		editorStore.reset();
		vaultStore._reset();
		settingsStore.reset();
	});

	it('an older response that lands last does not overwrite the newer one', async () => {
		editorStore.addTab({ path: '/vault/a.md', name: 'a.md', content: '', savedContent: '' });
		component = mount(SemanticIndexStatus, { target });
		flushSync();

		editorStore.addTab({ path: '/vault/b.md', name: 'b.md', content: '', savedContent: '' });
		flushSync();

		const a = take('a.md');
		const b = take('b.md');
		b.resolve(status(2));
		await tick();
		await Promise.resolve();
		flushSync();
		expect(target.textContent).toContain('Indexed (2 chunks)');

		a.resolve(status(7));
		await tick();
		await Promise.resolve();
		flushSync();

		expect(target.textContent).toContain('Indexed (2 chunks)');
		expect(target.textContent).not.toContain('7 chunks');
	});

	it('an older rejection that lands last does not clear the newer status', async () => {
		editorStore.addTab({ path: '/vault/a.md', name: 'a.md', content: '', savedContent: '' });
		component = mount(SemanticIndexStatus, { target });
		flushSync();

		editorStore.addTab({ path: '/vault/b.md', name: 'b.md', content: '', savedContent: '' });
		flushSync();

		const a = take('a.md');
		take('b.md').resolve(status(1));
		await tick();
		await Promise.resolve();
		flushSync();

		a.reject(new Error('db busy'));
		await tick();
		await Promise.resolve();
		flushSync();

		expect(target.textContent).toContain('Indexed (1 chunk)');
	});

	it('shows nothing for a non-markdown tab', () => {
		editorStore.addTab({ path: '/vault/image.png', name: 'image.png', content: '', savedContent: '' });
		component = mount(SemanticIndexStatus, { target });
		flushSync();

		expect(pending).toEqual([]);
		expect(target.textContent?.trim()).toBe('');
	});
});
