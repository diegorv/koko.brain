import { describe, it, expect } from 'vitest';
import { nextSidebarMode } from '$lib/core/layout/layout.logic';

describe('nextSidebarMode', () => {
	it('cycles files -> types -> calendar -> files', () => {
		expect(nextSidebarMode('files')).toBe('types');
		expect(nextSidebarMode('types')).toBe('calendar');
		expect(nextSidebarMode('calendar')).toBe('files');
	});

	it('falls back to files for an unknown mode', () => {
		expect(nextSidebarMode('bogus' as never)).toBe('files');
	});
});
