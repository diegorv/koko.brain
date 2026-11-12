/**
 * Shared Tasks view test data and helpers: tasks and groups shaped as Rust
 * sends them, the entries snapshot built from them, an `invoke` mock that
 * serves it, and a mounted view.
 *
 * Prerequisite for `mockTaskFetch` and `mountTasksView`: the test file mocks
 * `@tauri-apps/api/core` (`invoke: vi.fn()`) before importing this fixture.
 * `mountTasksView` also needs the jsdom environment.
 */
import { vi } from 'vitest';
import { flushSync, mount, tick } from 'svelte';
import { invoke } from '@tauri-apps/api/core';
import { invalidateVaultEntries } from '#lib/core/vault/vault-entries.service.js';
import { tasksStore } from '#lib/features/tasks/tasks.store.svelte.js';
import { TASK_STATUSES } from '#lib/features/tasks/task-status.logic.js';
import type { FileTaskGroupV2, NoteEntryV2, TaskV2, ToggleTaskResultV2 } from '#lib/types/vault-v2.types.js';
import { entryV2 } from './vault-entries.fixture';

/**
 * A task as Rust sends it in `NoteEntry.tasks`: `todo` at indent 0 on line 1, with
 * `metadata.description` equal to `text`. `checked` is `status !== 'todo'`,
 * as Rust sets it, unless `overrides.checked` says otherwise.
 */
export function taskV2(text: string, overrides: Partial<TaskV2> = {}): TaskV2 {
	const status = overrides.status ?? 'todo';
	return {
		text,
		checked: status !== 'todo',
		indent: 0,
		lineNumber: 1,
		status,
		metadata: { description: text, tags: [] },
		...overrides,
	};
}

/**
 * One note's tasks, with `fileName` taken from the path and `modifiedAt` in
 * seconds, as Rust sends it. Throws when two tasks share a `lineNumber`:
 * the view keys its rows by it.
 */
export function taskGroupV2(filePath: string, tasks: TaskV2[], modifiedAtSec = 1_700_000_000): FileTaskGroupV2 {
	const lines = new Set<number>();
	for (const task of tasks) {
		if (lines.has(task.lineNumber)) throw new Error(`taskGroupV2: two tasks on line ${task.lineNumber} in ${filePath}`);
		lines.add(task.lineNumber);
	}
	const fileName = (filePath.split('/').pop() ?? filePath).replace(/\.md$/, '');
	return { filePath, fileName, modifiedAt: modifiedAtSec, tasks };
}

/**
 * The entries snapshot entry of one note group: its path, title, tasks and
 * `modifiedAt` (seconds), with no headings and the `entryV2` defaults.
 */
export function taskEntryV2(group: FileTaskGroupV2): NoteEntryV2 {
	return entryV2(group.filePath, { title: group.fileName, modifiedAt: group.modifiedAt, tasks: group.tasks });
}

/** Raw line text of each status's task in {@link sevenStatusGroup}. */
const SEVEN_TEXTS: Record<(typeof TASK_STATUSES)[number], string> = {
	todo: 'Send invoice 📅 2026-11-03 ⏫ #work',
	'in-progress': 'Draft plan',
	question: 'Ask Ana',
	important: 'Renew passport',
	forwarded: 'Hand off report',
	done: 'Book venue',
	cancelled: 'Old idea',
};

/**
 * One note holding one task per status, in `TASK_STATUSES` order on lines 1
 * to 7. The todo task's text carries the due date, priority and tag its
 * metadata comes from, as `parse_task_metadata` reads them.
 */
export function sevenStatusGroup(filePath = '/vault/Projects/2026-Q2.md'): FileTaskGroupV2 {
	return taskGroupV2(
		filePath,
		TASK_STATUSES.map((status, i) =>
			taskV2(SEVEN_TEXTS[status], {
				status,
				lineNumber: i + 1,
				...(status === 'todo'
					? { metadata: { description: 'Send invoice', dueDate: '2026-11-03', priority: 'high', tags: ['work'] } }
					: {}),
			}),
		),
	);
}

/** The answer `toggle_task_status` gives when nothing was written. */
function unchangedToggle(): ToggleTaskResultV2 {
	return {
		updatedContent: '',
		updateResult: { changed: false, affected: [], version: 1, upserted: [], removed: [], fullRescan: false },
		stale: false,
	};
}

/**
 * Serves the Tasks view's IPC through the mocked `invoke`:
 * `get_all_vault_entries_v2` returns each of `groups` as `taskEntryV2`
 * (a function is called on every whole-vault read), then `opts.entries` as
 * given (for headings or note fields), `toggle_task_status` returns
 * `opts.toggle(args)` or an unchanged result, and any other command returns
 * `undefined`. Drops the memoized snapshot, so the next read gets these
 * answers; a later read at the same index version is served the memo.
 */
export function mockTaskFetch(
	groups: FileTaskGroupV2[] | (() => Promise<FileTaskGroupV2[]>),
	opts: { entries?: NoteEntryV2[]; toggle?: (args: Record<string, unknown>) => ToggleTaskResultV2 } = {},
): void {
	invalidateVaultEntries();
	vi.mocked(invoke).mockImplementation(async (cmd: string, args?: unknown) => {
		if (cmd === 'get_all_vault_entries_v2') {
			const list = typeof groups === 'function' ? await groups() : groups;
			return [...list.map(taskEntryV2), ...(opts.entries ?? [])];
		}
		if (cmd === 'toggle_task_status') {
			return opts.toggle ? opts.toggle((args ?? {}) as Record<string, unknown>) : unchangedToggle();
		}
		return undefined;
	});
}

/** No-op `ResizeObserver`: the view's ScrollArea (bits-ui) observes its viewport. */
class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}

/**
 * Mounts `TasksView` into a fresh target on `document.body` and resolves
 * once `tasksStore.hasLoaded` is true and the DOM is flushed. The caller
 * unmounts `component`.
 */
export async function mountTasksView(
	props: { onOpenWikilink?: (target: string) => void } = {},
): Promise<{ target: HTMLElement; component: Record<string, unknown> }> {
	globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
	// Imported here so the logic tests that use this file's builders do not
	// load the component and its stores.
	const { default: TasksView } = await import('#lib/features/tasks/TasksView.svelte');
	const target = document.body.appendChild(document.createElement('div'));
	const component = mount(TasksView, { target, props: { onOpenWikilink: props.onOpenWikilink ?? (() => {}) } });
	flushSync();
	await vi.waitFor(() => {
		flushSync();
		if (!tasksStore.hasLoaded) throw new Error('tasks not loaded');
	});
	flushSync();
	return { target, component };
}

/**
 * Opens a bits-ui menu the way a mouse does: a bubbling primary-button
 * `pointerdown` on the trigger, then enough ticks for the content to mount.
 */
export async function openMenu(trigger: HTMLElement): Promise<void> {
	trigger.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 }));
	for (let i = 0; i < 4; i++) {
		await tick();
		flushSync();
	}
}
