import type { ClaudeStatus } from '#lib/contracts/index.js';

/** Last status Rust returned; `null` before the first check. */
let status = $state<ClaudeStatus | null>(null);
/** True when the last check itself failed (IPC), not when claude is missing. */
let checkFailed = $state(false);

/**
 * The `claude` binary status, shared by the agent panel and the Claude Code settings, so a status
 * fixed in Settings reaches the open panel. `checkClaudeStatus` writes it.
 */
export const claudeStatusStore = {
	/** Last status Rust returned; `null` before the first check. */
	get status() { return status; },
	/** True when the last check itself failed (IPC), not when claude is missing. */
	get checkFailed() { return checkFailed; },
	/** True when the last check failed or found no usable `claude`; false before the first check. */
	get unavailable() { return checkFailed || (status !== null && !status.installed); },

	/** Records a status Rust returned and clears a failed check. */
	setStatus(next: ClaudeStatus) {
		status = next;
		checkFailed = false;
	},
	/** Records that the check itself failed; the last status is kept. */
	setCheckFailed() { checkFailed = true; },
	/** Back to the initial state. */
	reset() {
		status = null;
		checkFailed = false;
	},
};
