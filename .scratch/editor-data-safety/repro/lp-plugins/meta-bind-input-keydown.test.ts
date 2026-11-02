// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { keymap } from '@codemirror/view';
import { defaultKeymap, historyKeymap, history } from '@codemirror/commands';
import { metaBindInputPlugin } from '#lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.js';
import { mountMarkdownView, testMarkdown } from '../../lib/core/markdown-editor/test-helpers';

/**
 * LP1: the number/date/toggle/select meta-bind widgets answer `ignoreEvent() -> false`,
 * so keydown events from their <input> bubble into CodeMirror's keymap. Keys the
 * input relies on (Backspace, Delete, arrows, Mod-z) then run editor commands
 * against the editor selection, which sits elsewhere in the note.
 */
const DOC = '---\ncount: 5\n---\nhello world\n\n`INPUT[number():count]`\n';

function mount() {
	const cursor = DOC.indexOf('hello world') + 'hello world'.length;
	const view = mountMarkdownView(DOC, {
		cursor,
		extensions: [testMarkdown(), metaBindInputPlugin, history(), keymap.of([...defaultKeymap, ...historyKeymap])],
	});
	const input = view.contentDOM.querySelector<HTMLInputElement>('input.cm-lp-meta-bind-input');
	return { view, input };
}

function press(el: HTMLElement, key: string, extra: KeyboardEventInit = {}) {
	const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...extra });
	el.dispatchEvent(ev);
	return ev;
}

afterEach(() => {
	document.body.innerHTML = '';
});

describe('LP1: keys pressed inside a meta-bind number input reach the editor keymap', () => {
	it('renders the input widget in the mounted view', () => {
		const { input, view } = mount();
		expect(input).not.toBeNull();
		view.destroy();
	});

	it('Backspace in the input does not delete note text', () => {
		const { view, input } = mount();
		input!.focus();
		const ev = press(input!, 'Backspace');
		const doc = view.state.doc.toString();
		view.destroy();
		expect(doc).toContain('hello world');
		expect(ev.defaultPrevented, 'the input keeps its own Backspace').toBe(false);
	});

	it('Delete with a selection elsewhere does not delete that selection', () => {
		const { view, input } = mount();
		const from = DOC.indexOf('hello');
		view.dispatch({ selection: { anchor: from, head: from + 'hello world'.length } });
		input!.focus();
		press(input!, 'Delete');
		const doc = view.state.doc.toString();
		view.destroy();
		expect(doc).toContain('hello world');
	});
});
