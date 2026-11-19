import { describe, it, expect } from 'vitest';

import {
	CODE_BLOCK_FONT_SIZE,
	TABLE_FONT_SIZE,
	livePreviewActiveLineTheme,
	livePreviewStyles,
} from '#lib/core/markdown-editor/extensions/live-preview/styles.js';
import { BUILTIN_THEMES } from '#lib/core/settings/theme.logic.js';
import { CALLOUT_TINT } from '#lib/core/settings/theme-builder.logic.js';
import { apcaContrast, contrastRatio, mixColors, tint } from '#lib/utils/color.js';
import { MONO_FONT_STACK } from '#lib/utils/font-stacks.js';
import { HARD_DARK_PALETTE_THEMES, HARD_PALETTE_THEMES } from '../../../../../fixtures/hard-palette-themes.fixture';

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
		'.cm-lp-image-missing',
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
		['.cm-lp-collection-views-hint', '0.9em'],
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

	it('shows the type label in its callout colour, in Title case', () => {
		const rule = exactRule('.cm-lp-callout-type-label');
		expect(rule).toContain('text-transform: capitalize;');
		expect(rule).toContain('color: var(--cm-lp-callout-accent, inherit);');
		expect(rule).not.toContain('text-transform: lowercase;');
	});

	it('draws the type label at full strength, as the builder measures the callout hues', () => {
		expect(exactRule('.cm-lp-callout-type-label')).not.toContain('opacity');
		expect(exactRule('.cm-lp-callout-type-label:hover')).not.toContain('opacity');
	});
});

describe('livePreviewStyles callout tint', () => {
	it('tints callout lines with the note hue at the share the builder measures text on', () => {
		const tint = `color-mix(in srgb, var(--callout-note) ${Math.round(CALLOUT_TINT * 100)}%, transparent)`;
		expect(exactRule('.cm-lp-callout')).toContain(`background: ${tint};`);
		const activeLine = JSON.stringify(livePreviewActiveLineTheme);
		expect(activeLine).toContain(`background-color: ${tint} !important;`);
	});

	it('rests the fold chevron at 3:1 or more on the callout tint of every theme', () => {
		const opacity = Number(exactRule('.cm-lp-callout-fold')?.match(/opacity: ([\d.]+);/)?.[1]);
		expect(opacity).toBeGreaterThan(0);
		for (const { name, colors } of [...BUILTIN_THEMES, ...HARD_PALETTE_THEMES, ...HARD_DARK_PALETTE_THEMES]) {
			const surface = tint(colors.callout.note, CALLOUT_TINT, colors.ui.editorBg)!;
			// The chevron inherits the line's editor text color; opacity composites it over the tint
			const chevron = tint(colors.ui.editorFg, opacity, surface)!;
			expect(contrastRatio(chevron, surface)!, name).toBeGreaterThanOrEqual(3);
		}
	});
});

describe('livePreviewStyles tag pill', () => {
	it('reads the tag text at 4.5:1 and |Lc| 45 on the pill in every theme', () => {
		const rule = exactRule('.cm-lp-tag')!;
		const bgShare = Number(rule.match(/background-color: color-mix\(in oklab, var\(--primary\) (\d+)%, var\(--editor-bg\)\);/)?.[1]) / 100;
		const fgShare = Number(rule.match(/color: color-mix\(in oklab, var\(--primary\) (\d+)%, var\(--editor-fg\)\);/)?.[1]) / 100;
		expect(bgShare).toBeGreaterThan(0);
		expect(fgShare).toBeGreaterThan(0);
		for (const { name, colors } of [...BUILTIN_THEMES, ...HARD_PALETTE_THEMES, ...HARD_DARK_PALETTE_THEMES]) {
			const { primary, editorBg, editorFg } = colors.ui;
			const pill = mixColors(primary, editorBg, 1 - bgShare)!;
			const text = mixColors(primary, editorFg, 1 - fgShare)!;
			expect(contrastRatio(text, pill)!, name).toBeGreaterThanOrEqual(4.5);
			expect(Math.abs(apcaContrast(text, pill)!), name).toBeGreaterThanOrEqual(45);
		}
	});
});

describe('livePreviewStyles callout body', () => {
	it('cancels the quote italics with a zero-specificity rule', () => {
		expect(exactRule(':where(.cm-lp-callout) span')).toContain('font-style: normal;');
		// A plain class rule would outrank the single-class italic error spans.
		expect(exactRule('.cm-lp-callout span')).toBeUndefined();
	});

	it('keeps authored emphasis, and bold inside it, italic', () => {
		const rule = themeRules().find((r) => /\.cm-lp-callout \.cm-lp-italic[ ,{]/.test(r));
		expect(rule).toContain('.cm-lp-callout .cm-lp-italic span');
		expect(rule).toContain('font-style: italic;');
	});
});

describe('livePreviewStyles heading space above', () => {
	it.each([
		['.cm-lp-h1', 'var(--heading-h1-space-above, 0.6em)'],
		['.cm-lp-h2', 'var(--heading-h2-space-above, 0.5em)'],
		['.cm-lp-h3', 'var(--heading-h3-space-above, 0.4em)'],
	])('%s pads its top through a per-level variable', (selector, value) => {
		expect(exactRule(selector)).toContain(`padding-top: ${value};`);
	});

	it.each(['.cm-lp-h4', '.cm-lp-h5', '.cm-lp-h6'])('%s gets no space above', (selector) => {
		expect(exactRule(selector)).toBeDefined();
		expect(exactRule(selector)).not.toContain('padding-top');
	});
});

describe('livePreviewStyles meta-bind number field', () => {
	it('sizes the number input to its content', () => {
		const rule = exactRule('.cm-lp-meta-bind-input[type="number"]');
		expect(rule).toContain('field-sizing: content;');
		expect(rule).toContain('min-width: 4ch;');
		expect(rule).toContain('max-width: 16ch;');
	});

	it('leaves the shared input rule without a width', () => {
		const rule = exactRule('.cm-lp-meta-bind-input');
		expect(rule?.slice(rule.indexOf('{'))).toBe(
			'{appearance: none; background: var(--lp-meta-bind-select-bg); color: var(--lp-meta-bind-select-text); ' +
				'border: 1px solid var(--lp-meta-bind-select-border); border-radius: var(--radius-md); padding: 2px 8px; ' +
				'font-size: 0.85em; line-height: 1.4; outline: none; font-family: inherit;}',
		);
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

describe('livePreviewStyles queryjs tables and buttons', () => {
	it.each(['.cm-lp-qjs-run:focus-visible', '.cm-lp-qjs-table-nav-btn:focus-visible'])(
		'%s shows the same ring as a keyboard-focused meta-bind button',
		(selector) => {
			const ringOf = (s: string) => exactRule(s)?.match(/box-shadow: ([^;]+);/)?.[1];
			expect(ringOf(selector)).toContain('var(--ring)');
			expect(ringOf(selector)).toBe(ringOf('.cm-lp-meta-bind-btn:focus-visible'));
		},
	);

	it('scrolls a wide table sideways inside its scroll div', () => {
		expect(exactRule('.cm-lp-table-scroll')).toContain('overflow-x: auto;');
	});

	it('keeps date and number cells on one line', () => {
		expect(exactRule('.cm-lp-qjs-nowrap')).toContain('white-space: nowrap;');
	});

	it('stops the editor line wrapping from splitting words inside the scroll div', () => {
		const rule = exactRule('.cm-lp-table-scroll');
		expect(rule).toContain('overflow-wrap: normal;');
		expect(rule).toContain('word-break: normal;');
		expect(exactRule('.cm-lp-table-scroll th')).toContain('white-space: nowrap;');
	});
});

describe('livePreviewStyles collection block table', () => {
	it('ends a long text cell in an ellipsis inside a bounded span', () => {
		const rule = exactRule('.cm-lp-collection-text');
		expect(rule).toContain('display: block;');
		expect(rule).toContain('max-width: 20em;');
		expect(rule).toContain('overflow: hidden;');
		expect(rule).toContain('text-overflow: ellipsis;');
		expect(rule).toContain('white-space: nowrap;');
	});

	it('mutes the other-views hint', () => {
		const rule = exactRule('.cm-lp-collection-views-hint');
		expect(rule).toContain('color: var(--lp-collection-null);');
		expect(rule).toContain('font-weight: 400;');
	});

	it('adds no rule keyed on .cm-lp-collection-table, which the month grid and linear calendar share', () => {
		const selectors = themeRules()
			.map((r) => r.slice(0, r.indexOf('{')).trim())
			.filter((s) => s.includes('.cm-lp-collection-table'))
			// Drop the theme's scope class from each comma part.
			.map((s) => s.split(/,\s*/).map((part) => part.replace(/^\S+ /, '')).join(', '));
		expect(selectors).toEqual([
			'.cm-lp-collection-table',
			'.cm-lp-collection-table th, .cm-lp-collection-table td',
			'.cm-lp-collection-table th',
			'.cm-lp-collection-table tr',
			'.cm-lp-collection-table tr:hover',
			'.cm-lp-collection-table tr:nth-child(even)',
		]);
	});
});
