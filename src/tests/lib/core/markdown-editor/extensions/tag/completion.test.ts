// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import {
	acceptCompletion,
	autocompletion,
	CompletionContext,
	completionStatus,
	currentCompletions,
	startCompletion,
} from '@codemirror/autocomplete';

import { editorHost, NOOP_HOST, type EditorHost, type VaultTag } from '#lib/core/markdown-editor/editor-host.js';
import { tagCompletionSource } from '#lib/core/markdown-editor/extensions/tag/completion.js';

const TAGS: VaultTag[] = [
	{ name: 'project', count: 2 },
	{ name: 'prose', count: 5 },
	{ name: 'area', count: 1 },
	{ name: 'area/sub', count: 4 },
];

/** A host whose `listTags` resolves `tags`. */
function tagHost(tags: readonly VaultTag[] = TAGS) {
	return { ...NOOP_HOST, listTags: vi.fn(() => Promise.resolve(tags)) } satisfies EditorHost;
}

/** Runs the source on `doc` with the cursor at its end. */
function complete(doc: string, host: EditorHost, explicit = false) {
	const state = EditorState.create({
		doc,
		extensions: editorHost.of(host),
		selection: EditorSelection.cursor(doc.length),
	});
	return tagCompletionSource(new CompletionContext(state, doc.length, explicit));
}

const views: EditorView[] = [];

afterEach(() => {
	for (const v of views.splice(0)) v.destroy();
	document.body.innerHTML = '';
	vi.restoreAllMocks();
});

describe('tagCompletionSource', () => {
	it('lists the host tags the typed prefix matches, ranked, replacing the prefix', async () => {
		const host = tagHost();
		const result = await complete('see #pro', host);

		expect(host.listTags).toHaveBeenCalledTimes(1);
		expect(result!.options.map((o) => o.label)).toEqual(['prose', 'project']);
		expect(result!.from).toBe(5);
		expect(result!.to).toBe(8);
		expect(result!.filter).toBe(false);
	});

	it('lists every tag, most-used first, right after #', async () => {
		const result = await complete('#', tagHost());
		expect(result!.options.map((o) => o.label)).toEqual(['prose', 'area/sub', 'project', 'area']);
	});

	it('returns null when no tag matches', async () => {
		expect(await complete('#zzz', tagHost())).toBeNull();
		expect(await complete('#zzz', tagHost(), true)).toBeNull();
		expect(await complete('#', tagHost([]))).toBeNull();
	});

	it('returns null without asking the host where no tag can start', async () => {
		const host = tagHost();
		for (const doc of ['# ', '## Title', 'foo#pro', 'run `#pro', '```\n#pro', '---\ntags: #pro\n---\n', 'plain text']) {
			const state = EditorState.create({ doc, extensions: editorHost.of(host) });
			const pos = doc.startsWith('---') ? doc.indexOf('#pro') + 4 : doc.length;
			expect(await tagCompletionSource(new CompletionContext(state, pos, false)), doc).toBeNull();
		}
		expect(host.listTags).not.toHaveBeenCalled();
	});

	it('returns null when the host fails to list tags', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const host = { ...NOOP_HOST, listTags: () => Promise.reject(new Error('ipc down')) } satisfies EditorHost;

		expect(await complete('#pro', host)).toBeNull();
		expect(console.error).toHaveBeenCalled();
	});
});

describe('accepting a tag suggestion', () => {
	/**
	 * Mounts an editor on `doc` with the cursor at `cursor` (default: the end)
	 * and only the tag source, opens the list and waits for it. No interaction
	 * delay, so the list accepts as soon as it opens.
	 */
	async function openList(doc: string, host: EditorHost, cursor = doc.length): Promise<EditorView> {
		const view = new EditorView({
			state: EditorState.create({
				doc,
				selection: EditorSelection.cursor(cursor),
				extensions: [editorHost.of(host), autocompletion({ override: [tagCompletionSource], interactionDelay: 0 })],
			}),
			parent: document.body.appendChild(document.createElement('div')),
		});
		views.push(view);
		startCompletion(view);
		await vi.waitFor(() => expect(completionStatus(view.state)).toBe('active'));
		return view;
	}

	it('replaces the typed prefix with the tag name', async () => {
		const view = await openList('see #pro and', tagHost(), 8);
		expect(currentCompletions(view.state)[0]?.label).toBe('prose');

		expect(acceptCompletion(view)).toBe(true);
		expect(view.state.doc.toString()).toBe('see #prose and');
	});

	it('replaces the whole tag when the cursor sits inside it', async () => {
		const view = await openList('see #project and', tagHost(), 8);
		expect(currentCompletions(view.state)[0]?.label).toBe('prose');

		expect(acceptCompletion(view)).toBe(true);
		expect(view.state.doc.toString()).toBe('see #prose and');
	});

	it('inserts a nested tag in full', async () => {
		const view = await openList('#sub', tagHost());
		expect(currentCompletions(view.state).map((c) => c.label)).toEqual(['area/sub']);

		expect(acceptCompletion(view)).toBe(true);
		expect(view.state.doc.toString()).toBe('#area/sub');
		expect(view.state.selection.main.head).toBe('#area/sub'.length);
	});
});
