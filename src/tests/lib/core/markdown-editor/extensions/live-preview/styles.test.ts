import { describe, it, expect } from 'vitest';

import {
	CODE_BLOCK_FONT_SIZE,
	TABLE_FONT_SIZE,
	livePreviewStyles,
} from '#lib/core/markdown-editor/extensions/live-preview/styles.js';
import { MONO_FONT_STACK } from '#lib/utils/font-stacks.js';

/** Every CSS rule string the live-preview base theme emits. */
function themeRules(): string[] {
	const rules: string[] = [];
	JSON.stringify(livePreviewStyles, (_key, value) => {
		if (typeof value === 'string' && value.includes('{')) rules.push(value);
		return value;
	});
	return rules;
}

/** The `font-family` of the rule whose last selector is `selector`. */
function fontFamilyOf(selector: string): string | undefined {
	const rule = themeRules().find((r) => r.includes(`${selector} {`));
	return rule?.match(/font-family: ([^;]+);/)?.[1];
}

describe('livePreviewStyles font stacks', () => {
	it.each([
		'.cm-lp-code',
		'.cm-lp-codeblock-lang',
		'.cm-lp-codeblock-pre',
		'.cm-lp-mermaid-lang',
		'.cm-lp-math-error',
		'.cm-lp-qjs-error-stack',
	])('%s uses the shared monospace stack', (selector) => {
		expect(fontFamilyOf(selector)).toBe(MONO_FONT_STACK);
	});

	it('no rule names MonoLisa outside the shared stack', () => {
		const families = themeRules()
			.flatMap((r) => [...r.matchAll(/font-family: ([^;]+);/g)].map((m) => m[1]))
			.filter((f) => f.includes('MonoLisa'));
		expect(families.length).toBeGreaterThan(0);
		for (const family of families) expect(family).toBe(MONO_FONT_STACK);
	});
});

/** The `font-size` of the rule whose last selector is `selector`. */
function fontSizeOf(selector: string): string | undefined {
	const rule = themeRules().find((r) => r.includes(`${selector} {`));
	return rule?.match(/font-size: ([^;]+);/)?.[1];
}

describe('livePreviewStyles reveal sizes', () => {
	it('renders code at the same size in the widget and on the revealed lines', () => {
		expect(CODE_BLOCK_FONT_SIZE).toBe('0.85em');
		expect(fontSizeOf('.cm-lp-codeblock-pre')).toBe(CODE_BLOCK_FONT_SIZE);
		expect(fontSizeOf('.cm-lp-codeblock-line')).toBe(CODE_BLOCK_FONT_SIZE);
	});

	it('renders a table at the same size in the widget and on the revealed lines', () => {
		expect(TABLE_FONT_SIZE).toBe('0.9em');
		expect(fontSizeOf('.cm-lp-table')).toBe(TABLE_FONT_SIZE);
		expect(fontSizeOf('.cm-lp-table-line')).toBe(TABLE_FONT_SIZE);
	});
});

describe('livePreviewStyles scale with the editor font', () => {
	/** Glyph-only table controls sized to their fixed px box, not text. */
	const FIXED_CONTROLS = ['.cm-lp-table-add', '.cm-lp-table-add-row'];

	it('sizes no text in px outside the fixed controls', () => {
		const pxRules = themeRules()
			.filter((r) => /font-size: [\d.]+px/.test(r))
			.map((r) => r.slice(0, r.indexOf('{')).trim());
		expect(pxRules.length).toBe(FIXED_CONTROLS.length);
		for (const selector of pxRules) {
			expect(FIXED_CONTROLS.some((c) => selector.endsWith(c))).toBe(true);
		}
	});

	it.each([
		['.cm-lp-codeblock-lang', '0.7em'],
		['.cm-lp-codeblock-copy', '0.7em'],
		['.cm-lp-mermaid-lang', '0.7em'],
		['.cm-lp-embed', '0.85em'],
		['.cm-lp-embed-header', '0.9em'],
		['.cm-lp-embed-content', '1em'],
		['.cm-lp-collection-block', '0.85em'],
		['.cm-lp-collection-header', '0.9em'],
		['.cm-lp-collection-table', '0.9em'],
		['.cm-lp-collection-error', '0.9em'],
		['.cm-lp-collection-loading', '0.9em'],
		['.cm-lp-collection-empty', '0.9em'],
		['.cm-lp-collection-footer', '0.85em'],
		['.cm-lp-meta-bind-select', '0.85em'],
		['.cm-lp-meta-bind-btn', '0.85em'],
		['.cm-lp-meta-bind-input', '0.85em'],
		['.cm-lp-meta-bind-button-error', '0.75em'],
		['.cm-lp-meta-bind-input-error', '0.75em'],
		['.cm-lp-mermaid-error', '0.75em'],
		['.cm-lp-math-error', '0.75em'],
		['.cm-lp-callout-type-option', '0.75em'],
		['.cm-lp-qjs-block', '0.85em'],
		['.cm-lp-qjs-error', '0.95em'],
		['.cm-lp-qjs-error-details', '0.8em'],
		['.cm-lp-qjs-error-stack', '0.9em'],
		['.cm-lp-qjs-run', '0.8em'],
		['.cm-lp-qjs-loading', '0.95em'],
		['.cm-lp-qjs-table', '0.95em'],
		['.cm-lp-qjs-table-nav', '0.8em'],
		['.cm-lp-qjs-table-nav-btn', '0.9em'],
		['.cm-lp-qjs-table-nav-indicator', '0.9em'],
	])('%s is %s', (selector, size) => {
		expect(fontSizeOf(selector)).toBe(size);
	});
});
