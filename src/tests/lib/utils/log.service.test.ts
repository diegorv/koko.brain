import { describe, it, expect, vi, beforeEach } from 'vitest';

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

import { initLogSession, appendLog, flushLog, teardownLogSession, isLogSessionActive, openLogDir } from '$lib/utils/log.service';

const TEST_LOG_DIR = '/Users/test/Library/Logs/com.kokobrain.app';

describe('log.service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		teardownLogSession();
		mockAppLogDir.mockResolvedValue(TEST_LOG_DIR);
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
			expect(content).toMatch(/^\[.*\] \[TEST\] hello world\n$/);
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

			expect(mockWriteTextFile).toHaveBeenCalledTimes(3);
			expect(mockWriteTextFile.mock.calls[0][1]).toContain('first');
			expect(mockWriteTextFile.mock.calls[1][1]).toContain('second');
			expect(mockWriteTextFile.mock.calls[2][1]).toContain('third');
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

			expect(mockWriteTextFile).not.toHaveBeenCalled();
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
});
