// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { EditorState, EditorSelection, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { CompletionContext } from '@codemirror/autocomplete';
import { markdown } from '@codemirror/lang-markdown';
import { GFM } from '@lezer/markdown';

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import { toast } from 'svelte-sonner';

import { editorHost, NOOP_HOST, type EditorHost } from '#lib/core/markdown-editor/editor-host.js';
import { livePreviewExtensions } from '#lib/core/markdown-editor/extensions/live-preview/live-preview.js';
import {
	TableWidget,
	WikilinkImageEmbedWidget,
	WikilinkNoteEmbedWidget,
	renderTableSource,
} from '#lib/core/markdown-editor/extensions/live-preview/widgets.js';
import type { ButtonAction } from '#lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.js';
import { MetaBindButtonWidget } from '#lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.js';
import { followWikilinkClick } from '#lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.js';
import { tagCompletionSource } from '#lib/core/markdown-editor/extensions/tag/completion.js';
import { wikilinkCompletionSource } from '#lib/core/markdown-editor/extensions/wikilink/completion.js';
import { createMarkdownState, withFullParse } from './test-helpers';

/** A host whose every method is a spy; `paths` is the vault it resolves against. */
function fakeHost(paths: string[] = ['/vault/Note.md', '/vault/img.png']): EditorHost & Record<keyof EditorHost, ReturnType<typeof vi.fn>> {
	const byName = (target: string) =>
		paths.find((p) => p.slice(p.lastIndexOf('/') + 1).replace(/\.md$/, '') === target || p.endsWith(`/${target}`)) ?? null;
	return {
		resolveLink: vi.fn(byName),
		listLinkCandidates: vi.fn(async () => ({
			files: paths.map((p) => {
				const name = p.slice(p.lastIndexOf('/') + 1);
				return { name, nameWithoutExt: name.replace(/\.[^.]+$/, ''), path: p };
			}),
			notes: [],
		})),
		readNote: vi.fn(async () => '# Title\n\nEmbedded body'),
		assetUrl: vi.fn((path: string) => `asset://${path}`),
		openLink: vi.fn(async () => {}),
		openExternal: vi.fn(async () => {}),
		createNote: vi.fn(async () => true),
		openView: vi.fn(async () => true),
		openTagSearch: vi.fn((_tag: string) => {}),
		listTags: vi.fn(async () => [{ name: 'project', count: 1 }]),
	};
}

const views: EditorView[] = [];

/** Mounts a view on `doc` with `host` installed. */
function mount(doc: string, host: EditorHost, extensions: Extension[] = []): EditorView {
	const view = new EditorView({
		state: EditorState.create({ doc, extensions: [editorHost.of(host), ...extensions] }),
		parent: document.body.appendChild(document.createElement('div')),
	});
	views.push(view);
	return view;
}

async function flush(): Promise<void> {
	for (let i = 0; i < 5; i++) await new Promise<void>((r) => setTimeout(r, 0));
}

afterEach(() => {
	for (const v of views.splice(0)) v.destroy();
	document.body.innerHTML = '';
});

describe('editorHost facet', () => {
	it('is NOOP_HOST when nothing installs a host', () => {
		expect(EditorState.create({ doc: '' }).facet(editorHost)).toBe(NOOP_HOST);
	});

	it('is the installed host', () => {
		const host = fakeHost();
		expect(EditorState.create({ doc: '', extensions: editorHost.of(host) }).facet(editorHost)).toBe(host);
	});
});

describe('everything the editor reaches outside goes through the host', () => {
	it('a wikilink click resolves and opens through the host, with its anchor', async () => {
		const host = fakeHost();
		const view = mount('see [[Note#Part]] here', host);

		await followWikilinkClick(view, 8);

		expect(host.resolveLink).toHaveBeenCalledWith('Note');
		expect(host.openLink).toHaveBeenCalledWith('/vault/Note.md', { heading: 'Part', blockId: null });
		expect(host.createNote).not.toHaveBeenCalled();
	});

	it('an unresolved wikilink click creates the note through the host', async () => {
		const host = fakeHost();
		const view = mount('see [[2026-11-01]] here', host);

		await followWikilinkClick(view, 8);

		expect(host.createNote).toHaveBeenCalledWith('2026-11-01', { heading: null, blockId: null });
		expect(host.openLink).not.toHaveBeenCalled();
	});

	it('a click on a binary wikilink calls no host navigation', async () => {
		const host = fakeHost();
		const view = mount('![[img.png]]', host);

		await followWikilinkClick(view, 4);

		expect(host.openLink).not.toHaveBeenCalled();
		expect(host.createNote).not.toHaveBeenCalled();
	});

	it('a same-note anchor click moves the cursor without the host', async () => {
		const host = fakeHost();
		const doc = 'go [[#Second]]\n\n# Second\n';
		const view = mount(doc, host, [markdown()]);

		await followWikilinkClick(view, 6);

		expect(view.state.selection.main.head).toBe(doc.indexOf('# Second'));
		expect(host.resolveLink).not.toHaveBeenCalled();
	});

	it('a table-cell wikilink to an unresolved daily note goes to host.createNote', () => {
		const host = fakeHost();
		const source = renderTableSource(['day'], ['left'], [['[[2026-11-01]]']]);
		const view = mount(source, host);
		const widget = new TableWidget(['day'], ['left'], [['[[2026-11-01]]']], [], {
			from: 0,
			to: source.length,
			startLine: 1,
			endLine: 3,
		});
		const dom = widget.toDOM(view);
		const link = dom.querySelector<HTMLAnchorElement>('td .cm-lp-wikilink')!;

		link.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));

		expect(host.resolveLink).toHaveBeenCalledWith('2026-11-01');
		expect(host.createNote).toHaveBeenCalledWith('2026-11-01', { heading: null, blockId: null });
	});

	it('a note embed resolves and reads through the host', async () => {
		const host = fakeHost();
		const view = mount('![[Note]]', host);
		const dom = new WikilinkNoteEmbedWidget('Note', null, null).toDOM(view);

		await flush();

		expect(host.resolveLink).toHaveBeenCalledWith('Note');
		expect(host.readNote).toHaveBeenCalledWith('/vault/Note.md');
		expect(dom.querySelector('.cm-lp-embed-content')!.textContent).toContain('Embedded body');
	});

	describe('note embed header click', () => {
		/** Renders a note embed inside a parent that records mousedowns, and presses its header. */
		async function pressHeader(host: EditorHost, widget: WikilinkNoteEmbedWidget, init: MouseEventInit = { button: 0 }) {
			const view = mount('![[Note]]', host);
			const parent = document.body.appendChild(document.createElement('div'));
			const parentSaw = vi.fn();
			parent.addEventListener('mousedown', parentSaw);
			const dom = parent.appendChild(widget.toDOM(view));
			const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true, ...init });
			dom.querySelector('.cm-lp-embed-header')!.dispatchEvent(event);
			await flush();
			return { event, parentSaw };
		}

		it('opens an existing note through the host, with its anchor', async () => {
			const host = fakeHost();

			await pressHeader(host, new WikilinkNoteEmbedWidget('Note', 'Part', null));

			expect(host.openLink).toHaveBeenCalledWith('/vault/Note.md', { heading: 'Part', blockId: null });
			expect(host.createNote).not.toHaveBeenCalled();
		});

		it('creates a missing note through the host', async () => {
			const host = fakeHost();

			await pressHeader(host, new WikilinkNoteEmbedWidget('Missing note', null, null));

			expect(host.createNote).toHaveBeenCalledWith('Missing note', { heading: null, blockId: null });
			expect(host.openLink).not.toHaveBeenCalled();
		});

		it('stops the mousedown so CodeMirror does not move the cursor into the embed', async () => {
			const { event, parentSaw } = await pressHeader(fakeHost(), new WikilinkNoteEmbedWidget('Note', null, null));

			expect(event.defaultPrevented).toBe(true);
			expect(parentSaw).not.toHaveBeenCalled();
		});

		it('a right-button press navigates nowhere', async () => {
			const host = fakeHost();

			const { event } = await pressHeader(host, new WikilinkNoteEmbedWidget('Note', null, null), { button: 2 });

			expect(host.openLink).not.toHaveBeenCalled();
			expect(host.createNote).not.toHaveBeenCalled();
			expect(event.defaultPrevented).toBe(false);
		});
	});

	it('an image embed takes its URL from host.assetUrl', () => {
		const host = fakeHost();
		const view = mount('![[img.png]]', host);
		const dom = new WikilinkImageEmbedWidget('img.png', null).toDOM(view);

		expect(host.assetUrl).toHaveBeenCalledWith('/vault/img.png');
		expect(dom.querySelector('img')!.getAttribute('src')).toBe('asset:///vault/img.png');
	});

	it('wikilink completion lists the host candidates', async () => {
		const host = fakeHost(['/vault/Alpha.md', '/vault/Beta.md']);
		const doc = '[[Alp';
		const state = EditorState.create({
			doc,
			extensions: editorHost.of(host),
			selection: EditorSelection.cursor(doc.length),
		});

		const result = await wikilinkCompletionSource(new CompletionContext(state, doc.length, false));

		expect(host.listLinkCandidates).toHaveBeenCalled();
		expect(result!.options.map((o) => o.label)).toEqual(['Alpha']);
	});

	it('tag completion lists the host tags', async () => {
		const host = fakeHost();
		const doc = 'see #pro';
		const state = EditorState.create({ doc, extensions: editorHost.of(host) });

		const result = await tagCompletionSource(new CompletionContext(state, doc.length, false));

		expect(host.listTags).toHaveBeenCalled();
		expect(result!.options.map((o) => o.label)).toEqual(['project']);
	});

	it('heading completion reads the target note through the host', async () => {
		const host = fakeHost();
		const doc = '[[Note#';
		const state = EditorState.create({ doc, extensions: editorHost.of(host) });

		const result = await wikilinkCompletionSource(new CompletionContext(state, doc.length, true));

		expect(host.readNote).toHaveBeenCalledWith('/vault/Note.md');
		expect(result!.options.map((o) => o.label)).toEqual(['Title']);
	});
});

describe('meta-bind button actions go through the host', () => {
	/** Renders a button with `actions` over `host` and clicks it. */
	async function clickButton(host: EditorHost, actions: ButtonAction[]): Promise<void> {
		const view = mount('', host);
		const dom = new MetaBindButtonWidget({ label: 'Go', style: 'default', actions }).toDOM(view);
		dom.querySelector('button')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		await flush();
	}

	const NO_ANCHOR = { heading: null, blockId: null };

	afterEach(() => {
		vi.mocked(toast.error).mockClear();
	});

	it('an open action on a wikilink resolves and opens it', async () => {
		const host = fakeHost();

		await clickButton(host, [{ type: 'open', link: '[[Note]]' }]);

		expect(host.resolveLink).toHaveBeenCalledWith('Note');
		expect(host.openLink).toHaveBeenCalledWith('/vault/Note.md', NO_ANCHOR);
	});

	it('an open action on an aliased wikilink opens the target note', async () => {
		const host = fakeHost();

		await clickButton(host, [{ type: 'open', link: '[[Note|shown text]]' }]);

		expect(host.openLink).toHaveBeenCalledWith('/vault/Note.md', NO_ANCHOR);
	});

	it('an open action on a heading link opens the note at the heading', async () => {
		const host = fakeHost();

		await clickButton(host, [{ type: 'open', link: '[[Note#Heading]]' }]);

		expect(host.openLink).toHaveBeenCalledWith('/vault/Note.md', { heading: 'Heading', blockId: null });
	});

	it('an open action on a missing note creates it, as a body wikilink does', async () => {
		const host = fakeHost();

		await clickButton(host, [{ type: 'open', link: '[[Missing]]' }]);

		expect(host.openLink).not.toHaveBeenCalled();
		expect(host.createNote).toHaveBeenCalledWith('Missing', NO_ANCHOR);
	});

	it.each([
		['an empty link', '  '],
		['an unparseable wikilink', '[[]]'],
		['a bare name', 'Note'],
		['an unsafe URL', 'httpx:alert(1)'],
	])('an open action on %s toasts and stops the later actions', async (_name, link) => {
		const host = fakeHost();

		await clickButton(host, [
			{ type: 'open', link },
			{ type: 'createNote', fileName: 'Next' },
		]);

		expect(toast.error).toHaveBeenCalledTimes(1);
		expect(host.openLink).not.toHaveBeenCalled();
		expect(host.openExternal).not.toHaveBeenCalled();
		expect(host.createNote).not.toHaveBeenCalled();
	});

	it('an open action that opened a note runs the next action', async () => {
		const host = fakeHost();

		await clickButton(host, [
			{ type: 'open', link: '[[Note]]' },
			{ type: 'createNote', fileName: 'Next' },
		]);

		expect(host.createNote).toHaveBeenCalledWith('Next', undefined, { periodic: false });
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('an open action on an http link goes to openExternal', async () => {
		const host = fakeHost();

		await clickButton(host, [{ type: 'open', link: 'https://example.com' }]);

		expect(host.openExternal).toHaveBeenCalledWith('https://example.com');
		expect(host.openLink).not.toHaveBeenCalled();
	});

	it('a createNote action creates folder/name with no periodic redirect', async () => {
		const host = fakeHost();

		await clickButton(host, [{ type: 'createNote', fileName: 'Name', folderPath: 'Folder' }]);

		expect(host.createNote).toHaveBeenCalledWith('Folder/Name', undefined, { periodic: false });
	});

	it('a createNote action without a folder creates the bare name', async () => {
		const host = fakeHost();

		await clickButton(host, [{ type: 'createNote', fileName: '2026-11-01' }]);

		expect(host.createNote).toHaveBeenCalledWith('2026-11-01', undefined, { periodic: false });
	});

	it('a createNote that opened nothing stops the later actions', async () => {
		const host = fakeHost();
		host.createNote.mockResolvedValue(false);

		await clickButton(host, [
			{ type: 'createNote', fileName: 'Name' },
			{ type: 'open', link: '[[Note]]' },
		]);

		expect(host.createNote).toHaveBeenCalledTimes(1);
		expect(host.openLink).not.toHaveBeenCalled();
	});

	it('a createNote that succeeded runs the next action', async () => {
		const host = fakeHost();

		await clickButton(host, [
			{ type: 'createNote', fileName: 'Name' },
			{ type: 'open', link: '[[Note]]' },
		]);

		expect(host.openLink).toHaveBeenCalledWith('/vault/Note.md', NO_ANCHOR);
	});

	it('an openView action opens the vault-relative path through the host and runs the next action', async () => {
		const host = fakeHost();

		await clickButton(host, [
			{ type: 'openView', path: '_system/views/Projects.view' },
			{ type: 'createNote', fileName: 'Next' },
		]);

		expect(host.openView).toHaveBeenCalledWith('_system/views/Projects.view');
		expect(host.createNote).toHaveBeenCalledWith('Next', undefined, { periodic: false });
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('an openView the host could not open toasts and stops the later actions', async () => {
		const host = fakeHost();
		host.openView.mockResolvedValue(false);

		await clickButton(host, [
			{ type: 'openView', path: 'Gone.view' },
			{ type: 'createNote', fileName: 'Next' },
		]);

		expect(toast.error).toHaveBeenCalledTimes(1);
		expect(vi.mocked(toast.error).mock.calls[0][0]).toBe('Button cannot open view "Gone.view": file not found');
		expect(host.createNote).not.toHaveBeenCalled();
	});

	it('an openView button stops the mousedown so CodeMirror does not move the cursor', () => {
		const view = mount('', fakeHost());
		const parent = document.body.appendChild(document.createElement('div'));
		const parentSaw = vi.fn();
		parent.addEventListener('mousedown', parentSaw);
		const dom = parent.appendChild(
			new MetaBindButtonWidget({ label: 'Go', style: 'default', action: { type: 'openView', path: 'Projects.view' } }).toDOM(view),
		);
		const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
		dom.querySelector('button')!.dispatchEvent(event);

		expect(event.defaultPrevented).toBe(true);
		expect(parentSaw).not.toHaveBeenCalled();
	});
});

describe('host calls stay out of StateField compute', () => {
	const DOC = [
		'---',
		'title: x',
		'---',
		'# Heading with [[Note]]',
		'![[img.png]] and ![[Note]] and ![alt](file:///vault/img.png)',
		'| a | b |',
		'| --- | --- |',
		'| [[Note]] | 2 |',
		'',
		'```meta-bind-button',
		'label: Go',
		'action:',
		'  type: open',
		'  link: "[[Note]]"',
		'```',
		'',
		'> [!note] Callout [[Note]]',
		'> body',
		'',
		'$$',
		'x^2',
		'$$',
		'plain [link](https://example.com) line',
	].join('\n');

	it('a docChanged transaction calls no host method', () => {
		const host = fakeHost();
		const state = createMarkdownState(DOC, {
			extensions: [
				markdown({ extensions: [GFM] }),
				editorHost.of(host),
				livePreviewExtensions({}),
			],
		});

		const next = withFullParse(() => state.update({ changes: { from: DOC.length, insert: '\n[[More]]' } }).state);
		expect(next.doc.length).toBeGreaterThan(DOC.length);

		for (const [name, fn] of Object.entries(host)) {
			expect(fn, name).not.toHaveBeenCalled();
		}
	});
});
