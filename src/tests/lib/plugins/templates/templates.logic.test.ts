import { describe, it, expect } from 'vitest';
import {
	extractTitleFromPath,
	buildTemplatesFolderPath,
	filterTemplates,
	type TemplateEntry,
} from '$lib/plugins/templates/templates.logic';

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
