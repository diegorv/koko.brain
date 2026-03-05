import { describe, it, expect } from 'vitest';
import { fuzzyMatch } from '$lib/utils/fuzzy-match';

describe('fuzzyMatch', () => {
	it('matches empty query to everything', () => {
		const result = fuzzyMatch('', 'anything');
		expect(result.match).toBe(true);
		expect(result.score).toBe(0);
	});

	it('matches exact string', () => {
		const result = fuzzyMatch('hello', 'hello');
		expect(result.match).toBe(true);
	});

	it('matches prefix', () => {
		const result = fuzzyMatch('hel', 'hello world');
		expect(result.match).toBe(true);
	});

	it('matches characters in order (non-contiguous)', () => {
		const result = fuzzyMatch('hlo', 'hello');
		expect(result.match).toBe(true);
	});

	it('does not match when characters are out of order', () => {
		const result = fuzzyMatch('olh', 'hello');
		expect(result.match).toBe(false);
	});

	it('is case insensitive', () => {
		const result = fuzzyMatch('HELLO', 'hello');
		expect(result.match).toBe(true);
	});

	it('does not match when query has extra characters', () => {
		const result = fuzzyMatch('hellox', 'hello');
		expect(result.match).toBe(false);
	});

	it('scores exact prefix match better than scattered match', () => {
		const prefix = fuzzyMatch('not', 'notes');
		const scattered = fuzzyMatch('not', 'navigation-of-things');
		expect(prefix.score).toBeLessThan(scattered.score);
	});

	it('scores shorter targets better than longer ones', () => {
		const short = fuzzyMatch('test', 'test');
		const long = fuzzyMatch('test', 'test-very-long-name');
		expect(short.score).toBeLessThan(long.score);
	});
});
