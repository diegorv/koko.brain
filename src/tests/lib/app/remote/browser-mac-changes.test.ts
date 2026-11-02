// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setupLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// jsdom has no layout (same shims as browser-open-note.test.ts).
class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
Element.prototype.scrollTo = () => {};

vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() } }));
vi.mock('#lib/features/file-icons/file-icons.icon-data.js', () => ({
	getIconSync: vi.fn(),
	getAllIconPacks: vi.fn(() => []),
	getIconsForPack: vi.fn(() => []),
	preloadPacks: vi.fn(),
	setOnPacksLoaded: vi.fn(),
}));

import { flushSync, mount, unmount } from 'svelte';
import { appBlockLinks, appEditorHost, appFencedBlockRenderers } from '#lib/app/editor-host.js';
import { remoteConnectionStore } from '#lib/app/remote/remote-connection.store.svelte.js';
import { startRemoteSession } from '#lib/app/remote/remote-session.js';
import { installTauriBridgeStandIn } from '#lib/app/remote/tauri-bridge-stand-in.js';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
import MarkdownEditor from '#lib/core/markdown-editor/MarkdownEditor.svelte';
import { setRemoteBrowser } from '#lib/core/platform/capabilities.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';
import { createFakeHost, type FakeHost, type FakeVault } from './fake-host';

/**
 * Mac-side changes reaching an open browser: the real session, bridge
 * stand-in, `initializeVault` (watcher wiring included), the
 * `vault-index-updated` listener and the editor, over an in-process fake host
 * that forwards Rust events and can be reconnected to.
 */

const VAULT = '/vault';
const ALPHA = `${VAULT}/Alpha.md`;
const BRAVO = `${VAULT}/Bravo.md`;
const NEW_NOTE = `${VAULT}/Charlie.md`;

/** Past the lifecycle's 300 ms watcher debounce. */
const WATCHER_DEBOUNCE_MS = 350;

const settle = async (rounds = 10) => {
	for (let i = 0; i < rounds; i++) {
		await new Promise((r) => setTimeout(r, 0));
		flushSync();
	}
};
const afterWatcher = async () => {
	await new Promise((r) => setTimeout(r, WATCHER_DEBOUNCE_MS));
	await settle();
};

const mounted: Record<string, unknown>[] = [];
const cleanups: (() => void)[] = [];

afterEach(async () => {
	for (const c of mounted.splice(0)) unmount(c);
	for (const stop of cleanups.splice(0)) stop();
	const { teardownVault } = await import('#lib/app/lifecycle/app-lifecycle.service.js');
	teardownVault();
	editorStore.reset();
	document.body.innerHTML = '';
	const g = window as unknown as Record<string, unknown>;
	delete g.__TAURI_INTERNALS__;
	delete g.__TAURI_EVENT_PLUGIN_INTERNALS__;
	vaultStore.close();
	remoteConnectionStore.reset();
	setRemoteBrowser(false);
});

async function bootBrowser(): Promise<{ host: FakeHost; vault: FakeVault }> {
	const vault: FakeVault = {
		root: VAULT,
		files: {
			[ALPHA]: '# Alpha\n\nfirst version\n',
			[BRAVO]: '# Bravo\n\nbravo body\n',
			[`${VAULT}/.kokobrain/settings.json`]: '{}',
			[`${VAULT}/.kokobrain/folder-order.json`]: '{}',
		},
		entries: [entryV2(ALPHA, { title: 'Alpha' }), entryV2(BRAVO, { title: 'Bravo' })],
	};
	const host = createFakeHost(vault);
	let first = true;
	const open = () => {
		if (!first) return host.connect();
		first = false;
		return host.socket;
	};
	const invoke = startRemoteSession({ open, reload: () => {} });
	installTauriBridgeStandIn({ hasTauriRuntime: false, connect: () => invoke });
	host.socket.welcome(VAULT);

	const { registerAppPorts } = await import('#lib/app/boot.js');
	const { registerVaultIndexUpdatedListener } = await import('#lib/app/tauri-listeners.service.js');
	const { initializeVault } = await import('#lib/app/lifecycle/app-lifecycle.service.js');
	registerAppPorts();
	cleanups.push(registerVaultIndexUpdatedListener());
	await settle();
	vaultStore.requestPromptIndexRefresh();
	await initializeVault(VAULT);
	await settle();
	return { host, vault };
}

function mountEditor(): () => string {
	const target = document.body.appendChild(document.createElement('div'));
	mounted.push(
		mount(MarkdownEditor, {
			target,
			props: { host: appEditorHost, renderers: appFencedBlockRenderers, blockLinks: appBlockLinks },
		}),
	);
	flushSync();
	return () => (target.querySelector('.cm-content') as HTMLElement).textContent ?? '';
}

const treePaths = (nodes: FileTreeNode[] = fsStore.fileTree): string[] =>
	nodes.flatMap((n) => [n.path, ...treePaths(n.children ?? [])]);

describe('browser: Mac changes show up', () => {
	it('an edit on the Mac to an open clean note updates its rendered content', async () => {
		const { host, vault } = await bootBrowser();
		await openFileInEditor(ALPHA);
		const text = mountEditor();
		await settle();
		expect(text()).toContain('first version');

		vault.files[ALPHA] = '# Alpha\n\nedited on the Mac\n';
		host.emit('vault-files-changed', { paths: [ALPHA] });
		await afterWatcher();

		expect(text()).toContain('edited on the Mac');
		expect(text()).not.toContain('first version');
		const tab = editorStore.tabs.find((t) => t.path === ALPHA);
		expect(tab?.content).toBe('# Alpha\n\nedited on the Mac\n');
		expect(tab?.savedContent).toBe(tab?.content);
		expect(host.refused).toEqual([]);
	});

	it('keeps the buffer of a dirty tab when the Mac changes the same note', async () => {
		const { host, vault } = await bootBrowser();
		// Bravo stays clean: its reload proves the event was forwarded and handled.
		await openFileInEditor(BRAVO);
		await openFileInEditor(ALPHA);
		const text = mountEditor();
		await settle();
		editorStore.updateContent('# Alpha\n\ntyped in the browser\n');
		await settle();

		vault.files[ALPHA] = '# Alpha\n\nedited on the Mac\n';
		vault.files[BRAVO] = '# Bravo\n\nbravo edited on the Mac\n';
		host.emit('vault-files-changed', { paths: [ALPHA, BRAVO] });
		await afterWatcher();

		expect(editorStore.tabs.find((t) => t.path === BRAVO)?.content).toBe('# Bravo\n\nbravo edited on the Mac\n');
		const tab = editorStore.tabs.find((t) => t.path === ALPHA);
		expect(tab?.content).toBe('# Alpha\n\ntyped in the browser\n');
		expect(text()).not.toContain('edited on the Mac');
	});

	it('a note created or deleted on the Mac enters or leaves the tree', async () => {
		const { host, vault } = await bootBrowser();
		expect(treePaths()).toEqual([ALPHA, BRAVO]);

		vault.files[NEW_NOTE] = '# Charlie\n';
		host.emit('vault-files-changed', { paths: [NEW_NOTE] });
		await afterWatcher();
		expect(treePaths()).toEqual([ALPHA, BRAVO, NEW_NOTE]);

		delete vault.files[BRAVO];
		host.emit('vault-files-changed', { paths: [BRAVO] });
		await afterWatcher();
		expect(treePaths()).toEqual([ALPHA, NEW_NOTE]);
	});

	it('a forwarded vault-index-updated refreshes the note list entries', async () => {
		const { host, vault } = await bootBrowser();
		expect(typeDefinitionsStore.entries.map((e) => e.path).sort()).toEqual([ALPHA, BRAVO]);
		expect(vaultStore.vaultIndexVersion).toBe(7);

		vault.entries = [...(vault.entries ?? []), entryV2(NEW_NOTE, { title: 'Charlie' })];
		vaultStore.requestPromptIndexRefresh();
		host.emit('vault-index-updated', { changed: true, affected: [], version: 8, upserted: [], removed: [], fullRescan: true });
		await settle();

		expect(vaultStore.vaultIndexVersion).toBe(8);
		expect(typeDefinitionsStore.entries.map((e) => e.path).sort()).toEqual([ALPHA, BRAVO, NEW_NOTE]);
	});

	it('after a reconnect refreshes once: tree, entries and clean tabs reload, a dirty tab is kept', async () => {
		const { host, vault } = await bootBrowser();
		await openFileInEditor(ALPHA);
		await openFileInEditor(BRAVO);
		await settle();
		editorStore.updateContent('# Bravo\n\nunsaved browser edit\n');

		host.socket.drop();
		await settle();
		expect(remoteConnectionStore.status).toBe('disconnected');

		// Changes made on the Mac while the browser was away: no events arrive for them.
		vault.files[ALPHA] = '# Alpha\n\nchanged while away\n';
		vault.files[BRAVO] = '# Bravo\n\nchanged on the Mac too\n';
		vault.files[NEW_NOTE] = '# Charlie\n';
		vault.entries = [...(vault.entries ?? []), entryV2(NEW_NOTE, { title: 'Charlie' })];
		const before = host.calls.length;

		// The session retries after 1 s on a new socket.
		await new Promise((r) => setTimeout(r, 1050));
		expect(host.latest()).not.toBe(host.socket);
		host.latest().welcome(VAULT);
		await settle(20);

		expect(remoteConnectionStore.status).toBe('connected');
		expect(treePaths()).toEqual([ALPHA, BRAVO, NEW_NOTE]);
		expect(typeDefinitionsStore.entries.map((e) => e.path).sort()).toEqual([ALPHA, BRAVO, NEW_NOTE]);
		expect(editorStore.tabs.find((t) => t.path === ALPHA)?.content).toBe('# Alpha\n\nchanged while away\n');
		expect(editorStore.tabs.find((t) => t.path === BRAVO)?.content).toBe('# Bravo\n\nunsaved browser edit\n');
		// One refresh: one tree scan of the root and one entries read after the welcome.
		const after = host.calls.slice(before);
		expect(after.filter((c) => c.cmd === 'scan_vault' && c.args?.path === VAULT)).toHaveLength(1);
		expect(after.filter((c) => c.cmd === 'get_all_vault_entries_v2')).toHaveLength(1);
		expect(host.refused).toEqual([]);
	});
});
