import { describe, it, expect } from 'vitest';
import { buttonVariants } from '#lib/components/ui/button/index.js';
import { BUILTIN_THEMES } from '#lib/core/settings/theme.logic.js';
import { contrastRatio } from '#lib/utils/color.js';
import { HARD_PALETTE_THEMES } from '../../../../fixtures/hard-palette-themes.fixture';

describe('destructive Button', () => {
	const classes = buttonVariants({ variant: 'destructive' }).split(/\s+/);

	it('draws its label in the theme destructive foreground on the opaque destructive fill', () => {
		expect(classes).toContain('text-destructive-foreground');
		expect(classes).toContain('bg-destructive');
		expect(classes).not.toContain('text-white');
		// The theme pairs the foreground with the opaque fill; on dark:bg-destructive/60 it measured 2.7:1.
		expect(classes.some((c) => c.startsWith('dark:bg-destructive/'))).toBe(false);
	});

	it('pairs that foreground and fill at 4.5:1 on every theme', () => {
		for (const { name, colors } of [...BUILTIN_THEMES, ...HARD_PALETTE_THEMES]) {
			expect(contrastRatio(colors.ui.destructiveForeground, colors.ui.destructive)!, name).toBeGreaterThanOrEqual(4.5);
		}
	});
});

describe('outline Button', () => {
	const classes = buttonVariants({ variant: 'outline' }).split(/\s+/);

	it('draws its edge with the input token in both modes, which the builder pairs at 3:1 on a Settings row', () => {
		expect(classes).toContain('border');
		expect(classes).toContain('border-input');
		expect(classes.some((c) => c.startsWith('dark:border-'))).toBe(false);
		// The 3:1 input token is an edge color; as a /30 fill it would grey the button on dark themes.
		expect(classes.some((c) => /^dark:(hover:)?bg-input\//.test(c))).toBe(false);
		for (const { name, colors } of [...BUILTIN_THEMES, ...HARD_PALETTE_THEMES]) {
			expect(contrastRatio(colors.ui.input, colors.ui.settingItemBg)!, name).toBeGreaterThanOrEqual(3 - 0.005);
		}
	});
});
