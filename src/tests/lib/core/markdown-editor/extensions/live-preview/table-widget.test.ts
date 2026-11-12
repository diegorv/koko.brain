// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { EditorState, EditorSelection } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap, historyKeymap, history, indentWithTab } from '@codemirror/commands';
import { editorHost, NOOP_HOST } from '#lib/core/markdown-editor/editor-host.js';
import { computeTables, tableField } from '#lib/core/markdown-editor/extensions/live-preview/plugins/table-field.js';
import { TableWidget, renderTableSource } from '#lib/core/markdown-editor/extensions/live-preview/widgets.js';
import { resolveWikilinkClickPosition } from '#lib/core/markdown-editor/wikilink-click-target.js';
import { parseFrontmatterProperties } from '#lib/core/frontmatter/properties.logic.js';
import { mountMarkdownView, testMarkdown } from '../../test-helpers';

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
/** Where the editor host creates the note of an unresolved cell link. */
const createNote = vi.fn(async () => true);
/** Resolves every target to `/vault/<target>.md` except `Missing`, which has no note. */
const host = {
	...NOOP_HOST,
	resolveLink: (t: string) => (t === 'Missing' ? null : `/vault/${t}.md`),
	openLink,
	createNote,
};

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
		createNote.mockClear();
	});

	/** Text after the table in the mounted doc: the target of same-note anchor links. */
	const AFTER_TABLE = '\n\n# Heading\n\nPara ^blk';

	let lastView: EditorView;

	/** Renders a one-column table whose header cell is `cell` and returns its link. */
	function mountLink(cell = '[[Target]]'): HTMLElement {
		const source = renderTableSource([cell], ['left'], [['x']]);
		const root = document.body.appendChild(document.createElement('div'));
		const doc = source + AFTER_TABLE;
		lastView = new EditorView({
			state: EditorState.create({ doc, selection: EditorSelection.cursor(doc.length), extensions: editorHost.of(host) }),
			parent: root,
		});
		const widget = new TableWidget([cell], ['left'], [['x']], [], {
			from: 0,
			to: source.length,
			startLine: 1,
			endLine: 3,
		});
		const dom = widget.toDOM(lastView);
		root.appendChild(dom);
		const link = dom.querySelector<HTMLElement>('.cm-lp-wikilink');
		expect(link).not.toBeNull();
		return link!;
	}

	const NO_ANCHOR = { heading: null, blockId: null };

	function press(link: HTMLElement, init: MouseEventInit = {}): MouseEvent {
		const e = new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0, ...init });
		link.dispatchEvent(e);
		return e;
	}

	it('a plain primary click opens the target', () => {
		platform.mac = false;
		const e = press(mountLink());
		expect(openLink).toHaveBeenCalledWith('/vault/Target.md', NO_ANCHOR);
		expect(e.defaultPrevented).toBe(true);
	});

	it('a link to a missing note creates it (the create-on-click path)', () => {
		platform.mac = false;
		press(mountLink('[[Missing]]'));
		expect(createNote).toHaveBeenCalledWith('Missing', NO_ANCHOR);
		expect(openLink).not.toHaveBeenCalled();
	});

	it('a heading link opens the target at the heading', () => {
		platform.mac = false;
		press(mountLink('[[Target#Intro]]'));
		expect(openLink).toHaveBeenCalledWith('/vault/Target.md', { heading: 'Intro', blockId: null });
	});

	it('a block link opens the target at the block', () => {
		platform.mac = false;
		press(mountLink('[[Target#^abc]]'));
		expect(openLink).toHaveBeenCalledWith('/vault/Target.md', { heading: null, blockId: 'abc' });
	});

	it('an aliased link opens the target, not the alias', () => {
		platform.mac = false;
		press(mountLink('[[Target#Intro|Shown]]'));
		expect(openLink).toHaveBeenCalledWith('/vault/Target.md', { heading: 'Intro', blockId: null });
	});

	it('a same-note heading link moves the cursor to the heading and creates nothing', () => {
		platform.mac = false;
		press(mountLink('[[#Heading]]'));
		const doc = lastView.state.doc.toString();
		expect(lastView.state.selection.main.head).toBe(doc.indexOf('# Heading'));
		expect(createNote).not.toHaveBeenCalled();
		expect(openLink).not.toHaveBeenCalled();
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
		expect(openLink).toHaveBeenCalledWith('/vault/Target.md', NO_ANCHOR);
	});

	it('the editor click resolver leaves a press on the rendered cell link to the widget', () => {
		platform.mac = false;
		const link = mountLink();
		let captured: MouseEvent | null = null;
		link.addEventListener('mousedown', (e) => {
			captured = e;
		}, { once: true });
		press(link);
		expect(captured).not.toBeNull();
		expect(resolveWikilinkClickPosition(captured!, lastView, false)).toBeNull();
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

/**
 * `createMetaBindSelect` stops `mousedown`, so focusing a select in a table
 * cell leaves the editor selection on another line. A key pressed in it
 * bubbles to `contentDOM`; unless `TableWidget.ignoreEvent` claims it,
 * CodeMirror runs the keymap against that selection.
 */
describe('TableWidget: keys in a meta-bind select inside a cell', () => {
	const LINE = 'hello world';
	const doc = `---\nstatus: todo\n---\n${LINE}\n\n| Task | Status |\n| --- | --- |\n| a | \`INPUT[inlineSelect(todo, done):status]\` |\n\ntext\n`;

	function mount() {
		return mountMarkdownView(doc, {
			cursor: doc.indexOf(LINE) + LINE.length,
			extensions: [
				testMarkdown(),
				tableField,
				history(),
				keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
			],
		});
	}

	function select(view: EditorView): HTMLSelectElement {
		const el = view.contentDOM.querySelector<HTMLSelectElement>('.cm-lp-table select.cm-lp-meta-bind-select');
		if (!el) throw new Error('no meta-bind select rendered in the table');
		return el;
	}

	function press(el: HTMLElement, key: string) {
		const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
		el.dispatchEvent(ev);
		return ev;
	}

	beforeAll(() => {
		// jsdom has no layout; CodeMirror measures after a focus or a doc change.
		Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList;
		Range.prototype.getBoundingClientRect ??= () => new DOMRect();
	});

	afterEach(() => {
		document.body.replaceChildren();
	});

	it.each(['Enter', 'Backspace', 'Delete', 'Tab'])('%s on the focused select leaves the note unchanged', (key) => {
		const view = mount();
		const el = select(view);
		el.focus();
		const ev = press(el, key);
		expect(view.state.doc.toString()).toBe(doc);
		expect(ev.defaultPrevented, 'the select keeps its own key').toBe(false);
		view.destroy();
	});

	it('Mod-z on the focused select does not undo the editor history', () => {
		const view = mount();
		press(view.contentDOM, 'Backspace');
		const edited = doc.replace(LINE, LINE.slice(0, -1));
		expect(view.state.doc.toString()).toBe(edited);
		const el = select(view);
		el.focus();
		const ev = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true });
		el.dispatchEvent(ev);
		expect(view.state.doc.toString()).toBe(edited);
		expect(ev.defaultPrevented, 'the select keeps its own key').toBe(false);
		view.destroy();
	});

	it('mousedown on the select does not move the editor cursor', () => {
		const view = mount();
		const head = view.state.selection.main.head;
		select(view).dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
		expect(view.state.selection.main.head).toBe(head);
		view.destroy();
	});

	it('a key outside a form control still reaches the editor keymap', () => {
		const view = mount();
		const ev = press(view.contentDOM, 'Backspace');
		expect(ev.defaultPrevented).toBe(true);
		expect(view.state.doc.toString()).toBe(doc.replace(LINE, LINE.slice(0, -1)));
		view.destroy();
	});
});

describe('TableWidget: meta-bind inputs in cells', () => {
	/** Renders a one-cell table holding `cell` over the frontmatter of `doc`. */
	function renderCell(doc: string, cell: string): { view: EditorView; td: HTMLElement } {
		const root = document.body.appendChild(document.createElement('div'));
		const view = new EditorView({ state: EditorState.create({ doc }), parent: root });
		const widget = new TableWidget(['A'], ['left'], [[cell]], parseFrontmatterProperties(doc), {
			from: 0,
			to: 0,
			startLine: 1,
			endLine: 3,
		});
		const dom = widget.toDOM(view);
		root.appendChild(dom);
		return { view, td: dom.querySelector('tbody td')! };
	}

	beforeAll(() => {
		// jsdom has no layout; a write's scroll snapshot makes CodeMirror measure.
		Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList;
		Range.prototype.getBoundingClientRect ??= () => new DOMRect();
	});

	afterEach(() => {
		document.body.replaceChildren();
	});

	it('an alias bind target selects the canonical key value', () => {
		const { td } = renderCell('---\n_type: project\n---\n', '`INPUT[inlineSelect(note, project):type]`');
		expect(td.querySelector<HTMLSelectElement>('select.cm-lp-meta-bind-select')!.value).toBe('project');
	});

	it.each(['toggle', 'boolean'])('INPUT[%s():done] renders a checkbox, not a select', (type) => {
		const { td } = renderCell('---\ndone: true\n---\n', `\`INPUT[${type}():done]\``);
		expect(td.querySelector('select')).toBeNull();
		const cb = td.querySelector<HTMLInputElement>('input.cm-lp-meta-bind-toggle-input')!;
		expect(cb.type).toBe('checkbox');
		expect(cb.checked).toBe(true);
	});

	it('INPUT[number():count] renders a number input, not a select', () => {
		const { td } = renderCell('---\ncount: 5\n---\n', '`INPUT[number():count]`');
		expect(td.querySelector('select')).toBeNull();
		const input = td.querySelector<HTMLInputElement>('input.cm-lp-meta-bind-input')!;
		expect(input.type).toBe('number');
		expect(input.value).toBe('5');
	});

	it('INPUT[date():due] renders a date input, not a select', () => {
		const { td } = renderCell('---\ndue: 2026-01-01\n---\n', '`INPUT[date():due]`');
		expect(td.querySelector('select')).toBeNull();
		expect(td.querySelector<HTMLInputElement>('input.cm-lp-meta-bind-input')!.type).toBe('date');
	});

	it('a toggle in a cell writes a YAML boolean', () => {
		const { view, td } = renderCell('---\ndone: false\n---\n', '`INPUT[toggle():done]`');
		const cb = td.querySelector<HTMLInputElement>('input.cm-lp-meta-bind-toggle-input')!;
		cb.checked = true;
		cb.dispatchEvent(new Event('change'));
		expect(view.state.doc.toString()).toBe('---\ndone: true\n---\n');
	});

	it('a number input in a cell writes a YAML number', () => {
		const { view, td } = renderCell('---\ncount: 5\n---\n', '`INPUT[number():count]`');
		const input = td.querySelector<HTMLInputElement>('input.cm-lp-meta-bind-input')!;
		input.value = '7';
		input.dispatchEvent(new Event('blur'));
		expect(view.state.doc.toString()).toBe('---\ncount: 7\n---\n');
	});
});

describe('TableWidget: links, line breaks and escapes in cells', () => {
	/** Where the editor host opens an external cell link. */
	const openExternal = vi.fn(async () => {});

	/** Views created by render(), destroyed after each test. */
	const views: EditorView[] = [];

	/** Renders a one-column table with header `header` and body cell `cell`, under a parent with a mousedown spy. */
	function render(cell: string, header = 'h'): { th: HTMLElement; td: HTMLElement; parentSpy: ReturnType<typeof vi.fn> } {
		const root = document.body.appendChild(document.createElement('div'));
		const parentSpy = vi.fn();
		root.addEventListener('mousedown', parentSpy);
		const view = new EditorView({
			state: EditorState.create({ doc: 'x', extensions: editorHost.of({ ...host, openExternal }) }),
			parent: document.body.appendChild(document.createElement('div')),
		});
		views.push(view);
		const widget = new TableWidget([header], ['left'], [[cell]], [], { from: 0, to: 0, startLine: 1, endLine: 3 });
		const dom = widget.toDOM(view);
		root.appendChild(dom);
		return { th: dom.querySelector('thead th')!, td: dom.querySelector('tbody td')!, parentSpy };
	}

	function press(el: HTMLElement, init: MouseEventInit = {}): MouseEvent {
		const e = new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0, ...init });
		el.dispatchEvent(e);
		return e;
	}

	beforeEach(() => {
		openExternal.mockClear();
	});

	afterEach(() => {
		for (const view of views.splice(0)) view.destroy();
		document.body.replaceChildren();
	});

	it('a body cell renders a link, an unescaped pipe and a line break', () => {
		const { td } = render('[Docs](https://x.dev) a \\| b<br>next');
		const link = td.querySelector('.cm-lp-link');
		expect(link).not.toBeNull();
		expect(link!.textContent).toBe('Docs');
		expect(link!.tagName).toBe('SPAN');
		expect(link!.hasAttribute('href')).toBe(false);
		expect(td.querySelector('a')).toBeNull();
		expect(td.querySelectorAll('br')).toHaveLength(1);
		expect(td.textContent).toBe('Docs a | bnext');
		expect(td.textContent).not.toMatch(/\[|\]\(|\\/);
	});

	it('a header cell renders a link and a line break too', () => {
		const { th } = render('x', '[Docs](https://x.dev)<br>more');
		expect(th.querySelector('.cm-lp-link')!.textContent).toBe('Docs');
		expect(th.querySelectorAll('br')).toHaveLength(1);
		expect(th.textContent).toBe('Docsmore');
	});

	it('the raw `\\|` that the table parser keeps is unescaped at render time', () => {
		const doc = '| h |\n| --- |\n| x \\| y<br>z |\n\ntext';
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
		const td = widget!.toDOM(view).querySelector('tbody td')!;
		const nodes = Array.from(td.childNodes);
		expect(nodes.map((n) => n.nodeName)).toEqual(['#text', 'BR', '#text']);
		expect(nodes[0].textContent).toBe('x | y');
		expect(nodes[2].textContent).toBe('z');
		view.destroy();
	});

	describe('link press', () => {
		const link = (cell = '[Docs](https://x.dev)') => render(cell);

		it.each([
			{ mac: true, init: { metaKey: true } },
			{ mac: false, init: { ctrlKey: true } },
		])('with the open modifier (mac=$mac) opens the url once and stops the event', ({ mac, init }) => {
			platform.mac = mac;
			const { td, parentSpy } = link();
			const e = press(td.querySelector<HTMLElement>('.cm-lp-link')!, init);
			expect(openExternal).toHaveBeenCalledTimes(1);
			expect(openExternal).toHaveBeenCalledWith('https://x.dev');
			expect(e.defaultPrevented).toBe(true);
			expect(parentSpy).not.toHaveBeenCalled();
		});

		it('with no modifier does nothing and bubbles', () => {
			platform.mac = false;
			const { td, parentSpy } = link();
			const e = press(td.querySelector<HTMLElement>('.cm-lp-link')!);
			expect(openExternal).not.toHaveBeenCalled();
			expect(e.defaultPrevented).toBe(false);
			expect(parentSpy).toHaveBeenCalledTimes(1);
		});

		it('a right click is not opened and not stopped', () => {
			platform.mac = false;
			const { td, parentSpy } = link();
			const e = press(td.querySelector<HTMLElement>('.cm-lp-link')!, { button: 2, ctrlKey: true });
			expect(openExternal).not.toHaveBeenCalled();
			expect(e.defaultPrevented).toBe(false);
			expect(parentSpy).toHaveBeenCalledTimes(1);
		});

		it('macOS: Ctrl+click is not opened and not stopped', () => {
			platform.mac = true;
			const { td, parentSpy } = link();
			const e = press(td.querySelector<HTMLElement>('.cm-lp-link')!, { ctrlKey: true });
			expect(openExternal).not.toHaveBeenCalled();
			expect(e.defaultPrevented).toBe(false);
			expect(parentSpy).toHaveBeenCalledTimes(1);
		});

		it('an unsafe url is not opened, but the event is still stopped', () => {
			platform.mac = false;
			const { td, parentSpy } = link('[x](javascript:alert(1))');
			const el = td.querySelector<HTMLElement>('.cm-lp-link')!;
			expect(el.textContent).toBe('x');
			const e = press(el, { ctrlKey: true });
			expect(openExternal).not.toHaveBeenCalled();
			expect(e.defaultPrevented).toBe(true);
			expect(parentSpy).not.toHaveBeenCalled();
		});

		it('an empty url in angle brackets is not opened, but the event is still stopped', () => {
			platform.mac = false;
			const { td, parentSpy } = link('[x](<>)');
			const el = td.querySelector<HTMLElement>('.cm-lp-link')!;
			expect(el.textContent).toBe('x');
			const e = press(el, { ctrlKey: true });
			expect(openExternal).not.toHaveBeenCalled();
			expect(e.defaultPrevented).toBe(true);
			expect(parentSpy).not.toHaveBeenCalled();
		});

		it('an unsafe url in angle brackets is not opened', () => {
			platform.mac = false;
			const { td } = link('[x](<javascript:alert(1)>)');
			press(td.querySelector<HTMLElement>('.cm-lp-link')!, { ctrlKey: true });
			expect(openExternal).not.toHaveBeenCalled();
		});

		it('an escaped pipe in the url opens the url with a plain pipe', () => {
			platform.mac = false;
			const { td } = link('[x](https://x.dev/a\\|b)');
			press(td.querySelector<HTMLElement>('.cm-lp-link')!, { ctrlKey: true });
			expect(openExternal).toHaveBeenCalledWith('https://x.dev/a|b');
		});
	});

	describe('escapes and line breaks', () => {
		it('`\\\\` renders one backslash', () => {
			expect(render('a \\\\ b').td.textContent).toBe('a \\ b');
		});

		it('`\\*a\\*` renders literal asterisks with no em', () => {
			const { td } = render('\\*a\\*');
			expect(td.textContent).toBe('*a*');
			expect(td.querySelector('em')).toBeNull();
		});

		it('a backslash before a non-punctuation character stays literal', () => {
			expect(render('C:\\Users').td.textContent).toBe('C:\\Users');
		});

		it('inside a code span only `\\|` is unescaped', () => {
			const { td } = render('`x \\| y` `a\\\\b`');
			const codes = td.querySelectorAll('code');
			expect(codes[0].textContent).toBe('x | y');
			expect(codes[1].textContent).toBe('a\\\\b');
		});

		it('`<br>` inside a code span stays literal', () => {
			const { td } = render('`a<br>b`');
			expect(td.querySelector('code')!.textContent).toBe('a<br>b');
			expect(td.querySelector('br')).toBeNull();
		});

		it.each(['<BR>', '<br />', '<br/>', '<Br>'])('%s renders a br element', (br) => {
			const { td } = render(`a${br}b`);
			expect(td.querySelectorAll('br')).toHaveLength(1);
			expect(td.textContent).toBe('ab');
		});

		it('a wikilink next to escaped text renders as before', () => {
			const { td } = render('[[Target]] a \\| b');
			expect(td.querySelector('.cm-lp-wikilink')!.textContent).toBe('Target');
			expect(td.textContent).toBe('Target a | b');
		});
	});

	it('cell text is never parsed as HTML', () => {
		const { td } = render('<b>x</b> <img src=x onerror=alert(1)>');
		expect(td.querySelector('b')).toBeNull();
		expect(td.querySelector('img')).toBeNull();
		expect(td.textContent).toBe('<b>x</b> <img src=x onerror=alert(1)>');
	});
});
