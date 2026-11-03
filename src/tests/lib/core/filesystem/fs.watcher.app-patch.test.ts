/**
 * A watcher subtree patch and an app-initiated tree update in flight at the
 * same time: each applies to the tree as it is when it lands, so neither
 * drops the other. Real `fs.service`, `fs.watcher` and stores; only the
 * Tauri boundary is mocked.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
	exists: vi.fn(async () => true),
}));

vi.mock('#lib/utils/debug.js', () => ({
	debug: vi.fn(),
	error: vi.fn(),
	timeAsync: vi.fn((_tag: string, _label: string, fn: () => Promise<unknown>) => fn()),
	timeSync: vi.fn((_tag: string, _label: string, fn: () => unknown) => fn()),
}));

import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
import { addScannedToTree, addToTree } from '#lib/core/filesystem/fs.service.js';
import { startWatching, stopWatching } from '#lib/core/filesystem/fs.watcher.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';

const dir = (path: string, children: FileTreeNode[] = []): FileTreeNode => ({ name: path.split('/').pop()!, path, isDirectory: true, children });
const file = (path: string): FileTreeNode => ({ name: path.split('/').pop()!, path, isDirectory: false });

/** Every path in the file tree, depth first. */
function treePaths(): string[] {
	const out: string[] = [];
	const walk = (nodes: FileTreeNode[]) => {
		for (const n of nodes) {
			out.push(n.path);
			if (n.children) walk(n.children);
		}
	};
	walk(fsStore.fileTree);
	return out;
}

/** Starts the watcher and returns a function that emits one Rust batch. */
async function setupWatcher(): Promise<(paths: string[]) => void> {
	let captured: ((event: { payload: { paths: string[] } }) => void) | null = null;
	vi.mocked(listen).mockImplementation(async (_evt, handler) => {
		captured = handler as never;
		return vi.fn() as unknown as UnlistenFn;
	});
	await startWatching('/vault');
	return (paths) => captured!({ payload: { paths } });
}

/** Lets pending promise callbacks run. */
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('watcher patch and app patch in flight together', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fsStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
		vi.mocked(invoke).mockResolvedValue(undefined);
		fsStore.setFileTree([dir('/vault/a'), dir('/vault/b')]);
	});

	afterEach(async () => {
		await stopWatching();
	});

	it('keeps a note the app created while a watcher scan was in flight', async () => {
		const emit = await setupWatcher();
		let finishScan!: (nodes: FileTreeNode[]) => void;
		vi.mocked(invoke).mockImplementation(async (cmd, args) => {
			if (cmd === 'scan_vault' && (args as { path: string }).path === '/vault/a') {
				return new Promise<FileTreeNode[]>((r) => { finishScan = r; });
			}
			return undefined;
		});

		emit(['/vault/a/x.md']);
		await tick();
		addToTree('/vault/b/new.md');
		finishScan([file('/vault/a/x.md')]);
		await tick();

		expect(treePaths()).toEqual(['/vault/a', '/vault/a/x.md', '/vault/b', '/vault/b/new.md']);
	});

	it('keeps a watcher patch that landed while an app folder scan was in flight', async () => {
		const emit = await setupWatcher();
		let finishAppScan!: (nodes: FileTreeNode[]) => void;
		vi.mocked(invoke).mockImplementation(async (cmd, args) => {
			if (cmd !== 'scan_vault') return undefined;
			const { path } = args as { path: string };
			if (path === '/vault/b/restored') return new Promise<FileTreeNode[]>((r) => { finishAppScan = r; });
			if (path === '/vault/a') return [file('/vault/a/x.md')];
			throw new Error(`unexpected scan of ${path}`);
		});

		const restoring = addScannedToTree('/vault/b/restored', true);
		emit(['/vault/a/x.md']);
		await tick();
		expect(treePaths()).toEqual(['/vault/a', '/vault/a/x.md', '/vault/b']);
		finishAppScan([file('/vault/b/restored/old.md')]);
		await restoring;

		expect(treePaths()).toEqual([
			'/vault/a',
			'/vault/a/x.md',
			'/vault/b',
			'/vault/b/restored',
			'/vault/b/restored/old.md',
		]);
	});
});
