import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

// The picker's swatch states are scoped CSS, which jsdom does not compute; the rules are read from the source.
const source = readFileSync('src/lib/features/tags/TagColorPicker.svelte', 'utf8');
const rule = (selector: string) => new RegExp(`${selector.replace(/[.]/g, '\\.')}\\s*\\{([^}]*)\\}`).exec(source)?.[1] ?? '';

describe('TagColorPicker swatch states', () => {
	it('draws every state with theme tokens, never a translucent white that vanishes on a light popover', () => {
		expect(source).not.toMatch(/rgba\(\s*255\s*,\s*255\s*,\s*255/);
	});

	it('keeps the fill inside the ring, so the selected ring is judged against the popover, not the swatch', () => {
		expect(rule('.color-dot')).toContain('background-clip: padding-box');
		expect(rule('.color-dot.active')).toContain('border-color: var(--foreground)');
	});

	it('outlines the none and the empty custom swatch in the muted text color', () => {
		expect(rule('.color-dot.none,\\s*.color-dot.custom.empty')).toContain('var(--muted-foreground)');
		expect(source).toMatch(/class:empty=\{currentColor == null\}/);
	});
});
