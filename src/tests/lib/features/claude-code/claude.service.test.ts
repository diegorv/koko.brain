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
import type { ClaudeEventPayload } from '#lib/contracts/index.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { error } from '#lib/utils/debug.js';
import { claudeStore } from '#lib/features/claude-code/claude.store.svelte.js';
import {
	attachActiveNote,
	deleteChat,
	loadChatHistory,
	loadSlashCommandDetails,
	newChat,
	openChat,
	resetClaude,
	restoreLastChat,
	saveChatOnDone,
	sendPrompt,
	slashCommandDetailsAfterEvent,
	stop,
} from '#lib/features/claude-code/claude.service.js';
import type { SlashCommandInfo } from '#lib/contracts/index.js';

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

	it('starts a new session after a resume whose session is gone, keeping the chat', async () => {
		answerRunTurn('r1');
		await sendPrompt('first');
		claudeStore.receive({ runId: 'r1', event: { type: 'Result', sessionId: 's1', text: 'ok', isError: false, costUsd: null, numTurns: 1 } });
		claudeStore.receive({ runId: 'r1', event: { type: 'Done', exitCode: 0 } });
		answerRunTurn('r2');
		await sendPrompt('second');
		claudeStore.receive({
			runId: 'r2',
			event: { type: 'Result', sessionId: 's1', text: 'No conversation found with session ID: s1', isError: true, costUsd: null, numTurns: 0 },
		});
		claudeStore.receive({ runId: 'r2', event: { type: 'Done', exitCode: 1 } });

		vi.mocked(invoke).mockClear();
		answerRunTurn('r3');
		await sendPrompt('third');
		expect(runTurnRequest()?.resumeSessionId).toBeUndefined();
		expect(claudeStore.messages.filter((m) => m.role === 'user').map((m) => m.text)).toEqual(['first', 'second', 'third']);
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

/** The `claude_chat_write` calls, with their content parsed. */
function chatWrites() {
	return vi.mocked(invoke).mock.calls
		.filter(([cmd]) => cmd === 'claude_chat_write')
		.map(([, args]) => {
			const { vaultPath, chatId, content } = args as { vaultPath: string; chatId: string; content: string };
			return { vaultPath, chatId, chat: JSON.parse(content) };
		});
}

/** What the listener does with one event: the store applies it, then the service may save. */
async function deliver(payload: ClaudeEventPayload) {
	claudeStore.receive(payload);
	await saveChatOnDone(payload);
}

const CHAT_A = '0f8fad5b-d9cb-469f-a165-70867728950e';
const CHAT_B = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

describe('saving the chat', () => {
	it('saves the chat when a prompt is sent, before the turn starts', async () => {
		answerRunTurn('r1');
		await sendPrompt('hello\nthere');

		const writes = chatWrites();
		expect(writes).toHaveLength(1);
		expect(writes[0].vaultPath).toBe('/vault/');
		expect(writes[0].chatId).toBe(claudeStore.chatId);
		expect(writes[0].chat).toMatchObject({
			version: 1,
			chatId: claudeStore.chatId,
			sessionId: null,
			createdAt: claudeStore.createdAt,
			title: 'hello there',
			messages: [{ role: 'user', text: 'hello\nthere' }, { role: 'assistant', parts: [] }],
		});
		expect(typeof writes[0].chat.updatedAt).toBe('string');
		expect(invoked().indexOf('claude_chat_write')).toBeLessThan(invoked().indexOf('claude_run_turn'));
	});

	it("saves again when the turn's Done ends its run, never per delta", async () => {
		answerRunTurn('r1');
		await sendPrompt('hello');
		vi.mocked(invoke).mockClear();

		await deliver({ runId: 'r1', event: { type: 'Init', sessionId: 's1', model: 'm', slashCommands: [], skills: [] } });
		await deliver({ runId: 'r1', event: { type: 'TextDelta', text: 'Hi' } });
		await deliver({ runId: 'r1', event: { type: 'Result', sessionId: 's1', text: 'Hi', isError: false, costUsd: null, numTurns: 1 } });
		expect(chatWrites()).toEqual([]);

		await deliver({ runId: 'r1', event: { type: 'Done', exitCode: 0 } });
		const writes = chatWrites();
		expect(writes).toHaveLength(1);
		expect(writes[0].chat.sessionId).toBe('s1');
		expect(writes[0].chat.messages).toEqual([{ role: 'user', text: 'hello' }, { role: 'assistant', parts: [{ kind: 'text', text: 'Hi' }] }]);
	});

	it('every send of one chat writes the same file', async () => {
		answerRunTurn('r1');
		await sendPrompt('one');
		await deliver({ runId: 'r1', event: { type: 'Done', exitCode: 0 } });
		answerRunTurn('r2');
		await sendPrompt('two');

		const ids = new Set(chatWrites().map((w) => w.chatId));
		expect(ids.size).toBe(1);
		expect(chatWrites().at(-1)?.chat.title).toBe('one');
	});

	it('a Done of another run writes nothing', async () => {
		answerRunTurn('r1');
		await sendPrompt('hello');
		vi.mocked(invoke).mockClear();
		await deliver({ runId: 'r0', event: { type: 'Done', exitCode: 0 } });
		expect(invoked()).not.toContain('claude_chat_write');
	});

	it('a turn sent in vault A, a switch to B, then A\'s Done: no claude_chat_write call at all', async () => {
		vaultStore.open('/vault-a');
		answerRunTurn('r1');
		await sendPrompt('hello');
		vi.mocked(invoke).mockClear();

		resetClaude();
		vaultStore.open('/vault-b');
		await deliver({ runId: 'r1', event: { type: 'Done', exitCode: 0 } });
		expect(invoked()).not.toContain('claude_chat_write');
	});

	it('a Done that arrives after a vault switch the chat survived writes nothing', async () => {
		// A quick double switch can skip the teardown that resets the chat.
		vaultStore.open('/vault-a');
		answerRunTurn('r1');
		await sendPrompt('hello');
		vi.mocked(invoke).mockClear();

		vaultStore.open('/vault-b');
		await deliver({ runId: 'r1', event: { type: 'Done', exitCode: 0 } });
		expect(claudeStore.isRunning).toBe(false);
		expect(invoked()).not.toContain('claude_chat_write');
	});

	it('a Done after New chat writes nothing', async () => {
		answerRunTurn('r1');
		await sendPrompt('hello');
		claudeStore.failTurn('x');
		newChat();
		vi.mocked(invoke).mockClear();
		await deliver({ runId: 'r1', event: { type: 'Done', exitCode: 0 } });
		expect(invoked()).not.toContain('claude_chat_write');
	});

	it('saves a Done replayed by the run id, when the run ended before claude_run_turn returned', async () => {
		vi.mocked(invoke).mockImplementation(async (cmd: string) => {
			if (cmd !== 'claude_run_turn') return null;
			claudeStore.receive({ runId: 'r1', event: { type: 'Error', message: 'spawn failed' } });
			claudeStore.receive({ runId: 'r1', event: { type: 'Done', exitCode: null } });
			return 'r1';
		});
		await sendPrompt('hi');
		expect(claudeStore.isRunning).toBe(false);
		expect(chatWrites()).toHaveLength(2);
	});

	it('a failed save logs and the chat goes on', async () => {
		vi.mocked(invoke).mockImplementation(async (cmd: string) => {
			if (cmd === 'claude_chat_write') throw 'disk full';
			return cmd === 'claude_run_turn' ? 'r1' : null;
		});
		await sendPrompt('hello');
		expect(claudeStore.runId).toBe('r1');
		expect(claudeStore.error).toBeNull();
		expect(error).toHaveBeenCalledWith('CLAUDE', expect.stringContaining('save'), 'disk full');

		await deliver({ runId: 'r1', event: { type: 'Done', exitCode: 0 } });
		expect(claudeStore.status).toBe('idle');
	});
});

describe('a run id that arrives after the chat was reset', () => {
	it('is not attached and the run is cancelled', async () => {
		let release!: (id: string) => void;
		vi.mocked(invoke).mockImplementation((cmd: string) => (cmd === 'claude_run_turn' ? new Promise((r) => { release = r; }) : Promise.resolve(null)));
		const sending = sendPrompt('hi');
		await vi.waitFor(() => expect(invoked()).toContain('claude_run_turn'));

		resetClaude();
		release('r9');
		await sending;

		expect(claudeStore.runId).toBeNull();
		expect(invoke).toHaveBeenCalledWith('claude_cancel_turn', { runId: 'r9' });
		await deliver({ runId: 'r9', event: { type: 'Init', sessionId: 'old', model: 'm', slashCommands: ['x'], skills: [] } });
		await deliver({ runId: 'r9', event: { type: 'Done', exitCode: null } });
		expect(claudeStore.sessionId).toBeNull();
		expect(claudeStore.slashCommands).toEqual([]);
		expect(claudeStore.messages).toEqual([]);
	});

	it('a claude_run_turn that fails after the reset leaves the new chat alone', async () => {
		let reject!: (err: string) => void;
		vi.mocked(invoke).mockImplementation((cmd: string) => (cmd === 'claude_run_turn' ? new Promise((_, r) => { reject = r; }) : Promise.resolve(null)));
		const sending = sendPrompt('hi');
		await vi.waitFor(() => expect(invoked()).toContain('claude_run_turn'));

		resetClaude();
		reject('a turn is already running for this vault');
		await expect(sending).rejects.toBe('a turn is already running for this vault');
		expect(claudeStore.error).toBeNull();
		expect(claudeStore.status).toBe('idle');
	});

	it('is not attached to a newer turn that waits for its own id', async () => {
		const releases: ((id: string) => void)[] = [];
		vi.mocked(invoke).mockImplementation((cmd: string) => (cmd === 'claude_run_turn' ? new Promise((r) => { releases.push(r); }) : Promise.resolve(null)));
		const first = sendPrompt('old');
		await vi.waitFor(() => expect(releases).toHaveLength(1));
		resetClaude();
		const second = sendPrompt('new');
		await vi.waitFor(() => expect(releases).toHaveLength(2));

		releases[0]('r-old');
		await first;
		expect(claudeStore.runId).toBeNull();
		expect(invoke).toHaveBeenCalledWith('claude_cancel_turn', { runId: 'r-old' });

		releases[1]('r-new');
		await second;
		expect(claudeStore.runId).toBe('r-new');
	});
});

describe('a reset while the dirty tabs are saving', () => {
	/** Sends `text` in `/vault-a` with a dirty tab whose save waits for the returned `release`. */
	async function sendWithPendingTabSave(text: string) {
		vaultStore.open('/vault-a');
		editorStore.addTab({ path: '/vault-a/a.md', name: 'a.md', content: 'edited', savedContent: 'old' });
		let release!: () => void;
		vi.mocked(writeTextFile).mockImplementationOnce(() => new Promise<void>((r) => { release = r; }));
		const sending = sendPrompt(text);
		await vi.waitFor(() => expect(writeTextFile).toHaveBeenCalled());
		return { sending, release: () => release() };
	}

	it('starts no turn for the old chat, and the send in the new vault keeps its own run', async () => {
		vi.mocked(invoke).mockImplementation(async (cmd: string, args?: unknown) => {
			if (cmd !== 'claude_run_turn') return null;
			return (args as { request: { vaultPath: string } }).request.vaultPath === '/vault-b' ? 'r-new' : 'r-old';
		});
		const { sending, release } = await sendWithPendingTabSave('old');

		resetClaude();
		editorStore.reset();
		vaultStore.open('/vault-b');
		await sendPrompt('new');
		const chatB = claudeStore.chatId;
		expect(claudeStore.runId).toBe('r-new');

		release();
		await sending;

		const runTurns = vi.mocked(invoke).mock.calls.filter(([cmd]) => cmd === 'claude_run_turn');
		expect(runTurns).toHaveLength(1);
		expect((runTurns[0][1] as { request: { vaultPath: string } }).request.vaultPath).toBe('/vault-b');
		expect(invoked()).not.toContain('claude_cancel_turn');
		expect(chatWrites().every((w) => w.vaultPath === '/vault-b' && w.chatId === chatB)).toBe(true);
		expect(claudeStore.runId).toBe('r-new');
		expect(claudeStore.chatId).toBe(chatB);

		vi.mocked(invoke).mockClear();
		await deliver({ runId: 'r-new', event: { type: 'Done', exitCode: 0 } });
		expect(chatWrites()).toEqual([expect.objectContaining({ vaultPath: '/vault-b', chatId: chatB })]);
	});

	it('a tab that fails to save after the reset leaves the new chat alone', async () => {
		answerRunTurn();
		vaultStore.open('/vault-a');
		editorStore.addTab({ path: '/vault-a/a.md', name: 'a.md', content: 'edited', savedContent: 'old' });
		let reject!: (err: Error) => void;
		vi.mocked(writeTextFile).mockImplementationOnce(() => new Promise<void>((_, r) => { reject = r; }));
		const sending = sendPrompt('old');
		await vi.waitFor(() => expect(writeTextFile).toHaveBeenCalled());

		resetClaude();
		reject(new Error('disk full'));
		await sending;

		expect(invoked()).not.toContain('claude_run_turn');
		expect(claudeStore.status).toBe('idle');
		expect(claudeStore.error).toBeNull();
	});

	it('a vault switch the chat survived ends the turn inline without starting it', async () => {
		answerRunTurn();
		const { sending, release } = await sendWithPendingTabSave('old');

		vaultStore.open('/vault-b');
		release();

		await expect(sending).rejects.toThrow('The vault changed before the turn started.');
		expect(invoked()).not.toContain('claude_run_turn');
		expect(chatWrites()).toEqual([]);
		expect(claudeStore.status).toBe('error');
		expect(claudeStore.isRunning).toBe(false);
	});
});

/** A CLI session id, as `chatFromStored` accepts. */
const SESSION = '0c9a3f0e-5b1d-4e2a-9f6c-1d2e3f4a5b6c';

/** A saved chat file's text. */
function chatFile(chatId: string, overrides: Record<string, unknown> = {}) {
	return JSON.stringify({
		version: 1,
		chatId,
		sessionId: SESSION,
		createdAt: '2026-11-16T10:00:00.000Z',
		updatedAt: '2026-11-16T10:05:00.000Z',
		title: 'saved',
		messages: [{ role: 'user', text: 'saved' }, { role: 'assistant', parts: [{ kind: 'text', text: 'reply' }] }],
		...overrides,
	});
}

/** Answers the chat commands from `files` (chat id to text), listed in the given order. */
function answerChats(files: [string, string][]) {
	vi.mocked(invoke).mockImplementation(async (cmd: string, args?: unknown) => {
		if (cmd === 'claude_chat_list') return files.map(([chatId], i) => ({ chatId, modifiedMs: 1000 - i }));
		if (cmd === 'claude_chat_read') return files.find(([id]) => id === (args as { chatId: string }).chatId)?.[1] ?? null;
		return null;
	});
}

describe('restoreLastChat', () => {
	it('restores the newest chat of the vault', async () => {
		answerChats([[CHAT_B, chatFile(CHAT_B)], [CHAT_A, chatFile(CHAT_A)]]);
		claudeStore.addContextNote('a.md');

		await restoreLastChat('/vault/');

		expect(invoke).toHaveBeenCalledWith('claude_chat_list', { vaultPath: '/vault/' });
		expect(invoke).toHaveBeenCalledWith('claude_chat_read', { vaultPath: '/vault/', chatId: CHAT_B });
		expect(claudeStore.chatId).toBe(CHAT_B);
		expect(claudeStore.sessionId).toBe(SESSION);
		expect(claudeStore.messages).toEqual([{ role: 'user', text: 'saved' }, { role: 'assistant', parts: [{ kind: 'text', text: 'reply' }] }]);
		expect(claudeStore.restored).toBe(true);
		expect(claudeStore.contextNotes).toEqual(['a.md']);
	});

	it('with no saved chat leaves an empty chat', async () => {
		answerRunTurn('r1');
		await sendPrompt('from another vault');
		await deliver({ runId: 'r1', event: { type: 'Done', exitCode: 0 } });
		answerChats([]);

		await restoreLastChat('/vault/');
		expect(invoked()).not.toContain('claude_chat_read');
		expect(claudeStore.messages).toEqual([]);
		expect(claudeStore.chatId).toBeNull();
		expect(claudeStore.restored).toBe(false);
	});

	it('a corrupt file is logged, left on disk, and gives an empty chat', async () => {
		claudeStore.restore(JSON.parse(chatFile(CHAT_A)));
		answerChats([[CHAT_B, '{ not json']]);

		await restoreLastChat('/vault/');
		expect(claudeStore.messages).toEqual([]);
		expect(claudeStore.chatId).toBeNull();
		expect(error).toHaveBeenCalledWith('CLAUDE', expect.stringContaining(CHAT_B));
		expect(invoked()).not.toContain('claude_chat_write');
	});

	it('a file whose chat id is not its name counts as corrupt', async () => {
		answerChats([[CHAT_B, chatFile(CHAT_A)]]);
		await restoreLastChat('/vault/');
		expect(claudeStore.chatId).toBeNull();
	});

	it('drops a read that resolves after the vault changed', async () => {
		let release!: (text: string) => void;
		vi.mocked(invoke).mockImplementation((cmd: string) => {
			if (cmd === 'claude_chat_list') return Promise.resolve([{ chatId: CHAT_A, modifiedMs: 1 }]);
			if (cmd === 'claude_chat_read') return new Promise((r) => { release = r; });
			return Promise.resolve(null);
		});
		claudeStore.restore(JSON.parse(chatFile(CHAT_B)));
		const restoring = restoreLastChat('/vault/');
		await vi.waitFor(() => expect(invoked()).toContain('claude_chat_read'));

		vaultStore.open('/other');
		release(chatFile(CHAT_A));
		await restoring;
		expect(claudeStore.chatId).toBe(CHAT_B);
	});

	it('drops a list that resolves after the vault changed', async () => {
		let release!: (entries: unknown) => void;
		vi.mocked(invoke).mockImplementation((cmd: string) => (cmd === 'claude_chat_list' ? new Promise((r) => { release = r; }) : Promise.resolve(null)));
		claudeStore.restore(JSON.parse(chatFile(CHAT_B)));
		const restoring = restoreLastChat('/vault/');
		await vi.waitFor(() => expect(invoked()).toContain('claude_chat_list'));

		vaultStore.open('/other');
		release([]);
		await restoring;
		expect(invoked()).not.toContain('claude_chat_read');
		expect(claudeStore.chatId).toBe(CHAT_B);
	});

	it('leaves a running turn alone', async () => {
		answerRunTurn('r1');
		await sendPrompt('typed before the vault finished opening');
		answerChats([[CHAT_A, chatFile(CHAT_A)]]);

		await restoreLastChat('/vault/');
		expect(claudeStore.isRunning).toBe(true);
		expect(claudeStore.messages[0]).toEqual({ role: 'user', text: 'typed before the vault finished opening' });
	});

	it('a failed list or read gives an empty chat and rethrows', async () => {
		claudeStore.restore(JSON.parse(chatFile(CHAT_B)));
		vi.mocked(invoke).mockRejectedValue('read failed: not valid UTF-8');
		await expect(restoreLastChat('/vault/')).rejects.toBe('read failed: not valid UTF-8');
		expect(claudeStore.chatId).toBeNull();
	});
});

describe('restart', () => {
	it('after a restart the last saved chat comes back and the next send resumes its session', async () => {
		// The vault's chat folder, as the three commands see it.
		const files = new Map<string, string>();
		vi.mocked(invoke).mockImplementation(async (cmd: string, args?: unknown) => {
			const a = args as { chatId: string; content: string };
			if (cmd === 'claude_chat_write') files.set(a.chatId, a.content);
			if (cmd === 'claude_chat_list') return [...files.keys()].map((chatId) => ({ chatId, modifiedMs: 1 }));
			if (cmd === 'claude_chat_read') return files.get(a.chatId) ?? null;
			return cmd === 'claude_run_turn' ? 'r1' : null;
		});
		await sendPrompt('hello');
		await deliver({ runId: 'r1', event: { type: 'Init', sessionId: SESSION, model: 'm', slashCommands: [], skills: [] } });
		await deliver({ runId: 'r1', event: { type: 'TextDelta', text: 'Hi' } });
		await deliver({ runId: 'r1', event: { type: 'Result', sessionId: SESSION, text: 'Hi', isError: false, costUsd: null, numTurns: 1 } });
		await deliver({ runId: 'r1', event: { type: 'Done', exitCode: 0 } });
		const messages = claudeStore.messages;

		claudeStore.reset();
		await restoreLastChat('/vault/');
		expect(claudeStore.messages).toEqual(messages);
		expect(claudeStore.sessionId).toBe(SESSION);

		vi.mocked(invoke).mockClear();
		await sendPrompt('and then?');
		expect(runTurnRequest()?.resumeSessionId).toBe(SESSION);
		expect(files.size).toBe(1);
	});
});

const CHAT_C = '16fd2706-8baf-433b-82eb-8c7fada847da';

/** Holds the answer to `cmd` until `release` is called; every other command answers from `answerChats`. */
function holdCommand(cmd: string, files: [string, string][]) {
	answerChats(files);
	const answer = vi.mocked(invoke).getMockImplementation()!;
	let release!: () => void;
	vi.mocked(invoke).mockImplementation((c: string, args?: unknown) => {
		if (c !== cmd) return answer(c, args as never);
		return new Promise((resolve) => { release = () => resolve(answer(c, args as never)); });
	});
	return () => release();
}

describe('loadChatHistory', () => {
	it('gives the saved chats in list order with their titles and modification times', async () => {
		answerChats([[CHAT_B, chatFile(CHAT_B, { title: 'newest' })], [CHAT_A, chatFile(CHAT_A, { title: 'older' })]]);

		expect(await loadChatHistory('/vault/')).toEqual([
			{ chatId: CHAT_B, title: 'newest', modifiedMs: 1000 },
			{ chatId: CHAT_A, title: 'older', modifiedMs: 999 },
		]);
		expect(invoke).toHaveBeenCalledWith('claude_chat_list', { vaultPath: '/vault/' });
	});

	it('is empty when the vault has no saved chat', async () => {
		answerChats([]);
		expect(await loadChatHistory('/vault/')).toEqual([]);
		expect(invoked()).not.toContain('claude_chat_read');
	});

	it('leaves out a file that is gone, corrupt, or cannot be read, and logs the unreadable ones', async () => {
		answerChats([[CHAT_A, chatFile(CHAT_A)], [CHAT_B, '{ not json'], [CHAT_C, chatFile(CHAT_C)]]);
		const answer = vi.mocked(invoke).getMockImplementation()!;
		const GONE = '9b2d6a0e-1c3f-4e5a-8b7c-6d5e4f3a2b1c';
		const FAILS = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
		vi.mocked(invoke).mockImplementation(async (cmd: string, args?: unknown) => {
			if (cmd === 'claude_chat_list') return [CHAT_A, CHAT_B, GONE, FAILS, CHAT_C].map((chatId, i) => ({ chatId, modifiedMs: 10 - i }));
			if (cmd === 'claude_chat_read' && (args as { chatId: string }).chatId === FAILS) throw 'read failed: not valid UTF-8';
			return answer(cmd, args as never);
		});

		const rows = await loadChatHistory('/vault/');
		expect(rows?.map((r) => r.chatId)).toEqual([CHAT_A, CHAT_C]);
		expect(error).toHaveBeenCalledWith('CLAUDE', expect.stringContaining(CHAT_B));
		expect(error).toHaveBeenCalledWith('CLAUDE', expect.stringContaining(FAILS), 'read failed: not valid UTF-8');
	});

	it('drops a list or read that resolves after the vault changed', async () => {
		let release = holdCommand('claude_chat_list', [[CHAT_A, chatFile(CHAT_A)]]);
		let loading = loadChatHistory('/vault/');
		await vi.waitFor(() => expect(invoked()).toContain('claude_chat_list'));
		vaultStore.open('/other');
		release();
		expect(await loading).toBeNull();
		expect(invoked()).not.toContain('claude_chat_read');

		vaultStore.open('/vault/');
		vi.mocked(invoke).mockClear();
		release = holdCommand('claude_chat_read', [[CHAT_A, chatFile(CHAT_A)]]);
		loading = loadChatHistory('/vault/');
		await vi.waitFor(() => expect(invoked()).toContain('claude_chat_read'));
		vaultStore.open('/other');
		release();
		expect(await loading).toBeNull();
	});

	it('drops a list that resolves after a turn started', async () => {
		const release = holdCommand('claude_chat_read', [[CHAT_A, chatFile(CHAT_A)]]);
		const loading = loadChatHistory('/vault/');
		await vi.waitFor(() => expect(invoked()).toContain('claude_chat_read'));
		claudeStore.beginTurn('sent while the list loads');
		release();
		expect(await loading).toBeNull();
	});

	it('logs and rethrows a failed list', async () => {
		vi.mocked(invoke).mockRejectedValue('read_dir failed');
		await expect(loadChatHistory('/vault/')).rejects.toBe('read_dir failed');
		expect(error).toHaveBeenCalledWith('CLAUDE', expect.any(String), 'read_dir failed');
	});
});

describe('openChat', () => {
	it('restores the chat and keeps the attached notes', async () => {
		answerChats([[CHAT_A, chatFile(CHAT_A)]]);
		claudeStore.addContextNote('a.md');

		expect(await openChat('/vault/', CHAT_A)).toBe(true);
		expect(invoke).toHaveBeenCalledWith('claude_chat_read', { vaultPath: '/vault/', chatId: CHAT_A });
		expect(claudeStore.chatId).toBe(CHAT_A);
		expect(claudeStore.sessionId).toBe(SESSION);
		expect(claudeStore.messages).toEqual([{ role: 'user', text: 'saved' }, { role: 'assistant', parts: [{ kind: 'text', text: 'reply' }] }]);
		expect(claudeStore.contextNotes).toEqual(['a.md']);
	});

	it('the open chat stays as it is, without a read', async () => {
		answerRunTurn('r1');
		await sendPrompt('live');
		await deliver({ runId: 'r1', event: { type: 'Error', message: 'boom' } });
		await deliver({ runId: 'r1', event: { type: 'Done', exitCode: 1 } });
		const chatId = claudeStore.chatId!;
		const messages = claudeStore.messages;
		vi.mocked(invoke).mockClear();

		expect(await openChat('/vault/', chatId)).toBe(true);
		expect(invoked()).not.toContain('claude_chat_read');
		expect(claudeStore.messages).toBe(messages);
		expect(claudeStore.error).toBe('boom');
	});

	it('does nothing while a turn runs', async () => {
		answerRunTurn('r1');
		await sendPrompt('running');
		vi.mocked(invoke).mockClear();

		expect(await openChat('/vault/', CHAT_A)).toBe(false);
		expect(invoked()).toEqual([]);
		expect(claudeStore.isRunning).toBe(true);
	});

	it('drops a read that resolves after the vault changed', async () => {
		claudeStore.restore(JSON.parse(chatFile(CHAT_B)));
		const release = holdCommand('claude_chat_read', [[CHAT_A, chatFile(CHAT_A)]]);
		const opening = openChat('/vault/', CHAT_A);
		await vi.waitFor(() => expect(invoked()).toContain('claude_chat_read'));

		vaultStore.open('/other');
		release();
		expect(await opening).toBe(false);
		expect(claudeStore.chatId).toBe(CHAT_B);
	});

	it('drops a read that resolves after a turn started', async () => {
		const release = holdCommand('claude_chat_read', [[CHAT_A, chatFile(CHAT_A)]]);
		const opening = openChat('/vault/', CHAT_A);
		await vi.waitFor(() => expect(invoked()).toContain('claude_chat_read'));

		claudeStore.beginTurn('sent while the chat loads');
		release();
		expect(await opening).toBe(false);
		expect(claudeStore.isRunning).toBe(true);
		expect(claudeStore.messages[0]).toEqual({ role: 'user', text: 'sent while the chat loads' });
	});

	it('a chat that is gone or cannot be parsed throws and leaves the chat as it is', async () => {
		claudeStore.restore(JSON.parse(chatFile(CHAT_B)));
		answerChats([[CHAT_A, '{ not json'], [CHAT_C, chatFile(CHAT_A)]]);

		await expect(openChat('/vault/', CHAT_A)).rejects.toThrow('This chat cannot be read');
		await expect(openChat('/vault/', CHAT_C)).rejects.toThrow('This chat cannot be read');
		await expect(openChat('/vault/', 'f47ac10b-58cc-4372-a567-0e02b2c3d479')).rejects.toThrow('This chat was deleted');
		expect(error).toHaveBeenCalledWith('CLAUDE', expect.stringContaining(CHAT_A));
		expect(claudeStore.chatId).toBe(CHAT_B);
	});

	it('logs and rethrows a failed read', async () => {
		claudeStore.restore(JSON.parse(chatFile(CHAT_B)));
		vi.mocked(invoke).mockRejectedValue('read failed');
		await expect(openChat('/vault/', CHAT_A)).rejects.toBe('read failed');
		expect(error).toHaveBeenCalledWith('CLAUDE', expect.any(String), 'read failed');
		expect(claudeStore.chatId).toBe(CHAT_B);
	});
});

describe('deleteChat', () => {
	it('deletes the chat file and leaves the open chat alone', async () => {
		answerChats([]);
		claudeStore.restore(JSON.parse(chatFile(CHAT_B)));

		await deleteChat('/vault/', CHAT_A);
		expect(invoke).toHaveBeenCalledWith('claude_chat_delete', { vaultPath: '/vault/', chatId: CHAT_A });
		expect(claudeStore.chatId).toBe(CHAT_B);
	});

	it('deleting the open chat leaves a new empty chat with the active note', async () => {
		answerChats([]);
		editorStore.addTab({ path: '/vault/Notes/a.md', name: 'a.md', content: 'x', savedContent: 'x' });
		claudeStore.restore(JSON.parse(chatFile(CHAT_A)));

		await deleteChat('/vault/', CHAT_A);
		expect(claudeStore.chatId).toBeNull();
		expect(claudeStore.messages).toEqual([]);
		expect(claudeStore.sessionId).toBeNull();
		expect(claudeStore.restored).toBe(false);
		expect(claudeStore.contextNotes).toEqual(['Notes/a.md']);
	});

	it('the next send after deleting the open chat writes a new file, not the deleted one', async () => {
		answerRunTurn('r1');
		await sendPrompt('first');
		await deliver({ runId: 'r1', event: { type: 'Done', exitCode: 0 } });
		const deleted = claudeStore.chatId!;

		await deleteChat('/vault/', deleted);
		vi.mocked(invoke).mockClear();
		answerRunTurn('r2');
		await sendPrompt('second');
		expect(chatWrites().map((w) => w.chatId)).not.toContain(deleted);
		expect(chatWrites()).toHaveLength(1);
	});

	it('does nothing while a turn runs', async () => {
		answerRunTurn('r1');
		await sendPrompt('running');
		vi.mocked(invoke).mockClear();

		await deleteChat('/vault/', claudeStore.chatId!);
		expect(invoked()).toEqual([]);
		expect(claudeStore.isRunning).toBe(true);
	});

	it('a failed delete is logged, rethrown, and keeps the open chat', async () => {
		claudeStore.restore(JSON.parse(chatFile(CHAT_A)));
		vi.mocked(invoke).mockRejectedValue('delete failed');

		await expect(deleteChat('/vault/', CHAT_A)).rejects.toBe('delete failed');
		expect(error).toHaveBeenCalledWith('CLAUDE', expect.any(String), 'delete failed');
		expect(claudeStore.chatId).toBe(CHAT_A);
	});

	it('a delete that resolves after the vault changed leaves the new vault chat alone', async () => {
		claudeStore.restore(JSON.parse(chatFile(CHAT_A)));
		const release = holdCommand('claude_chat_delete', []);
		const deleting = deleteChat('/vault/', CHAT_A);
		await vi.waitFor(() => expect(invoked()).toContain('claude_chat_delete'));

		vaultStore.open('/other');
		release();
		await deleting;
		expect(claudeStore.chatId).toBe(CHAT_A);
	});
});

describe('slash command details', () => {
	const DEBUG: SlashCommandInfo = { name: 'debug', description: 'Secret description of debug', argumentHint: '[issue]', aliases: ['dbg'] };
	const SKETCH: SlashCommandInfo = { name: 'sketch', description: 'Draw a sketch', argumentHint: '', aliases: [] };
	const slashCalls = () => vi.mocked(invoke).mock.calls.filter(([cmd]) => cmd === 'claude_slash_commands');

	/** Answers `claude_slash_commands` with each entry of `replies` in turn (an `Error` rejects); the last one repeats. */
	function answerSlash(...replies: (SlashCommandInfo[] | Error)[]) {
		let n = 0;
		vi.mocked(invoke).mockImplementation(async (cmd: string) => {
			if (cmd !== 'claude_slash_commands') return null;
			const reply = replies[Math.min(n++, replies.length - 1)];
			if (reply instanceof Error) throw reply;
			return reply;
		});
	}

	/** Holds every `claude_slash_commands` call until the returned function resolves them all with `rows`. */
	function holdSlash(rows: SlashCommandInfo[]) {
		const held: (() => void)[] = [];
		vi.mocked(invoke).mockImplementation((cmd: string) => {
			if (cmd !== 'claude_slash_commands') return Promise.resolve(null);
			return new Promise((resolve) => { held.push(() => resolve(rows)); });
		});
		return () => held.forEach((release) => release());
	}

	const init = (slashCommands: string[], runId = 'r1'): ClaudeEventPayload => ({ runId, event: { type: 'Init', sessionId: 's', model: 'm', slashCommands, skills: [] } });
	const done = (runId = 'r1'): ClaudeEventPayload => ({ runId, event: { type: 'Done', exitCode: 0 } });

	beforeEach(() => resetClaude());

	it('asks with the binary override and the normalized vault path, and maps the reply', async () => {
		settingsStore.updateClaudeCode({ binaryPath: '/opt/claude' });
		answerSlash([DEBUG]);

		await loadSlashCommandDetails();

		expect(slashCalls()).toEqual([['claude_slash_commands', { binaryPath: '/opt/claude', vaultPath: '/vault' }]]);
		expect(claudeStore.slashCommandDetails.get('debug')).toEqual({ description: 'Secret description of debug', argumentHint: '[issue]' });
		expect(claudeStore.slashCommandDetails.get('dbg')?.description).toBe('Secret description of debug');
	});

	it('asks once per vault: a second load, done or in flight, makes no call', async () => {
		const release = holdSlash([DEBUG]);
		const first = loadSlashCommandDetails();
		await loadSlashCommandDetails();
		expect(slashCalls()).toHaveLength(1);

		release();
		await first;
		await loadSlashCommandDetails();
		expect(slashCalls()).toHaveLength(1);
	});

	it('asks again for the next vault, with the binary override set by then', async () => {
		answerSlash([DEBUG]);
		await loadSlashCommandDetails();
		settingsStore.updateClaudeCode({ binaryPath: '/new/claude' });
		await loadSlashCommandDetails();
		expect(slashCalls()).toHaveLength(1);

		vaultStore.open('/other/');
		await loadSlashCommandDetails();
		expect(slashCalls()).toEqual([
			['claude_slash_commands', { binaryPath: '', vaultPath: '/vault' }],
			['claude_slash_commands', { binaryPath: '/new/claude', vaultPath: '/other' }],
		]);
	});

	it('drops a reply that arrives after the vault changed', async () => {
		const release = holdSlash([DEBUG]);
		const loading = loadSlashCommandDetails();
		vaultStore.open('/other');
		release();
		await loading;
		expect(claudeStore.slashCommandDetails.size).toBe(0);
	});

	it('does nothing without a vault', async () => {
		vaultStore._reset();
		answerSlash([DEBUG]);
		await loadSlashCommandDetails();
		expect(slashCalls()).toEqual([]);
	});

	it('resetClaude clears the map, the request in flight and the tried names', async () => {
		answerSlash([DEBUG]);
		await loadSlashCommandDetails();
		await slashCommandDetailsAfterEvent(init(['debug', 'mcp__srv__prompt']));
		await slashCommandDetailsAfterEvent(done());
		expect(slashCalls()).toHaveLength(2);

		resetClaude();
		expect(claudeStore.slashCommandDetails.size).toBe(0);
		await loadSlashCommandDetails();
		await slashCommandDetailsAfterEvent(init(['debug', 'mcp__srv__prompt']));
		await slashCommandDetailsAfterEvent(done());
		expect(slashCalls()).toHaveLength(4);

		const release = holdSlash([SKETCH]);
		resetClaude();
		const stale = loadSlashCommandDetails();
		resetClaude();
		const fresh = loadSlashCommandDetails();
		expect(slashCalls()).toHaveLength(6);
		release();
		await Promise.all([stale, fresh]);
		expect(claudeStore.slashCommandDetails.size).toBe(1);
	});

	it('an Init with unknown names fetches once after that run is Done, and an identical Init does not again', async () => {
		answerSlash([DEBUG]);
		await loadSlashCommandDetails();

		await slashCommandDetailsAfterEvent(init(['debug', 'dbg', 'mcp__srv__prompt']));
		expect(slashCalls()).toHaveLength(1);
		await slashCommandDetailsAfterEvent(done('other-run'));
		expect(slashCalls()).toHaveLength(1);
		await slashCommandDetailsAfterEvent(done());
		expect(slashCalls()).toHaveLength(2);

		await slashCommandDetailsAfterEvent(init(['debug', 'dbg', 'mcp__srv__prompt'], 'r2'));
		await slashCommandDetailsAfterEvent(done('r2'));
		expect(slashCalls()).toHaveLength(2);
	});

	it('an Init whose names are all mapped fetches nothing', async () => {
		answerSlash([DEBUG]);
		await loadSlashCommandDetails();
		await slashCommandDetailsAfterEvent(init(['debug', 'dbg']));
		await slashCommandDetailsAfterEvent(done());
		expect(slashCalls()).toHaveLength(1);
	});

	it('an Init while a fetch is pending causes none', async () => {
		const release = holdSlash([DEBUG]);
		const loading = loadSlashCommandDetails();
		await slashCommandDetailsAfterEvent(init(['debug', 'new-skill']));
		await slashCommandDetailsAfterEvent(done());
		expect(slashCalls()).toHaveLength(1);
		release();
		await loading;
		expect(slashCalls()).toHaveLength(1);
	});

	it('a failed fetch keeps the map, logs no description, and is retried only by a later Init', async () => {
		answerSlash([DEBUG], new Error('claude did not answer the initialize request within 30s'));
		await loadSlashCommandDetails();
		await slashCommandDetailsAfterEvent(init(['debug', 'sketch']));
		await slashCommandDetailsAfterEvent(done());
		expect(slashCalls()).toHaveLength(2);

		expect(error).toHaveBeenCalledTimes(1);
		expect(JSON.stringify(vi.mocked(error).mock.calls, (_k, v: unknown) => (v instanceof Error ? v.message : v))).not.toContain('Secret');
		expect(claudeStore.slashCommandDetails.get('debug')?.description).toBe('Secret description of debug');

		await loadSlashCommandDetails();
		expect(slashCalls()).toHaveLength(2);
		answerSlash([DEBUG, SKETCH]);
		await slashCommandDetailsAfterEvent(init(['debug', 'sketch', 'other'], 'r2'));
		await slashCommandDetailsAfterEvent(done('r2'));
		expect(slashCalls()).toHaveLength(3);
		expect(claudeStore.slashCommandDetails.get('sketch')?.description).toBe('Draw a sketch');
	});

	it('a failed first fetch rejects after logging, and a remount does not retry it', async () => {
		answerSlash(new Error('claude exited (exit status: 1) without answering the initialize request'));
		await expect(loadSlashCommandDetails()).rejects.toThrow('without answering');
		expect(error).toHaveBeenCalledWith('CLAUDE', expect.any(String), expect.any(Error));
		expect(claudeStore.slashCommandDetails.size).toBe(0);

		await loadSlashCommandDetails();
		expect(slashCalls()).toHaveLength(1);
	});
});
