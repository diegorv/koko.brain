import { describe, it, expect } from 'vitest';
import {
	ROW_MENU_STATUSES,
	TASK_STATUSES,
	isTaskOpen,
	statusGlyph,
	statusMenuLabel,
	toggleTarget,
	type StatusGlyph,
} from '#lib/features/tasks/task-status.logic.js';
import type { TaskStatus } from '#lib/features/tasks/task-metadata.types.js';
import { taskV2 } from '../../../fixtures/tasks.fixture';

describe('TASK_STATUSES', () => {
	it('lists the seven statuses, open ones first', () => {
		expect(TASK_STATUSES).toEqual(['todo', 'in-progress', 'question', 'important', 'forwarded', 'done', 'cancelled']);
	});
});

describe('isTaskOpen', () => {
	it.each<[TaskStatus, boolean]>([
		['todo', true],
		['in-progress', true],
		['question', true],
		['important', true],
		['forwarded', true],
		['done', false],
		['cancelled', false],
	])('%s is open: %s', (status, open) => {
		expect(isTaskOpen(status)).toBe(open);
	});

	it('ignores checked: a todo task sent with checked true is open', () => {
		const task = taskV2('odd box', { status: 'todo', checked: true });
		expect(task.checked).toBe(true);
		expect(isTaskOpen(task.status)).toBe(true);
	});
});

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

describe('statusGlyph', () => {
	it.each<[TaskStatus, StatusGlyph]>([
		['todo', { icon: 'circle', word: 'todo', tone: 'text-muted-foreground' }],
		['in-progress', { icon: 'circle-dot', word: 'in progress', tone: 'text-primary' }],
		['question', { icon: 'circle-question-mark', word: 'question', tone: 'text-warning' }],
		['important', { icon: 'circle-alert', word: 'important', tone: 'text-destructive' }],
		['forwarded', { icon: 'circle-arrow-right', word: 'forwarded', tone: 'text-muted-foreground' }],
		['done', { icon: 'circle-check-big', word: 'done', tone: 'text-success' }],
		['cancelled', { icon: 'circle-minus', word: 'cancelled', tone: 'text-muted-foreground' }],
	])('%s', (status, glyph) => {
		expect(statusGlyph(status)).toEqual(glyph);
	});
});

describe('ROW_MENU_STATUSES', () => {
	it('lists todo, in progress, done and cancelled in TASK_STATUSES order', () => {
		expect(ROW_MENU_STATUSES).toEqual(['todo', 'in-progress', 'done', 'cancelled']);
		expect(TASK_STATUSES.filter((s) => ROW_MENU_STATUSES.includes(s))).toEqual(ROW_MENU_STATUSES);
	});
});

describe('statusMenuLabel', () => {
	it.each<[TaskStatus, string]>([
		['todo', 'Todo'],
		['in-progress', 'In progress'],
		['done', 'Done'],
		['cancelled', 'Cancelled'],
		['question', 'Question'],
	])('%s is %j', (status, label) => {
		expect(statusMenuLabel(status)).toBe(label);
	});
});
