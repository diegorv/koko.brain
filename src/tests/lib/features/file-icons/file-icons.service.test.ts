import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	mkdir: vi.fn(),
	exists: vi.fn(),
}));

vi.mock('$lib/api', () => ({
	invoke: vi.fn(),
}));

vi.mock('$lib/features/file-icons/file-icons.icon-data', () => ({
	preloadPacks: vi.fn(),
}));

import { readTextFile, writeTextFile, mkdir, exists } from '@tauri-apps/plugin-fs';
import { invoke } from '$lib/api';
import { preloadPacks } from '$lib/features/file-icons/file-icons.icon-data';
import { fileIconsStore } from '$lib/features/file-icons/file-icons.store.svelte';
import {
	loadFileIcons,
	loadRecentIcons,
	trackRecentIcon,
	saveFileIcons,
	setIconForPath,
	removeIconForPath,
	updateFileIconPathsAfterMove,
	buildFrontmatterIconIndex,
	updateFrontmatterIconForFile,
	resetFileIcons,
} from '$lib/features/file-icons/file-icons.service';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';
import type { NoteEntryV2 } from '$lib/types/vault-v2.types';

/** Configures `invoke('get_all_vault_entries_v2')` to return `entries`. */
function mockEntriesV2(entries: NoteEntryV2[]): void {
	vi.mocked(invoke).mockImplementation(async (cmd: string) => {
		if (cmd === 'get_all_vault_entries_v2') return entries as unknown;
		return undefined;
	});
}

describe('loadFileIcons', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fileIconsStore.reset();
	});

	it('sets empty entries if file does not exist', async () => {
		vi.mocked(exists).mockResolvedValue(false);

		await loadFileIcons('/vault');

		expect(fileIconsStore.entries).toEqual([]);
		expect(readTextFile).not.toHaveBeenCalled();
	});

	it('loads icons from disk into store', async () => {
		const data = [{ path: '/vault/a.md', iconPack: 'lucide', iconName: 'star' }];
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(JSON.stringify(data));

		await loadFileIcons('/vault');

		expect(readTextFile).toHaveBeenCalledWith('/vault/.kokobrain/file-icons.json');
		expect(fileIconsStore.entries).toEqual(data);
	});

	it('preloads referenced packs after loading', async () => {
		const data = [
			{ path: '/vault/a.md', iconPack: 'lucide', iconName: 'star' },
			{ path: '/vault/b.md', iconPack: 'feather', iconName: 'heart' },
		];
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(JSON.stringify(data));

		await loadFileIcons('/vault');

		expect(preloadPacks).toHaveBeenCalledWith(['lucide', 'feather']);
	});

	it('sets empty entries on parse error', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue('invalid json');
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await loadFileIcons('/vault');

		expect(fileIconsStore.entries).toEqual([]);
		consoleSpy.mockRestore();
	});
});

describe('loadRecentIcons', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fileIconsStore.reset();
	});

	it('sets empty array if file does not exist', async () => {
		vi.mocked(exists).mockResolvedValue(false);

		await loadRecentIcons('/vault');

		expect(fileIconsStore.recentIcons).toEqual([]);
	});

	it('loads recent icons from disk into store', async () => {
		const data = [{ iconPack: 'lucide', iconName: 'star' }];
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(JSON.stringify(data));

		await loadRecentIcons('/vault');

		expect(readTextFile).toHaveBeenCalledWith('/vault/.kokobrain/recent-icons.json');
		expect(fileIconsStore.recentIcons).toEqual(data);
	});

	it('sets empty array on parse error', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue('not json');
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await loadRecentIcons('/vault');

		expect(fileIconsStore.recentIcons).toEqual([]);
		consoleSpy.mockRestore();
	});
});

describe('trackRecentIcon', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fileIconsStore.reset();
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
	});

	it('adds icon to recent icons and saves', async () => {
		await trackRecentIcon('/vault', 'lucide', 'star');

		expect(fileIconsStore.recentIcons).toEqual([{ iconPack: 'lucide', iconName: 'star' }]);
		expect(writeTextFile).toHaveBeenCalledWith(
			'/vault/.kokobrain/recent-icons.json',
			expect.any(String),
		);
	});

	it('moves existing icon to top of recent list', async () => {
		await trackRecentIcon('/vault', 'lucide', 'star');
		await trackRecentIcon('/vault', 'feather', 'heart');
		await trackRecentIcon('/vault', 'lucide', 'star');

		expect(fileIconsStore.recentIcons[0]).toEqual({ iconPack: 'lucide', iconName: 'star' });
		expect(fileIconsStore.recentIcons[1]).toEqual({ iconPack: 'feather', iconName: 'heart' });
	});
});

describe('saveFileIcons', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fileIconsStore.reset();
	});

	it('creates .kokobrain dir if it does not exist', async () => {
		vi.mocked(exists).mockResolvedValue(false);
		vi.mocked(mkdir).mockResolvedValue(undefined);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await saveFileIcons('/vault');

		expect(mkdir).toHaveBeenCalledWith('/vault/.kokobrain');
		expect(writeTextFile).toHaveBeenCalledWith(
			'/vault/.kokobrain/file-icons.json',
			JSON.stringify([], null, 2),
		);
	});

	it('skips mkdir if dir already exists', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await saveFileIcons('/vault');

		expect(mkdir).not.toHaveBeenCalled();
		expect(writeTextFile).toHaveBeenCalled();
	});
});

describe('setIconForPath', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fileIconsStore.reset();
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
	});

	it('adds icon entry to store and saves', async () => {
		await setIconForPath('/vault', '/vault/a.md', 'lucide', 'star', '#ff0000');

		expect(fileIconsStore.entries).toHaveLength(1);
		expect(fileIconsStore.entries[0]).toEqual({
			path: '/vault/a.md',
			iconPack: 'lucide',
			iconName: 'star',
			color: '#ff0000',
			textColor: undefined,
		});
		expect(writeTextFile).toHaveBeenCalled();
	});

	it('replaces existing icon for same path', async () => {
		await setIconForPath('/vault', '/vault/a.md', 'lucide', 'star');
		await setIconForPath('/vault', '/vault/a.md', 'feather', 'heart');

		expect(fileIconsStore.entries).toHaveLength(1);
		expect(fileIconsStore.entries[0].iconName).toBe('heart');
	});

	it('stores textColor when provided', async () => {
		await setIconForPath('/vault', '/vault/a.md', 'lucide', 'star', '#ff0000', '#00ff00');

		expect(fileIconsStore.entries).toHaveLength(1);
		expect(fileIconsStore.entries[0].color).toBe('#ff0000');
		expect(fileIconsStore.entries[0].textColor).toBe('#00ff00');
	});
});

describe('removeIconForPath', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fileIconsStore.reset();
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
	});

	it('removes icon entry from store and saves', async () => {
		await setIconForPath('/vault', '/vault/a.md', 'lucide', 'star');
		expect(fileIconsStore.entries).toHaveLength(1);

		await removeIconForPath('/vault', '/vault/a.md');

		expect(fileIconsStore.entries).toHaveLength(0);
		expect(writeTextFile).toHaveBeenCalled();
	});
});

describe('updateFileIconPathsAfterMove', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fileIconsStore.reset();
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
	});

	it('updates path in entries and saves', async () => {
		await setIconForPath('/vault', '/vault/old.md', 'lucide', 'star');

		await updateFileIconPathsAfterMove('/vault', '/vault/old.md', '/vault/new.md');

		expect(fileIconsStore.entries[0].path).toBe('/vault/new.md');
		expect(fileIconsStore.entries[0].iconName).toBe('star');
	});
});

describe('buildFrontmatterIconIndex', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fileIconsStore.reset();
	});

	it('extracts frontmatter icons from Rust entries into store', async () => {
		mockEntriesV2([
			entryV2('/vault/a.md', { frontmatter: { icon: 'lucide:star' } }),
			entryV2('/vault/b.md', { frontmatter: { title: 'No icon' } }),
			entryV2('/vault/c.md', { frontmatter: { icon: 'feather:heart' } }),
		]);

		await buildFrontmatterIconIndex();

		expect(invoke).toHaveBeenCalledWith('get_all_vault_entries_v2');
		expect(fileIconsStore.frontmatterIcons.size).toBe(2);
		expect(fileIconsStore.getFrontmatterIcon('/vault/a.md')).toEqual({ iconPack: 'lucide', iconName: 'star' });
		expect(fileIconsStore.getFrontmatterIcon('/vault/c.md')).toEqual({ iconPack: 'feather', iconName: 'heart' });
		expect(fileIconsStore.getFrontmatterIcon('/vault/b.md')).toBeUndefined();
	});

	it('preloads packs referenced by frontmatter icons', async () => {
		mockEntriesV2([
			entryV2('/vault/a.md', { frontmatter: { icon: 'tabler:rocket' } }),
		]);

		await buildFrontmatterIconIndex();

		expect(preloadPacks).toHaveBeenCalledWith(['tabler']);
		expect(fileIconsStore.frontmatterIcons.size).toBe(1);
		expect(fileIconsStore.getFrontmatterIcon('/vault/a.md')).toEqual({ iconPack: 'tabler', iconName: 'rocket' });
	});

	it('handles empty entries', async () => {
		mockEntriesV2([]);

		await buildFrontmatterIconIndex();

		expect(fileIconsStore.frontmatterIcons.size).toBe(0);
	});
});

describe('updateFrontmatterIconForFile', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fileIconsStore.reset();
	});

	it('skips update when both old and new are null', () => {
		updateFrontmatterIconForFile('/vault/a.md', '---\ntitle: No icon\n---\nBody');

		expect(fileIconsStore.getFrontmatterIcon('/vault/a.md')).toBeUndefined();
	});

	it('skips update when icon is unchanged', async () => {
		// Seed initial state via the migrated builder.
		mockEntriesV2([entryV2('/vault/a.md', { frontmatter: { icon: 'lucide:star' } })]);
		await buildFrontmatterIconIndex();
		vi.clearAllMocks();

		updateFrontmatterIconForFile('/vault/a.md', '---\nicon: lucide:star\n---\nBody');

		// Icon unchanged — store still has the same value
		expect(fileIconsStore.getFrontmatterIcon('/vault/a.md')).toEqual({ iconPack: 'lucide', iconName: 'star' });
		expect(preloadPacks).not.toHaveBeenCalled();
	});

	it('updates store when icon is added', () => {
		updateFrontmatterIconForFile('/vault/a.md', '---\nicon: lucide:star\n---\nBody');

		expect(fileIconsStore.getFrontmatterIcon('/vault/a.md')).toEqual({ iconPack: 'lucide', iconName: 'star' });
	});

	it('updates store when icon is removed', async () => {
		mockEntriesV2([entryV2('/vault/a.md', { frontmatter: { icon: 'lucide:star' } })]);
		await buildFrontmatterIconIndex();
		expect(fileIconsStore.getFrontmatterIcon('/vault/a.md')).toBeDefined();

		updateFrontmatterIconForFile('/vault/a.md', '---\ntitle: No icon\n---\nBody');

		expect(fileIconsStore.getFrontmatterIcon('/vault/a.md')).toBeUndefined();
	});

	it('updates store when icon pack changes', async () => {
		mockEntriesV2([entryV2('/vault/a.md', { frontmatter: { icon: 'lucide:star' } })]);
		await buildFrontmatterIconIndex();

		updateFrontmatterIconForFile('/vault/a.md', '---\nicon: feather:star\n---\nBody');

		expect(fileIconsStore.getFrontmatterIcon('/vault/a.md')).toEqual({ iconPack: 'feather', iconName: 'star' });
	});

	it('preloads pack when new icon is set', () => {
		updateFrontmatterIconForFile('/vault/a.md', '---\nicon: tabler:rocket\n---\nBody');

		expect(preloadPacks).toHaveBeenCalledWith(['tabler']);
		expect(fileIconsStore.getFrontmatterIcon('/vault/a.md')).toEqual({ iconPack: 'tabler', iconName: 'rocket' });
	});

	it('does not preload when icon is removed', async () => {
		mockEntriesV2([entryV2('/vault/a.md', { frontmatter: { icon: 'lucide:star' } })]);
		await buildFrontmatterIconIndex();
		vi.clearAllMocks();

		updateFrontmatterIconForFile('/vault/a.md', '# No frontmatter');

		expect(preloadPacks).not.toHaveBeenCalled();
		expect(fileIconsStore.getFrontmatterIcon('/vault/a.md')).toBeUndefined();
	});
});

describe('resetFileIcons', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fileIconsStore.reset();
	});

	it('clears all icon state', () => {
		fileIconsStore.setEntries([{ path: '/vault/a.md', iconPack: 'lucide', iconName: 'star' }]);
		fileIconsStore.setRecentIcons([{ iconPack: 'lucide', iconName: 'star' }]);

		resetFileIcons();

		expect(fileIconsStore.entries).toEqual([]);
		expect(fileIconsStore.recentIcons).toEqual([]);
		expect(fileIconsStore.frontmatterIcons.size).toBe(0);
	});
});
