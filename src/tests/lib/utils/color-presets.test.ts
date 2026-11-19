import { describe, it, expect } from 'vitest';
import { COLOR_PRESET_BG, COLOR_PRESET_CHIP_TEXT, COLOR_PRESET_PLAIN_TEXT, COLOR_PRESET_TEXT } from '#lib/utils/color-presets.js';
import { contrastRatio, flatten, mixColors } from '#lib/utils/color.js';
import { BUILTIN_THEMES } from '#lib/core/settings/theme.logic.js';
import { HARD_PALETTE_THEMES } from '../../fixtures/hard-palette-themes.fixture';

const EXPECTED_KEYS = ['blue', 'green', 'red', 'orange', 'purple', 'yellow', 'gray'];

describe('color-presets', () => {
	describe('COLOR_PRESET_BG', () => {
		it('contains all 7 palette colors', () => {
			expect(Object.keys(COLOR_PRESET_BG).sort()).toEqual([...EXPECTED_KEYS].sort());
		});

		it('values are rgba() strings with alpha 0.15', () => {
			for (const value of Object.values(COLOR_PRESET_BG)) {
				expect(value).toMatch(/^rgba\(\d+,\d+,\d+,0\.15\)$/);
			}
		});

		it('blue preset has correct RGB values', () => {
			expect(COLOR_PRESET_BG.blue).toBe('rgba(66,153,225,0.15)');
		});
	});

	describe('COLOR_PRESET_TEXT', () => {
		it('contains all 7 palette colors', () => {
			expect(Object.keys(COLOR_PRESET_TEXT).sort()).toEqual([...EXPECTED_KEYS].sort());
		});

		it('values are rgb() strings without alpha', () => {
			for (const value of Object.values(COLOR_PRESET_TEXT)) {
				expect(value).toMatch(/^rgb\(\d+,\d+,\d+\)$/);
			}
		});
	});

	describe('COLOR_PRESET_CHIP_TEXT', () => {
		/** The chip text a map value resolves to with `--editor-fg` = `editorFg`. */
		function resolveChipText(value: string, editorFg: string): string {
			const m = /^color-mix\(in oklab, (rgb\(\d+,\d+,\d+\)) (\d+)%, var\(--editor-fg\)\)$/.exec(value);
			if (!m) throw new Error(`not a chip text mix: ${value}`);
			return mixColors(m[1], editorFg, 1 - Number(m[2]) / 100)!;
		}

		it('mixes each preset toward --editor-fg', () => {
			expect(Object.keys(COLOR_PRESET_CHIP_TEXT).sort()).toEqual([...EXPECTED_KEYS].sort());
			expect(COLOR_PRESET_CHIP_TEXT.blue).toBe('color-mix(in oklab, rgb(66,153,225) 13%, var(--editor-fg))');
		});

		/**
		 * Every tag chip below 4.5:1, with `textFor` giving the chip text for a tag on a theme.
		 * The stack is the tag tint over a board card and over a list or table row, each
		 * uncoloured and in every `{color:x}` (KanbanCard layers that tint over its bg-background).
		 */
		function chipFailures(textFor: (tag: string, editorFg: string) => string): string[] {
			const failures: string[] = [];
			for (const theme of [...BUILTIN_THEMES, ...HARD_PALETTE_THEMES]) {
				const { ui } = theme.colors;
				const surfaces: [string, string][] = [
					['plain card', ui.background],
					['plain row', ui.editorBg],
					...Object.entries(COLOR_PRESET_BG).flatMap(([name, bg]): [string, string][] => [
						[`${name} card`, flatten(bg, ui.background)!],
						[`${name} row`, flatten(bg, ui.editorBg)!],
					]),
				];
				for (const tag of EXPECTED_KEYS) {
					const text = textFor(tag, ui.editorFg);
					for (const [surface, bg] of surfaces) {
						const ratio = contrastRatio(text, flatten(COLOR_PRESET_BG[tag], bg)!)!;
						if (ratio < 4.5) failures.push(`${theme.name} ${tag} on ${surface} ${ratio.toFixed(2)}`);
					}
				}
			}
			return failures;
		}

		it('reads at 4.5:1 on its tag tint over every card and row, on every built-in and hard-palette theme', () => {
			expect(chipFailures((tag, editorFg) => resolveChipText(COLOR_PRESET_CHIP_TEXT[tag], editorFg))).toEqual([]);
		});

		it('fails the same stack at a 30% preset share on a Zettlr light palette, so the stack is the real one', () => {
			const failures = chipFailures((tag, editorFg) => mixColors(COLOR_PRESET_TEXT[tag], editorFg, 0.7)!);
			expect(failures.some((f) => f.startsWith('Zettlr Bielefeld Light'))).toBe(true);
		});
	});

	describe('COLOR_PRESET_PLAIN_TEXT', () => {
		it('mixes each preset toward --editor-fg with a larger preset share than chip text', () => {
			expect(Object.keys(COLOR_PRESET_PLAIN_TEXT).sort()).toEqual([...EXPECTED_KEYS].sort());
			expect(COLOR_PRESET_PLAIN_TEXT.blue).toBe('color-mix(in oklab, rgb(66,153,225) 20%, var(--editor-fg))');
		});
	});

	it('BG and TEXT maps share the same key set', () => {
		expect(Object.keys(COLOR_PRESET_BG).sort()).toEqual(Object.keys(COLOR_PRESET_TEXT).sort());
	});
});
