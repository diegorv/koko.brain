import { describe, it, expect, vi, beforeEach } from 'vitest';

// Tauri IPC boundary: the composer host reads the vault through these commands only.
vi.mock('#lib/contracts/ipc.js', () => ({
	call: vi.fn(),
}));

import { EditorSelection, EditorState } from '@codemirror/state';
import { CompletionContext } from '@codemirror/autocomplete';
import { call } from '#lib/contracts/ipc.js';
import { editorHost, type EditorHost } from '#lib/core/markdown-editor/editor-host.js';
import { tagCompletionSource } from '#lib/core/markdown-editor/extensions/tag/completion.js';
import { wikilinkCompletionSource } from '#lib/core/markdown-editor/extensions/wikilink/completion.js';
import { createComposerEditorHost } from '#lib/plugins/quick-capture/composer-editor-host.service.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

const callMock = vi.mocked(call);

const TAGS = [
	{ name: 'project', count: 2, filePaths: ['/vault/a.md'] },
	{ name: 'prose', count: 5, filePaths: ['/vault/b.md'] },
	{ name: 'area', count: 1, filePaths: [] },
];

const ENTRIES = [
	entryV2('/vault/Welcome.md', { frontmatter: { aliases: ['Home'] } }),
	entryV2('/vault/notes/Weekly.md'),
	entryV2('/vault/Inbox.view'),
];

/** Answers the two read commands with `tags` / `entries`, or rejects with `fail`. */
function mockVault(opts: { tags?: unknown[]; entries?: unknown[]; fail?: 'tags' | 'entries' } = {}) {
	callMock.mockImplementation((async (cmd: string) => {
		if (cmd === 'get_all_tags_v2') {
			if (opts.fail === 'tags') throw new Error('tags read failed');
			return opts.tags ?? TAGS;
		}
		if (cmd === 'get_all_vault_entries_v2') {
			if (opts.fail === 'entries') throw new Error('entries read failed');
			return opts.entries ?? ENTRIES;
		}
		throw new Error(`unexpected command ${cmd}`);
	}) as never);
}

function commandCount(cmd: string): number {
	return callMock.mock.calls.filter(([c]) => c === cmd).length;
}

/** The real source run on `doc` with the cursor at its end and `host` installed. */
function complete(
	source: typeof tagCompletionSource,
	doc: string,
	host: EditorHost,
) {
	const state = EditorState.create({
		doc,
		extensions: editorHost.of(host),
		selection: EditorSelection.cursor(doc.length),
	});
	return source(new CompletionContext(state, doc.length, false));
}

beforeEach(() => {
	callMock.mockReset();
	vi.restoreAllMocks();
});

describe('createComposerEditorHost', () => {
	describe('listTags', () => {
		it('feeds the editor tag source the vault tags, ranked, without file paths', async () => {
			mockVault();
			const host = createComposerEditorHost();

			const result = await complete(tagCompletionSource, 'see #pr', host);

			expect(result!.options.map((o) => o.label)).toEqual(['prose', 'project']);
			expect(await host.listTags()).toEqual([
				{ name: 'project', count: 2 },
				{ name: 'prose', count: 5 },
				{ name: 'area', count: 1 },
			]);
		});

		it('reads the tags once per summon and again after reset', async () => {
			mockVault();
			const host = createComposerEditorHost();

			await complete(tagCompletionSource, '#p', host);
			await complete(tagCompletionSource, '#pr', host);
			await complete(tagCompletionSource, '#pro', host);
			expect(commandCount('get_all_tags_v2')).toBe(1);
			expect(commandCount('get_all_vault_entries_v2')).toBe(0);

			host.reset();
			await complete(tagCompletionSource, '#p', host);
			expect(commandCount('get_all_tags_v2')).toBe(2);
		});

		it('gives no list for a vault without tags', async () => {
			mockVault({ tags: [] });
			const host = createComposerEditorHost();

			expect(await complete(tagCompletionSource, '#p', host)).toBeNull();
		});

		it('rejects a failed read, which the source logs, and retries on the next call', async () => {
			mockVault({ fail: 'tags' });
			const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
			const host = createComposerEditorHost();

			await expect(host.listTags()).rejects.toThrow('tags read failed');
			expect(await complete(tagCompletionSource, '#p', host)).toBeNull();
			expect(consoleError).toHaveBeenCalled();

			mockVault();
			const result = await complete(tagCompletionSource, '#p', host);
			expect(result!.options.map((o) => o.label)).toContain('project');
		});
	});

	describe('listLinkCandidates', () => {
		it('feeds the editor wikilink source the indexed notes, never a .view', async () => {
			mockVault();
			const host = createComposerEditorHost();

			const empty = await complete(wikilinkCompletionSource, '[[', host);
			expect(empty!.options.map((o) => o.label).sort()).toEqual(['Weekly', 'Welcome']);

			const narrowed = await complete(wikilinkCompletionSource, 'see [[Wel', host);
			expect(narrowed!.options[0].label).toBe('Welcome');
			expect(narrowed!.options.map((o) => o.label)).not.toContain('Inbox');
		});

		it('offers an alias for a non-empty query, labelled by the alias', async () => {
			mockVault();
			const host = createComposerEditorHost();

			const result = await complete(wikilinkCompletionSource, '[[Hom', host);

			const alias = result!.options.find((o) => o.displayLabel === 'Home');
			expect(alias).toBeDefined();
			expect(alias!.label).toBe('Welcome');
		});

		it('maps entries to file entries with the note name', async () => {
			mockVault();
			const host = createComposerEditorHost();

			const { files, notes } = await host.listLinkCandidates(true);

			expect(files).toEqual([
				{ name: 'Welcome.md', nameWithoutExt: 'Welcome', path: '/vault/Welcome.md' },
				{ name: 'Weekly.md', nameWithoutExt: 'Weekly', path: '/vault/notes/Weekly.md' },
			]);
			expect(notes.map((n) => n.path)).toEqual(['/vault/Welcome.md', '/vault/notes/Weekly.md']);
			expect((await host.listLinkCandidates(false)).notes).toEqual([]);
		});

		it('reads the entries once per summon, returns the same mapped files, and again after reset', async () => {
			mockVault();
			const host = createComposerEditorHost();

			const first = await host.listLinkCandidates(true);
			await complete(wikilinkCompletionSource, '[[W', host);
			await complete(wikilinkCompletionSource, '[[We', host);
			const again = await host.listLinkCandidates(false);
			expect(commandCount('get_all_vault_entries_v2')).toBe(1);
			expect(commandCount('get_all_tags_v2')).toBe(0);
			expect(again.files).toBe(first.files);

			host.reset();
			await host.listLinkCandidates(true);
			expect(commandCount('get_all_vault_entries_v2')).toBe(2);
		});

		it('gives no list for an empty vault', async () => {
			mockVault({ entries: [] });
			const host = createComposerEditorHost();

			expect(await complete(wikilinkCompletionSource, '[[W', host)).toBeNull();
		});

		it('rejects a failed read and does not cache it', async () => {
			mockVault({ fail: 'entries' });
			const host = createComposerEditorHost();

			await expect(host.listLinkCandidates(true)).rejects.toThrow('entries read failed');

			mockVault();
			const { files } = await host.listLinkCandidates(true);
			expect(files.map((f) => f.nameWithoutExt)).toEqual(['Welcome', 'Weekly']);
		});
	});

	describe('headings', () => {
		it('lists the headings of the composer text for [[#', async () => {
			mockVault();
			const host = createComposerEditorHost();

			const result = await complete(wikilinkCompletionSource, '# Plan\n## Steps\nsee [[#St', host);

			expect(result!.options.map((o) => o.label)).toEqual(['Steps']);
		});

		it('shows nothing for another note heading, without reading anything', async () => {
			mockVault();
			const host = createComposerEditorHost();

			expect(await complete(wikilinkCompletionSource, '[[Welcome#h', host)).toBeNull();
			expect(host.resolveLink('Welcome')).toBeNull();
			expect(callMock).not.toHaveBeenCalled();
		});
	});
});
