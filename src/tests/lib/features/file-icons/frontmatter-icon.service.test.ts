import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	exists: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

import { readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'svelte-sonner';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { addAfterSaveObserver } from '$lib/core/editor/editor.hooks';
import { setFrontmatterIcon, removeFrontmatterIcon } from '$lib/features/file-icons/frontmatter-icon.service';
import { registerCollectionNoteChangeConsumer } from '$lib/features/collection/collection.service';
import { collectionStore } from '$lib/features/collection/collection.store.svelte';
import { registerFileIconsNoteChangeConsumer } from '$lib/features/file-icons/file-icons.service';
import { fileIconsStore } from '$lib/features/file-icons/file-icons.store.svelte';
import { clearAllIndexed } from '$lib/utils/index-dedupe';

beforeEach(() => {
	vi.clearAllMocks();
	editorStore.reset();
	vi.mocked(writeTextFile).mockResolvedValue(undefined);
	vi.mocked(exists).mockResolvedValue(true);
	// The write routes through `notifyAfterSave` -> `applyNoteChange`, which calls `invoke`.
	vi.mocked(invoke).mockResolvedValue(undefined);
});

describe('setFrontmatterIcon', () => {
	it('writes _icon to frontmatter of a note with existing frontmatter', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\ntitle: Test\n---\n# Body');

		await setFrontmatterIcon('/vault/a.md', 'lucide', 'star');

		expect(writeTextFile).toHaveBeenCalledOnce();
		const written = vi.mocked(writeTextFile).mock.calls[0][1];
		expect(written).toContain('_icon: lucide:star');
		expect(written).toContain('title: Test');
		expect(written).toContain('# Body');
	});

	it('writes _icon to a note without existing frontmatter', async () => {
		vi.mocked(readTextFile).mockResolvedValue('# Body only');

		await setFrontmatterIcon('/vault/a.md', 'feather', 'heart');

		expect(writeTextFile).toHaveBeenCalledOnce();
		const written = vi.mocked(writeTextFile).mock.calls[0][1];
		expect(written).toContain('_icon: feather:heart');
		expect(written).toContain('# Body only');
	});

	it('writes _color alongside _icon', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\ntitle: Test\n---\nBody');

		await setFrontmatterIcon('/vault/a.md', 'lucide', 'star', '#ff0000');

		const written = vi.mocked(writeTextFile).mock.calls[0][1];
		expect(written).toContain('_icon: lucide:star');
		expect(written).toContain('_color: "#ff0000"');
	});

	it('writes _title_color alongside _icon', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\ntitle: Test\n---\nBody');

		await setFrontmatterIcon('/vault/a.md', 'lucide', 'star', undefined, '#00ff00');

		const written = vi.mocked(writeTextFile).mock.calls[0][1];
		expect(written).toContain('_icon: lucide:star');
		expect(written).toContain('_title_color: "#00ff00"');
		expect(written).not.toMatch(/\n_color:/);
	});

	it('removes _color when not provided', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\ntitle: Test\n_color: red\n---\nBody');

		await setFrontmatterIcon('/vault/a.md', 'lucide', 'star');

		const written = vi.mocked(writeTextFile).mock.calls[0][1];
		expect(written).toContain('_icon: lucide:star');
		expect(written).not.toContain('_color');
	});

	it('replaces existing _icon value', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\n_icon: lucide:star\ntitle: Test\n---\nBody');

		await setFrontmatterIcon('/vault/a.md', 'feather', 'heart');

		const written = vi.mocked(writeTextFile).mock.calls[0][1];
		expect(written).toContain('_icon: feather:heart');
		expect(written).not.toContain('lucide:star');
	});

	it('writes all three fields together', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\ntitle: Test\n---\nBody');

		await setFrontmatterIcon('/vault/a.md', 'tabler', 'rocket', '#ff0000', '#00ff00');

		const written = vi.mocked(writeTextFile).mock.calls[0][1];
		expect(written).toContain('_icon: tabler:rocket');
		expect(written).toContain('_color: "#ff0000"');
		expect(written).toContain('_title_color: "#00ff00"');
	});
});

describe('editor tab sync (issue 55)', () => {
	it('setFrontmatterIcon patches a dirty open tab, keeps its body edit and saves it clean', async () => {
		const saved = '---\ntitle: Test\n---\nOld body';
		const edited = '---\ntitle: Test\n---\nUnsaved body edit';
		editorStore.addTab({ path: '/vault/a.md', name: 'a.md', content: edited, savedContent: saved });

		expect(await setFrontmatterIcon('/vault/a.md', 'lucide', 'star')).toBe(true);

		expect(readTextFile).not.toHaveBeenCalled();
		const written = vi.mocked(writeTextFile).mock.calls[0][1] as string;
		expect(written).toContain('_icon: lucide:star');
		expect(written).toContain('Unsaved body edit');
		const tab = editorStore.tabs[0];
		expect(tab.content).toBe(written);
		expect(tab.savedContent).toBe(written);
	});

	it('removeFrontmatterIcon patches a dirty open tab, keeps its body edit and saves it clean', async () => {
		const saved = '---\n_icon: lucide:star\ntitle: Test\n---\nOld body';
		const edited = '---\n_icon: lucide:star\ntitle: Test\n---\nUnsaved body edit';
		editorStore.addTab({ path: '/vault/a.md', name: 'a.md', content: edited, savedContent: saved });

		expect(await removeFrontmatterIcon('/vault/a.md')).toBe(true);

		expect(readTextFile).not.toHaveBeenCalled();
		const written = vi.mocked(writeTextFile).mock.calls[0][1] as string;
		expect(written).not.toContain('_icon');
		expect(written).toContain('title: Test');
		expect(written).toContain('Unsaved body edit');
		expect(editorStore.tabs[0].content).toBe(written);
		expect(editorStore.tabs[0].savedContent).toBe(written);
	});

	it('removeFrontmatterIcon reads the open tab, not the disk, to decide there is nothing to strip', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\n_icon: lucide:star\n---\nBody');
		const content = '---\ntitle: Test\n---\nBody';
		editorStore.addTab({ path: '/vault/a.md', name: 'a.md', content, savedContent: content });

		expect(await removeFrontmatterIcon('/vault/a.md')).toBe(true);

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(editorStore.tabs[0].content).toBe(content);
	});

	it('does nothing to the editor when the note is not open in any tab', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\ntitle: Test\n---\nBody');

		await setFrontmatterIcon('/vault/a.md', 'lucide', 'star');

		expect(editorStore.tabs).toHaveLength(0);
		expect(editorStore.externalContentSignal).toBe(0);
	});

	it('restores the tab and reports false when saving the tab fails', async () => {
		vi.mocked(writeTextFile).mockRejectedValue(new Error('disk full'));
		const content = '---\ntitle: Test\n---\nBody';
		editorStore.addTab({ path: '/vault/a.md', name: 'a.md', content, savedContent: content });

		expect(await setFrontmatterIcon('/vault/a.md', 'lucide', 'star')).toBe(false);

		expect(editorStore.tabs[0].content).toBe(content);
		expect(editorStore.tabs[0].savedContent).toBe(content);
	});

	it('propagates a disk write failure for a closed note', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\ntitle: Test\n---\nBody');
		vi.mocked(writeTextFile).mockRejectedValue(new Error('disk full'));

		await expect(setFrontmatterIcon('/vault/a.md', 'lucide', 'star')).rejects.toThrow('disk full');
	});
});

describe('after-save observers', () => {
	it('run once for a closed-note icon write and not for an identical repeat', async () => {
		let disk = '---\ntitle: Test\n---\nBody';
		vi.mocked(readTextFile).mockImplementation(async () => disk);
		vi.mocked(writeTextFile).mockImplementation(async (_path, data) => {
			disk = data as string;
		});
		const observer = vi.fn();
		const unsubscribe = addAfterSaveObserver(observer);

		try {
			expect(await setFrontmatterIcon('/vault/a.md', 'lucide', 'star')).toBe(true);
			expect(observer).toHaveBeenCalledOnce();
			expect(observer).toHaveBeenCalledWith('/vault/a.md', disk);

			expect(await setFrontmatterIcon('/vault/a.md', 'lucide', 'star')).toBe(true);
			expect(writeTextFile).toHaveBeenCalledOnce();
			expect(observer).toHaveBeenCalledOnce();
		} finally {
			unsubscribe();
		}
	});
});

describe('lossy frontmatter refusal (issue 55)', () => {
	it('setFrontmatterIcon refuses a note with frontmatter comments: no write, toast, false', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\n# keep me\ntitle: Test\n---\nBody');

		expect(await setFrontmatterIcon('/vault/a.md', 'lucide', 'star')).toBe(false);

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(toast.error).toHaveBeenCalledWith(
			"a.md: The note's frontmatter has comments; it cannot be rewritten without losing them",
		);
	});

	it('removeFrontmatterIcon refuses a note with nested values and leaves a dirty tab as it was', async () => {
		const saved = '---\n_icon: lucide:star\nmeta:\n  a: 1\n---\nOld body';
		const edited = '---\n_icon: lucide:star\nmeta:\n  a: 1\n---\nUnsaved body edit';
		editorStore.addTab({ path: '/vault/a.md', name: 'a.md', content: edited, savedContent: saved });

		expect(await removeFrontmatterIcon('/vault/a.md')).toBe(false);

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(editorStore.tabs[0].content).toBe(edited);
		expect(editorStore.tabs[0].savedContent).toBe(saved);
		expect(toast.error).toHaveBeenCalledWith(
			"a.md: The note's frontmatter has nested values; it cannot be rewritten without losing them",
		);
	});
});

describe('removeFrontmatterIcon', () => {
	it('removes _icon, _color, _title_color from frontmatter', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\ntitle: Test\n_icon: lucide:star\n_color: red\n_title_color: blue\n---\nBody');

		await removeFrontmatterIcon('/vault/a.md');

		const written = vi.mocked(writeTextFile).mock.calls[0][1];
		expect(written).toContain('title: Test');
		expect(written).not.toContain('_icon');
		expect(written).not.toContain('_color');
		expect(written).not.toContain('_title_color');
	});

	it('does not write when no icon fields exist', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\ntitle: Test\n---\nBody');

		await removeFrontmatterIcon('/vault/a.md');

		expect(writeTextFile).not.toHaveBeenCalled();
	});

	it('removes only icon-related fields, preserves others', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\ntitle: Test\n_icon: lucide:star\ntags: [a]\n---\nBody');

		await removeFrontmatterIcon('/vault/a.md');

		const written = vi.mocked(writeTextFile).mock.calls[0][1];
		expect(written).toContain('title: Test');
		expect(written).toContain('tags:');
		expect(written).not.toContain('_icon');
	});
});

describe('note-change indexing (issue 29)', () => {
	let unregister: (() => void)[] = [];

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		vi.mocked(invoke).mockResolvedValue(undefined);
		clearAllIndexed();
		collectionStore.reset();
		fileIconsStore.reset();
		editorStore.reset();
		unregister = [registerCollectionNoteChangeConsumer(), registerFileIconsNoteChangeConsumer()];
	});

	afterEach(() => {
		for (const u of unregister) u();
		unregister = [];
		collectionStore.reset();
		fileIconsStore.reset();
	});

	it('setFrontmatterIcon indexes the written bytes into the real per-file indexes', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\ntitle: Test\n---\nBody');

		await setFrontmatterIcon('/vault/a.md', 'lucide', 'star');

		expect(collectionStore.propertyIndex.get('/vault/a.md')?.properties.get('_icon')).toBe('lucide:star');
		expect(fileIconsStore.getFrontmatterIcon('/vault/a.md')).toEqual({
			iconPack: 'lucide', iconName: 'star', color: undefined, titleColor: undefined,
		});
		expect(invoke).toHaveBeenCalledWith('update_note_in_index', {
			path: '/vault/a.md',
			content: vi.mocked(writeTextFile).mock.calls[0][1],
		});
	});

	it('removeFrontmatterIcon re-indexes the stripped bytes', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\ntitle: Test\n_icon: lucide:star\n---\nBody');
		fileIconsStore.updateFrontmatterIcon('/vault/a.md', { iconPack: 'lucide', iconName: 'star' });
		collectionStore.updateRecord('/vault/a.md', {
			path: '/vault/a.md', name: 'a.md', basename: 'a', folder: '/vault', ext: '.md',
			mtime: 0, ctime: 0, size: 0, properties: new Map([['_icon', 'lucide:star']]),
		});

		await removeFrontmatterIcon('/vault/a.md');

		expect(collectionStore.propertyIndex.get('/vault/a.md')?.properties.has('_icon')).toBe(false);
		expect(fileIconsStore.getFrontmatterIcon('/vault/a.md')).toBeUndefined();
	});

	it('does not index when there is nothing to strip and no write happens', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\ntitle: Test\n---\nBody');

		await removeFrontmatterIcon('/vault/a.md');

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(collectionStore.propertyIndex.has('/vault/a.md')).toBe(false);
		expect(invoke).not.toHaveBeenCalled();
	});
});
