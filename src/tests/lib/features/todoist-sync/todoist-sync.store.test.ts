import { describe, it, expect, beforeEach } from 'vitest';
import { todoistSyncStore } from '#lib/features/todoist-sync/todoist-sync.store.svelte.js';

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

	it('reset returns to the initial state', () => {
		todoistSyncStore.start();
		todoistSyncStore.fail('x');
		todoistSyncStore.reset();
		expect(todoistSyncStore.status).toBe('idle');
		expect(todoistSyncStore.lastError).toBeNull();
		expect(todoistSyncStore.lastResult).toBeNull();
	});
});
