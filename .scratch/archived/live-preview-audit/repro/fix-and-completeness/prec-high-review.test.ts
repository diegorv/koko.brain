// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import { Prec, type Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { livePreviewExtensions } from '#lib/core/markdown-editor/extensions/live-preview/live-preview.js';
import { metaBindInputPlugin } from '#lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.js';
import { mountMarkdownView, testMarkdown, withFullParse } from '../../../test-helpers';

beforeAll(() => {
	Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList;
	Range.prototype.getBoundingClientRect ??= () => new DOMRect();
});
afterEach(() => document.body.replaceChildren());

/** Main as-is, and main with the branch fix (Prec.high on metaBindInput). */
const VARIANTS: Record<string, () => Extension[]> = {
	main: () => [testMarkdown(), livePreviewExtensions({})],
	fix: () => [
		testMarkdown(),
		livePreviewExtensions({ metaBindInput: true }),
		Prec.high(metaBindInputPlugin),
	],
};

const SELECT = 'INPUT[inlineSelect(option(good, good), option(bad, bad)):mood]';

function mount(body: string, variant: string, fm = 'mood: good', cursorAt = 'end'): EditorView {
	const doc = `---\n${fm}\n---\n# Daily\n\n${body}\n\nend\n`;
	return withFullParse(() =>
		mountMarkdownView(doc, { cursor: doc.lastIndexOf(cursorAt), extensions: VARIANTS[variant]() }),
	);
}

function pick(view: EditorView, value: string, index = 0) {
	const sel = view.contentDOM.querySelectorAll<HTMLSelectElement>('select.cm-lp-meta-bind-select')[index];
	expect(sel, 'select drawn before the write').toBeTruthy();
	sel.value = value;
	withFullParse(() => sel.dispatchEvent(new Event('change')));
}

const count = (view: EditorView, sel: string) => view.contentDOM.querySelectorAll(sel).length;

const CONTAINERS: Record<string, string> = {
	paragraph: `Field: \`${SELECT}\``,
	'list item': `- \`${SELECT}\``,
	'task item': `- [ ] \`${SELECT}\``,
	'ordered item': `1. \`${SELECT}\``,
	blockquote: `> \`${SELECT}\``,
	heading: `## \`${SELECT}\``,
	'callout content': `> [!note] Title\n> \`${SELECT}\``,
	'callout title': `> [!note] \`${SELECT}\``,
	'link label': `[\`${SELECT}\`](https://x.y)`,
	highlight: `==\`${SELECT}\`==`,
	bold: `**\`${SELECT}\`**`,
	'next to other inline code': `\`code\` \`${SELECT}\``,
	'two inputs on a line': `\`${SELECT}\` and \`${SELECT}\``,
};

for (const variant of Object.keys(VARIANTS)) {
	describe(`[${variant}] meta-bind select stays drawn after a write`, () => {
		for (const [name, body] of Object.entries(CONTAINERS)) {
			it(name, () => {
				const view = mount(body, variant);
				const before = count(view, 'select.cm-lp-meta-bind-select');
				pick(view, 'bad');
				expect(view.state.doc.toString()).toContain('mood: bad');
				expect(count(view, 'select.cm-lp-meta-bind-select'), 'selects after write').toBe(before);
				view.destroy();
			});
		}
	});

	describe(`[${variant}] precedence side effects`, () => {
		it('reveal: cursor on the INPUT line shows source, no control', () => {
			const view = mount(`Field: \`${SELECT}\``, variant, 'mood: good', 'Field');
			expect(count(view, 'select.cm-lp-meta-bind-select')).toBe(0);
			expect(view.contentDOM.textContent).toContain('`INPUT[inlineSelect');
			view.destroy();
		});

		it('malformed INPUT (unknown type, no options) shows its source text', () => {
			const view = mount('Field: `INPUT[foo:bar]` and `INPUT[broken`', variant);
			expect(count(view, 'select.cm-lp-meta-bind-select')).toBe(0);
			expect(view.contentDOM.textContent).toContain('INPUT[foo:bar]');
			view.destroy();
		});

		it('INPUT inside an inline %%comment%% stays hidden', () => {
			const view = mount(`a %%\`${SELECT}\`%% b`, variant);
			expect(count(view, 'select.cm-lp-meta-bind-select')).toBe(0);
			view.destroy();
		});

		it('INPUT inside a %% block comment stays hidden', () => {
			const view = mount(`%%\n\`${SELECT}\`\n%%`, variant);
			const sel = view.contentDOM.querySelector('select.cm-lp-meta-bind-select');
			const line = sel?.closest('.cm-line');
			expect(!sel || line?.classList.contains('cm-lp-hidden-line'), 'no visible control').toBe(true);
			view.destroy();
		});

		it('mousedown on the select does not move the cursor', () => {
			const view = mount(`Field: \`${SELECT}\``, variant);
			const head = view.state.selection.main.head;
			const sel = view.contentDOM.querySelector('select.cm-lp-meta-bind-select')!;
			sel.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
			expect(view.state.selection.main.head).toBe(head);
			view.destroy();
		});

		it('piped table with INPUT in a header cell: one table, select works', () => {
			const view = mount(`| \`${SELECT}\` | b |\n| --- | --- |\n| 1 | 2 |`, variant);
			expect(count(view, '.cm-lp-table-wrapper')).toBe(1);
			expect(count(view, 'select.cm-lp-meta-bind-select')).toBe(1);
			pick(view, 'bad');
			expect(count(view, '.cm-lp-table-wrapper'), 'table after write').toBe(1);
			expect(count(view, 'select.cm-lp-meta-bind-select'), 'selects after write').toBe(1);
			view.destroy();
		});

		it('pipe-less table whose header starts with an INPUT: one table, one select', () => {
			const view = mount(`\`${SELECT}\` | b\n--- | ---\n1 | 2`, variant);
			expect(count(view, '.cm-lp-table-wrapper'), 'table drawn').toBe(1);
			expect(count(view, 'select.cm-lp-meta-bind-select'), 'one select (in the table)').toBe(1);
			pick(view, 'bad');
			expect(view.state.doc.toString()).toContain('mood: bad');
			expect(count(view, '.cm-lp-table-wrapper'), 'table after write').toBe(1);
			expect(count(view, 'select.cm-lp-meta-bind-select'), 'selects after write').toBe(1);
			view.destroy();
		});

		it('pipe-less table: a body row starting with an INPUT keeps the table single', () => {
			const view = mount(`a | b\n--- | ---\n\`${SELECT}\` | 2`, variant);
			expect(count(view, '.cm-lp-table-wrapper')).toBe(1);
			const visible = [...view.contentDOM.querySelectorAll('select.cm-lp-meta-bind-select')].filter(
				(s) => !s.closest('.cm-lp-hidden-line'),
			);
			expect(visible.length, 'one visible select (inside the table)').toBe(1);
			view.destroy();
		});
	});
}
