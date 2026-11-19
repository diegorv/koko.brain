import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Source scan of the shared Select trigger, which needs a Select root to
 * mount: its edge is the input token the builder pairs at 3:1 on a Settings
 * row, the popover and the input fill.
 */

const SRC = readFileSync(join(process.cwd(), 'src/lib/components/ui/select/select-trigger.svelte'), 'utf8');
const classes = /class=\{cn\(\s*"([^"]+)"/.exec(SRC)![1].split(/\s+/);

describe('Select trigger', () => {
	it('draws its edge with the input token', () => {
		expect(classes).toContain('border');
		expect(classes).toContain('border-input');
	});

	it('does not fill itself with the input edge color on dark themes', () => {
		expect(classes.filter((c) => /^dark:(hover:)?bg-input\//.test(c))).toEqual([]);
	});

	it('shows keyboard focus with a 2px full-strength theme ring', () => {
		expect(classes).toContain('focus-visible:ring-2');
		expect(classes).toContain('focus-visible:ring-ring');
		expect(classes.filter((c) => c.startsWith('focus-visible:ring-ring/'))).toEqual([]);
	});
});
