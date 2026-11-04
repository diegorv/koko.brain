import { describe, it, expect } from 'vitest';

import { livePreviewStyles } from '#lib/core/markdown-editor/extensions/live-preview/styles.js';
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
