import { describe, it, expect } from 'vitest';
import {
	buildRenameResolution,
	extractNoteName,
	replaceWikilinks,
} from '#lib/core/filesystem/link-updater.logic.js';
import { buildResolutionCache, resolveWikilinkCached } from '#lib/core/filesystem/wikilink-resolution.logic.js';

/** Renames the only note of vault `/v`, `/v/<oldName>.md`, to `/v/<newName>.md` and rewrites `content`. */
function renameInOneNoteVault(content: string, oldName: string, newName: string): string {
	const oldPath = `/v/${oldName}.md`;
	return replaceWikilinks(content, buildRenameResolution(oldPath, `/v/${newName}.md`, [oldPath], '/v'));
}

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
		const result = renameInOneNoteVault('See [[Old Note]] for details', 'Old Note', 'New Note');
		expect(result).toBe('See [[New Note]] for details');
	});

	it('is case-insensitive when matching', () => {
		const result = renameInOneNoteVault('See [[old note]]', 'Old Note', 'New Note');
		expect(result).toBe('See [[New Note]]');
	});

	it('preserves heading fragment', () => {
		const result = renameInOneNoteVault('See [[Old Note#Section]]', 'Old Note', 'New Note');
		expect(result).toBe('See [[New Note#Section]]');
	});

	it('preserves block reference', () => {
		const result = renameInOneNoteVault('See [[Old Note#^block-id]]', 'Old Note', 'New Note');
		expect(result).toBe('See [[New Note#^block-id]]');
	});

	it('preserves alias', () => {
		const result = renameInOneNoteVault('See [[Old Note|display text]]', 'Old Note', 'New Note');
		expect(result).toBe('See [[New Note|display text]]');
	});

	it('preserves heading and alias combined', () => {
		const result = renameInOneNoteVault('See [[Old Note#Section|click here]]', 'Old Note', 'New Note');
		expect(result).toBe('See [[New Note#Section|click here]]');
	});

	it('replaces multiple occurrences', () => {
		const result = renameInOneNoteVault(
			'[[Old Note]] and [[Old Note#heading]]',
			'Old Note',
			'New Note',
		);
		expect(result).toBe('[[New Note]] and [[New Note#heading]]');
	});

	it('does not replace non-matching wikilinks', () => {
		const result = renameInOneNoteVault(
			'[[Old Note]] and [[Other Note]]',
			'Old Note',
			'New Note',
		);
		expect(result).toBe('[[New Note]] and [[Other Note]]');
	});

	it('returns unchanged content when no matches exist', () => {
		const content = 'No wikilinks here';
		const result = renameInOneNoteVault(content, 'Old Note', 'New Note');
		expect(result).toBe(content);
	});

	it('handles wikilink with whitespace in target', () => {
		const result = renameInOneNoteVault('See [[ Old Note ]]', 'Old Note', 'New Note');
		expect(result).toBe('See [[New Note]]');
	});

	it('does not replace partial name matches', () => {
		const result = renameInOneNoteVault('See [[Old Note Extra]]', 'Old Note', 'New Note');
		expect(result).toBe('See [[Old Note Extra]]');
	});

	it('handles embed syntax', () => {
		const result = renameInOneNoteVault('![[Old Note]]', 'Old Note', 'New Note');
		expect(result).toBe('![[New Note]]');
	});

	it('consecutive calls produce correct results (no shared regex state)', () => {
		const first = renameInOneNoteVault('[[A]] and [[A#h]]', 'A', 'B');
		const second = renameInOneNoteVault('[[A]] and [[A|alias]]', 'A', 'C');
		expect(first).toBe('[[B]] and [[B#h]]');
		expect(second).toBe('[[C]] and [[C|alias]]');
	});

	it('handles unclosed wikilink brackets gracefully', () => {
		const content = 'See [[Old Note and more text';
		const result = renameInOneNoteVault(content, 'Old Note', 'New Note');
		expect(result).toBe(content);
	});

	it('handles empty content', () => {
		expect(renameInOneNoteVault('', 'Old Note', 'New Note')).toBe('');
	});

	it('rewrites a path-qualified target and keeps its folder prefix', () => {
		expect(renameInOneNoteVault('See [[folder/Old]]', 'Old', 'New')).toBe('See [[folder/New]]');
	});

	it('rewrites a target written with .md and keeps the extension', () => {
		expect(renameInOneNoteVault('See [[Old.md]]', 'Old', 'New')).toBe('See [[New.md]]');
	});

	it('keeps prefix, .md, heading and alias together', () => {
		expect(renameInOneNoteVault('See [[folder/Old.md#H|a]]', 'Old', 'New')).toBe('See [[folder/New.md#H|a]]');
	});

	it('keeps prefix and block reference', () => {
		expect(renameInOneNoteVault('[[a/b/Old#^blk]]', 'Old', 'New')).toBe('[[a/b/New#^blk]]');
	});

	it('rewrites a path-qualified embed', () => {
		expect(renameInOneNoteVault('![[folder/Old]]', 'Old', 'New')).toBe('![[folder/New]]');
	});

	it('rewrites a .markdown target and keeps the written extension case', () => {
		expect(renameInOneNoteVault('[[old.MARKDOWN]]', 'Old', 'New')).toBe('[[New.MARKDOWN]]');
	});

	it('does not rewrite a path-qualified target with a different stem', () => {
		expect(renameInOneNoteVault('[[folder/Older]]', 'Old', 'New')).toBe('[[folder/Older]]');
	});

	it('does not rewrite a non-markdown file with the same stem', () => {
		expect(renameInOneNoteVault('![[Old.png]] [[folder/Old.png]]', 'Old', 'New')).toBe(
			'![[Old.png]] [[folder/Old.png]]',
		);
	});

	it('leaves empty-target links alone', () => {
		const content = '[[#H]] [[]] [[folder/]]';
		expect(renameInOneNoteVault(content, 'Old', 'New')).toBe(content);
	});

	it('treats a non-markdown dot as part of the stem', () => {
		expect(renameInOneNoteVault('[[v1.2 notes]] [[v1]]', 'v1.2 notes', 'v2')).toBe('[[v2]] [[v1]]');
	});

	it('rewrites a target that names a stem ending in .md as written', () => {
		// `[[a/Notes.md]]` resolves by its basename `Notes`, which is not this note.
		expect(renameInOneNoteVault('[[notes.md]] [[a/Notes.md#H]] [[notes.md.md]]', 'notes.md', 'other')).toBe(
			'[[other]] [[a/Notes.md#H]] [[other.md]]',
		);
	});
});

describe('replaceWikilinks resolution', () => {
	it('writes the vault-relative path when the new stem belongs to another note', () => {
		const rename = buildRenameResolution('/v/A/Old.md', '/v/A/Other.md', ['/v/B/Other.md', '/v/A/Old.md'], '/v');

		const result = replaceWikilinks('[[Old]]', rename);

		expect(result).toBe('[[A/Other.md]]');
		const after = buildResolutionCache(['/v/B/Other.md', '/v/A/Other.md']);
		expect(resolveWikilinkCached('A/Other.md', after, '/v')).toBe('/v/A/Other.md');
	});

	it('keeps heading, alias and embed on the path form', () => {
		const rename = buildRenameResolution('/v/A/Old.md', '/v/A/Other.md', ['/v/B/Other.md', '/v/A/Old.md'], '/v');

		expect(replaceWikilinks('![[Old#H|a]] [[A/Old]]', rename)).toBe('![[A/Other.md#H|a]] [[A/Other.md]]');
	});

	it('rewrites only the link that resolves to the renamed note', () => {
		const rename = buildRenameResolution('/v/A/Old.md', '/v/A/New.md', ['/v/B/Old.md', '/v/A/Old.md'], '/v');

		expect(replaceWikilinks('[[A/Old.md]] and [[Old]]', rename)).toBe('[[A/New.md]] and [[Old]]');
	});

	it('writes the bare form when the new stem is unique', () => {
		const rename = buildRenameResolution('/v/A/Old.md', '/v/A/New.md', ['/v/B/Other.md', '/v/A/Old.md'], '/v');

		expect(replaceWikilinks('[[Old]] [[Old#H|a]]', rename)).toBe('[[New]] [[New#H|a]]');
	});

	it('resolves against a path list that already holds the new path or lacks the old one', () => {
		// A watcher patch may land between the disk rename and the rewrite.
		const rename = buildRenameResolution('/v/A/Old.md', '/v/A/Other.md', ['/v/A/Other.md', '/v/B/Other.md'], '/v');

		expect(replaceWikilinks('[[Old]]', rename)).toBe('[[A/Other.md]]');
	});

	it('cannot keep a root note on itself when a nested note owns the new stem', () => {
		// Known limit (follow-up Issue 20): a root note's path form has no `/`, so
		// both resolvers take the first `Other.md` by file name, the nested one.
		const rename = buildRenameResolution('/v/Old.md', '/v/Other.md', ['/v/B/Other.md', '/v/Old.md'], '/v');

		expect(replaceWikilinks('[[Old]]', rename)).toBe('[[Other.md]]');
		const after = buildResolutionCache(['/v/B/Other.md', '/v/Other.md']);
		expect(resolveWikilinkCached('Other.md', after, '/v')).toBe('/v/B/Other.md');
	});

	it('writes the bare form unverified without a vault root', () => {
		const rename = buildRenameResolution('/v/A/Old.md', '/v/A/Other.md', ['/v/B/Other.md', '/v/A/Old.md'], null);

		expect(replaceWikilinks('[[Old]]', rename)).toBe('[[Other]]');
	});

	it('leaves content without links to the note unchanged', () => {
		const rename = buildRenameResolution('/v/A/Old.md', '/v/A/New.md', ['/v/A/Old.md'], '/v');

		expect(replaceWikilinks('', rename)).toBe('');
		expect(replaceWikilinks('[[Elsewhere]] text', rename)).toBe('[[Elsewhere]] text');
	});
});

