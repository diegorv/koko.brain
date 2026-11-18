import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { topLevelBlocks } from '../fixtures/css-blocks.fixture.js';

/**
 * Source scan of the shared focus styles: the Button recipe, the dialog close
 * button and the base outline draw keyboard focus with the theme ring at full
 * opacity, and only on `:focus-visible`. The `ring` token already clears
 * 4.5:1 on the editor; `/50` and `/20` mixes fall to 1.2-2.6:1 on borderless
 * targets. Feature-site rings, inputs and `aria-invalid` rings are out of
 * scope.
 */

const ROOT = process.cwd();
const FILES = ['src/lib/components/ui/button/button.svelte', 'src/lib/components/ui/dialog/dialog-content.svelte', 'src/app.css'];

/** A faded theme or destructive ring on a `focus-visible:` variant */
const FAINT_RING = /\bfocus-visible:ring-(?:ring|destructive)\/\d+/g;

/** A ring width or colour on plain `:focus`, which also rings on mouse focus and on dialog open */
const FOCUS_RING = /\bfocus:ring(?!-offset)/g;

/** A faded outline colour */
const FAINT_OUTLINE = /\boutline-ring\/\d+/g;

function read(path: string): string {
	return readFileSync(join(ROOT, path), 'utf8');
}

/** `file:line match` for every match of `re` in the scanned files */
function sites(re: RegExp): string[] {
	const found: string[] = [];
	for (const path of FILES) {
		read(path)
			.split('\n')
			.forEach((line, i) => {
				for (const match of line.matchAll(re)) found.push(`${path}:${i + 1} ${match[0]}`);
			});
	}
	return found;
}

const matches = (re: RegExp, text: string) => [...text.matchAll(re)].length > 0;

describe('focus ring styles', () => {
	it('flags faded focus-visible rings and nothing else', () => {
		expect(matches(FAINT_RING, 'focus-visible:ring-ring/50')).toBe(true);
		expect(matches(FAINT_RING, 'dark:focus-visible:ring-destructive/40')).toBe(true);
		expect(matches(FAINT_RING, 'focus-visible:ring-ring')).toBe(false);
		expect(matches(FAINT_RING, 'ring-offset-2')).toBe(false);
		expect(matches(FAINT_RING, 'aria-invalid:ring-destructive/20')).toBe(false);
	});

	it('flags plain focus rings but not their offset', () => {
		expect(matches(FOCUS_RING, 'focus:ring-2')).toBe(true);
		expect(matches(FOCUS_RING, 'focus:ring-ring')).toBe(true);
		expect(matches(FOCUS_RING, 'focus:ring-offset-2')).toBe(false);
		expect(matches(FOCUS_RING, 'focus-visible:ring-2')).toBe(false);
	});

	it('draws no faded ring on a focus-visible variant', () => {
		expect(sites(FAINT_RING)).toEqual([]);
	});

	it('draws no ring on plain focus', () => {
		expect(sites(FOCUS_RING)).toEqual([]);
	});

	it('gives the base outline the ring colour at full opacity', () => {
		const base = topLevelBlocks(read('src/app.css')).filter((block) => block.header === '@layer base');
		expect(base).toHaveLength(1);
		expect(base[0].body).toContain('outline-ring');
		expect([...base[0].body.matchAll(FAINT_OUTLINE)].map((m) => m[0])).toEqual([]);
	});

	it('gives the Button a 2px theme ring and the destructive variant a full destructive ring', () => {
		const button = read('src/lib/components/ui/button/button.svelte');
		expect(button).toMatch(/\bfocus-visible:ring-2\b/);
		expect(button).toMatch(/\bfocus-visible:ring-ring(?![\w/-])/);
		expect(button).toMatch(/\bfocus-visible:ring-destructive(?![\w/-])/);
		expect(button).not.toContain('focus-visible:ring-[3px]');
	});
});
