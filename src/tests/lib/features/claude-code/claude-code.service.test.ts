import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('#lib/utils/debug.js', () => ({ debug: vi.fn(), error: vi.fn() }));

import { invoke } from '@tauri-apps/api/core';
import { error } from '#lib/utils/debug.js';
import { checkClaudeStatus } from '#lib/features/claude-code/claude-code.service.js';

describe('checkClaudeStatus', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('passes the override path and returns the Rust status', async () => {
		const status = { installed: true, path: '/opt/claude', version: '2.1.325 (Claude Code)', error: null };
		vi.mocked(invoke).mockResolvedValue(status);

		await expect(checkClaudeStatus('/opt/claude')).resolves.toEqual(status);
		expect(invoke).toHaveBeenCalledWith('claude_status', { binaryPath: '/opt/claude' });
	});

	it('sends an empty override as is, so Rust runs the automatic lookup', async () => {
		const status = { installed: false, path: null, version: null, error: 'not found' };
		vi.mocked(invoke).mockResolvedValue(status);

		await expect(checkClaudeStatus('')).resolves.toEqual(status);
		expect(invoke).toHaveBeenCalledWith('claude_status', { binaryPath: '' });
	});

	it('logs and rethrows an IPC failure', async () => {
		vi.mocked(invoke).mockRejectedValue(new Error('ipc down'));

		await expect(checkClaudeStatus('')).rejects.toThrow('ipc down');
		expect(error).toHaveBeenCalledWith('CLAUDE', 'claude_status failed:', expect.any(Error));
	});
});
