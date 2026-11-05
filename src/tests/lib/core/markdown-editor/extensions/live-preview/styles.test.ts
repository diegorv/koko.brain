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

/** The `border-radius` of the rule whose whole selector is the scope class plus `selector`. */
function radiusOf(selector: string): string | undefined {
	return exactRule(selector)?.match(/border-radius: ([^;]+);/)?.[1];
}

describe('livePreviewStyles radius ladder', () => {
	it.each([
		// Blocks
		'.cm-lp-codeblock',
		'.cm-lp-embed',
		'.cm-lp-mermaid',
		'.cm-lp-collection-block',
		'.cm-lp-qjs-block',
		// Controls
		'.cm-lp-codeblock-copy',
		'.cm-lp-meta-bind-select',
		'.cm-lp-meta-bind-btn',
		'.cm-lp-meta-bind-button-error',
		'.cm-lp-meta-bind-input',
		'.cm-lp-qjs-run',
		'.cm-lp-qjs-table-nav-btn',
	])('%s uses --radius-md', (selector) => {
		expect(radiusOf(selector)).toBe('var(--radius-md)');
	});

	it.each([
		'.cm-lp-highlight',
		'.cm-lp-tag',
		'.cm-lp-code',
		'.cm-lp-callout-type-label',
		'.cm-lp-task-checkbox',
		'.cm-lp-image',
		'.cm-lp-audio',
		'.cm-lp-video',
		// Nested inside the --radius-md queryjs block, so a smaller rung.
		'.cm-lp-qjs-error-stack',
	])('%s uses --radius-xs', (selector) => {
		expect(radiusOf(selector)).toBe('var(--radius-xs)');
	});
});

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

/** The `font-size` of the first rule whose last selector is `selector`. */
function fontSizeOf(selector: string): string | undefined {
	const rule = themeRules().find((r) => r.includes(`${selector} {`));
	return rule?.match(/font-size: ([^;]+);/)?.[1];
}

/** The `font-size` of the rule whose whole selector is the scope class plus `selector`. */
function exactFontSizeOf(selector: string): string | undefined {
	const rule = themeRules().find((r) => r.slice(0, r.indexOf('{')).trim().split(' ').slice(1).join(' ') === selector);
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
			.filter((r) => [...r.matchAll(/font-size: ([^;]+);/g)].some(([, v]) => v.includes('px')))
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

	it('renders the error Run again button at the first-run button size', () => {
		// First run: `.cm-lp-qjs-run` straight in the block. Run again: inside the error wrapper.
		const runEm = parseFloat(exactFontSizeOf('.cm-lp-qjs-run')!);
		const errorEm = parseFloat(exactFontSizeOf('.cm-lp-qjs-error')!);
		const retry = exactFontSizeOf('.cm-lp-qjs-error .cm-lp-qjs-run')!.match(/^calc\(([\d.]+)em \/ ([\d.]+)\)$/);
		expect(retry).not.toBeNull();
		expect((errorEm * Number(retry![1])) / Number(retry![2])).toBeCloseTo(runEm);
	});
});

/** The rule whose whole selector is the scope class plus `selector`. */
function exactRule(selector: string): string | undefined {
	return themeRules().find((r) => r.slice(0, r.indexOf('{')).trim().split(' ').slice(1).join(' ') === selector);
}

describe('livePreviewStyles callout type menu', () => {
	it('draws the popover with the menu tokens', () => {
		const rule = exactRule('.cm-lp-callout-type-popover');
		expect(rule).toContain('background: var(--popover);');
		expect(rule).toContain('color: var(--popover-foreground);');
		expect(rule).toContain('border: 1px solid var(--border);');
		expect(rule).toContain('border-radius: var(--radius-md);');
		expect(rule).toContain('box-shadow: var(--shadow-md);');
		expect(rule).not.toContain('rgba(');
		expect(rule).not.toContain('--lp-frontmatter');
	});

	it('rounds options a rung below the popover', () => {
		expect(radiusOf('.cm-lp-callout-type-option')).toBe('var(--radius-sm)');
	});

	it('highlights a hovered option with the accent', () => {
		const rule = exactRule('.cm-lp-callout-type-option:hover');
		expect(rule).toContain('background: var(--accent);');
		expect(rule).toContain('color: var(--accent-foreground);');
	});
});

describe('livePreviewStyles meta-bind colors', () => {
	it('reads no theme token through hsl(), since UI tokens are hex at runtime', () => {
		expect(themeRules().filter((r) => r.includes('hsl(var('))).toEqual([]);
	});

	it('shows a ring on a keyboard-focused button', () => {
		const rule = exactRule('.cm-lp-meta-bind-btn:focus-visible');
		expect(rule).toBeDefined();
		expect(rule!.match(/box-shadow: ([^;]+);/)?.[1]).toContain('var(--ring)');
	});

	it('draws the select chevron in its theme token', () => {
		const image = exactRule('.cm-lp-meta-bind-select')?.match(/background-image: ([^;]+);/)?.[1];
		expect(image).toContain('var(--lp-meta-bind-select-arrow)');
		expect(image).not.toContain('%23');
	});
});
