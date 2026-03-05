import { describe, it, expect } from 'vitest';
import {
	extractNoteName,
	replaceWikilinks,
	contentHasWikilinkTo,
	findFilesLinkingTo,
} from '$lib/core/filesystem/link-updater.logic';

describe('extractNoteName', () => {
	it('extracts name from a path with .md extension', () => {
		expect(extractNoteName('/vault/My Note.md')).toBe('My Note');
	});

	it('extracts name from a nested path', () => {
		expect(extractNoteName('/vault/folder/sub/Note.md')).toBe('Note');
	});

	it('handles files without extension', () => {
		expect(extractNoteName('/vault/README')).toBe('README');
	});

	it('handles .markdown extension', () => {
		expect(extractNoteName('/vault/Note.markdown')).toBe('Note');
	});

	it('handles empty string', () => {
		expect(extractNoteName('')).toBe('');
	});

	it('handles path ending with slash', () => {
		expect(extractNoteName('/vault/folder/')).toBe('');
	});
});

describe('replaceWikilinks', () => {
	it('replaces a basic wikilink target', () => {
		const result = replaceWikilinks('See [[Old Note]] for details', 'Old Note', 'New Note');
		expect(result).toBe('See [[New Note]] for details');
	});

	it('is case-insensitive when matching', () => {
		const result = replaceWikilinks('See [[old note]]', 'Old Note', 'New Note');
		expect(result).toBe('See [[New Note]]');
	});

	it('preserves heading fragment', () => {
		const result = replaceWikilinks('See [[Old Note#Section]]', 'Old Note', 'New Note');
		expect(result).toBe('See [[New Note#Section]]');
	});

	it('preserves block reference', () => {
		const result = replaceWikilinks('See [[Old Note#^block-id]]', 'Old Note', 'New Note');
		expect(result).toBe('See [[New Note#^block-id]]');
	});

	it('preserves alias', () => {
		const result = replaceWikilinks('See [[Old Note|display text]]', 'Old Note', 'New Note');
		expect(result).toBe('See [[New Note|display text]]');
	});

	it('preserves heading and alias combined', () => {
		const result = replaceWikilinks('See [[Old Note#Section|click here]]', 'Old Note', 'New Note');
		expect(result).toBe('See [[New Note#Section|click here]]');
	});

	it('replaces multiple occurrences', () => {
		const result = replaceWikilinks(
			'[[Old Note]] and [[Old Note#heading]]',
			'Old Note',
			'New Note',
		);
		expect(result).toBe('[[New Note]] and [[New Note#heading]]');
	});

	it('does not replace non-matching wikilinks', () => {
		const result = replaceWikilinks(
			'[[Old Note]] and [[Other Note]]',
			'Old Note',
			'New Note',
		);
		expect(result).toBe('[[New Note]] and [[Other Note]]');
	});

	it('returns unchanged content when no matches exist', () => {
		const content = 'No wikilinks here';
		const result = replaceWikilinks(content, 'Old Note', 'New Note');
		expect(result).toBe(content);
	});

	it('handles wikilink with whitespace in target', () => {
		const result = replaceWikilinks('See [[ Old Note ]]', 'Old Note', 'New Note');
		expect(result).toBe('See [[New Note]]');
	});

	it('does not replace partial name matches', () => {
		const result = replaceWikilinks('See [[Old Note Extra]]', 'Old Note', 'New Note');
		expect(result).toBe('See [[Old Note Extra]]');
	});

	it('handles embed syntax', () => {
		const result = replaceWikilinks('![[Old Note]]', 'Old Note', 'New Note');
		expect(result).toBe('![[New Note]]');
	});

	it('consecutive calls produce correct results (no shared regex state)', () => {
		const first = replaceWikilinks('[[A]] and [[A#h]]', 'A', 'B');
		const second = replaceWikilinks('[[A]] and [[A|alias]]', 'A', 'C');
		expect(first).toBe('[[B]] and [[B#h]]');
		expect(second).toBe('[[C]] and [[C|alias]]');
	});

	it('handles unclosed wikilink brackets gracefully', () => {
		const content = 'See [[Old Note and more text';
		const result = replaceWikilinks(content, 'Old Note', 'New Note');
		expect(result).toBe(content);
	});

	it('handles empty content', () => {
		expect(replaceWikilinks('', 'Old Note', 'New Note')).toBe('');
	});
});

describe('contentHasWikilinkTo', () => {
	it('returns true when content has matching wikilink', () => {
		expect(contentHasWikilinkTo('See [[My Note]]', 'My Note')).toBe(true);
	});

	it('is case-insensitive', () => {
		expect(contentHasWikilinkTo('See [[my note]]', 'My Note')).toBe(true);
	});

	it('returns false when no matching wikilink', () => {
		expect(contentHasWikilinkTo('See [[Other Note]]', 'My Note')).toBe(false);
	});

	it('returns false for content without wikilinks', () => {
		expect(contentHasWikilinkTo('Plain text', 'My Note')).toBe(false);
	});

	it('matches wikilinks with fragments', () => {
		expect(contentHasWikilinkTo('See [[My Note#heading]]', 'My Note')).toBe(true);
	});
});

describe('findFilesLinkingTo', () => {
	it('finds files that contain wikilinks to the given name', () => {
		const noteContents = new Map([
			['/vault/A.md', 'See [[Target]]'],
			['/vault/B.md', 'No links here'],
			['/vault/C.md', 'Also [[Target#heading]]'],
		]);
		const result = findFilesLinkingTo('Target', noteContents, '/vault/Target.md');
		expect(result).toEqual(['/vault/A.md', '/vault/C.md']);
	});

	it('excludes the source file', () => {
		const noteContents = new Map([
			['/vault/Target.md', 'Self-link [[Target]]'],
			['/vault/A.md', 'See [[Target]]'],
		]);
		const result = findFilesLinkingTo('Target', noteContents, '/vault/Target.md');
		expect(result).toEqual(['/vault/A.md']);
	});

	it('returns empty array when no files link to the name', () => {
		const noteContents = new Map([
			['/vault/A.md', 'See [[Other]]'],
		]);
		const result = findFilesLinkingTo('Target', noteContents, '/vault/Target.md');
		expect(result).toEqual([]);
	});

	it('returns empty array for empty map', () => {
		const result = findFilesLinkingTo('Target', new Map(), '/vault/Target.md');
		expect(result).toEqual([]);
	});
});
