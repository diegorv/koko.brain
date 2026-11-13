import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Source scan of the collection calendars' inline grid lines. They sit in
 * inline `style` attributes, so they must read theme tokens: a hardcoded white
 * or an undefined variable's white fallback vanishes on a light theme.
 */
const FILES = [
	'src/lib/features/collection/CollectionCalendarView.svelte',
	'src/lib/features/collection/CollectionLinearCalendarView.svelte',
];

describe('collection calendar grid colors', () => {
	it.each(FILES)('%s draws its grid lines with the divider token', (file) => {
		const source = readFileSync(file, 'utf8');
		expect(source).not.toContain('--foreground-15');
		expect(source).not.toContain('rgba(255');
		expect(source).not.toContain('rgba(0');
		expect(source).toContain('var(--divider)');
	});
});
