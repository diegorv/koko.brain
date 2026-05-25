import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { updateTypeDefinitionIcon } from '$lib/features/type-definitions/type-definitions.service';

describe('updateTypeDefinitionIcon', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
	});

	it('adds _icon when not present in frontmatter', async () => {
		vi.mocked(readTextFile).mockResolvedValue(
			'---\ntype: Type\n---\n# Project\n'
		);
		await updateTypeDefinitionIcon('/vault/Project.md', 'rocket', null);
		const written = vi.mocked(writeTextFile).mock.calls[0][1] as string;
		expect(written).toContain('_icon: rocket');
		expect(written).toContain('type: Type');
		expect(written).toContain('# Project');
	});

	it('updates existing _icon value', async () => {
		vi.mocked(readTextFile).mockResolvedValue(
			'---\ntype: Type\n_icon: file-text\n---\n# Project\n'
		);
		await updateTypeDefinitionIcon('/vault/Project.md', 'rocket', null);
		const written = vi.mocked(writeTextFile).mock.calls[0][1] as string;
		expect(written).toContain('_icon: rocket');
		expect(written).not.toContain('file-text');
	});

	it('adds _color when not present', async () => {
		vi.mocked(readTextFile).mockResolvedValue(
			'---\ntype: Type\n---\n# Project\n'
		);
		await updateTypeDefinitionIcon('/vault/Project.md', null, '#ef4444');
		const written = vi.mocked(writeTextFile).mock.calls[0][1] as string;
		expect(written).toContain('_color:');
		expect(written).toContain('#ef4444');
	});

	it('updates both _icon and _color together', async () => {
		vi.mocked(readTextFile).mockResolvedValue(
			'---\ntype: Type\n_icon: tag\n_color: green\n---\n# Topic\n'
		);
		await updateTypeDefinitionIcon('/vault/Topic.md', 'users', 'blue');
		const written = vi.mocked(writeTextFile).mock.calls[0][1] as string;
		expect(written).toContain('_icon: users');
		expect(written).toContain('_color: blue');
		expect(written).not.toContain('tag');
		expect(written).not.toContain('green');
	});

	it('preserves body content after frontmatter', async () => {
		vi.mocked(readTextFile).mockResolvedValue(
			'---\ntype: Type\n---\n# Person\n\nSome description here.\n'
		);
		await updateTypeDefinitionIcon('/vault/Person.md', 'users', null);
		const written = vi.mocked(writeTextFile).mock.calls[0][1] as string;
		expect(written).toContain('# Person');
		expect(written).toContain('Some description here.');
	});

	it('does not write when both icon and color are null', async () => {
		vi.mocked(readTextFile).mockResolvedValue(
			'---\ntype: Type\n---\n# Note\n'
		);
		await updateTypeDefinitionIcon('/vault/Note.md', null, null);
		expect(vi.mocked(writeTextFile)).not.toHaveBeenCalled();
	});
});
