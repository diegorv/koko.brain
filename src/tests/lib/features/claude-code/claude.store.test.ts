import { describe, it, expect, beforeEach } from 'vitest';
import { claudeStore } from '#lib/features/claude-code/claude.store.svelte.js';

describe('claudeStore', () => {
	beforeEach(() => claudeStore.reset());

	it('starts empty and idle', () => {
		expect(claudeStore.messages).toEqual([]);
		expect(claudeStore.runId).toBeNull();
		expect(claudeStore.sessionId).toBeNull();
		expect(claudeStore.status).toBe('idle');
		expect(claudeStore.isRunning).toBe(false);
		expect(claudeStore.error).toBeNull();
		expect(claudeStore.slashCommands).toEqual([]);
		expect(claudeStore.contextNotes).toEqual([]);
	});

	it('runs a turn through its events', () => {
		claudeStore.beginTurn('hi');
		expect(claudeStore.isRunning).toBe(true);
		claudeStore.startRun('r1');
		expect(claudeStore.runId).toBe('r1');
		claudeStore.receive({ runId: 'r1', event: { type: 'Init', sessionId: 's1', model: 'm', slashCommands: ['hello'], skills: [] } });
		claudeStore.receive({ runId: 'r1', event: { type: 'TextDelta', text: 'Hey' } });
		claudeStore.receive({ runId: 'r1', event: { type: 'Result', sessionId: 's1', text: 'Hey', isError: false, costUsd: null, numTurns: 1 } });
		claudeStore.receive({ runId: 'r1', event: { type: 'Done', exitCode: 0 } });

		expect(claudeStore.messages).toEqual([
			{ role: 'user', text: 'hi' },
			{ role: 'assistant', parts: [{ kind: 'text', text: 'Hey' }] },
		]);
		expect(claudeStore.slashCommands).toEqual(['hello']);
		expect(claudeStore.sessionId).toBe('s1');
		expect(claudeStore.status).toBe('idle');
		expect(claudeStore.isRunning).toBe(false);
		expect(claudeStore.runId).toBeNull();
	});

	it('ignores events of another run', () => {
		claudeStore.beginTurn('hi');
		claudeStore.startRun('r2');
		claudeStore.receive({ runId: 'r1', event: { type: 'TextDelta', text: 'old' } });
		expect(claudeStore.messages.at(-1)).toEqual({ role: 'assistant', parts: [] });
	});

	it('failTurn shows the error and stops running', () => {
		claudeStore.beginTurn('hi');
		claudeStore.failTurn('claude is not installed');
		expect(claudeStore.status).toBe('error');
		expect(claudeStore.isRunning).toBe(false);
		expect(claudeStore.error).toBe('claude is not installed');
	});

	it('adds a note once and removes it', () => {
		claudeStore.addContextNote('a.md');
		claudeStore.addContextNote('b.md');
		claudeStore.addContextNote('a.md');
		expect(claudeStore.contextNotes).toEqual(['a.md', 'b.md']);
		claudeStore.removeContextNote('a.md');
		expect(claudeStore.contextNotes).toEqual(['b.md']);
		claudeStore.removeContextNote('missing.md');
		expect(claudeStore.contextNotes).toEqual(['b.md']);
	});

	it('newChat clears the chat, keeps the slash commands and sets the notes', () => {
		claudeStore.addContextNote('a.md');
		claudeStore.beginTurn('hi');
		claudeStore.startRun('r1');
		claudeStore.receive({ runId: 'r1', event: { type: 'Init', sessionId: 's1', model: 'm', slashCommands: ['hello'], skills: [] } });
		claudeStore.receive({ runId: 'r1', event: { type: 'Result', sessionId: 's1', text: 'x', isError: false, costUsd: null, numTurns: 1 } });
		claudeStore.receive({ runId: 'r1', event: { type: 'Done', exitCode: 0 } });

		claudeStore.newChat(['b.md']);
		expect(claudeStore.messages).toEqual([]);
		expect(claudeStore.sessionId).toBeNull();
		expect(claudeStore.slashCommands).toEqual(['hello']);
		expect(claudeStore.contextNotes).toEqual(['b.md']);
	});

	describe('chat identity', () => {
		/** Sends `text` and ends its turn. */
		function turn(text: string, runId: string) {
			claudeStore.beginTurn(text);
			claudeStore.startRun(runId);
			claudeStore.receive({ runId, event: { type: 'Done', exitCode: 0 } });
		}

		it('has no id or creation time before the first send', () => {
			expect(claudeStore.chatId).toBeNull();
			expect(claudeStore.createdAt).toBeNull();
			expect(claudeStore.restored).toBe(false);
		});

		it('New chat, then two sends, gives one chat id whose createdAt does not change', () => {
			turn('earlier chat', 'r0');
			const earlier = claudeStore.chatId;
			claudeStore.newChat([]);
			expect(claudeStore.chatId).toBeNull();
			expect(claudeStore.createdAt).toBeNull();

			turn('one', 'r1');
			const chatId = claudeStore.chatId;
			const createdAt = claudeStore.createdAt;
			expect(chatId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
			expect(chatId).not.toBe(earlier);
			expect(new Date(createdAt!).toISOString()).toBe(createdAt);

			turn('two', 'r2');
			expect(claudeStore.chatId).toBe(chatId);
			expect(claudeStore.createdAt).toBe(createdAt);
		});
	});

	describe('restore', () => {
		const saved = {
			version: 1 as const,
			chatId: '0f8fad5b-d9cb-469f-a165-70867728950e',
			sessionId: 's1',
			createdAt: '2026-11-16T10:00:00.000Z',
			updatedAt: '2026-11-16T10:05:00.000Z',
			title: 'hello',
			messages: [{ role: 'user' as const, text: 'hello' }, { role: 'assistant' as const, parts: [{ kind: 'text' as const, text: 'Hi' }] }],
		};

		it('shows the saved chat with no run, keeps the slash commands and the attached notes', () => {
			claudeStore.addContextNote('a.md');
			claudeStore.beginTurn('x');
			claudeStore.startRun('r1');
			claudeStore.receive({ runId: 'r1', event: { type: 'Init', sessionId: 's0', model: 'm', slashCommands: ['hello'], skills: [] } });
			claudeStore.receive({ runId: 'r1', event: { type: 'Done', exitCode: 0 } });

			claudeStore.restore(saved);
			expect(claudeStore.messages).toEqual(saved.messages);
			expect(claudeStore.sessionId).toBe('s1');
			expect(claudeStore.chatId).toBe(saved.chatId);
			expect(claudeStore.createdAt).toBe(saved.createdAt);
			expect(claudeStore.runId).toBeNull();
			expect(claudeStore.status).toBe('idle');
			expect(claudeStore.restored).toBe(true);
			expect(claudeStore.slashCommands).toEqual(['hello']);
			expect(claudeStore.contextNotes).toEqual(['a.md']);
		});

		it('works after a failed turn', () => {
			claudeStore.beginTurn('x');
			claudeStore.failTurn('boom');
			claudeStore.restore(saved);
			expect(claudeStore.chatId).toBe(saved.chatId);
			expect(claudeStore.error).toBeNull();
		});

		it('does nothing while a turn runs', () => {
			claudeStore.beginTurn('x');
			const chatId = claudeStore.chatId;
			claudeStore.restore(saved);
			expect(claudeStore.chatId).toBe(chatId);
			expect(claudeStore.isRunning).toBe(true);
			claudeStore.restore(null);
			expect(claudeStore.messages).toHaveLength(2);
		});

		it('with no saved chat leaves an empty chat', () => {
			claudeStore.restore(saved);
			claudeStore.restore(null);
			expect(claudeStore.messages).toEqual([]);
			expect(claudeStore.chatId).toBeNull();
			expect(claudeStore.restored).toBe(false);
		});

		it('the notice stays until the next send or New chat', () => {
			claudeStore.restore(saved);
			claudeStore.beginTurn('next');
			expect(claudeStore.restored).toBe(false);
			expect(claudeStore.chatId).toBe(saved.chatId);

			claudeStore.failTurn('x');
			claudeStore.restore(saved);
			claudeStore.newChat([]);
			expect(claudeStore.restored).toBe(false);
		});
	});
});
