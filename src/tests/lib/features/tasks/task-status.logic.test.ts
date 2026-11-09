import { describe, it, expect } from 'vitest';
import { toggleTarget } from '#lib/features/tasks/task-status.logic.js';
import type { TaskStatus } from '#lib/features/tasks/task-metadata.types.js';

describe('toggleTarget', () => {
	it.each<[TaskStatus, TaskStatus]>([
		['todo', 'done'],
		['done', 'todo'],
		['cancelled', 'todo'],
		['in-progress', 'done'],
		['question', 'done'],
		['forwarded', 'done'],
		['important', 'done'],
	])('sends %s to %s', (status, target) => {
		expect(toggleTarget(status)).toBe(target);
	});
});
