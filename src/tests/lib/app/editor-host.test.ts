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
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
import { editorHost } from '#lib/core/markdown-editor/editor-host.js';
import { TableWidget, renderTableSource } from '#lib/core/markdown-editor/extensions/live-preview/widgets.js';
import { followWikilinkClick } from '#lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.js';
import { openOrCreateNote } from '#lib/core/note-creator/note-creator.service.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { invalidateVaultEntries } from '#lib/core/vault/vault-entries.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { buildPeriodicNotePath } from '#lib/plugins/periodic-notes/periodic-notes.logic.js';

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
