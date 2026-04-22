// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import type { EditorView } from '@codemirror/view';

import {
	MetaBindNumberWidget,
	isNumericString,
} from '$lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-number-widget';

function stubView(doc: string) {
	const dispatch = vi.fn();
	const view = {
		dispatch,
		state: { doc: { toString: () => doc } },
	} as unknown as EditorView;
	return { view, dispatch };
}

describe('isNumericString', () => {
	it('accepts integers and decimals', () => {
		expect(isNumericString('0')).toBe(true);
		expect(isNumericString('42')).toBe(true);
		expect(isNumericString('-3.14')).toBe(true);
		expect(isNumericString('1e5')).toBe(true);
	});

	it('rejects empty, NaN, and non-numeric', () => {
		expect(isNumericString('')).toBe(false);
		expect(isNumericString('NaN')).toBe(false);
		expect(isNumericString('abc')).toBe(false);
		expect(isNumericString('12a')).toBe(false);
	});

	it('rejects Infinity (not a finite number)', () => {
		expect(isNumericString('Infinity')).toBe(false);
		expect(isNumericString('-Infinity')).toBe(false);
	});
});

describe('MetaBindNumberWidget', () => {
	it('renders a numeric-mode text input with the current value', () => {
		const w = new MetaBindNumberWidget('count', '7');
		const { view } = stubView('---\ncount: 7\n---\nbody');
		const dom = w.toDOM(view);
		const input = dom.querySelector('input') as HTMLInputElement;
		// type="text" + inputMode="numeric" keeps our validation authoritative.
		expect(input.type).toBe('text');
		expect(input.inputMode).toBe('numeric');
		expect(input.value).toBe('7');
	});

	it('flags a malformed stored value with the invalid class and error message', () => {
		const w = new MetaBindNumberWidget('count', 'abc');
		const { view } = stubView('---\ncount: abc\n---\nbody');
		const dom = w.toDOM(view);
		const input = dom.querySelector('input') as HTMLInputElement;
		const error = dom.querySelector('.cm-lp-meta-bind-number-error') as HTMLElement;
		expect(input.classList.contains('cm-lp-meta-bind-number-input-invalid')).toBe(true);
		expect(error.textContent).toContain('is not a number');
	});

	it('adds the invalid class when the user types a non-numeric value', () => {
		const w = new MetaBindNumberWidget('count', '0');
		const { view } = stubView('---\ncount: 0\n---\nbody');
		const dom = w.toDOM(view);
		const input = dom.querySelector('input') as HTMLInputElement;

		input.value = 'hello';
		input.dispatchEvent(new Event('input'));

		expect(input.classList.contains('cm-lp-meta-bind-number-input-invalid')).toBe(true);
	});

	it('clears the invalid state when the user fixes the value', () => {
		const w = new MetaBindNumberWidget('count', 'abc');
		const { view } = stubView('---\ncount: abc\n---\nbody');
		const dom = w.toDOM(view);
		const input = dom.querySelector('input') as HTMLInputElement;

		input.value = '42';
		input.dispatchEvent(new Event('input'));

		expect(input.classList.contains('cm-lp-meta-bind-number-input-invalid')).toBe(false);
	});

	it('dispatches a frontmatter update on blur when the value is numeric', () => {
		const w = new MetaBindNumberWidget('count', '0');
		const { view, dispatch } = stubView('---\ncount: 0\n---\nbody');
		const dom = w.toDOM(view);
		const input = dom.querySelector('input') as HTMLInputElement;

		input.value = '42';
		input.dispatchEvent(new Event('blur'));

		expect(dispatch).toHaveBeenCalledTimes(1);
	});

	it('does NOT dispatch on blur when the value is invalid', () => {
		const w = new MetaBindNumberWidget('count', '0');
		const { view, dispatch } = stubView('---\ncount: 0\n---\nbody');
		const dom = w.toDOM(view);
		const input = dom.querySelector('input') as HTMLInputElement;

		input.value = 'not-a-number';
		input.dispatchEvent(new Event('blur'));

		expect(dispatch).not.toHaveBeenCalled();
	});

	it('reverts to currentValue on Escape', () => {
		const w = new MetaBindNumberWidget('count', '10');
		const { view } = stubView('---\ncount: 10\n---\nbody');
		const dom = w.toDOM(view);
		const input = dom.querySelector('input') as HTMLInputElement;

		input.value = 'junk';
		input.dispatchEvent(new Event('input'));
		const evt = new KeyboardEvent('keydown', { key: 'Escape' });
		input.dispatchEvent(evt);

		expect(input.value).toBe('10');
		expect(input.classList.contains('cm-lp-meta-bind-number-input-invalid')).toBe(false);
	});
});
