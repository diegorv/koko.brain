// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import { toast } from 'svelte-sonner';
import {
	MetaBindSelectWidget,
	MetaBindTextInputWidget,
	MetaBindToggleWidget,
	TableWidget,
	dispatchMetaBindUpdate,
} from '#lib/core/markdown-editor/extensions/live-preview/widgets.js';
import { MetaBindButtonWidget } from '#lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.js';
import type { ButtonConfig } from '#lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.js';
import { parseFrontmatterProperties } from '#lib/core/frontmatter/properties.logic.js';

const PARSEABLE = '---\nstatus: draft\ncount: 5\ndue: 2026-01-01\ndone: false\nname: alice\n---\n\nbody\n';
// An unclosed flow sequence: `parseFrontmatterProperties` returns [] for it.
const UNPARSEABLE = '---\nstatus: [draft\ncount: 5\ndue: 2026-01-01\ndone: false\nname: alice\n---\n\nbody\n';
// Parseable blocks the parse -> serialize round trip would not reproduce.
const LOSSY: [string, string, RegExp][] = [
	['a comment', PARSEABLE.replace('name: alice', 'name: alice # owner'), /has comments/],
	['a nested map', PARSEABLE.replace('name: alice', 'name: alice\nmeta:\n  page: 12'), /has nested values/],
	['an integer beyond 2^53', PARSEABLE.replace('name: alice', 'name: alice\ntweet_id: 1234567890123456789'), /could not be parsed/],
	['a duplicate key', PARSEABLE.replace('name: alice', 'name: alice\nname: bob'), /repeats a key/],
];

interface Written {
	view: EditorView;
	/** The control's displayed value after the write (absent for the button, which has none). */
	control?: () => string;
}

interface Writer {
	name: string;
	/** Mounts the writer on `doc`, fires its write event, and resolves when the write ran. */
	write: (doc: string) => Promise<Written>;
	/** A line the write puts in a parseable note's frontmatter. */
	expectedLine: string;
	/** The control's value before the write, which a refused write must restore. */
	initialControl?: string;
}

function mount(doc: string, widget: { toDOM(view: EditorView): HTMLElement }) {
	const root = document.body.appendChild(document.createElement('div'));
	const view = new EditorView({ state: EditorState.create({ doc }), parent: root });
	const dom = widget.toDOM(view);
	root.appendChild(dom);
	return { view, dom };
}

function mountButton(doc: string, config: ButtonConfig) {
	const { view, dom } = mount(doc, new MetaBindButtonWidget(config));
	dom.querySelector('button')!.dispatchEvent(new MouseEvent('click'));
	return view;
}

const buttonConfig: ButtonConfig = {
	label: 'Publish',
	style: 'default',
	actions: [{ type: 'updateMetadata', bindTarget: 'status', value: 'published' }],
};

const selectOptions = [
	{ value: 'draft', label: 'draft' },
	{ value: 'published', label: 'published' },
];

function textInputWriter(inputType: 'number' | 'date', target: string, from: string, to: string, expectedLine: string): Writer {
	return {
		name: `${inputType} input`,
		expectedLine,
		initialControl: from,
		write: async (doc) => {
			const { view, dom } = mount(doc, new MetaBindTextInputWidget(inputType, target, from));
			const input = dom.querySelector<HTMLInputElement>('.cm-lp-meta-bind-input')!;
			input.value = to;
			input.dispatchEvent(new Event('blur'));
			return { view, control: () => input.value };
		},
	};
}

const writers: Writer[] = [
	{
		name: 'inline select',
		expectedLine: 'status: published',
		initialControl: 'draft',
		write: async (doc) => {
			const { view, dom } = mount(doc, new MetaBindSelectWidget(selectOptions, 'status', 'draft'));
			const select = dom as unknown as HTMLSelectElement;
			select.value = 'published';
			select.dispatchEvent(new Event('change'));
			return { view, control: () => select.value };
		},
	},
	{
		name: 'table-cell select',
		expectedLine: 'status: published',
		initialControl: 'draft',
		write: async (doc) => {
			const widget = new TableWidget(
				['status'],
				['left'],
				[['`INPUT[inlineSelect(option(draft, draft), option(published, published)):status]`']],
				[{ key: 'status', value: 'draft', type: 'text' }],
				{ from: 0, to: 0, startLine: 1, endLine: 3 },
			);
			const { view, dom } = mount(doc, widget);
			const select = dom.querySelector<HTMLSelectElement>('.cm-lp-meta-bind-select')!;
			select.value = 'published';
			select.dispatchEvent(new Event('change'));
			return { view, control: () => select.value };
		},
	},
	textInputWriter('number', 'count', '5', '7', 'count: 7'),
	textInputWriter('date', 'due', '2026-01-01', '2026-02-03', 'due: 2026-02-03'),
	{
		name: 'toggle',
		expectedLine: 'done: true',
		initialControl: 'false',
		write: async (doc) => {
			const { view, dom } = mount(doc, new MetaBindToggleWidget('done', 'false'));
			const cb = dom.querySelector<HTMLInputElement>('.cm-lp-meta-bind-toggle-input')!;
			cb.checked = true;
			cb.dispatchEvent(new Event('change'));
			return { view, control: () => String(cb.checked) };
		},
	},
	{
		name: 'button updateMetadata',
		expectedLine: 'status: published',
		write: async (doc) => {
			const view = mountButton(doc, buttonConfig);
			// The action runs after dynamic imports; wait until it settles.
			await vi.waitFor(() => {
				expect(view.state.doc.toString() !== doc || vi.mocked(toast.error).mock.calls.length > 0).toBe(true);
			});
			return { view };
		},
	},
];

describe('meta-bind frontmatter writers', () => {
	beforeAll(() => {
		// jsdom has no layout; a write's scroll snapshot makes CodeMirror measure,
		// so give Range the geometry an unrendered element reports.
		Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList;
		Range.prototype.getBoundingClientRect ??= () => new DOMRect();
	});

	beforeEach(() => {
		vi.mocked(toast.error).mockClear();
	});

	describe.each(writers)('$name', ({ write, expectedLine, initialControl }) => {
		it('writes the bound property and keeps the other keys', async () => {
			const { view } = await write(PARSEABLE);
			const doc = view.state.doc.toString();
			expect(doc).toContain(expectedLine);
			expect(doc).toContain('name: alice');
			expect(doc.endsWith('\nbody\n')).toBe(true);
			expect(toast.error).not.toHaveBeenCalled();
		});

		it('leaves a note whose frontmatter does not parse unchanged and tells the user', async () => {
			const { view } = await write(UNPARSEABLE);
			expect(view.state.doc.toString()).toBe(UNPARSEABLE);
			expect(toast.error).toHaveBeenCalledTimes(1);
			expect(vi.mocked(toast.error).mock.calls[0][0]).toMatch(/frontmatter could not be parsed/);
		});

		it.each(LOSSY)('leaves a note with %s unchanged and tells the user', async (_name, doc, message) => {
			const { view, control } = await write(doc);
			expect(view.state.doc.toString()).toBe(doc);
			expect(toast.error).toHaveBeenCalledTimes(1);
			expect(vi.mocked(toast.error).mock.calls[0][0]).toMatch(message);
			if (initialControl !== undefined) expect(control!()).toBe(initialControl);
		});

		it.skipIf(initialControl === undefined)('puts the control back to the note value after a refused write', async () => {
			const { control } = await write(UNPARSEABLE);
			expect(control!()).toBe(initialControl);
		});
	});

	describe('text input on a note whose frontmatter does not parse', () => {
		function mountInput() {
			const { view, dom } = mount(UNPARSEABLE, new MetaBindTextInputWidget('number', 'count', '5'));
			return { view, input: dom.querySelector<HTMLInputElement>('.cm-lp-meta-bind-input')! };
		}

		it('does not toast on a blur with the value unchanged', () => {
			const { view, input } = mountInput();
			input.dispatchEvent(new Event('blur'));
			expect(toast.error).not.toHaveBeenCalled();
			expect(view.state.doc.toString()).toBe(UNPARSEABLE);
		});

		it('does not toast when Escape cancels an edit', () => {
			const { input } = mountInput();
			input.value = '9';
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
			// jsdom fires no blur for an unfocused input; send the one a browser would.
			input.dispatchEvent(new Event('blur'));
			expect(toast.error).not.toHaveBeenCalled();
		});

		it('toasts once for a refused Enter and the blur that follows it', () => {
			const { view, input } = mountInput();
			input.value = '9';
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
			input.dispatchEvent(new Event('blur'));
			expect(toast.error).toHaveBeenCalledTimes(1);
			expect(view.state.doc.toString()).toBe(UNPARSEABLE);
		});
	});

	// `<input type="number">` / `type="date"` sanitize a value they cannot hold to "".
	describe.each([
		{ inputType: 'number' as const, target: 'count', raw: 'not a number' },
		{ inputType: 'number' as const, target: 'count', raw: '1,000' },
		{ inputType: 'date' as const, target: 'due', raw: '2026-01-05T10:00' },
		{ inputType: 'date' as const, target: 'due', raw: '2026-1-5' },
	])('$inputType input on a note holding `$target: $raw`', ({ inputType, target, raw }) => {
		const doc = `---\n${target}: ${raw}\nname: alice\n---\n\nbody\n`;

		function mountInput() {
			const { view, dom } = mount(doc, new MetaBindTextInputWidget(inputType, target, raw));
			return { view, dom, input: dom.querySelector<HTMLInputElement>('.cm-lp-meta-bind-input')! };
		}

		it('renders a text input showing the raw value, flagged invalid', () => {
			const { dom, input } = mountInput();
			expect(input.type).toBe('text');
			expect(input.value).toBe(raw);
			expect(dom.classList.contains('cm-lp-meta-bind-input-invalid')).toBe(true);
		});

		it('writes nothing on focus then blur', () => {
			const { view, input } = mountInput();
			input.focus();
			input.blur();
			input.dispatchEvent(new Event('blur'));
			expect(view.state.doc.toString()).toBe(doc);
		});

		it('writes nothing on Escape then blur', () => {
			const { view, input } = mountInput();
			input.value = '9';
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
			input.dispatchEvent(new Event('blur'));
			expect(input.value).toBe(raw);
			expect(view.state.doc.toString()).toBe(doc);
		});

		it('still writes a corrected value', () => {
			const fixed = inputType === 'number' ? '1000' : '2026-01-05';
			const { view, input } = mountInput();
			input.value = fixed;
			input.dispatchEvent(new Event('blur'));
			expect(view.state.doc.toString()).toContain(`${target}: `);
			expect(view.state.doc.toString()).toContain(fixed);
			expect(view.state.doc.toString()).not.toContain(raw);
		});
	});

	it('writes nothing on focus then blur when the text fallback strips a multi-line value', () => {
		// A text input drops newlines, so it shows "5" for the block scalar's "5\n".
		const doc = '---\ncount: |\n  5\nname: alice\n---\n\nbody\n';
		const { view, dom } = mount(doc, new MetaBindTextInputWidget('number', 'count', '5\n'));
		const input = dom.querySelector<HTMLInputElement>('.cm-lp-meta-bind-input')!;
		expect(input.type).toBe('text');
		expect(input.value).toBe('5');
		input.focus();
		input.blur();
		input.dispatchEvent(new Event('blur'));
		expect(view.state.doc.toString()).toBe(doc);
	});

	it('a select whose note value is not an option resets to what the first render showed', () => {
		const options = [
			{ value: 'draft', label: 'draft' },
			{ value: 'published', label: 'published' },
		];
		const { dom } = mount(UNPARSEABLE, new MetaBindSelectWidget(options, 'status', 'x'));
		const select = dom as unknown as HTMLSelectElement;
		const firstRender = { index: select.selectedIndex, value: select.value };
		expect(firstRender.index).toBe(0);
		select.value = 'published';
		select.dispatchEvent(new Event('change'));
		expect(toast.error).toHaveBeenCalledTimes(1);
		expect({ index: select.selectedIndex, value: select.value }).toEqual(firstRender);
	});

	it('typing 5.0 over 5 keeps `count: 5` on disk and shows 5 again', () => {
		const doc = '---\ncount: 5\nname: alice\n---\n\nbody\n';
		const { view, dom } = mount(doc, new MetaBindTextInputWidget('number', 'count', '5'));
		const input = dom.querySelector<HTMLInputElement>('.cm-lp-meta-bind-input')!;
		input.value = '5.0';
		input.dispatchEvent(new Event('blur'));
		const written = view.state.doc.toString();
		expect(written).toContain('count: 5\n');
		expect(parseFrontmatterProperties(written).find((p) => p.key === 'count')).toEqual({ key: 'count', value: 5, type: 'number' });
		// The rebuilt widget is eq() to the old one, so CodeMirror keeps this input.
		expect(input.value).toBe('5');
	});

	it('an integer beyond 2^53 keeps every digit and leaves the note writable', () => {
		const doc = '---\ncount: 5\ndone: false\n---\n\nbody\n';
		const { view, dom } = mount(doc, new MetaBindTextInputWidget('number', 'count', '5'));
		const input = dom.querySelector<HTMLInputElement>('.cm-lp-meta-bind-input')!;
		input.value = '12345678901234567890';
		input.dispatchEvent(new Event('blur'));
		expect(view.state.doc.toString()).toContain('12345678901234567890');
		expect(dispatchMetaBindUpdate(view, 'done', true)).toBe(true);
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('emptying a number input writes the empty string, never 0', () => {
		const doc = '---\ncount: 5\nname: alice\n---\n\nbody\n';
		const { view, dom } = mount(doc, new MetaBindTextInputWidget('number', 'count', '5'));
		const input = dom.querySelector<HTMLInputElement>('.cm-lp-meta-bind-input')!;
		input.value = '';
		input.dispatchEvent(new Event('blur'));
		expect(view.state.doc.toString()).toContain('count: ""');
	});

	it('a toggle still reads checked from a YAML boolean and from the legacy string "true"', () => {
		for (const doc of ['---\ndone: true\n---\n', '---\ndone: "true"\n---\n']) {
			const prop = parseFrontmatterProperties(doc).find((p) => p.key === 'done')!;
			const { dom } = mount(doc, new MetaBindToggleWidget('done', String(prop.value)));
			expect(dom.querySelector<HTMLInputElement>('.cm-lp-meta-bind-toggle-input')!.checked, doc).toBe(true);
		}
	});

	it('a toggle writes false as a YAML boolean', () => {
		const { view, dom } = mount('---\ndone: true\n---\n\nbody\n', new MetaBindToggleWidget('done', 'true'));
		const cb = dom.querySelector<HTMLInputElement>('.cm-lp-meta-bind-toggle-input')!;
		cb.checked = false;
		cb.dispatchEvent(new Event('change'));
		expect(parseFrontmatterProperties(view.state.doc.toString())).toEqual([{ key: 'done', value: false, type: 'boolean' }]);
	});

	it('a select writes a numeric option as a number and the rebuilt select shows it', () => {
		const options = [
			{ value: '1', label: 'a' },
			{ value: '3', label: 'c' },
		];
		const { view, dom } = mount('---\nhumor: 1\n---\n\nbody\n', new MetaBindSelectWidget(options, 'humor', '1'));
		const select = dom as unknown as HTMLSelectElement;
		select.value = '3';
		select.dispatchEvent(new Event('change'));
		const written = view.state.doc.toString();
		expect(written).toContain('humor: 3\n');
		const prop = parseFrontmatterProperties(written).find((p) => p.key === 'humor')!;
		expect(prop).toEqual({ key: 'humor', value: 3, type: 'number' });
		const rebuilt = mount(written, new MetaBindSelectWidget(options, 'humor', String(prop.value))).dom as unknown as HTMLSelectElement;
		expect(rebuilt.value).toBe('3');
	});

	it('a select keeps a non-numeric option a string', () => {
		const options = [
			{ value: '007', label: 'bond' },
			{ value: 'yes', label: 'yes' },
		];
		const { view, dom } = mount('---\ncode: x\n---\n\nbody\n', new MetaBindSelectWidget(options, 'code', 'x'));
		const select = dom as unknown as HTMLSelectElement;
		select.value = '007';
		select.dispatchEvent(new Event('change'));
		expect(view.state.doc.toString()).toContain('code: "007"');
	});

	it('a button updateMetadata writes a number and a boolean value typed, and a string as a string', async () => {
		const doc = '---\ncount: 1\ndone: false\nlabel: x\n---\n\nbody\n';
		const view = mountButton(doc, {
			label: 'Go',
			style: 'default',
			actions: [
				{ type: 'updateMetadata', bindTarget: 'count', value: 3 },
				{ type: 'updateMetadata', bindTarget: 'done', value: true },
				{ type: 'updateMetadata', bindTarget: 'label', value: '3' },
			],
		});
		await vi.waitFor(() => expect(view.state.doc.toString()).toContain('label: "3"'));
		const written = view.state.doc.toString();
		expect(written).toContain('count: 3\n');
		expect(written).toContain('done: true\n');
	});

	it('a button stops its remaining actions after a refused updateMetadata', async () => {
		const view = mountButton(UNPARSEABLE, {
			label: 'Publish',
			style: 'default',
			actions: [
				{ type: 'updateMetadata', bindTarget: 'status', value: 'published' },
				{ type: 'updateMetadata', bindTarget: 'count', value: '9' },
			],
		});
		await vi.waitFor(() => expect(toast.error).toHaveBeenCalled());
		// Let the chain run on, if it would.
		await new Promise((r) => setTimeout(r, 20));
		expect(toast.error).toHaveBeenCalledTimes(1);
		expect(view.state.doc.toString()).toBe(UNPARSEABLE);
	});
});
