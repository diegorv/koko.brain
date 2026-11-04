// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import {
	MetaBindTextInputWidget,
	MetaBindToggleWidget,
} from '#lib/core/markdown-editor/extensions/live-preview/widgets.js';
import { parseFrontmatterProperties } from '#lib/core/frontmatter/properties.logic.js';
import { getLifecycleState } from '#lib/features/properties/lifecycle.logic.js';

function mount(doc: string, widget: { toDOM(view: EditorView): HTMLElement }) {
	const root = document.body.appendChild(document.createElement('div'));
	const view = new EditorView({ state: EditorState.create({ doc }), parent: root });
	const dom = widget.toDOM(view);
	root.appendChild(dom);
	return { view, dom };
}

describe('repro o10 fidelity-3: meta-bind writers keep the YAML type of the value', () => {
	beforeAll(() => {
		// jsdom has no layout; a write's scroll snapshot makes CodeMirror measure,
		// so give Range the geometry an unrendered element reports.
		Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList;
		Range.prototype.getBoundingClientRect ??= () => new DOMRect();
	});

	it('INPUT[toggle():archived] (the documented example) ticked -> the note reads as archived', () => {
		const { view, dom } = mount('---\narchived: false\n---\n\n`INPUT[toggle():archived]`\n', new MetaBindToggleWidget('archived', 'false'));
		const cb = dom.querySelector<HTMLInputElement>('.cm-lp-meta-bind-toggle-input')!;
		cb.checked = true;
		cb.dispatchEvent(new Event('change'));

		const doc = view.state.doc.toString();
		expect(getLifecycleState(parseFrontmatterProperties(doc)), doc).toBe('archived');
	});

	it('number input 5 -> 7 keeps a number', () => {
		const { view, dom } = mount('---\ncount: 5\n---\nbody\n', new MetaBindTextInputWidget('number', 'count', '5'));
		const input = dom.querySelector<HTMLInputElement>('.cm-lp-meta-bind-input')!;
		input.value = '7';
		input.dispatchEvent(new Event('blur'));

		const doc = view.state.doc.toString();
		const count = parseFrontmatterProperties(doc).find((p) => p.key === 'count');
		expect(count, doc).toEqual({ key: 'count', value: 7, type: 'number' });
	});
});
