import { describe, it, expect } from 'vitest';
import {
	autoCycleDelay,
	autoSyncFailureMessage,
	formatClockTime,
	formatLogTime,
	hasAnchoredLine,
	isFirstRunDone,
	rateLimitWaitMs,
	syncStatusLabel,
} from '#lib/features/todoist-sync/sync-scheduler.logic.js';

describe('hasAnchoredLine', () => {
	it('is true for a note with a task line carrying a td- anchor', () => {
		expect(hasAnchoredLine('# Day\n- [ ] Call Bob 🆔 td-123\n')).toBe(true);
		expect(hasAnchoredLine('1. [x] Done 🆔 td-abc')).toBe(true);
	});

	it('is false for an empty note, plain text, a user id and a fenced anchor', () => {
		expect(hasAnchoredLine('')).toBe(false);
		expect(hasAnchoredLine('Talked about 🆔 td-123 today\n')).toBe(false);
		expect(hasAnchoredLine('- [ ] Mine 🆔 abc\n')).toBe(false);
		expect(hasAnchoredLine('```\n- [ ] Code 🆔 td-1\n```\n')).toBe(false);
	});
});

describe('isFirstRunDone', () => {
	it('is true when first_run_done is 1 or true', () => {
		expect(isFirstRunDone([{ key: 'first_run_done', value: '1' }])).toBe(true);
		expect(isFirstRunDone([{ key: 'sync_token', value: 'v2' }, { key: 'first_run_done', value: 'true' }])).toBe(true);
	});

	it('is false without the row or with any other value', () => {
		expect(isFirstRunDone([])).toBe(false);
		expect(isFirstRunDone([{ key: 'sync_token', value: 'v2' }])).toBe(false);
		expect(isFirstRunDone([{ key: 'first_run_done', value: '0' }])).toBe(false);
	});
});

describe('autoCycleDelay', () => {
	it('is zero when the gap since the last cycle passed and no rate limit holds', () => {
		expect(autoCycleDelay(100_000, 50_000, 0, 30_000)).toBe(0);
		expect(autoCycleDelay(100_000, Number.NEGATIVE_INFINITY, 0, 30_000)).toBe(0);
	});

	it('waits out the rest of the gap, or the rate limit when it ends later', () => {
		expect(autoCycleDelay(100_000, 90_000, 0, 30_000)).toBe(20_000);
		expect(autoCycleDelay(100_000, 90_000, 160_000, 30_000)).toBe(60_000);
	});
});

describe('rateLimitWaitMs', () => {
	it('uses retry_after seconds, else 60 seconds', () => {
		expect(rateLimitWaitMs(12)).toBe(12_000);
		expect(rateLimitWaitMs(undefined)).toBe(60_000);
	});
});

describe('autoSyncFailureMessage', () => {
	it('gives each failure kind its fixed message', () => {
		expect(autoSyncFailureMessage('invalid-token')).toBe(
			'Todoist automatic sync stopped: the API token is invalid. Update it in Settings > Todoist.',
		);
		expect(autoSyncFailureMessage('rate-limit')).toBe('Todoist rate limit reached. Automatic sync will retry later.');
		expect(autoSyncFailureMessage('unreachable')).toBe('Could not reach Todoist. Automatic sync will retry later.');
		expect(autoSyncFailureMessage('root-missing')).toBe(
			'The sync root project was not found in Todoist. Choose it again in Settings > Todoist.',
		);
		expect(autoSyncFailureMessage('error')).toBe('Todoist automatic sync failed. Details are in the log.');
	});
});

describe('formatClockTime', () => {
	it('formats a local time as HH:MM', () => {
		expect(formatClockTime(new Date(2026, 10, 9, 7, 5).getTime())).toBe('07:05');
		expect(formatClockTime(new Date(2026, 10, 9, 23, 59).getTime())).toBe('23:59');
	});
});

describe('formatLogTime', () => {
	it('formats a local date and time as YYYY-MM-DD HH:MM', () => {
		expect(formatLogTime(new Date(2026, 0, 3, 9, 7).getTime())).toBe('2026-01-03 09:07');
		expect(formatLogTime(new Date(2026, 10, 9, 23, 59).getTime())).toBe('2026-11-09 23:59');
	});
});

describe('syncStatusLabel', () => {
	it('says syncing while a run is in progress', () => {
		expect(syncStatusLabel({ status: 'syncing', lastSyncedAt: null, lastError: null })).toEqual({ text: 'Todoist syncing', title: null });
	});

	it('shows the error with its message as the title', () => {
		expect(syncStatusLabel({ status: 'error', lastSyncedAt: null, lastError: 'Could not reach Todoist.' })).toEqual({
			text: 'Todoist sync error',
			title: 'Could not reach Todoist.',
		});
	});

	it('shows the last synced time, or that it never synced', () => {
		const at = new Date(2026, 10, 9, 14, 30).getTime();
		expect(syncStatusLabel({ status: 'idle', lastSyncedAt: at, lastError: null })).toEqual({ text: 'Todoist synced 14:30', title: null });
		expect(syncStatusLabel({ status: 'idle', lastSyncedAt: null, lastError: null })).toEqual({ text: 'Todoist not synced yet', title: null });
	});
});
