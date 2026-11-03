// @vitest-environment jsdom
// jsdom: vitest then resolves the Svelte client runtime, where `$state` deep-proxies.
// The node environment runs the server runtime with no proxies, so identity holds there anyway.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { flushSync } from 'svelte';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
import { probeFileTreeDerived } from '../../../fixtures/file-tree-derived-probe.svelte.js';

function dir(path: string, children: FileTreeNode[] = []): FileTreeNode {
	return { name: path.split('/').pop()!, path, isDirectory: true, children };
}

describe('fsStore.fileTree (client runtime)', () => {
	let probe: ReturnType<typeof probeFileTreeDerived> | null = null;

	beforeEach(() => {
		fsStore.reset();
	});

	afterEach(() => {
		probe?.dispose();
		probe = null;
	});

	it('hands back the nodes it was given, not proxies over them', () => {
		const t = [dir('/vault/docs', [{ name: 'a.md', path: '/vault/docs/a.md', isDirectory: false }])];
		fsStore.setFileTree(t);
		expect(fsStore.fileTree).toBe(t);
		expect(fsStore.fileTree[0]).toBe(t[0]);
		expect(fsStore.fileTree[0].children![0]).toBe(t[0].children![0]);
	});

	it('starts empty and resets to empty', () => {
		expect(fsStore.fileTree).toEqual([]);
		fsStore.setFileTree([dir('/vault/x')]);
		fsStore.reset();
		expect(fsStore.fileTree).toEqual([]);
	});

	it('recomputes a $derived reader after setFileTree replaces the tree', () => {
		probe = probeFileTreeDerived();
		flushSync();
		expect(probe.paths()).toEqual([]);

		fsStore.setFileTree([dir('/vault/a')]);
		flushSync();
		expect(probe.paths()).toEqual(['/vault/a']);

		fsStore.setFileTree([dir('/vault/a'), dir('/vault/b')]);
		flushSync();
		expect(probe.paths()).toEqual(['/vault/a', '/vault/b']);
	});
});
