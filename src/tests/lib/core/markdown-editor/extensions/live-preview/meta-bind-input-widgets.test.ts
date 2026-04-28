// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import {
	MetaBindNumberWidget,
	MetaBindDateWidget,
	MetaBindToggleWidget,
	isNumericString,
	isDateString,
} from '$lib/core/markdown-editor/extensions/live-preview/widgets';

const FRONTMATTER = '---\ncount: 5\nname: alice\n---\n\nbody\n';

function mount(widget: ReturnType<typeof makeWidget>) {
	const state = EditorState.create({ doc: FRONTMATTER });
	const root = document.body.appendChild(document.createElement('div'));
	const view = new EditorView({ state, parent: root });
	const dom = widget.toDOM(view) as HTMLElement;
	root.appendChild(dom);
	return { view, dom };
}

function makeWidget(kind: 'number' | 'date' | 'toggle', target: string, value: string | null) {
	if (kind === 'number') return new MetaBindNumberWidget(target, value);
	if (kind === 'date') return new MetaBindDateWidget(target, value);
	return new MetaBindToggleWidget(target, value);
}

describe('isNumericString', () => {
	it('accepts a finite number', () => {
		expect(isNumericString('42')).toBe(true);
		expect(isNumericString('-3.14')).toBe(true);
	});

	it('accepts empty string (clearing the property)', () => {
		expect(isNumericString('')).toBe(true);
		expect(isNumericString('   ')).toBe(true);
	});

	it('rejects non-numeric text', () => {
		expect(isNumericString('not a number')).toBe(false);
		expect(isNumericString('1abc')).toBe(false);
	});

	it('rejects NaN / Infinity', () => {
		expect(isNumericString('NaN')).toBe(false);
		expect(isNumericString('Infinity')).toBe(false);
	});
});

describe('isDateString', () => {
	it('accepts YYYY-MM-DD', () => {
		expect(isDateString('2026-04-28')).toBe(true);
	});

	it('accepts empty string', () => {
		expect(isDateString('')).toBe(true);
	});

	it('rejects non-ISO formats', () => {
		expect(isDateString('28/04/2026')).toBe(false);
		expect(isDateString('April 28 2026')).toBe(false);
	});

	it('rejects nonsense YYYY-MM-DD-shaped text', () => {
		expect(isDateString('abcd-ef-gh')).toBe(false);
	});
});

describe('MetaBindNumberWidget', () => {
	it('renders an input[type=number] with the current value', () => {
		const { dom } = mount(new MetaBindNumberWidget('count', '5'));
		const input = dom.querySelector<HTMLInputElement>('.cm-lp-meta-bind-input');
		expect(input?.type).toBe('number');
		expect(input?.value).toBe('5');
	});

	it('flags pre-existing malformed frontmatter as invalid on first render', () => {
		const { dom } = mount(new MetaBindNumberWidget('count', 'not a number'));
		expect(dom.classList.contains('cm-lp-meta-bind-input-invalid')).toBe(true);
		const errorMsg = dom.querySelector('.cm-lp-meta-bind-input-error');
		expect(errorMsg?.textContent).toBe('Not a number');
	});

	it('clears invalid state when user types a valid number', () => {
		const { dom } = mount(new MetaBindNumberWidget('count', 'bad'));
		const input = dom.querySelector<HTMLInputElement>('.cm-lp-meta-bind-input')!;
		input.value = '7';
		input.dispatchEvent(new Event('input'));
		expect(dom.classList.contains('cm-lp-meta-bind-input-invalid')).toBe(false);
	});

	it('Escape reverts the input back to the original value', () => {
		const { dom } = mount(new MetaBindNumberWidget('count', '5'));
		const input = dom.querySelector<HTMLInputElement>('.cm-lp-meta-bind-input')!;
		input.value = '99';
		input.dispatchEvent(new Event('input'));
		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
		expect(input.value).toBe('5');
		expect(dom.classList.contains('cm-lp-meta-bind-input-invalid')).toBe(false);
	});
});

describe('MetaBindDateWidget', () => {
	it('renders an input[type=date]', () => {
		const { dom } = mount(new MetaBindDateWidget('deadline', '2026-04-28'));
		const input = dom.querySelector<HTMLInputElement>('.cm-lp-meta-bind-input');
		expect(input?.type).toBe('date');
	});
});

describe('MetaBindToggleWidget', () => {
	it('renders a checkbox unchecked when no value', () => {
		const { dom } = mount(new MetaBindToggleWidget('draft', null));
		const cb = dom.querySelector<HTMLInputElement>('.cm-lp-meta-bind-toggle-input');
		expect(cb?.type).toBe('checkbox');
		expect(cb?.checked).toBe(false);
	});

	it('renders checked for truthy values', () => {
		for (const v of ['true', 'yes', '1', 'on', 'TRUE']) {
			const { dom } = mount(new MetaBindToggleWidget('draft', v));
			const cb = dom.querySelector<HTMLInputElement>('.cm-lp-meta-bind-toggle-input');
			expect(cb?.checked).toBe(true);
		}
	});

	it('renders unchecked for falsy values', () => {
		for (const v of ['false', 'no', '0', 'off']) {
			const { dom } = mount(new MetaBindToggleWidget('draft', v));
			const cb = dom.querySelector<HTMLInputElement>('.cm-lp-meta-bind-toggle-input');
			expect(cb?.checked).toBe(false);
		}
	});
});

describe('eq() — content-only widgets stay equal', () => {
	it('NumberWidget eq() compares bindTarget + currentValue', () => {
		const a = new MetaBindNumberWidget('count', '5');
		const b = new MetaBindNumberWidget('count', '5');
		expect(a.eq(b)).toBe(true);
		expect(a.eq(new MetaBindNumberWidget('count', '6'))).toBe(false);
		expect(a.eq(new MetaBindNumberWidget('other', '5'))).toBe(false);
	});
});
