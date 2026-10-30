// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { wikilinkDecoration } from '#lib/core/markdown-editor/extensions/wikilink/decoration.js';

let view: EditorView | null = null;

function mount(doc: string): EditorView {
	view = new EditorView({
		state: EditorState.create({ doc, extensions: [wikilinkDecoration()] }),
		parent: document.body.appendChild(document.createElement('div')),
	});
	return view;
}

/** Text of every element carrying `cls`, in document order. */
function marked(v: EditorView, cls: string): string[] {
	return Array.from(v.contentDOM.querySelectorAll(`.${cls}`)).map((el) => el.textContent ?? '');
}

afterEach(() => {
	view?.destroy();
	view = null;
	document.body.innerHTML = '';
});

describe('wikilinkDecoration', () => {
	it('marks brackets, target, heading, block id and display text', () => {
		const v = mount('[[Note#Part|shown]] and [[Other#^abc]]');
		expect(marked(v, 'cm-wikilink-bracket')).toEqual(['[[', ']]', '[[', ']]']);
		expect(marked(v, 'cm-wikilink-target')).toEqual(['Note', 'Other']);
		expect(marked(v, 'cm-wikilink-heading')).toEqual(['#Part']);
		expect(marked(v, 'cm-wikilink-display')).toEqual(['|shown']);
		expect(marked(v, 'cm-wikilink-block-id')).toEqual(['#^abc']);
	});

	it('decorates a same-note heading link, which has no target text', () => {
		const v = mount('see [[#Intro]] here');
		expect(marked(v, 'cm-wikilink-bracket')).toEqual(['[[', ']]']);
		expect(marked(v, 'cm-wikilink-heading')).toEqual(['#Intro']);
		expect(marked(v, 'cm-wikilink-target')).toEqual([]);
	});

	it('marks nothing in text without wikilinks', () => {
		const v = mount('plain [text] here');
		expect(marked(v, 'cm-wikilink-bracket')).toEqual([]);
	});
});
