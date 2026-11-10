import { describe, it, expect } from 'vitest';
import { mapPriorityToTodoist } from '#lib/features/todoist-sync/priority.logic.js';

describe('mapPriorityToTodoist', () => {
	it('maps highest to 4', () => {
		expect(mapPriorityToTodoist('highest')).toBe(4);
	});

	it('maps high to 3', () => {
		expect(mapPriorityToTodoist('high')).toBe(3);
	});

	it('maps medium to 2', () => {
		expect(mapPriorityToTodoist('medium')).toBe(2);
	});

	it('maps low to 1', () => {
		expect(mapPriorityToTodoist('low')).toBe(1);
	});

	it('maps lowest to 1', () => {
		expect(mapPriorityToTodoist('lowest')).toBe(1);
	});

	it('maps none to 1', () => {
		expect(mapPriorityToTodoist('none')).toBe(1);
	});

	it('maps undefined to 1', () => {
		expect(mapPriorityToTodoist(undefined)).toBe(1);
	});
});
