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
import { onContentChange, openFileInEditor } from '#lib/core/editor/editor.service.js';
import { setNoteWriter } from '#lib/core/editor/note-write.port.js';
import { createFile } from '#lib/core/filesystem/fs.service.js';
import { NOTE_CONFLICT_MESSAGE } from '#lib/contracts/note-conflict.js';
import { toast } from 'svelte-sonner';
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
 * Editing and saving from the browser: the real session, bridge stand-in,
 * `initializeVault` (watcher wiring included), the editor's autosave and the
 * browser's note writer, over an in-process fake host that checks each note
 * write against its base as the Mac host does.
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
	setNoteWriter(null);
	vi.useRealTimers();
	vi.mocked(toast.error).mockClear();
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

/** Past the editor's 2 s body autosave debounce. */
const AUTOSAVE_MS = 2100;
/** Past the editor's 5 s retry after a failed save. */
const RETRY_MS = 5500;

const alphaTab = () => editorStore.tabs.find((t) => t.path === ALPHA);

describe('browser: edit and save', () => {
	it('an edit autosaves to the vault on the Mac and the tab is clean', async () => {
		const { host, vault } = await bootBrowser();
		await openFileInEditor(ALPHA);
		onContentChange('# Alpha\n\ntyped in the browser\n');
		await new Promise((r) => setTimeout(r, AUTOSAVE_MS));
		await settle();

		expect(vault.files[ALPHA]).toBe('# Alpha\n\ntyped in the browser\n');
		expect(host.writes).toEqual([
			{ path: ALPHA, text: '# Alpha\n\ntyped in the browser\n', base: '# Alpha\n\nfirst version\n', accepted: true },
		]);
		expect(alphaTab()?.savedContent).toBe(alphaTab()?.content);
		expect(host.refused).toEqual([]);
	});

	it('a Mac edit re-read by the index refresh does not let the stale dirty tab save over it', async () => {
		const { host, vault } = await bootBrowser();
		await openFileInEditor(ALPHA);
		const text = mountEditor();
		await settle();
		// Typed into CodeMirror, as the user does.
		const view = editorStore.editorView!;
		view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: '# Alpha\n\ntyped in the browser\n' } });
		await settle();
		expect(alphaTab()?.content).toBe('# Alpha\n\ntyped in the browser\n');

		// The Mac saves the same note before the browser's autosave fires; the
		// forwarded watcher event makes the browser re-read it from the host.
		vault.files[ALPHA] = '# Alpha\n\nedited on the Mac\n';
		const before = host.calls.length;
		host.emit('vault-files-changed', { paths: [ALPHA] });
		await afterWatcher();
		const reread = host.calls.slice(before).filter(
			(c) =>
				(c.cmd === 'read_files_batch' && (c.args?.paths as string[]).includes(ALPHA)) ||
				(c.cmd === 'plugin:fs|read_text_file' && c.args?.path === ALPHA),
		);
		expect(reread.length).toBeGreaterThan(0);

		await new Promise((r) => setTimeout(r, AUTOSAVE_MS));
		await settle();

		expect(vault.files[ALPHA]).toBe('# Alpha\n\nedited on the Mac\n');
		expect(host.writes).toEqual([
			{ path: ALPHA, text: '# Alpha\n\ntyped in the browser\n', base: '# Alpha\n\nfirst version\n', accepted: false },
		]);
		expect(toast.error).toHaveBeenCalledWith(NOTE_CONFLICT_MESSAGE);
		expect(alphaTab()?.content).toBe('# Alpha\n\ntyped in the browser\n');
		expect(alphaTab()?.savedContent).toBe('# Alpha\n\nfirst version\n');
		expect(text()).toContain('typed in the browser');

		// No 5 s retry, and later typing does not resend the stale write.
		await new Promise((r) => setTimeout(r, RETRY_MS));
		onContentChange('# Alpha\n\ntyped in the browser, more\n');
		await new Promise((r) => setTimeout(r, AUTOSAVE_MS));
		await settle();
		expect(host.writes).toHaveLength(1);
		expect(vault.files[ALPHA]).toBe('# Alpha\n\nedited on the Mac\n');
	}, 20_000);

	it('a note created in the browser is written on the Mac', async () => {
		const { host, vault } = await bootBrowser();
		const path = await createFile(VAULT, 'Charlie.md', '# Charlie\n');
		await settle();

		expect(path).toBe(NEW_NOTE);
		expect(vault.files[NEW_NOTE]).toBe('# Charlie\n');
		expect(host.calls.some((c) => c.cmd === 'create_note' && c.args?.path === NEW_NOTE)).toBe(true);
		expect(treePaths()).toContain(NEW_NOTE);
		expect(host.refused).toEqual([]);
	});
});
