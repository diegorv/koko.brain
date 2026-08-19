import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	mkdir: vi.fn(),
	exists: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('$lib/features/file-icons/file-icons.icon-data', () => ({
	preloadPacks: vi.fn(),
	setOnPacksLoaded: vi.fn(),
}));

import { readTextFile, writeTextFile, mkdir, exists } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { preloadPacks } from '$lib/features/file-icons/file-icons.icon-data';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { saveFileByPath } from '$lib/core/editor/editor.service';
import { resetHooks } from '$lib/core/editor/editor.hooks';
import { fileIconsStore } from '$lib/features/file-icons/file-icons.store.svelte';
import {
	loadRecentIcons,
	trackRecentIcon,
	setIconForPath,
	removeIconForPath,
	buildFrontmatterIconIndex,
	updateFrontmatterIconForFile,
	removeFrontmatterIconForFile,
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

describe('setIconForPath', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fileIconsStore.reset();
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
	});

	it('routes .md files to frontmatter write', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\ntitle: Test\n---\nBody');
		await setIconForPath('/vault', '/vault/a.md', 'lucide', 'star', '#ff0000');

		const written = vi.mocked(writeTextFile).mock.calls[0][1] as string;
		expect(written).toContain('_icon: lucide:star');
		// Should update frontmatter store
		expect(fileIconsStore.getFrontmatterIcon('/vault/a.md')).toBeDefined();
		expect(fileIconsStore.getFrontmatterIcon('/vault/a.md')?.iconName).toBe('star');
	});

	it('stores color and titleColor in frontmatter store for .md', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\ntitle: Test\n---\nBody');
		await setIconForPath('/vault', '/vault/a.md', 'lucide', 'star', '#ff0000', '#00ff00');

		const ref = fileIconsStore.getFrontmatterIcon('/vault/a.md');
		expect(ref?.color).toBe('#ff0000');
		expect(ref?.titleColor).toBe('#00ff00');
	});

	it('routes directories to folder note frontmatter', async () => {
		vi.mocked(exists).mockResolvedValue(false);
		vi.mocked(readTextFile).mockResolvedValue('---\n---\n');
		await setIconForPath('/vault', '/vault/Projects', 'lucide', 'folder', '#0000ff', undefined, true);

		// Should create folder note and write to it
		expect(writeTextFile).toHaveBeenCalledWith('/vault/Projects/Projects.md', '---\n---\n');
		// Should index under both the note path and directory path
		expect(fileIconsStore.getFrontmatterIcon('/vault/Projects')).toBeDefined();
		expect(fileIconsStore.getFrontmatterIcon('/vault/Projects/Projects.md')).toBeDefined();
		expect(fileIconsStore.getFrontmatterIcon('/vault/Projects')?.iconName).toBe('folder');
	});
});

describe('regression: icon survives the next save of an open tab (issue 03)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fileIconsStore.reset();
		editorStore.reset();
		resetHooks();
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		vi.mocked(invoke).mockResolvedValue(undefined);
	});

	it('keeps _icon on disk when a dirty open tab saves after setIconForPath', async () => {
		const diskContent = '---\ntitle: Test\n---\nBody';
		editorStore.addTab({
			path: '/vault/a.md',
			name: 'a.md',
			content: `${diskContent} edited`,
			savedContent: diskContent,
		});
		vi.mocked(readTextFile).mockResolvedValue(diskContent);

		await setIconForPath('/vault', '/vault/a.md', 'lucide', 'star');
		await saveFileByPath('/vault/a.md');

		const writes = vi.mocked(writeTextFile).mock.calls.filter(([path]) => path === '/vault/a.md');
		expect(writes.length).toBeGreaterThan(0);
		const finalDisk = writes[writes.length - 1][1] as string;
		expect(finalDisk).toContain('_icon: lucide:star');
	});
});

describe('removeIconForPath', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fileIconsStore.reset();
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
	});

	it('routes .md files to frontmatter remove', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\n_icon: lucide:star\ntitle: Test\n---\nBody');
		fileIconsStore.updateFrontmatterIcon('/vault/a.md', { iconPack: 'lucide', iconName: 'star' });

		await removeIconForPath('/vault', '/vault/a.md');

		expect(fileIconsStore.getFrontmatterIcon('/vault/a.md')).toBeUndefined();
	});

});

describe('buildFrontmatterIconIndex', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fileIconsStore.reset();
	});

	it('extracts frontmatter icons from Rust entries into store', async () => {
		mockEntriesV2([
			entryV2('/vault/a.md', { frontmatter: { _icon: 'lucide:star' } }),
			entryV2('/vault/b.md', { frontmatter: { title: 'No icon' } }),
			entryV2('/vault/c.md', { frontmatter: { _icon: 'feather:heart' } }),
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
			entryV2('/vault/a.md', { frontmatter: { _icon: 'tabler:rocket' } }),
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
		mockEntriesV2([entryV2('/vault/a.md', { frontmatter: { _icon: 'lucide:star' } })]);
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
		mockEntriesV2([entryV2('/vault/a.md', { frontmatter: { _icon: 'lucide:star' } })]);
		await buildFrontmatterIconIndex();
		expect(fileIconsStore.getFrontmatterIcon('/vault/a.md')).toBeDefined();

		updateFrontmatterIconForFile('/vault/a.md', '---\ntitle: No icon\n---\nBody');

		expect(fileIconsStore.getFrontmatterIcon('/vault/a.md')).toBeUndefined();
	});

	it('updates store when icon pack changes', async () => {
		mockEntriesV2([entryV2('/vault/a.md', { frontmatter: { _icon: 'lucide:star' } })]);
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
		mockEntriesV2([entryV2('/vault/a.md', { frontmatter: { _icon: 'lucide:star' } })]);
		await buildFrontmatterIconIndex();
		vi.clearAllMocks();

		updateFrontmatterIconForFile('/vault/a.md', '# No frontmatter');

		expect(preloadPacks).not.toHaveBeenCalled();
		expect(fileIconsStore.getFrontmatterIcon('/vault/a.md')).toBeUndefined();
	});
});

describe('removeFrontmatterIconForFile', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fileIconsStore.reset();
	});

	it('drops the icon entry for a plain note', () => {
		updateFrontmatterIconForFile('/vault/a.md', '---\n_icon: lucide:star\n---\n');
		expect(fileIconsStore.getFrontmatterIcon('/vault/a.md')).toBeDefined();

		removeFrontmatterIconForFile('/vault/a.md');

		expect(fileIconsStore.getFrontmatterIcon('/vault/a.md')).toBeUndefined();
		expect(fileIconsStore.frontmatterIcons.size).toBe(0);
	});

	it('drops the folder-note parent directory key too', () => {
		updateFrontmatterIconForFile('/vault/Proj/Proj.md', '---\n_icon: lucide:star\n---\n');
		expect(fileIconsStore.getFrontmatterIcon('/vault/Proj/Proj.md')).toBeDefined();
		expect(fileIconsStore.getFrontmatterIcon('/vault/Proj')).toBeDefined();

		removeFrontmatterIconForFile('/vault/Proj/Proj.md');

		expect(fileIconsStore.getFrontmatterIcon('/vault/Proj/Proj.md')).toBeUndefined();
		expect(fileIconsStore.getFrontmatterIcon('/vault/Proj')).toBeUndefined();
		expect(fileIconsStore.frontmatterIcons.size).toBe(0);
	});

	it('leaves sibling entries untouched', () => {
		updateFrontmatterIconForFile('/vault/Proj/Proj.md', '---\n_icon: lucide:star\n---\n');
		updateFrontmatterIconForFile('/vault/Proj/other.md', '---\n_icon: feather:heart\n---\n');

		removeFrontmatterIconForFile('/vault/Proj/other.md');

		expect(fileIconsStore.getFrontmatterIcon('/vault/Proj/other.md')).toBeUndefined();
		expect(fileIconsStore.getFrontmatterIcon('/vault/Proj/Proj.md')).toEqual({ iconPack: 'lucide', iconName: 'star' });
		expect(fileIconsStore.getFrontmatterIcon('/vault/Proj')).toEqual({ iconPack: 'lucide', iconName: 'star' });
	});

	it('is a no-op for a path that was never indexed', () => {
		updateFrontmatterIconForFile('/vault/a.md', '---\n_icon: lucide:star\n---\n');

		removeFrontmatterIconForFile('/vault/missing.md');

		expect(fileIconsStore.frontmatterIcons.size).toBe(1);
		expect(fileIconsStore.getFrontmatterIcon('/vault/a.md')).toEqual({ iconPack: 'lucide', iconName: 'star' });
	});
});

describe('resetFileIcons', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fileIconsStore.reset();
	});

	it('clears all icon state', () => {
		fileIconsStore.setRecentIcons([{ iconPack: 'lucide', iconName: 'star' }]);
		fileIconsStore.updateFrontmatterIcon('/vault/a.md', { iconPack: 'lucide' as any, iconName: 'star' });

		resetFileIcons();

		expect(fileIconsStore.recentIcons).toEqual([]);
		expect(fileIconsStore.frontmatterIcons.size).toBe(0);
	});
});
