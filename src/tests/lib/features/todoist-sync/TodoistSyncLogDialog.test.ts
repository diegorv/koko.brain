// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import TodoistSyncLogDialog from '#lib/features/todoist-sync/TodoistSyncLogDialog.svelte';
import { todoistSyncStore } from '#lib/features/todoist-sync/todoist-sync.store.svelte.js';

describe('TodoistSyncLogDialog', () => {
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		todoistSyncStore.reset();
		component = mount(TodoistSyncLogDialog, { target: document.body.appendChild(document.createElement('div')) });
		flushSync();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		todoistSyncStore.reset();
		document.body.innerHTML = '';
	});

	it('renders nothing while closed', () => {
		expect(document.querySelector('[data-todoist-sync-log]')).toBeNull();
	});

	it('lists each entry with its time, kind, anchor and message, in store order', () => {
		todoistSyncStore.openLog([
			{ id: 2, createdAt: new Date(2026, 10, 9, 14, 30).getTime(), kind: 'frozen', anchor: 'td-w1', message: 'Anchor appears 2 times' },
			{ id: 1, createdAt: new Date(2026, 10, 8, 9, 5).getTime(), kind: 'stale', anchor: null, message: 'Todoist/Work.md changed' },
		]);
		flushSync();

		const rows = [...document.querySelectorAll('[data-sync-log-entry]')].map((row) =>
			[...row.querySelectorAll('td')].map((cell) => cell.textContent),
		);
		expect(rows).toEqual([
			['2026-11-09 14:30', 'frozen', 'td-w1', 'Anchor appears 2 times'],
			['2026-11-08 09:05', 'stale', '', 'Todoist/Work.md changed'],
		]);
		expect(document.querySelector('[data-todoist-sync-log]')?.textContent).toContain('Todoist sync log');
	});

	it('says so when the log is empty', () => {
		todoistSyncStore.openLog([]);
		flushSync();

		expect(document.querySelector('[data-sync-log-empty]')?.textContent).toBe('No sync log entries yet.');
	});

	it('closes through the store when dismissed with Escape', () => {
		todoistSyncStore.openLog([]);
		flushSync();

		document.querySelector('[data-todoist-sync-log]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		flushSync();

		expect(todoistSyncStore.logOpen).toBe(false);
	});
});
