// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setupLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// jsdom has no layout: virtua needs sizes from ResizeObserver and an
// offsetParent (same shim as RailNoteList.test.ts), the editor restores a
// tab's scroll position.
class ResizeObserverStub {
	private cb: ResizeObserverCallback;
	constructor(cb: ResizeObserverCallback) {
		this.cb = cb;
	}
	observe(el: Element) {
		const height = (el as HTMLElement).style?.overflowY === 'auto' ? 600 : 60;
		queueMicrotask(() =>
			this.cb(
				[{ target: el, contentRect: { height, width: 240 } } as unknown as ResizeObserverEntry],
				this as unknown as ResizeObserver,
			),
		);
	}
	unobserve() {}
	disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
	get() {
		return this.parentElement;
	},
	configurable: true,
});
Element.prototype.scrollTo = () => {};

vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() } }));
// The icon packs are large lazy JSON imports (same mock as RailNoteList.test.ts).
vi.mock('#lib/features/file-icons/file-icons.icon-data.js', () => ({
	getIconSync: vi.fn(),
	getAllIconPacks: vi.fn(() => []),
	getIconsForPack: vi.fn(() => []),
	preloadPacks: vi.fn(),
	setOnPacksLoaded: vi.fn(),
}));

import { flushSync, mount, tick, unmount } from 'svelte';
import { appBlockLinks, appEditorHost, appFencedBlockRenderers } from '#lib/app/editor-host.js';
import { remoteConnectionStore } from '#lib/app/remote/remote-connection.store.svelte.js';
import { startRemoteSession } from '#lib/app/remote/remote-session.js';
import { installTauriBridgeStandIn } from '#lib/app/remote/tauri-bridge-stand-in.js';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import MarkdownEditor from '#lib/core/markdown-editor/MarkdownEditor.svelte';
import { setRemoteBrowser } from '#lib/core/platform/capabilities.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { neighbourhoodLens } from '#lib/features/rail-shell/lens.logic.js';
import RailNoteList from '#lib/features/rail-shell/RailNoteList.svelte';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { entryV2, entryV2WithContent } from '../../../fixtures/vault-entries.fixture';
import { createFakeHost } from './fake-host';

/**
 * The browser's read path end to end: the real session, bridge stand-in,
 * `initializeVault`, `vault-index-updated` listener, editor and rail note
 * list, over an in-process fake host. Opens a note, follows its wikilink,
 * then shows the target's neighbourhood lens, asserting on rendered text.
 */

const VAULT = '/vault';
const ALPHA = `${VAULT}/Alpha.md`;
const BRAVO = `${VAULT}/Notes/Bravo.md`;
const ALPHA_TEXT = [
	'---',
	'status: active',
	'---',
	'# Alpha heading',
	'',
	'> [!note] Callout title',
	'> Callout body',
	'',
	'| Name | Score |',
	'| --- | --- |',
	'| ada | 42 |',
	'',
	'- [ ] open task',
	'- [x] done task',
	'',
	'See [[Bravo]] next.',
	'',
].join('\n');
const BRAVO_TEXT = '# Bravo heading\n\nBravo body text.\n';

const settle = async (rounds = 10) => {
	for (let i = 0; i < rounds; i++) {
		await new Promise((r) => setTimeout(r, 0));
		flushSync();
	}
};

const mounted: Record<string, unknown>[] = [];
const cleanups: (() => void)[] = [];

afterEach(async () => {
	for (const c of mounted.splice(0)) unmount(c);
	for (const stop of cleanups.splice(0)) stop();
	const { teardownVault } = await import('#lib/app/lifecycle/app-lifecycle.service.js');
	teardownVault();
	document.body.innerHTML = '';
	const g = window as unknown as Record<string, unknown>;
	delete g.__TAURI_INTERNALS__;
	delete g.__TAURI_EVENT_PLUGIN_INTERNALS__;
	vaultStore.close();
	remoteConnectionStore.reset();
	setRemoteBrowser(false);
});

async function bootBrowser(extra: Record<string, string> = {}) {
	const host = createFakeHost({
		root: VAULT,
		// A vault the desktop has opened carries `.kokobrain/`, so the boot
		// only reads it, as it does over the real host.
		files: {
			[ALPHA]: ALPHA_TEXT,
			[BRAVO]: BRAVO_TEXT,
			...extra,
			[`${VAULT}/.kokobrain/settings.json`]: '{}',
			[`${VAULT}/.kokobrain/folder-order.json`]: '{}',
		},
		entries: [entryV2WithContent(ALPHA, ALPHA_TEXT, { title: 'Alpha' }), entryV2(BRAVO, { title: 'Bravo' })],
	});
	const invoke = startRemoteSession({ open: () => host.socket, reload: () => {} });
	installTauriBridgeStandIn({ hasTauriRuntime: false, connect: () => invoke });
	host.socket.welcome(VAULT);

	const { registerAppPorts } = await import('#lib/app/boot.js');
	const { registerVaultIndexUpdatedListener } = await import('#lib/app/tauri-listeners.service.js');
	const { initializeVault } = await import('#lib/app/lifecycle/app-lifecycle.service.js');
	registerAppPorts();
	cleanups.push(registerVaultIndexUpdatedListener());
	await settle();
	// Skips the listener's 2 s throttle; the refresh itself is the desktop's.
	vaultStore.requestPromptIndexRefresh();
	await initializeVault(VAULT);
	await settle();
	return host;
}

function mountEditor(): HTMLElement {
	const target = document.body.appendChild(document.createElement('div'));
	mounted.push(
		mount(MarkdownEditor, {
			target,
			props: { host: appEditorHost, renderers: appFencedBlockRenderers, blockLinks: appBlockLinks },
		}),
	);
	flushSync();
	return target;
}

describe('browser: open a note, follow a link, show a lens', () => {
	it('renders the note, then the wikilink target, then the target neighbourhood', async () => {
		const host = await bootBrowser();

		// The rescan event the session raised after the Virtual scan filled the lens data.
		expect(typeDefinitionsStore.entries.map((e) => e.path).sort()).toEqual([ALPHA, BRAVO]);

		await openFileInEditor(ALPHA);
		const editor = mountEditor();
		await settle();
		const content = () => editor.querySelector('.cm-content') as HTMLElement;

		// Live preview as on the desktop: frontmatter source hidden, callout,
		// table and task widgets rendered, the wikilink shown as a link.
		expect(content().textContent).not.toContain('status: active');
		expect(content().querySelector('.cm-lp-callout-title')?.textContent).toBe('Callout title');
		expect(content().textContent).toContain('Callout body');
		const cells = [...content().querySelectorAll('.cm-lp-table td, .cm-lp-table th')].map((c) => c.textContent);
		expect(cells).toEqual(['Name', 'Score', 'ada', '42']);
		const boxes = [...content().querySelectorAll<HTMLInputElement>('.cm-lp-task-checkbox')];
		expect(boxes.map((b) => [b.parentElement?.textContent?.replace(/\s+/g, ' ').trim(), b.checked])).toEqual([
			['- open task', false],
			['- done task', true],
		]);
		const link = content().querySelector('.cm-lp-wikilink') as HTMLElement;
		expect(link.textContent).toBe('Bravo');

		// A click on the wikilink opens its target through the host.
		link.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
		await settle();
		expect(editorStore.activeTab?.path).toBe(BRAVO);
		expect(content().textContent).toContain('Bravo heading');
		expect(content().textContent).toContain('Bravo body text.');
		expect(content().textContent).not.toContain('Callout body');
		expect(host.calls.filter((c) => c.cmd === 'plugin:fs|read_text_file').map((c) => c.args?.path)).toContain(BRAVO);

		// The target's neighbourhood lens lists the note that links to it.
		const rail = document.body.appendChild(document.createElement('div'));
		mounted.push(mount(RailNoteList, { target: rail, props: { lens: neighbourhoodLens(BRAVO) } }));
		await settle();
		await tick();
		const groups = [...rail.querySelectorAll('[data-note-list-group]')].map((el) => el.textContent?.replace(/\s+/g, ' ').trim());
		expect(groups).toContain('Backlinks 1');
		const titles = [...rail.querySelectorAll('[data-note-row]')].map((el) => el.querySelector('.truncate')?.textContent?.trim());
		expect(titles).toEqual(['Bravo', 'Alpha']);

		// Nothing on the way was a command the host refuses.
		expect(host.refused).toEqual([]);
	});

	it('loads wikilink and file: images from the host asset endpoint', async () => {
		const pics = `${VAULT}/Pics.md`;
		await bootBrowser({
			// The cursor starts on line 1, which shows its source; the embeds come after.
			[pics]: 'Text.\n\n![[Media/my pic.png]]\n\n![shot](file:///vault/Media/shot.jpg)\n',
			[`${VAULT}/Media/my pic.png`]: 'png',
			[`${VAULT}/Media/shot.jpg`]: 'jpg',
		});

		await openFileInEditor(pics);
		const editor = mountEditor();
		await settle();

		const srcs = [...editor.querySelectorAll<HTMLImageElement>('.cm-content img.cm-lp-image')].map((img) => img.getAttribute('src'));
		expect(srcs).toEqual(['/v1/asset/Media/my%20pic.png', '/v1/asset/Media/shot.jpg']);
	});
});
