// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import type { EditorView } from '@codemirror/view';
import { livePreviewExtensions } from '#lib/core/markdown-editor/extensions/live-preview/live-preview.js';
import { mountMarkdownView, testMarkdown, withFullParse } from '../../test-helpers';

/**
 * A plain fenced code block renders every line inside a callout, a blockquote
 * and a list item, without the container prefix, and its Copy button and
 * language switcher act on the same text and range as at the top level.
 * The cursor sits on the trailing "end" line, so every block is unrevealed.
 */

beforeAll(() => {
	Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList;
	Range.prototype.getBoundingClientRect ??= () => new DOMRect();
});
afterEach(() => {
	document.body.replaceChildren();
	vi.unstubAllGlobals();
});

function mount(doc: string): EditorView {
	return withFullParse(() =>
		mountMarkdownView(doc, {
			cursor: doc.lastIndexOf('end'),
			extensions: [testMarkdown(), livePreviewExtensions({})],
		}),
	);
}
const q = <T extends HTMLElement>(v: EditorView, s: string) => v.contentDOM.querySelector<T>(s);

/** Wraps a top-level block in each container, prefixing every one of its lines. */
const CONTAINERS: [string, (block: string) => string][] = [
	['top level', (b) => b],
	['a callout', (b) => `> [!note] T\n${b.split('\n').map((l) => '> ' + l).join('\n')}`],
	['a blockquote', (b) => b.split('\n').map((l) => '> ' + l).join('\n')],
	['a list item', (b) => `- item\n\n${b.split('\n').map((l) => '  ' + l).join('\n')}`],
];

const BLOCK = '```js\na = 1\n\n  b = 2\n```';
const CODE = 'a = 1\n\n  b = 2';

for (const [where, wrap] of CONTAINERS) {
	describe(`plain code block in ${where}`, () => {
		const doc = `# H\n\n${wrap(BLOCK)}\n\nend\n`;

		it('renders every line without the container prefix', () => {
			const view = mount(doc);
			expect(q(view, '.cm-lp-codeblock-pre')?.textContent).toBe(CODE);
			view.destroy();
		});

		it('copies every line without the container prefix', async () => {
			const writeText = vi.fn(() => Promise.resolve());
			vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
			const view = mount(doc);
			const copy = q(view, '.cm-lp-codeblock-copy')!;
			copy.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
			expect(writeText).toHaveBeenCalledWith(CODE);
			view.destroy();
		});

		it('switches the language by rewriting only the fence tag', () => {
			const view = mount(doc);
			const select = q<HTMLSelectElement>(view, '.cm-lp-codeblock-lang-select')!;
			select.value = 'python';
			select.dispatchEvent(new Event('change'));
			expect(view.state.doc.toString()).toBe(doc.replace('```js', '```python'));
			view.destroy();
		});
	});
}
