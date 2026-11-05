import { describe, it, expect } from 'vitest';
import {
	extractNoteName,
	replaceWikilinks,
} from '#lib/core/filesystem/link-updater.logic.js';

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

	it('rewrites a path-qualified target and keeps its folder prefix', () => {
		expect(replaceWikilinks('See [[folder/Old]]', 'Old', 'New')).toBe('See [[folder/New]]');
	});

	it('rewrites a target written with .md and keeps the extension', () => {
		expect(replaceWikilinks('See [[Old.md]]', 'Old', 'New')).toBe('See [[New.md]]');
	});

	it('keeps prefix, .md, heading and alias together', () => {
		expect(replaceWikilinks('See [[folder/Old.md#H|a]]', 'Old', 'New')).toBe('See [[folder/New.md#H|a]]');
	});

	it('keeps prefix and block reference', () => {
		expect(replaceWikilinks('[[a/b/Old#^blk]]', 'Old', 'New')).toBe('[[a/b/New#^blk]]');
	});

	it('rewrites a path-qualified embed', () => {
		expect(replaceWikilinks('![[folder/Old]]', 'Old', 'New')).toBe('![[folder/New]]');
	});

	it('rewrites a .markdown target and keeps the written extension case', () => {
		expect(replaceWikilinks('[[old.MARKDOWN]]', 'Old', 'New')).toBe('[[New.MARKDOWN]]');
	});

	it('does not rewrite a path-qualified target with a different stem', () => {
		expect(replaceWikilinks('[[folder/Older]]', 'Old', 'New')).toBe('[[folder/Older]]');
	});

	it('does not rewrite a non-markdown file with the same stem', () => {
		expect(replaceWikilinks('![[Old.png]] [[folder/Old.png]]', 'Old', 'New')).toBe(
			'![[Old.png]] [[folder/Old.png]]',
		);
	});

	it('leaves empty-target links alone', () => {
		const content = '[[#H]] [[]] [[folder/]]';
		expect(replaceWikilinks(content, 'Old', 'New')).toBe(content);
	});

	it('treats a non-markdown dot as part of the stem', () => {
		expect(replaceWikilinks('[[v1.2 notes]] [[v1]]', 'v1.2 notes', 'v2')).toBe('[[v2]] [[v1]]');
	});

	it('rewrites a target that names a stem ending in .md as written', () => {
		expect(replaceWikilinks('[[notes.md]] [[a/Notes.md#H]] [[notes.md.md]]', 'notes.md', 'other')).toBe(
			'[[other]] [[a/other#H]] [[other.md]]',
		);
	});
});

