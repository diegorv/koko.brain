// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

import TodoistSyncStatus from '#lib/features/todoist-sync/TodoistSyncStatus.svelte';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { todoistSyncStore } from '#lib/features/todoist-sync/todoist-sync.store.svelte.js';

const PULL = { kind: 'pull' as const, mode: 'normal' as const, notesCreated: 0, tasksInserted: 0, linksPaired: 0, linesUnmatched: 0 };

describe('TodoistSyncStatus', () => {
	let component: Record<string, unknown> | null = null;

	const item = () => document.querySelector<HTMLElement>('[data-todoist-sync-status]');

	beforeEach(() => {
		clearLocalStorage();
		settingsStore.reset();
		todoistSyncStore.reset();
		settingsStore.updateTodoist({ syncEnabled: true });
		component = mount(TodoistSyncStatus, { target: document.body.appendChild(document.createElement('div')) });
		flushSync();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		settingsStore.reset();
		todoistSyncStore.reset();
		document.body.innerHTML = '';
	});

	it('is hidden while Todoist sync is off', () => {
		settingsStore.updateTodoist({ syncEnabled: false });
		flushSync();

		expect(item()).toBeNull();
	});

	it('says it has not synced yet before the first sync', () => {
		expect(item()?.textContent?.trim()).toBe('Todoist not synced yet');
	});

	it('shows syncing during a run, then the last synced time', () => {
		todoistSyncStore.start();
		flushSync();
		expect(item()?.textContent?.trim()).toBe('Todoist syncing');

		todoistSyncStore.succeed({ ...PULL, finishedAt: new Date(2026, 10, 9, 8, 15).getTime() });
		flushSync();
		expect(item()?.textContent?.trim()).toBe('Todoist synced 08:15');
		expect(item()?.getAttribute('title')).toBeNull();
	});

	it('shows an error with its message as the tooltip', () => {
		todoistSyncStore.start();
		todoistSyncStore.fail('Could not reach Todoist. Check your connection and try again.');
		flushSync();

		expect(item()?.textContent?.trim()).toBe('Todoist sync error');
		expect(item()?.getAttribute('title')).toBe('Could not reach Todoist. Check your connection and try again.');
	});
});
