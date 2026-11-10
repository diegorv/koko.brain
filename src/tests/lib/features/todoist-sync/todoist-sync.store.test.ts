import { describe, it, expect, beforeEach } from 'vitest';
import { todoistSyncStore } from '#lib/features/todoist-sync/todoist-sync.store.svelte.js';

const PULL = { mode: 'normal' as const, notesCreated: 0, tasksInserted: 0, linksPaired: 0, linesUnmatched: 0, linesUpdated: 0, headingsWritten: 0, todoistUpdated: 0, todoistCreated: 0, projectsCreated: 0, sectionsCreated: 0, projectsRenamed: 0 };

describe('todoistSyncStore', () => {
	beforeEach(() => {
		todoistSyncStore.reset();
	});

	it('starts idle with no result and no error', () => {
		expect(todoistSyncStore.status).toBe('idle');
		expect(todoistSyncStore.isSyncing).toBe(false);
		expect(todoistSyncStore.lastResult).toBeNull();
		expect(todoistSyncStore.lastError).toBeNull();
	});

	it('start moves to syncing and clears the previous error', () => {
		todoistSyncStore.fail('Could not reach Todoist.');
		todoistSyncStore.start();
		expect(todoistSyncStore.status).toBe('syncing');
		expect(todoistSyncStore.isSyncing).toBe(true);
		expect(todoistSyncStore.lastError).toBeNull();
	});

	it('succeed stores the result and returns to idle', () => {
		const result = { kind: 'check' as const, projects: 3, openTasks: 7, inboxIncluded: false, finishedAt: 1000 };
		todoistSyncStore.start();
		todoistSyncStore.succeed(result);
		expect(todoistSyncStore.status).toBe('idle');
		expect(todoistSyncStore.isSyncing).toBe(false);
		expect(todoistSyncStore.lastResult).toEqual(result);
	});

	it('fail keeps the last good result and stores the message', () => {
		const result = { kind: 'check' as const, projects: 1, openTasks: 0, inboxIncluded: true, finishedAt: 1 };
		todoistSyncStore.succeed(result);
		todoistSyncStore.start();
		todoistSyncStore.fail('Todoist rate limit reached. Try again later.');
		expect(todoistSyncStore.status).toBe('error');
		expect(todoistSyncStore.isSyncing).toBe(false);
		expect(todoistSyncStore.lastError).toBe('Todoist rate limit reached. Try again later.');
		expect(todoistSyncStore.lastResult).toEqual(result);
	});

	it('lastSyncedAt is the finish time of the last pull, kept across a later check and a failure', () => {
		expect(todoistSyncStore.lastSyncedAt).toBeNull();
		todoistSyncStore.succeed({ kind: 'pull', ...PULL, finishedAt: 5000 });
		expect(todoistSyncStore.lastSyncedAt).toBe(5000);

		todoistSyncStore.succeed({ kind: 'check', projects: 1, openTasks: 0, inboxIncluded: false, finishedAt: 9000 });
		todoistSyncStore.fail('Could not reach Todoist.');
		expect(todoistSyncStore.lastSyncedAt).toBe(5000);
	});

	it('openLog shows the entries and closeLog hides them', () => {
		const entry = { id: 1, createdAt: 10, kind: 'frozen', anchor: 'td-1', message: 'duplicated' };
		expect(todoistSyncStore.logOpen).toBe(false);
		expect(todoistSyncStore.logEntries).toEqual([]);

		todoistSyncStore.openLog([entry]);
		expect(todoistSyncStore.logOpen).toBe(true);
		expect(todoistSyncStore.logEntries).toEqual([entry]);

		todoistSyncStore.closeLog();
		expect(todoistSyncStore.logOpen).toBe(false);
		expect(todoistSyncStore.logEntries).toEqual([]);
	});

	it('reset returns to the initial state', () => {
		todoistSyncStore.succeed({ kind: 'pull', ...PULL, finishedAt: 1 });
		todoistSyncStore.openLog([]);
		todoistSyncStore.start();
		todoistSyncStore.fail('x');
		todoistSyncStore.reset();
		expect(todoistSyncStore.status).toBe('idle');
		expect(todoistSyncStore.lastError).toBeNull();
		expect(todoistSyncStore.lastResult).toBeNull();
		expect(todoistSyncStore.lastSyncedAt).toBeNull();
		expect(todoistSyncStore.logOpen).toBe(false);
	});
});
