import type { UnlistenFn } from '@tauri-apps/api/event';
import type { ClaudeEventPayload, ClaudeStatus } from '#lib/contracts/index.js';
import { EVENT_NAMES } from '#lib/contracts/events.js';
import { call, on } from '#lib/contracts/ipc.js';
import { error } from '#lib/utils/debug.js';
import { claudeStatusStore } from './claude-status.store.svelte';

/**
 * Asks Rust whether the `claude` CLI is usable, found and run the way a turn
 * would, and records the answer in `claudeStatusStore`, which the panel and
 * the Settings section share. A blank `binaryPath` runs the automatic lookup
 * (login shell PATH, then known install paths); a non-blank one is checked
 * as given. `refreshEnv` recaptures the login shell environment first: only
 * the Settings section passes true, since the panel remounts on every
 * canvas, kanban or view tab switch. An IPC failure is marked in the store
 * and rethrown.
 */
export async function checkClaudeStatus(binaryPath: string, refreshEnv: boolean): Promise<ClaudeStatus> {
	try {
		const status = await call('claude_status', { binaryPath, refreshEnv });
		claudeStatusStore.setStatus(status);
		return status;
	} catch (err) {
		error('CLAUDE', 'claude_status failed:', err);
		claudeStatusStore.setCheckFailed();
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
