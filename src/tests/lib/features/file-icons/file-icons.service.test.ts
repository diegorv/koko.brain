import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	mkdir: vi.fn(),
	exists: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('#lib/features/file-icons/file-icons.icon-data.js', () => ({
	preloadPacks: vi.fn(),
	setOnPacksLoaded: vi.fn(),
}));

import { readTextFile, writeTextFile, mkdir, exists } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'svelte-sonner';
import { preloadPacks } from '#lib/features/file-icons/file-icons.icon-data.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { saveFileByPath } from '#lib/core/editor/editor.service.js';
import { resetHooks } from '#lib/core/editor/editor.hooks.js';
import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
import {
	loadRecentIcons,
	trackRecentIcon,
	setIconForPath,
	setIconColors,
	removeIconForPath,
	buildFrontmatterIconIndex,
	updateFrontmatterIconForFile,
	removeFrontmatterIconForFile,
	resetFileIcons,
} from '#lib/features/file-icons/file-icons.service.js';
import { registerCollectionNoteChangeConsumer } from '#lib/features/collection/collection.service.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { clearAllIndexed } from '#lib/utils/index-dedupe.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';

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
		// The frontmatter write now routes through `applyNoteChange`, which calls `invoke`.
		vi.mocked(invoke).mockResolvedValue(undefined);
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
		// The folder note is missing until the placeholder write creates it.
		vi.mocked(exists).mockResolvedValueOnce(false).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue('---\n---\n');
		await setIconForPath('/vault', '/vault/Projects', 'lucide', 'folder', '#0000ff', undefined, true);

		// Should create folder note and write to it
		expect(writeTextFile).toHaveBeenCalledWith('/vault/Projects/Projects.md', '---\n---\n');
		// Should index under both the note path and directory path
		expect(fileIconsStore.getFrontmatterIcon('/vault/Projects')).toBeDefined();
		expect(fileIconsStore.getFrontmatterIcon('/vault/Projects/Projects.md')).toBeDefined();
		expect(fileIconsStore.getFrontmatterIcon('/vault/Projects')?.iconName).toBe('folder');
	});

	it('leaves the icon store untouched when the frontmatter write is refused', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\n# a comment\ntitle: Test\n---\nBody');

		await setIconForPath('/vault', '/vault/a.md', 'lucide', 'star');

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(toast.error).toHaveBeenCalledOnce();
		expect(fileIconsStore.getFrontmatterIcon('/vault/a.md')).toBeUndefined();
	});

	it('leaves the folder icon in the store when removing it from the folder note is refused', async () => {
		const ref = { iconPack: 'lucide' as const, iconName: 'folder' };
		fileIconsStore.updateFrontmatterIcon('/vault/Projects', ref);
		fileIconsStore.updateFrontmatterIcon('/vault/Projects/Projects.md', ref);
		vi.mocked(readTextFile).mockResolvedValue('---\n_icon: lucide:folder\nmeta:\n  a: 1\n---\n');

		await removeIconForPath('/vault', '/vault/Projects', true);

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(toast.error).toHaveBeenCalledOnce();
		expect(fileIconsStore.getFrontmatterIcon('/vault/Projects')?.iconName).toBe('folder');
		expect(fileIconsStore.getFrontmatterIcon('/vault/Projects/Projects.md')?.iconName).toBe('folder');
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
		// The frontmatter write now routes through `applyNoteChange`, which calls `invoke`.
		vi.mocked(invoke).mockResolvedValue(undefined);
	});

	it('routes .md files to frontmatter remove', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\n_icon: lucide:star\ntitle: Test\n---\nBody');
		fileIconsStore.updateFrontmatterIcon('/vault/a.md', { iconPack: 'lucide', iconName: 'star' });

		await removeIconForPath('/vault', '/vault/a.md');

		expect(fileIconsStore.getFrontmatterIcon('/vault/a.md')).toBeUndefined();
	});

});

describe('setIconColors', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fileIconsStore.reset();
		editorStore.reset();
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		vi.mocked(invoke).mockResolvedValue(undefined);
	});

	it('writes the text color without an icon and indexes it', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\ntitle: Test\n---\nBody');

		await setIconColors('/vault/a.md', undefined, '#00ff00');

		const written = vi.mocked(writeTextFile).mock.calls[0][1] as string;
		expect(written).toContain('_title_color:');
		expect(written).toContain('#00ff00');
		expect(written).not.toContain('_icon');
		expect(fileIconsStore.getFrontmatterIcon('/vault/a.md')).toEqual({ color: undefined, titleColor: '#00ff00' });
	});

	it('drops the index entry when the last color is cleared', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\n_title_color: "#00ff00"\n---\nBody');
		fileIconsStore.updateFrontmatterIcon('/vault/a.md', { titleColor: '#00ff00' });

		await setIconColors('/vault/a.md', undefined, undefined);

		expect(vi.mocked(writeTextFile).mock.calls[0][1]).not.toContain('_title_color');
		expect(fileIconsStore.getFrontmatterIcon('/vault/a.md')).toBeUndefined();
	});

	it('writes a folder\'s colors to its folder note and indexes both paths', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\n---\n');

		await setIconColors('/vault/Work', undefined, '#00ff00', true);

		expect(vi.mocked(writeTextFile).mock.calls[0][0]).toBe('/vault/Work/Work.md');
		expect(fileIconsStore.getFrontmatterIcon('/vault/Work/Work.md')?.titleColor).toBe('#00ff00');
		expect(fileIconsStore.getFrontmatterIcon('/vault/Work')?.titleColor).toBe('#00ff00');
	});

	it('leaves the store untouched when the frontmatter write is refused', async () => {
		const ref = { iconPack: 'lucide' as const, iconName: 'star', titleColor: '#111111' };
		fileIconsStore.updateFrontmatterIcon('/vault/a.md', ref);
		vi.mocked(readTextFile).mockResolvedValue('---\n# a comment\n_icon: lucide:star\n---\nBody');

		await setIconColors('/vault/a.md', undefined, '#00ff00');

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(toast.error).toHaveBeenCalledOnce();
		expect(fileIconsStore.getFrontmatterIcon('/vault/a.md')).toEqual(ref);
	});

	it('leaves both folder entries untouched when the write to the folder note is refused', async () => {
		const ref = { titleColor: '#111111' };
		fileIconsStore.updateFrontmatterIcon('/vault/Work', ref);
		fileIconsStore.updateFrontmatterIcon('/vault/Work/Work.md', ref);
		vi.mocked(readTextFile).mockResolvedValue('---\n# a comment\n_title_color: "#111111"\n---\n');

		await setIconColors('/vault/Work', undefined, undefined, true);

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(fileIconsStore.getFrontmatterIcon('/vault/Work')).toEqual(ref);
		expect(fileIconsStore.getFrontmatterIcon('/vault/Work/Work.md')).toEqual(ref);
	});

	it('keeps an icon already in the store when saving colors', async () => {
		fileIconsStore.updateFrontmatterIcon('/vault/a.md', { iconPack: 'lucide', iconName: 'star' });
		vi.mocked(readTextFile).mockResolvedValue('---\n_icon: lucide:star\n---\nBody');

		await setIconColors('/vault/a.md', '#ff0000', undefined);

		expect(vi.mocked(writeTextFile).mock.calls[0][1]).toContain('_icon: lucide:star');
		expect(fileIconsStore.getFrontmatterIcon('/vault/a.md')).toEqual({
			iconPack: 'lucide', iconName: 'star', color: '#ff0000', titleColor: undefined,
		});
	});

	it('creates the folder note when a color is picked on a folder without one', async () => {
		let note: string | null = null;
		vi.mocked(exists).mockImplementation(async () => note !== null);
		vi.mocked(readTextFile).mockImplementation(async () => note ?? '');
		vi.mocked(writeTextFile).mockImplementation(async (_path, content) => {
			note = content as string;
		});

		await setIconColors('/vault/Work', '#ff0000', undefined, true);

		expect(vi.mocked(writeTextFile).mock.calls[0]).toEqual(['/vault/Work/Work.md', '---\n---\n']);
		expect(note).toContain('_color:');
		expect(note).toContain('#ff0000');
		expect(fileIconsStore.getFrontmatterIcon('/vault/Work')?.color).toBe('#ff0000');
		expect(fileIconsStore.getFrontmatterIcon('/vault/Work/Work.md')?.color).toBe('#ff0000');
	});

	it('does not create a folder note to clear colors on a folder without one', async () => {
		vi.mocked(exists).mockResolvedValue(false);

		await setIconColors('/vault/Work', undefined, undefined, true);

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(readTextFile).not.toHaveBeenCalled();
		expect(fileIconsStore.getFrontmatterIcon('/vault/Work')).toBeUndefined();
		expect(fileIconsStore.getFrontmatterIcon('/vault/Work/Work.md')).toBeUndefined();
	});

	it('clears the colors of a folder whose note exists', async () => {
		fileIconsStore.updateFrontmatterIcon('/vault/Work', { color: '#ff0000' });
		fileIconsStore.updateFrontmatterIcon('/vault/Work/Work.md', { color: '#ff0000' });
		vi.mocked(readTextFile).mockResolvedValue('---\n_color: "#ff0000"\n---\n');

		await setIconColors('/vault/Work', undefined, undefined, true);

		expect(vi.mocked(writeTextFile).mock.calls[0][1]).not.toContain('_color');
		expect(fileIconsStore.getFrontmatterIcon('/vault/Work')).toBeUndefined();
		expect(fileIconsStore.getFrontmatterIcon('/vault/Work/Work.md')).toBeUndefined();
	});

	it('leaves the index untouched when the file is neither Markdown nor a folder', async () => {
		await setIconColors('/vault/board.canvas', undefined, '#00ff00');

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(fileIconsStore.getFrontmatterIcon('/vault/board.canvas')).toBeUndefined();
	});
});

describe('buildFrontmatterIconIndex', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fileIconsStore.reset();
	});

	it('indexes a note that sets colors without an icon', async () => {
		mockEntriesV2([entryV2('/vault/a.md', { frontmatter: { _color: 'red', _title_color: 'blue' } })]);

		await buildFrontmatterIconIndex();

		expect(fileIconsStore.getFrontmatterIcon('/vault/a.md')).toEqual({ color: 'red', titleColor: 'blue' });
		expect(preloadPacks).not.toHaveBeenCalled();
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

	it('indexes a saved note that sets a text color without an icon', () => {
		updateFrontmatterIconForFile('/vault/a.md', '---\n_title_color: "#00ff00"\n---\nBody');

		expect(fileIconsStore.getFrontmatterIcon('/vault/a.md')).toEqual({ titleColor: '#00ff00' });
		expect(preloadPacks).not.toHaveBeenCalled();
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

	it('reads a .view icon and colors from its bare YAML body', () => {
		updateFrontmatterIconForFile('/vault/Projects.view', '_sidebar_label: Projects\n_icon: lucide:rocket\n_color: red\n_title_color: blue\n');

		expect(fileIconsStore.getFrontmatterIcon('/vault/Projects.view')).toEqual({
			iconPack: 'lucide', iconName: 'rocket', color: 'red', titleColor: 'blue',
		});
	});

	it('clears a .view icon when its body no longer has one', () => {
		updateFrontmatterIconForFile('/vault/Projects.view', '_icon: lucide:rocket\n');

		updateFrontmatterIconForFile('/vault/Projects.view', '_sidebar_label: Projects\n');

		expect(fileIconsStore.getFrontmatterIcon('/vault/Projects.view')).toBeUndefined();
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

describe('ensureFolderNote note-change indexing (issue 29)', () => {
	let unregister: (() => void) | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
		clearAllIndexed();
		fileIconsStore.reset();
		collectionStore.reset();
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		vi.mocked(invoke).mockResolvedValue(undefined);
		unregister = registerCollectionNoteChangeConsumer();
	});

	afterEach(() => {
		unregister?.();
		unregister = null;
		collectionStore.reset();
		fileIconsStore.reset();
	});

	it('indexes the auto-created folder note placeholder as well as the icon write', async () => {
		// The folder note is missing until the placeholder write creates it.
		vi.mocked(exists).mockResolvedValueOnce(false).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue('---\n---\n');

		await setIconForPath('/vault', '/vault/Projects', 'lucide', 'folder', undefined, undefined, true);

		// The placeholder write goes through the owner, so the new note is a
		// vault-index member before the icon write rather than 500 ms later.
		expect(invoke).toHaveBeenCalledWith('update_note_in_index', {
			path: '/vault/Projects/Projects.md',
			content: '---\n---\n',
		});
		// ... and the icon write lands in the real collection index.
		expect(collectionStore.propertyIndex.get('/vault/Projects/Projects.md')?.properties.get('_icon'))
			.toBe('lucide:folder');
	});
});
