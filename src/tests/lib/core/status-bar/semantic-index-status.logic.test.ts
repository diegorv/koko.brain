import { describe, it, expect } from 'vitest';
import {
	toVaultRelativePath,
	isMarkdownPath,
	resolveStatusLabel,
	type SemanticFileStatus
} from '$lib/core/status-bar/semantic-index-status.logic';

describe('toVaultRelativePath', () => {
	it('strips the vault prefix and the leading slash', () => {
		expect(toVaultRelativePath('/vault/notes/a.md', '/vault')).toBe('notes/a.md');
	});

	it('returns the bare filename when the file lives at the vault root', () => {
		expect(toVaultRelativePath('/vault/a.md', '/vault')).toBe('a.md');
	});

	it('returns null when the path is outside the vault', () => {
		expect(toVaultRelativePath('/other/notes/a.md', '/vault')).toBeNull();
	});

	it('returns null for virtual tab paths', () => {
		expect(toVaultRelativePath('__virtual__/tasks', '/vault')).toBeNull();
		expect(toVaultRelativePath('__virtual__/graph', '/vault')).toBeNull();
	});

	it('returns null when no vault is open', () => {
		expect(toVaultRelativePath('/vault/a.md', null)).toBeNull();
	});

	it('returns null when the path is null or undefined', () => {
		expect(toVaultRelativePath(null, '/vault')).toBeNull();
		expect(toVaultRelativePath(undefined, '/vault')).toBeNull();
	});

	it('preserves nested directory segments', () => {
		expect(toVaultRelativePath('/v/a/b/c/d.md', '/v')).toBe('a/b/c/d.md');
	});
});

describe('isMarkdownPath', () => {
	it('returns true for .md', () => {
		expect(isMarkdownPath('notes/a.md')).toBe(true);
	});

	it('returns true for .markdown', () => {
		expect(isMarkdownPath('a.markdown')).toBe(true);
	});

	it('returns false for non-markdown extensions', () => {
		expect(isMarkdownPath('a.txt')).toBe(false);
		expect(isMarkdownPath('image.png')).toBe(false);
	});

	it('returns false for null / undefined / empty', () => {
		expect(isMarkdownPath(null)).toBe(false);
		expect(isMarkdownPath(undefined)).toBe(false);
		expect(isMarkdownPath('')).toBe(false);
	});
});

describe('resolveStatusLabel', () => {
	it('returns null when status is null', () => {
		expect(resolveStatusLabel(null)).toBeNull();
	});

	it('returns the model-off label when the embedder is not loaded', () => {
		const status: SemanticFileStatus = { chunkCount: 3, lastEmbeddedAt: 1000, modelLoaded: false };
		expect(resolveStatusLabel(status)).toEqual({ kind: 'model-off', text: 'Semantic off' });
	});

	it('returns the indexed label with plural form when chunkCount > 1', () => {
		const status: SemanticFileStatus = { chunkCount: 4, lastEmbeddedAt: 1000, modelLoaded: true };
		expect(resolveStatusLabel(status)).toEqual({ kind: 'indexed', text: 'Indexed (4 chunks)' });
	});

	it('returns the indexed label with singular form when chunkCount = 1', () => {
		const status: SemanticFileStatus = { chunkCount: 1, lastEmbeddedAt: 1000, modelLoaded: true };
		expect(resolveStatusLabel(status)).toEqual({ kind: 'indexed', text: 'Indexed (1 chunk)' });
	});

	it('returns the not-indexed label when the model is loaded but chunkCount = 0', () => {
		const status: SemanticFileStatus = { chunkCount: 0, lastEmbeddedAt: null, modelLoaded: true };
		expect(resolveStatusLabel(status)).toEqual({ kind: 'not-indexed', text: 'Not indexed' });
	});

	it('prefers the model-off branch over chunk presence', () => {
		const status: SemanticFileStatus = { chunkCount: 99, lastEmbeddedAt: 1, modelLoaded: false };
		expect(resolveStatusLabel(status)?.kind).toBe('model-off');
	});
});
