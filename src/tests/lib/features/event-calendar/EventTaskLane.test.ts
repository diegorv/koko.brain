// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Opening a note is the editor's side effect; the stores stay real (CLAUDE.md rule 1).
vi.mock('$lib/core/editor/editor.service', () => ({
	openFileInEditor: vi.fn(),
}));

import { flushSync, mount, unmount } from 'svelte';
import { openFileInEditor } from '$lib/core/editor/editor.service';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import EventTaskLane from '$lib/features/event-calendar/EventTaskLane.svelte';
import type { CalendarTask } from '$lib/features/event-calendar/event-calendar-tasks.logic';

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
		expect(q('[data-task-lane]')!.style.height).toBe(`${6 * 2 + 3 * 24 + 2 * 4 + 1}px`);
		// Every task stays reachable: the cell scrolls instead of hiding the rest.
		expect(qa('[data-task-lane-cell="2026-11-11"] [data-calendar-task]')).toHaveLength(5);
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

	it('keeps an in-progress or important task open', () => {
		mountLane([
			datedTask('Draft', '2026-11-10', 2, { description: 'Write draft', status: 'in-progress' }),
			datedTask('Taxes', '2026-11-10', 5, { description: 'Pay taxes', status: 'important' }),
		]);

		const chips = qa('[data-calendar-task]');
		expect(chips.map((c) => c.dataset.taskStatus)).toEqual(['in-progress', 'important']);
		expect(chips.map((c) => c.getAttribute('aria-label'))).toEqual([
			'Task: Write draft, open Draft at the task',
			'Task: Pay taxes, open Taxes at the task',
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
