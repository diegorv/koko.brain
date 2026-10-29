import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn(),
}));

vi.mock('#lib/core/filesystem/fs.service.js', () => ({
	refreshTree: vi.fn(),
}));

vi.mock('#lib/utils/debug.js', () => ({
	debug: vi.fn(),
	error: vi.fn((_tag: string, ...args: unknown[]) => {
		console.error(...args);
	}),
}));

import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { refreshTree } from '#lib/core/filesystem/fs.service.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
import {
	patchSubtree,
	onFileChange,
	startWatching,
	stopWatching,
	getWatcherCounters,
} from '#lib/core/filesystem/fs.watcher.js';

// ---------------------------------------------------------------------------
// patchSubtree (pure logic, unchanged from pre-Phase 9)
// ---------------------------------------------------------------------------

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
			makeDir('docs', '/vault/docs', [makeFile('old.md', '/vault/docs/old.md')]),
			makeFile('root.md', '/vault/root.md'),
		];
		const newChildren = [makeFile('new.md', '/vault/docs/new.md')];
		const result = patchSubtree(tree, '/vault/docs', newChildren, '/vault');
		expect(result[0].children).toEqual(newChildren);
		expect(result[1].name).toBe('root.md');
	});

	it('replaces children in a nested directory', () => {
		const tree = [
			makeDir('docs', '/vault/docs', [
				makeDir('sub', '/vault/docs/sub', [makeFile('deep.md', '/vault/docs/sub/deep.md')]),
			]),
		];
		const newChildren = [makeFile('replaced.md', '/vault/docs/sub/replaced.md')];
		const result = patchSubtree(tree, '/vault/docs/sub', newChildren, '/vault');
		expect(result[0].children![0].children).toEqual(newChildren);
	});

	it('returns tree unchanged when no node matches parentPath', () => {
		const tree = [makeDir('docs', '/vault/docs', []), makeFile('note.md', '/vault/note.md')];
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
		expect(tree[0].children).toBe(originalChildren);
	});

	it('preserves reference identity for unchanged sibling directories', () => {
		const unchanged = makeDir('other', '/vault/other', [makeFile('keep.md', '/vault/other/keep.md')]);
		const tree = [
			makeDir('docs', '/vault/docs', [makeFile('old.md', '/vault/docs/old.md')]),
			unchanged,
		];
		const newChildren = [makeFile('new.md', '/vault/docs/new.md')];
		const result = patchSubtree(tree, '/vault/docs', newChildren, '/vault');
		expect(result[0].children).toEqual(newChildren);
		expect(result[1]).toBe(unchanged);
	});
});

// ---------------------------------------------------------------------------
// onFileChange (subscriber API, unchanged from pre-Phase 9)
// ---------------------------------------------------------------------------

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
		// If the array is malformed, a second unsubscribe of an
		// arbitrary listener throws. The fact that this doesn't is the
		// (loose) assertion.
		const unsub3 = onFileChange(vi.fn());
		unsub3();
		expect(true).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// startWatching / stopWatching — Phase 9 invoke + listen wiring
// ---------------------------------------------------------------------------

/**
 * Helper: configures `listen('vault-files-changed', ...)` to capture the
 * payload handler and yields it for tests to invoke synthetically. The
 * helper also captures the Tauri unlisten function so afterEach can
 * verify it was called by `stopWatching`.
 */
async function setupWatcher(vaultPath = '/vault'): Promise<{
	emit: (paths: string[]) => void;
	unlisten: UnlistenFn;
}> {
	let captured: ((event: { payload: { paths: string[] } }) => void) | null = null;
	const unlisten = vi.fn() as unknown as UnlistenFn;
	vi.mocked(listen).mockImplementation(async (_evt, handler) => {
		captured = handler as never;
		return unlisten;
	});
	vi.mocked(invoke).mockResolvedValue(undefined);
	await startWatching(vaultPath);
	if (!captured) throw new Error('listen handler not captured');
	return {
		emit: (paths: string[]) => captured!({ payload: { paths } }),
		unlisten,
	};
}

describe('startWatching / stopWatching', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(async () => {
		await stopWatching();
	});

	it('invokes start_vault_watcher with the vault path', async () => {
		vi.mocked(listen).mockResolvedValue(vi.fn() as unknown as UnlistenFn);
		vi.mocked(invoke).mockResolvedValue(undefined);

		await startWatching('/vault');

		expect(invoke).toHaveBeenCalledWith('start_vault_watcher', { path: '/vault' });
	});

	it('subscribes to vault-files-changed BEFORE invoking start (no first-burst loss)', async () => {
		// Track only the start side — `startWatching` also calls
		// `stopWatching()` first, which fires `invoke('stop_vault_watcher')`.
		// We care about the relative order of LISTEN vs `start_vault_watcher`.
		const callOrder: string[] = [];
		vi.mocked(listen).mockImplementation(async () => {
			callOrder.push('listen');
			return (vi.fn() as unknown) as UnlistenFn;
		});
		vi.mocked(invoke).mockImplementation(async (cmd: string) => {
			if (cmd === 'start_vault_watcher') callOrder.push('invoke:start');
			return undefined;
		});

		await startWatching('/vault');

		expect(callOrder).toEqual(['listen', 'invoke:start']);
	});

	it('stopWatching invokes stop_vault_watcher AND unsubscribes the listener', async () => {
		const { unlisten } = await setupWatcher();
		vi.mocked(invoke).mockClear();

		await stopWatching();

		expect(unlisten).toHaveBeenCalled();
		expect(invoke).toHaveBeenCalledWith('stop_vault_watcher');
	});

	it('stopWatching is safe to call when not watching', async () => {
		await stopWatching();
		await stopWatching();
		expect(true).toBe(true);
	});

	it('startWatching stops the previous watcher before starting a new one', async () => {
		const unlisten1 = vi.fn() as unknown as UnlistenFn;
		const unlisten2 = vi.fn() as unknown as UnlistenFn;
		vi.mocked(listen)
			.mockResolvedValueOnce(unlisten1)
			.mockResolvedValueOnce(unlisten2);
		vi.mocked(invoke).mockResolvedValue(undefined);

		await startWatching('/vault1');
		await startWatching('/vault2');

		expect(unlisten1).toHaveBeenCalled();
		expect(invoke).toHaveBeenCalledWith('start_vault_watcher', { path: '/vault1' });
		expect(invoke).toHaveBeenCalledWith('start_vault_watcher', { path: '/vault2' });
	});

	it('handles invoke failure gracefully (tears down listener)', async () => {
		const unlisten = vi.fn() as unknown as UnlistenFn;
		vi.mocked(listen).mockResolvedValue(unlisten);
		// Reject only on `start_vault_watcher` — `stop_vault_watcher`
		// (called by the implicit stopWatching at the top of
		// startWatching) must succeed.
		vi.mocked(invoke).mockImplementation(async (cmd: string) => {
			if (cmd === 'start_vault_watcher') throw new Error('rust panic');
			return undefined;
		});
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await startWatching('/vault');

		expect(consoleSpy).toHaveBeenCalled();
		// Listener was attached but invoke failed → should detach to avoid leak.
		expect(unlisten).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	it('handles listen() failure gracefully', async () => {
		vi.mocked(listen).mockRejectedValue(new Error('event subscribe failed'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await startWatching('/vault');

		expect(consoleSpy).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});
});

// ---------------------------------------------------------------------------
// Watcher counters
// ---------------------------------------------------------------------------

describe('watcher counters', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fsStore.reset();
	});

	afterEach(async () => {
		await stopWatching();
	});

	it('starts with all counters zeroed', () => {
		const counters = getWatcherCounters();
		expect(counters.rawEvents).toBe(0);
		expect(counters.skippedAncestorPaths).toBe(0);
		expect(counters.debounceFires).toBe(0);
		expect(counters.fullRefreshes).toBe(0);
		expect(counters.incrementalRefreshes).toBe(0);
	});

	it('increments rawEvents and debounceFires per Rust-emitted batch', async () => {
		const { emit } = await setupWatcher();

		emit(['/vault/note.md']);
		await new Promise((r) => setTimeout(r, 0));

		const counters = getWatcherCounters();
		expect(counters.rawEvents).toBe(1);
		expect(counters.debounceFires).toBe(1);
	});

	it('resets counters on stopWatching', async () => {
		const { emit } = await setupWatcher();
		emit(['/vault/note.md']);
		await new Promise((r) => setTimeout(r, 0));
		expect(getWatcherCounters().rawEvents).toBe(1);

		await stopWatching();

		const counters = getWatcherCounters();
		expect(counters.rawEvents).toBe(0);
		expect(counters.debounceFires).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// vault-files-changed event handling — incremental vs full refresh
// ---------------------------------------------------------------------------

describe('vault-files-changed handling', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fsStore.reset();
		vi.mocked(refreshTree).mockResolvedValue(undefined);
	});

	afterEach(async () => {
		await stopWatching();
	});

	it('performs full refresh when more than 5 parent directories change', async () => {
		const { emit } = await setupWatcher();
		fsStore.setFileTree(Array.from({ length: 6 }, (_, i) => makeDir(`dir${i}`, `/vault/dir${i}`)));
		const paths = Array.from({ length: 6 }, (_, i) => `/vault/dir${i}/file.md`);

		emit(paths);
		await new Promise((r) => setTimeout(r, 0));

		expect(refreshTree).toHaveBeenCalled();
		expect(getWatcherCounters().fullRefreshes).toBe(1);
	});

	it('performs incremental refresh for ≤5 parent directories', async () => {
		const { emit } = await setupWatcher();
		fsStore.setFileTree([
			{ name: 'docs', path: '/vault/docs', isDirectory: true, children: [] },
		]);
		// Mock invoke for scan_vault subtree (start_vault_watcher already
		// resolved in setupWatcher).
		vi.mocked(invoke).mockResolvedValueOnce([
			{ name: 'new.md', path: '/vault/docs/new.md', isDirectory: false },
		]);

		emit(['/vault/docs/new.md']);
		await new Promise((r) => setTimeout(r, 0));

		expect(invoke).toHaveBeenCalledWith('scan_vault', {
			path: '/vault/docs',
			sortBy: 'name',
		});
		expect(getWatcherCounters().incrementalRefreshes).toBe(1);
		expect(fsStore.fileTree[0].children).toHaveLength(1);
	});

	it('falls back to full refresh when incremental scan_vault fails', async () => {
		const { emit } = await setupWatcher();
		fsStore.setFileTree([
			{ name: 'docs', path: '/vault/docs', isDirectory: true, children: [] },
		]);
		vi.mocked(invoke).mockRejectedValueOnce(new Error('scan failed'));

		emit(['/vault/docs/file.md']);
		await new Promise((r) => setTimeout(r, 0));

		expect(refreshTree).toHaveBeenCalled();
		expect(getWatcherCounters().fullRefreshes).toBe(1);
	});

	it('performs full refresh when paths fall outside the vault prefix', async () => {
		const { emit } = await setupWatcher();
		// Out-of-vault path → no parents to rescan → full refresh.
		emit(['/other/outside/vault.md']);
		await new Promise((r) => setTimeout(r, 0));

		expect(refreshTree).toHaveBeenCalled();
	});

	it('notifies change listeners after full refresh', async () => {
		const listener = vi.fn();
		onFileChange(listener);

		const { emit } = await setupWatcher();
		fsStore.setFileTree(['a', 'b', 'c', 'd', 'e', 'f'].map((n) => makeDir(n, `/vault/${n}`)));
		emit(['/vault/a/1.md', '/vault/b/2.md', '/vault/c/3.md', '/vault/d/4.md', '/vault/e/5.md', '/vault/f/6.md']);
		await new Promise((r) => setTimeout(r, 0));

		expect(refreshTree).toHaveBeenCalled();
		expect(listener).toHaveBeenCalledWith(expect.arrayContaining(['/vault/a/1.md']));
	});

	it('notifies change listeners after incremental refresh', async () => {
		const listener = vi.fn();
		onFileChange(listener);

		const { emit } = await setupWatcher();
		fsStore.setFileTree([
			{ name: 'docs', path: '/vault/docs', isDirectory: true, children: [] },
		]);
		vi.mocked(invoke).mockResolvedValueOnce([]);

		emit(['/vault/docs/note.md']);
		await new Promise((r) => setTimeout(r, 0));

		expect(listener).toHaveBeenCalledWith(['/vault/docs/note.md']);
	});

	it('discards in-flight refresh when stopWatching is called mid-flight', async () => {
		const { emit } = await setupWatcher();
		fsStore.setFileTree([
			{ name: 'docs', path: '/vault/docs', isDirectory: true, children: [] },
		]);

		// Make scan_vault hang indefinitely so we can call stopWatching mid-flight.
		let resolveInvoke: (value: unknown) => void;
		vi.mocked(invoke).mockImplementationOnce(() => new Promise((r) => {
			resolveInvoke = r;
		}));

		emit(['/vault/docs/note.md']);
		await stopWatching();

		// Resolve with stale data — should be discarded by the version check.
		resolveInvoke!([{ name: 'stale.md', path: '/vault/docs/stale.md', isDirectory: false }]);
		await new Promise((r) => setTimeout(r, 0));

		expect(fsStore.fileTree).toEqual([
			{ name: 'docs', path: '/vault/docs', isDirectory: true, children: [] },
		]);
	});

	/** Routes `scan_vault` calls to `scans[path]`; every other command resolves undefined. */
	function mockScans(scans: Record<string, FileTreeNode[]>) {
		vi.mocked(invoke).mockImplementation(async (cmd: string, args?: unknown) => {
			if (cmd !== 'scan_vault') return undefined;
			const path = (args as { path: string }).path;
			if (!(path in scans)) throw new Error(`unexpected scan of ${path}`);
			return scans[path];
		});
	}

	function scannedPaths(): string[] {
		return vi.mocked(invoke).mock.calls
			.filter(([cmd]) => cmd === 'scan_vault')
			.map(([, args]) => (args as { path: string }).path);
	}

	it('shows files created inside a chain of new folders by rescanning the nearest existing ancestor', async () => {
		const { emit } = await setupWatcher();
		fsStore.setFileTree([makeDir('docs', '/vault/docs', [makeFile('old.md', '/vault/docs/old.md')])]);
		mockScans({
			'/vault/docs': [
				makeDir('new-a', '/vault/docs/new-a', [
					makeDir('new-b', '/vault/docs/new-a/new-b', [makeFile('file.md', '/vault/docs/new-a/new-b/file.md')]),
				]),
				makeFile('old.md', '/vault/docs/old.md'),
			],
		});

		emit(['/vault/docs/new-a/new-b/file.md']);
		await new Promise((r) => setTimeout(r, 0));

		expect(scannedPaths()).toEqual(['/vault/docs']);
		expect(refreshTree).not.toHaveBeenCalled();
		const docs = fsStore.fileTree[0];
		expect(docs.children!.map((n) => n.name)).toEqual(['new-a', 'old.md']);
		const newA = docs.children![0];
		expect(newA.children![0].name).toBe('new-b');
		expect(newA.children![0].children!.map((n) => n.path)).toEqual(['/vault/docs/new-a/new-b/file.md']);
	});

	it('rescans the vault root when the new folder sits directly under it', async () => {
		const { emit } = await setupWatcher();
		fsStore.setFileTree([makeFile('root.md', '/vault/root.md')]);
		mockScans({
			'/vault': [
				makeDir('fresh', '/vault/fresh', [makeFile('a.md', '/vault/fresh/a.md')]),
				makeFile('root.md', '/vault/root.md'),
			],
		});

		emit(['/vault/fresh/a.md']);
		await new Promise((r) => setTimeout(r, 0));

		expect(scannedPaths()).toEqual(['/vault']);
		expect(fsStore.fileTree.map((n) => n.path)).toEqual(['/vault/fresh', '/vault/root.md']);
		expect(fsStore.fileTree[0].children!.map((n) => n.path)).toEqual(['/vault/fresh/a.md']);
	});

	it('still rescans only the folder itself when it is already in the tree', async () => {
		const { emit } = await setupWatcher();
		fsStore.setFileTree([
			makeDir('docs', '/vault/docs', [makeDir('sub', '/vault/docs/sub', [])]),
		]);
		mockScans({ '/vault/docs/sub': [makeFile('n.md', '/vault/docs/sub/n.md')] });

		emit(['/vault/docs/sub/n.md']);
		await new Promise((r) => setTimeout(r, 0));

		expect(scannedPaths()).toEqual(['/vault/docs/sub']);
		expect(fsStore.fileTree[0].children![0].children!.map((n) => n.path)).toEqual(['/vault/docs/sub/n.md']);
	});

	it('deduplicates walked-up parents so many new folders under one ancestor stay incremental', async () => {
		const { emit } = await setupWatcher();
		fsStore.setFileTree([makeDir('docs', '/vault/docs', [])]);
		mockScans({ '/vault/docs': [] });

		emit(Array.from({ length: 6 }, (_, i) => `/vault/docs/examples/set${i}/file.md`));
		await new Promise((r) => setTimeout(r, 0));

		expect(scannedPaths()).toEqual(['/vault/docs']);
		expect(refreshTree).not.toHaveBeenCalled();
		expect(getWatcherCounters().incrementalRefreshes).toBe(1);
	});

	it('performs full refresh when more than 5 distinct parents remain after the walk-up', async () => {
		const { emit } = await setupWatcher();
		const dirs = Array.from({ length: 6 }, (_, i) => makeDir(`d${i}`, `/vault/d${i}`, []));
		fsStore.setFileTree(dirs);
		mockScans({});

		emit(dirs.map((d) => `${d.path}/new/file.md`));
		await new Promise((r) => setTimeout(r, 0));

		expect(scannedPaths()).toEqual([]);
		expect(refreshTree).toHaveBeenCalled();
		expect(getWatcherCounters().fullRefreshes).toBe(1);
	});

	it('applies folder order to the subtree of the walked-up ancestor', async () => {
		const { emit } = await setupWatcher();
		fsStore.setFileTree([makeDir('docs', '/vault/docs', [])]);
		fsStore.setFolderOrder({ 'docs/new': ['zeta', 'alpha'] });
		mockScans({
			'/vault/docs': [
				makeDir('new', '/vault/docs/new', [
					makeDir('alpha', '/vault/docs/new/alpha', []),
					makeDir('zeta', '/vault/docs/new/zeta', [makeFile('z.md', '/vault/docs/new/zeta/z.md')]),
				]),
			],
		});

		emit(['/vault/docs/new/zeta/z.md']);
		await new Promise((r) => setTimeout(r, 0));

		const newDir = fsStore.fileTree[0].children![0];
		expect(newDir.children!.map((n) => n.name)).toEqual(['zeta', 'alpha']);
	});

	it('applies content order to the subtree of the walked-up ancestor', async () => {
		const { emit } = await setupWatcher();
		fsStore.setFileTree([makeDir('docs', '/vault/docs', [])]);
		fsStore.setContentOrder(new Map([
			['/vault/docs/new/b.md', 1],
			['/vault/docs/new/a.md', 2],
		]));
		mockScans({
			'/vault/docs': [
				makeDir('new', '/vault/docs/new', [
					makeFile('a.md', '/vault/docs/new/a.md'),
					makeFile('b.md', '/vault/docs/new/b.md'),
				]),
			],
		});

		emit(['/vault/docs/new/a.md', '/vault/docs/new/b.md']);
		await new Promise((r) => setTimeout(r, 0));

		expect(scannedPaths()).toEqual(['/vault/docs']);
		const newDir = fsStore.fileTree[0].children![0];
		expect(newDir.children!.map((n) => n.name)).toEqual(['b.md', 'a.md']);
	});

	it('emits empty paths array as a no-op', async () => {
		const { emit } = await setupWatcher();
		emit([]);
		await new Promise((r) => setTimeout(r, 0));

		expect(refreshTree).not.toHaveBeenCalled();
		// Empty payload should NOT bump debounceFires either; the Rust
		// watcher won't ever emit empty arrays, but defensive on TS side.
		expect(getWatcherCounters().debounceFires).toBe(0);
	});
});
