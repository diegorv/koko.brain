import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

import { cn } from '#lib/utils.js';
import { TEXT_ROLES } from '#lib/utils/text-roles.js';

const css = readFileSync(resolve(process.cwd(), 'src/app.css'), 'utf8');
const theme = css.match(/@theme inline\s*\{([\s\S]*?)\n\}/)![1];

/** Reads one `--name: value;` declaration out of the `@theme` block. */
function themeValue(name: string): string | undefined {
	return theme.match(new RegExp(`^\\s*${name}:\\s*([^;]+);`, 'm'))?.[1].trim();
}

describe('text role tokens in app.css', () => {
	it.each([
		['label', '11px'],
		['meta', '12px'],
		['rail', '13px'],
		['row', '14px'],
		['title', '15px'],
	])('--text-%s is %s', (role, size) => {
		expect(themeValue(`--text-${role}`)).toBe(size);
	});

	it('gives every role a line-height', () => {
		for (const role of TEXT_ROLES) {
			expect(themeValue(`--text-${role}--line-height`)).toBeDefined();
		}
	});

	it('gives the rail role an 18px line height', () => {
		expect(themeValue('--text-rail--line-height')).toBe('calc(18 / 13)');
	});

	it('makes the title semibold, so it differs from a row by weight too', () => {
		expect(themeValue('--text-title--font-weight')).toBe('600');
	});

	it('TEXT_ROLES lists exactly the --text-* sizes of the theme', () => {
		// CSS cannot import the TS list, so this keeps the two in sync.
		const names = [...theme.matchAll(/^\s*--text-([a-z]+):/gm)].map((m) => m[1]);
		expect([...TEXT_ROLES].sort()).toEqual(names.sort());
	});
});

describe('section-label utility', () => {
	it('is 11px semibold, tracking-wide, uppercase, muted', () => {
		const body = css.match(/@utility section-label\s*\{([^}]*)\}/)?.[1];
		expect(body).toBeDefined();
		for (const part of ['text-label', 'font-semibold', 'tracking-wide', 'uppercase', 'text-muted-foreground']) {
			expect(body).toContain(part);
		}
	});
});

describe('cn() with text roles', () => {
	it('treats a role as a font size, keeping the color class', () => {
		expect(cn('text-foreground/80', 'text-row')).toBe('text-foreground/80 text-row');
	});

	it('lets a role replace another font size', () => {
		expect(cn('h-6 text-sm text-foreground/80', 'text-row')).toBe('h-6 text-foreground/80 text-row');
	});

	it('still merges two color classes', () => {
		expect(cn('text-meta text-foreground', 'text-right-sidebar-fg')).toBe('text-meta text-right-sidebar-fg');
	});
});
