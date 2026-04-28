// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { EditorState, EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import {
	CodeBlockWidget,
	COMMON_LANGUAGES,
} from '$lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget';

function mountWithRange(opts: {
	doc: string;
	code: string;
	language: string;
	languageFrom: number | null;
	languageTo: number | null;
	openFenceTo: number;
}) {
	const state = EditorState.create({
		doc: opts.doc,
		selection: EditorSelection.cursor(0),
	});
	const root = document.body.appendChild(document.createElement('div'));
	const view = new EditorView({ state, parent: root });
	const widget = new CodeBlockWidget(opts.code, opts.language, {
		languageFrom: opts.languageFrom,
		languageTo: opts.languageTo,
		openFenceTo: opts.openFenceTo,
	});
	const dom = widget.toDOM(view);
	root.appendChild(dom);
	return { view, dom, widget };
}

describe('CodeBlockWidget — language switcher', () => {
	it('renders a <select> when sourceRange is provided', () => {
		const doc = '```js\nconsole.log(1)\n```';
		const { dom } = mountWithRange({
			doc,
			code: 'console.log(1)',
			language: 'js',
			languageFrom: 3,
			languageTo: 5,
			openFenceTo: 5,
		});
		const select = dom.querySelector<HTMLSelectElement>('.cm-lp-codeblock-lang-select');
		expect(select).not.toBeNull();
	});

	it('falls back to a span label when no sourceRange (indented code blocks)', () => {
		const widget = new CodeBlockWidget('hello', 'js', null);
		const root = document.body.appendChild(document.createElement('div'));
		const state = EditorState.create({ doc: '' });
		const view = new EditorView({ state, parent: root });
		const dom = widget.toDOM(view);
		expect(dom.querySelector('.cm-lp-codeblock-lang-select')).toBeNull();
		expect(dom.querySelector('.cm-lp-codeblock-lang')?.textContent).toBe('js');
	});

	it('preselects the current language', () => {
		const { dom } = mountWithRange({
			doc: '```python\nx\n```',
			code: 'x',
			language: 'python',
			languageFrom: 3,
			languageTo: 9,
			openFenceTo: 9,
		});
		const select = dom.querySelector<HTMLSelectElement>('.cm-lp-codeblock-lang-select');
		expect(select?.value).toBe('python');
	});

	it('preserves an exotic language by prepending it as the first option', () => {
		const { dom } = mountWithRange({
			doc: '```vbnet\nx\n```',
			code: 'x',
			language: 'vbnet',
			languageFrom: 3,
			languageTo: 8,
			openFenceTo: 8,
		});
		const select = dom.querySelector<HTMLSelectElement>('.cm-lp-codeblock-lang-select');
		expect(select?.options[0].value).toBe('vbnet');
		expect(select?.value).toBe('vbnet');
	});

	it('changing the select dispatches a transaction that rewrites only the language tag', () => {
		const doc = '```js\nconsole.log(1)\n```';
		const { view, dom } = mountWithRange({
			doc,
			code: 'console.log(1)',
			language: 'js',
			languageFrom: 3,
			languageTo: 5,
			openFenceTo: 5,
		});
		const select = dom.querySelector<HTMLSelectElement>('.cm-lp-codeblock-lang-select');
		expect(select).not.toBeNull();
		select!.value = 'python';
		select!.dispatchEvent(new Event('change'));

		const after = view.state.doc.toString();
		expect(after).toBe('```python\nconsole.log(1)\n```');
	});

	it('inserts a language tag when the fence had none', () => {
		// `\`\`\`\ncode\n\`\`\`` → openFenceTo=3, languageFrom/To=null
		const doc = '```\ncode\n```';
		const { view, dom } = mountWithRange({
			doc,
			code: 'code',
			language: '',
			languageFrom: null,
			languageTo: null,
			openFenceTo: 3,
		});
		const select = dom.querySelector<HTMLSelectElement>('.cm-lp-codeblock-lang-select');
		// Select renders even when language is empty (because code is non-empty;
		// the toDOM check is `language || code`)
		expect(select).not.toBeNull();
		select!.value = 'rust';
		select!.dispatchEvent(new Event('change'));

		const after = view.state.doc.toString();
		expect(after).toBe('```rust\ncode\n```');
	});

	it('COMMON_LANGUAGES contains the most-used set', () => {
		// Sanity: list isn't accidentally truncated
		expect(COMMON_LANGUAGES.length).toBeGreaterThanOrEqual(30);
		expect(COMMON_LANGUAGES).toContain('javascript');
		expect(COMMON_LANGUAGES).toContain('python');
		expect(COMMON_LANGUAGES).toContain('rust');
	});

	it('eq() returns false when sourceRange shifts even if code/language match', () => {
		const a = new CodeBlockWidget('x', 'js', { languageFrom: 3, languageTo: 5, openFenceTo: 5 });
		const b = new CodeBlockWidget('x', 'js', { languageFrom: 100, languageTo: 102, openFenceTo: 102 });
		expect(a.eq(b)).toBe(false);
	});
});
