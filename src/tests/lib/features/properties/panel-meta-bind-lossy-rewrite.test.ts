// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

const disk = new Map<string, string>();

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(async (p: string) => {
		if (!disk.has(p)) throw new Error(`No such file: ${p}`);
		return disk.get(p)!;
	}),
	writeTextFile: vi.fn(async (p: string, c: string) => {
		disk.set(p, c);
	}),
	exists: vi.fn(async (p: string) => disk.has(p)),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(async () => undefined),
}));

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import { toast } from 'svelte-sonner';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { resetEditor } from '#lib/core/editor/editor.service.js';
import { propertiesStore } from '#lib/features/properties/properties.store.svelte.js';
import {
	parseAndSetProperties,
	resetProperties,
	updateProperty,
} from '#lib/features/properties/properties.service.js';
import { MetaBindToggleWidget } from '#lib/core/markdown-editor/extensions/live-preview/widgets.js';
import { toggleFavoriteForPath } from '#lib/features/properties/lifecycle.service.js';

/*
 * The Properties panel and meta-bind rebuild the whole frontmatter block from
 * the parsed properties, so a block the round trip cannot reproduce must be
 * refused with the frontmatter error toast, bytes unchanged.
 */

const NOTE = '/vault/rich.md';
const COMMENT = '---\ntitle: x  # reviewed\ndone: false\n---\n# Body\n';
const NESTED = '---\ntitle: x\ndone: false\nmeta:\n  source: interview\n  page: 12\n---\n# Body\n';
const BIG_INT = '---\ntweet_id: 1234567890123456789\ndone: false\n---\n# Body\n';

const cases = [
	{ name: 'a comment', content: COMMENT, message: /has comments/ },
	{ name: 'a nested map', content: NESTED, message: /has nested values/ },
	{ name: 'an integer beyond 2^53', content: BIG_INT, message: /could not be parsed/ },
];

describe('panel and meta-bind edits on frontmatter the rewrite would lose', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		disk.clear();
		resetEditor();
		resetProperties();
		vi.mocked(toast.error).mockClear();
	});
	afterEach(() => {
		resetEditor();
		vi.useRealTimers();
	});

	describe.each(cases)('on $name', ({ content, message }) => {
		it('a Properties panel checkbox refuses with the toast and leaves the bytes unchanged', async () => {
			disk.set(NOTE, content);
			editorStore.addTab({ path: NOTE, name: 'rich.md', content, savedContent: content });
			parseAndSetProperties(content, NOTE);
			const before = propertiesStore.properties;

			updateProperty('done', true, 'boolean');
			await vi.advanceTimersByTimeAsync(600);

			expect(editorStore.activeTab?.content).toBe(content);
			expect(disk.get(NOTE)).toBe(content);
			expect(propertiesStore.properties).toEqual(before);
			expect(toast.error).toHaveBeenCalledTimes(1);
			expect(vi.mocked(toast.error).mock.calls[0][0]).toMatch(/^rich\.md: /);
			expect(vi.mocked(toast.error).mock.calls[0][0]).toMatch(message);
		});

		it('a meta-bind toggle refuses with the toast and leaves the doc unchanged', () => {
			const root = document.body.appendChild(document.createElement('div'));
			const view = new EditorView({ state: EditorState.create({ doc: content }), parent: root });
			const dom = new MetaBindToggleWidget('done', 'false').toDOM(view);
			const cb = dom.querySelector<HTMLInputElement>('.cm-lp-meta-bind-toggle-input')!;
			cb.checked = true;
			cb.dispatchEvent(new Event('change'));

			expect(view.state.doc.toString()).toBe(content);
			expect(cb.checked).toBe(false);
			expect(toast.error).toHaveBeenCalledTimes(1);
			expect(vi.mocked(toast.error).mock.calls[0][0]).toMatch(/^Cannot set done: the note's /);
			expect(vi.mocked(toast.error).mock.calls[0][0]).toMatch(message);
			view.destroy();
		});
	});

	it('control: the sidebar favorite on the same closed note refuses and writes nothing', async () => {
		disk.set(NOTE, NESTED);
		await toggleFavoriteForPath(NOTE, true);
		expect(disk.get(NOTE)).toBe(NESTED);
	});
});
