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
});
