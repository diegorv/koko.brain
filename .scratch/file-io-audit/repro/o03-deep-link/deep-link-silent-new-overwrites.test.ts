import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage } from '../../fixtures/localStorage.fixture';

setupLocalStorage();

/** Fake disk shared by the plugin-fs mock. */
const disk = new Map<string, string>();

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(async () => undefined),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
	exists: vi.fn(async (p: string) => disk.has(p)),
	readTextFile: vi.fn(async (p: string) => {
		if (!disk.has(p)) throw new Error(`not found: ${p}`);
		return disk.get(p)!;
	}),
	writeTextFile: vi.fn(async (p: string, c: string) => {
		disk.set(p, c);
	}),
	mkdir: vi.fn(async () => undefined),
	readDir: vi.fn(async () => []),
}));

vi.mock('@tauri-apps/plugin-deep-link', () => ({
	onOpenUrl: vi.fn(() => Promise.resolve(vi.fn())),
	getCurrent: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({
	// A non-text clipboard (image, file) reads back as an empty string.
	readText: vi.fn(async () => ''),
}));

import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { executeAction } from '#lib/features/deep-link/deep-link.service.js';
import { parseDeepLinkUri } from '#lib/features/deep-link/deep-link.logic.js';

const VAULT = '/vault';
const JOURNAL = `${VAULT}/Journal.md`;
const EXISTING = '# Journal\nYears of entries.\n';

describe('repro o03: silent `new` without a mode flag on an existing note', () => {
	beforeEach(() => {
		disk.clear();
		editorStore.reset();
		vaultStore._reset();
		vaultStore.open(VAULT);
		disk.set(JOURNAL, EXISTING);
	});

	it('does not truncate the existing note when there is no content', async () => {
		const parsed = parseDeepLinkUri('kokobrain://new?vault=V&name=Journal&silent=true&clipboard=true');
		expect(parsed.ok).toBe(true);
		if (!parsed.ok) return;

		await executeAction(parsed.action, VAULT);

		// The non-silent path (openOrCreateNote) only opens an existing note;
		// `overwrite=true` is the documented way to replace it.
		expect(disk.get(JOURNAL)).toBe(EXISTING);
	});

	it('does not replace the existing note with the given content', async () => {
		const parsed = parseDeepLinkUri('kokobrain://new?vault=V&name=Journal&silent=true&content=hello');
		expect(parsed.ok).toBe(true);
		if (!parsed.ok) return;

		await executeAction(parsed.action, VAULT);

		expect(disk.get(JOURNAL)).toContain('Years of entries.');
	});
});
