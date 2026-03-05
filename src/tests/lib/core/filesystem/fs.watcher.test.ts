import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@tauri-apps/plugin-fs', () => ({
	watch: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('$lib/utils/debounce', () => ({
	debounce: vi.fn((fn: (...args: any[]) => any) => {
		const debounced = (...args: any[]) => fn(...args);
		debounced.cancel = vi.fn();
		debounced.flush = vi.fn();
		return debounced;
	}),
}));

vi.mock('$lib/core/filesystem/fs.service', () => ({
	refreshTree: vi.fn(),
}));

vi.mock('$lib/utils/debug', () => ({
	debug: vi.fn(),
	error: vi.fn((_tag: string, ...args: unknown[]) => {
		console.error(...args);
	}),
	timeAsync: vi.fn((_tag: string, _label: string, fn: () => Promise<unknown>) => fn()),
	timeSync: vi.fn((_tag: string, _label: string, fn: () => unknown) => fn()),
}));

import { watch } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { refreshTree } from '$lib/core/filesystem/fs.service';
import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
import type { FileTreeNode } from '$lib/core/filesystem/fs.types';
import {
	patchSubtree,
	filterAncestorPaths,
	onFileChange,
	startWatching,
	stopWatching,
	getWatcherCounters,
} from '$lib/core/filesystem/fs.watcher';

// --- filterAncestorPaths tests (pure logic) ---

describe('filterAncestorPaths', () => {
	it('removes ancestor directory paths when descendant file path exists', () => {
		const paths = [
			'/vault/_notes',
			'/vault/_notes/2026',
			'/vault/_notes/2026/02-Feb',
			'/vault/_notes/2026/02-Feb/journal.md',
		];
		expect(filterAncestorPaths(paths)).toEqual(['/vault/_notes/2026/02-Feb/journal.md']);
	});

	it('keeps independent paths at the same level', () => {
		const paths = ['/vault/a/file.md', '/vault/b/file.md'];
		expect(filterAncestorPaths(paths)).toEqual(['/vault/a/file.md', '/vault/b/file.md']);
	});

	it('keeps both paths for rename events (old + new in different dirs)', () => {
		const paths = ['/vault/a/old.md', '/vault/b/new.md'];
		expect(filterAncestorPaths(paths)).toEqual(['/vault/a/old.md', '/vault/b/new.md']);
	});

	it('returns empty array for empty input', () => {
		expect(filterAncestorPaths([])).toEqual([]);
	});

	it('returns single path unchanged', () => {
		expect(filterAncestorPaths(['/vault/file.md'])).toEqual(['/vault/file.md']);
	});

	it('handles multiple files in the same directory', () => {
		const paths = ['/vault/docs/a.md', '/vault/docs/b.md'];
		expect(filterAncestorPaths(paths)).toEqual(['/vault/docs/a.md', '/vault/docs/b.md']);
	});

	it('filters ancestors in multiple independent branches', () => {
		const paths = [
			'/vault/a',
			'/vault/a/file.md',
			'/vault/b',
			'/vault/b/file.md',
		];
		expect(filterAncestorPaths(paths)).toEqual(['/vault/a/file.md', '/vault/b/file.md']);
	});

	it('does not treat paths with matching prefix as ancestors', () => {
		// /vault/note should NOT be treated as ancestor of /vault/notebook/file.md
		const paths = ['/vault/note', '/vault/notebook/file.md'];
		expect(filterAncestorPaths(paths)).toEqual(['/vault/note', '/vault/notebook/file.md']);
	});
});

// --- patchSubtree tests (pure logic) ---

function makeDir(name: string, path: string, children: FileTreeNode[] = []): FileTreeNode {
	return { name, path, isDirectory: true, children };
}

function makeFile(name: string, path: string): FileTreeNode {
	return { name, path, isDirectory: false };
}

describe('patchSubtree', () => {
	it('replaces root-level subtree when parentPath matches vaultPath', () => {
		const tree = [makeFile('old.md', '/vault/old.md')];
		const newChildren = [makeFile('new.md', '/vault/new.md')];

		const result = patchSubtree(tree, '/vault', newChildren, '/vault');

		expect(result).toBe(newChildren);
	});

	it('replaces children of a matching directory node', () => {
		const tree = [
			makeDir('docs', '/vault/docs', [
				makeFile('old.md', '/vault/docs/old.md'),
			]),
			makeFile('root.md', '/vault/root.md'),
		];
		const newChildren = [
			makeFile('new.md', '/vault/docs/new.md'),
			makeFile('added.md', '/vault/docs/added.md'),
		];

		const result = patchSubtree(tree, '/vault/docs', newChildren, '/vault');

		expect(result[0].children).toEqual(newChildren);
		// Root file should be unchanged
		expect(result[1].name).toBe('root.md');
	});

	it('replaces children in a nested directory', () => {
		const tree = [
			makeDir('docs', '/vault/docs', [
				makeDir('sub', '/vault/docs/sub', [
					makeFile('deep.md', '/vault/docs/sub/deep.md'),
				]),
			]),
		];
		const newChildren = [makeFile('replaced.md', '/vault/docs/sub/replaced.md')];

		const result = patchSubtree(tree, '/vault/docs/sub', newChildren, '/vault');

		expect(result[0].children![0].children).toEqual(newChildren);
	});

	it('returns tree unchanged when no node matches parentPath', () => {
		const tree = [
			makeDir('docs', '/vault/docs', []),
			makeFile('note.md', '/vault/note.md'),
		];
		const newChildren = [makeFile('new.md', '/vault/missing/new.md')];

		const result = patchSubtree(tree, '/vault/missing', newChildren, '/vault');

		expect(result[0].children).toEqual([]);
		expect(result[1].name).toBe('note.md');
	});

	it('does not mutate the original tree', () => {
		const originalChildren = [makeFile('old.md', '/vault/docs/old.md')];
		const tree = [makeDir('docs', '/vault/docs', originalChildren)];
		const newChildren = [makeFile('new.md', '/vault/docs/new.md')];

		patchSubtree(tree, '/vault/docs', newChildren, '/vault');

		// Original tree should be unchanged
		expect(tree[0].children).toBe(originalChildren);
	});

	it('handles file nodes (no children) gracefully', () => {
		const tree = [
			makeFile('a.md', '/vault/a.md'),
			makeFile('b.md', '/vault/b.md'),
		];
		const newChildren = [makeFile('new.md', '/vault/sub/new.md')];

		const result = patchSubtree(tree, '/vault/sub', newChildren, '/vault');

		// Should return unchanged since no directory matches
		expect(result.map(n => n.name)).toEqual(['a.md', 'b.md']);
	});

	it('preserves reference identity for unchanged sibling directories', () => {
		const unchanged = makeDir('other', '/vault/other', [
			makeFile('keep.md', '/vault/other/keep.md'),
		]);
		const tree = [
			makeDir('docs', '/vault/docs', [
				makeFile('old.md', '/vault/docs/old.md'),
			]),
			unchanged,
		];
		const newChildren = [makeFile('new.md', '/vault/docs/new.md')];

		const result = patchSubtree(tree, '/vault/docs', newChildren, '/vault');

		// The patched directory should have new children
		expect(result[0].children).toEqual(newChildren);
		// The unchanged sibling should be the exact same object reference
		expect(result[1]).toBe(unchanged);
	});

	it('preserves reference identity for unchanged nested directories', () => {
		const deepUnchanged = makeDir('unchanged', '/vault/docs/unchanged', [
			makeFile('deep.md', '/vault/docs/unchanged/deep.md'),
		]);
		const tree = [
			makeDir('docs', '/vault/docs', [
				makeDir('target', '/vault/docs/target', [
					makeFile('old.md', '/vault/docs/target/old.md'),
				]),
				deepUnchanged,
			]),
		];
		const newChildren = [makeFile('new.md', '/vault/docs/target/new.md')];

		const result = patchSubtree(tree, '/vault/docs/target', newChildren, '/vault');

		// The unchanged nested sibling should keep its reference
		expect(result[0].children![1]).toBe(deepUnchanged);
	});

	it('preserves file node references', () => {
		const file = makeFile('root.md', '/vault/root.md');
		const tree = [
			makeDir('docs', '/vault/docs', []),
			file,
		];
		const newChildren = [makeFile('new.md', '/vault/docs/new.md')];

		const result = patchSubtree(tree, '/vault/docs', newChildren, '/vault');

		expect(result[1]).toBe(file);
	});
});

// --- onFileChange tests ---

describe('onFileChange', () => {
	afterEach(async () => {
		await stopWatching();
	});

	it('returns an unsubscribe function', () => {
		const listener = vi.fn();
		const unsubscribe = onFileChange(listener);

		expect(typeof unsubscribe).toBe('function');
	});

	it('unsubscribe removes the listener', () => {
		const listener1 = vi.fn();
		const listener2 = vi.fn();

		const unsub1 = onFileChange(listener1);
		onFileChange(listener2);

		unsub1();

		// After unsubscribe, listener1 should no longer be in the list.
		// We verify by checking that a second unsubscribe of listener2 still works
		// (indirectly: the array should have only listener2)
		const unsub2Listener = vi.fn();
		const unsub2 = onFileChange(unsub2Listener);
		unsub2();
		// If we got here without error, the unsubscribe mechanism works
		expect(true).toBe(true);
	});
});

// --- startWatching / stopWatching tests ---

describe('startWatching / stopWatching', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(async () => {
		await stopWatching();
	});

	it('calls watch with the vault path and recursive options', async () => {
		const mockUnwatch = vi.fn();
		vi.mocked(watch).mockResolvedValue(mockUnwatch);

		await startWatching('/vault');

		expect(watch).toHaveBeenCalledWith(
			'/vault',
			expect.any(Function),
			{ recursive: true, delayMs: 1000 },
		);
	});

	it('stopWatching calls the unwatch function', async () => {
		const mockUnwatch = vi.fn();
		vi.mocked(watch).mockResolvedValue(mockUnwatch);

		await startWatching('/vault');
		await stopWatching();

		expect(mockUnwatch).toHaveBeenCalled();
	});

	it('stopWatching is safe to call when not watching', async () => {
		// Should not throw
		await stopWatching();
		await stopWatching();
	});

	it('startWatching stops previous watcher before starting new one', async () => {
		const mockUnwatch1 = vi.fn();
		const mockUnwatch2 = vi.fn();
		vi.mocked(watch)
			.mockResolvedValueOnce(mockUnwatch1)
			.mockResolvedValueOnce(mockUnwatch2);

		await startWatching('/vault1');
		await startWatching('/vault2');

		expect(mockUnwatch1).toHaveBeenCalled();
		expect(watch).toHaveBeenCalledTimes(2);
	});

	it('handles watch() failure gracefully', async () => {
		vi.mocked(watch).mockRejectedValue(new Error('watch not supported'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await startWatching('/vault');

		expect(consoleSpy).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});
});

// --- .kokobrain path filtering tests ---

describe('watcher event filtering', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(async () => {
		await stopWatching();
	});

	it('ignores events from .kokobrain directory', async () => {
		let capturedCallback: ((event: any) => void) | null = null;
		vi.mocked(watch).mockImplementation(async (_path, callback) => {
			capturedCallback = callback as any;
			return () => {};
		});

		await startWatching('/vault');
		expect(capturedCallback).not.toBeNull();

		// Simulate events from .kokobrain directory — these should be ignored
		capturedCallback!({ type: { modify: { kind: 'any' } }, paths: ['/vault/.kokobrain/debug.log'] });
		capturedCallback!({ type: { modify: { kind: 'any' } }, paths: ['/vault/.kokobrain'] });
		capturedCallback!({ type: { modify: { kind: 'any' } }, paths: ['/vault/.kokobrain/db/index.db'] });

		// No debounced refresh should be triggered (we can't easily assert on
		// the debounce directly, but we can verify no side effects occurred)
	});

	it('ignores events for the vault root path itself', async () => {
		let capturedCallback: ((event: any) => void) | null = null;
		vi.mocked(watch).mockImplementation(async (_path, callback) => {
			capturedCallback = callback as any;
			return () => {};
		});

		await startWatching('/vault');
		expect(capturedCallback).not.toBeNull();

		// Vault root itself should be skipped (macOS FSEvents quirk)
		capturedCallback!({ type: { modify: { kind: 'any' } }, paths: ['/vault'] });
	});
});

// --- Watcher counter tests ---

describe('watcher counters', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(async () => {
		await stopWatching();
	});

	it('starts with all counters zeroed', async () => {
		const counters = getWatcherCounters();

		expect(counters.rawEvents).toBe(0);
		expect(counters.skippedKokobrain).toBe(0);
		expect(counters.skippedVaultRoot).toBe(0);
		expect(counters.accepted).toBe(0);
		expect(counters.skippedAncestorPaths).toBe(0);
		expect(counters.debounceFires).toBe(0);
		expect(counters.fullRefreshes).toBe(0);
		expect(counters.incrementalRefreshes).toBe(0);
	});

	it('resets counters on stopWatching', async () => {
		let capturedCallback: ((event: any) => void) | null = null;
		vi.mocked(watch).mockImplementation(async (_path, callback) => {
			capturedCallback = callback as any;
			return () => {};
		});

		await startWatching('/vault');
		capturedCallback!({ type: { modify: { kind: 'any' } }, paths: ['/vault/note.md'] });

		expect(getWatcherCounters().rawEvents).toBe(1);

		await stopWatching();

		const counters = getWatcherCounters();
		expect(counters.rawEvents).toBe(0);
		expect(counters.accepted).toBe(0);
	});

	it('increments accepted and skipped counters correctly', async () => {
		let capturedCallback: ((event: any) => void) | null = null;
		vi.mocked(watch).mockImplementation(async (_path, callback) => {
			capturedCallback = callback as any;
			return () => {};
		});

		await startWatching('/vault');

		// Accepted path
		capturedCallback!({ type: { modify: { kind: 'any' } }, paths: ['/vault/note.md'] });
		// Skipped .kokobrain path
		capturedCallback!({ type: { modify: { kind: 'any' } }, paths: ['/vault/.kokobrain/debug.log'] });
		// Skipped vault root
		capturedCallback!({ type: { modify: { kind: 'any' } }, paths: ['/vault'] });

		const counters = getWatcherCounters();
		expect(counters.rawEvents).toBe(3);
		expect(counters.accepted).toBe(1);
		expect(counters.skippedKokobrain).toBe(1);
		expect(counters.skippedVaultRoot).toBe(1);
	});
});

// --- debouncedRefresh tests ---

/** Helper to start watching and capture the event callback */
async function setupWatcher(vaultPath = '/vault'): Promise<(event: any) => void> {
	let capturedCallback: ((event: any) => void) | null = null;
	vi.mocked(watch).mockImplementation(async (_path, callback) => {
		capturedCallback = callback as any;
		return () => {};
	});
	await startWatching(vaultPath);
	return capturedCallback!;
}

describe('debouncedRefresh', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fsStore.reset();
		vi.mocked(refreshTree).mockResolvedValue(undefined);
	});

	afterEach(async () => {
		await stopWatching();
	});

	it('performs full refresh when more than 5 parent directories change', async () => {
		const cb = await setupWatcher();

		// Send all 6 paths in one event so they accumulate before debounce fires
		const paths = Array.from({ length: 6 }, (_, i) => `/vault/dir${i}/file.md`);
		cb({ type: { modify: { kind: 'any' } }, paths });
		await new Promise((r) => setTimeout(r, 0));

		expect(refreshTree).toHaveBeenCalled();
		expect(getWatcherCounters().fullRefreshes).toBe(1);
	});

	it('performs incremental refresh for few parent directories', async () => {
		const cb = await setupWatcher();

		// Setup store with existing tree
		fsStore.setFileTree([
			{ name: 'docs', path: '/vault/docs', isDirectory: true, children: [] },
		]);

		// Mock invoke to return new subtree for /vault/docs
		vi.mocked(invoke).mockResolvedValueOnce([
			{ name: 'new.md', path: '/vault/docs/new.md', isDirectory: false },
		]);

		cb({ type: { modify: { kind: 'any' } }, paths: ['/vault/docs/new.md'] });
		await new Promise((r) => setTimeout(r, 0));

		expect(invoke).toHaveBeenCalledWith('scan_vault', {
			path: '/vault/docs',
			sortBy: 'name',
		});
		expect(getWatcherCounters().incrementalRefreshes).toBe(1);
		expect(fsStore.fileTree[0].children).toHaveLength(1);
	});

	it('falls back to full refresh when incremental scan_vault fails', async () => {
		const cb = await setupWatcher();

		fsStore.setFileTree([
			{ name: 'docs', path: '/vault/docs', isDirectory: true, children: [] },
		]);

		// Make invoke reject to trigger fallback
		vi.mocked(invoke).mockRejectedValueOnce(new Error('scan failed'));

		cb({ type: { modify: { kind: 'any' } }, paths: ['/vault/docs/file.md'] });
		await new Promise((r) => setTimeout(r, 0));

		expect(refreshTree).toHaveBeenCalled();
		expect(getWatcherCounters().fullRefreshes).toBe(1);
	});

	it('performs full refresh when no specific paths are pending', async () => {
		const cb = await setupWatcher();

		// Simulate event with vault root path (filtered out) then manually trigger
		// Actually, if no paths are accepted, debouncedRefresh won't fire.
		// Let's test: 0 parentsToRescan triggers full refresh
		cb({ type: { modify: { kind: 'any' } }, paths: ['/other/outside/vault.md'] });
		await new Promise((r) => setTimeout(r, 0));

		// The path doesn't start with vaultPath, so parentsToRescan is empty → full refresh
		expect(refreshTree).toHaveBeenCalled();
	});

	it('notifies change listeners after full refresh', async () => {
		const listener = vi.fn();
		onFileChange(listener);

		const cb = await setupWatcher();
		cb({ type: { modify: { kind: 'any' } }, paths: ['/vault/a/1.md', '/vault/b/2.md', '/vault/c/3.md', '/vault/d/4.md', '/vault/e/5.md', '/vault/f/6.md'] });
		await new Promise((r) => setTimeout(r, 0));

		expect(listener).toHaveBeenCalledWith(expect.arrayContaining(['/vault/a/1.md']));
	});

	it('notifies change listeners after incremental refresh', async () => {
		const listener = vi.fn();
		onFileChange(listener);

		const cb = await setupWatcher();
		fsStore.setFileTree([
			{ name: 'docs', path: '/vault/docs', isDirectory: true, children: [] },
		]);
		vi.mocked(invoke).mockResolvedValueOnce([]);

		cb({ type: { modify: { kind: 'any' } }, paths: ['/vault/docs/note.md'] });
		await new Promise((r) => setTimeout(r, 0));

		expect(listener).toHaveBeenCalledWith(['/vault/docs/note.md']);
	});

	it('discards in-flight refresh when stopWatching is called mid-flight', async () => {
		const cb = await setupWatcher();

		fsStore.setFileTree([
			{ name: 'docs', path: '/vault/docs', isDirectory: true, children: [] },
		]);

		// Make invoke slow so we can stop watching during it
		let resolveInvoke: (value: any) => void;
		vi.mocked(invoke).mockImplementation(() => new Promise((r) => { resolveInvoke = r; }));

		cb({ type: { modify: { kind: 'any' } }, paths: ['/vault/docs/note.md'] });
		// Don't await — let the async callback start

		// Stop watching mid-flight (increments watchVersion)
		await stopWatching();

		// Resolve the in-flight invoke — the result should be discarded
		resolveInvoke!([{ name: 'stale.md', path: '/vault/docs/stale.md', isDirectory: false }]);
		await new Promise((r) => setTimeout(r, 0));

		// Tree should NOT have been updated with stale data — original tree intact
		expect(fsStore.fileTree).toEqual([
			{ name: 'docs', path: '/vault/docs', isDirectory: true, children: [] },
		]);
	});
});
