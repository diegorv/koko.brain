// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import { Prec, type Extension } from '@codemirror/state';
import { highlightSpecialChars, type EditorView } from '@codemirror/view';
import { livePreviewExtensions } from '#lib/core/markdown-editor/extensions/live-preview/live-preview.js';
import { metaBindInputPlugin } from '#lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.js';
import { fencedBlockRenderers } from '#lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.js';
import { fakeBlockRenderer, mountMarkdownView, testMarkdown, withFullParse } from '../../test-helpers';

beforeAll(() => {
	Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList;
	Range.prototype.getBoundingClientRect ??= () => new DOMRect();
});
afterEach(() => document.body.replaceChildren());

const SELECT = 'INPUT[inlineSelect(option(good, good), option(bad, bad)):mood]';

/** Current main wiring. */
const MAIN: Extension[] = [testMarkdown(), livePreviewExtensions({})];
/** The branch fix: metaBindInput at Prec.high. */
const FIXED: Extension[] = [
	testMarkdown(),
	Prec.high(metaBindInputPlugin),
	livePreviewExtensions({ metaBindInput: true }),
];

function mount(body: string, extensions: Extension[], fm = 'mood: good'): EditorView {
	const doc = `---\n${fm}\n---\n# Daily\n\n${body}\n\nend\n`;
	return withFullParse(() => mountMarkdownView(doc, { cursor: doc.indexOf('end'), extensions }));
}
const q = <T extends HTMLElement>(v: EditorView, s: string) => v.contentDOM.querySelector<T>(s);
const qa = (v: EditorView, s: string) => v.contentDOM.querySelectorAll(s).length;

function pick(select: HTMLSelectElement, value: string) {
	select.value = value;
	withFullParse(() => select.dispatchEvent(new Event('change')));
}

const CONTAINERS: [string, string][] = [
	['callout content line', `> [!note] Title\n> Mood: \`${SELECT}\``],
	['callout title', `> [!note] Mood \`${SELECT}\`\n> body`],
	['list item', `- Mood: \`${SELECT}\``],
	['task item', `- [ ] Mood: \`${SELECT}\``],
	['blockquote', `> Mood: \`${SELECT}\``],
	['heading', `## Mood \`${SELECT}\``],
];

for (const [label, ext] of [
	['main', MAIN],
	['fix', FIXED],
] as const) {
	describe(`meta-bind INPUT inside containers (${label})`, () => {
		for (const [name, body] of CONTAINERS) {
			it(`stays drawn after a pick: ${name}`, () => {
				const view = mount(body, ext);
				const sel = q<HTMLSelectElement>(view, 'select.cm-lp-meta-bind-select');
				expect(sel, 'drawn initially').not.toBeNull();
				pick(sel!, 'bad');
				expect(view.state.doc.toString()).toContain('mood: bad');
				expect(q(view, 'select.cm-lp-meta-bind-select'), 'drawn after write').not.toBeNull();
				expect(qa(view, 'select.cm-lp-meta-bind-select')).toBe(1);
				view.destroy();
			});
		}
	});
}

const TABLE_BODY = `| Key | Value |\n| --- | --- |\n| mood | \`${SELECT}\` |`;
const TABLE_HEAD = `| \`${SELECT}\` | Value |\n| --- | --- |\n| a | b |`;
const TABLE_PIPELESS_HEAD = `\`${SELECT}\` | Value\n--- | ---\na | b`;
const TABLE_CALLOUT = `> [!note] T\n> | Key | Value |\n> | --- | --- |\n> | mood | \`${SELECT}\` |`;

for (const [label, ext] of [
	['main', MAIN],
	['fix', FIXED],
] as const) {
	describe(`table widget (${label})`, () => {
		for (const [name, body] of [
			['select in a body cell', TABLE_BODY],
			['select in a header cell', TABLE_HEAD],
			['table inside a callout', TABLE_CALLOUT],
			['pipe-less table, select first in the header', TABLE_PIPELESS_HEAD],
		] as const) {
			it(`${name}: one table, one select, survives a pick`, () => {
				const view = mount(body, ext);
				expect(qa(view, '.cm-lp-table-wrapper'), 'one table initially').toBe(1);
				const sel = q<HTMLSelectElement>(view, '.cm-lp-table-wrapper select.cm-lp-meta-bind-select');
				expect(sel, 'table renders the cell select').not.toBeNull();
				expect(qa(view, 'select.cm-lp-meta-bind-select'), 'no stray control').toBe(1);
				pick(sel!, 'bad');
				expect(view.state.doc.toString()).toContain('mood: bad');
				expect(qa(view, '.cm-lp-table-wrapper'), 'one table after write').toBe(1);
				const after = q<HTMLSelectElement>(view, '.cm-lp-table-wrapper select.cm-lp-meta-bind-select');
				expect(after?.value).toBe('bad');
				view.destroy();
			});
		}

		it('+row click keeps the table drawn (table inside a callout)', () => {
			const view = mount(TABLE_CALLOUT, ext);
			const btn = q<HTMLElement>(view, '.cm-lp-table-add-row')!;
			expect(btn).not.toBeNull();
			withFullParse(() => {
				btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
				btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
			});
			expect(view.state.doc.lines).toBeGreaterThan(11);
			expect(qa(view, '.cm-lp-table-wrapper')).toBe(1);
			view.destroy();
		});
	});
}

describe('code block language select', () => {
	for (const [name, body] of [
		['top level', '```js\nlet a = 1;\n```'],
		['in a blockquote', '> ```js\n> let a = 1;\n> ```'],
		['in a callout', '> [!note] T\n> ```js\n> let a = 1;\n> ```'],
		['in a list item', '- item\n  ```js\n  let a = 1;\n  ```'],
	] as const) {
		it(`stays drawn after a language change: ${name}`, () => {
			const view = mount(body, MAIN);
			const sel = q<HTMLSelectElement>(view, 'select.cm-lp-codeblock-lang-select');
			expect(sel, 'drawn initially').not.toBeNull();
			const other = [...sel!.options].find((o) => o.value && o.value !== 'js' && o.value !== 'javascript')!;
			sel!.value = other.value;
			withFullParse(() => sel!.dispatchEvent(new Event('change')));
			expect(view.state.doc.toString()).toContain('```' + other.value);
			expect(q(view, 'select.cm-lp-codeblock-lang-select'), 'drawn after change').not.toBeNull();
			view.destroy();
		});
	}
});

describe('callout widgets', () => {
	for (const [name, body] of [
		['plain', '> [!note] Title\n> body'],
		['title starts with a wikilink', '> [!note]- [[Target]] rest\n> body'],
		['title starts with inline code', '> [!note] `code` rest\n> body'],
		['nested in a list', '- > [!note] Title\n  > body'],
	] as const) {
		it(`type switcher survives a type pick: ${name}`, () => {
			const view = mount(body, MAIN);
			const switcher = q(view, '.cm-lp-callout-type-switcher');
			expect(switcher, 'switcher drawn initially').not.toBeNull();
			const opt = [...view.contentDOM.querySelectorAll<HTMLElement>('.cm-lp-callout-type-option')].find(
				(o) => !o.classList.contains('cm-lp-callout-type-option-current'),
			)!;
			withFullParse(() => opt.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })));
			expect(view.state.doc.toString()).not.toContain('[!note]');
			expect(q(view, '.cm-lp-callout-type-switcher'), 'switcher drawn after pick').not.toBeNull();
			expect(q(view, '.cm-lp-callout-fold'), 'chevron drawn after pick').not.toBeNull();
			view.destroy();
		});

		it(`fold chevron survives a fold toggle: ${name}`, () => {
			const view = mount(body, MAIN);
			const chevron = q<HTMLElement>(view, '.cm-lp-callout-fold');
			expect(chevron, 'chevron drawn initially').not.toBeNull();
			withFullParse(() => chevron!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })));
			expect(q(view, '.cm-lp-callout-fold'), 'chevron drawn after toggle').not.toBeNull();
			expect(q(view, '.cm-lp-callout-type-switcher')).not.toBeNull();
			view.destroy();
		});
	}
});

describe('block math formula edited in place (cursor elsewhere)', () => {
	for (const [name, body] of [
		['top level', '$$\nx+1\n$$'],
		['in a blockquote', '> $$\n> x+1\n> $$'],
		['in a callout', '> [!note] T\n> $$\n> x+1\n> $$'],
		['in a callout, two spaces', '> [!note] T\n>  $$\n>  x+1\n>  $$'],
		['in a list item', '- item\n  $$\n  x+1\n  $$'],
	] as const) {
		it(name, () => {
			const view = mount(body, MAIN);
			expect(qa(view, '.cm-lp-math-block, .cm-lp-math-error'), 'math drawn initially').toBe(1);
			const at = view.state.doc.toString().indexOf('x+1');
			withFullParse(() => view.dispatch({ changes: { from: at, to: at + 1, insert: 'y' } }));
			expect(qa(view, '.cm-lp-math-block, .cm-lp-math-error'), 'math drawn after edit').toBe(1);
			view.destroy();
		});
	}
});

describe('highlightSpecialChars (registered before livePreview) at a widget start', () => {
	it('zero-width space at the start of a pipe-less table header line, select pick in a cell', () => {
		const ext = [testMarkdown(), highlightSpecialChars(), livePreviewExtensions({})];
		const view = mount(`​Key | Value\n--- | ---\nmood | \`${SELECT}\``, ext);
		expect(qa(view, '.cm-lp-table-wrapper'), 'table drawn initially').toBe(1);
		const sel = q<HTMLSelectElement>(view, '.cm-lp-table-wrapper select.cm-lp-meta-bind-select')!;
		pick(sel, 'bad');
		expect(qa(view, '.cm-lp-table-wrapper'), 'table drawn after write').toBe(1);
		view.destroy();
	});
});

describe('pipe-less table whose header starts with an INPUT, under the Prec.high fix', () => {
	it('exactly one table and one select, before and after a pick', () => {
		const view = mount(`\`${SELECT}\` | Value\n--- | ---\na | b`, FIXED);
		const counts = () => [qa(view, '.cm-lp-table-wrapper'), qa(view, 'select.cm-lp-meta-bind-select')];
		const initial = counts();
		const sel = q<HTMLSelectElement>(view, '.cm-lp-table-wrapper select.cm-lp-meta-bind-select')!;
		pick(sel, 'bad');
		const after = counts();
		expect({ initial, after }).toEqual({ initial: [1, 1], after: [1, 1] });
		view.destroy();
	});
});

describe('fenced block widgets edited in place with the cursor elsewhere', () => {
	const fenced = (lang: string) => [
		testMarkdown(),
		fencedBlockRenderers.of(fakeBlockRenderer(lang)),
		livePreviewExtensions({}),
	];
	for (const [name, body, ext, sel, find, repl] of [
		['collection (fake renderer)', '```collection\nviews: a\n```', fenced('collection'), '.cm-test-fenced-block', 'views: a', 'views: b'],
		['queryjs (fake renderer)', '```queryjs\nkb.x()\n```', fenced('queryjs'), '.cm-test-fenced-block', 'kb.x()', 'kb.y()'],
		['meta-bind button', '```meta-bind-button\nlabel: Go\nstyle: primary\nactions:\n  - type: open\n    link: x\n```', MAIN, '.cm-lp-meta-bind-btn', 'label: Go', 'label: Run'],
		['code block body', '```js\nlet a = 1;\n```', MAIN, '.cm-lp-codeblock', 'a = 1', 'a = 2'],
		['code block in a callout, body', '> [!note] T\n> ```js\n> let a = 1;\n> ```', MAIN, '.cm-lp-codeblock', 'a = 1', 'a = 2'],
	] as [string, string, Extension[], string, string, string][]) {
		it(name, () => {
			const view = mount(body, ext);
			expect(qa(view, sel), 'drawn initially').toBe(1);
			const doc = view.state.doc.toString();
			const at = doc.indexOf(find, doc.indexOf('# Daily'));
			withFullParse(() => view.dispatch({ changes: { from: at, to: at + find.length, insert: repl } }));
			expect(qa(view, sel), 'drawn after the update').toBe(1);
			view.destroy();
		});
	}
});

describe('inline widgets inside block containers, eq-false update with the cursor elsewhere', () => {
	const CASES: [string, string, string, string, string][] = [
		// name, body, selector, text to replace, replacement
		['checkbox in a callout', '> [!note] T\n> - [ ] task', '.cm-lp-task-checkbox', '[ ]', '[x]'],
		['checkbox in a blockquote', '> - [ ] task', '.cm-lp-task-checkbox', '[ ]', '[x]'],
		['ordered marker in a callout', '> [!note] T\n>\n> 1. one', '.cm-lp-ol-marker', '1.', '2.'],
		['image alt in a callout', '> [!note] T\n> ![alt](https://x.test/a.png)', '.cm-lp-image', 'alt', 'ALT'],
		['image embed width in a callout', '> [!note] T\n> ![[a.png|100]]', '.cm-lp-image-wrapper', '100', '200'],
		['inline math in a callout', '> [!note] T\n> $x+1$', '.cm-lp-math-inline', 'x+1', 'y+1'],
		['inline math in a table cell', '| a | $x+1$ |\n| - | - |\n| b | c |', '.cm-lp-table-wrapper', 'x+1', 'y+1'],
	];
	for (const [name, body, sel, find, repl] of CASES) {
		it(name, () => {
			const view = mount(body, MAIN);
			expect(qa(view, sel), 'drawn initially').toBe(1);
			const doc = view.state.doc.toString();
			const at = doc.indexOf(find, doc.indexOf('# Daily'));
			withFullParse(() => view.dispatch({ changes: { from: at, to: at + find.length, insert: repl } }));
			expect(qa(view, sel), 'drawn after the update').toBe(1);
			view.destroy();
		});
	}
});
