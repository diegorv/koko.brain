import type { ClaudeStatus } from '#lib/contracts/index.js';
import { call } from '#lib/contracts/ipc.js';
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
