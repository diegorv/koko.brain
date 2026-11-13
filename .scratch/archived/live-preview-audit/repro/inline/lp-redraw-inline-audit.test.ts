// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import type { EditorView } from '@codemirror/view';
import { livePreviewExtensions } from '#lib/core/markdown-editor/extensions/live-preview/live-preview.js';
import { mountMarkdownView, testMarkdown, withFullParse } from '../../test-helpers';

/**
 * Audit of the inline cluster: every inline widget whose replace range overlaps
 * or shares a start with another source's replace must still be drawn after an
 * in-place update (eq() false, partial redraw), not only on a full redraw.
 */
beforeAll(() => {
	Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList;
	Range.prototype.getBoundingClientRect ??= () => new DOMRect();
});

afterEach(() => {
	document.body.replaceChildren();
});

function mountDoc(doc: string): EditorView {
	return withFullParse(() =>
		mountMarkdownView(doc, {
			cursor: doc.indexOf('end'),
			extensions: [testMarkdown(), livePreviewExtensions({})],
		}),
	);
}

const SELECT = '`INPUT[inlineSelect(option(good, good), option(bad, bad)):mood]`';
const SEL = 'select.cm-lp-meta-bind-select';

/** Mounts `body` under a `mood: good` frontmatter, picks `bad`, returns the view. */
function pickBad(body: string): { view: EditorView; before: number } {
	const doc = `---\nmood: good\n---\n# Daily\n\n${body}\n\nend\n`;
	const view = mountDoc(doc);
	const all = view.contentDOM.querySelectorAll<HTMLSelectElement>(SEL);
	const before = all.length;
	expect(before, 'select drawn on mount').toBeGreaterThan(0);
	const select = all[0];
	select.value = 'bad';
	withFullParse(() => select.dispatchEvent(new Event('change')));
	expect(view.state.doc.toString()).toContain('mood: bad');
	return { view, before };
}

describe('meta-bind INPUT inside other inline syntax stays drawn after a write', () => {
	const cases: [string, string][] = [
		['paragraph (positive control)', `Field: ${SELECT}`],
		['paragraph at column 0', SELECT],
		['bullet list item', `- ${SELECT}`],
		['ordered list item', `1. ${SELECT}`],
		['task list item', `- [ ] ${SELECT}`],
		['blockquote', `> ${SELECT}`],
		['nested blockquote', `> > ${SELECT}`],
		['heading', `## ${SELECT}`],
		['callout content line', `> [!note]\n> ${SELECT}`],
		['callout title', `> [!note] ${SELECT}`],
		['bold', `**${SELECT}**`],
		['italic', `*${SELECT}*`],
		['highlight', `==${SELECT}==`],
		['strikethrough', `~~${SELECT}~~`],
		['link label', `[${SELECT}](https://x.y)`],
		['two inputs on one line', `${SELECT} and ${SELECT.replace(':mood', ':other')}`],
		['after inline math', `$x$ ${SELECT}`],
		['option with wikilink', '`INPUT[inlineSelect(option(good, [[good]]), option(bad, [[bad]])):mood]`'],
		['option with url', '`INPUT[inlineSelect(option(good, https://a.b), option(bad, https://c.d)):mood]`'],
		['option with %% comment', '`INPUT[inlineSelect(option(good, %%g%%), option(bad, b)):mood]`'],
	];
	for (const [name, body] of cases) {
		it(name, () => {
			const { view, before } = pickBad(body);
			const after = view.contentDOM.querySelectorAll<HTMLSelectElement>(SEL);
			expect(after.length, 'select count after the write').toBe(before);
			expect(after[0].value).toBe('bad');
			view.destroy();
		});
	}
});

describe('other inline widgets survive an in-place update with the cursor elsewhere', () => {
	/** Replaces the first `from` text with `to` in one transaction (a link rename / external edit). */
	function edit(view: EditorView, from: string, to: string): void {
		const at = view.state.doc.toString().indexOf(from);
		expect(at).toBeGreaterThanOrEqual(0);
		withFullParse(() => view.dispatch({ changes: { from: at, to: at + from.length, insert: to } }));
	}

	it('inline math: formula changes', () => {
		const view = mountDoc('# T\n\nA $x+1$ b\n\nend\n');
		expect(view.contentDOM.querySelectorAll('.cm-lp-math-inline').length).toBe(1);
		edit(view, 'x+1', 'x+2');
		expect(view.contentDOM.querySelectorAll('.cm-lp-math-inline').length).toBe(1);
		view.destroy();
	});

	it('inline math at column 0: formula changes', () => {
		const view = mountDoc('# T\n\n$x+1$ b\n\nend\n');
		edit(view, 'x+1', 'y');
		expect(view.contentDOM.querySelectorAll('.cm-lp-math-inline').length).toBe(1);
		view.destroy();
	});

	it('task checkbox: click toggles and stays drawn', () => {
		const view = mountDoc('# T\n\n- [ ] task\n\nend\n');
		const cb = view.contentDOM.querySelector<HTMLInputElement>('input.cm-lp-task-checkbox')!;
		expect(cb).not.toBeNull();
		withFullParse(() => cb.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true })));
		expect(view.state.doc.toString()).toContain('- [x] task');
		const after = view.contentDOM.querySelectorAll<HTMLInputElement>('input.cm-lp-task-checkbox');
		expect(after.length).toBe(1);
		expect(after[0].checked).toBe(true);
		view.destroy();
	});

	for (const [name, line] of [
		['blockquote', '> - [ ] task'],
		['callout', '> [!todo]\n> - [ ] task'],
		['nested list', '- a\n  - [ ] task'],
	] as const) {
		it(`task checkbox in ${name}: click toggles and stays drawn`, () => {
			const view = mountDoc(`# T\n\n${line}\n\nend\n`);
			const cb = view.contentDOM.querySelector<HTMLInputElement>('input.cm-lp-task-checkbox')!;
			expect(cb).not.toBeNull();
			withFullParse(() => cb.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true })));
			expect(view.state.doc.toString()).toContain('[x] task');
			expect(view.contentDOM.querySelectorAll('input.cm-lp-task-checkbox').length).toBe(1);
			view.destroy();
		});
	}

	it('inline math in a callout: formula changes', () => {
		const view = mountDoc('# T\n\n> [!note]\n> $x+1$ b\n\nend\n');
		expect(view.contentDOM.querySelectorAll('.cm-lp-math-inline').length).toBe(1);
		edit(view, 'x+1', 'x+2');
		expect(view.contentDOM.querySelectorAll('.cm-lp-math-inline').length).toBe(1);
		view.destroy();
	});

	it('markdown image: url changes', () => {
		const view = mountDoc('# T\n\n![alt](https://a.b/one.png)\n\nend\n');
		expect(view.contentDOM.querySelectorAll('img.cm-lp-image').length).toBe(1);
		edit(view, 'one', 'two');
		expect(view.contentDOM.querySelectorAll('img.cm-lp-image').length).toBe(1);
		view.destroy();
	});

	it('markdown image with emphasis in alt: url changes', () => {
		const view = mountDoc('# T\n\n![*alt*](https://a.b/one.png)\n\nend\n');
		expect(view.contentDOM.querySelectorAll('img.cm-lp-image').length).toBe(1);
		edit(view, 'one', 'two');
		expect(view.contentDOM.querySelectorAll('img.cm-lp-image').length).toBe(1);
		view.destroy();
	});

	it('markdown image with inline code in alt: alt changes', () => {
		const view = mountDoc('# T\n\n![`a`b](https://a.b/one.png)\n\nend\n');
		expect(view.contentDOM.querySelectorAll('img.cm-lp-image').length).toBe(1);
		edit(view, '`a`b', '`a`c');
		expect(view.contentDOM.querySelectorAll('img.cm-lp-image').length).toBe(1);
		view.destroy();
	});

	it('markdown image width suffix changes', () => {
		const view = mountDoc('# T\n\n![alt|100](https://a.b/one.png)\n\nend\n');
		edit(view, '|100', '|200');
		expect(view.contentDOM.querySelectorAll('img.cm-lp-image').length).toBe(1);
		view.destroy();
	});

	it('image inside a link: url changes', () => {
		const view = mountDoc('# T\n\n[![alt](https://a.b/one.png)](https://x.y)\n\nend\n');
		expect(view.contentDOM.querySelectorAll('img.cm-lp-image').length).toBe(1);
		edit(view, 'one', 'two');
		expect(view.contentDOM.querySelectorAll('img.cm-lp-image').length).toBe(1);
		view.destroy();
	});

	it('wikilink note embed: target renamed (link rename)', () => {
		const view = mountDoc('# T\n\n![[Old note]]\n\nend\n');
		expect(view.contentDOM.querySelectorAll('.cm-lp-embed').length).toBe(1);
		edit(view, 'Old note', 'New note');
		expect(view.contentDOM.querySelectorAll('.cm-lp-embed').length, 'embed after rename').toBe(1);
		view.destroy();
	});

	it('wikilink note embed with heading: heading renamed', () => {
		const view = mountDoc('# T\n\n![[Note#Old]]\n\nend\n');
		expect(view.contentDOM.querySelectorAll('.cm-lp-embed').length).toBe(1);
		edit(view, '#Old', '#New');
		expect(view.contentDOM.querySelectorAll('.cm-lp-embed').length, 'embed after rename').toBe(1);
		view.destroy();
	});

	it('wikilink note embed with alias: target renamed', () => {
		const view = mountDoc('# T\n\n![[Old|shown]]\n\nend\n');
		expect(view.contentDOM.querySelectorAll('.cm-lp-embed').length).toBe(1);
		edit(view, 'Old', 'New');
		expect(view.contentDOM.querySelectorAll('.cm-lp-embed').length, 'embed after rename').toBe(1);
		view.destroy();
	});

	it('wikilink image embed: width changes', () => {
		const view = mountDoc('# T\n\n![[pic.png|100]]\n\nend\n');
		expect(view.contentDOM.querySelectorAll('.cm-lp-image-wrapper').length).toBe(1);
		edit(view, '|100', '|200');
		expect(view.contentDOM.querySelectorAll('.cm-lp-image-wrapper').length, 'embed after edit').toBe(1);
		view.destroy();
	});

	it('wikilink image embed: target renamed', () => {
		const view = mountDoc('# T\n\n![[pic.png]]\n\nend\n');
		expect(view.contentDOM.querySelectorAll('.cm-lp-image-wrapper').length).toBe(1);
		edit(view, 'pic', 'img');
		expect(view.contentDOM.querySelectorAll('.cm-lp-image-wrapper').length, 'embed after edit').toBe(1);
		view.destroy();
	});

	it('wikilink note embed in a list item: target renamed', () => {
		const view = mountDoc('# T\n\n- ![[Old note]]\n\nend\n');
		expect(view.contentDOM.querySelectorAll('.cm-lp-embed').length).toBe(1);
		edit(view, 'Old note', 'New note');
		expect(view.contentDOM.querySelectorAll('.cm-lp-embed').length).toBe(1);
		view.destroy();
	});
});

describe('inline widgets do not draw inside text another source hides or treats as code', () => {
	it('meta-bind INPUT inside a %% inline comment draws no control', () => {
		const view = mountDoc(`---\nmood: good\n---\n# T\n\nA %%${SELECT}%% b\n\nend\n`);
		expect(view.contentDOM.querySelectorAll(SEL).length, 'select inside hidden comment').toBe(0);
		view.destroy();
	});

	it('meta-bind INPUT inside a %% inline comment draws no control after a write elsewhere', () => {
		const view = mountDoc(`---\nmood: good\n---\n# T\n\nA %%${SELECT}%% b\n\nend\n`);
		const at = view.state.doc.toString().indexOf('good');
		withFullParse(() => view.dispatch({ changes: { from: at, to: at + 4, insert: 'bad' } }));
		expect(view.contentDOM.querySelectorAll(SEL).length, 'select inside hidden comment').toBe(0);
		view.destroy();
	});

	it('wikilink embed inside inline code renders as code, not as an embed', () => {
		const view = mountDoc('# T\n\nUse `![[Note]]` to embed\n\nend\n');
		expect(view.contentDOM.querySelectorAll('.cm-lp-embed').length, 'embed widget in code span').toBe(0);
		view.destroy();
	});

	it('wikilink inside inline code keeps its brackets', () => {
		const view = mountDoc('# T\n\nUse `[[Note]]` to link\n\nend\n');
		expect(view.contentDOM.textContent).toContain('[[Note]]');
		view.destroy();
	});

	it('double-backtick inline code holding INPUT survives a write', () => {
		const { view, before } = pickBad('Field: ``INPUT[inlineSelect(option(good, good), option(bad, bad)):mood]``');
		expect(view.contentDOM.querySelectorAll(SEL).length).toBe(before);
		view.destroy();
	});
});
