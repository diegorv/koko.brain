import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { buildEditorTheme } from '#lib/core/markdown-editor/setup/editor-theme.js';
import { APP_SANS_FONT_STACK } from '#lib/utils/font-stacks.js';

/** The CSS rule the theme emits for `selector`, read from its style rules. */
function themeRule(selector: string, fontFamily = 'Menlo', fontSize = 16): string | undefined {
	const strings: string[] = [];
	JSON.stringify(buildEditorTheme(fontFamily, fontSize, 1.6, 0, 0, true), (_key, value) => {
		if (typeof value === 'string') strings.push(value);
		return value;
	});
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return strings.find((s) => new RegExp(`${escaped} \\{`).test(s));
}

/** The `font-family` the theme emits on `.cm-scroller`. */
function scrollerFontFamily(fontFamily: string): string | undefined {
	return themeRule('.cm-scroller', fontFamily)?.match(/font-family: ([^;]+);/)?.[1];
}

describe('buildEditorTheme', () => {
	it('returns a valid Extension', () => {
		const theme = buildEditorTheme('Menlo, monospace', 16, 1.6, 0, 0, true);
		expect(theme).toBeDefined();
	});

	it('returns a new instance on each call with same params', () => {
		const a = buildEditorTheme('Menlo', 16, 1.6, 0, 0, true);
		const b = buildEditorTheme('Menlo', 16, 1.6, 0, 0, true);
		expect(a).not.toBe(b);
	});

	it('returns different instances for different font families', () => {
		const a = buildEditorTheme('Menlo', 16, 1.6, 0, 0, true);
		const b = buildEditorTheme('Monaco', 16, 1.6, 0, 0, true);
		expect(a).not.toBe(b);
	});

	it('returns different instances for different font sizes', () => {
		const a = buildEditorTheme('Menlo', 14, 1.6, 0, 0, true);
		const b = buildEditorTheme('Menlo', 18, 1.6, 0, 0, true);
		expect(a).not.toBe(b);
	});

	it('returns different instances for different line heights', () => {
		const a = buildEditorTheme('Menlo', 16, 1.4, 0, 0, true);
		const b = buildEditorTheme('Menlo', 16, 2.0, 0, 0, true);
		expect(a).not.toBe(b);
	});

	it('handles empty font family', () => {
		const theme = buildEditorTheme('', 16, 1.6, 0, 0, true);
		expect(theme).toBeDefined();
	});

	it('handles zero font size', () => {
		const theme = buildEditorTheme('Menlo', 0, 1.6, 0, 0, true);
		expect(theme).toBeDefined();
	});

	it('returns different instances for different paragraph spacing', () => {
		const a = buildEditorTheme('Menlo', 16, 1.6, 0, 0, true);
		const b = buildEditorTheme('Menlo', 16, 1.6, 0, 0.5, true);
		expect(a).not.toBe(b);
	});

	it('uses paddingBottom (not marginBottom) for paragraph spacing to preserve click targets', () => {
		const theme = buildEditorTheme('Menlo', 16, 1.6, 0, 0.5, true);
		const themeStr = JSON.stringify(theme);
		expect(themeStr).toContain('padding-bottom');
		expect(themeStr).not.toContain('margin-bottom');
	});

	describe('dark flag', () => {
		/** The `EditorView.darkTheme` facet of a state holding only the theme. */
		function darkFacet(dark: boolean): boolean {
			return EditorState.create({ extensions: buildEditorTheme('Menlo', 16, 1.6, 0, 0, dark) }).facet(
				EditorView.darkTheme,
			);
		}

		it('marks the theme light when dark is false', () => {
			expect(darkFacet(false)).toBe(false);
		});

		it('marks the theme dark when dark is true', () => {
			expect(darkFacet(true)).toBe(true);
		});
	});

	describe('font size', () => {
		it('renders the body at the font size setting, with no multiplier on the content', () => {
			expect(themeRule('.cm-scroller', 'Menlo', 19)).toMatch(/font-size: 19px;/);
			const content = themeRule('.cm-content', 'Menlo', 19);
			expect(content).toBeDefined();
			expect(content).not.toMatch(/font-size/);
		});
	});

	describe('tooltip chrome', () => {
		it('rounds and lifts every tooltip like an app menu', () => {
			const rule = themeRule('.cm-tooltip');
			expect(rule).toContain('border-radius: var(--radius-md)');
			expect(rule).toContain('box-shadow: var(--shadow-md)');
			// overflow: hidden would clip CodeMirror's tooltip arrows.
			expect(rule).not.toMatch(/overflow/);
		});

		it('rounds autocomplete rows inside the padded list', () => {
			expect(themeRule('.cm-tooltip-autocomplete > ul > li')).toContain('border-radius: var(--radius-sm)');
		});

		it('pads the autocomplete list at the base theme selector, so it beats its padding: 0', () => {
			expect(themeRule('.cm-tooltip.cm-tooltip-autocomplete > ul')).toContain('padding: 4px');
		});

		it('keeps the accent on the highlighted autocomplete row', () => {
			const rule = themeRule('.cm-tooltip-autocomplete > ul > li[aria-selected]');
			expect(rule).toContain('background-color: var(--accent)');
			expect(rule).toContain('color: var(--accent-foreground)');
		});
	});

	describe('font-family', () => {
		it('quotes a plain name and appends the app sans stack', () => {
			expect(scrollerFontFamily('iA Writer Duo S')).toBe(`"iA Writer Duo S", ${APP_SANS_FONT_STACK}`);
		});

		it('quotes a name that is invalid unquoted', () => {
			expect(scrollerFontFamily('Font Awesome 6 Free')).toBe(`"Font Awesome 6 Free", ${APP_SANS_FONT_STACK}`);
		});

		it('keeps a typed list as written and appends the app sans stack', () => {
			expect(scrollerFontFamily('Menlo, monospace')).toBe(`Menlo, monospace, ${APP_SANS_FONT_STACK}`);
		});

		it('emits only the app sans stack for an empty value', () => {
			expect(scrollerFontFamily('')).toBe(APP_SANS_FONT_STACK);
		});
	});
});
