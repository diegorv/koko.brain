import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockExists = vi.fn();
const mockMkdir = vi.fn();
const mockWriteTextFile = vi.fn();
const mockAppLogDir = vi.fn();
const mockOpenPath = vi.fn();

vi.mock('@tauri-apps/plugin-fs', () => ({
	exists: (...args: unknown[]) => mockExists(...args),
	mkdir: (...args: unknown[]) => mockMkdir(...args),
	writeTextFile: (...args: unknown[]) => mockWriteTextFile(...args),
}));

vi.mock('@tauri-apps/api/path', () => ({
	appLogDir: (...args: unknown[]) => mockAppLogDir(...args),
}));

vi.mock('@tauri-apps/plugin-opener', () => ({
	openPath: (...args: unknown[]) => mockOpenPath(...args),
}));

const mockInvoke = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
	invoke: (...args: unknown[]) => mockInvoke(...args),
}));

import {
	initLogSession,
	appendLog,
	flushLog,
	teardownLogSession,
	isLogSessionActive,
	openLogDir,
	startHeartbeat,
	stopHeartbeat,
	LOG_FLUSH_LINES,
	LOG_FLUSH_MS,
} from '#lib/utils/log.service.js';

const TEST_LOG_DIR = '/Users/test/Library/Logs/com.kokobrain.app';

/** Every line written so far, in order, across all batched writes. */
function writtenLines(): string[] {
	return mockWriteTextFile.mock.calls.flatMap((call) => String(call[1]).split('\n').filter(Boolean));
}

describe('log.service', () => {
	beforeEach(async () => {
		// Teardown writes the previous test's buffered lines; let that land before clearing the mocks.
		teardownLogSession();
		await flushLog();
		vi.clearAllMocks();
		mockAppLogDir.mockResolvedValue(TEST_LOG_DIR);
		mockInvoke.mockResolvedValue(null);
	});

	describe('initLogSession', () => {
		it('creates logs directory if it does not exist', async () => {
			mockExists.mockResolvedValue(false);
			mockMkdir.mockResolvedValue(undefined);

			await initLogSession();

			expect(mockAppLogDir).toHaveBeenCalled();
			expect(mockExists).toHaveBeenCalledWith(TEST_LOG_DIR);
			expect(mockMkdir).toHaveBeenCalledWith(TEST_LOG_DIR, { recursive: true });
			expect(isLogSessionActive()).toBe(true);
		});

		it('skips mkdir if logs directory already exists', async () => {
			mockExists.mockResolvedValue(true);

			await initLogSession();

			expect(mockMkdir).not.toHaveBeenCalled();
			expect(isLogSessionActive()).toBe(true);
		});

		it('handles appLogDir rejection gracefully', async () => {
			mockAppLogDir.mockRejectedValue(new Error('path error'));
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			await initLogSession();

			expect(isLogSessionActive()).toBe(false);
			consoleSpy.mockRestore();
		});

		it('handles mkdir rejection gracefully', async () => {
			mockExists.mockResolvedValue(false);
			mockMkdir.mockRejectedValue(new Error('mkdir error'));
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			await initLogSession();

			expect(isLogSessionActive()).toBe(false);
			consoleSpy.mockRestore();
		});

		it('is a no-op if session is already active', async () => {
			mockExists.mockResolvedValue(true);

			await initLogSession();
			await initLogSession();

			// appLogDir should only be called once (second call is no-op)
			expect(mockAppLogDir).toHaveBeenCalledTimes(1);
		});
	});

	describe('appendLog', () => {
		it('writes formatted log entry to file', async () => {
			mockExists.mockResolvedValue(true);
			mockWriteTextFile.mockResolvedValue(undefined);

			await initLogSession();
			appendLog('TEST', 'hello world');
			await flushLog();

			expect(mockWriteTextFile).toHaveBeenCalledTimes(1);
			const [path, content, options] = mockWriteTextFile.mock.calls[0];
			expect(path).toMatch(new RegExp(`^${TEST_LOG_DIR.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/\\d{4}-\\d{2}-\\d{2}_\\d{2}-\\d{2}-\\d{2}\\.log$`));
			expect(content).toMatch(/\n\[.*\] \[TEST\] hello world\n$/);
			expect(options).toEqual({ append: true });
		});

		it('serializes non-string arguments as JSON', async () => {
			mockExists.mockResolvedValue(true);
			mockWriteTextFile.mockResolvedValue(undefined);

			await initLogSession();
			appendLog('TEST', 'count:', 42);
			await flushLog();

			const [, content] = mockWriteTextFile.mock.calls[0];
			expect(content).toContain('[TEST] count: 42');
		});

		it('is a no-op when no session is active', async () => {
			appendLog('TEST', 'should not write');
			await flushLog();

			expect(mockWriteTextFile).not.toHaveBeenCalled();
		});

		it('handles writeTextFile rejection gracefully', async () => {
			mockExists.mockResolvedValue(true);
			mockWriteTextFile.mockRejectedValue(new Error('disk full'));
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			await initLogSession();
			appendLog('TEST', 'should fail');
			await flushLog();

			expect(consoleSpy).toHaveBeenCalled();
			// Session should still be active despite write failure
			expect(isLogSessionActive()).toBe(true);
			consoleSpy.mockRestore();
		});

		it('serializes concurrent writes in order', async () => {
			mockExists.mockResolvedValue(true);
			mockWriteTextFile.mockResolvedValue(undefined);

			await initLogSession();
			appendLog('TEST', 'first');
			appendLog('TEST', 'second');
			appendLog('TEST', 'third');
			await flushLog();

			expect(mockWriteTextFile).toHaveBeenCalledTimes(1);
			const testLines = writtenLines().filter((l) => l.includes('[TEST]'));
			expect(testLines.map((l) => l.replace(/^.*\[TEST\] /, ''))).toEqual(['first', 'second', 'third']);
		});

		it('logs the build flavour once when the session starts', async () => {
			mockExists.mockResolvedValue(true);
			mockWriteTextFile.mockResolvedValue(undefined);

			await initLogSession();
			await initLogSession();
			await flushLog();

			const session = writtenLines().filter((l) => l.includes('[SESSION]'));
			expect(session).toHaveLength(1);
			expect(session[0]).toMatch(/\[SESSION\] build dev=(true|false)$/);
		});
	});

	describe('buffered writer', () => {
		beforeEach(() => {
			vi.useFakeTimers();
			mockExists.mockResolvedValue(true);
			mockWriteTextFile.mockResolvedValue(undefined);
		});

		afterEach(() => {
			teardownLogSession();
			vi.useRealTimers();
		});

		it('coalesces the lines appended inside the flush window into one write', async () => {
			await initLogSession();
			for (let i = 0; i < 10; i++) appendLog('TEST', `line ${i}`);

			// Nothing is written until the window closes.
			expect(mockWriteTextFile).not.toHaveBeenCalled();

			await vi.advanceTimersByTimeAsync(LOG_FLUSH_MS);

			expect(mockWriteTextFile).toHaveBeenCalledTimes(1);
			const lines = writtenLines().filter((l) => l.includes('[TEST]'));
			expect(lines).toHaveLength(10);
			expect(lines[9]).toContain('line 9');
		});

		it('writes at once when the buffer reaches the line cap', async () => {
			await initLogSession();
			await flushLog();
			mockWriteTextFile.mockClear();
			for (let i = 0; i < LOG_FLUSH_LINES; i++) appendLog('TEST', `line ${i}`);
			await Promise.resolve();

			expect(mockWriteTextFile).toHaveBeenCalledTimes(1);
			expect(writtenLines().filter((l) => l.includes('[TEST]'))).toHaveLength(LOG_FLUSH_LINES);
		});

		it('teardown flushes the buffered lines to the session file', async () => {
			await initLogSession();
			appendLog('TEST', 'pending');
			expect(mockWriteTextFile).not.toHaveBeenCalled();

			teardownLogSession();
			await flushLog();

			expect(mockWriteTextFile).toHaveBeenCalledTimes(1);
			expect(String(mockWriteTextFile.mock.calls[0][0])).toMatch(/\.log$/);
			expect(writtenLines().some((l) => l.includes('[TEST] pending'))).toBe(true);
		});
	});

	describe('teardownLogSession', () => {
		it('clears active session', async () => {
			mockExists.mockResolvedValue(true);

			await initLogSession();
			expect(isLogSessionActive()).toBe(true);

			teardownLogSession();
			expect(isLogSessionActive()).toBe(false);
		});

		it('causes appendLog to be a no-op', async () => {
			mockExists.mockResolvedValue(true);
			mockWriteTextFile.mockResolvedValue(undefined);

			await initLogSession();
			teardownLogSession();
			appendLog('TEST', 'after teardown');
			await flushLog();

			expect(writtenLines().some((l) => l.includes('after teardown'))).toBe(false);
		});
	});

	describe('openLogDir', () => {
		it('opens the system log directory', async () => {
			mockExists.mockResolvedValue(true);
			mockOpenPath.mockResolvedValue(undefined);

			await openLogDir();

			expect(mockAppLogDir).toHaveBeenCalled();
			expect(mockOpenPath).toHaveBeenCalledWith(TEST_LOG_DIR);
		});

		it('creates the directory if it does not exist before opening', async () => {
			mockExists.mockResolvedValue(false);
			mockMkdir.mockResolvedValue(undefined);
			mockOpenPath.mockResolvedValue(undefined);

			await openLogDir();

			expect(mockMkdir).toHaveBeenCalledWith(TEST_LOG_DIR, { recursive: true });
			expect(mockOpenPath).toHaveBeenCalledWith(TEST_LOG_DIR);
		});

		it('propagates error when openPath rejects', async () => {
			mockExists.mockResolvedValue(true);
			mockOpenPath.mockRejectedValue(new Error('cannot open'));

			await expect(openLogDir()).rejects.toThrow('cannot open');
		});

		it('propagates error when appLogDir rejects', async () => {
			// Reset cached resolvedLogDir by tearing down
			teardownLogSession();
			mockAppLogDir.mockRejectedValue(new Error('path unavailable'));

			await expect(openLogDir()).rejects.toThrow('path unavailable');
		});
	});

	describe('heartbeat', () => {
		it('initLogSession does NOT auto-start the heartbeat (opt-in via settings.debugHeartbeat)', async () => {
			vi.useFakeTimers();
			try {
				mockExists.mockResolvedValue(true);
				mockWriteTextFile.mockResolvedValue(undefined);

				await initLogSession();
				expect(isLogSessionActive()).toBe(true);

				// Advance plenty of time — heartbeat should NOT fire without an
				// explicit startHeartbeat() call (the lifecycle wires this to
				// settings.debugHeartbeat at boot, and the troubleshooting
				// section toggles it live).
				vi.advanceTimersByTime(2000);
				await flushLog();

				const hbWrites = mockWriteTextFile.mock.calls.filter(
					(call) => typeof call[1] === 'string' && (call[1] as string).includes('[HB]'),
				);
				expect(hbWrites).toHaveLength(0);
			} finally {
				vi.useRealTimers();
				teardownLogSession();
			}
		});

		it('startHeartbeat after initLogSession ticks every 250 ms', async () => {
			vi.useFakeTimers();
			try {
				mockExists.mockResolvedValue(true);
				mockWriteTextFile.mockResolvedValue(undefined);

				await initLogSession();
				startHeartbeat();

				vi.advanceTimersByTime(500);
				await flushLog();

				const hbLines = writtenLines().filter((l) => l.includes('[HB]'));
				expect(hbLines.length).toBeGreaterThanOrEqual(2);
				expect(hbLines[0]).toMatch(/\[HB\] alive/);
			} finally {
				vi.useRealTimers();
				teardownLogSession();
			}
		});

		it('teardownLogSession stops the heartbeat', async () => {
			vi.useFakeTimers();
			try {
				mockExists.mockResolvedValue(true);
				mockWriteTextFile.mockResolvedValue(undefined);

				await initLogSession();
				startHeartbeat();
				vi.advanceTimersByTime(500);
				await flushLog();
				const callsAtTeardown = mockWriteTextFile.mock.calls.length;

				teardownLogSession();
				expect(isLogSessionActive()).toBe(false);

				// After teardown, advancing time should yield no further HB writes.
				vi.advanceTimersByTime(2000);
				await flushLog();
				expect(mockWriteTextFile.mock.calls.length).toBe(callsAtTeardown);
			} finally {
				vi.useRealTimers();
			}
		});

		it('startHeartbeat is idempotent (second call does not double-tick)', async () => {
			vi.useFakeTimers();
			try {
				mockExists.mockResolvedValue(true);
				mockWriteTextFile.mockResolvedValue(undefined);

				await initLogSession();
				startHeartbeat();
				// Second call must be a no-op (else we'd see two writes per tick).
				startHeartbeat();
				vi.advanceTimersByTime(250);
				await flushLog();

				const hbCount = writtenLines().filter((l) => l.includes('[HB]')).length;
				expect(hbCount).toBe(1);
			} finally {
				vi.useRealTimers();
				teardownLogSession();
			}
		});

		it('starts and stops the native main-thread heartbeat with the JS one', async () => {
			mockExists.mockResolvedValue(true);
			await initLogSession();

			startHeartbeat();
			startHeartbeat();
			stopHeartbeat();
			stopHeartbeat();

			expect(mockInvoke.mock.calls).toEqual([
				['set_main_thread_heartbeat', { enabled: true }],
				['set_main_thread_heartbeat', { enabled: false }],
			]);
		});

		it('a failed native heartbeat call is logged, not thrown', async () => {
			mockExists.mockResolvedValue(true);
			mockInvoke.mockRejectedValue(new Error('no ipc'));
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			await initLogSession();

			expect(() => startHeartbeat()).not.toThrow();
			await Promise.resolve();
			await Promise.resolve();

			expect(consoleSpy).toHaveBeenCalledWith('Failed to toggle the native heartbeat:', expect.any(Error));
			stopHeartbeat();
			consoleSpy.mockRestore();
		});

		it('stopHeartbeat is idempotent (callable when not running)', () => {
			// No init — heartbeat was never started. Should not throw.
			expect(() => stopHeartbeat()).not.toThrow();
			expect(() => stopHeartbeat()).not.toThrow();
		});

		it('heartbeat tick is a no-op when log session is torn down mid-tick', async () => {
			vi.useFakeTimers();
			try {
				mockExists.mockResolvedValue(true);
				mockWriteTextFile.mockResolvedValue(undefined);

				await initLogSession();
				teardownLogSession();
				// At this point heartbeat is stopped. But even if a stale tick
				// were to fire (shouldn't), appendLog short-circuits when no
				// session is active. Belt-and-braces.
				vi.advanceTimersByTime(2000);
				await flushLog();
				const hbWrites = mockWriteTextFile.mock.calls.filter(
					(call) => typeof call[1] === 'string' && (call[1] as string).includes('[HB]'),
				);
				expect(hbWrites.length).toBe(0);
			} finally {
				vi.useRealTimers();
			}
		});
	});
});
