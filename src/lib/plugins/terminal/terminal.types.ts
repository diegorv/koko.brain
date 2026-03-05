/** Represents a single terminal session managed by the Rust backend */
export interface TerminalSession {
	/** Unique identifier returned from the spawn_terminal Rust command */
	sessionId: string;
	/** Display title shown in the tab (e.g., "Terminal 1") */
	title: string;
	/** Whether this session's shell process is still running */
	alive: boolean;
}

/** Payload shape for terminal:output:{sessionId} events from Rust */
export interface TerminalOutputPayload {
	/** The session this output belongs to */
	sessionId: string;
	/** Raw terminal output data (may contain ANSI escape sequences) */
	data: string;
}
