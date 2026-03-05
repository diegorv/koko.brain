import { describe, it, expect, beforeEach } from 'vitest';
import { todoistStore } from '$lib/features/tasks/todoist.store.svelte';
import type { SentTaskEntry, TodoistProject, TodoistSection } from '$lib/features/tasks/todoist.types';

describe('todoistStore', () => {
	beforeEach(() => {
		todoistStore.reset();
	});

	it('starts with default state', () => {
		expect(todoistStore.projects).toEqual([]);
		expect(todoistStore.sections).toEqual([]);
		expect(todoistStore.sentTasks).toEqual([]);
		expect(todoistStore.lastProjectId).toBe('');
		expect(todoistStore.lastSectionId).toBe('');
		expect(todoistStore.lastPriority).toBe(1);
		expect(todoistStore.isLoadingProjects).toBe(false);
		expect(todoistStore.isLoadingSections).toBe(false);
		expect(todoistStore.isSending).toBe(false);
		expect(todoistStore.isSyncing).toBe(false);
	});

	it('setProjects updates project list', () => {
		const projects: TodoistProject[] = [
			{ id: '1', name: 'Inbox', color: 'charcoal', is_favorite: false, child_order: 0 },
		];
		todoistStore.setProjects(projects);
		expect(todoistStore.projects).toBe(projects);
	});

	it('setSections updates section list', () => {
		const sections: TodoistSection[] = [
			{ id: 's1', project_id: '1', name: 'Backlog', section_order: 0 },
		];
		todoistStore.setSections(sections);
		expect(todoistStore.sections).toBe(sections);
	});

	it('setLastProjectId remembers project', () => {
		todoistStore.setLastProjectId('proj-42');
		expect(todoistStore.lastProjectId).toBe('proj-42');
	});

	it('setLastSectionId remembers section', () => {
		todoistStore.setLastSectionId('sec-7');
		expect(todoistStore.lastSectionId).toBe('sec-7');
	});

	it('setLastPriority remembers priority', () => {
		todoistStore.setLastPriority(3);
		expect(todoistStore.lastPriority).toBe(3);
	});

	it('setLoadingProjects updates loading state', () => {
		todoistStore.setLoadingProjects(true);
		expect(todoistStore.isLoadingProjects).toBe(true);
	});

	it('setLoadingSections updates loading state', () => {
		todoistStore.setLoadingSections(true);
		expect(todoistStore.isLoadingSections).toBe(true);
	});

	it('setSending updates sending state', () => {
		todoistStore.setSending(true);
		expect(todoistStore.isSending).toBe(true);
	});

	it('setSyncing updates syncing state', () => {
		todoistStore.setSyncing(true);
		expect(todoistStore.isSyncing).toBe(true);
		todoistStore.setSyncing(false);
		expect(todoistStore.isSyncing).toBe(false);
	});

	it('isCompletedInTodoist returns false for unknown tasks', () => {
		expect(todoistStore.isCompletedInTodoist('/vault/note.md', 'Buy milk')).toBe(false);
	});

	it('isCompletedInTodoist returns true for completed tasks', () => {
		todoistStore.setSentTasks([
			{ filePath: '/vault/note.md', text: 'Buy milk', todoistTaskId: 'td-1', todoistUrl: '', sentAt: 1, todoistCompleted: true },
		]);
		expect(todoistStore.isCompletedInTodoist('/vault/note.md', 'Buy milk')).toBe(true);
	});

	it('isCompletedInTodoist returns false for non-completed sent tasks', () => {
		todoistStore.setSentTasks([
			{ filePath: '/vault/note.md', text: 'Buy milk', todoistTaskId: 'td-1', todoistUrl: '', sentAt: 1 },
		]);
		expect(todoistStore.isCompletedInTodoist('/vault/note.md', 'Buy milk')).toBe(false);
	});

	it('getTodoistUrl returns undefined for unknown tasks', () => {
		expect(todoistStore.getTodoistUrl('/vault/note.md', 'Buy milk')).toBeUndefined();
	});

	it('getTodoistUrl returns URL for sent tasks', () => {
		todoistStore.setSentTasks([
			{ filePath: '/vault/note.md', text: 'Buy milk', todoistTaskId: 'td-1', todoistUrl: 'https://todoist.com/task/1', sentAt: 1 },
		]);
		expect(todoistStore.getTodoistUrl('/vault/note.md', 'Buy milk')).toBe('https://todoist.com/task/1');
	});

	it('updateSentTask updates entry by todoist task ID', () => {
		todoistStore.setSentTasks([
			{ filePath: '/a.md', text: 'Task A', todoistTaskId: 'td-1', todoistUrl: '', sentAt: 1 },
			{ filePath: '/b.md', text: 'Task B', todoistTaskId: 'td-2', todoistUrl: '', sentAt: 2 },
		]);
		todoistStore.updateSentTask('td-1', { todoistCompleted: true, todoistUrl: 'https://todoist.com/task/1' });

		const updated = todoistStore.sentTasks.find((e) => e.todoistTaskId === 'td-1');
		expect(updated?.todoistCompleted).toBe(true);
		expect(updated?.todoistUrl).toBe('https://todoist.com/task/1');
		// Other entries remain unchanged
		const other = todoistStore.sentTasks.find((e) => e.todoistTaskId === 'td-2');
		expect(other?.todoistCompleted).toBeUndefined();
	});

	it('updateSentTask rebuilds lookup set', () => {
		todoistStore.setSentTasks([
			{ filePath: '/a.md', text: 'Task A', todoistTaskId: 'td-1', todoistUrl: '', sentAt: 1 },
		]);
		todoistStore.updateSentTask('td-1', { text: 'Task A Updated' });
		expect(todoistStore.isSent('/a.md', 'Task A Updated')).toBe(true);
		expect(todoistStore.isSent('/a.md', 'Task A')).toBe(false);
	});

	it('isSent returns false for unknown tasks', () => {
		expect(todoistStore.isSent('/vault/note.md', 'Buy milk')).toBe(false);
	});

	it('isSent returns true after addSentTask', () => {
		const entry: SentTaskEntry = {
			filePath: '/vault/note.md',
			text: 'Buy milk',
			todoistTaskId: 'td-123',
			todoistUrl: 'https://todoist.com/task/123',
			sentAt: Date.now(),
		};
		todoistStore.addSentTask(entry);
		expect(todoistStore.isSent('/vault/note.md', 'Buy milk')).toBe(true);
	});

	it('isSent returns false for different text in same file', () => {
		const entry: SentTaskEntry = {
			filePath: '/vault/note.md',
			text: 'Buy milk',
			todoistTaskId: 'td-123',
			todoistUrl: 'https://todoist.com/task/123',
			sentAt: Date.now(),
		};
		todoistStore.addSentTask(entry);
		expect(todoistStore.isSent('/vault/note.md', 'Buy bread')).toBe(false);
	});

	it('setSentTasks replaces entire list and rebuilds lookup', () => {
		const entries: SentTaskEntry[] = [
			{ filePath: '/a.md', text: 'Task A', todoistTaskId: '1', todoistUrl: '', sentAt: 1 },
			{ filePath: '/b.md', text: 'Task B', todoistTaskId: '2', todoistUrl: '', sentAt: 2 },
		];
		todoistStore.setSentTasks(entries);
		expect(todoistStore.sentTasks).toEqual(entries);
		expect(todoistStore.isSent('/a.md', 'Task A')).toBe(true);
		expect(todoistStore.isSent('/b.md', 'Task B')).toBe(true);
		expect(todoistStore.isSent('/c.md', 'Task C')).toBe(false);
	});

	it('addSentTask appends to existing list', () => {
		todoistStore.setSentTasks([
			{ filePath: '/a.md', text: 'Task A', todoistTaskId: '1', todoistUrl: '', sentAt: 1 },
		]);
		todoistStore.addSentTask({
			filePath: '/b.md', text: 'Task B', todoistTaskId: '2', todoistUrl: '', sentAt: 2,
		});
		expect(todoistStore.sentTasks).toHaveLength(2);
		expect(todoistStore.isSent('/a.md', 'Task A')).toBe(true);
		expect(todoistStore.isSent('/b.md', 'Task B')).toBe(true);
	});

	it('reset clears all state', () => {
		todoistStore.setProjects([{ id: '1', name: 'P', color: '', is_favorite: false, child_order: 0 }]);
		todoistStore.setSections([{ id: 's1', project_id: '1', name: 'S', section_order: 0 }]);
		todoistStore.addSentTask({ filePath: '/a.md', text: 'T', todoistTaskId: '1', todoistUrl: '', sentAt: 1 });
		todoistStore.setLastProjectId('proj-1');
		todoistStore.setLastSectionId('sec-1');
		todoistStore.setLastPriority(4);
		todoistStore.setLoadingProjects(true);
		todoistStore.setLoadingSections(true);
		todoistStore.setSending(true);
		todoistStore.setSyncing(true);

		todoistStore.reset();

		expect(todoistStore.projects).toEqual([]);
		expect(todoistStore.sections).toEqual([]);
		expect(todoistStore.sentTasks).toEqual([]);
		expect(todoistStore.lastProjectId).toBe('');
		expect(todoistStore.lastSectionId).toBe('');
		expect(todoistStore.lastPriority).toBe(1);
		expect(todoistStore.isLoadingProjects).toBe(false);
		expect(todoistStore.isLoadingSections).toBe(false);
		expect(todoistStore.isSending).toBe(false);
		expect(todoistStore.isSyncing).toBe(false);
		expect(todoistStore.isSent('/a.md', 'T')).toBe(false);
	});
});
