import { describe, it, expect } from 'vitest';
import {
	getNoteName,
	isLinkTargetFile,
	resolveWikilink,
	buildResolutionCache,
	resolveWikilinkCached,
	parseWikilinks,
} from '#lib/core/filesystem/wikilink-resolution.logic.js';

describe('getNoteName', () => {
	it('extracts name from a simple path', () => {
		expect(getNoteName('/vault/My Note.md')).toBe('My Note');
	});

	it('extracts name from a nested path', () => {
		expect(getNoteName('/vault/folder/subfolder/Note.md')).toBe('Note');
	});

	it('handles files without extension', () => {
		expect(getNoteName('/vault/README')).toBe('README');
	});

	it('handles .markdown extension', () => {
		expect(getNoteName('/vault/Note.markdown')).toBe('Note');
	});
});

describe('resolveWikilink', () => {
	const allPaths = [
		'/vault/Note A.md',
		'/vault/folder/Note B.md',
		'/vault/Daily/2024-01-01.md',
	];

	it('resolves an exact match', () => {
		expect(resolveWikilink('Note A', allPaths)).toBe('/vault/Note A.md');
	});

	it('resolves case-insensitively', () => {
		expect(resolveWikilink('note a', allPaths)).toBe('/vault/Note A.md');
	});

	it('resolves a nested file', () => {
		expect(resolveWikilink('Note B', allPaths)).toBe('/vault/folder/Note B.md');
	});

	it('returns null for no match', () => {
		expect(resolveWikilink('Nonexistent', allPaths)).toBeNull();
	});

	it('returns null for empty target', () => {
		expect(resolveWikilink('', allPaths)).toBeNull();
	});

	it('resolves full-path wikilink targets', () => {
		expect(resolveWikilink('folder/Note B', allPaths)).toBe('/vault/folder/Note B.md');
		expect(resolveWikilink('Daily/2024-01-01', allPaths)).toBe('/vault/Daily/2024-01-01.md');
	});

	it('resolves deeply nested path targets by basename', () => {
		const paths = ['/vault/a/b/c/Deep.md'];
		expect(resolveWikilink('a/b/c/Deep', paths)).toBe('/vault/a/b/c/Deep.md');
	});
});

describe('buildResolutionCache', () => {
	it('builds a map from lowercase note name to file path', () => {
		const cache = buildResolutionCache(['/vault/Note A.md', '/vault/folder/Note B.md']);
		expect(cache.get('note a')).toBe('/vault/Note A.md');
		expect(cache.get('note b')).toBe('/vault/folder/Note B.md');
	});

	it('keeps the first path on name collisions', () => {
		const cache = buildResolutionCache(['/vault/a/Note.md', '/vault/b/Note.md']);
		expect(cache.get('note')).toBe('/vault/a/Note.md');
	});

	it('returns an empty map for empty input', () => {
		const cache = buildResolutionCache([]);
		expect(cache.size).toBe(0);
	});
});

describe('resolveWikilinkCached', () => {
	const allPaths = [
		'/vault/Note A.md',
		'/vault/folder/Note B.md',
		'/vault/Daily/2024-01-01.md',
	];
	const cache = buildResolutionCache(allPaths);

	it('resolves an exact match', () => {
		expect(resolveWikilinkCached('Note A', cache)).toBe('/vault/Note A.md');
	});

	it('resolves case-insensitively', () => {
		expect(resolveWikilinkCached('note a', cache)).toBe('/vault/Note A.md');
	});

	it('resolves a nested file', () => {
		expect(resolveWikilinkCached('Note B', cache)).toBe('/vault/folder/Note B.md');
	});

	it('returns null for no match', () => {
		expect(resolveWikilinkCached('Nonexistent', cache)).toBeNull();
	});

	it('returns null for empty target', () => {
		expect(resolveWikilinkCached('', cache)).toBeNull();
	});

	it('resolves full-path wikilink targets by basename', () => {
		expect(resolveWikilinkCached('folder/Note B', cache)).toBe('/vault/folder/Note B.md');
		expect(resolveWikilinkCached('Daily/2024-01-01', cache)).toBe('/vault/Daily/2024-01-01.md');
	});
});

describe('a target with an extension', () => {
	const paths = ['/vault/a/foo.md', '/vault/b/foo.png', '/vault/Notes/v1.2.md'];
	const cache = buildResolutionCache(paths);
	const resolvers = [
		['resolveWikilink', (t: string, p: string[], root = '/vault') => resolveWikilink(t, p, root)],
		[
			'resolveWikilinkCached',
			(t: string, p: string[], root = '/vault') => resolveWikilinkCached(t, p === paths ? cache : buildResolutionCache(p), root),
		],
	] as const;

	for (const [name, resolve] of resolvers) {
		describe(name, () => {
			it('resolves to the file it names, not to an earlier note with the same stem', () => {
				expect(resolve('foo.png', paths)).toBe('/vault/b/foo.png');
				expect(resolve('FOO.PNG', paths)).toBe('/vault/b/foo.png');
			});

			it('resolves a path-style target to the file at that path', () => {
				expect(resolve('b/foo.png', paths)).toBe('/vault/b/foo.png');
				expect(resolve('a/foo.md', ['/vault/z/foo.md', '/vault/a/foo.md'])).toBe('/vault/a/foo.md');
			});

			it('keeps resolving a bare name to the note', () => {
				expect(resolve('foo', paths)).toBe('/vault/a/foo.md');
			});

			it('falls back to the stem rule when no file has that exact name', () => {
				expect(resolve('foo.png', ['/vault/a/foo.md'])).toBe('/vault/a/foo.md');
				expect(resolve('v1.2', paths)).toBe('/vault/Notes/v1.2.md');
				expect(resolve('c/foo.png', paths)).toBe('/vault/a/foo.md');
			});

			it('does not match a file whose name only ends with the target', () => {
				expect(resolve('o.png', ['/vault/foo.png'])).toBeNull();
			});

			it('prefers an exact sibling file over a dotted note name', () => {
				expect(resolve('config.json', ['/vault/config.json.md', '/vault/config.json'])).toBe('/vault/config.json');
				expect(resolve('config.json', ['/vault/config.json.md'])).toBe('/vault/config.json.md');
			});

			it('resolves a path-style target to its exact vault-relative path before a path suffix', () => {
				expect(resolve('b/foo.png', ['/vault/x/b/foo.png', '/vault/b/foo.png'])).toBe('/vault/b/foo.png');
				expect(resolve('B/Foo.PNG', ['/vault/x/b/foo.png', '/vault/b/foo.png'])).toBe('/vault/b/foo.png');
			});

			it('prefers the vault-relative file over a root-level one when the vault folder shares the first segment', () => {
				expect(resolve('b/foo.png', ['/b/foo.png', '/b/b/foo.png'], '/b')).toBe('/b/b/foo.png');
			});

			// No file at the vault-relative path: the first file in tree order whose
			// path ends in `/b/foo.png` wins, so links that resolved before still do.
			it('falls back to the path suffix when the vault-relative path has no file', () => {
				expect(resolve('b/foo.png', ['/vault/x/b/foo.png', '/vault/y/b/foo.png'])).toBe('/vault/x/b/foo.png');
				expect(resolve('b/foo.png', ['/vault/x/b/foo.png'], '/other')).toBe('/vault/x/b/foo.png');
			});
		});
	}
});

describe('isLinkTargetFile', () => {
	it('is false for a .view in any casing and true for every other file', () => {
		expect(isLinkTargetFile('/vault/Views/Projects.view')).toBe(false);
		expect(isLinkTargetFile('/vault/Views/Projects.VIEW')).toBe(false);
		expect(isLinkTargetFile('/vault/Projects.md')).toBe(true);
		expect(isLinkTargetFile('/vault/Projects.collection')).toBe(true);
		expect(isLinkTargetFile('/vault/img.png')).toBe(true);
		expect(isLinkTargetFile('/vault/Projects.view.md')).toBe(true);
	});
});

describe('a view is never a link target', () => {
	const VIEW = '/vault/Views/Projects.view';
	const NOTE = '/vault/Notes/Projects.md';
	const resolvers = [
		['resolveWikilink', (t: string, p: string[]) => resolveWikilink(t, p, '/vault')],
		['resolveWikilinkCached', (t: string, p: string[]) => resolveWikilinkCached(t, buildResolutionCache(p), '/vault')],
	] as const;

	for (const [name, resolve] of resolvers) {
		describe(name, () => {
			it('resolves nothing when only a view has the name', () => {
				expect(resolve('Projects', [VIEW])).toBeNull();
				expect(resolve('Views/Projects', [VIEW])).toBeNull();
			});

			it('resolves the note when a view with the same name comes first', () => {
				expect(resolve('Projects', [VIEW, NOTE])).toBe(NOTE);
				expect(resolve('projects', [NOTE, VIEW])).toBe(NOTE);
			});

			it('never resolves a target naming the view file, falling back to the note by basename', () => {
				expect(resolve('Projects.view', [VIEW])).toBeNull();
				expect(resolve('Views/Projects.view', [VIEW])).toBeNull();
				expect(resolve('Projects.view', [VIEW, NOTE])).toBe(NOTE);
			});

			it('treats an uppercase .VIEW the same way', () => {
				const upper = '/vault/Views/Projects.VIEW';
				expect(resolve('Projects', [upper])).toBeNull();
				expect(resolve('Projects.VIEW', [upper])).toBeNull();
				expect(resolve('Projects', [upper, NOTE])).toBe(NOTE);
			});
		});
	}

	it('buildResolutionCache holds no view in either map', () => {
		const cache = buildResolutionCache([VIEW, NOTE]);
		expect([...cache.values()]).toEqual([NOTE]);
		expect([...cache.byFileName.keys()]).toEqual(['projects.md']);
	});
});

describe('parseWikilinks', () => {
	it('parses a basic wikilink', () => {
		const result = parseWikilinks('See [[My Note]] for details');
		expect(result).toHaveLength(1);
		expect(result[0].target).toBe('My Note');
		expect(result[0].alias).toBeNull();
		expect(result[0].heading).toBeNull();
		expect(result[0].position).toBe(4);
	});

	it('parses a wikilink with alias', () => {
		const result = parseWikilinks('Check [[My Note|display text]]');
		expect(result).toHaveLength(1);
		expect(result[0].target).toBe('My Note');
		expect(result[0].alias).toBe('display text');
		expect(result[0].heading).toBeNull();
	});

	it('parses a wikilink with heading', () => {
		const result = parseWikilinks('Go to [[My Note#Section One]]');
		expect(result).toHaveLength(1);
		expect(result[0].target).toBe('My Note');
		expect(result[0].heading).toBe('Section One');
		expect(result[0].alias).toBeNull();
	});

	it('parses a wikilink with heading and alias', () => {
		const result = parseWikilinks('See [[My Note#Section|click here]]');
		expect(result).toHaveLength(1);
		expect(result[0].target).toBe('My Note');
		expect(result[0].heading).toBe('Section');
		expect(result[0].alias).toBe('click here');
	});

	it('parses multiple wikilinks', () => {
		const result = parseWikilinks('Link to [[Note A]] and [[Note B]] and [[Note C]]');
		expect(result).toHaveLength(3);
		expect(result[0].target).toBe('Note A');
		expect(result[1].target).toBe('Note B');
		expect(result[2].target).toBe('Note C');
	});

	it('returns empty array for no wikilinks', () => {
		const result = parseWikilinks('Just plain text with no links');
		expect(result).toHaveLength(0);
	});

	it('handles empty content', () => {
		const result = parseWikilinks('');
		expect(result).toHaveLength(0);
	});

	it('trims whitespace from target', () => {
		const result = parseWikilinks('See [[ My Note ]]');
		expect(result[0].target).toBe('My Note');
	});

	it('trims target but preserves alias whitespace around the pipe', () => {
		const result = parseWikilinks('See [[note | alias ]]');
		expect(result).toHaveLength(1);
		expect(result[0].target).toBe('note');
		// Alias is the raw substring after the pipe — whitespace is preserved
		// for consumers to trim as needed.
		expect(result[0].alias).toBe(' alias ');
		expect(result[0].heading).toBeNull();
	});

	it('trims target but preserves heading whitespace after the hash', () => {
		const result = parseWikilinks('See [[note# heading ]]');
		expect(result).toHaveLength(1);
		expect(result[0].target).toBe('note');
		// Heading is the raw substring after the hash — whitespace preserved.
		expect(result[0].heading).toBe(' heading ');
		expect(result[0].alias).toBeNull();
	});

	it('handles spaces around both hash and pipe in the same link', () => {
		const result = parseWikilinks('[[ note # heading | alias ]]');
		expect(result).toHaveLength(1);
		expect(result[0].target).toBe('note');
		expect(result[0].heading).toBe(' heading ');
		expect(result[0].alias).toBe(' alias ');
	});
});
