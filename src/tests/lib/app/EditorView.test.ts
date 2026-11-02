// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import { setupLocalStorage } from '../../fixtures/localStorage.fixture';

setupLocalStorage();

// The markdown editor's context menu (bits-ui, @floating-ui/dom) needs ResizeObserver.
class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
// jsdom has no element scrolling; the editor restores scroll positions in a rAF.
Element.prototype.scrollTo ??= () => {};
// The system clipboard is a side-effect boundary.
const writeText = vi.fn((_text: string) => Promise.resolve());
Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn(() => Promise.resolve(vi.fn())),
	emit: vi.fn(),
}));

// Icon packs load lazily from bundled data; the lookup is stubbed so the
// test controls which icon a type resolves to.
vi.mock('#lib/features/file-icons/file-icons.icon-data.js', () => ({
	getIconSync: vi.fn(),
	preloadPacks: vi.fn(),
	setOnPacksLoaded: vi.fn(),
}));

import { getIconSync } from '#lib/features/file-icons/file-icons.icon-data.js';
import { registerAppPorts, unregisterAppPorts } from '#lib/app/boot.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { TAGS_VIRTUAL_PATH } from '#lib/core/editor/editor.logic.js';
import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import EditorView from '#lib/app/EditorView.svelte';
import type { EditorView as CodeMirrorView } from '@codemirror/view';
import { appEditorHost, appFencedBlockRenderers } from '#lib/app/editor-host.js';
import { fencedBlockRenderers } from '#lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.js';
import { editorHost, NOOP_HOST } from '#lib/core/markdown-editor/editor-host.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { tocStore } from '#lib/plugins/table-of-contents/toc.store.svelte.js';
import { entryV2 } from '../../fixtures/vault-entries.fixture';

const ROCKET_PATH = 'M1 2L3 4';

describe('EditorView tab icons', () => {
	let component: Record<string, unknown> | null = null;

	// The app wiring gives the icon resolver its type lookup.
	beforeAll(() => registerAppPorts());
	afterAll(() => unregisterAppPorts());

	beforeEach(() => {
		editorStore.reset();
		fileIconsStore.reset();
		typeDefinitionsStore.reset();
		vi.mocked(getIconSync).mockReturnValue({
			name: 'rocket',
			pack: 'lucide',
			svgContent: `<path d="${ROCKET_PATH}"/>`,
			viewBox: '0 0 24 24',
			keywords: [],
		});
		// A Project type whose definition note carries a rocket icon and a title color.
		typeDefinitionsStore.setEntries([
			entryV2('/vault/Project.md', { title: 'Project', isA: 'Type' }),
			entryV2('/vault/my-project.md', { title: 'my-project', isA: 'Project' }),
		]);
		fileIconsStore.setFrontmatterIcons(
			new Map([['/vault/Project.md', { iconPack: 'lucide', iconName: 'rocket', titleColor: '#ff8800' }]]),
		);
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	/** Mounts EditorView with a typed note tab and an active Tags tab; returns the tab elements. */
	function render(): HTMLElement[] {
		editorStore.addTab({ path: '/vault/my-project.md', name: 'my-project', content: '', savedContent: '' });
		editorStore.addTab({ path: TAGS_VIRTUAL_PATH, name: 'Tags', content: '', savedContent: '', fileType: 'tags' });
		const target = document.body.appendChild(document.createElement('div'));
		component = mount(EditorView, { target });
		flushSync();
		return [...target.querySelectorAll<HTMLElement>('[role="tab"]')];
	}

	it("shows a note tab with its type's icon and title color", () => {
		const [noteTab] = render();

		expect(noteTab.textContent).toContain('my-project');
		expect(noteTab.querySelector(`svg path[d="${ROCKET_PATH}"]`)).not.toBeNull();
		// jsdom normalizes the hex to rgb()
		expect(noteTab.querySelector<HTMLElement>('span.truncate')!.style.color).toBe('rgb(255, 136, 0)');
	});

	it('shows a virtual tab with its fixed icon, not a resolved one', () => {
		const [, tagsTab] = render();

		expect(tagsTab.textContent).toContain('Tags');
		expect(tagsTab.querySelector(`svg path[d="${ROCKET_PATH}"]`)).toBeNull();
		expect(tagsTab.querySelector('svg')).not.toBeNull();
	});
});

describe('EditorView markdown editor host', () => {
	let component: Record<string, unknown> | null = null;

	beforeAll(() => registerAppPorts());
	afterAll(() => unregisterAppPorts());

	beforeEach(() => {
		editorStore.reset();
		settingsStore.reset();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		settingsStore.reset();
	});

	/** Mounts EditorView on a markdown note tab; returns the mounted CodeMirror view. */
	function renderNote(): CodeMirrorView {
		editorStore.addTab({ path: '/vault/note.md', name: 'note', content: '# Note\n\n[[Other]]', savedContent: '' });
		const target = document.body.appendChild(document.createElement('div'));
		component = mount(EditorView, { target });
		flushSync();
		const view = editorStore.editorView;
		expect(view).not.toBeNull();
		return view!;
	}

	it("installs the app's host, not NOOP_HOST", () => {
		const view = renderNote();

		expect(view.state.facet(editorHost)).toBe(appEditorHost);
		expect(view.state.facet(editorHost)).not.toBe(NOOP_HOST);
	});

	it('installs the queryjs and collection renderers, and keeps them in source mode', () => {
		const view = renderNote();
		const installed = () => [...view.state.facet(fencedBlockRenderers).values()];

		expect([...view.state.facet(fencedBlockRenderers).keys()].sort()).toEqual(['collection', 'queryjs']);
		expect(installed()).toEqual([...appFencedBlockRenderers]);
		editorStore.setLivePreview(false);
		flushSync();
		expect(installed()).toEqual([...appFencedBlockRenderers]);
		editorStore.setLivePreview(true);
		flushSync();
	});

	it('keeps the host in source mode', () => {
		const view = renderNote();

		editorStore.setLivePreview(false);
		flushSync();

		expect(view.state.facet(editorHost)).toBe(appEditorHost);
		editorStore.setLivePreview(true);
		flushSync();
	});

	it('toggling profiling or periodic-notes settings reconfigures nothing and keeps the host', async () => {
		const view = renderNote();
		// Let the mount-time language load land before watching.
		await new Promise((r) => setTimeout(r, 0));
		const hostBefore = view.state.facet(editorHost);
		const update = vi.spyOn(view, 'update');

		settingsStore.updateLivePreviewProfiling(true);
		flushSync();
		settingsStore.updateLivePreviewProfiling(false);
		flushSync();
		settingsStore.updatePeriodicNotes({
			...settingsStore.periodicNotes,
			folder: 'Daily',
			daily: { ...settingsStore.periodicNotes.daily, format: 'YYYY-MM-DD' },
		});
		flushSync();

		const transactions = update.mock.calls.flatMap(([trs]) => trs);
		expect(transactions.filter((tr) => tr.reconfigured)).toEqual([]);
		expect(view.state.facet(editorHost)).toBe(hostBefore);
		update.mockRestore();
	});

	it('the action bar\'s TOC button opens the table of contents on the note', () => {
		renderNote();
		settingsStore.updateLayout({ rightSidebarVisible: false, tableOfContentsVisible: false });
		flushSync();

		const toc = document.body.querySelector<HTMLButtonElement>('button[aria-label="Show the table of contents"]');
		toc!.click();
		flushSync();

		expect(settingsStore.layout.rightSidebarVisible).toBe(true);
		expect(settingsStore.layout.tableOfContentsVisible).toBe(true);
		expect(tocStore.expandedPath).toBe('/vault/note.md');
	});

	it('the context menu\'s Copy link to block copies the heading link', async () => {
		renderNote();
		writeText.mockClear();

		document.body
			.querySelector('.absolute.inset-0')!
			.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 1, clientY: 1 }));
		flushSync();
		await new Promise((r) => setTimeout(r, 0));
		const item = [...document.body.querySelectorAll<HTMLElement>('[data-slot="context-menu-item"]')].find((el) =>
			el.textContent?.includes('Copy link to block'),
		);
		item!.click();
		await new Promise((r) => setTimeout(r, 0));

		// The cursor sits on `# Note`, the first line.
		expect(writeText).toHaveBeenCalledWith('[[note#Note]]');
	});
});
