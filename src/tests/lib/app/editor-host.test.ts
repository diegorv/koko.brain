// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import dayjs from 'dayjs';
import { setupLocalStorage } from '../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(() => Promise.resolve([])),
	convertFileSrc: (path: string) => `asset://localhost/${encodeURIComponent(path)}`,
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(() => Promise.resolve('note body')),
}));

vi.mock('@tauri-apps/plugin-opener', () => ({
	openUrl: vi.fn(() => Promise.resolve()),
}));

vi.mock('#lib/core/editor/editor.service.js', () => ({
	openFileInEditor: vi.fn(),
}));

vi.mock('#lib/core/note-creator/note-creator.service.js', () => ({
	openOrCreateNote: vi.fn(),
}));

// periodic-notes.logic is pure logic (CLAUDE.md: never mock .logic): the real
// detectPeriodicNoteType decides which targets are periodic notes.

import { invoke } from '@tauri-apps/api/core';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { openUrl } from '@tauri-apps/plugin-opener';
import { appEditorHost, openWikilinkTarget } from '#lib/app/editor-host.js';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { flattenFileTree } from '#lib/core/filesystem/file-entries.logic.js';
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
import { resolveWikilink } from '#lib/core/filesystem/wikilink-resolution.logic.js';
import { editorHost } from '#lib/core/markdown-editor/editor-host.js';
import { TableWidget, renderTableSource } from '#lib/core/markdown-editor/extensions/live-preview/widgets.js';
import { followWikilinkClick } from '#lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.js';
import { openOrCreateNote } from '#lib/core/note-creator/note-creator.service.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { invalidateVaultEntries } from '#lib/core/vault/vault-entries.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { buildPeriodicNotePath } from '#lib/plugins/periodic-notes/periodic-notes.logic.js';
import { SEARCH_RAIL_ITEM, TYPES_RAIL_ITEM } from '#lib/features/rail-shell/lens.logic.js';
import { searchStore } from '#lib/features/search/search.store.svelte.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { entryV2 } from '../../fixtures/vault-entries.fixture';

function makeFile(path: string): FileTreeNode {
	const segments = path.split('/');
	return { name: segments[segments.length - 1], path, isDirectory: false };
}

/** Daily notes as `YYYY-MM-DD` in `Daily/`. */
function useDailyFolder(): void {
	settingsStore.updatePeriodicNotes({
		...settingsStore.periodicNotes,
		folder: 'Daily',
		daily: { ...settingsStore.periodicNotes.daily, format: 'YYYY-MM-DD', template: '', templatePath: undefined },
	});
}

/** The `openOrCreateNote` call that creates the 2026-11-01 daily note in `Daily/`. */
function expectDailyNoteCreated(): void {
	expect(openOrCreateNote).toHaveBeenCalledTimes(1);
	expect(vi.mocked(openOrCreateNote).mock.calls[0][0].filePath).toBe(
		buildPeriodicNotePath('/vault', 'Daily', 'YYYY-MM-DD', dayjs('2026-11-01')),
	);
	expect(vi.mocked(openOrCreateNote).mock.calls[0][0].filePath).toBe('/vault/Daily/2026-11-01.md');
}

beforeEach(() => {
	vi.clearAllMocks();
	fsStore.setFileTree([]);
	vaultStore.close();
	settingsStore.reset();
	settingsStore.setSettings({ ...settingsStore.settings, explicitOrganization: false });
	editorStore.reset();
	invalidateVaultEntries();
});

afterEach(() => {
	document.body.innerHTML = '';
});

describe('appEditorHost', () => {
	it('resolveLink resolves against the file tree, null when nothing matches', () => {
		fsStore.setFileTree([makeFile('/vault/Notes/note.md')]);
		expect(appEditorHost.resolveLink('note')).toBe('/vault/Notes/note.md');
		expect(appEditorHost.resolveLink('missing')).toBeNull();
	});

	it('resolveLink resolves a Quick Capture shot embed target to the imported image', () => {
		// The `![[...]]` target executeCaptureAction writes for a staged clipboard shot.
		fsStore.setFileTree([
			makeFile('/vault/Inbox/2026/11/2026-11-02-1000.md'),
			makeFile('/vault/Inbox/2026/11/qc-shot-x.png'),
			makeFile('/vault/Inbox/2026/11/qc-shot-x-1.png'),
		]);
		expect(appEditorHost.resolveLink('Inbox/2026/11/qc-shot-x.png')).toBe('/vault/Inbox/2026/11/qc-shot-x.png');
		expect(appEditorHost.resolveLink('Inbox/2026/11/qc-shot-x-1.png')).toBe('/vault/Inbox/2026/11/qc-shot-x-1.png');
	});

	it('resolveLink resolves a path-style target to its vault-relative path before an earlier path suffix', () => {
		vaultStore.open('/vault');
		fsStore.setFileTree([makeFile('/vault/x/b/foo.png'), makeFile('/vault/b/foo.png')]);
		expect(appEditorHost.resolveLink('b/foo.png')).toBe('/vault/b/foo.png');

		vaultStore.close();
		expect(appEditorHost.resolveLink('b/foo.png')).toBe('/vault/x/b/foo.png');
	});

	describe('resolveLink memo', () => {
		function dir(path: string, children: FileTreeNode[]): FileTreeNode {
			return { name: path.split('/').pop()!, path, isDirectory: true, children };
		}

		/**
		 * A file node whose `path` reads are counted in `counter.reads`. An accessor
		 * on the node itself: a `get` trap on a wrapping Proxy would not count reads
		 * the store makes through its own proxy.
		 */
		function counted(path: string, counter: { reads: number }): FileTreeNode {
			const node = { name: path.split('/').pop()!, isDirectory: false } as FileTreeNode;
			Object.defineProperty(node, 'path', { enumerable: true, get: () => { counter.reads++; return path; } });
			return node;
		}

		it('matches resolveWikilink on collisions, path-style targets, basename fallback and misses', () => {
			vaultStore.open('/vault');
			const tree = [
				dir('/vault/x', [dir('/vault/x/A', [makeFile('/vault/x/A/img.png')])]),
				dir('/vault/A', [makeFile('/vault/A/Note.md'), makeFile('/vault/A/img.png')]),
				dir('/vault/B', [makeFile('/vault/B/note.md'), makeFile('/vault/B/Other.md')]),
				makeFile('/vault/root.md'),
			];
			fsStore.setFileTree(tree);
			const paths = flattenFileTree(tree).map((f) => f.path);
			const targets = ['note', 'NOTE', 'B/note', 'Elsewhere/Other', 'img', 'A/img.png', 'a/IMG.png', 'root', 'missing', 'x/missing', ''];
			for (const target of targets) {
				expect(appEditorHost.resolveLink(target), target).toBe(resolveWikilink(target, paths, '/vault'));
			}
			expect(appEditorHost.resolveLink('A/img.png')).toBe('/vault/A/img.png');
			expect(appEditorHost.resolveLink('note')).toBe('/vault/A/Note.md');
			expect(appEditorHost.resolveLink('Elsewhere/Other')).toBe('/vault/B/Other.md');
			expect(appEditorHost.resolveLink('missing')).toBeNull();
		});

		it('follows setFileTree when a file is moved, removed or added', () => {
			fsStore.setFileTree([dir('/vault/A', [makeFile('/vault/A/a.md')]), makeFile('/vault/b.md')]);
			expect(appEditorHost.resolveLink('a')).toBe('/vault/A/a.md');
			expect(appEditorHost.resolveLink('b')).toBe('/vault/b.md');

			fsStore.setFileTree([dir('/vault/A', []), makeFile('/vault/a.md'), makeFile('/vault/b.md')]);
			expect(appEditorHost.resolveLink('a')).toBe('/vault/a.md');

			fsStore.setFileTree([dir('/vault/A', []), makeFile('/vault/a.md')]);
			expect(appEditorHost.resolveLink('b')).toBeNull();

			fsStore.setFileTree([dir('/vault/A', []), makeFile('/vault/a.md'), makeFile('/vault/c.md')]);
			expect(appEditorHost.resolveLink('c')).toBe('/vault/c.md');
		});

		it('reads each node path a bounded number of times across many calls on one tree', () => {
			const counter = { reads: 0 };
			const files = Array.from({ length: 200 }, (_, i) => counted(`/vault/d/n${i}.md`, counter));
			fsStore.setFileTree([dir('/vault/d', files)]);

			for (let i = 0; i < 50; i++) appEditorHost.resolveLink(`n${i}`);

			expect(appEditorHost.resolveLink('n7')).toBe('/vault/d/n7.md');
			expect(counter.reads).toBeLessThan(2 * files.length);
		});

		it('serves exact-file and note-name targets from one build per tree', () => {
			const counter = { reads: 0 };
			const files = [counted('/vault/a/foo.md', counter), counted('/vault/b/foo.png', counter)];
			fsStore.setFileTree([dir('/vault/a', [files[0]]), dir('/vault/b', [files[1]])]);

			for (let i = 0; i < 20; i++) {
				expect(appEditorHost.resolveLink('foo.png')).toBe('/vault/b/foo.png');
				expect(appEditorHost.resolveLink('b/foo.png')).toBe('/vault/b/foo.png');
				expect(appEditorHost.resolveLink('foo')).toBe('/vault/a/foo.md');
			}
			expect(counter.reads).toBeLessThan(2 * files.length);
		});

		it('listLinkCandidates lists the files of the current tree', async () => {
			fsStore.setFileTree([makeFile('/vault/a.md')]);
			appEditorHost.resolveLink('a');
			fsStore.setFileTree([makeFile('/vault/b.md')]);
			const { files } = await appEditorHost.listLinkCandidates(false);
			expect(files.map((f) => f.path)).toEqual(['/vault/b.md']);
		});
	});

	it('listLinkCandidates reads the vault entries only when asked', async () => {
		fsStore.setFileTree([makeFile('/vault/a.md')]);

		const without = await appEditorHost.listLinkCandidates(false);
		expect(without.files.map((f) => f.path)).toEqual(['/vault/a.md']);
		expect(without.notes).toEqual([]);
		expect(invoke).not.toHaveBeenCalled();

		await appEditorHost.listLinkCandidates(true);
		expect(invoke).toHaveBeenCalledWith('get_all_vault_entries_v2');
	});

	it('readNote, assetUrl and openExternal go to Tauri', async () => {
		await expect(appEditorHost.readNote('/vault/a.md')).resolves.toBe('note body');
		expect(readTextFile).toHaveBeenCalledWith('/vault/a.md');
		expect(appEditorHost.assetUrl('/vault/i.png')).toBe(`asset://localhost/${encodeURIComponent('/vault/i.png')}`);
		await appEditorHost.openExternal('https://example.com');
		expect(openUrl).toHaveBeenCalledWith('https://example.com');
	});

	it('openTagSearch opens Search with the tag: query, as the Tags view does', () => {
		searchStore.reset();
		settingsStore.updateLayout({ railItem: 'inbox', railPanelsVisible: false });

		appEditorHost.openTagSearch('area/sub');

		expect(searchStore.query).toBe('tag:area/sub');
		expect(settingsStore.layout.railItem).toBe(SEARCH_RAIL_ITEM);
		expect(settingsStore.layout.railPanelsVisible).toBe(true);
	});

	it('openLink opens the note and queues the scroll to its heading', async () => {
		vi.mocked(openFileInEditor).mockImplementation(async (path) => {
			editorStore.addTab({ path, name: 'note', content: 'intro\n# Part\nbody', savedContent: '' });
		});

		await appEditorHost.openLink('/vault/note.md', { heading: 'Part', blockId: null });

		expect(openFileInEditor).toHaveBeenCalledWith('/vault/note.md');
		expect(editorStore.pendingScrollPosition).toBe('intro\n'.length);
	});

	it('openLink without an anchor queues no scroll', async () => {
		await appEditorHost.openLink('/vault/note.md');
		expect(editorStore.pendingScrollPosition).toBeNull();
	});

	it('createNote creates a plain note at the vault-relative path', async () => {
		vaultStore.open('/vault');

		await expect(appEditorHost.createNote('Ideas/v1.2 plan')).resolves.toBe(true);

		expect(openOrCreateNote).toHaveBeenCalledWith({ filePath: '/vault/Ideas/v1.2 plan.md', title: 'v1.2 plan' });
	});

	it('createNote keeps an explicit .md extension', async () => {
		vaultStore.open('/vault');

		await appEditorHost.createNote('Inbox/Note.md');

		expect(openOrCreateNote).toHaveBeenCalledWith({ filePath: '/vault/Inbox/Note.md', title: 'Note' });
	});

	it('createNote creates a bare daily-note name in the periodic folder', async () => {
		vaultStore.open('/vault');
		useDailyFolder();

		await appEditorHost.createNote('2026-11-01');

		expectDailyNoteCreated();
	});

	it('createNote with periodic: false creates a daily-note name at the vault root', async () => {
		vaultStore.open('/vault');
		useDailyFolder();

		await expect(appEditorHost.createNote('2026-11-01', undefined, { periodic: false })).resolves.toBe(true);

		expect(openOrCreateNote).toHaveBeenCalledWith({ filePath: '/vault/2026-11-01.md', title: '2026-11-01' });
	});

	it('createNote marks a note made from a missing wikilink unorganized while Explicit organization is on', async () => {
		vaultStore.open('/vault');
		settingsStore.setSettings({ ...settingsStore.settings, explicitOrganization: true });

		await openWikilinkTarget('Missing');

		const { filePath, buildContent } = vi.mocked(openOrCreateNote).mock.calls[0][0];
		expect(filePath).toBe('/vault/Missing.md');
		const written = buildContent!('');
		expect(written).toBe('---\n_organized: false\n---\n');
		expect(written.match(/^_organized:/gm)).toHaveLength(1);
	});

	it('createNote with periodic: false (the meta-bind button) marks the note unorganized while the switch is on', async () => {
		vaultStore.open('/vault');
		useDailyFolder();
		settingsStore.setSettings({ ...settingsStore.settings, explicitOrganization: true });

		await appEditorHost.createNote('2026-11-01', undefined, { periodic: false });

		const { filePath, buildContent } = vi.mocked(openOrCreateNote).mock.calls[0][0];
		expect(filePath).toBe('/vault/2026-11-01.md');
		expect(buildContent!('Body\n')).toBe('---\n_organized: false\n---\nBody\n');
	});

	it('createNote creates the daily note for a periodic name without _organized while the switch is on', async () => {
		vaultStore.open('/vault');
		useDailyFolder();
		settingsStore.setSettings({ ...settingsStore.settings, explicitOrganization: true });

		await appEditorHost.createNote('2026-11-04');

		expect(openOrCreateNote).toHaveBeenCalledTimes(1);
		const { filePath, buildContent } = vi.mocked(openOrCreateNote).mock.calls[0][0];
		expect(filePath).toBe('/vault/Daily/2026-11-04.md');
		const rendered = '---\ndate: 2026-11-04\n---\n# Daily\n';
		expect(buildContent?.(rendered) ?? rendered).not.toContain('_organized');
	});

	it('createNote does nothing without a vault', async () => {
		await expect(appEditorHost.createNote('Missing')).resolves.toBe(false);
		expect(openOrCreateNote).not.toHaveBeenCalled();
	});

	it('createNote resolves without opening anything when creation fails', async () => {
		vaultStore.open('/vault');
		vi.mocked(openOrCreateNote).mockRejectedValue(new Error('disk full'));
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(appEditorHost.createNote('Missing', { heading: 'X', blockId: null })).resolves.toBe(false);

		expect(editorStore.pendingScrollPosition).toBeNull();
		consoleError.mockRestore();
	});

	describe('openView', () => {
		const BOARD = '/vault/_system/views/Board.view';
		const READING = '/vault/_system/views/Reading.view';

		beforeEach(() => {
			vaultStore.open('/vault');
			typeDefinitionsStore.reset();
			typeDefinitionsStore.setEntries([entryV2(BOARD, { frontmatter: { _open_in_editor: true, _visible: false } })]);
			fsStore.setFileTree([
				{ name: '_system', path: '/vault/_system', isDirectory: true, children: [
					{ name: 'views', path: '/vault/_system/views', isDirectory: true, children: [makeFile(BOARD), makeFile(READING)] },
				] },
				{ name: 'Folder.view', path: '/vault/Folder.view', isDirectory: true, children: [] },
			]);
		});

		it('opens an _open_in_editor view in the editor, even one hidden from Views, and leaves the layout', async () => {
			const before = { ...settingsStore.layout };
			await expect(appEditorHost.openView('_system/views/Board.view')).resolves.toBe(true);
			expect(openFileInEditor).toHaveBeenCalledWith(BOARD);
			expect(settingsStore.layout).toEqual(before);
		});

		it('picks an ordinary view in the Types navigator, a view with no entry yet included', async () => {
			await expect(appEditorHost.openView('_system/views/Reading.view')).resolves.toBe(true);
			expect(settingsStore.layout.railItem).toBe(TYPES_RAIL_ITEM);
			expect(settingsStore.layout.railTypesLens).toEqual({ kind: 'view', target: READING });
			expect(settingsStore.layout.railPanelsVisible).toBe(true);
			expect(openFileInEditor).not.toHaveBeenCalled();
		});

		it('reads a leading slash as vault-relative', async () => {
			await expect(appEditorHost.openView('/_system/views/Board.view')).resolves.toBe(true);
			expect(openFileInEditor).toHaveBeenCalledWith(BOARD);
		});

		it.each([
			['a missing file', '_system/views/Gone.view'],
			['a folder named like a view', 'Folder.view'],
			['a path that leaves the vault', '../outside/Board.view'],
		])('resolves false for %s and opens nothing', async (_name, path) => {
			const before = { ...settingsStore.layout };
			await expect(appEditorHost.openView(path)).resolves.toBe(false);
			expect(openFileInEditor).not.toHaveBeenCalled();
			expect(openOrCreateNote).not.toHaveBeenCalled();
			expect(settingsStore.layout).toEqual(before);
		});

		it('resolves false without a vault', async () => {
			vaultStore.close();
			await expect(appEditorHost.openView('_system/views/Board.view')).resolves.toBe(false);
			expect(openFileInEditor).not.toHaveBeenCalled();
		});
	});
});

describe('an unresolved [[2026-11-01]] in the app editor', () => {
	/** A view with the app host installed, as `createExtensions` builds it. */
	function mount(doc: string): EditorView {
		return new EditorView({
			state: EditorState.create({ doc, extensions: editorHost.of(appEditorHost) }),
			parent: document.body.appendChild(document.createElement('div')),
		});
	}

	beforeEach(() => {
		vaultStore.open('/vault');
		useDailyFolder();
	});

	it('creates the daily note in its folder from an editor click', async () => {
		const view = mount('see [[2026-11-01]] here');

		await followWikilinkClick(view, 8);

		expectDailyNoteCreated();
		view.destroy();
	});

	it('creates the daily note in its folder from a table cell', async () => {
		const source = renderTableSource(['day'], ['left'], [['[[2026-11-01]]']]);
		const view = mount(source);
		const dom = new TableWidget(['day'], ['left'], [['[[2026-11-01]]']], [], {
			from: 0,
			to: source.length,
			startLine: 1,
			endLine: 3,
		}).toDOM(view);

		dom.querySelector<HTMLElement>('td .cm-lp-wikilink')!.dispatchEvent(
			new MouseEvent('mousedown', { bubbles: true, button: 0 }),
		);
		await vi.waitFor(() => expect(openOrCreateNote).toHaveBeenCalled());

		expectDailyNoteCreated();
		view.destroy();
	});
});

describe('openWikilinkTarget', () => {
	it('opens a resolved markdown wikilink target via openFileInEditor', async () => {
		fsStore.setFileTree([makeFile('/vault/Notes/note.md')]);

		await openWikilinkTarget('note');

		expect(openFileInEditor).toHaveBeenCalledWith('/vault/Notes/note.md');
		expect(openOrCreateNote).not.toHaveBeenCalled();
	});

	it('does not open image, audio, video or pdf targets, by full path or any casing', async () => {
		fsStore.setFileTree([
			makeFile('/vault/Resources/img.png'),
			makeFile('/vault/Resources/9902bb9ff321.png'),
			makeFile('/vault/song.mp3'),
			makeFile('/vault/clip.mp4'),
			makeFile('/vault/spec.pdf'),
			makeFile('/vault/Photo.PNG'),
		]);

		for (const target of ['img.png', 'Resources/9902bb9ff321.png', 'song.mp3', 'clip.mp4', 'spec.pdf', 'Photo.PNG']) {
			await openWikilinkTarget(target);
		}

		expect(openFileInEditor).not.toHaveBeenCalled();
		expect(openOrCreateNote).not.toHaveBeenCalled();
	});

	it('creates and opens a missing note', async () => {
		vaultStore.open('/vault');

		await openWikilinkTarget('Missing');

		expect(openOrCreateNote).toHaveBeenCalledWith({ filePath: '/vault/Missing.md', title: 'Missing' });
	});
});
