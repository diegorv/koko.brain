// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import {
	MetaBindSelectWidget,
	MetaBindTextInputWidget,
	MetaBindToggleWidget,
	isNumericString,
	isDateString,
} from '#lib/core/markdown-editor/extensions/live-preview/widgets.js';

const FRONTMATTER = '---\ncount: 5\nname: alice\n---\n\nbody\n';

function mount(widget: { toDOM(view: EditorView): HTMLElement }) {
	const state = EditorState.create({ doc: FRONTMATTER });
	const root = document.body.appendChild(document.createElement('div'));
	const view = new EditorView({ state, parent: root });
	const dom = widget.toDOM(view);
	root.appendChild(dom);
	return { view, dom };
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

describe("MetaBindTextInputWidget — 'number'", () => {
	it('renders an input[type=number] with the current value', () => {
		const { dom } = mount(new MetaBindTextInputWidget('number', 'count', '5'));
		const input = dom.querySelector<HTMLInputElement>('.cm-lp-meta-bind-input');
		expect(input?.type).toBe('number');
		expect(input?.value).toBe('5');
	});

	it('renders an input[type=number] when the property is unset', () => {
		const { dom } = mount(new MetaBindTextInputWidget('number', 'count', null));
		const input = dom.querySelector<HTMLInputElement>('.cm-lp-meta-bind-input');
		expect(input?.type).toBe('number');
		expect(input?.value).toBe('');
	});

	it('renders a text input showing a value a number input cannot hold', () => {
		const { dom } = mount(new MetaBindTextInputWidget('number', 'count', '1,000'));
		const input = dom.querySelector<HTMLInputElement>('.cm-lp-meta-bind-input');
		expect(input?.type).toBe('text');
		expect(input?.value).toBe('1,000');
	});

	it('flags pre-existing malformed frontmatter as invalid on first render', () => {
		const { dom } = mount(new MetaBindTextInputWidget('number', 'count', 'not a number'));
		expect(dom.classList.contains('cm-lp-meta-bind-input-invalid')).toBe(true);
		const errorMsg = dom.querySelector('.cm-lp-meta-bind-input-error');
		expect(errorMsg?.textContent).toBe('Not a number');
	});

	it('clears invalid state when user types a valid number', () => {
		const { dom } = mount(new MetaBindTextInputWidget('number', 'count', 'bad'));
		const input = dom.querySelector<HTMLInputElement>('.cm-lp-meta-bind-input')!;
		input.value = '7';
		input.dispatchEvent(new Event('input'));
		expect(dom.classList.contains('cm-lp-meta-bind-input-invalid')).toBe(false);
	});

	it('Escape reverts the input back to the original value', () => {
		const { dom } = mount(new MetaBindTextInputWidget('number', 'count', '5'));
		const input = dom.querySelector<HTMLInputElement>('.cm-lp-meta-bind-input')!;
		input.value = '99';
		input.dispatchEvent(new Event('input'));
		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
		expect(input.value).toBe('5');
		expect(dom.classList.contains('cm-lp-meta-bind-input-invalid')).toBe(false);
	});
});

describe("MetaBindTextInputWidget — 'date'", () => {
	it('renders an input[type=date]', () => {
		const { dom } = mount(new MetaBindTextInputWidget('date', 'deadline', '2026-04-28'));
		const input = dom.querySelector<HTMLInputElement>('.cm-lp-meta-bind-input');
		expect(input?.type).toBe('date');
	});

	it('renders a text input showing a value a date input cannot hold', () => {
		const { dom } = mount(new MetaBindTextInputWidget('date', 'deadline', '2026-01-05T10:00'));
		const input = dom.querySelector<HTMLInputElement>('.cm-lp-meta-bind-input');
		expect(input?.type).toBe('text');
		expect(input?.value).toBe('2026-01-05T10:00');
	});

	it('uses the date validator + message, not the number ones', () => {
		const { dom } = mount(new MetaBindTextInputWidget('date', 'deadline', '28/04/2026'));
		expect(dom.classList.contains('cm-lp-meta-bind-input-invalid')).toBe(true);
		expect(dom.querySelector('.cm-lp-meta-bind-input-error')?.textContent).toBe('Use YYYY-MM-DD');
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

describe('MetaBindTextInputWidget.eq()', () => {
	it('compares bindTarget + currentValue', () => {
		const a = new MetaBindTextInputWidget('number', 'count', '5');
		expect(a.eq(new MetaBindTextInputWidget('number', 'count', '5'))).toBe(true);
		expect(a.eq(new MetaBindTextInputWidget('number', 'count', '6'))).toBe(false);
		expect(a.eq(new MetaBindTextInputWidget('number', 'other', '5'))).toBe(false);
	});

	// Number and date used to be two classes; class identity was the only thing
	// keeping CodeMirror from reusing one's DOM for the other. Now that they
	// share a class, eq() must carry that barrier itself — an eq() comparing
	// only bindTarget + currentValue returns true here and CM keeps the stale
	// `<input type="number">` with the number validator wired up.
	it('is NOT equal across input types at the same bindTarget + value', () => {
		const num = new MetaBindTextInputWidget('number', 'count', '5');
		const date = new MetaBindTextInputWidget('date', 'count', '5');
		expect(num.eq(date)).toBe(false);
		expect(date.eq(num)).toBe(false);
	});

	// What eq() protects: the opts (element type, validator, invalid message)
	// really do differ per input type, so a false positive ships the wrong ones.
	it('input type selects a different element type, validator and message', () => {
		const num = mount(new MetaBindTextInputWidget('number', 'count', '2026-04-28'));
		const date = mount(new MetaBindTextInputWidget('date', 'count', '2026-04-28'));

		// A number input cannot hold a date, so it falls back to text showing the raw value.
		expect(num.dom.querySelector<HTMLInputElement>('.cm-lp-meta-bind-input')?.type).toBe('text');
		expect(date.dom.querySelector<HTMLInputElement>('.cm-lp-meta-bind-input')?.type).toBe('date');

		// `2026-04-28` is a valid date and an invalid number: the validators diverge.
		expect(num.dom.classList.contains('cm-lp-meta-bind-input-invalid')).toBe(true);
		expect(num.dom.querySelector('.cm-lp-meta-bind-input-error')?.textContent).toBe('Not a number');
		expect(date.dom.classList.contains('cm-lp-meta-bind-input-invalid')).toBe(false);
	});
});

describe('MetaBindSelectWidget — stored value that is not an option', () => {
	const OPTIONS = [
		{ value: 'active', label: 'active' },
		{ value: 'done', label: 'done' },
	];
	const DOC = '---\nstatus: archived\nname: alice\n---\n\nbody\n';

	function mountSelect(current: string | null) {
		const root = document.body.appendChild(document.createElement('div'));
		const view = new EditorView({ state: EditorState.create({ doc: DOC }), parent: root });
		const select = new MetaBindSelectWidget(OPTIONS, 'status', current).toDOM(view);
		root.appendChild(select);
		return { view, select };
	}

	beforeAll(() => {
		// jsdom has no layout; a write's scroll snapshot makes CodeMirror measure.
		Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList;
		Range.prototype.getBoundingClientRect ??= () => new DOMRect();
	});

	it('shows the stored value as a disabled, selected first option', () => {
		const { select } = mountSelect('archived');
		const first = select.options[0];
		expect(select.options).toHaveLength(3);
		expect(first.textContent).toBe('archived');
		expect(first.disabled).toBe(true);
		expect(select.selectedIndex).toBe(0);
		expect(select.value).toBe('archived');
	});

	it('choosing a real option writes it', () => {
		const { view, select } = mountSelect('archived');
		select.value = 'active';
		select.dispatchEvent(new Event('change'));
		expect(view.state.doc.toString()).toContain('status: active\n');
	});

	it('a stored value that is an option renders the options only, with it selected', () => {
		const { select } = mountSelect('done');
		expect(Array.from(select.options).map((o) => o.value)).toEqual(['active', 'done']);
		expect(select.value).toBe('done');
	});
});

describe('meta-bind controls name the property they write', () => {
	const OPTIONS = [{ value: 'todo', label: 'todo' }];

	it.each([
		['select', () => new MetaBindSelectWidget(OPTIONS, 'status', 'todo'), 'select', 'status'],
		['number input', () => new MetaBindTextInputWidget('number', 'count', '5'), '.cm-lp-meta-bind-input', 'count'],
		['date input', () => new MetaBindTextInputWidget('date', 'due', null), '.cm-lp-meta-bind-input', 'due'],
		['toggle', () => new MetaBindToggleWidget('done', null), '.cm-lp-meta-bind-toggle-input', 'done'],
		['alias-bound toggle', () => new MetaBindToggleWidget('archived', null), '.cm-lp-meta-bind-toggle-input', '_archived'],
		['alias-bound select', () => new MetaBindSelectWidget(OPTIONS, 'type', null), 'select', '_type'],
	])('%s', (_name, make, selector, key) => {
		const { dom } = mount(make());
		const control = dom.matches(selector) ? dom : dom.querySelector<HTMLElement>(selector)!;
		expect(control.getAttribute('aria-label')).toBe(key);
		expect(control.title).toBe(key);
	});
});
