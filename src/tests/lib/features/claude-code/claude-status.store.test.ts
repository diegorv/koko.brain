import { describe, it, expect, beforeEach } from 'vitest';
import type { ClaudeStatus } from '#lib/contracts/index.js';
import { claudeStatusStore } from '#lib/features/claude-code/claude-status.store.svelte.js';

const INSTALLED: ClaudeStatus = { installed: true, path: '/bin/claude', version: '2.1.325 (Claude Code)', error: null };
const MISSING: ClaudeStatus = { installed: false, path: null, version: null, error: 'not found' };

describe('claudeStatusStore', () => {
	beforeEach(() => {
		claudeStatusStore.reset();
	});

	it('starts with no status and is not unavailable before the first check', () => {
		expect(claudeStatusStore.status).toBeNull();
		expect(claudeStatusStore.checkFailed).toBe(false);
		expect(claudeStatusStore.unavailable).toBe(false);
	});

	it('is available with an installed status', () => {
		claudeStatusStore.setStatus(INSTALLED);

		expect(claudeStatusStore.status).toEqual(INSTALLED);
		expect(claudeStatusStore.unavailable).toBe(false);
	});

	it('is unavailable with a missing status', () => {
		claudeStatusStore.setStatus(MISSING);

		expect(claudeStatusStore.unavailable).toBe(true);
	});

	it('a failed check keeps the last status and is unavailable until a status arrives', () => {
		claudeStatusStore.setStatus(INSTALLED);
		claudeStatusStore.setCheckFailed();

		expect(claudeStatusStore.checkFailed).toBe(true);
		expect(claudeStatusStore.status).toEqual(INSTALLED);
		expect(claudeStatusStore.unavailable).toBe(true);

		claudeStatusStore.setStatus(INSTALLED);
		expect(claudeStatusStore.checkFailed).toBe(false);
		expect(claudeStatusStore.unavailable).toBe(false);
	});

	it('reset clears the status and the failure', () => {
		claudeStatusStore.setStatus(MISSING);
		claudeStatusStore.setCheckFailed();

		claudeStatusStore.reset();

		expect(claudeStatusStore.status).toBeNull();
		expect(claudeStatusStore.checkFailed).toBe(false);
	});
});
