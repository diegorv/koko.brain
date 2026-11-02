// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { computeCodeBlocks } from '#lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.js';
import { CodeBlockWidget } from '#lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.js';
import { TaskCheckboxWidget, ImageWidget } from '#lib/core/markdown-editor/extensions/live-preview/widgets.js';
import { imagePlugin } from '#lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.js';
import { pasteTsvHandler } from '#lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv-handler.js';
import { clipboardToMarkdownTable } from '#lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv.logic.js';
import { editorHost, NOOP_HOST } from '#lib/core/markdown-editor/editor-host.js';
import { createMarkdownState, mountMarkdownView, testMarkdown } from '../../lib/core/markdown-editor/test-helpers';

afterEach(() => {
	document.body.innerHTML = '';
});

describe('F101: code-block language switch keeps the rest of the info string', () => {
	it('switching python -> javascript keeps title="main.py"', () => {
		const doc = '```python title="main.py"\nprint(1)\n```\n\ntext';
		const view = mountMarkdownView(doc, { cursor: doc.length });
		const iter = computeCodeBlocks(view.state).iter();
		let widget: CodeBlockWidget | null = null;
		while (iter.value) {
			const w = (iter.value.spec as { widget?: unknown }).widget;
			if (w instanceof CodeBlockWidget) {
				widget = w;
				break;
			}
			iter.next();
		}
		expect(widget).not.toBeNull();
		// The parser hands the whole info string to the widget as the "language".
		expect(widget!.language).toBe('python title="main.py"');
		const dom = widget!.toDOM(view);
		view.dom.appendChild(dom);
		const select = dom.querySelector<HTMLSelectElement>('select.cm-lp-codeblock-lang-select')!;
		select.value = 'javascript';
		select.dispatchEvent(new Event('change'));
		expect(view.state.doc.line(1).text).toBe('```javascript title="main.py"');
	});
});

describe('F92: only a primary click toggles a task checkbox', () => {
	function mountTask() {
		const doc = '- [ ] buy milk\n\ntext';
		const view = mountMarkdownView(doc, { cursor: doc.length });
		let markerFrom = -1;
		syntaxTree(view.state).iterate({
			enter(n) {
				if (n.name === 'TaskMarker') markerFrom = n.from;
			},
		});
		expect(markerFrom).toBe(2);
		const input = new TaskCheckboxWidget(false, markerFrom).toDOM(view);
		view.dom.appendChild(input);
		return { view, input, doc };
	}

	it('a right-click (button 2) does not rewrite the note', () => {
		const { view, input, doc } = mountTask();
		input.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 2 }));
		expect(view.state.doc.toString()).toBe(doc);
	});

	it('a middle-click (button 1) does not rewrite the note', () => {
		const { view, input, doc } = mountTask();
		input.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 1 }));
		expect(view.state.doc.toString()).toBe(doc);
	});
});

describe('F121: TSV paste conversion', () => {
	function pasteInto(doc: string, cursor: number, text: string): string {
		const view = new EditorView({
			state: EditorState.create({ doc, selection: { anchor: cursor }, extensions: [testMarkdown(), pasteTsvHandler] }),
			parent: document.body.appendChild(document.createElement('div')),
		});
		const ev = new Event('paste', { bubbles: true, cancelable: true });
		Object.defineProperty(ev, 'clipboardData', {
			value: { getData: (t: string) => (t === 'text/plain' ? text : '') },
		});
		view.contentDOM.dispatchEvent(ev);
		const out = view.state.doc.toString();
		view.destroy();
		return out;
	}

	it('tab-indented Go code pasted inside a ```go fence is inserted verbatim', () => {
		const doc = '```go\n\n```';
		const code = '\tif err != nil {\n\t\treturn err\n\t}';
		const out = pasteInto(doc, 6, code);
		expect(out).toBe('```go\n' + code + '\n```');
	});

	it('tab-indented nested list lines (every row starts with a tab) are not turned into a table', () => {
		expect(clipboardToMarkdownTable('\t- child one\n\t- child two')).toBeNull();
	});
});

describe('F105: a raw % in a file:// image URL must not throw out of toDOM', () => {
	const host = { ...NOOP_HOST, assetUrl: (p: string) => `asset://localhost/${encodeURIComponent(p)}` };

	it('ImageWidget.toDOM does not throw for file:///Users/me/100%.png', () => {
		const view = new EditorView({ state: EditorState.create({ doc: '', extensions: editorHost.of(host) }) });
		expect(() => new ImageWidget('file:///Users/me/100%.png', 'shot').toDOM(view)).not.toThrow();
	});

	it('mounting a note with that image through the real image plugin does not throw', () => {
		const doc = 'intro\n\n![shot](file:///Users/me/100%.png)\n\ntext';
		const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
		let view: EditorView | null = null;
		expect(() => {
			view = new EditorView({
				state: createMarkdownState(doc, { extensions: [testMarkdown(), editorHost.of(host), imagePlugin], cursor: 0 }),
				parent: document.body.appendChild(document.createElement('div')),
			});
		}).not.toThrow();
		// The note text itself must still be rendered.
		expect(view!.contentDOM.textContent).toContain('intro');
		expect(view!.contentDOM.textContent).toContain('text');
		errors.mockRestore();
	});
});

describe('F105 escalation: the throw escapes a tab-switch doc replace', () => {
	const host = { ...NOOP_HOST, assetUrl: (p: string) => `asset://localhost/${encodeURIComponent(p)}` };

	it('switching to a note with the bad image, then to another note, renders each note and never throws', () => {
		const view = new EditorView({
			state: createMarkdownState('first note', { extensions: [testMarkdown(), editorHost.of(host), imagePlugin], cursor: 0 }),
			parent: document.body.appendChild(document.createElement('div')),
		});
		const bad = 'intro\n\n![shot](file:///Users/me/100%.png)\n\ntext';
		// Same shape as the MarkdownEditor.svelte tab-switch dispatch (full doc replace).
		expect(() => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: bad } })).not.toThrow();
		// CodeMirror commits the state before the DOM update, so a throw leaves state and DOM apart.
		expect(view.state.doc.toString()).toBe(bad);
		expect(view.contentDOM.textContent).toContain('intro');
		expect(() => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: 'third note body' } })).not.toThrow();
		expect(view.contentDOM.textContent).toBe('third note body');
	});
});
