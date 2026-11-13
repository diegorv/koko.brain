import { describe, it, expect } from 'vitest';
import {
	PRIORITY_SIGNIFIERS,
	priorityMenuLabel,
	prioritySignifier,
	resolveDuePreset,
} from '#lib/features/tasks/task-row-edit.logic.js';
import { TASK_PRIORITIES } from '#lib/features/tasks/task-query.logic.js';
import { PRIORITY_EMOJIS } from '#lib/utils/task-tokens.js';

describe('resolveDuePreset', () => {
	it('gives today, the next day and seven days after today', () => {
		expect(resolveDuePreset('today', '2026-11-05')).toBe('2026-11-05');
		expect(resolveDuePreset('tomorrow', '2026-11-05')).toBe('2026-11-06');
		expect(resolveDuePreset('week', '2026-11-05')).toBe('2026-11-12');
	});

	it('crosses a month and a year end', () => {
		expect(resolveDuePreset('tomorrow', '2026-12-31')).toBe('2027-01-01');
		expect(resolveDuePreset('week', '2026-02-25')).toBe('2026-03-04');
	});
});

describe('the priority signifiers', () => {
	it('maps all five levels to the parser signifiers, highest first', () => {
		expect(PRIORITY_SIGNIFIERS).toEqual({ highest: '🔺', high: '⏫', medium: '🔼', low: '🔽', lowest: '⏬' });
		expect(Object.values(PRIORITY_SIGNIFIERS)).toEqual([...PRIORITY_EMOJIS]);
	});

	it('gives no signifier for none', () => {
		expect(prioritySignifier('none')).toBeNull();
		expect(prioritySignifier('high')).toBe('⏫');
		expect(prioritySignifier('lowest')).toBe('⏬');
	});
});

describe('priorityMenuLabel', () => {
	it('capitalizes every level, None included, in menu order', () => {
		expect(TASK_PRIORITIES.map(priorityMenuLabel)).toEqual(['Highest', 'High', 'Medium', 'None', 'Low', 'Lowest']);
	});
});
