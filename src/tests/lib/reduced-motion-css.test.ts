import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { topLevelBlocks } from '../fixtures/css-blocks.fixture.js';

/**
 * Source scan of `app.css` for the reduced-motion rule. It must sit outside
 * every `@layer`: Tailwind's utilities live in `@layer utilities`, and only an
 * unlayered rule beats them whatever their specificity. The Reduce motion test in
 * `e2e/specs/vault-mods.spec.ts` checks that Chromium applies it.
 */

const css = readFileSync(join(process.cwd(), 'src/app.css'), 'utf8');

describe('reduced motion css', () => {
	it('finds top-level blocks and skips nested ones', () => {
		const blocks = topLevelBlocks('/* { */ @import "x"; @layer a { @media (m) { .x { y: 1; } } } @media (m) { .z { w: 2; } }');
		expect(blocks.map((b) => b.header)).toEqual(['@layer a', '@media (m)']);
		expect(blocks[1].body).toContain('.z');
	});

	it('has an unlayered reduced-motion block for pulses and spinners', () => {
		const reduce = topLevelBlocks(css).filter((block) => /^@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)$/.test(block.header));
		expect(reduce).toHaveLength(1);
		expect(reduce[0].body).toMatch(/\.animate-pulse\s*\{[^}]*animation:\s*none/);
		expect(reduce[0].body).toMatch(/\.animate-spin\s*\{[^}]*animation-duration:\s*1\.5s/);
	});
});
