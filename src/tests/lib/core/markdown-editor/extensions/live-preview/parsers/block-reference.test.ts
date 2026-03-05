import { describe, it, expect } from 'vitest';
import { findBlockReference } from '$lib/core/markdown-editor/extensions/live-preview/parsers/block-reference';

describe('findBlockReference', () => {
	it('detects block reference at end of line', () => {
		const result = findBlockReference('Some text ^my-block', 0);
		expect(result).not.toBeNull();
		expect(result!.id).toBe('my-block');
		expect(result!.from).toBe(9); // space before ^
		expect(result!.to).toBe(19);
	});

	it('returns null for text without block reference', () => {
		expect(findBlockReference('plain text', 0)).toBeNull();
	});

	it('returns null for ^ not at end of line', () => {
		expect(findBlockReference('^start of line', 0)).toBeNull();
	});

	it('returns null for ^ in middle of line without leading space', () => {
		expect(findBlockReference('text^middle', 0)).toBeNull();
	});

	it('applies offset correctly', () => {
		const result = findBlockReference('text ^ref1', 100);
		expect(result).not.toBeNull();
		expect(result!.from).toBe(104);
		expect(result!.to).toBe(110);
	});

	it('detects block reference with underscores', () => {
		const result = findBlockReference('text ^my_block_id', 0);
		expect(result).not.toBeNull();
		expect(result!.id).toBe('my_block_id');
	});

	it('detects block reference with hyphens', () => {
		const result = findBlockReference('text ^my-block-id', 0);
		expect(result).not.toBeNull();
		expect(result!.id).toBe('my-block-id');
	});

	it('detects block reference with numbers', () => {
		const result = findBlockReference('text ^block123', 0);
		expect(result).not.toBeNull();
		expect(result!.id).toBe('block123');
	});

	it('returns null for empty ^', () => {
		expect(findBlockReference('text ^', 0)).toBeNull();
	});

	it('returns null for ^ with spaces after', () => {
		expect(findBlockReference('text ^ not-a-ref', 0)).toBeNull();
	});
});
