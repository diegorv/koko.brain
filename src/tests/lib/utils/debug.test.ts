import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('$lib/utils/log.service', () => ({
	appendLog: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn().mockResolvedValue(vi.fn()),
}));

import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { debug, error, logProcessMemory, setTauriDebugMode, stopTauriDebugListener, timeAsync, timeSync } from '$lib/utils/debug';
import { appendLog } from '$lib/utils/log.service';

describe('debug', () => {
	let consoleSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		settingsStore.reset();
		vi.mocked(appendLog).mockClear();
	});

	afterEach(() => {
		consoleSpy.mockRestore();
	});

	it('does nothing when debugMode is false', () => {
		debug('TEST', 'hello', 42);

		expect(consoleSpy).not.toHaveBeenCalled();
	});

	it('logs with tag prefix when debugMode is true', () => {
		settingsStore.updateDebugMode(true);

		debug('WATCHER', 'refresh fired', { paths: ['/a'] });

		expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[WATCHER]'), 'refresh fired', { paths: ['/a'] });
	});

	it('passes multiple arguments through', () => {
		settingsStore.updateDebugMode(true);

		debug('FS', 'renamed:', '/old', '→', '/new');

		expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[FS]'), 'renamed:', '/old', '→', '/new');
	});

	it('calls appendLog when debugLogToFile is true', () => {
		settingsStore.updateDebugLogToFile(true);

		debug('TEST', 'hello', 42);

		expect(appendLog).toHaveBeenCalledWith('TEST', 'hello', 42);
	});

	it('calls appendLog even when debugMode is false', () => {
		settingsStore.updateDebugLogToFile(true);

		debug('TEST', 'file only');

		expect(appendLog).toHaveBeenCalledWith('TEST', 'file only');
		expect(consoleSpy).not.toHaveBeenCalled();
	});

	it('does not call appendLog when debugLogToFile is false', () => {
		settingsStore.updateDebugMode(true);

		debug('TEST', 'console only');

		expect(appendLog).not.toHaveBeenCalled();
	});
});

describe('error', () => {
	let consoleSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		settingsStore.reset();
		vi.mocked(appendLog).mockClear();
	});

	afterEach(() => {
		consoleSpy.mockRestore();
	});

	it('always logs to console.error regardless of debugMode', () => {
		error('TEST', 'something broke', 42);

		expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[TEST]'), 'something broke', 42);
	});

	it('logs even when debugMode is false', () => {
		settingsStore.updateDebugMode(false);

		error('FS', 'disk error');

		expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[FS]'), 'disk error');
	});

	it('calls appendLog with ERROR: prefix when debugLogToFile is true', () => {
		settingsStore.updateDebugLogToFile(true);

		error('EDITOR', 'save failed', { code: 'ENOENT' });

		expect(appendLog).toHaveBeenCalledWith('ERROR:EDITOR', 'save failed', { code: 'ENOENT' });
	});

	it('does not call appendLog when debugLogToFile is false', () => {
		error('TEST', 'console only');

		expect(appendLog).not.toHaveBeenCalled();
	});

	it('passes multiple arguments through', () => {
		error('ENCRYPTION', 'Failed to encrypt:', '/path/file.md', new Error('denied'));

		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining('[ENCRYPTION]'),
			'Failed to encrypt:',
			'/path/file.md',
			expect.any(Error),
		);
	});
});

describe('setTauriDebugMode', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset listener state
		stopTauriDebugListener();
	});

	it('calls Rust command and starts listener when enabling', async () => {
		vi.mocked(invoke).mockResolvedValue(undefined);

		await setTauriDebugMode(true);

		expect(invoke).toHaveBeenCalledWith('set_tauri_debug_mode', { enabled: true });
		expect(listen).toHaveBeenCalledWith('tauri-debug-log', expect.any(Function));
	});

	it('calls Rust command and stops listener when disabling', async () => {
		vi.mocked(invoke).mockResolvedValue(undefined);

		await setTauriDebugMode(false);

		expect(invoke).toHaveBeenCalledWith('set_tauri_debug_mode', { enabled: false });
	});

	it('does not start listener if Rust command fails', async () => {
		vi.mocked(invoke).mockRejectedValue(new Error('fail'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await setTauriDebugMode(true);

		expect(listen).not.toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	it('does not register duplicate listeners', async () => {
		vi.mocked(invoke).mockResolvedValue(undefined);

		await setTauriDebugMode(true);
		await setTauriDebugMode(true);

		// listen should only be called once (reentry guard)
		expect(listen).toHaveBeenCalledTimes(1);
	});
});

describe('timeAsync', () => {
	let consoleSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		settingsStore.reset();
	});

	afterEach(() => {
		consoleSpy.mockRestore();
	});

	it('returns the result of the wrapped function', async () => {
		const result = await timeAsync('TEST', 'op', async () => 42);

		expect(result).toBe(42);
	});

	it('logs elapsed time when debug mode is enabled', async () => {
		settingsStore.updateDebugMode(true);

		await timeAsync('FS', 'loadTree', async () => 'done');

		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining('[FS]'),
			expect.stringMatching(/loadTree completed in \d+(\.\d+)?ms/),
		);
	});

	it('does not log when debug mode is disabled', async () => {
		await timeAsync('TEST', 'op', async () => null);

		expect(consoleSpy).not.toHaveBeenCalled();
	});
});

describe('timeSync', () => {
	let consoleSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		settingsStore.reset();
	});

	afterEach(() => {
		consoleSpy.mockRestore();
	});

	it('returns the result of the wrapped function', () => {
		const result = timeSync('TEST', 'op', () => 'hello');

		expect(result).toBe('hello');
	});

	it('logs elapsed time when debug mode is enabled', () => {
		settingsStore.updateDebugMode(true);

		timeSync('TAGS', 'buildIndex', () => {});

		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining('[TAGS]'),
			expect.stringMatching(/buildIndex completed in \d+(\.\d+)?ms/),
		);
	});

	it('does not log when debug mode is disabled', () => {
		timeSync('TEST', 'op', () => null);

		expect(consoleSpy).not.toHaveBeenCalled();
	});
});

describe('logProcessMemory', () => {
	let consoleSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		settingsStore.reset();
		vi.mocked(invoke).mockReset();
	});

	afterEach(() => {
		consoleSpy.mockRestore();
	});

	it('logs RSS in MB when debug mode is enabled', async () => {
		settingsStore.updateDebugMode(true);
		vi.mocked(invoke).mockResolvedValue(104857600); // 100 MB

		await logProcessMemory();

		expect(invoke).toHaveBeenCalledWith('get_process_memory');
		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining('[MEMORY]'),
			'Process RSS: 100.0 MB',
		);
	});

	it('does not log when debug mode is disabled', async () => {
		vi.mocked(invoke).mockResolvedValue(104857600);

		await logProcessMemory();

		expect(invoke).toHaveBeenCalledWith('get_process_memory');
		expect(consoleSpy).not.toHaveBeenCalled();
	});

	it('handles invoke failure gracefully', async () => {
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.mocked(invoke).mockRejectedValue(new Error('not available'));

		await logProcessMemory();

		expect(errorSpy).toHaveBeenCalledWith(
			expect.stringContaining('[MEMORY]'),
			'Failed to get process memory:',
			expect.any(Error),
		);
		errorSpy.mockRestore();
	});
});
