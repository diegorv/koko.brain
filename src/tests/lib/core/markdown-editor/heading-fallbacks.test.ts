import { describe, it, expect } from 'vitest';

import { livePreviewStyles } from '#lib/core/markdown-editor/extensions/live-preview/styles.js';
import { markdownHighlight, sourceHeadingSize } from '#lib/core/markdown-editor/highlight-styles.js';
import { DEFAULT_SETTINGS } from '#lib/core/settings/settings.store.svelte.js';
import { headingTypographyToCssVars } from '#lib/core/settings/heading-typography.logic.js';

/**
 * The editor's heading rules read the `--heading-hN-*` variables set from the
 * settings; their `var()` fallbacks apply before the settings load and must
 * draw the default scale, not an older one.
 */

/** Every CSS rule string the live-preview base theme emits. */
function livePreviewRules(): string {
	const rules: string[] = [];
	JSON.stringify(livePreviewStyles, (_key, value) => {
		if (typeof value === 'string' && value.includes('{')) rules.push(value);
		return value;
	});
	return rules.join('\n');
}

const SOURCES: Record<string, string> = {
	'live preview': livePreviewRules(),
	'source mode size': sourceHeadingSize.module!.getRules(),
	'heading highlight': markdownHighlight.module!.getRules(),
};

const DEFAULT_VARS = headingTypographyToCssVars(DEFAULT_SETTINGS.editor.headingTypography);
const WEIGHT_KEYWORDS: Record<string, string> = { bold: '700', normal: '400' };

describe('editor heading variable fallbacks', () => {
	for (const level of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']) {
		for (const prop of ['font-size', 'font-weight']) {
			const name = `--heading-${level}-${prop}`;
			it(`${name} falls back to the default`, () => {
				const fallbacks = Object.values(SOURCES).flatMap((css) =>
					[...css.matchAll(new RegExp(`var\\(${name}, ([^)]+)\\)`, 'g'))].map((m) => m[1].trim()),
				);
				expect(fallbacks.length).toBeGreaterThan(0);
				for (const value of fallbacks) expect(WEIGHT_KEYWORDS[value] ?? value).toBe(DEFAULT_VARS[name]);
			});
		}
	}
});
