// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import { toast } from 'svelte-sonner';
import {
	MetaBindSelectWidget,
	MetaBindToggleWidget,
} from '#lib/core/markdown-editor/extensions/live-preview/widgets.js';
import { _resetParseFrontmatterCache, detectLossyFrontmatter } from '#lib/core/frontmatter/properties.logic.js';

// F97 / F103: the meta-bind writers (toggle, inline select) only refuse an
// unparseable block. A parseable block that the round trip loses is rewritten.
// Real CodeMirror view, real widgets, real properties.logic.

function mount(doc: string, widget: { toDOM(view: EditorView): HTMLElement }) {
	const root = document.body.appendChild(document.createElement('div'));
	const view = new EditorView({ state: EditorState.create({ doc }), parent: root });
	const dom = widget.toDOM(view);
	root.appendChild(dom);
	return { view, dom };
}

function clickToggle(doc: string, target: string, current: string): string {
	const { view, dom } = mount(doc, new MetaBindToggleWidget(target, current));
	const cb = dom.querySelector('input')!;
	cb.checked = !cb.checked;
	cb.dispatchEvent(new Event('change'));
	return view.state.doc.toString();
}

function pickSelect(doc: string, target: string, value: string): string {
	const options = [
		{ value: 'draft', label: 'Draft' },
		{ value: 'done', label: 'Done' },
	];
	const { view, dom } = mount(doc, new MetaBindSelectWidget(options, target, 'draft'));
	const select = dom instanceof HTMLSelectElement ? dom : dom.querySelector('select');
	if (select) {
		select.value = value;
		select.dispatchEvent(new Event('change'));
	} else {
		throw new Error('select control not found; inspect MetaBindSelectWidget DOM');
	}
	return view.state.doc.toString();
}

beforeEach(() => {
	vi.mocked(toast.error).mockClear();
	_resetParseFrontmatterCache();
});

describe('F97: meta-bind toggle on lossy-but-parseable frontmatter', () => {
	const NESTED =
		'---\ntitle: Trip\ndates:\n  start: 2026-01-01\nfavorite: false\n# keep this\n---\n\nINPUT[toggle():favorite]\n';

	it('precondition: the shared detector classifies the block as lossy', () => {
		expect(detectLossyFrontmatter(NESTED)).toBe('nested');
	});

	it('keeps the nested mapping, or refuses the write', () => {
		const after = clickToggle(NESTED, 'favorite', 'false');
		const refused = after === NESTED;
		if (!refused) {
			expect(after).toContain('dates:\n  start: 2026-01-01');
		}
	});

	it('keeps the comment, or refuses the write', () => {
		const after = clickToggle(NESTED, 'favorite', 'false');
		if (after !== NESTED) expect(after).toContain('# keep this');
	});

	it('keeps the first of two duplicate keys, or refuses the write', () => {
		const DUP = '---\nstatus: draft\nnote: first\nnote: second\n---\n\nbody\n';
		expect(detectLossyFrontmatter(DUP)).toBe('duplicate-keys');
		const after = pickSelect(DUP, 'status', 'done');
		if (after !== DUP) expect(after).toContain('note: first');
	});
});

describe('F103: meta-bind select rewrites untouched numbers', () => {
	const DOC = '---\ntweet_id: 1234567890123456789\nprice: 9.90\nstatus: draft\n---\n\nbody\n';

	it('precondition: the shared detector flags the unsafe integer', () => {
		expect(detectLossyFrontmatter(DOC)).toBe('unparseable');
	});

	it('keeps tweet_id digits, or refuses the write', () => {
		const after = pickSelect(DOC, 'status', 'done');
		if (after !== DOC) {
			const line = after.split('\n').find((l) => l.startsWith('tweet_id:'));
			expect(line).toBe('tweet_id: 1234567890123456789');
		}
	});

	it('keeps price: 9.90 byte for byte when only status changes', () => {
		const DOC2 = '---\nprice: 9.90\nstatus: draft\n---\n\nbody\n';
		const after = pickSelect(DOC2, 'status', 'done');
		expect(after).toContain('status: done');
		const line = after.split('\n').find((l) => l.startsWith('price:'));
		expect(line).toBe('price: 9.90');
	});
});
