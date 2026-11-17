import { describe, it, expect } from 'vitest';
import { createTargetLabel, parseCreatePath } from '#lib/features/quick-switcher/quick-switcher.logic.js';

describe('parseCreatePath', () => {
	it('puts a plain name in the vault root with .md appended', () => {
		expect(parseCreatePath('Idea')).toEqual({ folder: '', name: 'Idea.md' });
	});

	it('keeps a typed .md extension', () => {
		expect(parseCreatePath('Idea.md')).toEqual({ folder: '', name: 'Idea.md' });
	});

	it('splits a folder path into the target folder and the note name', () => {
		expect(parseCreatePath('Area/Projects/Idea')).toEqual({ folder: 'Area/Projects', name: 'Idea.md' });
	});

	it('trims the query before splitting', () => {
		expect(parseCreatePath('  Projects/Idea  ')).toEqual({ folder: 'Projects', name: 'Idea.md' });
	});

	it.each(['', '   '])('refuses an empty query %j', (query) => {
		expect(parseCreatePath(query)).toHaveProperty('error');
	});

	it.each(['Projects//Idea', 'Projects/', '/Idea', 'Projects/ /Idea'])('refuses %s, which has an empty segment', (query) => {
		const result = parseCreatePath(query);
		expect('error' in result && result.error).toContain('empty');
	});

	it.each(['./Idea', '../Idea', '.kokobrain/x', 'Projects/.hidden', '.Idea'])(
		'refuses %s, which has a segment starting with "."',
		(query) => {
			const result = parseCreatePath(query);
			expect('error' in result && result.error).toContain('"."');
		},
	);
});

describe('createTargetLabel', () => {
	it('names the folder', () => {
		expect(createTargetLabel('Area/Projects')).toBe('in Area/Projects');
	});

	it('names the vault root for an empty folder', () => {
		expect(createTargetLabel('')).toBe('in vault root');
	});
});
