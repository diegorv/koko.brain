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

import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { resetEditor } from '#lib/core/editor/editor.service.js';
import {
	parseAndSetProperties,
	resetProperties,
	updateProperty,
} from '#lib/features/properties/properties.service.js';
import { MetaBindToggleWidget } from '#lib/core/markdown-editor/extensions/live-preview/widgets.js';
import { toggleFavoriteForPath } from '#lib/features/properties/lifecycle.service.js';

const NOTE = '/vault/rich.md';
const RICH =
	'---\ntitle: x  # reviewed\ndone: false\nmeta:\n  source: interview\n  page: 12\n---\n# Body\n';

function keepsUserData(text: string) {
	expect(text, text).toContain('# reviewed');
	expect(text, text).toContain('source: interview');
}

describe('repro o10 fidelity-6: panel and meta-bind edits must not drop comments or nested maps', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		disk.clear();
		resetEditor();
		resetProperties();
	});
	afterEach(() => {
		resetEditor();
		vi.useRealTimers();
	});

	it('Properties panel checkbox: the comment and the nested map survive on disk (or the edit is refused)', async () => {
		disk.set(NOTE, RICH);
		editorStore.addTab({ path: NOTE, name: 'rich.md', content: RICH, savedContent: RICH });
		parseAndSetProperties(RICH, NOTE);

		updateProperty('done', true, 'boolean');
		await vi.advanceTimersByTimeAsync(600);

		keepsUserData(disk.get(NOTE)!);
	});

	it('meta-bind toggle: the comment and the nested map survive in the doc (or the edit is refused)', () => {
		const root = document.body.appendChild(document.createElement('div'));
		const view = new EditorView({ state: EditorState.create({ doc: RICH }), parent: root });
		const dom = new MetaBindToggleWidget('done', 'false').toDOM(view);
		const cb = dom.querySelector<HTMLInputElement>('.cm-lp-meta-bind-toggle-input')!;
		cb.checked = true;
		cb.dispatchEvent(new Event('change'));

		keepsUserData(view.state.doc.toString());
		view.destroy();
	});

	it('control: the sidebar favorite on the same closed note refuses and writes nothing', async () => {
		disk.set(NOTE, RICH);
		await toggleFavoriteForPath(NOTE, true);
		expect(disk.get(NOTE)).toBe(RICH);
	});
});
