import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Source scan of the card and tag colour swatches in the card context menu,
 * which only render in a nested Bits UI sub-menu: the preset fill is the only
 * label and light presets vanish on the popover, so each swatch has an input
 * edge, which the builder pairs at 3:1 on the popover.
 */

const SRC = readFileSync(join(process.cwd(), 'src/lib/plugins/kanban/KanbanCard.svelte'), 'utf8');

/** The static classes of every button filled with a preset colour */
const swatches = [...SRC.matchAll(/<button\s+class="([^"{]*)[^"]*"\s+style="background: \{COLOR_PRESET_TEXT\[color\]\}"/g)].map((m) =>
	m[1].trim().split(/\s+/),
);

describe('KanbanCard colour swatches', () => {
	it('finds the card and the tag swatches', () => {
		expect(swatches).toHaveLength(2);
	});

	it('gives every swatch a 3:1 input edge', () => {
		for (const classes of swatches) {
			expect(classes).toContain('border');
			expect(classes).toContain('border-input');
		}
	});
});
