import { describe, it, expect } from 'vitest';
import { mapPriorityFromTodoist, mapPriorityToTodoist } from '#lib/features/todoist-sync/priority.logic.js';

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

describe('mapPriorityFromTodoist', () => {
	it('maps 4, 3 and 2 back to highest, high and medium', () => {
		expect([4, 3, 2].map(mapPriorityFromTodoist)).toEqual(['highest', 'high', 'medium']);
	});

	it('maps 1 and unknown values to no priority', () => {
		expect([1, 0, 5].map(mapPriorityFromTodoist)).toEqual([null, null, null]);
	});
});
