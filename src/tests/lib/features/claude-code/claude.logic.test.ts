// @vitest-environment jsdom
// jsdom: renderReplyHtml sanitizes through DOMPurify, which needs a DOM.
import { describe, it, expect } from 'vitest';
import type { ClaudeEvent } from '#lib/contracts/index.js';
import {
	activeNoteContextPath,
	beginTurn,
	EMPTY_CHAT,
	failTurn,
	filterSlashCommands,
	normalizeVaultPath,
	receiveEvent,
	renderReplyHtml,
	replyLinkAction,
	requestStop,
	resetChat,
	SESSION_GONE,
	showError,
	slashQuery,
	startRun,
	toolTarget,
	type ChatState,
} from '#lib/features/claude-code/claude.logic.js';

/** A chat with one turn sent and its run id known. */
function running(runId = 'r1'): ChatState {
	return startRun(beginTurn(EMPTY_CHAT, 'hello'), runId);
}

const event = (state: ChatState, ev: ClaudeEvent, runId = 'r1') => receiveEvent(state, { runId, event: ev });

describe('beginTurn', () => {
	it('adds the user message and an empty reply, and waits for a run id', () => {
		const state = beginTurn(EMPTY_CHAT, '/hello world');
		expect(state.messages).toEqual([
			{ role: 'user', text: '/hello world' },
			{ role: 'assistant', parts: [] },
		]);
		expect(state.status).toBe('running');
		expect(state.runId).toBeNull();
		expect(state.error).toBeNull();
	});

	it('clears the error of the previous turn', () => {
		const state = beginTurn(failTurn(EMPTY_CHAT, 'boom'), 'again');
		expect(state.error).toBeNull();
		expect(state.status).toBe('running');
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
		const waiting = beginTurn(EMPTY_CHAT, 'hi');
		const buffered = receiveEvent(waiting, { runId: 'r1', event: { type: 'TextDelta', text: 'early' } });
		expect(buffered.pending).toHaveLength(1);
		expect(buffered.messages.at(-1)).toEqual({ role: 'assistant', parts: [] });
	});
});

describe('startRun', () => {
	it('replays the buffered events of its run and drops the others', () => {
		let state = beginTurn(EMPTY_CHAT, 'hi');
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
		const state = startRun(beginTurn(EMPTY_CHAT, 'hi'), 'r1');
		expect(state.runId).toBe('r1');
		expect(state.status).toBe('running');
	});
});

describe('failTurn', () => {
	it('sets the error, clears the run and drops the buffer', () => {
		let state = beginTurn(EMPTY_CHAT, 'hi');
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
		const waiting = requestStop(beginTurn(EMPTY_CHAT, 'hi'));
		expect(waiting.stopRequested).toBe(true);
		const started = startRun(waiting, 'r1');
		expect(started.stopRequested).toBe(true);
		expect(event(started, { type: 'Done', exitCode: null }).stopRequested).toBe(false);
		expect(beginTurn(waiting, 'again').stopRequested).toBe(false);
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
