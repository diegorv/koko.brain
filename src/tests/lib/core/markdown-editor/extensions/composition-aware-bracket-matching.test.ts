// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { compositionAwareBracketMatching } from '#lib/core/markdown-editor/extensions/composition-aware-bracket-matching.js';
import { BUILTIN_THEMES } from '#lib/core/settings/theme.logic.js';
import { contrastRatio, tint } from '#lib/utils/color.js';
import { HARD_PALETTE_THEMES } from '../../../../fixtures/hard-palette-themes.fixture';

let view: EditorView | null = null;

function mount(doc: string, selection: EditorSelection): EditorView {
	view = new EditorView({
		state: EditorState.create({
			doc,
			selection,
			extensions: [EditorState.allowMultipleSelections.of(true), compositionAwareBracketMatching()],
		}),
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

describe('compositionAwareBracketMatching', () => {
	it('marks both brackets when the cursor sits after the closing one', () => {
		const v = mount('a(b)c', EditorSelection.single(4));
		expect(marked(v, 'cm-matchingBracket')).toEqual(['(', ')']);
	});

	it('marks the brackets of every cursor, in document order', () => {
		const v = mount('(a) [b]', EditorSelection.create([EditorSelection.cursor(7), EditorSelection.cursor(0)]));
		expect(marked(v, 'cm-matchingBracket')).toEqual(['(', ')', '[', ']']);
	});

	it('marks an unmatched bracket as non-matching', () => {
		const v = mount('a)b', EditorSelection.single(2));
		expect(marked(v, 'cm-nonmatchingBracket')).toEqual([')']);
		expect(marked(v, 'cm-matchingBracket')).toEqual([]);
	});

	it('marks nothing away from brackets', () => {
		const v = mount('(a) text', EditorSelection.single(6));
		expect(marked(v, 'cm-matchingBracket')).toEqual([]);
	});
});

describe('matching bracket highlight color', () => {
	/** The CSS CodeMirror mounted for the editor's themes. */
	function editorCss(): string {
		const sheets = [...(document.adoptedStyleSheets ?? []), ...[...document.querySelectorAll('style')].map((el) => el.sheet!)];
		return sheets.flatMap((sheet) => [...(sheet?.cssRules ?? [])].map((r) => r.cssText)).join('\n');
	}

	it('falls back to a share of the editor text color, not a fixed pale blue', () => {
		mount('(a)', EditorSelection.single(0));
		const css = editorCss();
		expect(css).toContain('--bracket-match-bg');
		expect(css).toContain('color-mix(in oklch, var(--editor-fg) 25%, transparent)');
		expect(css).not.toMatch(/#bad0f8/i);
	});

	it('shows against the editor background and keeps the editor text readable on it, on every theme', () => {
		for (const { name, colors } of [...BUILTIN_THEMES, ...HARD_PALETTE_THEMES]) {
			const { editorBg, editorFg } = colors.ui;
			const fill = tint(editorFg, 0.25, editorBg)!;
			expect(contrastRatio(fill, editorBg)!, name).toBeGreaterThanOrEqual(1.4);
			expect(contrastRatio(editorFg, fill)!, name).toBeGreaterThanOrEqual(4.5);
		}
	});
});
