import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage } from '../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	mkdir: vi.fn(),
	exists: vi.fn(),
}));

vi.mock('#lib/utils/debug.js', () => ({
	debug: vi.fn(),
	error: vi.fn(),
}));

import { readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';
import { autoMoveStore } from '#lib/features/auto-move/auto-move.store.svelte.js';
import {
	loadAutoMoveConfig,
	saveAutoMoveConfig,
	resetAutoMove,
} from '#lib/features/auto-move/auto-move.service.js';

const VAULT = '/vault';
const CONFIG_PATH = '/vault/.kokobrain/auto-move-rules.json';

// Repro for vault-lifecycle-8 (first half): a rules file that fails to parse
// loads as an empty config, and the next save writes the store back over the
// unreadable file. Correct behavior asserted here: the unreadable bytes are
// not lost by the next save (the file is left alone, or copied aside first).
describe('auto-move config after an unreadable load (h08 vault-lifecycle-8)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetAutoMove();
	});

	it('does not replace an unparseable rules file with the empty fallback', async () => {
		const corrupt = '{"rules": [ {"id": "r1", "name": "Papers"';
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(corrupt);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadAutoMoveConfig(VAULT);
		expect(autoMoveStore.rules).toEqual([]);

		autoMoveStore.addRule({
			id: 'r2',
			name: 'New',
			expression: "file.hasTag('new')",
			destination: 'Archive',
			enabled: true,
		});
		await saveAutoMoveConfig(VAULT);

		const calls = vi.mocked(writeTextFile).mock.calls;
		const configWrites = calls.filter(([path]) => path === CONFIG_PATH);
		const originalKeptElsewhere = calls.some(([path, content]) => path !== CONFIG_PATH && content === corrupt);

		expect(configWrites.length === 0 || originalKeptElsewhere).toBe(true);
	});
});
