import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }));
vi.mock('#lib/utils/debug.js', () => ({ debug: vi.fn(), error: vi.fn() }));

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { ClaudeEventPayload } from '#lib/contracts/index.js';
import { error } from '#lib/utils/debug.js';
import { checkClaudeStatus, onClaudeEvent } from '#lib/features/claude-code/claude-code.service.js';
import { claudeStatusStore } from '#lib/features/claude-code/claude-status.store.svelte.js';

describe('onClaudeEvent', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('listens on claude-event and hands the handler each payload', async () => {
		const unlisten = vi.fn();
		let deliver: ((event: { payload: ClaudeEventPayload }) => void) | undefined;
		vi.mocked(listen).mockImplementation((_name, cb) => {
			deliver = cb as typeof deliver;
			return Promise.resolve(unlisten);
		});
		const received: ClaudeEventPayload[] = [];

		await expect(onClaudeEvent((p) => received.push(p))).resolves.toBe(unlisten);
		deliver!({ payload: { runId: 'r1', event: { type: 'TextDelta', text: 'hi' } } });
		deliver!({ payload: { runId: 'r1', event: { type: 'Done', exitCode: 0 } } });

		expect(vi.mocked(listen).mock.calls[0][0]).toBe('claude-event');
		expect(received).toEqual([
			{ runId: 'r1', event: { type: 'TextDelta', text: 'hi' } },
			{ runId: 'r1', event: { type: 'Done', exitCode: 0 } },
		]);
	});

	it('rejects when the listener cannot be registered', async () => {
		vi.mocked(listen).mockRejectedValue(new Error('no window'));

		await expect(onClaudeEvent(() => {})).rejects.toThrow('no window');
	});
});

describe('checkClaudeStatus', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		claudeStatusStore.reset();
	});

	it('passes the override path and the refresh flag, and records the Rust status', async () => {
		const status = { installed: true, path: '/opt/claude', version: '2.1.325 (Claude Code)', error: null };
		vi.mocked(invoke).mockResolvedValue(status);

		await expect(checkClaudeStatus('/opt/claude', true)).resolves.toEqual(status);
		expect(invoke).toHaveBeenCalledWith('claude_status', { binaryPath: '/opt/claude', refreshEnv: true });
		expect(claudeStatusStore.status).toEqual(status);
		expect(claudeStatusStore.unavailable).toBe(false);
	});

	it('sends an empty override as is, so Rust runs the automatic lookup', async () => {
		const status = { installed: false, path: null, version: null, error: 'not found' };
		vi.mocked(invoke).mockResolvedValue(status);

		await expect(checkClaudeStatus('', false)).resolves.toEqual(status);
		expect(invoke).toHaveBeenCalledWith('claude_status', { binaryPath: '', refreshEnv: false });
		expect(claudeStatusStore.status).toEqual(status);
		expect(claudeStatusStore.unavailable).toBe(true);
	});

	it('logs and rethrows an IPC failure, and marks the check failed', async () => {
		vi.mocked(invoke).mockRejectedValue(new Error('ipc down'));

		await expect(checkClaudeStatus('', false)).rejects.toThrow('ipc down');
		expect(error).toHaveBeenCalledWith('CLAUDE', 'claude_status failed:', expect.any(Error));
		expect(claudeStatusStore.checkFailed).toBe(true);
		expect(claudeStatusStore.unavailable).toBe(true);
	});
});
