import { describe, it, expect } from 'vitest';

import { buildEditorTheme } from '#lib/core/markdown-editor/setup/editor-theme.js';
import { APP_SANS_FONT_STACK } from '#lib/utils/font-stacks.js';

/** The `font-family` the theme emits on `.cm-scroller`, read from its style rules. */
function scrollerFontFamily(fontFamily: string): string | undefined {
	const strings: string[] = [];
	JSON.stringify(buildEditorTheme(fontFamily, 16, 1.6, 0, 0), (_key, value) => {
		if (typeof value === 'string') strings.push(value);
		return value;
	});
	const rule = strings.find((s) => s.includes('.cm-scroller {'));
	return rule?.match(/font-family: ([^;]+);/)?.[1];
}

describe('buildEditorTheme', () => {
	it('returns a valid Extension', () => {
		const theme = buildEditorTheme('Menlo, monospace', 16, 1.6, 0, 0);
		expect(theme).toBeDefined();
	});

	it('returns a new instance on each call with same params', () => {
		const a = buildEditorTheme('Menlo', 16, 1.6, 0, 0);
		const b = buildEditorTheme('Menlo', 16, 1.6, 0, 0);
		expect(a).not.toBe(b);
	});

	it('returns different instances for different font families', () => {
		const a = buildEditorTheme('Menlo', 16, 1.6, 0, 0);
		const b = buildEditorTheme('Monaco', 16, 1.6, 0, 0);
		expect(a).not.toBe(b);
	});

	it('returns different instances for different font sizes', () => {
		const a = buildEditorTheme('Menlo', 14, 1.6, 0, 0);
		const b = buildEditorTheme('Menlo', 18, 1.6, 0, 0);
		expect(a).not.toBe(b);
	});

	it('returns different instances for different line heights', () => {
		const a = buildEditorTheme('Menlo', 16, 1.4, 0, 0);
		const b = buildEditorTheme('Menlo', 16, 2.0, 0, 0);
		expect(a).not.toBe(b);
	});

	it('handles empty font family', () => {
		const theme = buildEditorTheme('', 16, 1.6, 0, 0);
		expect(theme).toBeDefined();
	});

	it('handles zero font size', () => {
		const theme = buildEditorTheme('Menlo', 0, 1.6, 0, 0);
		expect(theme).toBeDefined();
	});

	it('returns different instances for different paragraph spacing', () => {
		const a = buildEditorTheme('Menlo', 16, 1.6, 0, 0);
		const b = buildEditorTheme('Menlo', 16, 1.6, 0, 0.5);
		expect(a).not.toBe(b);
	});

	it('uses paddingBottom (not marginBottom) for paragraph spacing to preserve click targets', () => {
		const theme = buildEditorTheme('Menlo', 16, 1.6, 0, 0.5);
		const themeStr = JSON.stringify(theme);
		expect(themeStr).toContain('padding-bottom');
		expect(themeStr).not.toContain('margin-bottom');
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
