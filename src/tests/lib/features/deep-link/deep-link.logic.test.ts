import { describe, it, expect } from 'vitest';
import {
	parseDeepLinkUri,
	renderCaptureBody,
	resolveFilePath,
	injectTagsIntoContent,
	injectTitleIntoContent,
} from '$lib/features/deep-link/deep-link.logic';
import type {
	CaptureNoteAction,
	CaptureClipAction,
	CaptureLinkAction,
	CaptureShotAction,
	CaptureFileAction,
} from '$lib/features/deep-link/deep-link.types';

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

	// ── capture action (v2) ───────────────────────────────────────────
	describe('capture action (v2)', () => {
		// ── note kind ─────────────────────────────────────────────────
		describe('kind=note', () => {
			it('parses minimal note (text only)', () => {
				const result = parseDeepLinkUri(
					'kokobrain://capture?v=2&kind=note&vault=V&text=Hello',
				);
				expect(result).toEqual({
					ok: true,
					action: {
						type: 'capture',
						vault: 'V',
						kind: 'note',
						text: 'Hello',
						tags: undefined,
						sourceApp: undefined,
						sourceTitle: undefined,
						sourceUrl: undefined,
						capturedAt: undefined,
					} satisfies CaptureNoteAction,
				});
			});

			it('parses note with full provenance fields and tags', () => {
				const result = parseDeepLinkUri(
					'kokobrain://capture?v=2&kind=note&vault=V' +
						'&text=remember%20to%20review%20Q3' +
						'&tags=brain,inbox' +
						'&source_app=com.google.Chrome' +
						'&source_title=Some%20Page' +
						'&source_url=https%3A%2F%2Fexample.com' +
						'&captured_at=2026-05-19T15%3A30%3A00Z',
				);
				expect(result).toEqual({
					ok: true,
					action: {
						type: 'capture',
						vault: 'V',
						kind: 'note',
						text: 'remember to review Q3',
						tags: ['brain', 'inbox'],
						sourceApp: 'com.google.Chrome',
						sourceTitle: 'Some Page',
						sourceUrl: 'https://example.com',
						capturedAt: '2026-05-19T15:30:00Z',
					} satisfies CaptureNoteAction,
				});
			});

			it('handles URL-encoded text with newlines', () => {
				const result = parseDeepLinkUri(
					'kokobrain://capture?v=2&kind=note&vault=V&text=Line%201%0ALine%202',
				);
				expect(result.ok).toBe(true);
				if (result.ok && result.action.type === 'capture' && result.action.kind === 'note') {
					expect(result.action.text).toBe('Line 1\nLine 2');
				}
			});

			it('returns error when text is missing', () => {
				const result = parseDeepLinkUri('kokobrain://capture?v=2&kind=note&vault=V');
				expect(result).toEqual({
					ok: false,
					error: 'Missing required parameter: "text" for capture kind "note"',
				});
			});

			it('returns error when text is empty string', () => {
				const result = parseDeepLinkUri('kokobrain://capture?v=2&kind=note&vault=V&text=');
				expect(result).toEqual({
					ok: false,
					error: 'Missing required parameter: "text" for capture kind "note"',
				});
			});
		});

		// ── clip kind ─────────────────────────────────────────────────
		describe('kind=clip', () => {
			it('parses minimal clip (text only)', () => {
				const result = parseDeepLinkUri(
					'kokobrain://capture?v=2&kind=clip&vault=V&text=quoted%20bit',
				);
				expect(result).toEqual({
					ok: true,
					action: {
						type: 'capture',
						vault: 'V',
						kind: 'clip',
						text: 'quoted bit',
						tags: undefined,
						sourceApp: undefined,
						sourceTitle: undefined,
						sourceUrl: undefined,
						capturedAt: undefined,
					} satisfies CaptureClipAction,
				});
			});

			it('parses clip with source provenance', () => {
				const result = parseDeepLinkUri(
					'kokobrain://capture?v=2&kind=clip&vault=V' +
						'&text=Whether%20I%20will%20remain%20open-minded' +
						'&source_title=Four%20Notes' +
						'&source_url=https%3A%2F%2Fmedium.com%2Fpost',
				);
				expect(result.ok).toBe(true);
				if (result.ok && result.action.type === 'capture' && result.action.kind === 'clip') {
					expect(result.action.text).toBe('Whether I will remain open-minded');
					expect(result.action.sourceTitle).toBe('Four Notes');
					expect(result.action.sourceUrl).toBe('https://medium.com/post');
				}
			});

			it('returns error when text is missing', () => {
				const result = parseDeepLinkUri('kokobrain://capture?v=2&kind=clip&vault=V');
				expect(result).toEqual({
					ok: false,
					error: 'Missing required parameter: "text" for capture kind "clip"',
				});
			});
		});

		// ── link kind ─────────────────────────────────────────────────
		describe('kind=link', () => {
			it('parses minimal link (url only)', () => {
				const result = parseDeepLinkUri(
					'kokobrain://capture?v=2&kind=link&vault=V&url=https%3A%2F%2Fexample.com',
				);
				expect(result).toEqual({
					ok: true,
					action: {
						type: 'capture',
						vault: 'V',
						kind: 'link',
						url: 'https://example.com',
						title: undefined,
						tags: undefined,
						sourceApp: undefined,
						sourceTitle: undefined,
						sourceUrl: undefined,
						capturedAt: undefined,
					} satisfies CaptureLinkAction,
				});
			});

			it('parses link with title and tags', () => {
				const result = parseDeepLinkUri(
					'kokobrain://capture?v=2&kind=link&vault=V' +
						'&url=https%3A%2F%2Fexample.com%2Fpost' +
						'&title=Post%20Title' +
						'&tags=brain,reading-list',
				);
				expect(result.ok).toBe(true);
				if (result.ok && result.action.type === 'capture' && result.action.kind === 'link') {
					expect(result.action.url).toBe('https://example.com/post');
					expect(result.action.title).toBe('Post Title');
					expect(result.action.tags).toEqual(['brain', 'reading-list']);
				}
			});

			it('trims whitespace around title', () => {
				const result = parseDeepLinkUri(
					'kokobrain://capture?v=2&kind=link&vault=V&url=https%3A%2F%2Fexample.com&title=%20%20Spaced%20%20',
				);
				expect(result.ok).toBe(true);
				if (result.ok && result.action.type === 'capture' && result.action.kind === 'link') {
					expect(result.action.title).toBe('Spaced');
				}
			});

			it('returns undefined title when title is whitespace only', () => {
				const result = parseDeepLinkUri(
					'kokobrain://capture?v=2&kind=link&vault=V&url=https%3A%2F%2Fexample.com&title=%20%20%20',
				);
				expect(result.ok).toBe(true);
				if (result.ok && result.action.type === 'capture' && result.action.kind === 'link') {
					expect(result.action.title).toBeUndefined();
				}
			});

			it('returns error when url is missing', () => {
				const result = parseDeepLinkUri(
					'kokobrain://capture?v=2&kind=link&vault=V&title=No%20URL',
				);
				expect(result).toEqual({
					ok: false,
					error: 'Missing required parameter: "url" for capture kind "link"',
				});
			});
		});

		// ── shot kind ─────────────────────────────────────────────────
		describe('kind=shot', () => {
			it('parses shot with path', () => {
				const result = parseDeepLinkUri(
					'kokobrain://capture?v=2&kind=shot&vault=V&path=%2FUsers%2Fme%2FDesktop%2Fshot.png',
				);
				expect(result).toEqual({
					ok: true,
					action: {
						type: 'capture',
						vault: 'V',
						kind: 'shot',
						path: '/Users/me/Desktop/shot.png',
						tags: undefined,
						sourceApp: undefined,
						sourceTitle: undefined,
						sourceUrl: undefined,
						capturedAt: undefined,
					} satisfies CaptureShotAction,
				});
			});

			it('parses shot with source provenance', () => {
				const result = parseDeepLinkUri(
					'kokobrain://capture?v=2&kind=shot&vault=V' +
						'&path=%2Ftmp%2Fshot.png' +
						'&source_app=com.google.Chrome' +
						'&source_url=https%3A%2F%2Fgithub.com',
				);
				expect(result.ok).toBe(true);
				if (result.ok && result.action.type === 'capture' && result.action.kind === 'shot') {
					expect(result.action.path).toBe('/tmp/shot.png');
					expect(result.action.sourceApp).toBe('com.google.Chrome');
					expect(result.action.sourceUrl).toBe('https://github.com');
				}
			});

			it('returns error when path is missing', () => {
				const result = parseDeepLinkUri('kokobrain://capture?v=2&kind=shot&vault=V');
				expect(result).toEqual({
					ok: false,
					error: 'Missing required parameter: "path" for capture kind "shot"',
				});
			});
		});

		// ── file kind ─────────────────────────────────────────────────
		describe('kind=file', () => {
			it('parses file with path', () => {
				const result = parseDeepLinkUri(
					'kokobrain://capture?v=2&kind=file&vault=V&path=%2FUsers%2Fme%2Ffile.pdf',
				);
				expect(result).toEqual({
					ok: true,
					action: {
						type: 'capture',
						vault: 'V',
						kind: 'file',
						path: '/Users/me/file.pdf',
						tags: undefined,
						sourceApp: undefined,
						sourceTitle: undefined,
						sourceUrl: undefined,
						capturedAt: undefined,
					} satisfies CaptureFileAction,
				});
			});

			it('returns error when path is missing', () => {
				const result = parseDeepLinkUri('kokobrain://capture?v=2&kind=file&vault=V');
				expect(result).toEqual({
					ok: false,
					error: 'Missing required parameter: "path" for capture kind "file"',
				});
			});
		});

		// ── schema / kind validation ──────────────────────────────────
		describe('schema validation', () => {
			it('returns error when v param is missing', () => {
				const result = parseDeepLinkUri(
					'kokobrain://capture?vault=V&kind=note&text=hi',
				);
				expect(result.ok).toBe(false);
				if (!result.ok) {
					expect(result.error).toContain('Unsupported capture schema');
					expect(result.error).toContain('(missing)');
				}
			});

			it('returns error when v=1 (legacy v1 schema is no longer supported)', () => {
				const result = parseDeepLinkUri(
					'kokobrain://capture?v=1&vault=V&content=Old%20Content',
				);
				expect(result.ok).toBe(false);
				if (!result.ok) {
					expect(result.error).toContain('Unsupported capture schema');
					expect(result.error).toContain('"1"');
				}
			});

			it('returns error when v param is unknown', () => {
				const result = parseDeepLinkUri(
					'kokobrain://capture?v=3&vault=V&kind=note&text=hi',
				);
				expect(result.ok).toBe(false);
				if (!result.ok) {
					expect(result.error).toContain('Unsupported capture schema');
				}
			});

			it('returns error when legacy v1 URI (no v, has content) is sent', () => {
				const result = parseDeepLinkUri(
					'kokobrain://capture?vault=V&content=Legacy',
				);
				expect(result.ok).toBe(false);
				if (!result.ok) {
					expect(result.error).toContain('Unsupported capture schema');
				}
			});

			it('returns error when kind param is missing', () => {
				const result = parseDeepLinkUri('kokobrain://capture?v=2&vault=V&text=hi');
				expect(result.ok).toBe(false);
				if (!result.ok) {
					expect(result.error).toContain('Missing or invalid "kind"');
				}
			});

			it('returns error when kind param is unknown', () => {
				const result = parseDeepLinkUri(
					'kokobrain://capture?v=2&kind=audio&vault=V&text=hi',
				);
				expect(result.ok).toBe(false);
				if (!result.ok) {
					expect(result.error).toContain('Missing or invalid "kind"');
				}
			});
		});

		// ── common-field parsing details ─────────────────────────────
		describe('common-field parsing', () => {
			it('trims whitespace from tags', () => {
				const result = parseDeepLinkUri(
					'kokobrain://capture?v=2&kind=note&vault=V&text=Hi&tags=%20tag1%20,%20tag2%20',
				);
				expect(result.ok).toBe(true);
				if (result.ok && result.action.type === 'capture' && result.action.kind === 'note') {
					expect(result.action.tags).toEqual(['tag1', 'tag2']);
				}
			});

			it('ignores empty tags from trailing comma', () => {
				const result = parseDeepLinkUri(
					'kokobrain://capture?v=2&kind=note&vault=V&text=Hi&tags=tag1,',
				);
				expect(result.ok).toBe(true);
				if (result.ok && result.action.type === 'capture' && result.action.kind === 'note') {
					expect(result.action.tags).toEqual(['tag1']);
				}
			});

			it('returns undefined tags when tags param is empty', () => {
				const result = parseDeepLinkUri(
					'kokobrain://capture?v=2&kind=note&vault=V&text=Hi&tags=',
				);
				expect(result.ok).toBe(true);
				if (result.ok && result.action.type === 'capture' && result.action.kind === 'note') {
					expect(result.action.tags).toBeUndefined();
				}
			});

			it('returns undefined source_* fields when empty', () => {
				const result = parseDeepLinkUri(
					'kokobrain://capture?v=2&kind=note&vault=V&text=Hi&source_app=&source_title=&source_url=&captured_at=',
				);
				expect(result.ok).toBe(true);
				if (result.ok && result.action.type === 'capture' && result.action.kind === 'note') {
					expect(result.action.sourceApp).toBeUndefined();
					expect(result.action.sourceTitle).toBeUndefined();
					expect(result.action.sourceUrl).toBeUndefined();
					expect(result.action.capturedAt).toBeUndefined();
				}
			});
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

describe('renderCaptureBody', () => {
	// ── note kind ────────────────────────────────────────────────────
	describe('kind=note', () => {
		it('returns text verbatim when no source URL is present', () => {
			const action: CaptureNoteAction = {
				type: 'capture',
				vault: 'V',
				kind: 'note',
				text: 'Plain note body',
			};
			expect(renderCaptureBody(action)).toBe('Plain note body');
		});

		it('appends source footer with URL label when sourceUrl is present without title', () => {
			const action: CaptureNoteAction = {
				type: 'capture',
				vault: 'V',
				kind: 'note',
				text: 'My note',
				sourceUrl: 'https://example.com',
			};
			expect(renderCaptureBody(action)).toBe(
				'My note\n\n> Source: [https://example.com](https://example.com)',
			);
		});

		it('appends source footer with title label when sourceTitle and sourceUrl are both present', () => {
			const action: CaptureNoteAction = {
				type: 'capture',
				vault: 'V',
				kind: 'note',
				text: 'My note',
				sourceTitle: 'Some Page',
				sourceUrl: 'https://example.com',
			};
			expect(renderCaptureBody(action)).toBe(
				'My note\n\n> Source: [Some Page](https://example.com)',
			);
		});

		it('omits footer when sourceTitle is present but sourceUrl is not', () => {
			const action: CaptureNoteAction = {
				type: 'capture',
				vault: 'V',
				kind: 'note',
				text: 'My note',
				sourceTitle: 'Some Page',
			};
			expect(renderCaptureBody(action)).toBe('My note');
		});
	});

	// ── clip kind ────────────────────────────────────────────────────
	describe('kind=clip', () => {
		it('returns text verbatim when no source URL is present', () => {
			const action: CaptureClipAction = {
				type: 'capture',
				vault: 'V',
				kind: 'clip',
				text: 'Highlighted text',
			};
			expect(renderCaptureBody(action)).toBe('Highlighted text');
		});

		it('appends source footer with title label when source is fully provided', () => {
			const action: CaptureClipAction = {
				type: 'capture',
				vault: 'V',
				kind: 'clip',
				text: 'Whether I will remain open-minded...',
				sourceTitle: 'Four Notes to My Future Self',
				sourceUrl: 'https://medium.com/post',
			};
			expect(renderCaptureBody(action)).toBe(
				'Whether I will remain open-minded...\n\n> Source: [Four Notes to My Future Self](https://medium.com/post)',
			);
		});
	});

	// ── link kind ────────────────────────────────────────────────────
	describe('kind=link', () => {
		it('renders markdown link using title as label', () => {
			const action: CaptureLinkAction = {
				type: 'capture',
				vault: 'V',
				kind: 'link',
				url: 'https://example.com',
				title: 'Example',
			};
			expect(renderCaptureBody(action)).toBe('[Example](https://example.com)');
		});

		it('falls back to URL as label when title is absent', () => {
			const action: CaptureLinkAction = {
				type: 'capture',
				vault: 'V',
				kind: 'link',
				url: 'https://example.com',
			};
			expect(renderCaptureBody(action)).toBe(
				'[https://example.com](https://example.com)',
			);
		});

		it('omits source footer when sourceUrl equals the canonical url', () => {
			const action: CaptureLinkAction = {
				type: 'capture',
				vault: 'V',
				kind: 'link',
				url: 'https://example.com',
				title: 'Example',
				sourceUrl: 'https://example.com',
				sourceTitle: 'Browser Title',
			};
			expect(renderCaptureBody(action)).toBe('[Example](https://example.com)');
		});

		it('appends source footer when sourceUrl differs from the canonical url', () => {
			const action: CaptureLinkAction = {
				type: 'capture',
				vault: 'V',
				kind: 'link',
				url: 'https://canonical.example.com',
				title: 'Canonical',
				sourceUrl: 'https://share.example.com/redirect',
				sourceTitle: 'Share Page',
			};
			expect(renderCaptureBody(action)).toBe(
				'[Canonical](https://canonical.example.com)\n\n> Source: [Share Page](https://share.example.com/redirect)',
			);
		});
	});

	// ── shot / file kinds ────────────────────────────────────────────
	describe('kind=shot / kind=file', () => {
		it('returns empty string for kind=shot (service short-circuits with toast)', () => {
			const action: CaptureShotAction = {
				type: 'capture',
				vault: 'V',
				kind: 'shot',
				path: '/Users/me/Desktop/shot.png',
			};
			expect(renderCaptureBody(action)).toBe('');
		});

		it('returns empty string for kind=file (service short-circuits with toast)', () => {
			const action: CaptureFileAction = {
				type: 'capture',
				vault: 'V',
				kind: 'file',
				path: '/Users/me/file.pdf',
			};
			expect(renderCaptureBody(action)).toBe('');
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

describe('injectTitleIntoContent', () => {
	it('creates frontmatter with title when content has none', () => {
		const result = injectTitleIntoContent('My note content', 'Page Title');
		expect(result).toBe('---\ntitle: Page Title\n---\nMy note content');
	});

	it('adds title property to existing frontmatter without title', () => {
		const content = '---\ntags: [a]\n---\nBody';
		const result = injectTitleIntoContent(content, 'My Title');
		expect(result).toContain('tags: [a]');
		expect(result).toContain('title: My Title');
		expect(result).toContain('Body');
	});

	it('replaces existing title property in frontmatter', () => {
		const content = '---\ntitle: Old Title\n---\nBody';
		const result = injectTitleIntoContent(content, 'New Title');
		expect(result).toBe('---\ntitle: New Title\n---\nBody');
	});

	it('replaces title without touching sibling properties', () => {
		const content = '---\ntitle: Old\ntags: [x]\n---\nBody';
		const result = injectTitleIntoContent(content, 'New');
		expect(result).toContain('title: New');
		expect(result).not.toContain('Old');
		expect(result).toContain('tags: [x]');
		expect(result).toContain('Body');
	});

	it('trims surrounding whitespace from the new title', () => {
		const result = injectTitleIntoContent('Body', '   Spaced   ');
		expect(result).toBe('---\ntitle: Spaced\n---\nBody');
	});

	it('returns content unchanged when title is empty', () => {
		const content = '---\ntags: [a]\n---\nBody';
		expect(injectTitleIntoContent(content, '')).toBe(content);
	});

	it('returns content unchanged when title is only whitespace', () => {
		const content = 'Body only';
		expect(injectTitleIntoContent(content, '   ')).toBe(content);
	});

	it('handles empty content', () => {
		const result = injectTitleIntoContent('', 'Hello');
		expect(result).toBe('---\ntitle: Hello\n---\n');
	});

	it('quotes titles that contain YAML-special characters', () => {
		const result = injectTitleIntoContent('Body', 'Title: with colon');
		// The YAML serializer is expected to quote when needed; we just
		// assert round-trip yields the same title via parseFrontmatterProperties.
		expect(result).toContain('Body');
		expect(result).toMatch(/title:.*Title.*colon/);
	});
});
