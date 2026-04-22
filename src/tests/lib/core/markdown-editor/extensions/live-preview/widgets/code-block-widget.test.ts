// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import type { EditorView } from '@codemirror/view';

import { CodeBlockWidget } from '$lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget';

/**
 * The code-block widget renders syntax-highlighted code plus a header with a
 * language <select> switcher and a Copy button. These tests exercise the
 * header's interactive parts without spinning up a real EditorView — we pass
 * a stub with just the bits the widget calls.
 */
function stubView(doc = '```python\npass\n```') {
	const dispatch = vi.fn();
	const view = {
		dispatch,
		state: {
			doc: {
				sliceString: (from: number, to: number) => doc.slice(from, to),
			},
		},
	} as unknown as EditorView;
	return { view, dispatch };
}

describe('CodeBlockWidget language switcher', () => {
	it('renders a <select> with the current language pre-selected', () => {
		const w = new CodeBlockWidget('print(1)', 'python', 3, 9);
		const { view } = stubView();
		const dom = w.toDOM(view);
		const select = dom.querySelector('select.cm-lp-codeblock-lang-select') as HTMLSelectElement;
		expect(select).not.toBeNull();
		expect(select.value).toBe('python');
	});

	it('renders "(no language)" as the first option', () => {
		const w = new CodeBlockWidget('print(1)', '', 3, 3);
		const { view } = stubView();
		const dom = w.toDOM(view);
		const select = dom.querySelector('select.cm-lp-codeblock-lang-select') as HTMLSelectElement;
		expect(select.options[0].value).toBe('');
		expect(select.options[0].textContent).toBe('(no language)');
	});

	it('preserves an exotic language by appending it as a custom option', () => {
		const w = new CodeBlockWidget('hello', 'fennel', 3, 9);
		const { view } = stubView();
		const dom = w.toDOM(view);
		const select = dom.querySelector('select.cm-lp-codeblock-lang-select') as HTMLSelectElement;
		expect(select.value).toBe('fennel');
		const last = select.options[select.options.length - 1];
		expect(last.value).toBe('fennel');
	});

	it('dispatches a transaction replacing the language range on change', () => {
		const w = new CodeBlockWidget('print(1)', 'python', 3, 9);
		const { view, dispatch } = stubView();
		const dom = w.toDOM(view);
		const select = dom.querySelector('select.cm-lp-codeblock-lang-select') as HTMLSelectElement;

		select.value = 'ruby';
		select.dispatchEvent(new Event('change'));

		expect(dispatch).toHaveBeenCalledTimes(1);
		const arg = dispatch.mock.calls[0][0];
		expect(arg.changes.from).toBe(3);
		expect(arg.changes.to).toBe(9);
		expect(arg.changes.insert).toBe('ruby');
	});

	it('prepends a space when inserting into a no-language slot without a leading space', () => {
		// Fence "```" (positions 0..3), no language, insertion slot = 3
		const w = new CodeBlockWidget('print(1)', '', 3, 3);
		const { view, dispatch } = stubView('```\nprint(1)\n```');
		const dom = w.toDOM(view);
		const select = dom.querySelector('select.cm-lp-codeblock-lang-select') as HTMLSelectElement;

		select.value = 'python';
		select.dispatchEvent(new Event('change'));

		const arg = dispatch.mock.calls[0][0];
		expect(arg.changes.insert).toBe(' python');
	});

	it('does not dispatch when the user re-selects the same language', () => {
		const w = new CodeBlockWidget('code', 'ruby', 3, 7);
		const { view, dispatch } = stubView();
		const dom = w.toDOM(view);
		const select = dom.querySelector('select.cm-lp-codeblock-lang-select') as HTMLSelectElement;

		select.dispatchEvent(new Event('change'));

		expect(dispatch).not.toHaveBeenCalled();
	});

	it('stops mousedown from bubbling so CodeMirror does not swallow the click', () => {
		const w = new CodeBlockWidget('code', 'ruby', 3, 7);
		const { view } = stubView();
		const dom = w.toDOM(view);
		const select = dom.querySelector('select.cm-lp-codeblock-lang-select') as HTMLSelectElement;

		const ev = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
		const stopSpy = vi.spyOn(ev, 'stopPropagation');
		select.dispatchEvent(ev);
		expect(stopSpy).toHaveBeenCalledTimes(1);
	});
});
