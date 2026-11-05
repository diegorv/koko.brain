// @vitest-environment jsdom
// An `openView` meta-bind button in the app editor, over the real stores, the
// real editor service and the real app shell: only Tauri and the toast are
// mocked. It opens what a click on the view's row in the menu opens.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLocalStorage, setupLocalStorage } from '../../fixtures/localStorage.fixture';

setupLocalStorage();

// virtua mounts rows only after ResizeObserver reports sizes and skips targets
// without offsetParent; jsdom has neither. Same shim as RailNoteList.view.test.ts.
class ResizeObserverStub {
	private cb: ResizeObserverCallback;
	constructor(cb: ResizeObserverCallback) {
		this.cb = cb;
	}
	observe(el: Element) {
		const height = (el as HTMLElement).style?.overflowY === 'auto' ? 600 : 60;
		queueMicrotask(() =>
			this.cb([{ target: el, contentRect: { height, width: 240 } } as unknown as ResizeObserverEntry], this as unknown as ResizeObserver),
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
Element.prototype.scrollTo ??= () => {};
Element.prototype.scrollIntoView ??= () => {};

/** The files on the mocked disk, by path. */
const files = vi.hoisted(() => ({}) as Record<string, string>);

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(async () => null), convertFileSrc: (p: string) => p }));
vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	exists: vi.fn(),
}));
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => ({ setBadgeCount: vi.fn(async () => {}) }) }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn() }));
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));
vi.mock('#lib/features/file-icons/file-icons.icon-data.js', () => ({
	getIconSync: vi.fn(),
	getAllIconPacks: vi.fn(() => []),
	getIconsForPack: vi.fn(() => []),
	preloadPacks: vi.fn(),
	setOnPacksLoaded: vi.fn(),
}));
vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() } }));

import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { createRawSnippet, flushSync, mount, tick, unmount } from 'svelte';
import { toast } from 'svelte-sonner';
import { invoke } from '@tauri-apps/api/core';
import { exists, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import AppShell from '#lib/app/AppShell.svelte';
import { appEditorHost } from '#lib/app/editor-host.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
import { editorHost } from '#lib/core/markdown-editor/editor-host.js';
import type { ButtonAction } from '#lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.js';
import { MetaBindButtonWidget } from '#lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { buildNoteRecord } from '#lib/features/collection/collection.logic.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { FILES_RAIL_ITEM, TYPES_RAIL_ITEM } from '#lib/features/rail-shell/lens.logic.js';
import { buildTypeMetadataMap } from '#lib/features/type-definitions/type-definitions.logic.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { clearAllViewParseCache } from '#lib/features/type-definitions/view-parse-cache.js';
import { entryV2 } from '../../fixtures/vault-entries.fixture';

const PROJECTS = '/vault/_system/views/Projects.view';
const BOARD = '/vault/_system/views/Board.view';
const HIDDEN = '/vault/_system/views/Hidden.view';

const PROJECTS_YAML = `filters: "_type == 'Project'"
views:
  - type: table
    name: Projects
`;
const BOARD_YAML = `_open_in_editor: true
_visible: false
views:
  - type: kanban
    name: Board
`;
const HIDDEN_YAML = `_visible: false
filters: "_type == 'Project'"
views:
  - type: table
    name: Hidden
`;

const NOTES: Record<string, string> = {
	'/vault/Work/alpha.md': '---\n_type: Project\n---\n',
	'/vault/Work/beta.md': '---\n_type: Project\n---\n',
	'/vault/person.md': '---\n_type: Person\n---\n',
};

const file = (path: string): FileTreeNode => ({ name: path.split('/').pop()!, path, isDirectory: false });
const folder = (path: string, children: FileTreeNode[]): FileTreeNode => ({ name: path.split('/').pop()!, path, isDirectory: true, children });

const TREE: FileTreeNode[] = [
	folder('/vault/_system', [folder('/vault/_system/views', [file(BOARD), file(HIDDEN), file(PROJECTS)])]),
	folder('/vault/Work', [file('/vault/Work/alpha.md'), file('/vault/Work/beta.md')]),
	file('/vault/person.md'),
	file('/vault/Project.md'),
];

const ENTRIES = [
	entryV2('/vault/Project.md', { isA: 'Type' }),
	entryV2('/vault/Work/alpha.md', { isA: 'Project' }),
	entryV2('/vault/Work/beta.md', { isA: 'Project' }),
	entryV2('/vault/person.md', { isA: 'Person' }),
	entryV2(PROJECTS, { frontmatter: { _sidebar_label: 'Projetos' } }),
	entryV2(BOARD, { frontmatter: { _open_in_editor: true, _visible: false } }),
	entryV2(HIDDEN, { frontmatter: { _visible: false } }),
];

async function settle(rounds = 12) {
	for (let i = 0; i < rounds; i++) {
		await tick();
		flushSync();
	}
}

const views: EditorView[] = [];

/** Renders a button with `actions` in an editor with the app host installed, and clicks it. */
async function clickButton(actions: ButtonAction[]): Promise<void> {
	const view = new EditorView({
		state: EditorState.create({ doc: '', extensions: editorHost.of(appEditorHost) }),
		parent: document.body.appendChild(document.createElement('div')),
	});
	views.push(view);
	const dom = new MetaBindButtonWidget({ label: 'Projetos', style: 'default', actions }).toDOM(view);
	dom.querySelector('button')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
	await settle();
}

beforeAll(() => {
	// jsdom has no layout; an opened tab's scroll restore makes CodeMirror measure.
	Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList;
	Range.prototype.getBoundingClientRect ??= () => new DOMRect();
});

beforeEach(() => {
	vi.clearAllMocks();
	clearLocalStorage();
	settingsStore.reset();
	settingsStore.setSettings({ ...settingsStore.settings, explicitOrganization: false });
	editorStore.reset();
	fsStore.reset();
	vaultStore._reset();
	vaultStore.open('/vault');
	typeDefinitionsStore.reset();
	collectionStore.reset();
	clearAllViewParseCache();
	for (const p of Object.keys(files)) delete files[p];
	files[PROJECTS] = PROJECTS_YAML;
	files[BOARD] = BOARD_YAML;
	files[HIDDEN] = HIDDEN_YAML;
	vi.mocked(readTextFile).mockImplementation(async (p) => {
		const content = files[String(p)];
		if (content === undefined) throw new Error(`not found: ${String(p)}`);
		return content;
	});
	vi.mocked(exists).mockImplementation(async (p) => files[String(p)] !== undefined);
	fsStore.setFileTree(TREE);
	typeDefinitionsStore.setEntries(ENTRIES);
	typeDefinitionsStore.setTypeMetadataMap(buildTypeMetadataMap(ENTRIES));
	collectionStore.setPropertyIndex(new Map(Object.entries(NOTES).map(([p, c]) => [p, buildNoteRecord(p, c)])));
	settingsStore.updateLayout({ railItem: FILES_RAIL_ITEM, railPanelsVisible: false });
});

afterEach(() => {
	for (const v of views.splice(0)) v.destroy();
	document.body.innerHTML = '';
});

describe('an openView meta-bind button in the app editor', () => {
	it('opens a hidden _open_in_editor view as the active tab and leaves the layout', async () => {
		const before = { ...settingsStore.layout };

		await clickButton([{ type: 'openView', path: '_system/views/Board.view' }]);

		await vi.waitFor(() => expect(editorStore.activeTab?.path).toBe(BOARD));
		expect(editorStore.activeTab?.content).toBe(BOARD_YAML);
		expect(settingsStore.layout).toEqual(before);
		expect(toast.error).not.toHaveBeenCalled();
	});

	describe('with the app shell mounted', () => {
		let target: HTMLElement;
		let component: Record<string, unknown> | null = null;

		const rowTitles = () =>
			[...target.querySelectorAll<HTMLElement>('[data-note-row]')].map((el) => el.querySelector('.truncate')?.textContent?.trim() ?? '');

		beforeEach(async () => {
			target = document.body.appendChild(document.createElement('div'));
			const children = createRawSnippet(() => ({ render: () => '<div></div>' }));
			component = mount(AppShell, { target, props: { children } });
			await settle();
		});

		afterEach(() => {
			if (component) unmount(component);
			component = null;
		});

		it('picks an ordinary view while another rail item is active, and the note list shows its rows', async () => {
			await clickButton([{ type: 'openView', path: '_system/views/Projects.view' }]);

			expect(settingsStore.layout.railItem).toBe(TYPES_RAIL_ITEM);
			expect(settingsStore.layout.railTypesLens).toEqual({ kind: 'view', target: PROJECTS });
			expect(settingsStore.layout.railPanelsVisible).toBe(true);
			await vi.waitFor(() => expect(rowTitles()).toEqual(['alpha', 'beta']));
			expect(target.querySelector(`[data-types-navigator-view="${PROJECTS}"]`)?.getAttribute('aria-current')).toBe('true');
			expect(editorStore.tabs).toEqual([]);
			expect(toast.error).not.toHaveBeenCalled();
		});

		it('picks a _visible: false view, which has no row, and the note list shows its rows', async () => {
			await clickButton([{ type: 'openView', path: '_system/views/Hidden.view' }]);

			expect(settingsStore.layout.railItem).toBe(TYPES_RAIL_ITEM);
			await vi.waitFor(() => expect(rowTitles()).toEqual(['alpha', 'beta']));
			expect(settingsStore.layout.railTypesLens).toEqual({ kind: 'view', target: HIDDEN });
			expect(target.querySelector(`[data-types-navigator-view="${HIDDEN}"]`)).toBeNull();
			expect(editorStore.tabs).toEqual([]);
			expect(toast.error).not.toHaveBeenCalled();
		});
	});

	it('names a missing view, creates nothing and stops the later actions', async () => {
		const before = { ...settingsStore.layout };

		await clickButton([
			{ type: 'openView', path: '_system/views/Gone.view' },
			{ type: 'createNote', fileName: 'Next' },
		]);

		expect(toast.error).toHaveBeenCalledTimes(1);
		expect(vi.mocked(toast.error).mock.calls[0][0]).toBe('Button cannot open view "_system/views/Gone.view": file not found');
		expect(writeTextFile).not.toHaveBeenCalled();
		expect(invoke).not.toHaveBeenCalled();
		expect(editorStore.tabs).toEqual([]);
		expect(settingsStore.layout).toEqual(before);
	});
});
