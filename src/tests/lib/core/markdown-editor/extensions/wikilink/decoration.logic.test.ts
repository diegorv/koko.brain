import { describe, it, expect } from 'vitest';
import {
	findWikilinkRanges,
	findWikilinkInfoAtPosition,
} from '$lib/core/markdown-editor/extensions/wikilink/decoration.logic';

describe('findWikilinkRanges', () => {
	it('parses a basic wikilink [[Note]]', () => {
		const ranges = findWikilinkRanges('[[Note]]', 0);
		expect(ranges).toHaveLength(1);
		const r = ranges[0];
		expect(r.openBracketFrom).toBe(0);
		expect(r.openBracketTo).toBe(2);
		expect(r.targetFrom).toBe(2);
		expect(r.targetTo).toBe(6);
		expect(r.targetText).toBe('Note');
		expect(r.headingFrom).toBeNull();
		expect(r.headingTo).toBeNull();
		expect(r.blockIdFrom).toBeNull();
		expect(r.blockIdTo).toBeNull();
		expect(r.blockIdText).toBeNull();
		expect(r.displayFrom).toBeNull();
		expect(r.displayTo).toBeNull();
		expect(r.closeBracketFrom).toBe(6);
		expect(r.closeBracketTo).toBe(8);
	});

	it('parses wikilink with heading [[Note#Section]]', () => {
		const ranges = findWikilinkRanges('[[Note#Section]]', 0);
		expect(ranges).toHaveLength(1);
		const r = ranges[0];
		expect(r.targetText).toBe('Note');
		expect(r.targetFrom).toBe(2);
		expect(r.targetTo).toBe(6);
		expect(r.headingFrom).toBe(6);
		expect(r.headingTo).toBe(14);
		expect(r.blockIdFrom).toBeNull();
		expect(r.blockIdTo).toBeNull();
		expect(r.blockIdText).toBeNull();
		expect(r.displayFrom).toBeNull();
	});

	it('parses wikilink with display text [[Note|Click here]]', () => {
		const ranges = findWikilinkRanges('[[Note|Click here]]', 0);
		expect(ranges).toHaveLength(1);
		const r = ranges[0];
		expect(r.targetText).toBe('Note');
		expect(r.displayFrom).toBe(6);
		expect(r.displayTo).toBe(17);
		expect(r.headingFrom).toBeNull();
	});

	it('parses wikilink with heading and display [[Note#Sec|display]]', () => {
		const ranges = findWikilinkRanges('[[Note#Sec|display]]', 0);
		expect(ranges).toHaveLength(1);
		const r = ranges[0];
		expect(r.targetText).toBe('Note');
		expect(r.headingFrom).toBe(6);
		expect(r.headingTo).toBe(10);
		expect(r.displayFrom).toBe(10);
		expect(r.displayTo).toBe(18);
	});

	it('parses multiple wikilinks in one string', () => {
		const ranges = findWikilinkRanges('See [[A]] and [[B]]', 0);
		expect(ranges).toHaveLength(2);
		expect(ranges[0].targetText).toBe('A');
		expect(ranges[1].targetText).toBe('B');
	});

	it('returns empty array when no wikilinks are present', () => {
		expect(findWikilinkRanges('No links here', 0)).toHaveLength(0);
	});

	it('returns empty for malformed brackets', () => {
		expect(findWikilinkRanges('[[unclosed', 0)).toHaveLength(0);
		expect(findWikilinkRanges('[single]', 0)).toHaveLength(0);
	});

	it('applies offset correctly', () => {
		const ranges = findWikilinkRanges('[[Note]]', 100);
		expect(ranges[0].openBracketFrom).toBe(100);
		expect(ranges[0].targetFrom).toBe(102);
		expect(ranges[0].closeBracketTo).toBe(108);
	});

	it('parses block reference [[Note#^block-id]]', () => {
		const ranges = findWikilinkRanges('[[Note#^block-id]]', 0);
		expect(ranges).toHaveLength(1);
		const r = ranges[0];
		expect(r.targetText).toBe('Note');
		expect(r.targetFrom).toBe(2);
		expect(r.targetTo).toBe(6);
		expect(r.headingFrom).toBeNull();
		expect(r.headingTo).toBeNull();
		expect(r.blockIdFrom).toBe(6);
		expect(r.blockIdTo).toBe(16);
		expect(r.blockIdText).toBe('block-id');
		expect(r.displayFrom).toBeNull();
		expect(r.closeBracketFrom).toBe(16);
		expect(r.closeBracketTo).toBe(18);
	});

	it('parses block reference with display text [[Note#^abc|Alias]]', () => {
		const ranges = findWikilinkRanges('[[Note#^abc|Alias]]', 0);
		expect(ranges).toHaveLength(1);
		const r = ranges[0];
		expect(r.targetText).toBe('Note');
		expect(r.headingFrom).toBeNull();
		expect(r.blockIdFrom).toBe(6);
		expect(r.blockIdTo).toBe(11);
		expect(r.blockIdText).toBe('abc');
		expect(r.displayFrom).toBe(11);
		expect(r.displayTo).toBe(17);
	});

	it('parses block reference in same note [[#^block-id]]', () => {
		const ranges = findWikilinkRanges('[[#^block-id]]', 0);
		expect(ranges).toHaveLength(1);
		const r = ranges[0];
		expect(r.targetText).toBe('');
		expect(r.targetFrom).toBe(2);
		expect(r.targetTo).toBe(2);
		expect(r.headingFrom).toBeNull();
		expect(r.blockIdFrom).toBe(2);
		expect(r.blockIdTo).toBe(12);
		expect(r.blockIdText).toBe('block-id');
	});

	it('parses block reference with offset [[Note#^id]]', () => {
		const ranges = findWikilinkRanges('[[Note#^id]]', 50);
		const r = ranges[0];
		expect(r.openBracketFrom).toBe(50);
		expect(r.targetFrom).toBe(52);
		expect(r.targetTo).toBe(56);
		expect(r.blockIdFrom).toBe(56);
		expect(r.blockIdTo).toBe(60);
		expect(r.blockIdText).toBe('id');
		expect(r.closeBracketTo).toBe(62);
	});

	it('distinguishes heading from block reference', () => {
		const headingRanges = findWikilinkRanges('[[Note#Section]]', 0);
		expect(headingRanges[0].headingFrom).toBe(6);
		expect(headingRanges[0].blockIdFrom).toBeNull();

		const blockRanges = findWikilinkRanges('[[Note#^abc123]]', 0);
		expect(blockRanges[0].headingFrom).toBeNull();
		expect(blockRanges[0].blockIdFrom).toBe(6);
		expect(blockRanges[0].blockIdText).toBe('abc123');
	});
});

describe('findWikilinkInfoAtPosition', () => {
	it('returns target only for basic wikilink [[Note]]', () => {
		const result = findWikilinkInfoAtPosition('[[Note]]', 0, 4);
		expect(result).toEqual({ target: 'Note', heading: null, blockId: null });
	});

	it('returns target and heading for [[Note#Section]]', () => {
		const result = findWikilinkInfoAtPosition('[[Note#Section]]', 0, 4);
		expect(result).toEqual({ target: 'Note', heading: 'Section', blockId: null });
	});

	it('returns target and blockId for [[Note#^block-id]]', () => {
		const result = findWikilinkInfoAtPosition('[[Note#^block-id]]', 0, 4);
		expect(result).toEqual({ target: 'Note', heading: null, blockId: 'block-id' });
	});

	it('returns empty target and heading for [[#Heading]]', () => {
		const result = findWikilinkInfoAtPosition('[[#Heading]]', 0, 4);
		expect(result).toEqual({ target: '', heading: 'Heading', blockId: null });
	});

	it('returns empty target and blockId for [[#^block-id]]', () => {
		const result = findWikilinkInfoAtPosition('[[#^block-id]]', 0, 4);
		expect(result).toEqual({ target: '', heading: null, blockId: 'block-id' });
	});

	it('returns target only for [[Note|Display]] (ignores display text)', () => {
		const result = findWikilinkInfoAtPosition('[[Note|Display]]', 0, 4);
		expect(result).toEqual({ target: 'Note', heading: null, blockId: null });
	});

	it('returns target and heading for [[Note#Sec|Display]]', () => {
		const result = findWikilinkInfoAtPosition('[[Note#Sec|Display]]', 0, 4);
		expect(result).toEqual({ target: 'Note', heading: 'Sec', blockId: null });
	});

	it('returns target and blockId for [[Note#^id|Display]]', () => {
		const result = findWikilinkInfoAtPosition('[[Note#^id|Display]]', 0, 4);
		expect(result).toEqual({ target: 'Note', heading: null, blockId: 'id' });
	});

	it('returns null when position is outside wikilink', () => {
		const result = findWikilinkInfoAtPosition('Text [[Note]]', 0, 1);
		expect(result).toBeNull();
	});

	it('handles lineFrom offset correctly', () => {
		const result = findWikilinkInfoAtPosition('[[Note#^abc]]', 50, 54);
		expect(result).toEqual({ target: 'Note', heading: null, blockId: 'abc' });
	});
});
