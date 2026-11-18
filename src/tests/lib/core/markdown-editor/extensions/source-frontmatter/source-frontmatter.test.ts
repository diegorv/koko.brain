// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { EditorView, type ViewUpdate } from '@codemirror/view';

import {
	sourceFrontmatter,
	sourceFrontmatterPlugin,
	sourceFrontmatterStyles,
} from '#lib/core/markdown-editor/extensions/source-frontmatter/source-frontmatter.js';
import { mountMarkdownView, testMarkdown, withFullParse } from '../../test-helpers';

let view: EditorView | null = null;

function mount(doc: string): EditorView {
	view = mountMarkdownView(doc, { extensions: [testMarkdown(), sourceFrontmatter()] });
	return view;
}

afterEach(() => {
	const root = view?.dom.parentElement;
	view?.destroy();
	root?.remove();
	view = null;
});

/** Whether each rendered line, in order, carries the source frontmatter class. */
function marked(v: EditorView): boolean[] {
	return [...v.contentDOM.querySelectorAll('.cm-line')].map((line) => line.classList.contains('cm-source-frontmatter'));
}

/** Every rule string of the source frontmatter base theme. */
function themeRules(): string[] {
	const rules: string[] = [];
	JSON.stringify(sourceFrontmatterStyles, (_key, value) => {
		if (typeof value === 'string' && value.includes('{')) rules.push(value);
		return value;
	});
	return rules;
}

describe('sourceFrontmatter decoration', () => {
	it('marks the block from the opening to the closing fence', () => {
		expect(marked(mount('---\n_type: Meeting\ntags: [a]\n---\nBody'))).toEqual([true, true, true, true, false]);
	});

	it('marks nothing in an empty doc', () => {
		expect(marked(mount(''))).toEqual([false]);
	});

	it('marks nothing when line 1 is not a fence', () => {
		expect(marked(mount('Intro\n---\n_type: Meeting\n---'))).toEqual([false, false, false, false]);
	});

	it('marks nothing when the fence is never closed', () => {
		expect(marked(mount('---\n_type: Meeting\nBody'))).toEqual([false, false, false]);
	});

	it('does not mark a body `---` after the block', () => {
		expect(marked(mount('---\na: 1\n---\nBody\n---\nMore'))).toEqual([true, true, true, false, false, false]);
	});

	it('adds the class when the closing fence is typed and removes it when deleted', () => {
		const v = mount('---\n_type: Meeting\nBody');
		expect(marked(v)).toEqual([false, false, false]);

		const at = v.state.doc.line(2).to;
		withFullParse(() => v.dispatch({ changes: { from: at, insert: '\n---' } }));
		expect(marked(v)).toEqual([true, true, true, false]);

		withFullParse(() => v.dispatch({ changes: { from: at, to: at + 4 } }));
		expect(marked(v)).toEqual([false, false, false]);
	});
});

describe('sourceFrontmatter rebuilds', () => {
	it('keeps the same decoration set across a selection-only update', () => {
		const v = mount('---\na: 1\n---\nBody text');
		const before = v.plugin(sourceFrontmatterPlugin)!.decorations;

		v.dispatch({ selection: { anchor: v.state.doc.length } });

		expect(v.plugin(sourceFrontmatterPlugin)!.decorations).toBe(before);
	});

	it('keeps the same decoration set across a viewport-only update', () => {
		const v = mount('---\na: 1\n---\nBody text');
		const plugin = v.plugin(sourceFrontmatterPlugin)!;
		const before = plugin.decorations;

		plugin.update({ view: v, state: v.state, docChanged: false, viewportChanged: true } as ViewUpdate);

		expect(plugin.decorations).toBe(before);
	});

	it('rebuilds on a doc change', () => {
		const v = mount('---\na: 1\n---\nBody text');
		const before = v.plugin(sourceFrontmatterPlugin)!.decorations;

		withFullParse(() => v.dispatch({ changes: { from: v.state.doc.length, insert: '!' } }));

		expect(v.plugin(sourceFrontmatterPlugin)!.decorations).not.toBe(before);
	});
});

describe('sourceFrontmatterStyles', () => {
	it('sets the lines and their spans to body size, normal weight and the meta colour', () => {
		const rule = themeRules().find((r) => r.includes('.cm-source-frontmatter span'));
		expect(rule).toBeDefined();
		expect(rule).toMatch(/\.cm-source-frontmatter, [^{]*\.cm-source-frontmatter span \{/);
		expect(rule).toContain('font-weight: normal;');
		expect(rule).toContain('color: var(--syntax-meta);');
		expect(rule).toContain('font-size: inherit;');
	});
});
