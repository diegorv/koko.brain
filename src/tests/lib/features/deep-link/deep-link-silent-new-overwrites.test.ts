import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage } from '../../../fixtures/localStorage.fixture';

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

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

import { writeTextFile } from '@tauri-apps/plugin-fs';
import { toast } from 'svelte-sonner';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { executeAction } from '#lib/features/deep-link/deep-link.service.js';
import { parseDeepLinkUri } from '#lib/features/deep-link/deep-link.logic.js';

const VAULT = '/vault';
const JOURNAL = `${VAULT}/Journal.md`;
const EXISTING = '# Journal\nYears of entries.\n';
const NOT_OVERWRITTEN = 'Journal already exists; not overwritten. Use overwrite=true to replace it.';

/** Parses a deep-link URI and runs its action against the test vault. */
async function run(uri: string): Promise<void> {
	const parsed = parseDeepLinkUri(uri);
	expect(parsed.ok).toBe(true);
	if (!parsed.ok) return;
	await executeAction(parsed.action, VAULT);
}

describe('silent `new` without a mode flag', () => {
	beforeEach(() => {
		settingsStore.setSettings({ ...settingsStore.settings, explicitOrganization: false });
		vi.clearAllMocks();
		disk.clear();
		editorStore.reset();
		vaultStore._reset();
		vaultStore.open(VAULT);
		disk.set(JOURNAL, EXISTING);
	});

	it('does not truncate the existing note when there is no content', async () => {
		await run('kokobrain://new?vault=V&name=Journal&silent=true&clipboard=true');

		// The non-silent path (openOrCreateNote) only opens an existing note;
		// `overwrite=true` is the documented way to replace it.
		expect(disk.get(JOURNAL)).toBe(EXISTING);
		expect(vi.mocked(writeTextFile)).not.toHaveBeenCalled();
		expect(vi.mocked(toast.info)).toHaveBeenCalledWith(NOT_OVERWRITTEN);
	});

	it('does not replace the existing note with the given content', async () => {
		await run('kokobrain://new?vault=V&name=Journal&silent=true&content=hello');

		expect(disk.get(JOURNAL)).toBe(EXISTING);
		expect(vi.mocked(writeTextFile)).not.toHaveBeenCalled();
		expect(vi.mocked(toast.info)).toHaveBeenCalledWith(NOT_OVERWRITTEN);
	});

	it('creates a note that does not exist with the given content', async () => {
		await run('kokobrain://new?vault=V&name=Fresh&silent=true&content=hello');

		expect(disk.get(`${VAULT}/Fresh.md`)).toBe('hello');
		expect(disk.get(JOURNAL)).toBe(EXISTING);
		expect(vi.mocked(toast.info)).not.toHaveBeenCalled();
	});
});

describe('silent `new` with a mode flag on an existing note', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		disk.clear();
		editorStore.reset();
		vaultStore._reset();
		vaultStore.open(VAULT);
		disk.set(JOURNAL, EXISTING);
	});

	it('overwrite=true replaces the note', async () => {
		await run('kokobrain://new?vault=V&name=Journal&silent=true&overwrite=true&content=hello');

		expect(disk.get(JOURNAL)).toBe('hello');
		expect(vi.mocked(toast.info)).not.toHaveBeenCalled();
	});

	it('append=true adds the content after the note', async () => {
		await run('kokobrain://new?vault=V&name=Journal&silent=true&append=true&content=hello');

		expect(disk.get(JOURNAL)).toBe(`${EXISTING}\nhello`);
	});

	it('prepend=true adds the content before the note', async () => {
		await run('kokobrain://new?vault=V&name=Journal&silent=true&prepend=true&content=hello');

		expect(disk.get(JOURNAL)).toBe(`hello\n${EXISTING}`);
	});
});
