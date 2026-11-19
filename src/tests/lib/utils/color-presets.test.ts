import { describe, it, expect } from 'vitest';
import { COLOR_PRESET_BG, COLOR_PRESET_CHIP_TEXT, COLOR_PRESET_TEXT } from '#lib/utils/color-presets.js';
import { contrastRatio, flatten, mixColors } from '#lib/utils/color.js';
import { BUILTIN_THEMES } from '#lib/core/settings/theme.logic.js';

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

		/** `color` at 30% alpha (Tailwind `/30`) as an 8-digit hex, made opaque over `base` first. */
		function at30(color: string, base: string): string {
			return `${flatten(color, base)}4d`;
		}

		it('mixes each preset toward --editor-fg', () => {
			expect(Object.keys(COLOR_PRESET_CHIP_TEXT).sort()).toEqual([...EXPECTED_KEYS].sort());
			expect(COLOR_PRESET_CHIP_TEXT.blue).toBe('color-mix(in oklab, rgb(66,153,225) 30%, var(--editor-fg))');
		});

		/**
		 * Every tag chip below 4.5:1, with `textFor` giving the chip text for a tag on a theme.
		 * The stack is the tag tint over an uncoloured card and over every coloured card on its lane.
		 */
		function chipFailures(textFor: (tag: string, editorFg: string) => string): string[] {
			const failures: string[] = [];
			for (const theme of BUILTIN_THEMES) {
				const { ui } = theme.colors;
				const lane = flatten(at30(ui.muted, ui.editorBg), ui.editorBg)!;
				const cards: [string, string][] = [
					['plain', flatten(ui.background, ui.editorBg)!],
					...Object.entries(COLOR_PRESET_BG).map(([name, bg]): [string, string] => [name, flatten(bg, lane)!]),
				];
				for (const tag of EXPECTED_KEYS) {
					const text = textFor(tag, ui.editorFg);
					for (const [card, surface] of cards) {
						const ratio = contrastRatio(text, flatten(COLOR_PRESET_BG[tag], surface)!)!;
						if (ratio < 4.5) failures.push(`${theme.name} ${tag} on ${card} card ${ratio.toFixed(2)}`);
					}
				}
			}
			return failures;
		}

		it('reads at 4.5:1 on its tag tint over an uncoloured card and over every coloured card on its lane, on every built-in theme', () => {
			expect(chipFailures((tag, editorFg) => resolveChipText(COLOR_PRESET_CHIP_TEXT[tag], editorFg))).toEqual([]);
		});

		it('fails the same stack at a 40% preset share, so the stack is the real one', () => {
			const failures = chipFailures((tag, editorFg) => mixColors(COLOR_PRESET_TEXT[tag], editorFg, 0.6)!);
			expect(failures.length).toBeGreaterThan(0);
		});
	});

	it('BG and TEXT maps share the same key set', () => {
		expect(Object.keys(COLOR_PRESET_BG).sort()).toEqual(Object.keys(COLOR_PRESET_TEXT).sort());
	});
});
