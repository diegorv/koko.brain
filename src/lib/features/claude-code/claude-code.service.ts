import type { UnlistenFn } from '@tauri-apps/api/event';
import type { ClaudeEventPayload, ClaudeStatus } from '#lib/contracts/index.js';
import { EVENT_NAMES } from '#lib/contracts/events.js';
import { call, on } from '#lib/contracts/ipc.js';
import { error } from '#lib/utils/debug.js';

/**
 * Asks Rust whether the `claude` CLI is usable. A blank `binaryPath` runs the
 * automatic lookup (login shell, then known install paths); a non-blank one
 * is checked as given.
 */
export async function checkClaudeStatus(binaryPath: string): Promise<ClaudeStatus> {
	try {
		return await call('claude_status', { binaryPath });
	} catch (err) {
		error('CLAUDE', 'claude_status failed:', err);
		throw err;
	}
}

/**
 * Subscribes to the events of every agent turn (`claude-event`). Each run's
 * events carry its `runId` and end with `Done`; events can arrive before
 * `claude_run_turn` resolves with that id. Resolves to the unlisten function.
 */
export function onClaudeEvent(handler: (payload: ClaudeEventPayload) => void): Promise<UnlistenFn> {
	return on(EVENT_NAMES.CLAUDE, handler);
}
