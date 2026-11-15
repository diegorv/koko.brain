import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }));
// The editor's save writes through plugin-fs, whose own `invoke` import the core mock does not reach.
vi.mock('@tauri-apps/plugin-fs', () => ({ writeTextFile: vi.fn() }));
vi.mock('#lib/utils/debug.js', () => ({ debug: vi.fn(), error: vi.fn() }));

import { invoke } from '@tauri-apps/api/core';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { claudeStore } from '#lib/features/claude-code/claude.store.svelte.js';
import { attachActiveNote, newChat, resetClaude, sendPrompt, stop } from '#lib/features/claude-code/claude.service.js';

const invoked = () => vi.mocked(invoke).mock.calls.map(([cmd]) => cmd);
const runTurnRequest = () => {
	const call = vi.mocked(invoke).mock.calls.find(([cmd]) => cmd === 'claude_run_turn');
	return (call?.[1] as { request: Record<string, unknown> } | undefined)?.request;
};

/** Answers `claude_run_turn` with `runId`, everything else with null. */
function answerRunTurn(runId = 'r1') {
	vi.mocked(invoke).mockImplementation(async (cmd: string) => (cmd === 'claude_run_turn' ? runId : null));
}

beforeEach(() => {
	vi.resetAllMocks();
	claudeStore.reset();
	editorStore.reset();
	settingsStore.reset();
	vaultStore._reset();
	vaultStore.open('/vault/');
});

describe('sendPrompt', () => {
	it('sends the text unchanged with the vault root, the notes and no session for a new chat', async () => {
		answerRunTurn();
		settingsStore.updateClaudeCode({ binaryPath: '/opt/claude' });
		claudeStore.addContextNote('Notes/a.md');

		await sendPrompt('/review  - [ ] keep spaces ');

		expect(runTurnRequest()).toEqual({
			vaultPath: '/vault',
			prompt: '/review  - [ ] keep spaces ',
			resumeSessionId: undefined,
			contextNotePaths: ['Notes/a.md'],
			binaryPath: '/opt/claude',
		});
		expect(claudeStore.runId).toBe('r1');
		expect(claudeStore.isRunning).toBe(true);
		expect(claudeStore.messages[0]).toEqual({ role: 'user', text: '/review  - [ ] keep spaces ' });
	});

	it('sends no notes when none are attached, to work on the vault as a whole', async () => {
		answerRunTurn();
		await sendPrompt('what is in this vault?');
		expect(runTurnRequest()?.contextNotePaths).toEqual([]);
	});

	it('resumes the session of the last Result', async () => {
		answerRunTurn('r1');
		await sendPrompt('first');
		claudeStore.receive({ runId: 'r1', event: { type: 'Result', sessionId: 's1', text: 'ok', isError: false, costUsd: null, numTurns: 1 } });
		claudeStore.receive({ runId: 'r1', event: { type: 'Done', exitCode: 0 } });

		vi.mocked(invoke).mockClear();
		answerRunTurn('r2');
		await sendPrompt('second');
		expect(runTurnRequest()?.resumeSessionId).toBe('s1');
		expect(claudeStore.runId).toBe('r2');
	});

	it('resumes the session of the Init when the turn ended without a Result', async () => {
		answerRunTurn('r1');
		await sendPrompt('first');
		claudeStore.receive({ runId: 'r1', event: { type: 'Init', sessionId: 's1', model: 'opus', slashCommands: [], skills: [] } });
		claudeStore.receive({ runId: 'r1', event: { type: 'Done', exitCode: null } });

		vi.mocked(invoke).mockClear();
		answerRunTurn('r2');
		await sendPrompt('second');
		expect(runTurnRequest()?.resumeSessionId).toBe('s1');
	});

	it('saves dirty tabs before starting the turn', async () => {
		editorStore.addTab({ path: '/vault/a.md', name: 'a.md', content: 'edited', savedContent: 'old' });

		let savedBeforeRun = false;
		vi.mocked(invoke).mockImplementation(async (cmd: string) => {
			if (cmd === 'claude_run_turn') savedBeforeRun = vi.mocked(writeTextFile).mock.calls.length === 1;
			return cmd === 'claude_run_turn' ? 'r1' : null;
		});

		await sendPrompt('fix a');

		expect(writeTextFile).toHaveBeenCalledWith('/vault/a.md', 'edited');
		expect(savedBeforeRun).toBe(true);
		expect(editorStore.tabs[0].savedContent).toBe('edited');
	});

	it('does not start the turn when a dirty tab fails to save', async () => {
		answerRunTurn();
		vi.mocked(writeTextFile).mockRejectedValueOnce(new Error('disk full'));
		editorStore.addTab({ path: '/vault/a.md', name: 'a.md', content: 'edited', savedContent: 'old' });

		await expect(sendPrompt('fix a')).rejects.toThrow('Could not save /vault/a.md');
		expect(invoked()).not.toContain('claude_run_turn');
		expect(claudeStore.status).toBe('error');
		expect(claudeStore.error).toContain('Could not save /vault/a.md');
	});

	it('shows a failed claude_run_turn inline and rethrows it', async () => {
		vi.mocked(invoke).mockRejectedValue('a turn is already running for this vault');

		await expect(sendPrompt('hi')).rejects.toBe('a turn is already running for this vault');
		expect(claudeStore.status).toBe('error');
		expect(claudeStore.error).toBe('a turn is already running for this vault');
		expect(claudeStore.isRunning).toBe(false);
	});

	it('replays events that arrived before claude_run_turn returned', async () => {
		vi.mocked(invoke).mockImplementation(async (cmd: string) => {
			if (cmd !== 'claude_run_turn') return null;
			claudeStore.receive({ runId: 'r1', event: { type: 'Error', message: 'spawn failed: no such file' } });
			claudeStore.receive({ runId: 'r1', event: { type: 'Done', exitCode: null } });
			return 'r1';
		});

		await sendPrompt('hi');
		expect(claudeStore.status).toBe('error');
		expect(claudeStore.error).toBe('spawn failed: no such file');
		expect(claudeStore.runId).toBeNull();
	});

	it('does nothing for blank text or while a turn runs', async () => {
		answerRunTurn();
		await sendPrompt('   ');
		expect(invoke).not.toHaveBeenCalled();
		expect(claudeStore.messages).toEqual([]);

		await sendPrompt('first');
		vi.mocked(invoke).mockClear();
		await sendPrompt('second');
		expect(invoke).not.toHaveBeenCalled();
		expect(claudeStore.messages.filter((m) => m.role === 'user')).toHaveLength(1);
	});

	it('fails inline without a vault', async () => {
		vaultStore._reset();
		await expect(sendPrompt('hi')).rejects.toThrow('Open a vault');
		expect(invoke).not.toHaveBeenCalled();
		expect(claudeStore.error).toBe('Open a vault to chat with Claude.');
	});
});

describe('stop', () => {
	it('cancels the running turn', async () => {
		answerRunTurn('r7');
		await sendPrompt('hi');
		await stop();
		expect(invoke).toHaveBeenCalledWith('claude_cancel_turn', { runId: 'r7' });
	});

	it('does nothing when no turn runs', async () => {
		await stop();
		expect(invoke).not.toHaveBeenCalled();
		expect(claudeStore.stopRequested).toBe(false);
	});

	it('a stop before claude_run_turn returns cancels the run once its id arrives', async () => {
		let release!: (id: string) => void;
		vi.mocked(invoke).mockImplementation((cmd: string) => (cmd === 'claude_run_turn' ? new Promise((r) => { release = r; }) : Promise.resolve(null)));
		const sending = sendPrompt('hi');
		await vi.waitFor(() => expect(invoked()).toContain('claude_run_turn'));

		await stop();
		expect(invoked()).not.toContain('claude_cancel_turn');
		expect(claudeStore.stopRequested).toBe(true);

		release('r3');
		await sending;
		expect(invoke).toHaveBeenCalledWith('claude_cancel_turn', { runId: 'r3' });
		expect(claudeStore.isRunning).toBe(true);
	});

	it('a stop asked before the run id shows a failed cancel inline and keeps the turn running', async () => {
		vi.mocked(invoke).mockImplementation(async (cmd: string) => {
			if (cmd === 'claude_run_turn') {
				claudeStore.requestStop();
				return 'r3';
			}
			throw new Error('ipc down');
		});
		await sendPrompt('hi');
		expect(claudeStore.error).toBe('Could not stop Claude. Try again.');
		expect(claudeStore.runId).toBe('r3');
		expect(claudeStore.isRunning).toBe(true);
	});

	it('rethrows a failed cancel', async () => {
		answerRunTurn('r7');
		await sendPrompt('hi');
		vi.mocked(invoke).mockRejectedValue(new Error('ipc down'));
		await expect(stop()).rejects.toThrow('ipc down');
	});
});

describe('resetClaude', () => {
	it('cancels the running turn and clears the chat, the session and the notes', async () => {
		answerRunTurn('r5');
		claudeStore.addContextNote('a.md');
		await sendPrompt('hi');
		claudeStore.receive({ runId: 'r5', event: { type: 'Result', sessionId: 's1', text: 'ok', isError: false, costUsd: null, numTurns: 1 } });

		resetClaude();
		expect(invoke).toHaveBeenCalledWith('claude_cancel_turn', { runId: 'r5' });
		expect(claudeStore.messages).toEqual([]);
		expect(claudeStore.sessionId).toBeNull();
		expect(claudeStore.contextNotes).toEqual([]);
		expect(claudeStore.isRunning).toBe(false);
	});

	it('cancels nothing when no turn runs', () => {
		claudeStore.addContextNote('a.md');
		resetClaude();
		expect(invoke).not.toHaveBeenCalled();
		expect(claudeStore.contextNotes).toEqual([]);
	});

	it('still clears the chat when the cancel fails', async () => {
		answerRunTurn('r5');
		await sendPrompt('hi');
		vi.mocked(invoke).mockRejectedValue(new Error('ipc down'));
		resetClaude();
		await Promise.resolve();
		expect(claudeStore.messages).toEqual([]);
	});
});

describe('newChat', () => {
	it('clears the chat and the session and attaches the active note again', async () => {
		answerRunTurn('r1');
		editorStore.addTab({ path: '/vault/Notes/a.md', name: 'a.md', content: 'x', savedContent: 'x' });
		claudeStore.addContextNote('Other.md');
		await sendPrompt('hi');
		claudeStore.receive({ runId: 'r1', event: { type: 'Result', sessionId: 's1', text: 'ok', isError: false, costUsd: null, numTurns: 1 } });
		claudeStore.receive({ runId: 'r1', event: { type: 'Done', exitCode: 0 } });

		newChat();
		expect(claudeStore.messages).toEqual([]);
		expect(claudeStore.sessionId).toBeNull();
		expect(claudeStore.contextNotes).toEqual(['Notes/a.md']);
	});

	it('leaves no notes when no note is open', () => {
		claudeStore.addContextNote('Other.md');
		newChat();
		expect(claudeStore.contextNotes).toEqual([]);
	});
});

describe('attachActiveNote', () => {
	it('attaches the active note once', () => {
		editorStore.addTab({ path: '/vault/a.md', name: 'a.md', content: 'x', savedContent: 'x' });
		expect(attachActiveNote()).toBe(true);
		expect(attachActiveNote()).toBe(true);
		expect(claudeStore.contextNotes).toEqual(['a.md']);
	});

	it('attaches nothing without an open note', () => {
		expect(attachActiveNote()).toBe(false);
		expect(claudeStore.contextNotes).toEqual([]);
	});
});
