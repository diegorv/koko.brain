// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import type { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import { livePreviewExtensions } from '#lib/core/markdown-editor/extensions/live-preview/live-preview.js';
import { fencedBlockRenderers } from '#lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.js';
import { mountMarkdownView, testMarkdown, withFullParse, fakeBlockRenderer } from '../../test-helpers';

beforeAll(() => {
	Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList;
	Range.prototype.getBoundingClientRect ??= () => new DOMRect();
});
afterEach(() => {
	document.body.replaceChildren();
});

function mount(doc: string, extra: Extension[] = []): EditorView {
	return withFullParse(() =>
		mountMarkdownView(doc, {
			cursor: doc.lastIndexOf('end'),
			extensions: [testMarkdown(), livePreviewExtensions({}), ...extra],
		}),
	);
}
const q = <T extends HTMLElement>(v: EditorView, s: string) => v.contentDOM.querySelector<T>(s);
const qa = (v: EditorView, s: string) => v.contentDOM.querySelectorAll(s).length;

function pickLanguage(view: EditorView, index = 0, lang = 'python') {
	const sel = view.contentDOM.querySelectorAll<HTMLSelectElement>('select.cm-lp-codeblock-lang-select')[index];
	sel.value = lang;
	withFullParse(() => sel.dispatchEvent(new Event('change')));
}

const FM = '---\nmood: good\n---\n';
const SELECT = '`INPUT[inlineSelect(option(good, good), option(bad, bad)):mood]`';

describe('code block nested or adjacent: language change keeps the widget', () => {
	const cases: [string, string][] = [
		['top level', '```js\nx = 1\n```\n'],
		['in a callout', '> [!note] T\n> ```js\n> x = 1\n> ```\n'],
		['in a blockquote', '> ```js\n> x = 1\n> ```\n'],
		['in a list item', '- item\n\n  ```js\n  x = 1\n  ```\n'],
		['right after a table', '| a | b |\n| - | - |\n| 1 | 2 |\n```js\nx = 1\n```\n'],
		['right after another code block', '```ts\ny\n```\n```js\nx = 1\n```\n'],
		['right after frontmatter', '```js\nx = 1\n```\n'],
	];
	for (const [name, block] of cases) {
		it(name, () => {
			const doc = (name === 'right after frontmatter' ? FM : '# H\n\n') + block + '\nend\n';
			const view = mount(doc);
			const n = qa(view, 'select.cm-lp-codeblock-lang-select');
			expect(n, 'select drawn initially').toBeGreaterThan(0);
			pickLanguage(view, n - 1);
			expect(view.state.doc.toString()).toContain('```python');
			expect(qa(view, 'select.cm-lp-codeblock-lang-select'), 'selects still drawn').toBe(n);
			view.destroy();
		});
	}
});

describe('code block in a callout: content text', () => {
	it('does not show the quote prefix inside the code', () => {
		const view = mount('> [!note] T\n> ```js\n> a = 1\n> b = 2\n> ```\n\nend\n');
		const pre = q(view, '.cm-lp-codeblock-pre')!;
		expect(pre).not.toBeNull();
		expect(pre.textContent).not.toContain('>');
		view.destroy();
	});
});

describe('table nested in a callout', () => {
	const doc = `${FM}> [!note] T\n> | k | v |\n> | - | - |\n> | m | ${SELECT} |\n\nend\n`;
	it('renders the table', () => {
		const view = mount(doc);
		expect(q(view, '.cm-lp-table-wrapper')).not.toBeNull();
		view.destroy();
	});
	it('cell select write keeps the table and select', () => {
		const view = mount(doc);
		const sel = q<HTMLSelectElement>(view, '.cm-lp-table-wrapper select.cm-lp-meta-bind-select')!;
		expect(sel).not.toBeNull();
		sel.value = 'bad';
		withFullParse(() => sel.dispatchEvent(new Event('change')));
		expect(view.state.doc.toString()).toContain('mood: bad');
		expect(q(view, '.cm-lp-table-wrapper'), 'table drawn').not.toBeNull();
		expect(q<HTMLSelectElement>(view, '.cm-lp-table-wrapper select.cm-lp-meta-bind-select')?.value).toBe('bad');
		view.destroy();
	});
	it('+row keeps the table', () => {
		const view = mount(doc);
		const lines = view.state.doc.lines;
		const btn = q<HTMLButtonElement>(view, '.cm-lp-table-add-row')!;
		withFullParse(() => btn.click());
		expect(view.state.doc.lines).toBe(lines + 1);
		expect(q(view, '.cm-lp-table-wrapper'), 'table drawn').not.toBeNull();
		view.destroy();
	});
	it('+col keeps the table', () => {
		const view = mount(doc);
		const btn = q<HTMLButtonElement>(view, '.cm-lp-table-add-col')!;
		withFullParse(() => btn.click());
		expect(q(view, '.cm-lp-table-wrapper'), 'table drawn').not.toBeNull();
		view.destroy();
	});
});

describe('table right after frontmatter, cell select write', () => {
	it('keeps the table', () => {
		const doc = `${FM}| k | v |\n| - | - |\n| m | ${SELECT} |\n\nend\n`;
		const view = mount(doc);
		const sel = q<HTMLSelectElement>(view, '.cm-lp-table-wrapper select.cm-lp-meta-bind-select')!;
		expect(sel).not.toBeNull();
		sel.value = 'bad';
		withFullParse(() => sel.dispatchEvent(new Event('change')));
		expect(view.state.doc.toString()).toContain('mood: bad');
		expect(q(view, '.cm-lp-table-wrapper'), 'table drawn').not.toBeNull();
		view.destroy();
	});
});

describe('callout widgets with nested blocks', () => {
	it('type change keeps nested table and code block', () => {
		const doc = '> [!note] T\n> | a | b |\n> | - | - |\n> | 1 | 2 |\n>\n> ```js\n> x\n> ```\n\nend\n';
		const view = mount(doc);
		expect(q(view, '.cm-lp-table-wrapper')).not.toBeNull();
		expect(q(view, '.cm-lp-codeblock')).not.toBeNull();
		const opts = view.contentDOM.querySelectorAll<HTMLElement>('.cm-lp-callout-type-option');
		expect(opts.length, 'type options exist').toBeGreaterThan(0);
		const target = Array.from(opts).find((o) => (o.textContent ?? '').toLowerCase().includes('warning')) ?? opts[opts.length - 1];
		withFullParse(() => target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })));
		expect(view.state.doc.toString()).not.toContain('[!note]');
		expect(q(view, '.cm-lp-table-wrapper'), 'table drawn').not.toBeNull();
		expect(q(view, '.cm-lp-codeblock'), 'code drawn').not.toBeNull();
		view.destroy();
	});
	it('fold toggle on a collapsed callout restores nested code block and table', () => {
		const doc = '> [!note]- T\n> ```js\n> x\n> ```\n>\n> | a | b |\n> | - | - |\n> | 1 | 2 |\n\nend\n';
		const view = mount(doc);
		const chevron = q<HTMLElement>(view, '.cm-lp-callout-fold')!;
		expect(chevron).not.toBeNull();
		withFullParse(() => chevron.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })));
		expect(view.contentDOM.querySelectorAll('.cm-lp-hidden-line .cm-lp-codeblock').length).toBe(0);
		expect(q(view, '.cm-lp-codeblock'), 'code drawn').not.toBeNull();
		expect(q(view, '.cm-lp-table-wrapper'), 'table drawn').not.toBeNull();
		view.destroy();
	});
});

describe('block math nested in a callout', () => {
	it('renders and survives an external formula change (blank quote line before $$)', () => {
		const doc = '> [!note] T\n>\n> $$\n> a+b\n> $$\n\nend\n';
		const view = mount(doc);
		expect(q(view, '.cm-lp-math-block'), 'math drawn').not.toBeNull();
		const at = view.state.doc.toString().indexOf('a+b');
		withFullParse(() => view.dispatch({ changes: { from: at, to: at + 3, insert: 'c+d' } }));
		expect(q(view, '.cm-lp-math-block'), 'math drawn after change').not.toBeNull();
		view.destroy();
	});
});

describe('special fences nested in a container render', () => {
	const btn = '```meta-bind-button\nlabel: Go\nstyle: primary\nactions:\n  - type: open\n    link: x\n```';
	it('meta-bind-button at top level (control)', () => {
		const view = mount(`# H\n\n${btn}\n\nend\n`);
		expect(q(view, '.cm-lp-meta-bind-btn')).not.toBeNull();
		view.destroy();
	});
	it('meta-bind-button in a callout', () => {
		const view = mount(`> [!note] T\n${btn.split('\n').map((l) => '> ' + l).join('\n')}\n\nend\n`);
		expect(q(view, '.cm-lp-meta-bind-btn'), 'button drawn').not.toBeNull();
		view.destroy();
	});
	it('meta-bind-button in a list item', () => {
		const view = mount(`- item\n\n${btn.split('\n').map((l) => '  ' + l).join('\n')}\n\nend\n`);
		expect(q(view, '.cm-lp-meta-bind-btn'), 'button drawn').not.toBeNull();
		view.destroy();
	});
	it('queryjs in a callout (fake renderer)', () => {
		const view = mount('> [!note] T\n> ```queryjs\n> kb.x\n> ```\n\nend\n', [fencedBlockRenderers.of(fakeBlockRenderer('queryjs'))]);
		expect(q(view, '.cm-test-fenced-block'), 'queryjs drawn').not.toBeNull();
		view.destroy();
	});
	it('collection in a callout (fake renderer)', () => {
		const view = mount('> [!note] T\n> ```collection\n> views: []\n> ```\n\nend\n', [fencedBlockRenderers.of(fakeBlockRenderer('collection'))]);
		expect(q(view, '.cm-test-fenced-block'), 'collection drawn').not.toBeNull();
		view.destroy();
	});
	it('mermaid in a callout', () => {
		const view = mount('> [!note] T\n> ```mermaid\n> graph TD\n> A-->B\n> ```\n\nend\n');
		expect(q(view, '.cm-lp-mermaid'), 'mermaid drawn').not.toBeNull();
		view.destroy();
	});
});

describe('media html inside a code fence', () => {
	it('does not draw a video player inside a code block', () => {
		const view = mount('```html\n<video src="a.mp4"></video>\n```\n\nend\n');
		expect(q(view, '.cm-lp-codeblock')).not.toBeNull();
		expect(q(view, 'video'), 'no stray video').toBeNull();
		view.destroy();
	});
	it('revealed code block does not render a video', () => {
		const doc = '```html\n<video src="a.mp4"></video>\nend\n```\n';
		const view = mount(doc);
		expect(q(view, 'video'), 'no video inside revealed code').toBeNull();
		view.destroy();
	});
});

describe('meta-bind button updateMetadata right after frontmatter', () => {
	it('button still drawn after it writes', async () => {
		const doc = `${FM}\`\`\`meta-bind-button\nlabel: Bad\nstyle: primary\nactions:\n  - type: updateMetadata\n    bindTarget: mood\n    evaluate: false\n    value: bad\n\`\`\`\n\nend\n`;
		const view = mount(doc);
		const b = q<HTMLButtonElement>(view, '.cm-lp-meta-bind-btn')!;
		expect(b).not.toBeNull();
		b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		await new Promise((r) => setTimeout(r, 50));
		expect(view.state.doc.toString()).toContain('mood: bad');
		expect(q(view, '.cm-lp-meta-bind-btn'), 'button drawn').not.toBeNull();
		view.destroy();
	});
});
