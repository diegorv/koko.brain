import { describe, it, expect } from 'vitest';
import {
	extractTitleFromPath,
	buildTemplatesFolderPath,
	filterTemplates,
	withMdExtension,
	noteExistsInTree,
	nameLeavesVault,
	type TemplateEntry,
} from '#lib/plugins/templates/templates.logic.js';
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';

describe('extractTitleFromPath', () => {
	it('extracts filename without extension', () => {
		expect(extractTitleFromPath('/vault/notes/My Note.md')).toBe('My Note');
	});

	it('handles files without extension', () => {
		expect(extractTitleFromPath('/vault/README')).toBe('README');
	});

	it('handles paths with multiple dots', () => {
		expect(extractTitleFromPath('/vault/file.backup.md')).toBe('file.backup');
	});

	it('handles simple filename', () => {
		expect(extractTitleFromPath('note.md')).toBe('note');
	});

	it('handles empty string', () => {
		expect(extractTitleFromPath('')).toBe('');
	});

	it('handles path ending with slash', () => {
		expect(extractTitleFromPath('/vault/folder/')).toBe('');
	});
});

describe('buildTemplatesFolderPath', () => {
	it('appends templates folder to vault path', () => {
		expect(buildTemplatesFolderPath('/my/vault', '_templates')).toBe('/my/vault/_templates');
	});

	it('works with custom folder names', () => {
		expect(buildTemplatesFolderPath('/vault', 'my-templates')).toBe('/vault/my-templates');
	});

	it('handles empty vault path', () => {
		expect(buildTemplatesFolderPath('', '_templates')).toBe('/_templates');
	});

	it('handles empty templates folder', () => {
		expect(buildTemplatesFolderPath('/vault', '')).toBe('/vault/');
	});
});

describe('filterTemplates', () => {
	const templates: TemplateEntry[] = [
		{ name: 'Daily Note', path: '/vault/_templates/Daily Note.md' },
		{ name: 'Meeting Notes', path: '/vault/_templates/Meeting Notes.md' },
		{ name: 'Project Plan', path: '/vault/_templates/Project Plan.md' },
	];

	it('returns all templates when query is empty', () => {
		expect(filterTemplates('', templates)).toEqual(templates);
	});

	it('returns all templates when query is whitespace', () => {
		expect(filterTemplates('   ', templates)).toEqual(templates);
	});

	it('filters by case-insensitive substring match', () => {
		const result = filterTemplates('meeting', templates);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('Meeting Notes');
	});

	it('returns multiple matches', () => {
		const result = filterTemplates('note', templates);
		expect(result).toHaveLength(2);
	});

	it('returns empty array when no match', () => {
		expect(filterTemplates('xyz', templates)).toEqual([]);
	});

	it('handles empty templates list', () => {
		expect(filterTemplates('test', [])).toEqual([]);
	});
});

describe('withMdExtension', () => {
	it('appends .md to a bare name', () => {
		expect(withMdExtension('Standup')).toBe('Standup.md');
	});

	it('does not double an existing .md', () => {
		expect(withMdExtension('Standup.md')).toBe('Standup.md');
	});

	it('appends .md after another extension, as the service does', () => {
		expect(withMdExtension('notes.txt')).toBe('notes.txt.md');
	});

	it('keeps the folder part of the name', () => {
		expect(withMdExtension('Projects/Standup')).toBe('Projects/Standup.md');
	});
});

describe('nameLeavesVault', () => {
	it('keeps a plain name inside', () => {
		expect(nameLeavesVault('Standup')).toBe(false);
	});

	it('keeps a folder name inside', () => {
		expect(nameLeavesVault('Folder/Name')).toBe(false);
	});

	it('refuses a name that climbs above the root', () => {
		expect(nameLeavesVault('../x')).toBe(true);
	});

	it('refuses a name that climbs back out of a folder', () => {
		expect(nameLeavesVault('a/../../x')).toBe(true);
	});

	it('keeps a .. that stays inside a folder', () => {
		expect(nameLeavesVault('a/../x')).toBe(false);
	});

	it('treats a leading slash as vault-relative', () => {
		expect(nameLeavesVault('/Folder/Name')).toBe(false);
	});

	it('keeps a trailing .. inside, since it becomes the file ...md', () => {
		expect(nameLeavesVault('..')).toBe(false);
	});

	it('keeps an empty name inside', () => {
		expect(nameLeavesVault('')).toBe(false);
	});
});

describe('noteExistsInTree', () => {
	const tree: FileTreeNode[] = [
		{ name: 'Standup.md', path: '/vault/Standup.md', isDirectory: false },
		{
			name: 'Projects',
			path: '/vault/Projects',
			isDirectory: true,
			children: [
				{ name: 'Roadmap.md', path: '/vault/Projects/Roadmap.md', isDirectory: false },
				{
					name: 'Archive.md',
					path: '/vault/Projects/Archive.md',
					isDirectory: true,
					children: [],
				},
			],
		},
	];

	it('matches a root note case-insensitively', () => {
		expect(noteExistsInTree(tree, '/vault', 'standup')).toBe(true);
		expect(noteExistsInTree(tree, '/vault', 'STANDUP.md')).toBe(true);
	});

	it('matches a note in a folder case-insensitively', () => {
		expect(noteExistsInTree(tree, '/vault', 'projects/roadmap')).toBe(true);
	});

	it('matches across Unicode normalization forms, as APFS does', () => {
		const nfdTree: FileTreeNode[] = [
			{ name: 'Cafe\u0301.md', path: '/vault/Cafe\u0301.md', isDirectory: false },
		];
		expect(noteExistsInTree(nfdTree, '/vault', 'caf\u00e9')).toBe(true);
	});

	it('ignores a directory with the same name', () => {
		expect(noteExistsInTree(tree, '/vault', 'Projects/Archive')).toBe(false);
		expect(noteExistsInTree(tree, '/vault', 'Projects.md')).toBe(false);
	});

	it('adds .md the way the service does', () => {
		// "Standup.MD" becomes "Standup.MD.md", which is not in the tree.
		expect(noteExistsInTree(tree, '/vault', 'Standup.MD')).toBe(false);
	});

	it('does not treat a file as a folder', () => {
		expect(noteExistsInTree(tree, '/vault', 'Standup.md/Inner')).toBe(false);
	});

	it('returns false for an empty tree', () => {
		expect(noteExistsInTree([], '/vault', 'Standup')).toBe(false);
	});

	it('returns false for a path outside the tree', () => {
		expect(noteExistsInTree(tree, '/vault', 'Missing/Standup')).toBe(false);
		expect(noteExistsInTree(tree, '/vault', 'Other')).toBe(false);
		expect(noteExistsInTree(tree, '/other-vault', 'Standup')).toBe(false);
	});
});
