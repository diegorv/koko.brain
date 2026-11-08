// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	mkdir: vi.fn(),
	exists: vi.fn(),
}));

vi.mock('#lib/core/settings/theme.service.js', () => ({
	applyActiveTheme: vi.fn(),
}));

import { readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { loadSettings } from '#lib/core/settings/settings.service.js';

const SETTINGS_PATH = '/vault/.kokobrain/settings.json';

/** Writes that replaced settings.json, in call order. */
function settingsWrites(): string[] {
	return vi.mocked(writeTextFile).mock.calls
		.filter(([p]) => p === SETTINGS_PATH)
		.map(([, c]) => c as string);
}

describe('F29: settings.json is overwritten with defaults on a failed load', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		settingsStore.reset();
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	it('a transient read error must not overwrite the existing settings file', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockRejectedValue(new Error('EACCES: permission denied'));

		await loadSettings('/vault');

		// Correct behavior: the file we could not read is left alone.
		expect(settingsWrites()).toEqual([]);
	});

	it('an unparseable settings file is not replaced without keeping its original bytes', async () => {
		// A settings.json cut short mid-write (plain truncating writeTextFile).
		const original = '{\n  "editor": {\n    "fontSize": 22,\n    "lineHei';
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(original);

		await loadSettings('/vault');

		const clobbered = settingsWrites().length > 0;
		const backedUp = vi.mocked(writeTextFile).mock.calls.some(
			([p, c]) => p !== SETTINGS_PATH && c === original,
		);
		// Correct behavior: either do not overwrite, or keep a copy first.
		expect(clobbered && !backedUp).toBe(false);
	});
});
