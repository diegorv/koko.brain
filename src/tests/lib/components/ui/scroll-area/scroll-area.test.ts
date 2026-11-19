import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BUILTIN_THEMES } from '#lib/core/settings/theme.logic.js';
import { contrastRatio } from '#lib/utils/color.js';
import { HARD_PALETTE_THEMES } from '../../../../fixtures/hard-palette-themes.fixture';

/**
 * Source scan of the shared ScrollArea: Bits UI only renders the thumb once the
 * viewport overflows, which jsdom never measures, so the classes are read from
 * the component source.
 */

const DIR = join(process.cwd(), 'src/lib/components/ui/scroll-area');

/** The `class` attribute of the element whose `data-slot` is `slot` */
function slotClasses(file: string, slot: string): string[] {
	const src = readFileSync(join(DIR, file), 'utf8');
	const match = new RegExp(String.raw`data-slot="${slot}"\s+class="([^"]+)"`).exec(src);
	expect(match, slot).not.toBeNull();
	return match![1].split(/\s+/);
}

describe('ScrollArea', () => {
	it('draws the thumb with the 3:1 input token at rest and muted text on hover, with no alpha', () => {
		const classes = slotClasses('scroll-area-scrollbar.svelte', 'scroll-area-thumb');
		expect(classes).toContain('bg-input');
		expect(classes).toContain('hover:bg-muted-foreground');
		expect(classes.filter((c) => /^(hover:)?bg-[\w-]+\//.test(c))).toEqual([]);
	});

	it('keeps the resting thumb at 3:1 on the surfaces scroll areas sit on', () => {
		const failures: string[] = [];
		for (const { name, colors } of [...BUILTIN_THEMES, ...HARD_PALETTE_THEMES]) {
			const { input, popover, settingsDialogBg, rightSidebarBg, inputBg } = colors.ui;
			for (const [surface, bg] of Object.entries({ popover, settingsDialogBg, rightSidebarBg, inputBg })) {
				const ratio = contrastRatio(input, bg)!;
				if (ratio < 3 - 0.005) failures.push(`${name} on ${surface} ${ratio.toFixed(2)}`);
			}
		}
		expect(failures).toEqual([]);
	});

	it('marks a keyboard-focused viewport with a full-strength inset ring outline', () => {
		const classes = slotClasses('scroll-area.svelte', 'scroll-area-viewport');
		expect(classes).toContain('outline-ring');
		expect(classes).toContain('focus-visible:outline-2');
		expect(classes).toContain('focus-visible:-outline-offset-2');
		expect(classes.filter((c) => /(ring|outline)-ring\//.test(c))).toEqual([]);
	});
});
