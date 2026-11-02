// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EditorState, EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { editorHost, NOOP_HOST } from '#lib/core/markdown-editor/editor-host.js';
import { computeTables } from '#lib/core/markdown-editor/extensions/live-preview/plugins/table-field.js';
import { TableWidget, renderTableSource } from '#lib/core/markdown-editor/extensions/live-preview/widgets.js';
import { mountMarkdownView } from '../../test-helpers';

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

/** Where the editor host opens a resolved cell link. */
const openLink = vi.fn(async () => {});
const host = { ...NOOP_HOST, resolveLink: (t: string) => `/vault/${t}.md`, openLink };

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
		openLink.mockClear();
	});

	function mountLink(): HTMLElement {
		const source = renderTableSource(['[[Target]]'], ['left'], [['x']]);
		const root = document.body.appendChild(document.createElement('div'));
		const view = new EditorView({ state: EditorState.create({ doc: source, extensions: editorHost.of(host) }), parent: root });
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
		expect(openLink).toHaveBeenCalledWith('/vault/Target.md', undefined);
		expect(e.defaultPrevented).toBe(true);
	});

	it('a right click does not navigate and keeps the default (context menu)', () => {
		platform.mac = false;
		const e = press(mountLink(), { button: 2 });
		expect(openLink).not.toHaveBeenCalled();
		expect(e.defaultPrevented).toBe(false);
	});

	it('macOS: Ctrl+click does not navigate', () => {
		platform.mac = true;
		const e = press(mountLink(), { ctrlKey: true });
		expect(openLink).not.toHaveBeenCalled();
		expect(e.defaultPrevented).toBe(false);
	});

	it('Windows/Linux: Ctrl+click opens the target', () => {
		platform.mac = false;
		press(mountLink(), { ctrlKey: true });
		expect(openLink).toHaveBeenCalledWith('/vault/Target.md', undefined);
	});
});

/**
 * Mounts the real markdown + GFM language on `doc` with the cursor on the last
 * line (outside the table), lets the real table decorator build the TableWidget
 * exactly as live preview does, and clicks one of its `+` buttons.
 */
function clickAdd(doc: string, which: 'row' | 'col'): string {
	const view: EditorView = mountMarkdownView(doc, { cursor: doc.length });
	const decos = computeTables(view.state);
	let widget: TableWidget | null = null;
	const iter = decos.iter();
	while (iter.value) {
		const w = (iter.value.spec as { widget?: unknown }).widget;
		if (w instanceof TableWidget) {
			widget = w;
			break;
		}
		iter.next();
	}
	expect(widget, 'the table decorator must build a TableWidget').not.toBeNull();
	const dom = widget!.toDOM(view);
	view.dom.appendChild(dom);
	dom.querySelector<HTMLButtonElement>(`.cm-lp-table-add-${which}`)!.click();
	const out = view.state.doc.toString();
	view.destroy();
	return out;
}

describe('TableWidget +row / +col keep the table source byte for byte', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	describe('F98: cells beyond the header count', () => {
		const doc = '| Item | Qty |\n| --- | --- |\n| apple | 3 | bought at Lidl |\n\ntext';

		it('+row does not delete the extra cell text', () => {
			expect(clickAdd(doc, 'row')).toContain('bought at Lidl');
		});

		it('+col does not delete the extra cell text', () => {
			expect(clickAdd(doc, 'col')).toContain('bought at Lidl');
		});

		it('an unclosed `[[` in the header does not make +row drop body text', () => {
			const d = '| Note | [[Link | Status |\n| --- | --- | --- |\n| a | b | done |\n\ntext';
			const out = clickAdd(d, 'row');
			expect(out).toContain('| a | b | done |');
			expect(out).toContain('| Note | [[Link | Status |');
		});
	});

	describe('F99: raw cell source is not escaped again', () => {
		it('a backslash in a cell is not doubled', () => {
			const doc = '| path |\n| --- |\n| C:\\temp |\n\ntext';
			const out = clickAdd(doc, 'row');
			expect(out).toContain('| C:\\temp |');
			expect(out).not.toContain('C:\\\\temp');
		});

		it('repeated clicks do not double backslashes', () => {
			const doc = '| path |\n| --- |\n| C:\\temp |\n\ntext';
			const out = clickAdd(clickAdd(clickAdd(doc, 'row'), 'col'), 'row');
			expect(out).toContain('| C:\\temp |');
			expect(out).not.toContain('C:\\\\temp');
		});

		it('a wikilink alias in a cell keeps its bare pipe target', () => {
			const doc = '| link |\n| --- |\n| [[Note|alias]] |\n\ntext';
			const out = clickAdd(doc, 'row');
			expect(out).toContain('[[Note|alias]]');
			expect(clickAdd(doc, 'col')).toContain('[[Note|alias]]');
		});

		it('an already-escaped pipe stays a single escaped pipe', () => {
			const doc = '| a |\n| --- |\n| x\\|y |\n\ntext';
			const out = clickAdd(doc, 'col');
			expect(out).toContain('x\\|y');
			expect(out).not.toContain('x\\\\\\|y');
			const row = clickAdd(doc, 'row');
			expect(row).toContain('x\\|y');
			expect(row).not.toContain('x\\\\\\|y');
		});

		it('one +col click keeps a backslash in a cell', () => {
			const doc = '| path |\n| --- |\n| C:\\temp |\n\ntext';
			const out = clickAdd(doc, 'col');
			expect(out).toContain('| C:\\temp |');
			expect(out).not.toContain('C:\\\\temp');
		});
	});

	describe('F100: container prefixes', () => {
		it('+row in a callout keeps `> ` on every table line, including the new row', () => {
			const doc = '> [!note]\n> | a | b |\n> | --- | --- |\n> | 1 | 2 |\n\ntext';
			const out = clickAdd(doc, 'row');
			expect(out).toBe('> [!note]\n> | a | b |\n> | --- | --- |\n> | 1 | 2 |\n> |  |  |\n\ntext');
		});

		it('+row in a list item keeps the indent on every line', () => {
			const doc = '- item\n\n  | a | b |\n  | --- | --- |\n  | 1 | 2 |\n\ntext';
			const out = clickAdd(doc, 'row');
			expect(out).toBe('- item\n\n  | a | b |\n  | --- | --- |\n  | 1 | 2 |\n  |  |  |\n\ntext');
		});

		it('+col in a callout keeps `> ` and appends one cell per line', () => {
			const doc = '> [!note]\n> | a | b |\n> | --- | --- |\n> | 1 | 2 |\n\ntext';
			const out = clickAdd(doc, 'col');
			expect(out).toBe('> [!note]\n> | a | b |  |\n> | --- | --- | --- |\n> | 1 | 2 |  |\n\ntext');
		});

		it('+col in a list item keeps the indent and appends one cell per line', () => {
			const doc = '- item\n\n  | a | b |\n  | --- | --- |\n  | 1 | 2 |\n\ntext';
			const out = clickAdd(doc, 'col');
			expect(out).toBe('- item\n\n  | a | b |  |\n  | --- | --- | --- |\n  | 1 | 2 |  |\n\ntext');
		});

		it('+row on a pipe-less table in a callout writes one cell per column', () => {
			const doc = '> [!note]\n> a | b\n> --- | ---\n> 1 | 2\n\ntext';
			const out = clickAdd(doc, 'row');
			expect(out).toBe('> [!note]\n> a | b\n> --- | ---\n> 1 | 2\n> |  |  |\n\ntext');
		});

		it('+col on a pipe-less table in a callout repeats the last alignment', () => {
			const doc = '> [!note]\n> a | b\n> :--- | ---:\n> 1 | 2\n\ntext';
			const out = clickAdd(doc, 'col');
			expect(out).toBe('> [!note]\n> a | b |  |\n> :--- | ---: | ---: |\n> 1 | 2 |  |\n\ntext');
		});
	});

	describe('+col adds exactly one column', () => {
		it('with outer pipes, repeating the last alignment', () => {
			const doc = '| a | b |\n| :--- | :---: |\n| 1 | 2 |\n| 3 | 4 |\n\ntext';
			expect(clickAdd(doc, 'col')).toBe(
				'| a | b |  |\n| :--- | :---: | :---: |\n| 1 | 2 |  |\n| 3 | 4 |  |\n\ntext',
			);
		});

		it('without outer pipes, closing each line before the new cell', () => {
			const doc = 'a | b\n--- | ---:\n1 | 2\n\ntext';
			expect(clickAdd(doc, 'col')).toBe('a | b |  |\n--- | ---: | ---: |\n1 | 2 |  |\n\ntext');
		});
	});

	it('+row leaves every existing line unchanged and adds one cell per column', () => {
		const doc = 'a | b\n--- | ---\n1 | 2\n\ntext';
		expect(clickAdd(doc, 'row')).toBe('a | b\n--- | ---\n1 | 2\n|  |  |\n\ntext');
	});
});
