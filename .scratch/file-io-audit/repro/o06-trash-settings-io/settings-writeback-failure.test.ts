// @vitest-environment jsdom
// Repro for o06 vault-lifecycle-3. Asserts the CORRECT behaviour, so it fails
// while the bug exists.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const disk = vi.hoisted(() => new Map<string, string>());

vi.mock('@tauri-apps/plugin-fs', () => ({
	exists: vi.fn(async (p: string) => disk.has(p) || p.endsWith('/.kokobrain')),
	readTextFile: vi.fn(async (p: string) => {
		const c = disk.get(p);
		if (c === undefined) throw new Error(`ENOENT: ${p}`);
		return c;
	}),
	writeTextFile: vi.fn(async (p: string, c: string) => {
		disk.set(p, c);
	}),
	mkdir: vi.fn(async () => {}),
}));

vi.mock('#lib/core/settings/theme.service.js', () => ({
	applyActiveTheme: vi.fn(),
}));

import { writeTextFile } from '@tauri-apps/plugin-fs';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { loadSettings } from '#lib/core/settings/settings.service.js';

const FILE = '/vault/.kokobrain/settings.json';

beforeEach(() => {
	disk.clear();
	settingsStore.reset();
});

describe('o06 loadSettings: a failed optional write-back', () => {
	it('keeps the settings it just read when only the write-back fails', async () => {
		disk.set(FILE, JSON.stringify({
			history: { enabled: true, retentionDays: 365 },
			periodicNotes: { folder: 'Journal' },
		}));
		// One failing write (ENOSPC, EBUSY from a sync client, a read-only
		// remount); the next write works again.
		vi.mocked(writeTextFile).mockRejectedValueOnce(new Error('No space left on device (os error 28)'));

		await loadSettings('/vault');

		// The read succeeded: the session must run on the user's settings.
		// `cleanup_history` reads this value right after the load.
		expect(settingsStore.history.retentionDays).toBe(365);
		expect(settingsStore.periodicNotes.folder).toBe('Journal');
		// And the user's file must not be replaced by defaults.
		expect(JSON.parse(disk.get(FILE)!).history.retentionDays).toBe(365);
	});

	it('does not overwrite a readable settings.json with defaults after one failed write-back', async () => {
		disk.set(FILE, JSON.stringify({ history: { enabled: true, retentionDays: 365 } }));
		vi.mocked(writeTextFile).mockRejectedValueOnce(new Error('Resource busy (os error 16)'));

		await loadSettings('/vault');

		expect(JSON.parse(disk.get(FILE)!).history.retentionDays).toBe(365);
	});
});
