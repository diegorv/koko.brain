// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EditorState, EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { TableWidget, renderTableSource } from '#lib/core/markdown-editor/extensions/live-preview/widgets.js';
import { openWikilinkTarget } from '#lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.js';

const platform = vi.hoisted(() => ({ mac: false }));

vi.mock('#lib/utils/platform.js', async (importOriginal) => {
	const actual = await importOriginal<typeof import('#lib/utils/platform.js')>();
	return {
		...actual,
		get IS_MAC() {
			return platform.mac;
		},
	};
});

vi.mock('#lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.js', () => ({
	openWikilinkTarget: vi.fn(),
}));

describe('renderTableSource', () => {
	it('emits header + delimiter + body lines', () => {
		const md = renderTableSource(['a', 'b'], ['left', 'right'], [['1', '2'], ['3', '4']]);
		expect(md).toBe('| a | b |\n| --- | ---: |\n| 1 | 2 |\n| 3 | 4 |');
	});

	it('encodes alignments', () => {
		const md = renderTableSource(['a', 'b', 'c'], ['left', 'center', 'right'], []);
		expect(md).toContain('| --- | :---: | ---: |');
	});

	it('escapes `|` in cell content', () => {
		const md = renderTableSource(['col'], ['left'], [['has|pipe']]);
		expect(md).toContain('has\\|pipe');
	});

	it('pads short rows to header length', () => {
		const md = renderTableSource(['a', 'b', 'c'], ['left', 'left', 'left'], [['x']]);
		expect(md).toContain('| x |  |  |');
	});
});

describe('TableWidget — +col / +row buttons', () => {
	function mount(headers: string[], rows: string[][]) {
		const source = renderTableSource(
			headers,
			headers.map(() => 'left'),
			rows,
		);
		const state = EditorState.create({
			doc: source,
			selection: EditorSelection.cursor(0),
		});
		const root = document.body.appendChild(document.createElement('div'));
		const view = new EditorView({ state, parent: root });
		const widget = new TableWidget(
			headers,
			headers.map(() => 'left'),
			rows,
			[],
			{ from: 0, to: source.length, startLine: 1, endLine: 2 + rows.length },
		);
		const dom = widget.toDOM(view);
		root.appendChild(dom);
		return { view, dom, widget };
	}

	it('renders with +col and +row buttons in the wrapper', () => {
		const { dom } = mount(['h1', 'h2'], [['a', 'b']]);
		expect(dom.querySelector('.cm-lp-table-add-col')).not.toBeNull();
		expect(dom.querySelector('.cm-lp-table-add-row')).not.toBeNull();
	});

	it('clicking +col dispatches a transaction that appends an empty column', () => {
		const { view, dom } = mount(['name', 'age'], [['alice', '30']]);
		const before = view.state.doc.toString();
		const btn = dom.querySelector<HTMLButtonElement>('.cm-lp-table-add-col');
		expect(btn).not.toBeNull();
		btn!.click();
		const after = view.state.doc.toString();
		expect(after).not.toBe(before);
		// Header row got a third empty column
		expect(after).toContain('| name | age |  |');
		// Delimiter has 3 columns
		expect(after).toContain('| --- | --- | --- |');
		// Body row padded
		expect(after).toContain('| alice | 30 |  |');
	});

	it('clicking +row dispatches a transaction that appends an empty row', () => {
		const { view, dom } = mount(['name', 'age'], [['alice', '30']]);
		const btn = dom.querySelector<HTMLButtonElement>('.cm-lp-table-add-row');
		btn!.click();
		const after = view.state.doc.toString();
		// One extra empty row at the bottom
		expect(after.endsWith('|  |  |')).toBe(true);
	});

	it('source range update changes eq() — moving the table forces a rebuild', () => {
		const a = new TableWidget(['h'], ['left'], [], [], { from: 0, to: 10, startLine: 1, endLine: 2 });
		const b = new TableWidget(['h'], ['left'], [], [], { from: 100, to: 110, startLine: 5, endLine: 6 });
		// Same headers/rows/properties but different sourceRange → not equal
		expect(a.eq(b)).toBe(false);
	});
});

describe('TableWidget — cell wikilink click', () => {
	beforeEach(() => {
		vi.mocked(openWikilinkTarget).mockClear();
	});

	function mountLink(): HTMLElement {
		const source = renderTableSource(['[[Target]]'], ['left'], [['x']]);
		const root = document.body.appendChild(document.createElement('div'));
		const view = new EditorView({ state: EditorState.create({ doc: source }), parent: root });
		const widget = new TableWidget(['[[Target]]'], ['left'], [['x']], [], {
			from: 0,
			to: source.length,
			startLine: 1,
			endLine: 3,
		});
		const dom = widget.toDOM(view);
		root.appendChild(dom);
		const link = dom.querySelector<HTMLElement>('.cm-lp-wikilink');
		expect(link).not.toBeNull();
		return link!;
	}

	function press(link: HTMLElement, init: MouseEventInit = {}): MouseEvent {
		const e = new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0, ...init });
		link.dispatchEvent(e);
		return e;
	}

	it('a plain primary click opens the target', () => {
		platform.mac = false;
		const e = press(mountLink());
		expect(openWikilinkTarget).toHaveBeenCalledWith('Target');
		expect(e.defaultPrevented).toBe(true);
	});

	it('a right click does not navigate and keeps the default (context menu)', () => {
		platform.mac = false;
		const e = press(mountLink(), { button: 2 });
		expect(openWikilinkTarget).not.toHaveBeenCalled();
		expect(e.defaultPrevented).toBe(false);
	});

	it('macOS: Ctrl+click does not navigate', () => {
		platform.mac = true;
		const e = press(mountLink(), { ctrlKey: true });
		expect(openWikilinkTarget).not.toHaveBeenCalled();
		expect(e.defaultPrevented).toBe(false);
	});

	it('Windows/Linux: Ctrl+click opens the target', () => {
		platform.mac = false;
		press(mountLink(), { ctrlKey: true });
		expect(openWikilinkTarget).toHaveBeenCalledWith('Target');
	});
});
