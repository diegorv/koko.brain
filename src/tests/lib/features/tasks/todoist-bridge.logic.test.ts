import { describe, it, expect } from 'vitest';
import {
	mapPriorityToTodoist,
	mapPriorityFromTodoist,
	buildTodoistArgs,
} from '$lib/features/tasks/todoist-bridge.logic';
import type { TaskMetadata } from '$lib/features/tasks/task-metadata.types';

// ── mapPriorityToTodoist ───────────────────────────────────────────

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

// ── mapPriorityFromTodoist ─────────────────────────────────────────

describe('mapPriorityFromTodoist', () => {
	it('maps 4 to highest', () => {
		expect(mapPriorityFromTodoist(4)).toBe('highest');
	});

	it('maps 3 to high', () => {
		expect(mapPriorityFromTodoist(3)).toBe('high');
	});

	it('maps 2 to medium', () => {
		expect(mapPriorityFromTodoist(2)).toBe('medium');
	});

	it('maps 1 to none', () => {
		expect(mapPriorityFromTodoist(1)).toBe('none');
	});

	it('maps 0 to none', () => {
		expect(mapPriorityFromTodoist(0)).toBe('none');
	});

	it('maps negative number to none', () => {
		expect(mapPriorityFromTodoist(-1)).toBe('none');
	});

	it('maps out-of-range number to none', () => {
		expect(mapPriorityFromTodoist(99)).toBe('none');
	});
});

// ── buildTodoistArgs ───────────────────────────────────────────────

describe('buildTodoistArgs', () => {
	it('uses description as content', () => {
		const metadata: TaskMetadata = { description: 'Buy groceries', tags: [] };
		const args = buildTodoistArgs(metadata);
		expect(args.content).toBe('Buy groceries');
	});

	it('omits priority when none/undefined', () => {
		const metadata: TaskMetadata = { description: 'Task', tags: [] };
		const args = buildTodoistArgs(metadata);
		expect(args.priority).toBeUndefined();
	});

	it('sets priority for highest', () => {
		const metadata: TaskMetadata = { description: 'Task', priority: 'highest', tags: [] };
		const args = buildTodoistArgs(metadata);
		expect(args.priority).toBe(4);
	});

	it('sets priority for high', () => {
		const metadata: TaskMetadata = { description: 'Task', priority: 'high', tags: [] };
		const args = buildTodoistArgs(metadata);
		expect(args.priority).toBe(3);
	});

	it('sets priority for medium', () => {
		const metadata: TaskMetadata = { description: 'Task', priority: 'medium', tags: [] };
		const args = buildTodoistArgs(metadata);
		expect(args.priority).toBe(2);
	});

	it('omits priority for low (maps to 1 = default)', () => {
		const metadata: TaskMetadata = { description: 'Task', priority: 'low', tags: [] };
		const args = buildTodoistArgs(metadata);
		expect(args.priority).toBeUndefined();
	});

	it('sets dueDate when present', () => {
		const metadata: TaskMetadata = { description: 'Task', dueDate: '2026-03-01', tags: [] };
		const args = buildTodoistArgs(metadata);
		expect(args.dueDate).toBe('2026-03-01');
	});

	it('omits dueDate when not present', () => {
		const metadata: TaskMetadata = { description: 'Task', tags: [] };
		const args = buildTodoistArgs(metadata);
		expect(args.dueDate).toBeUndefined();
	});

	it('sets dueString from recurrence', () => {
		const metadata: TaskMetadata = {
			description: 'Water plants',
			recurrence: { text: 'every week' },
			tags: [],
		};
		const args = buildTodoistArgs(metadata);
		expect(args.dueString).toBe('every week');
	});

	it('recurrence overrides dueDate', () => {
		const metadata: TaskMetadata = {
			description: 'Task',
			dueDate: '2026-03-01',
			recurrence: { text: 'every day' },
			tags: [],
		};
		const args = buildTodoistArgs(metadata);
		expect(args.dueString).toBe('every day');
		expect(args.dueDate).toBeUndefined();
	});

	it('sets labels from tags', () => {
		const metadata: TaskMetadata = { description: 'Task', tags: ['work', 'urgent'] };
		const args = buildTodoistArgs(metadata);
		expect(args.labels).toEqual(['work', 'urgent']);
	});

	it('omits labels when no tags', () => {
		const metadata: TaskMetadata = { description: 'Task', tags: [] };
		const args = buildTodoistArgs(metadata);
		expect(args.labels).toBeUndefined();
	});

	it('builds complete args from full metadata', () => {
		const metadata: TaskMetadata = {
			description: 'Preparar apresentacao',
			dueDate: '2026-03-15',
			priority: 'highest',
			tags: ['trabalho', 'apresentacao'],
		};
		const args = buildTodoistArgs(metadata);
		expect(args).toEqual({
			content: 'Preparar apresentacao',
			priority: 4,
			dueDate: '2026-03-15',
			labels: ['trabalho', 'apresentacao'],
		});
	});

	it('builds args with recurrence + priority + tags', () => {
		const metadata: TaskMetadata = {
			description: 'Standup',
			recurrence: { text: 'every weekday' },
			priority: 'high',
			tags: ['work'],
		};
		const args = buildTodoistArgs(metadata);
		expect(args).toEqual({
			content: 'Standup',
			priority: 3,
			dueString: 'every weekday',
			labels: ['work'],
		});
	});

	it('handles empty description', () => {
		const metadata: TaskMetadata = { description: '', tags: [] };
		const args = buildTodoistArgs(metadata);
		expect(args.content).toBe('');
		expect(args.priority).toBeUndefined();
		expect(args.dueDate).toBeUndefined();
		expect(args.labels).toBeUndefined();
	});
});
