import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { DEFAULT_SETTINGS } from '#lib/core/settings/settings.store.svelte.js';
import { headingTypographyToCssVars } from '#lib/core/settings/heading-typography.logic.js';

/**
 * Source assertions on the canvas markdown stylesheet (jsdom applies no CSS):
 * canvas nodes draw markdown with the editor's heading scale and text sizes.
 */

const CSS = readFileSync(join(process.cwd(), 'src/lib/features/canvas/canvas-markdown.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** Declarations of the rule whose selector list is exactly `selector`, as property -> value. */
function rule(selector: string): Record<string, string> {
	const found = [...CSS.matchAll(/([^{}]+)\{([^}]*)\}/g)].find((m) => m[1].trim() === selector);
	if (!found) throw new Error(`no rule for ${selector}`);
	return Object.fromEntries(
		found[2].split(';').map((d) => d.split(':')).filter((p) => p.length === 2).map(([k, v]) => [k.trim(), v.trim()]),
	);
}

const DEFAULT_VARS = headingTypographyToCssVars(DEFAULT_SETTINGS.editor.headingTypography);

describe('canvas markdown headings', () => {
	for (const level of [1, 2, 3, 4, 5, 6]) {
		it(`h${level} reads the shared heading variables, with the default scale as fallback`, () => {
			const decls = rule(`.canvas-node-content h${level}`);
			for (const prop of ['font-size', 'font-weight', 'line-height', 'letter-spacing']) {
				const name = `--heading-h${level}-${prop}`;
				expect(decls[prop], prop).toBe(`var(${name}, ${DEFAULT_VARS[name]})`);
			}
			expect(decls.color).toBe(`var(--syntax-heading${level})`);
		});
	}

	it('sets no heading size or weight of its own', () => {
		const shared = rule([1, 2, 3, 4, 5, 6].map((l) => `.canvas-node-content h${l}`).join(',\n'));
		expect(shared).not.toHaveProperty('font-weight');
		expect(shared).not.toHaveProperty('font-size');
		expect(shared).not.toHaveProperty('line-height');
	});
});

describe('canvas markdown text sizes', () => {
	it('draws inline code at the body size, like the editor', () => {
		expect(rule('.canvas-node-content code')).not.toHaveProperty('font-size');
	});

	it('draws table text at 0.9em of the body, like the editor table, with no fixed cell size', () => {
		expect(rule('.canvas-node-content table')['font-size']).toBe('0.9em');
		expect(rule('.canvas-node-content th,\n.canvas-node-content td')).not.toHaveProperty('font-size');
	});
});
