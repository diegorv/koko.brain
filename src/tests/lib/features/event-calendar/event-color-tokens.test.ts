import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const CSS = readFileSync(resolve(__dirname, '../../../../app.css'), 'utf8');

const HUES: Record<string, string> = {
	green: '#10b981',
	purple: '#8b5cf6',
	cyan: '#06b6d4',
	orange: '#f97316',
	pink: '#ec4899',
	blue: '#3b82f6',
};

/** One top-level rule of the stylesheet. */
interface Block {
	/** Selector or at-rule prelude, trimmed. */
	selector: string;
	/** Text between the braces. */
	body: string;
	/** Offset of the opening brace. */
	start: number;
}

/** Splits CSS into its top-level `selector { body }` blocks (comments removed). */
function topLevelBlocks(css: string): Block[] {
	const text = css.replace(/\/\*[\s\S]*?\*\//g, (c) => ' '.repeat(c.length));
	const blocks: Block[] = [];
	let depth = 0;
	let preludeStart = 0;
	let open = -1;
	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (ch === ';' && depth === 0) preludeStart = i + 1;
		if (ch === '{') {
			if (depth === 0) open = i;
			depth++;
		} else if (ch === '}') {
			depth--;
			if (depth === 0) {
				blocks.push({ selector: text.slice(preludeStart, open).trim(), body: text.slice(open + 1, i), start: open });
				preludeStart = i + 1;
			}
		}
	}
	return blocks;
}

const blocks = topLevelBlocks(CSS);

/** Every declaration of `name` across the file, with its block. */
function declarations(name: string): { block: Block; value: string }[] {
	const re = new RegExp(`(?:^|[;{\\s])${name}\\s*:\\s*([^;]+);`, 'g');
	return blocks.flatMap((block) => [...block.body.matchAll(re)].map((m) => ({ block, value: m[1].trim() })));
}

describe('event color tokens in app.css', () => {
	const dark = blocks.find((b) => b.selector === '.dark');

	it('finds the .dark block the tokens must follow', () => {
		expect(dark).toBeDefined();
	});

	for (const [hue, hex] of Object.entries(HUES)) {
		it(`declares --event-${hue}-bg once, as a mix of ${hex} with var(--editor-bg)`, () => {
			const found = declarations(`--event-${hue}-bg`);
			expect(found).toHaveLength(1);
			expect(found[0].value).toMatch(new RegExp(`^color-mix\\(in oklab, ${hex} \\d+%, var\\(--editor-bg\\)\\)$`));
		});

		it(`declares --event-${hue}-fg once, as a mix of ${hex} with var(--editor-fg)`, () => {
			const found = declarations(`--event-${hue}-fg`);
			expect(found).toHaveLength(1);
			expect(found[0].value).toMatch(new RegExp(`^color-mix\\(in oklab, ${hex} \\d+%, var\\(--editor-fg\\)\\)$`));
		});
	}

	it('declares all 12 tokens in one :root block after .dark, and none inside .dark', () => {
		const names = Object.keys(HUES).flatMap((h) => [`--event-${h}-bg`, `--event-${h}-fg`]);
		const homes = new Set(names.map((n) => declarations(n)[0]?.block));
		expect(homes.size).toBe(1);
		const [home] = homes;
		expect(home?.selector).toBe(':root');
		expect(home!.start).toBeGreaterThan(dark!.start);
		expect(dark!.body).not.toContain('--event-');
	});

	it('the block parser returns nothing for an empty stylesheet', () => {
		expect(topLevelBlocks('')).toEqual([]);
	});
});
