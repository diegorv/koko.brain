// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Opening a note is the editor's side effect; the stores stay real (CLAUDE.md rule 1).
vi.mock('#lib/core/editor/editor.service.js', () => ({
	openFileInEditor: vi.fn(),
}));

import { flushSync, mount, unmount } from 'svelte';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import EventTaskLane from '#lib/features/event-calendar/EventTaskLane.svelte';
import { eventCalendarViewStore } from '#lib/features/event-calendar/event-calendar-view.store.svelte.js';
import type { CalendarTask } from '#lib/features/event-calendar/event-calendar-tasks.logic.js';

const DAYS = ['2026-11-10', '2026-11-11', '2026-11-12'];

function datedTask(name: string, date: string, line = 1, overrides: Partial<CalendarTask> = {}): CalendarTask {
	return { path: `/vault/${name}.md`, fileName: name, line, description: name, status: 'todo', date, ...overrides };
}

let target: HTMLElement;
let component: Record<string, unknown> | null = null;

function mountLane(tasks: CalendarTask[], days = DAYS) {
	component = mount(EventTaskLane, { target, props: { days, tasks } });
	flushSync();
}

const q = <T extends Element = HTMLElement>(selector: string) => target.querySelector<T>(selector);
const qa = <T extends Element = HTMLElement>(selector: string) => [...target.querySelectorAll<T>(selector)];

beforeEach(() => {
	vi.clearAllMocks();
	editorStore.reset();
	eventCalendarViewStore.reset();
	target = document.body.appendChild(document.createElement('div'));
});

afterEach(() => {
	if (component) unmount(component);
	component = null;
	document.body.innerHTML = '';
});

describe('EventTaskLane', () => {
	it('renders one cell per day with that day\'s tasks in order', () => {
		mountLane([datedTask('A', '2026-11-10', 1), datedTask('B', '2026-11-10', 2), datedTask('C', '2026-11-12')]);

		expect(qa('[data-task-lane-cell]').map((c) => c.dataset.taskLaneCell)).toEqual(DAYS);
		expect(qa('[data-task-lane-cell="2026-11-10"] [data-calendar-task]').map((c) => c.textContent?.trim())).toEqual(['A', 'B']);
		expect(qa('[data-task-lane-cell="2026-11-11"] [data-calendar-task]')).toHaveLength(0);
		expect(qa('[data-task-lane-cell="2026-11-12"] [data-calendar-task]').map((c) => c.textContent?.trim())).toEqual(['C']);
	});

	it('grows with the busiest day up to three rows', () => {
		mountLane([datedTask('A', '2026-11-10')]);
		expect(q('[data-task-lane]')!.style.height).toBe('37px');
		unmount(component!);

		mountLane(['A', 'B', 'C', 'D', 'E'].map((n, i) => datedTask(n, '2026-11-11', i + 1)));
		// Two chips and the "+N" button fill the three rows.
		expect(q('[data-task-lane]')!.style.height).toBe(`${6 * 2 + 3 * 24 + 2 * 4 + 1}px`);
	});

	it('renders nothing when no visible day has a task', () => {
		mountLane([datedTask('A', '2026-12-01')]);
		expect(q('[data-task-lane]')).toBeNull();
		unmount(component!);

		mountLane([]);
		expect(q('[data-task-lane]')).toBeNull();
	});

	it('marks a done task and labels the chip with its note', () => {
		mountLane([datedTask('Bills', '2026-11-10', 4, { description: 'Pay bills', status: 'done' })]);

		const chip = q('[data-calendar-task]')!;
		expect(chip.dataset.taskStatus).toBe('done');
		expect(chip.dataset.taskPath).toBe('/vault/Bills.md');
		expect(chip.dataset.taskLine).toBe('4');
		expect(chip.getAttribute('aria-label')).toBe('Task: Pay bills, done, open Bills at the task');
		expect(chip.querySelector('.line-through')?.textContent).toBe('Pay bills');
	});

	it('marks a cancelled task as closed', () => {
		mountLane([datedTask('Trip', '2026-11-10', 2, { description: 'Book trip', status: 'cancelled' })]);

		const chip = q('[data-calendar-task]')!;
		expect(chip.dataset.taskStatus).toBe('cancelled');
		expect(chip.getAttribute('aria-label')).toBe('Task: Book trip, cancelled, open Trip at the task');
		expect(chip.querySelector('.line-through')?.textContent).toBe('Book trip');
	});

	it('keeps a todo, in-progress, question, important or forwarded task open', () => {
		// Day view: one visible day shows every task.
		mountLane([
			datedTask('Bills', '2026-11-10', 1, { description: 'Pay bills', status: 'todo' }),
			datedTask('Draft', '2026-11-10', 2, { description: 'Write draft', status: 'in-progress' }),
			datedTask('Ask', '2026-11-10', 3, { description: 'Ask Ana', status: 'question' }),
			datedTask('Taxes', '2026-11-10', 5, { description: 'Pay taxes', status: 'important' }),
			datedTask('Report', '2026-11-10', 6, { description: 'Hand off report', status: 'forwarded' }),
		], ['2026-11-10']);

		const chips = qa('[data-calendar-task]');
		expect(chips.map((c) => c.dataset.taskStatus)).toEqual(['todo', 'in-progress', 'question', 'important', 'forwarded']);
		expect(chips.map((c) => c.getAttribute('aria-label'))).toEqual([
			'Task: Pay bills, open Bills at the task',
			'Task: Write draft, open Draft at the task',
			'Task: Ask Ana, open Ask at the task',
			'Task: Pay taxes, open Taxes at the task',
			'Task: Hand off report, open Report at the task',
		]);
		expect(q('[data-task-lane] .line-through')).toBeNull();
	});

	it('opens the note at the task line on click', async () => {
		vi.mocked(openFileInEditor).mockImplementation(async (path: string) => {
			editorStore.addTab({ path, name: 'Rent.md', content: '# Rent\n\n- [ ] Pay rent 📅 2026-11-12\n', savedContent: '' });
		});
		mountLane([datedTask('Rent', '2026-11-12', 3)]);

		q<HTMLButtonElement>('[data-calendar-task]')!.click();
		await Promise.resolve();
		await Promise.resolve();

		expect(openFileInEditor).toHaveBeenCalledWith('/vault/Rent.md');
		expect(editorStore.pendingScrollPosition).toBe('# Rent\n\n'.length);
	});
});

describe('EventTaskLane: overflow', () => {
	/** `n` tasks due on `date`, named T1..Tn. */
	const busy = (date: string, n: number) => Array.from({ length: n }, (_, i) => datedTask(`T${i + 1}`, date, i + 1));

	it('caps a busy day of the week at 2 chips and a "+N" that opens day view', () => {
		mountLane(busy('2026-11-11', 5));

		const cell = q('[data-task-lane-cell="2026-11-11"]')!;
		expect([...cell.querySelectorAll<HTMLElement>('[data-calendar-task]')].map((c) => c.textContent?.trim())).toEqual(['T1', 'T2']);
		const more = qa<HTMLButtonElement>('[data-task-lane-more]');
		expect(more).toHaveLength(1);
		expect(cell.contains(more[0])).toBe(true);
		expect(more[0].textContent?.trim()).toBe('+3');
		expect(more[0].getAttribute('aria-label')).toBe('3 more tasks, open day view');
		expect(q('[data-task-lane] span')!.textContent).toBe('Tasks');

		more[0].click();
		flushSync();
		expect(eventCalendarViewStore.focusedDate).toBe('2026-11-11');
		expect(eventCalendarViewStore.view).toBe('day');
	});

	it('shows every task, no "+N" and the count in the label in day view', () => {
		mountLane(busy('2026-11-11', 5), ['2026-11-11']);

		expect(qa('[data-calendar-task]')).toHaveLength(5);
		expect(q('[data-task-lane-more]')).toBeNull();
		expect(q('[data-task-lane] span')!.textContent).toBe('Tasks 5');
		expect(q('[data-task-lane]')!.style.height).toBe(`${6 * 2 + 3 * 24 + 2 * 4 + 1}px`);
	});

	it('has no "+N" for a week day with exactly 3 tasks', () => {
		mountLane(busy('2026-11-10', 3));

		expect(qa('[data-calendar-task]')).toHaveLength(3);
		expect(q('[data-task-lane-more]')).toBeNull();
	});
});
