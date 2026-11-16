// @vitest-environment jsdom
// jsdom: renderReplyHtml sanitizes through DOMPurify, which needs a DOM.
import { describe, it, expect } from 'vitest';
import type { ClaudeEvent } from '#lib/contracts/index.js';
import {
	activeNoteContextPath,
	beginTurn,
	chatFromStored,
	chatTitle,
	EMPTY_CHAT,
	failTurn,
	filterSlashCommands,
	normalizeVaultPath,
	receiveEvent,
	renderReplyHtml,
	replyLinkAction,
	requestStop,
	resetChat,
	restoreChat,
	SESSION_GONE,
	showError,
	slashQuery,
	startRun,
	storedFromChat,
	toolTarget,
	type ChatState,
	type StoredChat,
} from '#lib/features/claude-code/claude.logic.js';

/** The identity a first send gives a chat that has none. */
const FRESH = { chatId: '0f8fad5b-d9cb-469f-a165-70867728950e', createdAt: '2026-11-16T10:00:00.000Z' };

/** A chat with one turn sent and its run id known. */
function running(runId = 'r1'): ChatState {
	return startRun(beginTurn(EMPTY_CHAT, 'hello', FRESH), runId);
}

const event = (state: ChatState, ev: ClaudeEvent, runId = 'r1') => receiveEvent(state, { runId, event: ev });

describe('beginTurn', () => {
	it('adds the user message and an empty reply, and waits for a run id', () => {
		const state = beginTurn(EMPTY_CHAT, '/hello world', FRESH);
		expect(state.messages).toEqual([
			{ role: 'user', text: '/hello world' },
			{ role: 'assistant', parts: [] },
		]);
		expect(state.status).toBe('running');
		expect(state.runId).toBeNull();
		expect(state.error).toBeNull();
	});

	it('clears the error of the previous turn', () => {
		const state = beginTurn(failTurn(EMPTY_CHAT, 'boom'), 'again', FRESH);
		expect(state.error).toBeNull();
		expect(state.status).toBe('running');
	});

	it('gives a chat its id and creation time on the first send only', () => {
		expect(EMPTY_CHAT.chatId).toBeNull();
		expect(EMPTY_CHAT.createdAt).toBeNull();
		const first = beginTurn(EMPTY_CHAT, 'one', FRESH);
		expect(first.chatId).toBe(FRESH.chatId);
		expect(first.createdAt).toBe(FRESH.createdAt);

		const second = beginTurn(event(startRun(first, 'r1'), { type: 'Done', exitCode: 0 }), 'two', {
			chatId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
			createdAt: '2026-11-17T10:00:00.000Z',
		});
		expect(second.chatId).toBe(FRESH.chatId);
		expect(second.createdAt).toBe(FRESH.createdAt);
	});

	it('ends the restored notice', () => {
		const restored = restoreChat(EMPTY_CHAT, stored());
		expect(restored.restored).toBe(true);
		expect(beginTurn(restored, 'next', FRESH).restored).toBe(false);
	});
});

describe('receiveEvent', () => {
	it('Init keeps the slash commands and the session, so a turn with no Result can still be resumed', () => {
		const state = event(running(), { type: 'Init', sessionId: 's1', model: 'opus', slashCommands: ['hello', 'review'], skills: [] });
		expect(state.slashCommands).toEqual(['hello', 'review']);
		expect(state.sessionId).toBe('s1');
		expect(event(state, { type: 'Done', exitCode: null }).sessionId).toBe('s1');
	});

	it('Init or Result with an empty session id keeps the previous one', () => {
		const state = { ...running(), sessionId: 's0' };
		expect(event(state, { type: 'Init', sessionId: '', model: 'opus', slashCommands: [], skills: [] }).sessionId).toBe('s0');
		expect(event(state, { type: 'Result', sessionId: '', text: '', isError: false, costUsd: null, numTurns: null }).sessionId).toBe('s0');
	});

	it('TextDelta appends to the reply text', () => {
		let state = event(running(), { type: 'TextDelta', text: 'Hel' });
		state = event(state, { type: 'TextDelta', text: 'lo' });
		expect(state.messages.at(-1)).toEqual({ role: 'assistant', parts: [{ kind: 'text', text: 'Hello' }] });
	});

	it('TextRetracted removes abandoned text, so a retried reply shows once', () => {
		let state = event(running(), { type: 'TextDelta', text: 'Reading. ' });
		state = event(state, { type: 'TextDelta', text: 'The note says' });
		state = event(state, { type: 'TextRetracted', text: 'The note says' });
		state = event(state, { type: 'TextDelta', text: 'The note says hi.' });
		expect(state.messages.at(-1)).toEqual({ role: 'assistant', parts: [{ kind: 'text', text: 'Reading. The note says hi.' }] });
	});

	it('TextRetracted of a whole text part drops the part, so a tool card stays last', () => {
		let state = event(running(), { type: 'ToolStart', id: 't1', name: 'Read', input: { file_path: 'a.md' } });
		state = event(state, { type: 'TextDelta', text: 'cut' });
		state = event(state, { type: 'TextRetracted', text: 'cut' });
		expect(state.messages.at(-1)).toEqual({
			role: 'assistant',
			parts: [{ kind: 'tool', id: 't1', name: 'Read', target: 'a.md', status: 'running', summary: '' }],
		});
	});

	it('TextRetracted that is not the end of the reply text changes nothing', () => {
		const before = event(running(), { type: 'TextDelta', text: 'Hello' });
		expect(event(before, { type: 'TextRetracted', text: 'other' })).toEqual(before);
		expect(event(running(), { type: 'TextRetracted', text: 'x' })).toEqual(running());
	});

	it('ThinkingDelta changes nothing', () => {
		const before = running();
		expect(event(before, { type: 'ThinkingDelta', text: 'hmm' })).toBe(before);
	});

	it('ToolStart adds a running tool card with its target, and text after it starts a new part', () => {
		let state = event(running(), { type: 'TextDelta', text: 'Reading.' });
		state = event(state, { type: 'ToolStart', id: 't1', name: 'Read', input: { file_path: 'Notes/a.md' } });
		state = event(state, { type: 'TextDelta', text: 'Done.' });
		expect(state.messages.at(-1)).toEqual({
			role: 'assistant',
			parts: [
				{ kind: 'text', text: 'Reading.' },
				{ kind: 'tool', id: 't1', name: 'Read', target: 'Notes/a.md', status: 'running', summary: '' },
				{ kind: 'text', text: 'Done.' },
			],
		});
	});

	it('ToolResult completes the matching card, or marks it failed', () => {
		let state = event(running(), { type: 'ToolStart', id: 't1', name: 'Read', input: { file_path: 'a.md' } });
		state = event(state, { type: 'ToolStart', id: 't2', name: 'Bash', input: { command: 'ls' } });
		state = event(state, { type: 'ToolResult', id: 't1', isError: false, summary: 'contents' });
		state = event(state, { type: 'ToolResult', id: 't2', isError: true, summary: 'no such dir' });
		const parts = state.messages.at(-1)!.role === 'assistant' ? (state.messages.at(-1) as { parts: unknown[] }).parts : [];
		expect(parts).toEqual([
			{ kind: 'tool', id: 't1', name: 'Read', target: 'a.md', status: 'done', summary: 'contents' },
			{ kind: 'tool', id: 't2', name: 'Bash', target: 'ls', status: 'error', summary: 'no such dir' },
		]);
	});

	it('ToolResult for an unknown tool id changes nothing', () => {
		const before = running();
		expect(event(before, { type: 'ToolResult', id: 'nope', isError: false, summary: '' })).toEqual(before);
	});

	it('Result keeps the session id and uses its text only when nothing streamed', () => {
		const result: ClaudeEvent = { type: 'Result', sessionId: 's9', text: 'Final', isError: false, costUsd: 0.01, numTurns: 1 };
		const silent = event(running(), result);
		expect(silent.sessionId).toBe('s9');
		expect(silent.messages.at(-1)).toEqual({ role: 'assistant', parts: [{ kind: 'text', text: 'Final' }] });

		const streamed = event(event(running(), { type: 'TextDelta', text: 'Final' }), result);
		expect(streamed.messages.at(-1)).toEqual({ role: 'assistant', parts: [{ kind: 'text', text: 'Final' }] });
		expect(streamed.status).toBe('running');
	});

	it('Result with isError shows its text as the error, and the turn runs until Done', () => {
		const state = event(running(), { type: 'Result', sessionId: 's1', text: 'Max turns reached', isError: true, costUsd: null, numTurns: null });
		expect(state.status).toBe('running');
		expect(state.runId).toBe('r1');
		expect(state.error).toBe('Max turns reached');
		expect(state.sessionId).toBe('s1');
	});

	it('Result with isError on an empty reply shows its cause only as the error, not as reply text', () => {
		const before = running();
		const state = event(before, { type: 'Result', sessionId: 's1', text: 'error_max_turns', isError: true, costUsd: null, numTurns: null });
		expect(state.error).toBe('error_max_turns');
		expect(state.messages).toEqual(before.messages);
	});

	it('Result with isError and no text still says the turn failed', () => {
		const state = event(running(), { type: 'Result', sessionId: 's1', text: '', isError: true, costUsd: null, numTurns: null });
		expect(state.error).toBe('Claude ended the turn with an error.');
	});

	it('Result saying the resumed session is gone drops the session, keeps the chat and says the next message starts over', () => {
		const before = event({ ...running(), sessionId: 'dead' }, { type: 'TextDelta', text: 'partial' });
		const gone: ClaudeEvent = {
			type: 'Result',
			sessionId: 'dead',
			text: 'No conversation found with session ID: dead',
			isError: true,
			costUsd: null,
			numTurns: 0,
		};
		const state = event(before, gone);
		expect(state.sessionId).toBeNull();
		expect(state.messages).toEqual(before.messages);
		expect(state.error).toBe(SESSION_GONE);
		expect(SESSION_GONE).toBe('The earlier conversation is no longer available to Claude. Your next message starts a new one.');
		expect(event(state, { type: 'Done', exitCode: 1 }).sessionId).toBeNull();
		// Still the same saved chat, only with a new session from the next send.
		expect(state.chatId).toBe(FRESH.chatId);
		expect(state.createdAt).toBe(FRESH.createdAt);
	});

	it('a zero-turn error Result with any other text keeps the session', () => {
		const before = { ...running(), sessionId: 's1' };
		const other = { type: 'Result', sessionId: 's1', text: 'turn_setup_failed', isError: true, costUsd: null, numTurns: 0 } as const;
		const state = event(before, other);
		expect(state.sessionId).toBe('s1');
		expect(state.error).toBe('turn_setup_failed');
	});

	it('the not-found text keeps the session when the Result is not a zero-turn error', () => {
		const text = 'No conversation found with session ID: s1';
		const before = { ...running(), sessionId: 's1' };
		const withTurns = event(before, { type: 'Result', sessionId: 's1', text, isError: true, costUsd: null, numTurns: 1 });
		const unknownTurns = event(before, { type: 'Result', sessionId: 's1', text, isError: true, costUsd: null, numTurns: null });
		expect(withTurns.sessionId).toBe('s1');
		expect(unknownTurns.sessionId).toBe('s1');
		expect(withTurns.error).toBe(text);
	});

	it('Error shows its message and keeps the turn running until Done, since the process may still run', () => {
		const state = event(running(), { type: 'Error', message: 'claude exited with code 1: bad flag' });
		expect(state.status).toBe('running');
		expect(state.runId).toBe('r1');
		expect(state.error).toBe('claude exited with code 1: bad flag');
		expect(event(state, { type: 'TextDelta', text: 'more' }).messages.at(-1)).toEqual({ role: 'assistant', parts: [{ kind: 'text', text: 'more' }] });
	});

	it('Done ends the run: running goes idle, an error stays', () => {
		const idle = event(running(), { type: 'Done', exitCode: 0 });
		expect(idle.status).toBe('idle');
		expect(idle.runId).toBeNull();

		const failed = event(event(running(), { type: 'Error', message: 'boom' }), { type: 'Done', exitCode: null });
		expect(failed.status).toBe('error');
		expect(failed.error).toBe('boom');
		expect(failed.runId).toBeNull();

		const resultError = { type: 'Result', sessionId: 's1', text: 'Max turns reached', isError: true, costUsd: null, numTurns: null } as const;
		const failedResult = event(event(running(), resultError), { type: 'Done', exitCode: 0 });
		expect(failedResult.status).toBe('error');
	});

	it('Done marks the tool cards still running as stopped and keeps finished ones', () => {
		let state = event(running(), { type: 'ToolStart', id: 't1', name: 'Read', input: { file_path: 'a.md' } });
		state = event(state, { type: 'ToolResult', id: 't1', isError: false, summary: 'ok' });
		state = event(state, { type: 'ToolStart', id: 't2', name: 'Bash', input: { command: 'sleep 60' } });
		state = event(state, { type: 'Done', exitCode: null });
		expect(state.messages.at(-1)).toEqual({
			role: 'assistant',
			parts: [
				{ kind: 'tool', id: 't1', name: 'Read', target: 'a.md', status: 'done', summary: 'ok' },
				{ kind: 'tool', id: 't2', name: 'Bash', target: 'sleep 60', status: 'stopped', summary: '' },
			],
		});
	});

	it('ignores events of a stale run id', () => {
		const before = running('r2');
		expect(event(before, { type: 'TextDelta', text: 'old' }, 'r1')).toBe(before);
	});

	it('ignores events after Done', () => {
		const done = event(running(), { type: 'Done', exitCode: 0 });
		expect(event(done, { type: 'TextDelta', text: 'late' })).toBe(done);
	});

	it('ignores events while no turn is waiting for its id', () => {
		expect(receiveEvent(EMPTY_CHAT, { runId: 'r1', event: { type: 'TextDelta', text: 'x' } })).toBe(EMPTY_CHAT);
	});

	it('buffers events that arrive before the run id is known', () => {
		const waiting = beginTurn(EMPTY_CHAT, 'hi', FRESH);
		const buffered = receiveEvent(waiting, { runId: 'r1', event: { type: 'TextDelta', text: 'early' } });
		expect(buffered.pending).toHaveLength(1);
		expect(buffered.messages.at(-1)).toEqual({ role: 'assistant', parts: [] });
	});
});

describe('startRun', () => {
	it('replays the buffered events of its run and drops the others', () => {
		let state = beginTurn(EMPTY_CHAT, 'hi', FRESH);
		state = receiveEvent(state, { runId: 'old', event: { type: 'TextDelta', text: 'stale' } });
		state = receiveEvent(state, { runId: 'r1', event: { type: 'Error', message: 'spawn failed' } });
		state = receiveEvent(state, { runId: 'r1', event: { type: 'Done', exitCode: null } });
		state = startRun(state, 'r1');

		expect(state.pending).toEqual([]);
		expect(state.status).toBe('error');
		expect(state.error).toBe('spawn failed');
		expect(state.runId).toBeNull();
		expect(state.messages.at(-1)).toEqual({ role: 'assistant', parts: [] });
	});

	it('sets the run id when nothing was buffered', () => {
		const state = startRun(beginTurn(EMPTY_CHAT, 'hi', FRESH), 'r1');
		expect(state.runId).toBe('r1');
		expect(state.status).toBe('running');
	});
});

describe('failTurn', () => {
	it('sets the error, clears the run and drops the buffer', () => {
		let state = beginTurn(EMPTY_CHAT, 'hi', FRESH);
		state = receiveEvent(state, { runId: 'r1', event: { type: 'TextDelta', text: 'x' } });
		state = failTurn(state, 'claude is not installed');
		expect(state.status).toBe('error');
		expect(state.error).toBe('claude is not installed');
		expect(state.runId).toBeNull();
		expect(state.pending).toEqual([]);
	});
});

describe('showError', () => {
	it('shows the message and keeps the running turn and its run id', () => {
		const state = showError(running(), 'Could not stop Claude. Try again.');
		expect(state.error).toBe('Could not stop Claude. Try again.');
		expect(state.status).toBe('running');
		expect(state.runId).toBe('r1');
		expect(event(state, { type: 'Done', exitCode: null }).status).toBe('error');
	});

	it('on an idle chat only sets the message', () => {
		expect(showError(EMPTY_CHAT, 'x')).toEqual({ ...EMPTY_CHAT, error: 'x' });
	});
});

describe('requestStop', () => {
	it('is remembered while the turn waits for its run id, and cleared by Done and the next turn', () => {
		const waiting = requestStop(beginTurn(EMPTY_CHAT, 'hi', FRESH));
		expect(waiting.stopRequested).toBe(true);
		const started = startRun(waiting, 'r1');
		expect(started.stopRequested).toBe(true);
		expect(event(started, { type: 'Done', exitCode: null }).stopRequested).toBe(false);
		expect(beginTurn(waiting, 'again', FRESH).stopRequested).toBe(false);
	});

	it('does nothing once the run id is known or when no turn runs', () => {
		const withId = running();
		expect(requestStop(withId)).toBe(withId);
		expect(requestStop(EMPTY_CHAT)).toBe(EMPTY_CHAT);
	});
});

describe('resetChat', () => {
	it('clears messages, session and error and keeps the slash commands', () => {
		let state = event(running(), { type: 'Init', sessionId: 's1', model: 'm', slashCommands: ['hello'], skills: [] });
		state = event(state, { type: 'Result', sessionId: 's1', text: 'x', isError: true, costUsd: null, numTurns: null });
		const reset = resetChat(state);
		expect(reset).toEqual({ ...EMPTY_CHAT, slashCommands: ['hello'] });
		expect(reset.chatId).toBeNull();
		expect(reset.createdAt).toBeNull();
	});
});

/** A saved chat with a user message, a reply with text and a finished tool. */
function stored(overrides: Partial<StoredChat> = {}): StoredChat {
	return {
		version: 1,
		chatId: FRESH.chatId,
		sessionId: 's1',
		createdAt: FRESH.createdAt,
		updatedAt: '2026-11-16T10:05:00.000Z',
		title: 'hello',
		messages: [
			{ role: 'user', text: 'hello' },
			{
				role: 'assistant',
				parts: [
					{ kind: 'tool', id: 't1', name: 'Read', target: 'a.md', status: 'done', summary: 'x' },
					{ kind: 'text', text: 'Hi' },
				],
			},
		],
		...overrides,
	};
}

describe('chatTitle', () => {
	it('is the first prompt on one line', () => {
		expect(chatTitle([{ role: 'user', text: '  fix\n\tthe   note ' }, { role: 'user', text: 'second' }])).toBe('fix the note');
	});

	it('is cut at 80 chars', () => {
		const title = chatTitle([{ role: 'user', text: 'x'.repeat(200) }]);
		expect(title).toHaveLength(80);
		expect(title.endsWith('...')).toBe(true);
		expect(chatTitle([{ role: 'user', text: 'y'.repeat(80) }])).toBe('y'.repeat(80));
	});

	it('is empty without a prompt', () => {
		expect(chatTitle([])).toBe('');
	});
});

describe('storedFromChat', () => {
	it('is the v1 file of a chat with an id', () => {
		const chat = { ...running(), sessionId: 's1' };
		expect(storedFromChat(chat, '2026-11-16T10:05:00.000Z')).toEqual({
			version: 1,
			chatId: FRESH.chatId,
			sessionId: 's1',
			createdAt: FRESH.createdAt,
			updatedAt: '2026-11-16T10:05:00.000Z',
			title: 'hello',
			messages: chat.messages,
		});
	});

	it('is null for a chat that was never sent', () => {
		expect(storedFromChat(EMPTY_CHAT, '2026-11-16T10:05:00.000Z')).toBeNull();
	});
});

describe('chatFromStored', () => {
	it('round trips the messages, the session, the creation time and the title', () => {
		let chat = event({ ...running(), sessionId: null }, { type: 'Init', sessionId: 's9', model: 'm', slashCommands: [], skills: [] });
		chat = event(chat, { type: 'ToolStart', id: 't1', name: 'Read', input: { file_path: 'a.md' } });
		chat = event(chat, { type: 'ToolResult', id: 't1', isError: false, summary: 'ok' });
		chat = event(chat, { type: 'TextDelta', text: 'Done.' });
		chat = event(chat, { type: 'Done', exitCode: 0 });
		const saved = storedFromChat(chat, '2026-11-16T10:05:00.000Z')!;

		const back = chatFromStored(JSON.stringify(saved, null, '\t'));
		expect(back).toEqual(saved);
		expect(back?.messages).toEqual(chat.messages);
		expect(back?.sessionId).toBe('s9');
		expect(back?.createdAt).toBe(FRESH.createdAt);
		expect(back?.title).toBe('hello');
	});

	it('turns a tool that was running into a stopped one', () => {
		const running = stored({
			messages: [{ role: 'assistant', parts: [{ kind: 'tool', id: 't1', name: 'Bash', target: 'ls', status: 'running', summary: '' }] }],
		});
		const back = chatFromStored(JSON.stringify(running));
		expect(back?.messages).toEqual([{ role: 'assistant', parts: [{ kind: 'tool', id: 't1', name: 'Bash', target: 'ls', status: 'stopped', summary: '' }] }]);
	});

	it('keeps a chat with no session', () => {
		expect(chatFromStored(JSON.stringify(stored({ sessionId: null })))?.sessionId).toBeNull();
	});

	it('is null for an unknown version', () => {
		expect(chatFromStored(JSON.stringify({ ...stored(), version: 2 }))).toBeNull();
		expect(chatFromStored(JSON.stringify({ ...stored(), version: undefined }))).toBeNull();
	});

	it('is null for a malformed file', () => {
		const bad: unknown[] = [
			'',
			'{',
			'null',
			'[]',
			'"text"',
			{ ...stored(), chatId: 5 },
			{ ...stored(), sessionId: 5 },
			{ ...stored(), createdAt: null },
			{ ...stored(), updatedAt: undefined },
			{ ...stored(), title: [] },
			{ ...stored(), messages: 'x' },
			{ ...stored(), messages: [null] },
			{ ...stored(), messages: [{ role: 'system', text: 'x' }] },
			{ ...stored(), messages: [{ role: 'user', text: 1 }] },
			{ ...stored(), messages: [{ role: 'assistant', parts: 'x' }] },
			{ ...stored(), messages: [{ role: 'assistant', parts: [{ kind: 'image' }] }] },
			{ ...stored(), messages: [{ role: 'assistant', parts: [{ kind: 'text', text: null }] }] },
			{ ...stored(), messages: [{ role: 'assistant', parts: [{ kind: 'tool', id: 't', name: 'n', target: 't', status: 'odd', summary: '' }] }] },
			{ ...stored(), messages: [{ role: 'assistant', parts: [{ kind: 'tool', id: 't', name: 'n', status: 'done', summary: '' }] }] },
		];
		for (const value of bad) {
			expect(chatFromStored(typeof value === 'string' ? value : JSON.stringify(value))).toBeNull();
		}
	});
});

describe('restoreChat', () => {
	it('shows the saved chat, idle, with no run, and keeps the slash commands', () => {
		const before = { ...resetChat(EMPTY_CHAT), slashCommands: ['hello'], error: 'old' };
		const restored = restoreChat(before, stored());
		expect(restored).toEqual({
			...EMPTY_CHAT,
			slashCommands: ['hello'],
			chatId: FRESH.chatId,
			createdAt: FRESH.createdAt,
			sessionId: 's1',
			messages: stored().messages,
			restored: true,
		});
	});

	it('also works after a failed turn', () => {
		const failed = failTurn(beginTurn(EMPTY_CHAT, 'hi', FRESH), 'boom');
		expect(restoreChat(failed, stored({ chatId: '7c9e6679-7425-40de-944b-e07fc1f90ae7' })).chatId).toBe('7c9e6679-7425-40de-944b-e07fc1f90ae7');
	});

	it('does nothing while a turn runs', () => {
		const busy = beginTurn(EMPTY_CHAT, 'hi', FRESH);
		expect(restoreChat(busy, stored())).toBe(busy);
		const started = running();
		expect(restoreChat(started, null)).toBe(started);
	});

	it('with no saved chat gives a new chat', () => {
		const chat = { ...event(running(), { type: 'Done', exitCode: 0 }), slashCommands: ['hello'] };
		expect(restoreChat(chat, null)).toEqual({ ...EMPTY_CHAT, slashCommands: ['hello'] });
	});

	it('the next send continues the restored chat', () => {
		const next = beginTurn(restoreChat(EMPTY_CHAT, stored()), 'more', { chatId: 'other', createdAt: 'later' });
		expect(next.chatId).toBe(FRESH.chatId);
		expect(next.createdAt).toBe(FRESH.createdAt);
		expect(next.sessionId).toBe('s1');
		expect(next.messages.slice(0, 2)).toEqual(stored().messages);
	});
});

describe('slashQuery', () => {
	it('returns what follows a leading slash', () => {
		expect(slashQuery('/')).toBe('');
		expect(slashQuery('/rev')).toBe('rev');
		expect(slashQuery('/plugin:skill')).toBe('plugin:skill');
	});

	it('is null once a space follows the name, mid-text, or without a leading slash', () => {
		expect(slashQuery('/review now')).toBeNull();
		expect(slashQuery('do /review')).toBeNull();
		expect(slashQuery(' /review')).toBeNull();
		expect(slashQuery('')).toBeNull();
	});
});

describe('filterSlashCommands', () => {
	const commands = ['review', 'hello', 'code-review', 'Plugin:Review-it'];

	it('lists every command for an empty query', () => {
		expect(filterSlashCommands('', commands)).toEqual(commands);
	});

	it('puts prefix matches before substring matches, ignoring case', () => {
		expect(filterSlashCommands('rev', commands)).toEqual(['review', 'code-review', 'Plugin:Review-it']);
		expect(filterSlashCommands('HEL', commands)).toEqual(['hello']);
	});

	it('returns nothing when no command matches or there are none', () => {
		expect(filterSlashCommands('zzz', commands)).toEqual([]);
		expect(filterSlashCommands('', [])).toEqual([]);
	});
});

describe('toolTarget', () => {
	it('picks the first known target field', () => {
		expect(toolTarget({ file_path: 'Notes/a.md', content: 'x' })).toBe('Notes/a.md');
		expect(toolTarget({ pattern: '**/*.md' })).toBe('**/*.md');
		expect(toolTarget({ command: 'ls -la' })).toBe('ls -la');
		expect(toolTarget({ url: 'https://example.com' })).toBe('https://example.com');
	});

	it('shortens a long target to one line', () => {
		const target = toolTarget({ command: `echo ${'a'.repeat(200)}\nsecond line` });
		expect(target.length).toBeLessThanOrEqual(80);
		expect(target).not.toContain('\n');
		expect(target.endsWith('...')).toBe(true);
	});

	it('is empty for input with no target field or input that is not an object', () => {
		expect(toolTarget({ todos: [] })).toBe('');
		expect(toolTarget(null)).toBe('');
		expect(toolTarget('text')).toBe('');
		expect(toolTarget([1, 2])).toBe('');
	});
});

describe('normalizeVaultPath', () => {
	it('drops trailing slashes and keeps the root', () => {
		expect(normalizeVaultPath('/Users/me/vault/')).toBe('/Users/me/vault');
		expect(normalizeVaultPath('/Users/me/vault//')).toBe('/Users/me/vault');
		expect(normalizeVaultPath('/Users/me/vault')).toBe('/Users/me/vault');
		expect(normalizeVaultPath('/')).toBe('/');
	});
});

describe('activeNoteContextPath', () => {
	it('returns the vault-relative path of a Markdown note in the vault', () => {
		expect(activeNoteContextPath('/vault/Notes/a.md', '/vault')).toBe('Notes/a.md');
		expect(activeNoteContextPath('/vault/a.MD', '/vault/')).toBe('a.MD');
	});

	it('is null for no tab, no vault, a virtual tab, a non-Markdown file or a path outside the vault', () => {
		expect(activeNoteContextPath(null, '/vault')).toBeNull();
		expect(activeNoteContextPath('/vault/a.md', null)).toBeNull();
		expect(activeNoteContextPath('__tasks__', '/vault')).toBeNull();
		expect(activeNoteContextPath('/vault/board.canvas', '/vault')).toBeNull();
		expect(activeNoteContextPath('/elsewhere/a.md', '/vault')).toBeNull();
	});
});

describe('renderReplyHtml', () => {
	it('renders Markdown', () => {
		const html = renderReplyHtml('**bold** and `code`');
		expect(html).toContain('<strong>bold</strong>');
		expect(html).toContain('<code>code</code>');
	});

	it('turns wikilinks into links to their note, with the alias as text', () => {
		const div = document.createElement('div');
		div.innerHTML = renderReplyHtml('See [[Project Plan]], [[Notes/b#Heading|the heading]] and [[#Local]].');
		const links = [...div.querySelectorAll('a')].map((a) => [a.textContent, a.getAttribute('href')]);
		expect(links).toEqual([
			['Project Plan', '#wikilink=Project%20Plan'],
			['the heading', '#wikilink=Notes%2Fb'],
		]);
		expect(div.textContent).toContain('[[#Local]]');
	});

	it('leaves wikilinks in inline code and fenced blocks as written', () => {
		const div = document.createElement('div');
		div.innerHTML = renderReplyHtml('Use `[[a]]` or ``x [[b]] y``.\n\n```\n[[c]]\n```\n\n~~~md\n[[d]]\n~~~\n\nThen [[e]].');
		const codes = [...div.querySelectorAll('code')].map((c) => c.textContent?.trim());
		expect(codes).toEqual(['[[a]]', 'x [[b]] y', '[[c]]', '[[d]]']);
		expect([...div.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual(['#wikilink=e']);
	});

	it('leaves embeds alone and strips scripts', () => {
		const html = renderReplyHtml('![[image.png]] <script>alert(1)</script>');
		expect(html).not.toContain('#wikilink=');
		expect(html).not.toContain('<script');
	});

	it('is empty for empty text', () => {
		expect(renderReplyHtml('')).toBe('');
	});
});

describe('replyLinkAction', () => {
	it('reads a wikilink target and an external URL', () => {
		expect(replyLinkAction('#wikilink=Notes%2Fb')).toEqual({ kind: 'wikilink', target: 'Notes/b' });
		expect(replyLinkAction('https://example.com/x')).toEqual({ kind: 'external', url: 'https://example.com/x' });
	});

	it('is null for other links, a missing href or a malformed target', () => {
		expect(replyLinkAction('#section')).toBeNull();
		expect(replyLinkAction('file:///etc/passwd')).toBeNull();
		expect(replyLinkAction(null)).toBeNull();
		expect(replyLinkAction('#wikilink=%E0%A4%A')).toBeNull();
		expect(replyLinkAction('#wikilink=')).toBeNull();
	});
});
