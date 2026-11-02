// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
	/** A line the write puts in a parseable note's frontmatter (meta-bind writes every value as a string). */
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
	textInputWriter('number', 'count', '5', '7', 'count: "7"'),
	textInputWriter('date', 'due', '2026-01-01', '2026-02-03', 'due: 2026-02-03'),
	{
		name: 'toggle',
		expectedLine: 'done: "true"',
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

	it('typing 5.0 over 5 writes "5.0", so the rebuilt widget is not eq() to the old one', () => {
		const doc = '---\ncount: 5\nname: alice\n---\n\nbody\n';
		const widget = new MetaBindTextInputWidget('number', 'count', '5');
		const { view, dom } = mount(doc, widget);
		const input = dom.querySelector<HTMLInputElement>('.cm-lp-meta-bind-input')!;
		input.value = '5.0';
		input.dispatchEvent(new Event('blur'));
		const written = view.state.doc.toString();
		expect(written).toContain('count: "5.0"');
		const prop = parseFrontmatterProperties(written).find((p) => p.key === 'count');
		const next = new MetaBindTextInputWidget('number', 'count', String(prop!.value));
		expect(next.currentValue).toBe('5.0');
		expect(widget.eq(next)).toBe(false);
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
