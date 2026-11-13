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
import { _resetParseFrontmatterCache } from '#lib/core/frontmatter/properties.logic.js';
import { parseAndSetProperties, resetProperties, updateProperty } from '#lib/features/properties/properties.service.js';
import { MetaBindSelectWidget, MetaBindToggleWidget } from '#lib/core/markdown-editor/extensions/live-preview/widgets.js';
import { toggleFavoriteForPath } from '#lib/features/properties/lifecycle.service.js';

/*
 * Rewriting one property rebuilds the whole frontmatter block; every other
 * number and boolean scalar must keep its source spelling byte for byte.
 */

const NOTE = '/vault/contact.md';

const SPELLINGS = [
	'id: 0042',
	'zip: 01234',
	'phone: 0612345678',
	'version: 1.0',
	'ratio: 1.10',
	'price: 9.90',
	'mask: 0x1F',
	'perm: 0o17',
	'exp: 1e3',
	'done: True',
	'up: TRUE',
	'off: False',
	'no: FALSE',
];

function lineFor(content: string, key: string): string | undefined {
	return content.split('\n').find((l) => l.startsWith(`${key}:`));
}

describe('frontmatter rewrites keep number and boolean spellings', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		disk.clear();
		resetEditor();
		resetProperties();
		_resetParseFrontmatterCache();
		vi.mocked(toast.error).mockClear();
	});
	afterEach(() => {
		resetEditor();
		vi.useRealTimers();
	});

	it('sidebar favorite on a closed note keeps every spelling, adds _favorite and shows no toast', async () => {
		const original = `---\ntitle: Note\n${SPELLINGS.join('\n')}\n---\nBody\n`;
		disk.set(NOTE, original);

		await toggleFavoriteForPath(NOTE, true);

		const written = disk.get(NOTE)!;
		expect(written).toContain('_favorite: true');
		for (const line of SPELLINGS) {
			expect(lineFor(written, line.split(':')[0]), written).toBe(line);
		}
		expect(written.endsWith('---\nBody\n')).toBe(true);
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('meta-bind select on another key keeps price: 9.90 and done: True', () => {
		const content = '---\nprice: 9.90\ndone: True\nstatus: draft\n---\n\nbody\n';
		const root = document.body.appendChild(document.createElement('div'));
		const view = new EditorView({ state: EditorState.create({ doc: content }), parent: root });
		const options = [
			{ value: 'draft', label: 'draft' },
			{ value: 'final', label: 'final' },
		];
		const select = new MetaBindSelectWidget(options, 'status', 'draft').toDOM(view);
		select.value = 'final';
		select.dispatchEvent(new Event('change'));

		const after = view.state.doc.toString();
		expect(lineFor(after, 'status')).toBe('status: final');
		expect(lineFor(after, 'price')).toBe('price: 9.90');
		expect(lineFor(after, 'done')).toBe('done: True');
		expect(toast.error).not.toHaveBeenCalled();
		view.destroy();
	});

	it('meta-bind toggle on the bound key replaces its spelling and keeps the others', () => {
		const content = '---\nversion: 1.0\ndone: True\n---\n\nbody\n';
		const root = document.body.appendChild(document.createElement('div'));
		const view = new EditorView({ state: EditorState.create({ doc: content }), parent: root });
		const dom = new MetaBindToggleWidget('done', 'true').toDOM(view);
		const cb = dom.querySelector<HTMLInputElement>('.cm-lp-meta-bind-toggle-input')!;
		cb.checked = false;
		cb.dispatchEvent(new Event('change'));

		const after = view.state.doc.toString();
		// Meta-bind writes the new value as a YAML boolean; only the bound key changes.
		expect(lineFor(after, 'done')).toBe('done: false');
		expect(lineFor(after, 'version')).toBe('version: 1.0');
		view.destroy();
	});

	it('a Properties panel edit of one key keeps the other keys spelled as written', async () => {
		const content = `---\nstatus: draft\n${SPELLINGS.join('\n')}\n---\n# Body\n`;
		editorStore.addTab({ path: NOTE, name: 'contact.md', content, savedContent: content });
		parseAndSetProperties(content, NOTE);

		updateProperty('status', 'final', 'text');
		await vi.advanceTimersByTimeAsync(0);

		const after = editorStore.activeTab!.content;
		expect(lineFor(after, 'status')).toBe('status: final');
		for (const line of SPELLINGS) {
			expect(lineFor(after, line.split(':')[0]), after).toBe(line);
		}
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('changing a number key itself writes the new value', async () => {
		const content = '---\nversion: 1.0\nzip: 01234\n---\n# Body\n';
		editorStore.addTab({ path: NOTE, name: 'contact.md', content, savedContent: content });
		parseAndSetProperties(content, NOTE);

		updateProperty('version', 2, 'number');
		await vi.advanceTimersByTimeAsync(0);

		const after = editorStore.activeTab!.content;
		expect(lineFor(after, 'version')).toBe('version: 2');
		expect(lineFor(after, 'zip')).toBe('zip: 01234');
	});

	it('control: an unsafe integer is still refused with the toast', async () => {
		const original = '---\ntweet_id: 1234567890123456789\nzip: 01234\n---\nBody\n';
		disk.set(NOTE, original);
		await toggleFavoriteForPath(NOTE, true);
		expect(disk.get(NOTE)).toBe(original);
		expect(toast.error).toHaveBeenCalled();
	});
});
