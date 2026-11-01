/**
 * Base `test` for every E2E fixture: fails a spec when the page logs a
 * message that means the Tauri mock fell out of step with the app.
 *
 * The app swallows many IPC failures (log only, no toast), so a mock that
 * returns `null` for a command can break a code path without any assertion
 * noticing. This guard turns those console messages into spec failures.
 */

import { test as base } from '@playwright/test';

/** Prefix `e2e/mocks/tauri-core.ts::invoke` logs for a command it has no handler for. */
const UNKNOWN_COMMAND_PREFIX = '[e2e mock] Unknown invoke command: ';

/**
 * Commands the mock may leave unhandled, by name, with the reason the
 * `null` fallback is tolerated. Empty: `HANDLERS` in e2e/mocks/tauri-core.ts
 * covers every `CommandMap` command, so any unknown command fails the spec.
 * Add a handler for a new warning instead of an entry here.
 */
export const ALLOWED_UNKNOWN_COMMANDS: Record<string, string> = {};

/** Substrings of console messages that always fail a spec. */
const FORBIDDEN_MESSAGES = ['scan_vault_v2_cached failed'];

/**
 * Returns the reason `text` must fail the spec, or `null` when it is fine.
 * An unknown-command warning passes only when its command is allowlisted.
 */
function violation(text: string): string | null {
	if (text.startsWith(UNKNOWN_COMMAND_PREFIX)) {
		const cmd = text.slice(UNKNOWN_COMMAND_PREFIX.length).split(/\s/)[0];
		return cmd in ALLOWED_UNKNOWN_COMMANDS ? null : `unknown invoke command \`${cmd}\``;
	}
	const hit = FORBIDDEN_MESSAGES.find((m) => text.includes(m));
	return hit ? `console message \`${hit}\`` : null;
}

export const test = base.extend<{ consoleGuard: void }>({
	consoleGuard: [
		async ({ page }, use) => {
			const violations: string[] = [];
			page.on('console', (msg) => {
				const text = msg.text();
				const reason = violation(text);
				if (reason) violations.push(`${reason}: ${text}`);
			});
			await use();
			if (violations.length > 0) {
				throw new Error(`Console guard (e2e/fixtures/console-guard.ts):\n${violations.join('\n')}`);
			}
		},
		{ auto: true },
	],
});

export { expect } from '@playwright/test';
