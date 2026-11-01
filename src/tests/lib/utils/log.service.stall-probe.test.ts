// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockWriteTextFile = vi.fn();

vi.mock('@tauri-apps/plugin-fs', () => ({
	exists: () => Promise.resolve(true),
	mkdir: () => Promise.resolve(),
	writeTextFile: (...args: unknown[]) => mockWriteTextFile(...args),
}));

vi.mock('@tauri-apps/api/path', () => ({
	appLogDir: () => Promise.resolve('/logs'),
}));

vi.mock('@tauri-apps/plugin-opener', () => ({
	openPath: () => Promise.resolve(),
}));

import {
	initLogSession,
	flushLog,
	teardownLogSession,
	startHeartbeat,
	stopHeartbeat,
} from '#lib/utils/log.service.js';

/** Log lines written so far, in order. */
function written(): string[] {
	return mockWriteTextFile.mock.calls.map((call) => String(call[1]));
}

describe('log.service stall probe', () => {
	beforeEach(async () => {
		vi.useFakeTimers();
		mockWriteTextFile.mockReset();
		mockWriteTextFile.mockResolvedValue(undefined);
		teardownLogSession();
		await initLogSession();
	});

	afterEach(() => {
		teardownLogSession();
		document.body.innerHTML = '';
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	it('logs a stall line with the gap when a tick arrives late', async () => {
		startHeartbeat();
		vi.advanceTimersByTime(250);
		// The event loop is blocked: wall clock moves, no timer runs.
		vi.setSystemTime(Date.now() + 800);
		vi.advanceTimersByTime(250);
		await flushLog();

		const stalls = written().filter((l) => l.includes('[HB] stall'));
		expect(stalls).toHaveLength(1);
		expect(stalls[0]).toMatch(/\[HB\] stall 1050ms/);
	});

	it('does not report background timer throttling as a stall', async () => {
		let visibility = 'visible';
		vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility as DocumentVisibilityState);
		startHeartbeat();
		vi.advanceTimersByTime(250);

		visibility = 'hidden';
		document.dispatchEvent(new Event('visibilitychange'));
		// Throttled in the background: the next tick arrives seconds late.
		vi.setSystemTime(Date.now() + 5000);
		vi.advanceTimersByTime(250);
		visibility = 'visible';
		document.dispatchEvent(new Event('visibilitychange'));
		vi.advanceTimersByTime(250);
		await flushLog();

		expect(written().some((l) => l.includes('stall'))).toBe(false);
	});

	it('keeps logging alive on punctual ticks', async () => {
		startHeartbeat();
		vi.advanceTimersByTime(750);
		await flushLog();

		expect(written().filter((l) => l.includes('[HB] alive'))).toHaveLength(3);
		expect(written().some((l) => l.includes('stall'))).toBe(false);
	});

	it('logs each click with its target label and time to next paint', async () => {
		document.body.innerHTML = '<nav><button aria-label="Files"><svg></svg></button></nav>';
		startHeartbeat();

		document.querySelector('svg')!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
		vi.advanceTimersByTime(40);
		await flushLog();

		const clicks = written().filter((l) => l.includes('[NAV]'));
		expect(clicks).toHaveLength(1);
		expect(clicks[0]).toMatch(/\[NAV\] click "Files" -> next paint \d+ms/);
	});

	it('labels an unlabelled target by tag and role, never by its text', async () => {
		document.body.innerHTML = '<div role="button">  Daily   notes  </div>';
		startHeartbeat();

		document.querySelector('div')!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
		vi.advanceTimersByTime(40);
		await flushLog();

		const line = written().find((l) => l.includes('[NAV]'));
		expect(line).toMatch(/click "div\[role=button\]"/);
		expect(line).not.toContain('Daily');
	});

	it('does not write note text to the log on an editor click', async () => {
		document.body.innerHTML = '<div class="cm-content" role="textbox"><div class="cm-line">secret diary entry</div></div>';
		startHeartbeat();

		document.querySelector('.cm-line')!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
		vi.advanceTimersByTime(40);
		await flushLog();

		const line = written().find((l) => l.includes('[NAV]'));
		expect(line).toMatch(/click "div\[role=textbox\]"/);
		expect(line).not.toContain('secret');
	});

	it('stops logging clicks after stopHeartbeat', async () => {
		document.body.innerHTML = '<button>Files</button>';
		startHeartbeat();
		stopHeartbeat();

		document.querySelector('button')!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
		vi.advanceTimersByTime(40);
		await flushLog();

		expect(written().some((l) => l.includes('[NAV]'))).toBe(false);
	});
});
