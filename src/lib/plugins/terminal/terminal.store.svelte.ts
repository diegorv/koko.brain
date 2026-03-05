import type { TerminalSession } from './terminal.types';

/** All active terminal sessions */
let sessions = $state<TerminalSession[]>([]);
/** Index of the currently active/visible terminal session */
let activeSessionIndex = $state<number>(0);

// Derived state implemented as getters for vitest compatibility

/** Reactive store for terminal plugin state */
export const terminalStore = {
	get sessions() {
		return sessions;
	},
	get activeSessionIndex() {
		return activeSessionIndex;
	},
	/** The currently active session, or null if no sessions exist */
	get activeSession() {
		return sessions[activeSessionIndex] ?? null;
	},

	/** Adds a new session and makes it active */
	addSession(session: TerminalSession) {
		sessions = [...sessions, session];
		activeSessionIndex = sessions.length - 1;
	},

	/** Removes a session by ID and adjusts active index */
	removeSession(sessionId: string) {
		const idx = sessions.findIndex((s) => s.sessionId === sessionId);
		if (idx < 0) return;
		sessions = sessions.filter((s) => s.sessionId !== sessionId);
		if (sessions.length === 0) {
			activeSessionIndex = 0;
		} else if (idx < activeSessionIndex) {
			activeSessionIndex--;
		} else if (activeSessionIndex >= sessions.length) {
			activeSessionIndex = sessions.length - 1;
		}
	},

	/** Marks a session as no longer alive (shell process exited) */
	markExited(sessionId: string) {
		sessions = sessions.map((s) =>
			s.sessionId === sessionId ? { ...s, alive: false } : s,
		);
	},

	/** Sets the active session index */
	setActiveIndex(index: number) {
		activeSessionIndex = index;
	},

	/** Resets all state to initial values */
	reset() {
		sessions = [];
		activeSessionIndex = 0;
	},
};
