import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
}));

import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { setFrontmatterIcon, removeFrontmatterIcon } from '$lib/features/file-icons/frontmatter-icon.service';

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(writeTextFile).mockResolvedValue(undefined);
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
