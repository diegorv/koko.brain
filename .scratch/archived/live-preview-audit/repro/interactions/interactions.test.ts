// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import type { EditorView } from '@codemirror/view';
import { livePreviewExtensions } from '#lib/core/markdown-editor/extensions/live-preview/live-preview.js';
import { mountMarkdownView, testMarkdown, withFullParse } from '../../../test-helpers';

beforeAll(() => {
	Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList;
	Range.prototype.getBoundingClientRect ??= () => new DOMRect();
});

afterEach(() => {
	document.body.replaceChildren();
});

function mount(doc: string): EditorView {
	return withFullParse(() =>
		mountMarkdownView(doc, {
			cursor: doc.indexOf('end'),
			extensions: [testMarkdown(), livePreviewExtensions({})],
		}),
	);
}

function q<T extends HTMLElement>(view: EditorView, sel: string): T | null {
	return view.contentDOM.querySelector<T>(sel);
}

function qa(view: EditorView, sel: string): HTMLElement[] {
	return [...view.contentDOM.querySelectorAll<HTMLElement>(sel)];
}

function md(el: HTMLElement) {
	withFullParse(() => el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 })));
}
function click(el: HTMLElement) {
	withFullParse(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })));
}

const SELECT = '`INPUT[inlineSelect(option(good, good), option(bad, bad)):mood]`';

function pickSelect(view: EditorView, value: string) {
	const s = q<HTMLSelectElement>(view, 'select.cm-lp-meta-bind-select')!;
	expect(s, 'select drawn before').not.toBeNull();
	s.value = value;
	withFullParse(() => s.dispatchEvent(new Event('change')));
}

describe('table interactions', () => {
	const DOC = `---\nmood: good\n---\n# T\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n\nend\n`;

	it('+row keeps one table drawn, with two body rows', () => {
		const view = mount(DOC);
		click(q(view, '.cm-lp-table-add-row')!);
		const tables = qa(view, '.cm-lp-table-wrapper');
		expect(tables.length).toBe(1);
		expect(tables[0].querySelectorAll('tbody tr').length).toBe(2);
	});

	it('cell meta-bind select change keeps the table and select drawn', () => {
		const doc = `---\nmood: good\n---\n# T\n\n| k | v |\n| --- | --- |\n| m | ${SELECT} |\n\nend\n`;
		const view = mount(doc);
		pickSelect(view, 'bad');
		expect(view.state.doc.toString()).toContain('mood: bad');
		expect(qa(view, '.cm-lp-table-wrapper').length).toBe(1);
		const sels = qa(view, 'select.cm-lp-meta-bind-select') as HTMLSelectElement[];
		expect(sels.length).toBe(1);
		expect(sels[0].value).toBe('bad');
	});

	it('header-cell meta-bind select change keeps one table and one select', () => {
		const doc = `---\nmood: good\n---\n# T\n\n| ${SELECT} | v |\n| --- | --- |\n| m | n |\n\nend\n`;
		const view = mount(doc);
		pickSelect(view, 'bad');
		expect(qa(view, '.cm-lp-table-wrapper').length).toBe(1);
		expect(qa(view, 'select.cm-lp-meta-bind-select').length).toBe(1);
	});

	it('pipe-less table whose first cell is a meta-bind INPUT keeps one table and one select', () => {
		const doc = `---\nmood: good\n---\n# T\n\n${SELECT} | v\n--- | ---\nm | n\n\nend\n`;
		const view = mount(doc);
		expect(qa(view, '.cm-lp-table-wrapper').length, 'table drawn before').toBe(1);
		pickSelect(view, 'bad');
		expect(qa(view, '.cm-lp-table-wrapper').length).toBe(1);
		expect(qa(view, 'select.cm-lp-meta-bind-select').length).toBe(1);
	});
});

describe('tables in containers', () => {
	for (const [name, pre] of [
		['blockquote', '> '],
		['callout', null],
	] as const) {
		const body = (p: string) => `${p}| k | v |\n${p}| --- | --- |\n${p}| m | ${SELECT} |`;
		const doc = pre === null
			? `---\nmood: good\n---\n# T\n\n> [!note] T\n${body('> ')}\n\nend\n`
			: `---\nmood: good\n---\n# T\n\n${body(pre)}\n\nend\n`;
		it(`cell select pick keeps one table + one select (${name})`, () => {
			const view = mount(doc);
			expect(qa(view, '.cm-lp-table-wrapper').length, 'table before').toBe(1);
			pickSelect(view, 'bad');
			expect(qa(view, '.cm-lp-table-wrapper').length).toBe(1);
			expect(qa(view, 'select.cm-lp-meta-bind-select').length).toBe(1);
		});
		it(`+row keeps one table (${name})`, () => {
			const view = mount(doc);
			click(q(view, '.cm-lp-table-add-row')!);
			const t = qa(view, '.cm-lp-table-wrapper');
			expect(t.length).toBe(1);
			expect(t[0].querySelectorAll('tbody tr').length).toBe(2);
		});
	}
});

describe('callout interactions', () => {
	for (const [name, title] of [
		['plain title', 'Title'],
		['wikilink title', '[[Note]] title'],
		['inline-code title', '`code` title'],
		['markdown-link title', '[x](https://a.b) title'],
		['no title', ''],
	] as const) {
		it(`type pick keeps switcher + chevron (${name})`, () => {
			const doc = `# C\n\n> [!note] ${title}\n> body\n\nend\n`;
			const view = mount(doc);
			md(q(view, '.cm-lp-callout-type-label')!);
			const opt = qa(view, '.cm-lp-callout-type-option').find((o) => o.textContent === 'warning')!;
			md(opt);
			expect(view.state.doc.toString()).toContain('[!warning]');
			expect(q(view, '.cm-lp-callout-type-label')?.textContent).toBe('warning');
			expect(qa(view, '.cm-lp-callout-fold').length).toBe(1);
		});

		it(`fold toggle keeps chevron (${name})`, () => {
			const doc = `# C\n\n> [!note]- ${title}\n> body\n\nend\n`;
			const view = mount(doc);
			const f = q(view, '.cm-lp-callout-fold')!;
			expect(f.textContent).toBe('▶');
			md(f);
			const after = qa(view, '.cm-lp-callout-fold');
			expect(after.length).toBe(1);
			expect(after[0].textContent).toBe('▼');
			expect(qa(view, '.cm-lp-callout-type-label').length).toBe(1);
		});
	}
});

describe('callout with a meta-bind INPUT title', () => {
	it('fold toggle keeps chevron and select', () => {
		const doc = `---\nmood: good\n---\n# C\n\n> [!note]- ${SELECT}\n> body\n\nend\n`;
		const view = mount(doc);
		expect(qa(view, 'select.cm-lp-meta-bind-select').length, 'select before').toBe(1);
		md(q(view, '.cm-lp-callout-fold')!);
		expect(qa(view, '.cm-lp-callout-fold').length).toBe(1);
		expect(qa(view, 'select.cm-lp-meta-bind-select').length).toBe(1);
	});
	it('type pick keeps switcher and select', () => {
		const doc = `---\nmood: good\n---\n# C\n\n> [!note] ${SELECT}\n> body\n\nend\n`;
		const view = mount(doc);
		md(q(view, '.cm-lp-callout-type-label')!);
		md(qa(view, '.cm-lp-callout-type-option').find((o) => o.textContent === 'warning')!);
		expect(q(view, '.cm-lp-callout-type-label')?.textContent).toBe('warning');
		expect(qa(view, 'select.cm-lp-meta-bind-select').length).toBe(1);
	});
});

describe('code block language switch', () => {
	for (const [name, prefix] of [
		['top level', ''],
		['in blockquote', '> '],
	] as const) {
		it(`keeps the select drawn (${name})`, () => {
			const doc = `# C\n\n${prefix}\`\`\`js\n${prefix}let a = 1;\n${prefix}\`\`\`\n\nend\n`;
			const view = mount(doc);
			const s = q<HTMLSelectElement>(view, 'select.cm-lp-codeblock-lang-select');
			expect(s, 'select before').not.toBeNull();
			s!.value = 'python';
			withFullParse(() => s!.dispatchEvent(new Event('change')));
			expect(view.state.doc.toString()).toContain('```python');
			const after = qa(view, 'select.cm-lp-codeblock-lang-select') as HTMLSelectElement[];
			expect(after.length).toBe(1);
			expect(after[0].value).toBe('python');
		});
	}

	it('keeps the select drawn (in callout)', () => {
		const doc = `# C\n\n> [!note] T\n> \`\`\`js\n> let a = 1;\n> \`\`\`\n\nend\n`;
		const view = mount(doc);
		const s = q<HTMLSelectElement>(view, 'select.cm-lp-codeblock-lang-select');
		expect(s, 'code block select in callout (pre)').not.toBeNull();
		s!.value = 'python';
		withFullParse(() => s!.dispatchEvent(new Event('change')));
		expect(qa(view, 'select.cm-lp-codeblock-lang-select').length).toBe(1);
	});
});

describe('task checkbox', () => {
	for (const [name, pre] of [
		['plain', ''],
		['in blockquote', '> '],
		['in callout', '> [!todo] T\n> '],
	] as const) {
		it(`toggle keeps one checkbox (${name})`, () => {
			const doc = `# T\n\n${pre}- [ ] task one\n\nend\n`;
			const view = mount(doc);
			const cb = q<HTMLInputElement>(view, 'input.cm-lp-task-checkbox')!;
			expect(cb).not.toBeNull();
			md(cb);
			expect(view.state.doc.toString()).toContain('- [x] task one');
			const after = qa(view, 'input.cm-lp-task-checkbox') as HTMLInputElement[];
			expect(after.length).toBe(1);
			expect(after[0].checked).toBe(true);
		});
	}
});

describe('meta-bind button', () => {
	const btn = (label: string) =>
		'```meta-bind-button\nlabel: ' + label + '\nstyle: primary\nactions:\n  - type: updateMetadata\n    bindTarget: done\n    value: \"yes\"\n```';
	it('external YAML label edit keeps the button drawn', () => {
		const doc = `---\ndone: false\n---\n# B\n\n${btn('Go')}\n\nend\n`;
		const view = mount(doc);
		expect(q(view, '.cm-lp-meta-bind-btn')?.textContent).toBe('Go');
		const at = view.state.doc.toString().indexOf('label: Go') + 'label: '.length;
		withFullParse(() => view.dispatch({ changes: { from: at, to: at + 2, insert: 'Run' } }));
		const after = qa(view, '.cm-lp-meta-bind-btn');
		expect(after.length).toBe(1);
		expect(after[0].textContent).toBe('Run');
	});

	it('click (updateMetadata) keeps the button drawn', async () => {
		const doc = `---\ndone: false\n---\n# B\n\n${btn('Go')}\n\nend\n`;
		const view = mount(doc);
		const b = q(view, '.cm-lp-meta-bind-btn')!;
		md(b);
		click(b);
		await new Promise((r) => setTimeout(r, 50));
		expect(view.state.doc.toString()).toMatch(/done: "?yes"?/);
		expect(qa(view, '.cm-lp-meta-bind-btn').length).toBe(1);
	});
});

describe('meta-bind INPUT in containers', () => {
	for (const [name, line] of [
		['list item', `- ${SELECT}`],
		['ordered list item', `1. ${SELECT}`],
		['task item', `- [ ] ${SELECT}`],
		['blockquote', `> ${SELECT}`],
		['heading', `## ${SELECT}`],
		['callout body', `> [!note] T\n> ${SELECT}`],
		['callout title', `> [!note] ${SELECT}`],
		['bold', `**${SELECT}**`],
		['after text', `Mood ${SELECT}`],
	] as const) {
		it(`select stays drawn after a pick (${name})`, () => {
			const doc = `---\nmood: good\n---\n# D\n\n${line}\n\nend\n`;
			const view = mount(doc);
			pickSelect(view, 'bad');
			expect(view.state.doc.toString()).toContain('mood: bad');
			const after = qa(view, 'select.cm-lp-meta-bind-select') as HTMLSelectElement[];
			expect(after.length).toBe(1);
			expect(after[0].value).toBe('bad');
		});
	}
});
