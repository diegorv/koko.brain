// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

let emitIndexUpdated: ((event: { payload: unknown }) => void) | undefined;
vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn((_name: string, handler: (event: { payload: unknown }) => void) => {
		emitIndexUpdated = handler;
		return Promise.resolve(vi.fn());
	}),
	emit: vi.fn(),
}));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/window', () => ({
	getCurrentWindow: () => ({ onCloseRequested: vi.fn(), destroy: vi.fn(), onFocusChanged: vi.fn() }),
}));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn() }));
// A publish of the content order reloads the file tree, which no case here reads.
vi.mock('#lib/core/filesystem/fs.service.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('#lib/core/filesystem/fs.service.js')>()),
	loadDirectoryTree: vi.fn().mockResolvedValue(undefined),
}));

import { invoke } from '@tauri-apps/api/core';
import { mount, unmount, flushSync } from 'svelte';
import CollectionViewHarness from '../../../fixtures/CollectionViewHarness.svelte';
import { registerAppPorts, unregisterAppPorts } from '#lib/app/boot.js';
import { registerVaultIndexUpdatedListener } from '#lib/app/tauri-listeners.service.js';
import { invalidateVaultEntries } from '#lib/core/vault/vault-entries.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { buildPropertyIndex } from '#lib/features/collection/collection.service.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import {
	RECENT_VAULT,
	RECENT_VIEW,
	RECENT_VIEW_YAML,
	recentEntries,
	recentIndex,
} from '../../../fixtures/recent-view.fixture';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

const NO_MATCH_YAML = `filters: 'status == "nope"'\nviews:\n  - type: table\n    name: None\n`;
/** The payload `scan_vault_v2_cached` emits when the scan finishes. */
const SCAN_FINISHED = { changed: true, version: 1, fullRescan: true, upserted: [], removed: [] };
/** The listener's delay before the refresh after an isolated event (`REFRESH_DELAY_MS`). */
const REFRESH_DELAY_MS = 2000;
/** The listener's minimum gap between two refreshes (`REFRESH_MIN_INTERVAL_MS`). */
const REFRESH_MIN_INTERVAL_MS = 10_000;

/** The fixture's index as `get_all_property_records` returns it. */
function wireRecords() {
	return [...recentIndex().values()].map((r) => ({ ...r, properties: Object.fromEntries(r.properties) }));
}

describe('CollectionView: a .view tab restored at vault open', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;
	let unlisten: () => void = () => {};
	let records: unknown[] = [];
	let entries: unknown[] = [];

	beforeEach(async () => {
		vi.useFakeTimers();
		clearLocalStorage();
		collectionStore.reset();
		typeDefinitionsStore.reset();
		invalidateVaultEntries();
		vaultStore.open(RECENT_VAULT);
		records = wireRecords();
		entries = recentEntries();
		vi.mocked(invoke).mockReset();
		vi.mocked(invoke).mockImplementation(async (command: string) => {
			if (command === 'get_all_property_records') return records;
			if (command === 'get_all_vault_entries_v2') return entries;
			return undefined;
		});
		registerAppPorts();
		unlisten = registerVaultIndexUpdatedListener();
		await vi.advanceTimersByTimeAsync(0);
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		unlisten();
		unregisterAppPorts();
		typeDefinitionsStore.reset();
		collectionStore.reset();
		invalidateVaultEntries();
		vaultStore.close();
		document.body.innerHTML = '';
		vi.useRealTimers();
	});

	/** `initializeVault`'s order: the scan's event starts the listener's delay, then step 5b reads the records. */
	async function openVaultUpToIndexReady(): Promise<void> {
		emitIndexUpdated!({ payload: SCAN_FINISHED });
		await buildPropertyIndex();
	}

	function mountAt(path: string, yaml: string): void {
		component = mount(CollectionViewHarness, { target, props: { initialYaml: yaml, path } });
		flushSync();
	}

	async function entriesLand(): Promise<void> {
		await vi.advanceTimersByTimeAsync(REFRESH_DELAY_MS);
		flushSync();
	}

	it('shows the loading state, not "0 results", until the entries land', async () => {
		await openVaultUpToIndexReady();
		mountAt(RECENT_VIEW, RECENT_VIEW_YAML);

		expect(collectionStore.isIndexReady).toBe(true);
		expect(typeDefinitionsStore.entries).toEqual([]);
		expect(target.textContent).not.toContain('0 results');
		expect(target.textContent).toContain('Building index...');
		expect(target.querySelectorAll('tbody tr')).toHaveLength(0);

		await entriesLand();

		expect(target.textContent).not.toContain('Building index...');
		expect(target.textContent).toContain('3 results');
		expect(target.querySelectorAll('tbody tr')).toHaveLength(3);
	});

	it('still says "0 results" for a view that matches nothing once the entries landed', async () => {
		await openVaultUpToIndexReady();
		mountAt(RECENT_VIEW, NO_MATCH_YAML);

		expect(target.textContent).not.toContain('0 results');

		await entriesLand();

		expect(target.textContent).toContain('0 results');
		expect(target.textContent).not.toContain('Building index...');
	});

	it('leaves the loading state in a vault with no notes', async () => {
		records = [];
		entries = [];
		await openVaultUpToIndexReady();
		mountAt(RECENT_VIEW, RECENT_VIEW_YAML);

		await entriesLand();

		expect(typeDefinitionsStore.entries).toEqual([]);
		expect(target.textContent).toContain('0 results');
		expect(target.textContent).not.toContain('Building index...');
	});

	it('returns to the loading state when a teardown drops the entries', async () => {
		await openVaultUpToIndexReady();
		mountAt(RECENT_VIEW, RECENT_VIEW_YAML);
		await entriesLand();
		expect(target.textContent).toContain('3 results');

		typeDefinitionsStore.reset();
		flushSync();

		expect(target.textContent).toContain('Building index...');
	});

	it('does not count the previous vault\'s tail refresh as the entries landing', async () => {
		// Rust still holds vault A: a pending refresh from A fires during B's scan.
		records = [];
		entries = [entryV2('/old/a.md')];
		emitIndexUpdated!({ payload: { ...SCAN_FINISHED, fullRescan: false, upserted: ['/old/a.md'] } });
		await vi.advanceTimersByTimeAsync(REFRESH_DELAY_MS);
		expect(typeDefinitionsStore.entriesVersion).toBeGreaterThan(0);

		// B's scan is done: its event waits out the listener's throttle, step 5b does not.
		records = wireRecords();
		entries = recentEntries();
		invalidateVaultEntries();
		await openVaultUpToIndexReady();
		mountAt(RECENT_VIEW, RECENT_VIEW_YAML);

		expect(typeDefinitionsStore.getEntryByPath('/old/a.md')).toBeDefined();
		expect(target.textContent).not.toContain('0 results');
		expect(target.textContent).toContain('Building index...');

		await vi.advanceTimersByTimeAsync(REFRESH_MIN_INTERVAL_MS);
		flushSync();

		expect(target.textContent).toContain('3 results');
	});

	it('does not wait for the entries in a .collection tab, whose rows do not use them', async () => {
		await openVaultUpToIndexReady();
		mountAt(`${RECENT_VAULT}/plain.collection`, RECENT_VIEW_YAML);

		expect(target.textContent).not.toContain('Building index...');
		expect(target.textContent).toContain('3 results');
	});
});
