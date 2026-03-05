import { describe, it, expect } from 'vitest';
import {
	detectWikilinkContext,
	matchFilesForWikilink,
	extractHeadingsFromContent,
	extractBlockIdsFromContent,
	extractAliasesFromContent,
} from '$lib/core/markdown-editor/extensions/wikilink/completion.logic';
import type { FileEntry } from '$lib/features/quick-switcher/quick-switcher.logic';

describe('detectWikilinkContext', () => {
	it('returns null when cursor is not inside wikilink brackets', () => {
		expect(detectWikilinkContext('Hello world', 5)).toBeNull();
	});

	it('detects empty query right after [[', () => {
		const result = detectWikilinkContext('See [[', 6);
		expect(result).toEqual({ from: 6, to: 6, query: '', mode: 'file' });
	});

	it('detects partial query inside [[', () => {
		const result = detectWikilinkContext('See [[My No', 11);
		expect(result).toEqual({ from: 6, to: 11, query: 'My No', mode: 'file' });
	});

	it('returns null when brackets are already closed', () => {
		expect(detectWikilinkContext('See [[Done]] here', 15)).toBeNull();
	});

	it('returns null when cursor is after closed brackets', () => {
		expect(detectWikilinkContext('See [[Done]] here', 17)).toBeNull();
	});

	it('handles [[ at the start of a line', () => {
		const result = detectWikilinkContext('[[Note', 6);
		expect(result).toEqual({ from: 2, to: 6, query: 'Note', mode: 'file' });
	});

	it('works on second line', () => {
		const result = detectWikilinkContext('First line\n[[Sec', 16);
		expect(result).toEqual({ from: 13, to: 16, query: 'Sec', mode: 'file' });
	});

	it('handles multiple [[ on same line, picks the last unclosed one', () => {
		const result = detectWikilinkContext('[[Done]] and [[New', 18);
		expect(result).toEqual({ from: 15, to: 18, query: 'New', mode: 'file' });
	});

	it('returns null for single [', () => {
		expect(detectWikilinkContext('See [not a link', 10)).toBeNull();
	});

	it('handles [[ with ]] already after cursor (closeBrackets scenario)', () => {
		const result = detectWikilinkContext('[[]]', 2);
		expect(result).toEqual({ from: 2, to: 2, query: '', mode: 'file' });
	});

	it('handles partial text with ]] after cursor', () => {
		const result = detectWikilinkContext('[[My N]]', 6);
		expect(result).toEqual({ from: 2, to: 6, query: 'My N', mode: 'file' });
	});

	// Heading mode tests
	it('detects heading mode with # after target', () => {
		const result = detectWikilinkContext('[[Note#', 7);
		expect(result).toEqual({ from: 7, to: 7, query: '', mode: 'heading', target: 'Note' });
	});

	it('detects heading mode with partial heading query', () => {
		const result = detectWikilinkContext('[[Note#Intro', 12);
		expect(result).toEqual({ from: 7, to: 12, query: 'Intro', mode: 'heading', target: 'Note' });
	});

	it('detects heading mode for same-note reference [[#', () => {
		const result = detectWikilinkContext('[[#Head', 7);
		expect(result).toEqual({ from: 3, to: 7, query: 'Head', mode: 'heading', target: '' });
	});

	it('detects heading mode with empty query after [[#', () => {
		const result = detectWikilinkContext('[[#', 3);
		expect(result).toEqual({ from: 3, to: 3, query: '', mode: 'heading', target: '' });
	});

	// Block ID mode tests
	it('detects blockId mode with #^ after target', () => {
		const result = detectWikilinkContext('[[Note#^', 8);
		expect(result).toEqual({ from: 8, to: 8, query: '', mode: 'blockId', target: 'Note' });
	});

	it('detects blockId mode with partial block query', () => {
		const result = detectWikilinkContext('[[Note#^abc', 11);
		expect(result).toEqual({ from: 8, to: 11, query: 'abc', mode: 'blockId', target: 'Note' });
	});

	it('detects blockId mode for same-note [[#^', () => {
		const result = detectWikilinkContext('[[#^myblock', 11);
		expect(result).toEqual({ from: 4, to: 11, query: 'myblock', mode: 'blockId', target: '' });
	});

	// Pipe (display text) — no completion
	it('returns null when cursor is after pipe (display text area)', () => {
		expect(detectWikilinkContext('[[Note|display', 14)).toBeNull();
	});

	it('returns null for pipe right after target', () => {
		expect(detectWikilinkContext('[[Note|', 7)).toBeNull();
	});
});

describe('matchFilesForWikilink', () => {
	const files: FileEntry[] = [
		{ name: 'Daily Notes.md', nameWithoutExt: 'Daily Notes', path: '/vault/Daily Notes.md' },
		{
			name: 'Project Ideas.md',
			nameWithoutExt: 'Project Ideas',
			path: '/vault/Project Ideas.md',
		},
		{
			name: 'Meeting Notes.md',
			nameWithoutExt: 'Meeting Notes',
			path: '/vault/Meeting Notes.md',
		},
		{ name: 'Todo.md', nameWithoutExt: 'Todo', path: '/vault/Todo.md' },
	];

	it('returns all files alphabetically for empty query', () => {
		const result = matchFilesForWikilink('', files);
		expect(result.map((f) => f.name)).toEqual([
			'Daily Notes.md',
			'Meeting Notes.md',
			'Project Ideas.md',
			'Todo.md',
		]);
	});

	it('filters by fuzzy match against full name', () => {
		const result = matchFilesForWikilink('daily', files);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('Daily Notes.md');
	});

	it('returns empty array when nothing matches', () => {
		const result = matchFilesForWikilink('xyz', files);
		expect(result).toHaveLength(0);
	});

	it('ranks exact prefix match higher', () => {
		const result = matchFilesForWikilink('Da', files);
		expect(result[0].name).toBe('Daily Notes.md');
	});
});

describe('extractHeadingsFromContent', () => {
	it('extracts ATX headings from content', () => {
		const content = '# Title\nSome text\n## Section A\n### Subsection\n## Section B';
		expect(extractHeadingsFromContent(content)).toEqual([
			'Title',
			'Section A',
			'Subsection',
			'Section B',
		]);
	});

	it('returns empty array for content with no headings', () => {
		expect(extractHeadingsFromContent('Just some text\nwith no headings')).toEqual([]);
	});

	it('handles headings with extra spaces', () => {
		const content = '#  Spaced Heading  \n## Another';
		expect(extractHeadingsFromContent(content)).toEqual(['Spaced Heading', 'Another']);
	});

	it('ignores lines that look like headings inside code blocks context (no code block detection here — pure text)', () => {
		// Note: this function does pure text extraction, no code block awareness
		const content = '# Real Heading\n```\n# Not Real\n```\n## Also Real';
		// It extracts ALL headings (code block awareness is handled elsewhere)
		expect(extractHeadingsFromContent(content)).toEqual(['Real Heading', 'Not Real', 'Also Real']);
	});
});

describe('extractBlockIdsFromContent', () => {
	it('extracts block IDs from content', () => {
		const content = 'Some text ^abc123\nMore text\nAnother line ^def456';
		expect(extractBlockIdsFromContent(content)).toEqual(['abc123', 'def456']);
	});

	it('returns empty array when no block IDs exist', () => {
		expect(extractBlockIdsFromContent('Just text\nNo block IDs')).toEqual([]);
	});

	it('handles block IDs with trailing spaces', () => {
		const content = 'Text ^my-block   ';
		expect(extractBlockIdsFromContent(content)).toEqual(['my-block']);
	});

	it('handles block ID with hyphen and underscore', () => {
		const content = 'Line ^block-id_v2';
		expect(extractBlockIdsFromContent(content)).toEqual(['block-id_v2']);
	});
});

describe('extractAliasesFromContent', () => {
	it('extracts aliases from inline list in frontmatter', () => {
		const content = '---\naliases: [Alias One, Alias Two]\n---\n# Content';
		expect(extractAliasesFromContent(content)).toEqual(['Alias One', 'Alias Two']);
	});

	it('extracts aliases from block list in frontmatter', () => {
		const content = '---\naliases:\n  - First Alias\n  - Second Alias\n---\n# Content';
		expect(extractAliasesFromContent(content)).toEqual(['First Alias', 'Second Alias']);
	});

	it('returns empty array when no frontmatter exists', () => {
		expect(extractAliasesFromContent('# No frontmatter')).toEqual([]);
	});

	it('returns empty array when frontmatter has no aliases', () => {
		const content = '---\ntitle: My Note\n---\n# Content';
		expect(extractAliasesFromContent(content)).toEqual([]);
	});

	it('handles single alias as scalar string', () => {
		const content = '---\naliases: Single Alias\n---\n# Content';
		expect(extractAliasesFromContent(content)).toEqual(['Single Alias']);
	});

	it('handles empty aliases list', () => {
		const content = '---\naliases: []\n---\n# Content';
		expect(extractAliasesFromContent(content)).toEqual([]);
	});
});
