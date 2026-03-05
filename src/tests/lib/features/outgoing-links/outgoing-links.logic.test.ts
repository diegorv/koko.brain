import { describe, it, expect } from 'vitest';
import { parseWikilinks } from '$lib/features/backlinks/backlinks.logic';
import type { WikiLink } from '$lib/features/backlinks/backlinks.types';
import {
	getOutgoingLinks,
	deduplicateOutgoingLinks,
	findOutgoingUnlinkedMentions,
} from '$lib/features/outgoing-links/outgoing-links.logic';

describe('getOutgoingLinks', () => {
	const allPaths = [
		'/vault/Note A.md',
		'/vault/folder/Note B.md',
		'/vault/Daily/2024-01-01.md',
	];

	it('extracts outgoing links from content', () => {
		const content = 'See [[Note A]] and [[Note B]]';
		const result = getOutgoingLinks(content, allPaths);
		expect(result).toHaveLength(2);
		expect(result[0].target).toBe('Note A');
		expect(result[1].target).toBe('Note B');
	});

	it('resolves links to existing notes', () => {
		const content = 'Link to [[Note A]]';
		const result = getOutgoingLinks(content, allPaths);
		expect(result[0].resolvedPath).toBe('/vault/Note A.md');
	});

	it('marks unresolvable links as broken (null resolvedPath)', () => {
		const content = 'Link to [[Nonexistent Note]]';
		const result = getOutgoingLinks(content, allPaths);
		expect(result).toHaveLength(1);
		expect(result[0].target).toBe('Nonexistent Note');
		expect(result[0].resolvedPath).toBeNull();
	});

	it('preserves alias and heading info', () => {
		const content = 'See [[Note A#Section|display text]]';
		const result = getOutgoingLinks(content, allPaths);
		expect(result[0].target).toBe('Note A');
		expect(result[0].alias).toBe('display text');
		expect(result[0].heading).toBe('Section');
		expect(result[0].resolvedPath).toBe('/vault/Note A.md');
	});

	it('returns empty array for content without links', () => {
		const result = getOutgoingLinks('Plain text with no links', allPaths);
		expect(result).toHaveLength(0);
	});

	it('returns empty array for empty content', () => {
		const result = getOutgoingLinks('', allPaths);
		expect(result).toHaveLength(0);
	});

	it('includes position of each link', () => {
		const content = 'Text [[Note A]] more text';
		const result = getOutgoingLinks(content, allPaths);
		expect(result[0].position).toBe(5);
	});
});

describe('deduplicateOutgoingLinks', () => {
	it('removes duplicate targets (case-insensitive)', () => {
		const links = getOutgoingLinks(
			'See [[Note A]] and also [[note a]] again',
			['/vault/Note A.md'],
		);
		const result = deduplicateOutgoingLinks(links);
		expect(result).toHaveLength(1);
		expect(result[0].target).toBe('Note A');
	});

	it('keeps different targets', () => {
		const links = getOutgoingLinks(
			'See [[Note A]] and [[Note B]]',
			['/vault/Note A.md', '/vault/Note B.md'],
		);
		const result = deduplicateOutgoingLinks(links);
		expect(result).toHaveLength(2);
	});

	it('returns empty array for empty input', () => {
		const result = deduplicateOutgoingLinks([]);
		expect(result).toHaveLength(0);
	});
});

describe('findOutgoingUnlinkedMentions', () => {
	const allPaths = [
		'/vault/Current.md',
		'/vault/Note A.md',
		'/vault/Note B.md',
		'/vault/Daily Notes.md',
	];

	it('finds other note names mentioned as plain text', () => {
		const content = 'This text mentions Note A somewhere in it';
		const noteIndex = new Map<string, WikiLink[]>([
			['/vault/Current.md', []],
		]);

		const result = findOutgoingUnlinkedMentions('/vault/Current.md', content, allPaths, noteIndex);
		expect(result).toHaveLength(1);
		expect(result[0].noteName).toBe('Note A');
		expect(result[0].notePath).toBe('/vault/Note A.md');
		expect(result[0].count).toBe(1);
	});

	it('counts multiple mentions of the same note', () => {
		const content = 'First Note A and then Note A again';
		const noteIndex = new Map<string, WikiLink[]>([
			['/vault/Current.md', []],
		]);

		const result = findOutgoingUnlinkedMentions('/vault/Current.md', content, allPaths, noteIndex);
		expect(result).toHaveLength(1);
		expect(result[0].count).toBe(2);
	});

	it('excludes notes already linked via wikilink', () => {
		const content = 'Has [[Note A]] wikilink and also mentions Note A in text';
		const noteIndex = new Map<string, WikiLink[]>([
			['/vault/Current.md', parseWikilinks(content)],
		]);

		const result = findOutgoingUnlinkedMentions('/vault/Current.md', content, allPaths, noteIndex);
		const noteAMention = result.find((m) => m.noteName === 'Note A');
		expect(noteAMention).toBeUndefined();
	});

	it('excludes self-references', () => {
		const content = 'This note is Current and mentions Current';
		const noteIndex = new Map<string, WikiLink[]>([
			['/vault/Current.md', []],
		]);

		const result = findOutgoingUnlinkedMentions('/vault/Current.md', content, allPaths, noteIndex);
		const selfMention = result.find((m) => m.noteName === 'Current');
		expect(selfMention).toBeUndefined();
	});

	it('respects word boundaries', () => {
		const content = 'The word NoteA is not the same as Note A';
		const noteIndex = new Map<string, WikiLink[]>([
			['/vault/Current.md', []],
		]);

		const result = findOutgoingUnlinkedMentions('/vault/Current.md', content, allPaths, noteIndex);
		expect(result).toHaveLength(1);
		expect(result[0].noteName).toBe('Note A');
		expect(result[0].count).toBe(1);
	});

	it('returns empty for empty content', () => {
		const noteIndex = new Map<string, WikiLink[]>([
			['/vault/Current.md', []],
		]);

		const result = findOutgoingUnlinkedMentions('/vault/Current.md', '', allPaths, noteIndex);
		expect(result).toHaveLength(0);
	});

	it('returns results sorted alphabetically by note name', () => {
		const content = 'Mentions Note B and Note A in text';
		const noteIndex = new Map<string, WikiLink[]>([
			['/vault/Current.md', []],
		]);

		const result = findOutgoingUnlinkedMentions('/vault/Current.md', content, allPaths, noteIndex);
		expect(result).toHaveLength(2);
		expect(result[0].noteName).toBe('Note A');
		expect(result[1].noteName).toBe('Note B');
	});

	it('does not count mentions inside wikilinks as unlinked', () => {
		const content = 'Some text [[Note A]] but also Note B here';
		const noteIndex = new Map<string, WikiLink[]>([
			['/vault/Current.md', parseWikilinks(content)],
		]);

		const result = findOutgoingUnlinkedMentions('/vault/Current.md', content, allPaths, noteIndex);
		expect(result).toHaveLength(1);
		expect(result[0].noteName).toBe('Note B');
	});

	it('excludes notes already linked via path-prefixed wikilink', () => {
		const allPathsWithFolder = [
			'/vault/Current.md',
			'/vault/folder/Note A.md',
		];
		const content = 'Has [[folder/Note A]] wikilink and also mentions Note A in text';
		const noteIndex = new Map<string, WikiLink[]>([
			['/vault/Current.md', parseWikilinks(content)],
		]);

		const result = findOutgoingUnlinkedMentions('/vault/Current.md', content, allPathsWithFolder, noteIndex);
		const noteAMention = result.find((m) => m.noteName === 'Note A');
		expect(noteAMention).toBeUndefined();
	});

	it('does not find unlinked mentions inside frontmatter', () => {
		const allPathsWithStatus = [
			'/vault/Current.md',
			'/vault/Note A.md',
		];
		const content = '---\nnote-a: some value\n---\nBody without mention.';
		const noteIndex = new Map<string, WikiLink[]>([
			['/vault/Current.md', []],
		]);

		const result = findOutgoingUnlinkedMentions('/vault/Current.md', content, allPathsWithStatus, noteIndex);
		const noteAMention = result.find((m) => m.noteName === 'Note A');
		expect(noteAMention).toBeUndefined();
	});

	it('does not find unlinked mentions inside fenced code blocks', () => {
		const content = '# Title\n```\nNote A is referenced in code\n```\nBody text.';
		const noteIndex = new Map<string, WikiLink[]>([
			['/vault/Current.md', []],
		]);

		const result = findOutgoingUnlinkedMentions('/vault/Current.md', content, allPaths, noteIndex);
		const noteAMention = result.find((m) => m.noteName === 'Note A');
		expect(noteAMention).toBeUndefined();
	});
});
