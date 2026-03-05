import { describe, it, expect } from 'vitest';
import {
	parseTaskMetadata,
	serializeTaskMetadata,
	mapCheckboxChar,
	statusToCheckboxChar,
	isOverdue,
	isDueToday,
	isDueSoon,
} from '$lib/features/tasks/task-metadata.logic';
import type { TaskMetadata } from '$lib/features/tasks/task-metadata.types';

// ── parseTaskMetadata ──────────────────────────────────────────────

describe('parseTaskMetadata', () => {
	describe('plain text (no signifiers)', () => {
		it('returns text as-is in description', () => {
			const m = parseTaskMetadata('Buy groceries');
			expect(m.description).toBe('Buy groceries');
			expect(m.tags).toEqual([]);
			expect(m.priority).toBeUndefined();
			expect(m.dueDate).toBeUndefined();
		});

		it('handles empty string', () => {
			const m = parseTaskMetadata('');
			expect(m.description).toBe('');
			expect(m.tags).toEqual([]);
		});

		it('handles text with special characters', () => {
			const m = parseTaskMetadata('Fix bug in auth (URGENT!) & deploy v2.0');
			expect(m.description).toBe('Fix bug in auth (URGENT!) & deploy v2.0');
		});
	});

	describe('due date (📅)', () => {
		it('extracts due date', () => {
			const m = parseTaskMetadata('Buy milk 📅 2026-02-20');
			expect(m.dueDate).toBe('2026-02-20');
			expect(m.description).toBe('Buy milk');
		});

		it('extracts due date without space after emoji', () => {
			const m = parseTaskMetadata('Buy milk 📅2026-02-20');
			expect(m.dueDate).toBe('2026-02-20');
			expect(m.description).toBe('Buy milk');
		});

		it('extracts due date with variation selector', () => {
			const m = parseTaskMetadata('Buy milk 📅\uFE0F 2026-02-20');
			expect(m.dueDate).toBe('2026-02-20');
			expect(m.description).toBe('Buy milk');
		});
	});

	describe('scheduled date (⏳)', () => {
		it('extracts scheduled date', () => {
			const m = parseTaskMetadata('Review PR ⏳ 2026-02-18');
			expect(m.scheduledDate).toBe('2026-02-18');
			expect(m.description).toBe('Review PR');
		});
	});

	describe('start date (🛫)', () => {
		it('extracts start date', () => {
			const m = parseTaskMetadata('Project kickoff 🛫 2026-03-01');
			expect(m.startDate).toBe('2026-03-01');
			expect(m.description).toBe('Project kickoff');
		});
	});

	describe('created date (➕)', () => {
		it('extracts created date', () => {
			const m = parseTaskMetadata('New idea ➕ 2026-02-16');
			expect(m.createdDate).toBe('2026-02-16');
			expect(m.description).toBe('New idea');
		});
	});

	describe('done date (✅)', () => {
		it('extracts done date', () => {
			const m = parseTaskMetadata('Completed task ✅ 2026-02-15');
			expect(m.doneDate).toBe('2026-02-15');
			expect(m.description).toBe('Completed task');
		});
	});

	describe('cancelled date (❌)', () => {
		it('extracts cancelled date', () => {
			const m = parseTaskMetadata('Abandoned task ❌ 2026-02-14');
			expect(m.cancelledDate).toBe('2026-02-14');
			expect(m.description).toBe('Abandoned task');
		});
	});

	describe('priority signifiers', () => {
		it('extracts highest priority (🔺)', () => {
			const m = parseTaskMetadata('Critical bug 🔺');
			expect(m.priority).toBe('highest');
			expect(m.description).toBe('Critical bug');
		});

		it('extracts high priority (⏫)', () => {
			const m = parseTaskMetadata('Important task ⏫');
			expect(m.priority).toBe('high');
			expect(m.description).toBe('Important task');
		});

		it('extracts medium priority (🔼)', () => {
			const m = parseTaskMetadata('Normal task 🔼');
			expect(m.priority).toBe('medium');
			expect(m.description).toBe('Normal task');
		});

		it('extracts low priority (🔽)', () => {
			const m = parseTaskMetadata('Low prio task 🔽');
			expect(m.priority).toBe('low');
			expect(m.description).toBe('Low prio task');
		});

		it('extracts lowest priority (⏬)', () => {
			const m = parseTaskMetadata('Backlog item ⏬');
			expect(m.priority).toBe('lowest');
			expect(m.description).toBe('Backlog item');
		});

		it('takes first priority when multiple present', () => {
			const m = parseTaskMetadata('Task 🔺 ⏫');
			expect(m.priority).toBe('highest');
		});

		it('handles priority with variation selector', () => {
			const m = parseTaskMetadata('Task 🔺\uFE0F');
			expect(m.priority).toBe('highest');
			expect(m.description).toBe('Task');
		});
	});

	describe('recurrence (🔁)', () => {
		it('extracts simple recurrence', () => {
			const m = parseTaskMetadata('Water plants 🔁 every week');
			expect(m.recurrence).toEqual({ text: 'every week' });
			expect(m.description).toBe('Water plants');
		});

		it('extracts complex recurrence', () => {
			const m = parseTaskMetadata('Pay rent 🔁 every month on the 1st');
			expect(m.recurrence).toEqual({ text: 'every month on the 1st' });
		});

		it('stops recurrence text at next signifier', () => {
			const m = parseTaskMetadata('Task 🔁 every day 📅 2026-03-01');
			expect(m.recurrence).toEqual({ text: 'every day' });
			expect(m.dueDate).toBe('2026-03-01');
		});
	});

	describe('ID (🆔)', () => {
		it('extracts task ID', () => {
			const m = parseTaskMetadata('Task 🆔 abc123');
			expect(m.id).toBe('abc123');
			expect(m.description).toBe('Task');
		});
	});

	describe('dependsOn (⛔)', () => {
		it('extracts single dependency', () => {
			const m = parseTaskMetadata('Blocked task ⛔ abc123');
			expect(m.dependsOn).toEqual(['abc123']);
		});

		it('extracts multiple dependencies', () => {
			const m = parseTaskMetadata('Task ⛔ id1,id2,id3');
			expect(m.dependsOn).toEqual(['id1', 'id2', 'id3']);
		});
	});

	describe('onCompletion (🏁)', () => {
		it('extracts on completion action', () => {
			const m = parseTaskMetadata('Task 🏁 delete');
			expect(m.onCompletion).toBe('delete');
			expect(m.description).toBe('Task');
		});
	});

	describe('tags', () => {
		it('extracts single tag', () => {
			const m = parseTaskMetadata('Buy groceries #shopping');
			expect(m.tags).toEqual(['shopping']);
			expect(m.description).toBe('Buy groceries');
		});

		it('extracts multiple tags', () => {
			const m = parseTaskMetadata('Task #work #urgent #q1');
			expect(m.tags).toEqual(['work', 'urgent', 'q1']);
			expect(m.description).toBe('Task');
		});

		it('handles tags with hyphens', () => {
			const m = parseTaskMetadata('Task #my-project');
			expect(m.tags).toEqual(['my-project']);
		});

		it('handles tags with numbers', () => {
			const m = parseTaskMetadata('Task #v2');
			expect(m.tags).toEqual(['v2']);
		});
	});

	describe('combinations', () => {
		it('extracts due date + priority + tags', () => {
			const m = parseTaskMetadata('Buy milk 📅 2026-02-20 🔺 #shopping');
			expect(m.description).toBe('Buy milk');
			expect(m.dueDate).toBe('2026-02-20');
			expect(m.priority).toBe('highest');
			expect(m.tags).toEqual(['shopping']);
		});

		it('extracts due date + recurrence + priority', () => {
			const m = parseTaskMetadata('Standup 🔁 every weekday 📅 2026-02-20 ⏫');
			expect(m.recurrence).toEqual({ text: 'every weekday' });
			expect(m.dueDate).toBe('2026-02-20');
			expect(m.priority).toBe('high');
		});

		it('extracts all date types simultaneously', () => {
			const m = parseTaskMetadata('Task 🛫 2026-01-01 ⏳ 2026-01-15 📅 2026-02-01');
			expect(m.startDate).toBe('2026-01-01');
			expect(m.scheduledDate).toBe('2026-01-15');
			expect(m.dueDate).toBe('2026-02-01');
		});

		it('handles complex real-world task', () => {
			const m = parseTaskMetadata(
				'Preparar apresentacao Q1 📅 2026-03-15 🔺 #trabalho #apresentacao',
			);
			expect(m.description).toBe('Preparar apresentacao Q1');
			expect(m.dueDate).toBe('2026-03-15');
			expect(m.priority).toBe('highest');
			expect(m.tags).toEqual(['trabalho', 'apresentacao']);
		});

		it('handles signifiers in middle of text', () => {
			const m = parseTaskMetadata('Buy 📅 2026-02-20 groceries');
			expect(m.dueDate).toBe('2026-02-20');
			expect(m.description).toBe('Buy groceries');
		});

		it('handles ID + dependsOn together', () => {
			const m = parseTaskMetadata('Task 🆔 myid ⛔ dep1,dep2');
			expect(m.id).toBe('myid');
			expect(m.dependsOn).toEqual(['dep1', 'dep2']);
		});

		it('preserves description when all signifiers stripped', () => {
			const m = parseTaskMetadata('Clean description only');
			expect(m.description).toBe('Clean description only');
			expect(m.dueDate).toBeUndefined();
			expect(m.priority).toBeUndefined();
			expect(m.recurrence).toBeUndefined();
			expect(m.tags).toEqual([]);
		});
	});

	describe('edge cases', () => {
		it('collapses multiple spaces after stripping', () => {
			const m = parseTaskMetadata('Buy  milk   📅 2026-02-20   now');
			expect(m.description).toBe('Buy milk now');
		});

		it('trims whitespace', () => {
			const m = parseTaskMetadata('  Buy milk 📅 2026-02-20  ');
			expect(m.dueDate).toBe('2026-02-20');
			expect(m.description).toBe('Buy milk');
		});

		it('does not treat emoji-like text as signifier', () => {
			const m = parseTaskMetadata('Use emoji in text :)');
			expect(m.description).toBe('Use emoji in text :)');
			expect(m.dueDate).toBeUndefined();
		});
	});
});

// ── serializeTaskMetadata ──────────────────────────────────────────

describe('serializeTaskMetadata', () => {
	it('serializes plain description', () => {
		const m: TaskMetadata = { description: 'Buy groceries', tags: [] };
		expect(serializeTaskMetadata(m)).toBe('Buy groceries');
	});

	it('serializes with due date', () => {
		const m: TaskMetadata = { description: 'Task', dueDate: '2026-02-20', tags: [] };
		const result = serializeTaskMetadata(m);
		expect(result).toContain('Task');
		expect(result).toContain('2026-02-20');
	});

	it('serializes with priority', () => {
		const m: TaskMetadata = { description: 'Task', priority: 'highest', tags: [] };
		const result = serializeTaskMetadata(m);
		expect(result).toContain('Task');
		expect(result).toContain('\u{1F53A}'); // 🔺
	});

	it('serializes with tags', () => {
		const m: TaskMetadata = { description: 'Task', tags: ['work', 'urgent'] };
		const result = serializeTaskMetadata(m);
		expect(result).toContain('#work');
		expect(result).toContain('#urgent');
	});

	it('serializes with recurrence', () => {
		const m: TaskMetadata = {
			description: 'Water plants',
			recurrence: { text: 'every week' },
			tags: [],
		};
		const result = serializeTaskMetadata(m);
		expect(result).toContain('\u{1F501} every week');
	});

	it('serializes with ID', () => {
		const m: TaskMetadata = { description: 'Task', id: 'abc123', tags: [] };
		const result = serializeTaskMetadata(m);
		expect(result).toContain('\u{1F194} abc123');
	});

	it('serializes with dependsOn', () => {
		const m: TaskMetadata = { description: 'Task', dependsOn: ['id1', 'id2'], tags: [] };
		const result = serializeTaskMetadata(m);
		expect(result).toContain('\u{26D4} id1,id2');
	});

	it('serializes with onCompletion', () => {
		const m: TaskMetadata = { description: 'Task', onCompletion: 'delete', tags: [] };
		const result = serializeTaskMetadata(m);
		expect(result).toContain('\u{1F3C1} delete');
	});

	it('serializes full metadata', () => {
		const m: TaskMetadata = {
			description: 'Complex task',
			dueDate: '2026-03-01',
			priority: 'high',
			recurrence: { text: 'every week' },
			tags: ['work'],
		};
		const result = serializeTaskMetadata(m);
		expect(result).toContain('Complex task');
		expect(result).toContain('2026-03-01');
		expect(result).toContain('\u{23EB}'); // ⏫
		expect(result).toContain('#work');
	});
});

// ── round-trip ─────────────────────────────────────────────────────

describe('round-trip parse → serialize → parse', () => {
	const cases = [
		'Buy groceries',
		'Task 📅 2026-02-20',
		'Task 🔺',
		'Task 📅 2026-02-20 🔺 #shopping',
		'Water plants 🔁 every week',
		'Task 🆔 abc123',
	];

	for (const input of cases) {
		it(`round-trips: "${input}"`, () => {
			const first = parseTaskMetadata(input);
			const serialized = serializeTaskMetadata(first);
			const second = parseTaskMetadata(serialized);

			expect(second.description).toBe(first.description);
			expect(second.dueDate).toBe(first.dueDate);
			expect(second.priority).toBe(first.priority);
			expect(second.tags).toEqual(first.tags);
			expect(second.recurrence?.text).toBe(first.recurrence?.text);
			expect(second.id).toBe(first.id);
		});
	}
});

// ── mapCheckboxChar ────────────────────────────────────────────────

describe('mapCheckboxChar', () => {
	it('maps space to todo', () => {
		expect(mapCheckboxChar(' ')).toBe('todo');
	});

	it('maps x to done', () => {
		expect(mapCheckboxChar('x')).toBe('done');
	});

	it('maps X to done', () => {
		expect(mapCheckboxChar('X')).toBe('done');
	});

	it('maps - to cancelled', () => {
		expect(mapCheckboxChar('-')).toBe('cancelled');
	});

	it('maps / to in-progress', () => {
		expect(mapCheckboxChar('/')).toBe('in-progress');
	});

	it('maps ? to question', () => {
		expect(mapCheckboxChar('?')).toBe('question');
	});

	it('maps > to forwarded', () => {
		expect(mapCheckboxChar('>')).toBe('forwarded');
	});

	it('maps ! to important', () => {
		expect(mapCheckboxChar('!')).toBe('important');
	});

	it('defaults unknown chars to todo', () => {
		expect(mapCheckboxChar('z')).toBe('todo');
	});
});

// ── statusToCheckboxChar ───────────────────────────────────────────

describe('statusToCheckboxChar', () => {
	it('maps todo to space', () => {
		expect(statusToCheckboxChar('todo')).toBe(' ');
	});

	it('maps done to x', () => {
		expect(statusToCheckboxChar('done')).toBe('x');
	});

	it('maps cancelled to -', () => {
		expect(statusToCheckboxChar('cancelled')).toBe('-');
	});

	it('maps in-progress to /', () => {
		expect(statusToCheckboxChar('in-progress')).toBe('/');
	});

	it('maps question to ?', () => {
		expect(statusToCheckboxChar('question')).toBe('?');
	});

	it('maps forwarded to >', () => {
		expect(statusToCheckboxChar('forwarded')).toBe('>');
	});

	it('maps important to !', () => {
		expect(statusToCheckboxChar('important')).toBe('!');
	});

	it('is inverse of mapCheckboxChar', () => {
		const chars = [' ', 'x', '-', '/', '?', '>', '!'];
		for (const ch of chars) {
			expect(statusToCheckboxChar(mapCheckboxChar(ch))).toBe(ch);
		}
	});
});

// ── isOverdue ──────────────────────────────────────────────────────

describe('isOverdue', () => {
	const feb16Noon = new Date('2026-02-16T12:00:00').getTime();

	it('returns true for past due date', () => {
		expect(isOverdue('2026-02-15', feb16Noon)).toBe(true);
	});

	it('returns false for future due date', () => {
		expect(isOverdue('2026-02-17', feb16Noon)).toBe(false);
	});

	it('returns false for today (end of day)', () => {
		expect(isOverdue('2026-02-16', feb16Noon)).toBe(false);
	});

	it('returns true for yesterday', () => {
		expect(isOverdue('2026-02-15', feb16Noon)).toBe(true);
	});
});

// ── isDueToday ─────────────────────────────────────────────────────

describe('isDueToday', () => {
	const feb16Noon = new Date('2026-02-16T12:00:00').getTime();

	it('returns true for today', () => {
		expect(isDueToday('2026-02-16', feb16Noon)).toBe(true);
	});

	it('returns false for tomorrow', () => {
		expect(isDueToday('2026-02-17', feb16Noon)).toBe(false);
	});

	it('returns false for yesterday', () => {
		expect(isDueToday('2026-02-15', feb16Noon)).toBe(false);
	});
});

// ── isDueSoon ──────────────────────────────────────────────────────

describe('isDueSoon', () => {
	const feb16Noon = new Date('2026-02-16T12:00:00').getTime();

	it('returns true for due within 3 days (default)', () => {
		expect(isDueSoon('2026-02-18', 3, feb16Noon)).toBe(true);
	});

	it('returns false for due beyond 3 days', () => {
		expect(isDueSoon('2026-02-25', 3, feb16Noon)).toBe(false);
	});

	it('returns false for overdue task', () => {
		expect(isDueSoon('2026-02-15', 3, feb16Noon)).toBe(false);
	});

	it('returns true for tomorrow with days=1', () => {
		expect(isDueSoon('2026-02-17', 1, feb16Noon)).toBe(true);
	});

	it('uses custom days parameter', () => {
		expect(isDueSoon('2026-02-23', 7, feb16Noon)).toBe(true);
		expect(isDueSoon('2026-02-23', 3, feb16Noon)).toBe(false);
	});
});
