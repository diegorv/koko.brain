import { describe, it, expect, beforeEach } from 'vitest';
import { terminalStore } from '$lib/plugins/terminal/terminal.store.svelte';

describe('terminalStore', () => {
	beforeEach(() => {
		terminalStore.reset();
	});

	it('starts with empty sessions', () => {
		expect(terminalStore.sessions).toEqual([]);
		expect(terminalStore.activeSessionIndex).toBe(0);
	});

	it('adds session and makes it active', () => {
		terminalStore.addSession({ sessionId: 'abc', title: 'Terminal 1', alive: true });
		expect(terminalStore.sessions.length).toBe(1);
		expect(terminalStore.activeSessionIndex).toBe(0);
		expect(terminalStore.sessions[terminalStore.activeSessionIndex]?.sessionId).toBe('abc');
	});

	it('adds multiple sessions and activates last', () => {
		terminalStore.addSession({ sessionId: 'a', title: 'T1', alive: true });
		terminalStore.addSession({ sessionId: 'b', title: 'T2', alive: true });
		expect(terminalStore.activeSessionIndex).toBe(1);
		expect(terminalStore.sessions[terminalStore.activeSessionIndex]?.sessionId).toBe('b');
	});

	it('removes session by id', () => {
		terminalStore.addSession({ sessionId: 'a', title: 'T1', alive: true });
		terminalStore.addSession({ sessionId: 'b', title: 'T2', alive: true });
		terminalStore.removeSession('a');
		expect(terminalStore.sessions.length).toBe(1);
		expect(terminalStore.sessions[0].sessionId).toBe('b');
	});

	it('adjusts active index when removing active session', () => {
		terminalStore.addSession({ sessionId: 'a', title: 'T1', alive: true });
		terminalStore.addSession({ sessionId: 'b', title: 'T2', alive: true });
		terminalStore.setActiveIndex(1);
		terminalStore.removeSession('b');
		expect(terminalStore.activeSessionIndex).toBe(0);
	});

	it('decrements active index when removing session before it', () => {
		terminalStore.addSession({ sessionId: 'a', title: 'T1', alive: true });
		terminalStore.addSession({ sessionId: 'b', title: 'T2', alive: true });
		terminalStore.addSession({ sessionId: 'c', title: 'T3', alive: true });
		terminalStore.setActiveIndex(1);
		expect(terminalStore.activeSession?.sessionId).toBe('b');

		terminalStore.removeSession('a');
		expect(terminalStore.activeSessionIndex).toBe(0);
		expect(terminalStore.activeSession?.sessionId).toBe('b');
	});

	it('resets index when removing only session', () => {
		terminalStore.addSession({ sessionId: 'a', title: 'T1', alive: true });
		terminalStore.removeSession('a');
		expect(terminalStore.sessions.length).toBe(0);
		expect(terminalStore.activeSessionIndex).toBe(0);
	});

	it('marks session as exited', () => {
		terminalStore.addSession({ sessionId: 'a', title: 'T1', alive: true });
		terminalStore.markExited('a');
		expect(terminalStore.sessions[0].alive).toBe(false);
	});

	it('sets active index', () => {
		terminalStore.addSession({ sessionId: 'a', title: 'T1', alive: true });
		terminalStore.addSession({ sessionId: 'b', title: 'T2', alive: true });
		terminalStore.setActiveIndex(0);
		expect(terminalStore.sessions[terminalStore.activeSessionIndex]?.sessionId).toBe('a');
	});

	describe('activeSession (derived)', () => {
		it('returns null when no sessions exist', () => {
			expect(terminalStore.activeSession).toBeNull();
		});

		it('returns the session at activeSessionIndex', () => {
			terminalStore.addSession({ sessionId: 'a', title: 'T1', alive: true });
			terminalStore.addSession({ sessionId: 'b', title: 'T2', alive: true });
			terminalStore.setActiveIndex(0);

			expect(terminalStore.activeSession).toEqual(
				expect.objectContaining({ sessionId: 'a', title: 'T1' }),
			);
		});

		it('updates when active index changes', () => {
			terminalStore.addSession({ sessionId: 'a', title: 'T1', alive: true });
			terminalStore.addSession({ sessionId: 'b', title: 'T2', alive: true });

			expect(terminalStore.activeSession?.sessionId).toBe('b');
			terminalStore.setActiveIndex(0);
			expect(terminalStore.activeSession?.sessionId).toBe('a');
		});

		it('updates when active session is removed', () => {
			terminalStore.addSession({ sessionId: 'a', title: 'T1', alive: true });
			terminalStore.addSession({ sessionId: 'b', title: 'T2', alive: true });
			terminalStore.setActiveIndex(1);
			terminalStore.removeSession('b');

			expect(terminalStore.activeSession?.sessionId).toBe('a');
		});

		it('reflects markExited change', () => {
			terminalStore.addSession({ sessionId: 'a', title: 'T1', alive: true });
			expect(terminalStore.activeSession?.alive).toBe(true);

			terminalStore.markExited('a');
			expect(terminalStore.activeSession?.alive).toBe(false);
		});
	});

	it('resets clears everything', () => {
		terminalStore.addSession({ sessionId: 'a', title: 'T1', alive: true });
		terminalStore.addSession({ sessionId: 'b', title: 'T2', alive: true });
		terminalStore.reset();
		expect(terminalStore.sessions.length).toBe(0);
		expect(terminalStore.activeSessionIndex).toBe(0);
		expect(terminalStore.activeSession).toBeNull();
	});
});
