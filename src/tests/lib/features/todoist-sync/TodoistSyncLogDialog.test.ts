// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import TodoistSyncLogDialog from '#lib/features/todoist-sync/TodoistSyncLogDialog.svelte';
import { cycleLogEntry } from '#lib/features/todoist-sync/cycle-log.logic.js';
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

	describe('cycle rows', () => {
		const run = (outcome: string, startedAt: number) => ({
			mode: 'auto' as const,
			trigger: 'interval' as const,
			startedAt,
			durationMs: 40,
			outcome,
			counts: null,
			skipped: null,
			commands: {},
			tokenAdvanced: false,
		});
		const cycleRow = (id: number, outcome: string, at: number) => ({ id, createdAt: at, ...cycleLogEntry(run(outcome, at), null) });
		const rows = () => [...document.querySelectorAll('[data-sync-log-entry]')].map((row) => [...row.querySelectorAll('td')].map((cell) => cell.textContent));
		const filter = (name: string) => {
			(document.querySelector(`[data-sync-log-filter="${name}"]`) as HTMLButtonElement).click();
			flushSync();
		};

		beforeEach(() => {
			todoistSyncStore.openLog([
				cycleRow(3, 'unreachable', new Date(2026, 10, 10, 3, 5).getTime()),
				{ id: 2, createdAt: new Date(2026, 10, 10, 3, 1).getTime(), kind: 'stale', anchor: null, message: 'Todoist/Work.md changed' },
				cycleRow(1, 'ok', new Date(2026, 10, 10, 3, 0).getTime()),
			]);
			flushSync();
		});

		it('shows the summary of a cycle row instead of its stored record', () => {
			expect(rows()).toEqual([
				['2026-11-10 03:05', 'cycle', '', 'Automatic (interval) failed (unreachable) in 40 ms; sync_token kept'],
				['2026-11-10 03:01', 'stale', '', 'Todoist/Work.md changed'],
				['2026-11-10 03:00', 'cycle', '', 'Automatic (interval) ok in 40 ms; sync_token kept'],
			]);
		});

		it('shows the newest cycle summary at the top', () => {
			expect(document.querySelector('[data-sync-log-latest-cycle]')?.textContent).toBe(
				'Last cycle 2026-11-10 03:05: Automatic (interval) failed (unreachable) in 40 ms; sync_token kept',
			);
		});

		it('filters to cycles, to events, and back to all', () => {
			expect(document.querySelector('[data-sync-log-filter="all"]')?.getAttribute('aria-pressed')).toBe('true');

			filter('cycles');
			expect(rows().map((r) => r[1])).toEqual(['cycle', 'cycle']);
			expect(document.querySelector('[data-sync-log-filter="cycles"]')?.getAttribute('aria-pressed')).toBe('true');

			filter('events');
			expect(rows().map((r) => r[1])).toEqual(['stale']);

			filter('all');
			expect(rows()).toHaveLength(3);
		});

		it('says so when the filter keeps no row, and shows no summary without a cycle row', () => {
			todoistSyncStore.openLog([{ id: 1, createdAt: 0, kind: 'stale', anchor: null, message: 'x' }]);
			flushSync();
			filter('cycles');

			expect(rows()).toEqual([]);
			expect(document.querySelector('[data-sync-log-empty]')?.textContent).toBe('No entries match this filter.');
			expect(document.querySelector('[data-sync-log-latest-cycle]')).toBeNull();
		});
	});

	it('closes through the store when dismissed with Escape', () => {
		todoistSyncStore.openLog([]);
		flushSync();

		document.querySelector('[data-todoist-sync-log]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		flushSync();

		expect(todoistSyncStore.logOpen).toBe(false);
	});
});
