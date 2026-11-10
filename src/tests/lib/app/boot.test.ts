// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { setupLocalStorage, clearLocalStorage } from '../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn(() => Promise.resolve(vi.fn())),
	emit: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	exists: vi.fn(),
	mkdir: vi.fn(),
	readDir: vi.fn(),
	rename: vi.fn(),
	remove: vi.fn(),
	stat: vi.fn(),
	watch: vi.fn(),
}));

vi.mock('svelte-sonner', () => ({
	toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() }),
}));

// Side-effect service: mocked so a test can hold an in-flight calendar write
// open and see what waits for it (same seam as the issue 34 switch tests).
vi.mock('#lib/features/event-calendar/event-calendar.service.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('#lib/features/event-calendar/event-calendar.service.js')>()),
	drainEventCalendarWrites: vi.fn(() => Promise.resolve()),
}));

import { invoke } from '@tauri-apps/api/core';
import { exists, mkdir, readDir, readTextFile, remove, rename, writeTextFile, watch } from '@tauri-apps/plugin-fs';
import { registerAppPorts, unregisterAppPorts } from '#lib/app/boot.js';
import { initializeVault, teardownVault } from '#lib/app/lifecycle/app-lifecycle.service.js';
import { rebuildAllIndexes } from '#lib/app/lifecycle/watcher-handler.service.js';
import { notifyAfterSave } from '#lib/core/editor/editor.hooks.js';
import { closeTab, closeTabsForDeletedPath } from '#lib/core/editor/editor.service.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { deleteItem, renameItem } from '#lib/core/filesystem/fs.service.js';
import { restoreItem } from '#lib/core/trash/trash.service.js';
import { trashStore } from '#lib/core/trash/trash.store.svelte.js';
import { switchVault } from '#lib/core/vault/vault.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { backlinksStore } from '#lib/features/backlinks/backlinks.store.svelte.js';
import { drainEventCalendarWrites } from '#lib/features/event-calendar/event-calendar.service.js';
import { quickSwitcherStore } from '#lib/features/quick-switcher/quick-switcher.store.svelte.js';
import { getCachedViewDefinition, refreshViewDefinition } from '#lib/features/type-definitions/view-parse-cache.js';
import { queryjsSessionStore } from '#lib/plugins/queryjs/queryjs-session.store.svelte.js';
import { profileStart } from '#lib/core/markdown-editor/extensions/live-preview/core/profiling.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { makeDirNode, makeFileNode } from '../../fixtures/tauri-api.fixture';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { getViewRowSetPort } from '#lib/features/collection/view-row-set.port.js';
import { executeQuery } from '#lib/features/collection/collection.logic.js';
import { parseCollectionYaml } from '#lib/features/collection/yaml-parser.js';
import { RECENT_NEWEST_THREE, RECENT_OTHER_VIEW, RECENT_VIEW, RECENT_VIEW_YAML, recentEntries, recentIndex } from '../../fixtures/recent-view.fixture';

const VAULT = '/vault';
const NOTE_CONTENT = '# Note\n';
const VIEW_YAML = 'source: notes\nviews:\n  - name: all\n';

/** Installs the default mock implementations every case starts from. */
function installMocks(): void {
	vi.mocked(drainEventCalendarWrites).mockResolvedValue(undefined);
	vi.mocked(invoke).mockImplementation(async (cmd, args) => {
		if (cmd === 'scan_vault' || cmd === 'get_backlinks_v2') return [];
		if (cmd === 'read_files_batch') {
			return (args as { paths: string[] }).paths.map((path) => ({ path, content: NOTE_CONTENT }));
		}
		return undefined;
	});
	vi.mocked(readTextFile).mockImplementation(async (p) => {
		const path = String(p);
		if (path.endsWith('.view')) return VIEW_YAML;
		if (path.endsWith('.md')) return NOTE_CONTENT;
		throw new Error(`No such file: ${path}`);
	});
	vi.mocked(writeTextFile).mockResolvedValue(undefined);
	vi.mocked(exists).mockResolvedValue(false);
	vi.mocked(mkdir).mockResolvedValue(undefined);
	vi.mocked(readDir).mockResolvedValue([]);
	vi.mocked(rename).mockResolvedValue(undefined);
	vi.mocked(remove).mockResolvedValue(undefined);
	vi.mocked(watch).mockResolvedValue(() => {});
}

/** Number of `readTextFile` calls for `path`. */
function readsOf(path: string): number {
	return vi.mocked(readTextFile).mock.calls.filter(([p]) => String(p) === path).length;
}

const MODES = ['the first vault', 'teardownVault and a second initializeVault'] as const;

// Once per file, like the app shell: a port must not need re-registering per vault.
beforeAll(() => {
	registerAppPorts();
});

describe('registerAppPorts', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		installMocks();
		vaultStore.open(VAULT);
		backlinksStore.reset();
	});

	it('is called synchronously at the top of the app layout script, outside any $effect', () => {
		const layout = readFileSync(`${process.cwd()}/src/routes/(app)/+layout.svelte`, 'utf8');
		// One tab of indentation: top level of the <script>, not inside an $effect body.
		expect(layout).toMatch(/\n\tregisterAppPorts\(\);\n/);
	});

	it('registers each content-invalidation listener once when called twice', () => {
		registerAppPorts();
		registerAppPorts();
		const markDirty = vi.spyOn(backlinksStore, 'markUnlinkedDirty');

		notifyAfterSave(`${VAULT}/twice.md`, NOTE_CONTENT);

		expect(markDirty).toHaveBeenCalledTimes(1);
		expect(backlinksStore.unlinkedDirty).toBe(true);
		markDirty.mockRestore();
	});

	it('registers the calendar write barrier once when called twice', async () => {
		registerAppPorts();
		registerAppPorts();

		await switchVault('/twice-vault');

		expect(drainEventCalendarWrites).toHaveBeenCalledTimes(1);
		expect(vaultStore.path).toBe('/twice-vault');
	});

	it('registers each path-change consumer once when called twice', async () => {
		registerAppPorts();
		registerAppPorts();
		quickSwitcherStore.reset();
		quickSwitcherStore.addRecentPath(`${VAULT}/old.md`);
		const removeRecent = vi.spyOn(quickSwitcherStore, 'removeRecentPath');

		await renameItem(`${VAULT}/old.md`, 'new.md');

		expect(removeRecent).toHaveBeenCalledTimes(1);
		expect(quickSwitcherStore.recentPaths).toEqual([]);
		removeRecent.mockRestore();
	});

	it('wires the profiling port to the settings toggle, read per call', () => {
		settingsStore.updateLivePreviewProfiling(false);
		expect(profileStart('x')).toBe(0);

		settingsStore.updateLivePreviewProfiling(true);
		expect(profileStart('x')).toBeGreaterThan(0);

		unregisterAppPorts();
		expect(profileStart('x')).toBe(0);
		registerAppPorts();
		expect(profileStart('x')).toBeGreaterThan(0);
		settingsStore.updateLivePreviewProfiling(false);
	});

	it('registers the .view row-set port once, fed from the entries, vault and settings stores', () => {
		registerAppPorts();
		const port = getViewRowSetPort();
		expect(port).not.toBeNull();
		registerAppPorts();
		expect(getViewRowSetPort()).toBe(port);

		typeDefinitionsStore.setEntries(recentEntries());
		try {
			const parsed = parseCollectionYaml(RECENT_VIEW_YAML);
			if (!parsed.success) throw new Error('fixture');
			const view = parsed.definition.views[0];
			const matched = executeQuery(parsed.definition, { ...view, limit: undefined }, recentIndex(), VAULT).records;
			const rows = port!.rows(RECENT_VIEW, matched, view, parsed.definition);
			expect(rows.map((r) => r.path)).toEqual(RECENT_NEWEST_THREE);
			// The definition reaches the row set: a global filter citing archived keeps the archived note.
			const cited = port!.rows(RECENT_VIEW, matched, view, { ...parsed.definition, filters: 'archived || !archived' });
			expect(cited.map((r) => r.path)).toContain('/vault/old.md');
			expect(port!.sortLabel(RECENT_VIEW)).toBe('Sorted by the default: modified, newest first');
			expect(port!.sortLabel(RECENT_OTHER_VIEW)).toBe('Sorted by _sort: title');

			// The inline-block rule, from the records alone: the fixture's excluded files drop out.
			const unlimited = { ...view, limit: undefined };
			const plain = ['n1', 'n2', 'n3', 'n4', 'n5'].map((n) => `/vault/${n}.md`);
			const blockRows = port!.blockRows(matched, unlimited, parsed.definition).map((r) => r.path);
			expect([...blockRows].sort()).toEqual(plain);
			// The system folder is read from the settings per call: a blank folder lists the `_system/` note.
			settingsStore.updateTemplates({ systemFolder: '' });
			const unfiltered = port!.blockRows(matched, unlimited, parsed.definition).map((r) => r.path);
			expect([...unfiltered].sort()).toEqual(['/vault/_system/templates/t.md', ...plain].sort());
		} finally {
			settingsStore.updateTemplates({ systemFolder: '_system' });
			typeDefinitionsStore.reset();
		}

		unregisterAppPorts();
		expect(getViewRowSetPort()).toBeNull();
		registerAppPorts();
		expect(getViewRowSetPort()).not.toBeNull();
	});

	// The HMR dispose path: a re-run module registers again, so the old
	// registrations must be gone first or every port would fire twice.
	it('unregisterAppPorts drops every port, and a later registerAppPorts adds each back once', async () => {
		unregisterAppPorts();
		notifyAfterSave(`${VAULT}/gone.md`, NOTE_CONTENT);
		expect(backlinksStore.unlinkedDirty).toBe(false);
		await switchVault('/gone-vault');
		expect(drainEventCalendarWrites).not.toHaveBeenCalled();

		registerAppPorts();
		vaultStore.open(VAULT);
		const markDirty = vi.spyOn(backlinksStore, 'markUnlinkedDirty');
		notifyAfterSave(`${VAULT}/back.md`, NOTE_CONTENT);
		expect(markDirty).toHaveBeenCalledTimes(1);
		markDirty.mockRestore();
		await switchVault('/back-vault');
		expect(drainEventCalendarWrites).toHaveBeenCalledTimes(1);
		quickSwitcherStore.reset();
		quickSwitcherStore.addRecentPath('/back-vault/old.md');
		const removeRecent = vi.spyOn(quickSwitcherStore, 'removeRecentPath');
		await renameItem('/back-vault/old.md', 'new.md');
		expect(removeRecent).toHaveBeenCalledTimes(1);
		removeRecent.mockRestore();
	});
});

describe.each(MODES)('app-lifetime ports, after %s', (mode) => {
	beforeEach(async () => {
		vi.clearAllMocks();
		clearLocalStorage();
		installMocks();
		vaultStore.open(VAULT);
		if (mode !== MODES[0]) {
			// The lifecycle's own unregister lists and resets run here, so a
			// port that lived in them would be gone for the cases below.
			await initializeVault(VAULT);
			teardownVault();
			await initializeVault(VAULT);
			vi.clearAllMocks();
			installMocks();
		}
		editorStore.reset();
		trashStore.clear();
		fsStore.setFileTree([]);
		backlinksStore.reset();
		quickSwitcherStore.reset();
		queryjsSessionStore.clearResults();
		queryjsSessionStore.setResult(`${VAULT}/cached.md`, 'cached-script', document.createElement('div'));
	});

	afterAll(() => {
		teardownVault();
	});

	describe('content invalidation', () => {
		it('a save marks unlinked mentions dirty and clears the queryjs cache', () => {
			notifyAfterSave(`${VAULT}/saved.md`, NOTE_CONTENT);

			expect(backlinksStore.unlinkedDirty).toBe(true);
			expect(queryjsSessionStore.hasResult(`${VAULT}/cached.md`, 'cached-script')).toBe(false);
		});

		it('a watcher batch marks unlinked mentions dirty and clears the queryjs cache', async () => {
			await rebuildAllIndexes([`${VAULT}/external.md`]);

			expect(backlinksStore.unlinkedDirty).toBe(true);
			expect(queryjsSessionStore.hasResult(`${VAULT}/cached.md`, 'cached-script')).toBe(false);
		});

		it('a trash restore marks unlinked mentions dirty and clears the queryjs cache', async () => {
			const item = { id: '1000', originalPath: 'notes/restored.md', fileName: 'restored.md', isDirectory: false, trashedAt: 1000 };
			trashStore.setItems([item]);

			await restoreItem(VAULT, item);

			expect(backlinksStore.unlinkedDirty).toBe(true);
			expect(queryjsSessionStore.hasResult(`${VAULT}/cached.md`, 'cached-script')).toBe(false);
		});
	});

	describe('tab close', () => {
		it('closing a tab drops its queryjs autoRun marker', async () => {
			queryjsSessionStore.reset();
			editorStore.addTab({ path: `${VAULT}/note.md`, name: 'note.md', content: '', savedContent: '' });
			queryjsSessionStore.markAutoRun(`${VAULT}/note.md`);

			await closeTab(0);

			expect(queryjsSessionStore.hasAutoRun(`${VAULT}/note.md`)).toBe(false);
		});

		it('a deleted file drops the queryjs autoRun marker of its tab', () => {
			queryjsSessionStore.reset();
			editorStore.addTab({ path: `${VAULT}/gone.md`, name: 'gone.md', content: '', savedContent: '' });
			queryjsSessionStore.markAutoRun(`${VAULT}/gone.md`);

			closeTabsForDeletedPath(`${VAULT}/gone.md`);

			expect(queryjsSessionStore.hasAutoRun(`${VAULT}/gone.md`)).toBe(false);
		});
	});

	describe('write barrier', () => {
		it('switchVault saves the dirty tab, then waits for an in-flight calendar write, then opens the next vault', async () => {
			const trace: string[] = [];
			let release!: () => void;
			// Only the note: settings persistence also writes during the switch.
			vi.mocked(writeTextFile).mockImplementation(async (p) => {
				if (String(p) === `${VAULT}/note.md`) trace.push(`write:${vaultStore.path}`);
			});
			vi.mocked(drainEventCalendarWrites).mockImplementation(() => {
				trace.push(`drain:${vaultStore.path}`);
				return new Promise<void>((resolve) => (release = resolve));
			});
			editorStore.addTab({ path: `${VAULT}/note.md`, name: 'note.md', content: 'old', savedContent: 'old' });
			editorStore.updateContent('edited');

			const switching = switchVault('/other-vault');
			await vi.waitFor(() => expect(drainEventCalendarWrites).toHaveBeenCalledTimes(1));
			expect(vaultStore.path).toBe(VAULT);

			release();
			await switching;

			expect(trace).toEqual([`write:${VAULT}`, `drain:${VAULT}`]);
			expect(vaultStore.path).toBe('/other-vault');
		});
	});

	describe('path-change consumers', () => {
		it('renaming a folder that holds two .view files evicts both cached definitions', async () => {
			const a = `${VAULT}/types/A.view`;
			const b = `${VAULT}/types/nested/B.view`;
			fsStore.setFileTree([
				makeDirNode('types', [
					makeFileNode({ name: 'A.view', path: a }),
					makeDirNode('nested', [makeFileNode({ name: 'B.view', path: b })], { path: `${VAULT}/types/nested` }),
				], { path: `${VAULT}/types` }),
			]);
			await refreshViewDefinition(a);
			await refreshViewDefinition(b);

			await renameItem(`${VAULT}/types`, 'types2');
			await getCachedViewDefinition(a);
			await getCachedViewDefinition(b);

			expect(readsOf(a)).toBe(2);
			expect(readsOf(b)).toBe(2);
		});

		it('a rename drops the old path and its children from the quick-switcher recents', async () => {
			quickSwitcherStore.addRecentPath(`${VAULT}/other.md`);
			quickSwitcherStore.addRecentPath(`${VAULT}/dir/a.md`);
			quickSwitcherStore.addRecentPath(`${VAULT}/dir/sub/b.md`);

			await renameItem(`${VAULT}/dir`, 'dir2');

			expect(quickSwitcherStore.recentPaths).toEqual([`${VAULT}/other.md`]);
		});

		it('a delete drops the old path and its children from the quick-switcher recents', async () => {
			quickSwitcherStore.addRecentPath(`${VAULT}/other.md`);
			quickSwitcherStore.addRecentPath(`${VAULT}/dir/a.md`);
			quickSwitcherStore.addRecentPath(`${VAULT}/dir`);

			await deleteItem(`${VAULT}/dir`, true);

			expect(quickSwitcherStore.recentPaths).toEqual([`${VAULT}/other.md`]);
		});
	});
});
