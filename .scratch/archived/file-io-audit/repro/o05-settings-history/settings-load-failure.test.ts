// @vitest-environment jsdom
// Repro for o05 cross-cutting-7 / recovery-1 / vault-lifecycle-2 / fidelity-11.
// Asserts the CORRECT behavior, so every test here fails while the bug exists.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	mkdir: vi.fn(),
	exists: vi.fn(),
}));

import { readTextFile, writeTextFile, mkdir, exists } from '@tauri-apps/plugin-fs';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { loadSettings } from '#lib/core/settings/settings.service.js';

const VAULT = '/vault';
const SETTINGS = '/vault/.kokobrain/settings.json';

/** A user file: retention raised to 365 days and a custom periodic-notes folder. */
const USER_JSON = JSON.stringify(
	{ history: { enabled: true, retentionDays: 365, snapshotBackupEnabled: false }, periodicNotes: { folder: 'my-journal' } },
	null,
	2,
);

function writesTo(path: string): string[] {
	return vi.mocked(writeTextFile).mock.calls.filter((c) => c[0] === path).map((c) => String(c[1]));
}

function allWrites(): string[] {
	return vi.mocked(writeTextFile).mock.calls.map((c) => String(c[1]));
}

describe('o05: settings load failure must not destroy user settings', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, 'error').mockImplementation(() => {});
		settingsStore.reset();
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(mkdir).mockResolvedValue(undefined);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
	});

	it('a truncated settings.json (crash mid-write) is not overwritten with defaults without keeping the original bytes', async () => {
		// Truncated half-way through, as a crash during the in-place
		// truncate+write_all of plugin-fs would leave it.
		const truncated = USER_JSON.slice(0, Math.floor(USER_JSON.length / 2));
		vi.mocked(readTextFile).mockResolvedValue(truncated);

		await loadSettings(VAULT);

		const overwritten = writesTo(SETTINGS).length > 0;
		const originalKeptSomewhere = allWrites().some((c) => c === truncated);
		// Correct: either leave settings.json alone, or back the bytes up first.
		expect(overwritten && !originalKeptSomewhere).toBe(false);
	});

	it('a transient read error does not overwrite a valid settings.json with defaults', async () => {
		vi.mocked(readTextFile).mockRejectedValue(new Error('EIO: i/o error (transient)'));

		await loadSettings(VAULT);

		// The file on disk was never read, so nothing is known to be wrong with it.
		expect(writesTo(SETTINGS)).toEqual([]);
	});

	it('a valid settings.json whose write-back fails keeps the user retention (365) in the store', async () => {
		vi.mocked(readTextFile).mockResolvedValue(USER_JSON);
		// The write-back after a successful parse fails (EACCES / ENOSPC).
		vi.mocked(writeTextFile).mockRejectedValue(new Error('EACCES: permission denied'));

		await loadSettings(VAULT);

		// initializeVault passes this value straight to cleanup_history.
		expect(settingsStore.history.retentionDays).toBe(365);
		expect(settingsStore.periodicNotes.folder).toBe('my-journal');
	});
});
