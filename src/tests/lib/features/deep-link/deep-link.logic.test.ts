import { describe, it, expect } from 'vitest';
import { parseDeepLinkUri, resolveFilePath, injectTagsIntoContent } from '$lib/features/deep-link/deep-link.logic';

describe('parseDeepLinkUri', () => {
	// ── open action ────────────────────────────────────────────────────

	describe('open action', () => {
		it('parses open with vault and file', () => {
			const result = parseDeepLinkUri('kokobrain://open?vault=MyVault&file=notes/hello.md');
			expect(result).toEqual({
				ok: true,
				action: { type: 'open', vault: 'MyVault', file: 'notes/hello.md', path: undefined },
			});
		});

		it('parses open with vault only', () => {
			const result = parseDeepLinkUri('kokobrain://open?vault=MyVault');
			expect(result).toEqual({
				ok: true,
				action: { type: 'open', vault: 'MyVault', file: undefined, path: undefined },
			});
		});

		it('parses open with vault and path (alias for file)', () => {
			const result = parseDeepLinkUri('kokobrain://open?vault=MyVault&path=docs/readme.md');
			expect(result).toEqual({
				ok: true,
				action: { type: 'open', vault: 'MyVault', file: undefined, path: 'docs/readme.md' },
			});
		});

		it('parses open with URL-encoded file path', () => {
			const result = parseDeepLinkUri('kokobrain://open?vault=My%20Vault&file=notes%2Fhello%20world.md');
			expect(result).toEqual({
				ok: true,
				action: { type: 'open', vault: 'My Vault', file: 'notes/hello world.md', path: undefined },
			});
		});
	});

	// ── new action ─────────────────────────────────────────────────────

	describe('new action', () => {
		it('parses new with all parameters', () => {
			const result = parseDeepLinkUri(
				'kokobrain://new?vault=MyVault&name=test.md&content=Hello%20World&silent=true&append=true',
			);
			expect(result).toEqual({
				ok: true,
				action: {
					type: 'new',
					vault: 'MyVault',
					name: 'test.md',
					file: undefined,
					content: 'Hello World',
					silent: true,
					append: true,
					prepend: undefined,
					overwrite: undefined,
					clipboard: undefined,
				},
			});
		});

		it('parses new with required params only', () => {
			const result = parseDeepLinkUri('kokobrain://new?vault=MyVault&name=test.md');
			expect(result).toEqual({
				ok: true,
				action: {
					type: 'new',
					vault: 'MyVault',
					name: 'test.md',
					file: undefined,
					content: undefined,
					silent: undefined,
					append: undefined,
					prepend: undefined,
					overwrite: undefined,
					clipboard: undefined,
				},
			});
		});

		it('parses new with file param instead of name (Clipper compat)', () => {
			const result = parseDeepLinkUri(
				'kokobrain://new?vault=V&file=Clippings%2FArticle%20Title',
			);
			expect(result).toEqual({
				ok: true,
				action: {
					type: 'new',
					vault: 'V',
					name: undefined,
					file: 'Clippings/Article Title',
					content: undefined,
					silent: undefined,
					append: undefined,
					prepend: undefined,
					overwrite: undefined,
					clipboard: undefined,
				},
			});
		});

		it('parses new with both name and file (name takes precedence in service)', () => {
			const result = parseDeepLinkUri('kokobrain://new?vault=V&name=note.md&file=folder/note');
			expect(result.ok).toBe(true);
			if (result.ok && result.action.type === 'new') {
				expect(result.action.name).toBe('note.md');
				expect(result.action.file).toBe('folder/note');
			}
		});

		it('parses new with clipboard=true', () => {
			const result = parseDeepLinkUri('kokobrain://new?vault=V&name=n.md&clipboard');
			expect(result.ok).toBe(true);
			if (result.ok && result.action.type === 'new') {
				expect(result.action.clipboard).toBe(true);
			}
		});

		it('parses new with prepend=true', () => {
			const result = parseDeepLinkUri('kokobrain://new?vault=V&name=n.md&prepend=true');
			expect(result.ok).toBe(true);
			if (result.ok && result.action.type === 'new') {
				expect(result.action.prepend).toBe(true);
			}
		});

		it('parses new with overwrite=true', () => {
			const result = parseDeepLinkUri('kokobrain://new?vault=V&name=n.md&overwrite=true');
			expect(result.ok).toBe(true);
			if (result.ok && result.action.type === 'new') {
				expect(result.action.overwrite).toBe(true);
			}
		});

		it('parses boolean param "1" as true', () => {
			const result = parseDeepLinkUri('kokobrain://new?vault=V&name=n.md&silent=1');
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.action.type).toBe('new');
				if (result.action.type === 'new') {
					expect(result.action.silent).toBe(true);
				}
			}
		});

		it('parses boolean param presence without value as true', () => {
			const result = parseDeepLinkUri('kokobrain://new?vault=V&name=n.md&silent');
			expect(result.ok).toBe(true);
			if (result.ok && result.action.type === 'new') {
				expect(result.action.silent).toBe(true);
			}
		});

		it('returns error when neither name nor file is present', () => {
			const result = parseDeepLinkUri('kokobrain://new?vault=MyVault');
			expect(result).toEqual({
				ok: false,
				error: 'Missing required parameter: "name" or "file" for action "new"',
			});
		});
	});

	// ── search action ──────────────────────────────────────────────────

	describe('search action', () => {
		it('parses search with vault and query', () => {
			const result = parseDeepLinkUri('kokobrain://search?vault=MyVault&query=hello%20world');
			expect(result).toEqual({
				ok: true,
				action: { type: 'search', vault: 'MyVault', query: 'hello world' },
			});
		});

		it('returns error when query is missing', () => {
			const result = parseDeepLinkUri('kokobrain://search?vault=MyVault');
			expect(result).toEqual({
				ok: false,
				error: 'Missing required parameter: "query" for action "search"',
			});
		});
	});

	// ── daily action ───────────────────────────────────────────────────

	describe('daily action', () => {
		it('parses daily with vault only', () => {
			const result = parseDeepLinkUri('kokobrain://daily?vault=MyVault');
			expect(result).toEqual({
				ok: true,
				action: {
					type: 'daily',
					vault: 'MyVault',
					content: undefined,
					append: undefined,
					prepend: undefined,
					clipboard: undefined,
				},
			});
		});

		it('parses daily with content and append (Clipper compat)', () => {
			const result = parseDeepLinkUri('kokobrain://daily?vault=V&content=Clipped%20text&append=true');
			expect(result.ok).toBe(true);
			if (result.ok && result.action.type === 'daily') {
				expect(result.action.content).toBe('Clipped text');
				expect(result.action.append).toBe(true);
			}
		});

		it('parses daily with prepend and clipboard', () => {
			const result = parseDeepLinkUri('kokobrain://daily?vault=V&prepend=true&clipboard');
			expect(result.ok).toBe(true);
			if (result.ok && result.action.type === 'daily') {
				expect(result.action.prepend).toBe(true);
				expect(result.action.clipboard).toBe(true);
			}
		});
	});

	// ── capture action ────────────────────────────────────────────────
	describe('capture action', () => {
		it('parses capture with vault and content', () => {
			const result = parseDeepLinkUri('kokobrain://capture?vault=MyVault&content=Hello%20World');
			expect(result).toEqual({
				ok: true,
				action: { type: 'capture', vault: 'MyVault', content: 'Hello World', tags: undefined },
			});
		});

		it('returns error when content is missing', () => {
			const result = parseDeepLinkUri('kokobrain://capture?vault=MyVault');
			expect(result).toEqual({
				ok: false,
				error: 'Missing required parameter: "content" for action "capture"',
			});
		});

		it('handles URL-encoded content with newlines', () => {
			const result = parseDeepLinkUri('kokobrain://capture?vault=V&content=Line%201%0ALine%202');
			expect(result.ok).toBe(true);
			if (result.ok && result.action.type === 'capture') {
				expect(result.action.content).toBe('Line 1\nLine 2');
			}
		});

		it('parses capture with single tag', () => {
			const result = parseDeepLinkUri('kokobrain://capture?vault=V&content=Hello&tags=source/raycast');
			expect(result).toEqual({
				ok: true,
				action: { type: 'capture', vault: 'V', content: 'Hello', tags: ['source/raycast'] },
			});
		});

		it('parses capture with multiple comma-separated tags', () => {
			const result = parseDeepLinkUri('kokobrain://capture?vault=V&content=Hello&tags=source/raycast,project/work');
			expect(result).toEqual({
				ok: true,
				action: { type: 'capture', vault: 'V', content: 'Hello', tags: ['source/raycast', 'project/work'] },
			});
		});

		it('trims whitespace from tags', () => {
			const result = parseDeepLinkUri('kokobrain://capture?vault=V&content=Hello&tags=%20tag1%20,%20tag2%20');
			expect(result.ok).toBe(true);
			if (result.ok && result.action.type === 'capture') {
				expect(result.action.tags).toEqual(['tag1', 'tag2']);
			}
		});

		it('ignores empty tags from trailing comma', () => {
			const result = parseDeepLinkUri('kokobrain://capture?vault=V&content=Hello&tags=tag1,');
			expect(result.ok).toBe(true);
			if (result.ok && result.action.type === 'capture') {
				expect(result.action.tags).toEqual(['tag1']);
			}
		});

		it('returns undefined tags when tags param is empty string', () => {
			const result = parseDeepLinkUri('kokobrain://capture?vault=V&content=Hello&tags=');
			expect(result.ok).toBe(true);
			if (result.ok && result.action.type === 'capture') {
				expect(result.action.tags).toBeUndefined();
			}
		});

		it('returns undefined tags when tags param is absent', () => {
			const result = parseDeepLinkUri('kokobrain://capture?vault=V&content=Hello');
			expect(result.ok).toBe(true);
			if (result.ok && result.action.type === 'capture') {
				expect(result.action.tags).toBeUndefined();
			}
		});
	});

	// ── error cases ────────────────────────────────────────────────────

	describe('error cases', () => {
		it('returns error for invalid URI', () => {
			const result = parseDeepLinkUri('not a url');
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error).toContain('Invalid URI');
			}
		});

		it('returns error for empty string', () => {
			const result = parseDeepLinkUri('');
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error).toContain('Invalid URI');
			}
		});

		it('returns error for wrong protocol', () => {
			const result = parseDeepLinkUri('https://open?vault=MyVault');
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error).toContain('Invalid protocol');
			}
		});

		it('returns error for unknown action', () => {
			const result = parseDeepLinkUri('kokobrain://unknown?vault=MyVault');
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error).toContain('Unknown action');
			}
		});

		it('returns error when vault is missing', () => {
			const result = parseDeepLinkUri('kokobrain://open');
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error).toContain('Missing required parameter: "vault"');
			}
		});
	});
});

describe('resolveFilePath', () => {
	it('joins vault path and relative file path', () => {
		expect(resolveFilePath('/Users/me/vault', 'notes/hello.md')).toBe(
			'/Users/me/vault/notes/hello.md',
		);
	});

	it('adds .md extension when no extension present', () => {
		expect(resolveFilePath('/vault', 'notes/hello')).toBe('/vault/notes/hello.md');
	});

	it('preserves existing extension', () => {
		expect(resolveFilePath('/vault', 'notes/hello.md')).toBe('/vault/notes/hello.md');
	});

	it('preserves non-md extensions', () => {
		expect(resolveFilePath('/vault', 'notes/data.canvas')).toBe('/vault/notes/data.canvas');
	});

	it('handles trailing slash on vault path', () => {
		expect(resolveFilePath('/vault/', 'notes/hello')).toBe('/vault/notes/hello.md');
	});

	it('handles leading slash on file path', () => {
		expect(resolveFilePath('/vault', '/notes/hello')).toBe('/vault/notes/hello.md');
	});

	it('handles both trailing and leading slashes', () => {
		expect(resolveFilePath('/vault/', '/notes/hello.md')).toBe('/vault/notes/hello.md');
	});

	it('handles file in vault root', () => {
		expect(resolveFilePath('/vault', 'hello')).toBe('/vault/hello.md');
	});

	it('handles file with dot in directory name', () => {
		expect(resolveFilePath('/vault', 'notes.archive/hello')).toBe(
			'/vault/notes.archive/hello.md',
		);
	});

	it('throws on path traversal with ..', () => {
		expect(() => resolveFilePath('/vault', '../../../etc/passwd')).toThrow(
			'Path traversal detected',
		);
	});

	it('throws on path traversal with nested ..', () => {
		expect(() => resolveFilePath('/vault', 'notes/../../..')).toThrow(
			'Path traversal detected',
		);
	});

	it('throws on path traversal that escapes by one level', () => {
		expect(() => resolveFilePath('/vault', '../secret.md')).toThrow(
			'Path traversal detected',
		);
	});

	it('allows .. that stays within vault', () => {
		expect(resolveFilePath('/vault', 'notes/../hello')).toBe('/vault/hello.md');
	});

	it('allows .. in subdirectory that stays within vault', () => {
		expect(resolveFilePath('/vault', 'a/b/../c/note.md')).toBe('/vault/a/c/note.md');
	});
});

describe('injectTagsIntoContent', () => {
	it('creates frontmatter with tags when content has none', () => {
		const result = injectTagsIntoContent('My note content', ['source/raycast']);
		expect(result).toBe('---\ntags: [source/raycast]\n---\nMy note content');
	});

	it('creates frontmatter with multiple tags', () => {
		const result = injectTagsIntoContent('Body', ['source/raycast', 'project/work']);
		expect(result).toBe('---\ntags: [source/raycast, project/work]\n---\nBody');
	});

	it('adds tags property to existing frontmatter without tags', () => {
		const content = '---\ntitle: Hello\n---\nBody';
		const result = injectTagsIntoContent(content, ['source/raycast']);
		expect(result).toContain('title: Hello');
		expect(result).toContain('tags: [source/raycast]');
		expect(result).toContain('Body');
	});

	it('merges tags with existing tags list in frontmatter', () => {
		const content = '---\ntags: [existing]\n---\nBody';
		const result = injectTagsIntoContent(content, ['new-tag']);
		expect(result).toBe('---\ntags: [existing, new-tag]\n---\nBody');
	});

	it('deduplicates tags during merge', () => {
		const content = '---\ntags: [source/raycast, existing]\n---\nBody';
		const result = injectTagsIntoContent(content, ['source/raycast', 'new']);
		expect(result).toBe('---\ntags: [source/raycast, existing, new]\n---\nBody');
	});

	it('returns content unchanged when tags array is empty', () => {
		const content = 'My content';
		expect(injectTagsIntoContent(content, [])).toBe('My content');
	});

	it('returns content with frontmatter unchanged when tags array is empty', () => {
		const content = '---\ntitle: Hello\n---\nBody';
		expect(injectTagsIntoContent(content, [])).toBe(content);
	});

	it('handles empty content', () => {
		const result = injectTagsIntoContent('', ['tag1']);
		expect(result).toBe('---\ntags: [tag1]\n---\n');
	});

	it('handles tags property that is a single string value (not a list)', () => {
		const content = '---\ntags: single-tag\n---\nBody';
		const result = injectTagsIntoContent(content, ['new-tag']);
		expect(result).toContain('tags: [new-tag]');
		expect(result).toContain('Body');
	});

	it('merges with block-style YAML tag arrays', () => {
		const content = '---\ntags:\n  - type/capture-notes\n---\nBody';
		const result = injectTagsIntoContent(content, ['source/raycast']);
		expect(result).toContain('type/capture-notes');
		expect(result).toContain('source/raycast');
		expect(result).toContain('Body');
	});
});
